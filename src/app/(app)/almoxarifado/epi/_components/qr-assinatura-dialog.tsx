"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function QrAssinaturaDialog({
  token,
  open,
  onOpenChange,
}: {
  token: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [qr, setQr] = useState<{ forLink: string; url: string } | null>(null);
  const link = open && token && typeof window !== "undefined" ? `${window.location.origin}/assinatura-epi/${token}` : "";

  useEffect(() => {
    if (!link) return;
    let cancel = false;
    QRCode.toDataURL(link, { width: 320, margin: 1 })
      .then((url) => { if (!cancel) setQr({ forLink: link, url }); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [link]);

  const qrUrl = qr && qr.forLink === link ? qr.url : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="size-4" />Assinatura por QR Code</DialogTitle>
          <DialogDescription>O colaborador escaneia com o celular e assina na tela.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR Code de assinatura" className="size-56 rounded-md border bg-white p-2" />
          ) : (
            <div className="size-56 rounded-md border grid place-items-center text-xs text-muted-foreground">Gerando…</div>
          )}
          <div className="w-full flex items-center gap-2">
            <input value={link} readOnly className="flex-1 h-9 rounded-md border bg-muted/40 px-2 text-xs font-mono truncate" />
            <Button variant="outline" size="icon-sm" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }} aria-label="Copiar link">
              <Copy className="size-3.5" />
            </Button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-muted" aria-label="Abrir">
              <ExternalLink className="size-3.5" />
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Também dá para imprimir a ficha e assinar no papel — as duas formas valem.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
