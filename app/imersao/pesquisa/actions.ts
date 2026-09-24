'use server';

import { adminClient } from '@/lib/supabase/admin';
import { verifyLinkToken } from '@/lib/core/evento.core';
import { eventoConfig } from '@/lib/evento/config';
import { CONSENT_VERSION, readSurveyForm, type SurveyState } from '@/lib/evento/survey';

/**
 * Grava a pesquisa e libera a Ficha da Hora Fixa.
 *
 * Uma server action é um POST que qualquer um chama, então nada vem de
 * confiança: o formulário passa pelo zod (`readSurveyForm`), e quem responde
 * é identificado pelo token assinado do e-mail T0 ou, sem ele, pelo e-mail da
 * compra. Só comprador com ingresso pago grava e recebe a Ficha.
 *
 * A escrita é com o service role, como em `interest`: a tabela não tem
 * política de escrita para ninguém. A Ficha sai por URL assinada de 10
 * minutos de um bucket privado, e só depois de a resposta estar gravada.
 *
 * Log: só o id do comprador e o desfecho. Nunca e-mail, nome ou resposta.
 */
const FICHA_PATH = 'ficha-hora-fixa.pdf';

export async function submitSurvey(_previous: SurveyState, formData: FormData): Promise<SurveyState> {
  const parsed = readSurveyForm(formData);
  if (!parsed.ok) {
    return { status: 'error', message: 'Confira as respostas: falta alguma pergunta ou a caixa de autorização.' };
  }
  const submission = parsed.value;

  const admin = adminClient();
  const buyerId = verifyLinkToken(submission.token, eventoConfig().linkSecret);

  let query = admin
    .from('event_buyers')
    .select('id, edition_id, email_norm')
    .eq('status', 'paid')
    .order('purchased_at', { ascending: true })
    .limit(1);
  if (buyerId) {
    query = query.eq('id', buyerId);
  } else if (submission.email) {
    query = query.eq('email_norm', submission.email);
  } else {
    return { status: 'error', message: 'Informe o e-mail que você usou na compra do ingresso.', needsEmail: true };
  }

  const { data: buyers, error: buyerError } = await query;
  if (buyerError) {
    console.error('[pesquisa] leitura do comprador falhou', { code: buyerError.code });
    return { status: 'error', message: 'Não consegui salvar agora. Tenta de novo em um minuto.' };
  }
  const buyer = buyers?.[0];
  if (!buyer) {
    return {
      status: 'error',
      message: 'Não encontrei um ingresso com esse e-mail. Use o mesmo e-mail da compra na Kiwify.',
      needsEmail: true,
    };
  }

  const now = new Date().toISOString();
  const { error: saveError } = await admin.from('survey_responses').upsert(
    {
      edition_id: buyer.edition_id,
      buyer_id: buyer.id,
      email_norm: buyer.email_norm,
      origin: buyerId ? submission.origin : submission.origin === 't0' ? 'email' : submission.origin,
      answers: submission.answers,
      consent_version: CONSENT_VERSION,
      consent_at: now,
    },
    { onConflict: 'edition_id,email_norm' },
  );
  if (saveError) {
    console.error('[pesquisa] gravação falhou', { buyer: buyer.id, code: saveError.code });
    return { status: 'error', message: 'Não consegui salvar agora. Tenta de novo em um minuto.' };
  }

  const { data: signed, error: signError } = await admin.storage
    .from('evento')
    .createSignedUrl(FICHA_PATH, 600, { download: 'Ficha da Hora Fixa.pdf' });
  if (signError || !signed?.signedUrl) {
    console.error('[pesquisa] ficha indisponível', { buyer: buyer.id });
    return { status: 'done', fichaUrl: null };
  }

  console.info('[pesquisa] respondida', { buyer: buyer.id });
  return { status: 'done', fichaUrl: signed.signedUrl };
}
