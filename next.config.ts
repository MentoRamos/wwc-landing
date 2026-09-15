import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Opt-in escape hatch, default unchanged.
  //
  // This machine runs a disk watchdog that deletes every `.next` under
  // ~/Projects whenever free space drops below its threshold — including one
  // being written to, which fails the build with a bare ENOENT. Setting
  // NEXT_DIST_DIR to any other name puts the build somewhere its `-name
  // ".next"` no longer matches, without turning off a guard that exists
  // because this Mac has panicked on a full disk before.
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',

  // Pinned: there is another lockfile in the home directory, and Next picks
  // that as the workspace root otherwise.
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },

  /**
   * Sem isto, NENHUMA Server Action funciona em kauaramos.com.
   *
   * O Next compara o cabecalho `Origin` com o `Host` (ou `X-Forwarded-Host`) e
   * **aborta a requisicao** quando diferem. E protecao contra CSRF, e esta
   * certa. So que a plataforma nao e servida direto: quem atende
   * kauaramos.com e o projeto do funil, que encaminha os caminhos daqui por
   * rewrite. Entao o navegador manda `Origin: kauaramos.com` e o app ve o host
   * do deployment da Vercel. Origem diferente de host, requisicao abortada.
   *
   * O modo como isso falha e o que o tornou invisivel: a acao nunca chega a
   * ser invocada, entao nenhum try/catch dentro dela roda, nada aparece no log
   * da aplicacao, e a tela so mostra o error boundary com um digest. Parece
   * bug da acao e nao e.
   *
   * E os testes nao pegavam porque `check:admin` dirige o servidor em
   * localhost, onde origem e host sao o mesmo. Passava 8/8 enquanto conceder
   * acesso estava quebrado em producao.
   *
   * Entram o apex, o www e o dominio do deployment. O host do evento entra por
   * variavel porque ele ainda nao foi comprado.
   */
  experimental: {
    serverActions: {
      allowedOrigins: [
        'kauaramos.com',
        'www.kauaramos.com',
        'wwc-landing-rho.vercel.app',
        ...(process.env.EVENT_HOST?.trim() ? [process.env.EVENT_HOST.trim()] : []),
      ],
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // The logo asks for 95; Next 16 refuses any quality not listed here.
    qualities: [75, 95],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
  },
};

export default nextConfig;
