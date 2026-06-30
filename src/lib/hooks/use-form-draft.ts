"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StoredDraft<T> = { ts: number; values: T };

/**
 * Rede de segurança para formulários longos ("tipo planilha").
 *
 * - Salva os valores no localStorage automaticamente (debounce) enquanto o
 *   formulário estiver "sujo" (editado e não salvo).
 * - Avisa o navegador (beforeunload) ao tentar fechar/recarregar com edições
 *   pendentes.
 * - Ao montar, recupera um rascunho de sessão anterior (se houver) e o expõe
 *   em `draft` para oferecer "Restaurar".
 *
 * `subscribe` recebe um callback chamado a cada mudança de valor — use a forma
 * de assinatura do react-hook-form (`watch(cb)`), que NÃO re-renderiza o
 * formulário. Não cria nada no servidor: é proteção local, custo zero.
 */
export function useFormDraft<T>({
  storageKey,
  subscribe,
  dirty,
  enabled = true,
  delay = 800,
}: {
  storageKey: string;
  subscribe: (cb: (values: T) => void) => () => void;
  dirty: boolean;
  enabled?: boolean;
  delay?: number;
}) {
  // Rascunho encontrado ao montar (de uma sessão anterior).
  const [draft, setDraft] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Espelho sempre atualizado de `dirty` para a callback de assinatura não
  // salvar mudanças programáticas (ex.: reset() de montagem deixa dirty=false).
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Lê o rascunho existente uma única vez, na montagem.
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDraft<T>;
        if (parsed && parsed.values != null) setDraft(parsed.values);
      }
    } catch {
      /* storage indisponível / JSON inválido: ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // Autosave (debounced) via assinatura — sem re-render do formulário.
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribe((values) => {
      if (!dirtyRef.current) return; // ignora mudanças programáticas / não-edição
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          const payload: StoredDraft<T> = { ts: Date.now(), values };
          localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {
          /* ignora cota/indisponível */
        }
      }, delay);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storageKey, delay]);

  // Aviso nativo ao fechar/recarregar com edições pendentes.
  useEffect(() => {
    if (!enabled || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled, dirty]);

  /** Remove o rascunho do storage (chamar após salvar com sucesso). */
  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current); // cancela save pendente
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignora */
    }
    setDraft(null);
  }, [storageKey]);

  /** Esconde o banner sem apagar (usar logo após restaurar no formulário). */
  const dismiss = useCallback(() => setDraft(null), []);

  /** Descarta o rascunho recuperado (apaga do storage e some o banner). */
  const discard = useCallback(() => clear(), [clear]);

  return { draft, clear, dismiss, discard };
}
