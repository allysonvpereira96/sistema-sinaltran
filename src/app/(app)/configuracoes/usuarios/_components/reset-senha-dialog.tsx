"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { resetSenha } from "@/lib/actions/usuarios";
import type { UsuarioRow } from "@/lib/types/usuario";

export function ResetSenhaDialog({
  usuario,
  open,
  onOpenChange,
}: {
  usuario: UsuarioRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!usuario) return;
    if (senha.length < 8) {
      setErro("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const res = await resetSenha(usuario.id, senha);
      if (res.ok) {
        toast.success("Senha redefinida", {
          description: "Informe a nova senha ao usuário.",
        });
        setSenha("");
        onOpenChange(false);
      } else {
        toast.error("Erro ao redefinir senha", { description: res.error });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSenha("");
          setErro(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha temporária para{" "}
            <strong>{usuario?.nome}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reset-senha">Nova senha</Label>
          <Input
            id="reset-senha"
            type="text"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          {erro ? (
            <p className="text-sm text-rose-600 font-medium">{erro}</p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? "Salvando…" : "Redefinir senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
