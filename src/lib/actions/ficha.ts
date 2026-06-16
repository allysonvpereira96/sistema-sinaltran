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

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[extrairFichaEmpregado] HTTP", res.status, txt.slice(0, 500));
      return { ok: false, error: `Gemini retornou ${res.status}.` };
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, error: "Resposta vazia do Gemini." };

    const data = JSON.parse(text) as FichaExtraida;
    return { ok: true, data };
  } catch (e) {
    console.error("[extrairFichaEmpregado]", (e as Error).message);
    return { ok: false, error: "Falha ao processar a ficha." };
  }
}
