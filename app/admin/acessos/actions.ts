'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { serverClient } from '@/lib/supabase/server';
import { PRODUCTS, expiryFrom, parseGrantList, type Product } from '@/lib/core/admin.core';

export type ActionState = { ok: boolean; message: string; details?: string[] };

const EMPTY: ActionState = { ok: false, message: '' };

/**
 * A Server Action is a POST endpoint that anyone can call with a fetch. That
 * the form is only rendered inside `/admin` proves nothing about who is
 * calling it, so every action below re-checks for itself.
 *
 * Beyond that, the writes go through the *user's* client, not the service
 * role: `entitlements_admin_write` is the real gate, and a bug in this file
 * fails closed against the policy rather than around it.
 */
async function adminClientOrRefuse() {
  await requireAdmin();
  return serverClient();
}

const isProduct = (value: unknown): value is Product =>
  typeof value === 'string' && (PRODUCTS as readonly string[]).includes(value);

/**
 * Grant one product to a list of addresses.
 *
 * One paste is one operation on purpose: Kauã types four students into the box
 * and gets one answer about all four, rather than four screens. A malformed
 * line stops the whole thing before anything is written — a partial import is
 * the worst outcome, because it looks like it worked.
 */
export async function grantAccess(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await adminClientOrRefuse();

  const rawList = String(formData.get('emails') ?? '');
  const product = formData.get('product');
  const term = String(formData.get('term') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (!isProduct(product)) return { ok: false, message: 'Escolha um produto.' };

  const { entries, errors } = parseGrantList(rawList);

  if (errors.length > 0) {
    return {
      ok: false,
      message: `${errors.length} linha(s) não deu(ram) para ler. Nada foi gravado.`,
      details: errors.map((e) => `linha ${e.line}: ${e.raw} · ${e.reason}`),
    };
  }
  if (entries.length === 0) return { ok: false, message: 'Nenhum e-mail na lista.' };

  let expiresAt: Date | null;
  try {
    expiresAt = expiryFrom(term, new Date());
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `email_raw` keeps what was typed and `email_norm` what we match on. When
  // somebody writes later saying their access is missing, the raw column is
  // what makes a typo visible.
  const rows = entries.map((entry) => ({
    email_norm: entry.email,
    email_raw: entry.email,
    product: entry.product ?? product,
    source: 'manual' as const,
    status: 'active' as const,
    expires_at: expiresAt?.toISOString() ?? null,
    granted_by: user?.id ?? null,
    note: note || null,
  }));

  const { error } = await supabase.from('entitlements').insert(rows);
  if (error) return { ok: false, message: `O banco recusou: ${error.message}` };

  revalidatePath('/admin/acessos');
  return {
    ok: true,
    message:
      entries.length === 1
        ? 'Acesso concedido.'
        : `${entries.length} acessos concedidos.`,
  };
}

/**
 * Revoke, never delete.
 *
 * The row stays and its status changes, so the audit trail keeps pointing at
 * something real and "was this ever granted?" still has an answer. `revoked`
 * is outside the set `active_products()` accepts, so access stops at once.
 */
export async function revokeAccess(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await adminClientOrRefuse();

  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'Sem id, não dá para revogar nada.' };

  const { error } = await supabase
    .from('entitlements')
    .update({ status: 'revoked' })
    .eq('id', id);

  if (error) return { ok: false, message: `O banco recusou: ${error.message}` };

  revalidatePath('/admin/acessos');
  return { ok: true, message: 'Acesso revogado.' };
}

export const INITIAL_STATE = EMPTY;
