'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * O modo leitura (claro) dos artigos.
 *
 * Três peças, porque o tema tem de valer antes da primeira pintura, sobreviver
 * à navegação dentro dos artigos e sumir ao sair deles:
 *
 * - `THEME_BOOT`: script inline do layout dos artigos. Roda no carregamento
 *   direto e põe `data-theme` no `<html>` antes de a página pintar, então
 *   quem escolheu o claro não vê um flash escuro.
 * - `ReadingThemeSync`: aplica a escolha quando se chega aos artigos por
 *   navegação interna (script inline não roda de novo) e tira o atributo ao
 *   sair, para o resto da plataforma continuar escuro.
 * - `ReadingThemeToggle`: o botão. Pode haver mais de um na página (barra do
 *   topo e coluna lateral); todos leem a mesma fonte e ficam em sincronia.
 */

const KEY = 'ww-leitura';
const EVENT = 'ww-leitura';

export const THEME_BOOT = `try{if(localStorage.getItem('${KEY}')==='claro'){document.documentElement.dataset.theme='light'}}catch(e){}`;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'claro';
  } catch {
    return false;
  }
}

function apply(light: boolean) {
  if (light) document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function useLight(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function ReadingThemeSync() {
  const light = useLight();

  useEffect(() => {
    apply(light);
  }, [light]);

  useEffect(() => () => apply(false), []);

  return null;
}

export function ReadingThemeToggle({ className = '' }: { className?: string }) {
  const light = useLight();

  function toggle() {
    try {
      localStorage.setItem(KEY, light ? 'escuro' : 'claro');
    } catch {
      // Navegação privada sem storage: o tema muda nesta página e não é lembrado.
      apply(!light);
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={light}
      className={`inline-flex min-h-11 items-center gap-2.5 border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[11px] uppercase tracking-[0.16em] text-[var(--text-2)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-1)] ${className}`}
    >
      {light ? <MoonIcon /> : <SunIcon />}
      {light ? 'Modo escuro' : 'Modo claro'}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
