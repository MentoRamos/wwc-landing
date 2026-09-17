import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentMask, walk } from './helpers/source';

/**
 * Toda Server Action precisa que o domínio público esteja em `allowedOrigins`.
 *
 * O Next compara `Origin` com `Host` (ou `X-Forwarded-Host`) e **aborta** a
 * requisição quando diferem. É proteção contra CSRF e está certa. Mas a
 * plataforma não é servida direto: quem atende `kauaramos.com` é o projeto do
 * funil, que encaminha os caminhos daqui por rewrite. Origem e host diferem
 * por construção, então sem `allowedOrigins` nenhuma Server Action funciona no
 * domínio de verdade.
 *
 * Isso ficou vivo em produção sem ninguém ver, e o modo de falhar explica o
 * porquê: a ação nunca chega a ser invocada. Nenhum `try/catch` dentro dela
 * roda, nada aparece no log da aplicação, e a tela mostra só o error boundary
 * com um digest — parece bug da ação, e não é. Conceder acesso a quem pagou
 * estava quebrado, e `check:admin` passava 8/8, porque ele dirige o servidor
 * em localhost, onde origem e host são o mesmo.
 *
 * O teste é modesto de propósito: ele não prova que a origem certa está lá em
 * produção, prova que a configuração existe e cobre o domínio público sempre
 * que houver Server Action no código. A prova de verdade é apertar o botão em
 * `kauaramos.com`, e essa é manual.
 */
const APEX = 'kauaramos.com';

function actionFiles(): string[] {
  return ['app', 'components', 'lib']
    .flatMap((root) => walk(join(process.cwd(), root), ['.ts', '.tsx']))
    .filter((path) => {
      const source = readFileSync(path, 'utf8');
      const mask = commentMask(source);
      const at = source.indexOf("'use server'");
      return at !== -1 && !mask[at];
    });
}

describe('as Server Actions atrás do rewrite', () => {
  it('existem, senão este teste não está protegendo nada', () => {
    expect(actionFiles().length).toBeGreaterThan(0);
  });

  it('têm o domínio público declarado em allowedOrigins', () => {
    const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');

    expect(config).toContain('allowedOrigins');

    // A entrada exata entre aspas, e não `toContain`: o apex é substring de
    // `www.kauaramos.com`, então uma checagem por substring passa verde mesmo
    // se o apex sair da lista. Descobri plantando o defeito e vendo o teste
    // aprovar.
    expect(config).toMatch(new RegExp(`['"\`]${APEX.replace('.', '\\.')}['"\`]`));
  });
});
