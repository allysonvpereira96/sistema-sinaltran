"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MODULOS } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { AppRole, ModuloKey, UsuarioRow } from "@/lib/types/usuario";

export type UsuarioFormValues = {
  nome: string;
  email: string;
  password: string;
  role: AppRole;
  modulos: ModuloKey[];
};

type UsuarioFormProps = {
  mode: "create" | "edit";
  initial?: UsuarioRow;
  pending?: boolean;
  onSubmit: (values: UsuarioFormValues) => void;
  onCancel: () => void;
};

export function UsuarioForm({
  mode,
  initial,
  pending,
  onSubmit,
  onCancel,
}: UsuarioFormProps) {
  const isEdit = mode === "edit";
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>(initial?.role ?? "user");
  const [modulos, setModulos] = useState<ModuloKey[]>(initial?.modulos ?? []);
  const [erro, setErro] = useState<string | null>(null);

  const isMaster = role === "admin";

  function toggleModulo(key: ModuloKey) {
    setModulos((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Informe o nome.");
    if (!isEdit) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return setErro("Informe um e-mail válido.");
      }
      if (password.length < 8) {
        return setErro("A senha deve ter ao menos 8 caracteres.");
      }
    }
    if (!isMaster && modulos.length === 0) {
      return setErro("Selecione ao menos um módulo (ou marque como master).");
    }
    setErro(null);
    onSubmit({ nome: nome.trim(), email: email.trim(), password, role, modulos });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="usr-nome">Nome *</Label>
        <Input
          id="usr-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome completo"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="usr-email">E-mail *</Label>
        <Input
          id="usr-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@sinaltran.com"
          disabled={isEdit}
          autoComplete="off"
        />
        {isEdit ? (
          <p className="text-xs text-muted-foreground">
            O e-mail (login) não pode ser alterado.
          </p>
        ) : null}
      </div>

      {!isEdit ? (
        <div className="space-y-1.5">
          <Label htmlFor="usr-senha">Senha temporária *</Label>
          <Input
            id="usr-senha"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Informe esta senha ao usuário — ele poderá usá-la para entrar.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Tipo de acesso</Label>
        <div className="grid grid-cols-2 gap-2">
          <RoleButton
            active={role === "user"}
            title="Usuário"
            desc="Acessa só os módulos marcados"
            onClick={() => setRole("user")}
          />
          <RoleButton
            active={role === "admin"}
            title="Master"
            desc="Acesso total + gestão de usuários"
            onClick={() => setRole("admin")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Módulos liberados</Label>
        {isMaster ? (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
            Usuários master têm acesso a todos os módulos automaticamente.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {MODULOS.map((m) => {
              const checked = modulos.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleModulo(m.key)}
                  aria-pressed={checked}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors",
                    checked
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border",
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {checked ? <Check className="size-3" /> : null}
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {erro ? (
        <p className="text-sm text-rose-600 font-medium">{erro}</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Criar usuário"}
        </Button>
      </div>
    </form>
  );
}

function RoleButton({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary bg-primary/10"
          : "border-input hover:bg-muted/50",
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
