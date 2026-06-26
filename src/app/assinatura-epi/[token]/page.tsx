"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Item = { nome: string; quantidade: number; ca: string | null };
type Dados = {
  colaborador: { nome: string; funcao: string; admissao: string | null } | null;
  assinado: boolean;
  data_entrega: string | null;
  itens: Item[];
};

function dataBR(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function AssinaturaEpiPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const supabase = createClient();

  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<Dados | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_entrega_assinatura", { p_token: token });
      if (error) {
        setErro("Não foi possível carregar a entrega.");
      } else {
        const d = data as Dados;
        setDados(d);
        if (d?.assinado) setConcluido(true);
      }
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (c.width / rect.width), y: (e.clientY - rect.top) * (c.height / rect.height) };
  }
  function inicio(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d")!;
    desenhando.current = true;
    const { x, y } = coords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }
  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = coords(e);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    ctx.lineTo(x, y);
    ctx.stroke();
    temTraco.current = true;
  }
  function fim() {
    desenhando.current = false;
  }
  function limpar() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    temTraco.current = false;
  }

  async function assinar() {
    if (!temTraco.current) {
      setErro("Assine no quadro antes de confirmar.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${token}.png`;
      const { error: upErr } = await supabase.storage
        .from("assinaturas-epi")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) throw new Error(upErr.message);
      const { data: ok, error: rpcErr } = await supabase.rpc("submit_epi_assinatura", { p_token: token, p_url: path });
      if (rpcErr || ok === false) throw new Error(rpcErr?.message ?? "Não foi possível registrar a assinatura.");
      setConcluido(true);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-2xl font-extrabold tracking-tight">Sinaltran</div>
          <div className="text-sm text-muted-foreground">Comprovação de entrega de EPI</div>
        </div>

        {carregando ? (
          <div className="text-center text-sm text-muted-foreground py-10">Carregando…</div>
        ) : !dados?.colaborador ? (
          <div className="rounded-lg border bg-card p-5 text-center text-sm">
            Link inválido ou expirado.
          </div>
        ) : concluido ? (
          <div className="rounded-lg border bg-card p-6 text-center space-y-2">
            <div className="text-3xl">✅</div>
            <div className="font-semibold">Assinatura registrada!</div>
            <div className="text-sm text-muted-foreground">Obrigado, {dados.colaborador.nome.split(" ")[0]}. Você já pode fechar esta página.</div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-card p-4 text-sm space-y-1">
              <div><span className="text-muted-foreground">Empregado:</span> <strong>{dados.colaborador.nome}</strong></div>
              <div><span className="text-muted-foreground">Função:</span> {dados.colaborador.funcao}</div>
              <div><span className="text-muted-foreground">Entrega:</span> {dataBR(dados.data_entrega)}</div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">EPIs recebidos</div>
              <ul className="text-sm divide-y">
                {dados.itens.map((it, i) => (
                  <li key={i} className="py-1.5 flex justify-between gap-2">
                    <span>{String(it.quantidade).padStart(2, "0")}× {it.nome}</span>
                    {it.ca ? <span className="text-xs text-muted-foreground">CA {it.ca}</span> : null}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Declaro que recebi os E.P.I.s acima, fui treinado quanto ao uso, guarda e higienização, e estou ciente
              das minhas obrigações conforme a Portaria 3214/78 e NR-6.
            </p>

            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sua assinatura</div>
              <canvas
                ref={canvasRef}
                width={520}
                height={220}
                className="w-full h-40 rounded-md border bg-white touch-none"
                onPointerDown={inicio}
                onPointerMove={mover}
                onPointerUp={fim}
                onPointerLeave={fim}
              />
              <button type="button" onClick={limpar} className="mt-2 text-xs text-muted-foreground underline">Limpar</button>
            </div>

            {erro ? <p className="text-sm text-rose-600">{erro}</p> : null}

            <button
              type="button"
              onClick={assinar}
              disabled={enviando}
              className="w-full h-12 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {enviando ? "Enviando…" : "Confirmar assinatura"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
