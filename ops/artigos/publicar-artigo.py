#!/usr/bin/env python3
"""
Publica um artigo do W&W Circle e só diz "no ar" depois de ver a página no ar.

Roda no nexgen-core-01, chamado pelo cron KauaContentReady (OpenClaw):

    python3 publicar-artigo.py /srv/nexgen/runtime/claude-kaua/content/wwp/<pasta>/artigo.json

Três etapas, e a saída é sempre UMA linha de JSON no stdout:

1. Confere o arquivo com as mesmas regras do endpoint (lib/core/articles.core.ts).
   Recusar aqui custa zero rede e dá ao cron o motivo na hora.
2. POST em /api/artigos com o token, que mora em arquivo 600 do usuário openclaw.
3. Abre a URL pública e procura o título. Aceite do endpoint não é prova de que
   o leitor vê o artigo (cache, rewrite, deploy quebrado): só a página é.

Códigos de saída: 0 no ar · 2 artigo recusado (corrigir e rodar de novo) ·
3 endpoint falhou · 4 publicou mas a página não mostrou o título.
Nunca imprime o token nem o corpo do artigo.
"""
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ENDPOINT = os.environ.get("ARTIGOS_ENDPOINT", "https://wwc-landing-rho.vercel.app/api/artigos")
TOKEN_FILE = os.environ.get(
    "ARTIGOS_TOKEN_FILE", "/srv/nexgen/runtime/openclaw/secrets/ww-artigos.token"
)
DASHES = ("—", "–")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ZONE = re.compile(r"T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$")


def out(code, **fields):
    print(json.dumps(fields, ensure_ascii=False))
    sys.exit(code)


def check(article):
    """As mesmas recusas do endpoint, com as mesmas palavras."""
    slug = article.get("slug", "")
    if not isinstance(slug, str) or not SLUG.match(slug) or len(slug) > 90:
        return "slug só com minúsculas sem acento, números e hífen entre palavras (até 90)"
    for field, lo, hi in (("title", 5, 140), ("dek", 20, 300), ("body_md", 1500, 40000)):
        value = article.get(field)
        if not isinstance(value, str) or not (lo <= len(value.strip()) <= hi):
            return f"{field} precisa ter entre {lo} e {hi} caracteres"
        if any(dash in value for dash in DASHES):
            return f"travessão ou meia-risca em {field}: troque por vírgula, dois-pontos, ponto ou 'a'"
    body = article["body_md"]
    if re.search(r"^#[ \t]", body, re.M):
        return "h1 (# ) no body_md: use ## e ###"
    if re.search(r"<[a-zA-Z/!]", body):
        return "HTML cru no body_md: use só markdown"
    sources = article.get("sources")
    if not isinstance(sources, list) or not (1 <= len(sources) <= 30):
        return "sources precisa de 1 a 30 fontes"
    for source in sources:
        if not isinstance(source, dict) or not str(source.get("label", "")).strip():
            return "fonte sem label"
        if not str(source.get("url", "")).startswith("https://"):
            return "toda fonte precisa de url https"
    published = article.get("published_at")
    if published and not ZONE.search(str(published).strip()):
        return "published_at: data e hora com fuso, como 2026-09-14T10:00:00-03:00"
    return None


def main():
    if len(sys.argv) != 2:
        out(2, ok=False, error="uso: publicar-artigo.py <artigo.json>")

    path = sys.argv[1]
    try:
        with open(path, encoding="utf-8") as handle:
            article = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        out(2, ok=False, error=f"não consegui ler {path}: {error.__class__.__name__}")

    problem = check(article)
    if problem:
        out(2, ok=False, error=problem)

    try:
        with open(TOKEN_FILE, encoding="utf-8") as handle:
            token = handle.read().strip()
    except OSError:
        out(3, ok=False, error=f"token ausente em {TOKEN_FILE}")

    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(article, ensure_ascii=False).encode("utf-8"),
        headers={"content-type": "application/json", "authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        try:
            reason = json.loads(error.read().decode("utf-8")).get("error")
        except Exception:
            reason = None
        # 400 é o artigo (corrigir e rodar de novo); o resto é o caminho.
        out(2 if error.code == 400 else 3, ok=False, status=error.code, error=reason or "sem motivo")
    except (urllib.error.URLError, TimeoutError) as error:
        out(3, ok=False, error=f"endpoint inalcançável: {error.__class__.__name__}")

    url = result.get("url")
    if result.get("hidden"):
        out(0, ok=True, url=url, hidden=True, note="texto atualizado, mas o artigo está escondido no admin")

    # A página lê a cada request, mas o primeiro acesso pode pegar um deploy
    # subindo. Três tentativas espaçadas antes de chamar de falha.
    title = html.escape(article["title"].strip(), quote=False)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as page:
                body = page.read().decode("utf-8", "replace")
            if title in body or article["title"].strip() in html.unescape(body):
                out(0, ok=True, url=url, created=result.get("created"), title=article["title"].strip())
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(5 * (attempt + 1))

    out(4, ok=False, url=url, error="publicou, mas a página pública não mostrou o título")


if __name__ == "__main__":
    main()
