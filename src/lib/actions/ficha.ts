"use server";

/**
 * Extração de dados de uma "Ficha de Empregado" (PDF ou imagem) usando o Gemini.
 * O Gemini é multimodal e lê o PDF nativamente — enviamos o arquivo em base64 e
 * pedimos saída JSON estruturada (responseSchema).
 *
 * Requer a variável de ambiente GEMINI_API_KEY (ou GOOGLE_GENERATIVE_AI_API_KEY).
 * Modelo configurável via GEMINI_MODEL (default: gemini-2.0-flash).
 */

export type FichaExtraida = {
  nome_completo?: string | null;
  cpf?: string | null;
  rg?: string | null;
  data_nascimento?: string | null;
  pis?: string | null;
  cargo?: string | null;
  data_admissao?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  genero?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
};

const SCHEMA = {
  type: "object",
  properties: {
    nome_completo: { type: "string" },
    cpf: { type: "string", description: "Somente dígitos" },
    rg: { type: "string" },
    data_nascimento: { type: "string", description: "Formato YYYY-MM-DD" },
    pis: { type: "string" },
    cargo: { type: "string" },
    data_admissao: { type: "string", description: "Formato YYYY-MM-DD" },
    email: { type: "string" },
    telefone: { type: "string", description: "Somente dígitos" },
    endereco: { type: "string" },
    cidade: { type: "string" },
    estado: { type: "string", description: "UF com 2 letras" },
    cep: { type: "string", description: "Somente dígitos" },
    genero: { type: "string", description: "masculino, feminino, outro ou nao_informado" },
    banco: { type: "string" },
    agencia: { type: "string" },
    conta: { type: "string" },
  },
};

const PROMPT =
  "Você é um especialista em extração de dados. Extraia os dados do empregado " +
  "desta Ficha de Empregado brasileira e devolva no schema fornecido. Datas em " +
  "YYYY-MM-DD. CPF, telefone e CEP somente com dígitos. Valores monetários como " +
  "número. Se um campo não for encontrado, omita-o.";

const MAX_ATTEMPTS = 3;
/** Não segura a server action por mais que isto esperando um retry. */
const RETRY_CAP_MS = 8000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Interpreta o corpo de um erro 429 do Gemini (quota/rate limit). */
function parse429(body: string): { isDaily: boolean; retryDelayMs: number | null } {
  let isDaily = /per\s*day|PerDay|RequestsPerDay/i.test(body);
  let retryDelayMs: number | null = null;
  try {
    const j = JSON.parse(body) as {
      error?: { message?: string; details?: { "@type"?: string; retryDelay?: string; violations?: { quotaId?: string }[] }[] };
    };
    for (const d of j.error?.details ?? []) {
      if (d.retryDelay) {
        const m = /([\d.]+)s/.exec(d.retryDelay);
        if (m) retryDelayMs = Math.round(parseFloat(m[1]) * 1000);
      }
      for (const v of d.violations ?? []) {
        if (/PerDay/i.test(v.quotaId ?? "")) isDaily = true;
      }
    }
  } catch {
    /* corpo não-JSON: mantém heurística do regex */
  }
  return { isDaily, retryDelayMs };
}

export async function extrairFichaEmpregado(
  base64: string,
  mimeType: string,
): Promise<{ ok: true; data: FichaExtraida } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY não configurada no servidor." };
  }
  if (!base64) return { ok: false, error: "Arquivo vazio." };

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType || "application/pdf", data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return { ok: false, error: "Resposta vazia do Gemini." };
        return { ok: true, data: JSON.parse(text) as FichaExtraida };
      }

      const txt = await res.text();
      console.error("[extrairFichaEmpregado] HTTP", res.status, txt.slice(0, 500));

      // 429 = quota/rate limit · 503 = sobrecarga temporária → vale retry
      if (res.status === 429 || res.status === 503) {
        const isLast = attempt === MAX_ATTEMPTS;
        if (res.status === 429) {
          const { isDaily, retryDelayMs } = parse429(txt);
          if (isDaily) {
            return {
              ok: false,
              error: "Limite diário de uso do Gemini atingido. Tente novamente amanhã ou habilite billing na chave de API.",
            };
          }
          // limite por minuto: se a espera pedida for maior que o teto, não adianta segurar a tela
          if (!isLast && retryDelayMs != null && retryDelayMs > RETRY_CAP_MS) {
            const seg = Math.ceil(retryDelayMs / 1000);
            return {
              ok: false,
              error: `Limite de requisições do Gemini atingido. Tente novamente em ~${seg}s.`,
            };
          }
          if (!isLast) {
            await sleep(Math.min(retryDelayMs ?? attempt * 1500, RETRY_CAP_MS));
            continue;
          }
          return { ok: false, error: "Limite de requisições do Gemini atingido. Aguarde alguns instantes e tente novamente." };
        }
        // 503
        if (!isLast) {
          await sleep(Math.min(attempt * 1500, RETRY_CAP_MS));
          continue;
        }
        return { ok: false, error: "Gemini temporariamente indisponível. Tente novamente em instantes." };
      }

      return { ok: false, error: `Gemini retornou ${res.status}.` };
    } catch (e) {
      console.error("[extrairFichaEmpregado]", (e as Error).message);
      if (attempt === MAX_ATTEMPTS) return { ok: false, error: "Falha ao processar a ficha." };
      await sleep(attempt * 1000);
    }
  }

  return { ok: false, error: "Falha ao processar a ficha." };
}
