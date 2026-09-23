'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { CONSENT_STORAGE_KEY, announceConsentDecided, useConsentDecision } from '@/lib/analytics/consent';
import {
  META_PIXEL_SCRIPT_URL,
  clearQueue,
  flushQueue,
  getMetaPixelId,
  initializePixelStub,
} from '@/lib/analytics/meta-pixel';

/**
 * Carrega o Meta Pixel só depois de consentimento explícito, exatamente como
 * o kauaramos.com já faz (ver
 * ~/Projects/wealth-wellness-protocol/landing-kauaramos/assets/pixel.js).
 * Mesma chave de localStorage, então quem já respondeu no site principal não
 * é perguntado de novo aqui — a página é servida no mesmo domínio, via
 * rewrite do repositório do funil.
 */
export function MetaPixel() {
  const decision = useConsentDecision();

  useEffect(() => {
    if (decision === 'load') {
      initializePixelStub(getMetaPixelId());
      flushQueue();
    }
  }, [decision]);

  function persist(choice: 'sim' | 'nao') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
      /* modo privado — a escolha vale só pra esta sessão */
    }
    // Notifica o próprio store: não há outro jeito de saber que o valor em
    // localStorage mudou, já que o navegador só dispara o evento `storage`
    // em OUTRAS abas, nunca na que fez a escrita.
    announceConsentDecided();
  }

  function accept() {
    persist('sim');
  }

  function decline() {
    clearQueue();
    persist('nao');
  }

  return (
    <>
      {decision === 'load' && (
        <Script src={META_PIXEL_SCRIPT_URL} strategy="afterInteractive" />
      )}

      {decision === 'ask' && (
        <div
          role="region"
          aria-label="Consentimento de cookies"
          className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center justify-between gap-4 border-t border-[rgba(244,242,238,0.12)] bg-[#121212] px-6 py-4 text-center sm:flex-row sm:text-left"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <p className="max-w-[640px] text-[0.8125rem] leading-[1.6] text-[rgba(244,242,238,0.78)]">
            Uso cookies pra entender o que funciona aqui no site e melhorar o que eu te mostro. Você
            escolhe.{' '}
            <a href="/privacidade" className="text-[#F4F2EE] underline underline-offset-2">
              Como trato seus dados
            </a>
            .
          </p>
          <div className="flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={decline}
              className="min-h-[44px] rounded-full border border-[rgba(244,242,238,0.28)] bg-transparent px-5 text-[0.75rem] font-semibold tracking-[0.05em] text-[rgba(244,242,238,0.78)] uppercase transition-colors duration-300 hover:text-[#F4F2EE]"
            >
              Só o essencial
            </button>
            <button
              type="button"
              onClick={accept}
              className="min-h-[44px] rounded-full bg-[#C9A84C] px-5 text-[0.75rem] font-semibold tracking-[0.05em] text-[#0D0D0D] uppercase transition-colors duration-300 hover:bg-[#D4B85C]"
            >
              Aceitar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
