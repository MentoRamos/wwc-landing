'use client';

import { useActionState, useState } from 'react';
import { saveContent, INITIAL_STATE, type ActionState } from '@/app/admin/conteudo/actions';
import { KINDS } from '@/lib/core/content.core';
import { PRODUCTS } from '@/lib/core/admin.core';

const PRODUCT_LABEL: Record<string, string> = {
  protocol: 'Protocol',
  circle: 'Circle',
  connect: 'Connect',
  face_a_face: 'Face a Face',
};

const KIND_LABEL: Record<string, string> = {
  pdf: 'PDF — arquivo no bucket privado',
  video: 'Gravação — vídeo não listado no YouTube',
};

const field =
  'w-full border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-1)] ' +
  'outline-none transition focus:border-[var(--accent)]';

const label = 'text-xs uppercase tracking-[0.14em] text-[var(--text-3)]';

/**
 * Publicar um item, e corrigir um que já existe.
 *
 * O `kind` troca quais campos aparecem porque a tabela tem um CHECK que recusa
 * os dois preenchidos ao mesmo tempo. Mostrar os dois convidaria a preencher
 * os dois, e o erro só apareceria como violação de constraint depois do
 * envio — tarde demais e em linguagem de banco.
 */
export function ContentForm({ initial }: { initial?: Partial<Record<string, string>> }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveContent,
    INITIAL_STATE,
  );
  const [kind, setKind] = useState(initial?.kind ?? 'pdf');

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={label}>Título</span>
          <input name="title" required defaultValue={initial?.title} className={field} />
        </label>

        <label className="flex flex-col gap-2">
          <span className={label}>Prateleira</span>
          <input
            name="collection"
            required
            defaultValue={initial?.collection}
            placeholder="Guias"
            className={field}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={label}>Endereço (opcional)</span>
        <input
          name="slug"
          defaultValue={initial?.slug}
          placeholder="deixe vazio para derivar do título"
          spellCheck={false}
          className={`${field} font-mono`}
        />
        <span className="text-xs text-[var(--text-4)]">
          É a chave única da tabela. Repetir um endereço existente atualiza aquele item
          em vez de criar outro — é assim que se corrige uma descrição errada.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className={label}>Descrição</span>
        <textarea name="description" rows={3} defaultValue={initial?.description} className={field} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={label}>Tipo</span>
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className={field}
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {KIND_LABEL[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className={label}>Duração (opcional)</span>
          <input
            name="duration"
            defaultValue={initial?.duration}
            placeholder="1:02:05"
            className={field}
          />
        </label>
      </div>

      {kind === 'pdf' ? (
        <label className="flex flex-col gap-2">
          <span className={label}>Caminho no bucket</span>
          <input
            name="storage_path"
            defaultValue={initial?.storage_path}
            placeholder="guias/sono.pdf"
            spellCheck={false}
            className={`${field} font-mono`}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-2">
          <span className={label}>YouTube</span>
          <input
            name="youtube_id"
            defaultValue={initial?.youtube_id}
            placeholder="cole o link ou só o id"
            spellCheck={false}
            className={`${field} font-mono`}
          />
          <span className="text-xs text-[var(--text-4)]">
            Pode colar a URL inteira — só o id é guardado. O vídeo precisa estar como
            não listado, e o id é tratado como segredo: nunca aparece para quem não tem
            o produto.
          </span>
        </label>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className={label}>Quem pode abrir</legend>
        <div className="flex flex-wrap gap-4">
          {PRODUCTS.map((product) => (
            <label key={product} className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <input
                type="checkbox"
                name="required_products"
                value={product}
                defaultChecked={initial?.required_products?.includes(product)}
                className="accent-[var(--accent)]"
              />
              {PRODUCT_LABEL[product]}
            </label>
          ))}
        </div>
        <span className="text-xs text-[var(--text-4)]">
          Sem nenhum marcado o item fica trancado até para quem pagou — a regra de
          acesso compara listas, e lista vazia não casa com nada.
        </span>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={label}>Temporada (opcional)</span>
          <input name="season" defaultValue={initial?.season} className={field} />
        </label>

        <label className="flex flex-col gap-2">
          <span className={label}>Ordem na prateleira</span>
          <input
            name="sort_order"
            type="number"
            defaultValue={initial?.sort_order ?? '0'}
            className={field}
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm text-[var(--text-2)]">
        <input
          type="checkbox"
          name="publish"
          defaultChecked={initial?.publish !== ''}
          className="accent-[var(--accent)]"
        />
        Publicar agora
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="btn-glow border border-[var(--border-hover)] bg-[var(--bg-card)] px-6 py-3 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar'}
        </button>

        {state.message && (
          <p
            role="status"
            className={`text-sm ${state.ok ? 'text-[var(--accent)]' : 'text-[var(--text-2)]'}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
