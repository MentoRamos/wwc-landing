import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicSupabaseEnv } from './env';

/**
 * Um cliente sem sessão nenhuma: exatamente o que um estranho enxerga.
 *
 * Existe para o que é público por decisão (os artigos do Circle) e é lido em
 * lugares que não têm cookie para carregar: a imagem de compartilhamento, o
 * sitemap. Usá-lo também na página do artigo faz o admin logado ver a página
 * como o público vê, que é o que ele quer conferir.
 *
 * Nunca use isto para dado de membro: sem sessão, a RLS devolve zero linhas e
 * a página parece vazia em vez de parecer bloqueada.
 */
export function publicClient(): SupabaseClient {
  const { url, anonKey } = publicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
