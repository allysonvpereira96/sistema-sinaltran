"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODULOS } from "@/config/navigation";
import {
  createUsuario,
  updateUsuario,
  setUsuarioAtivo,
} from "@/lib/actions/usuarios";
import type { ModuloKey, UsuarioRow } from "@/lib/types/usuario";
import { UsuarioForm, type UsuarioFormValues } from "./usuario-form";
import { ResetSenhaDialog } from "./reset-senha-dialog";

const MODULO_LABEL: Record<ModuloKey, string> = Object.fromEntries(
  MODULOS.map((m) => [m.key, m.label]),
) as Record<ModuloKey, string>;

type DialogState = { mode: "create" } | { mode: "edit"; usuario: UsuarioRow } | null;

export function UsuariosList({
  usuarios,
  currentUserId,
  canManageLogins,
}: {
  usuarios: UsuarioRow[];
  currentUserId: string;
  canManageLogins: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [resetTarget, setResetTarget] = useState<UsuarioRow | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(values: UsuarioFormValues) {
    startTransition(async () => {
      const res =
        dialog?.mode === "edit"
          ? await updateUsuario(dialog.usuario.id, {
              nome: values.nome,
              role: values.role,
              modulos: values.modulos,
            })
          : await createUsuario(values);

      if (res.ok) {
        toast.success(
          dialog?.mode === "edit" ? "Usuário atualizado" : "Usuário criado",
        );
        setDialog(null);
        router.refresh();
      } else {
        toast.error("Erro ao salvar", { description: res.error });
      }
    });
  }

  function handleToggleAtivo(u: UsuarioRow) {
    const acao = u.ativo ? "inativar" : "reativar";
    if (!confirm(`Deseja ${acao} o acesso de "${u.nome}"?`)) return;
    startTransition(async () => {
      const res = await setUsuarioAtivo(u.id, !u.ativo);
      if (res.ok) {
        toast.success(u.ativo ? "Acesso inativado" : "Acesso reativado");
        router.refresh();
      } else {
        toast.error("Erro ao atualizar", { description: res.error });
      }
    });
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie quem acessa o sistema e quais módulos cada um pode ver."
        actions={
          <Button
            onClick={() => setDialog({ mode: "create" })}
            className="gap-2"
            disabled={!canManageLogins}
          >
            <Plus className="size-4" /> Novo usuário
          </Button>
        }
      />

      {!canManageLogins ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <p>
            A chave de serviço do Supabase não está disponível neste ambiente —
            não é possível criar usuários nem redefinir senhas. A edição de
            papéis e módulos continua funcionando.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-semibold">
                      {u.nome}
                      {u.id === currentUserId ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (você)
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge>Master</Badge>
                    ) : (
                      <Badge variant="secondary">Usuário</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal">
                    {u.role === "admin" ? (
                      <span className="text-sm text-muted-foreground">
                        Todos os módulos
                      </span>
                    ) : u.modulos.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.modulos.map((m) => (
                          <Badge key={m} variant="outline" className="font-normal">
                            {MODULO_LABEL[m] ?? m}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.ativo ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="Ações" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setDialog({ mode: "edit", usuario: u })}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canManageLogins}
                          onClick={() => setResetTarget(u)}
                        >
                          Redefinir senha
                        </DropdownMenuItem>
                        {u.id !== currentUserId ? (
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={!canManageLogins}
                            onClick={() => handleToggleAtivo(u)}
                          >
                            {u.ativo ? "Inativar acesso" : "Reativar acesso"}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialog !== null}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? "Editar usuário" : "Novo usuário"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.mode === "edit"
                ? "Atualize o papel e os módulos liberados."
                : "Crie um login com senha temporária e selecione os módulos."}
            </DialogDescription>
          </DialogHeader>
          {dialog ? (
            <UsuarioForm
              mode={dialog.mode}
              initial={dialog.mode === "edit" ? dialog.usuario : undefined}
              pending={pending}
              onSubmit={handleSubmit}
              onCancel={() => setDialog(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ResetSenhaDialog
        usuario={resetTarget}
        open={resetTarget !== null}
        onOpenChange={(o) => {
          if (!o) setResetTarget(null);
        }}
      />
    </div>
  );
}
