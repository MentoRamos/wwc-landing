'use client';

import { useEffect } from 'react';
import { queueOrSendEvent } from '@/lib/analytics/meta-pixel';

const TICKET_PRICE_BRL = 97;
const EVENT_NAME = 'Imersão Performance e Longevidade';
const FIRED_KEY = 'kr_imersao_purchase_sent';

/**
 * Sends the ticket's Purchase once the buyer reaches `/imersao/obrigado`.
 * It goes through `queueOrSendEvent`, so it waits for the consent banner
 * like every other event and is dropped on "Só o essencial".
 *
 * The sessionStorage flag keeps a reload (or the back button) from counting a
 * second sale. Storage can throw in private windows; then the event still
 * goes out once for this page view, which is the better failure.
 */
export function PurchaseEvent() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FIRED_KEY)) return;
      sessionStorage.setItem(FIRED_KEY, '1');
    } catch {
      // storage unavailable: fall through and send once
    }
    queueOrSendEvent('Purchase', {
      value: TICKET_PRICE_BRL,
      currency: 'BRL',
      content_name: EVENT_NAME,
    });
  }, []);

  return null;
}
