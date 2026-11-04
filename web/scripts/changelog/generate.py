#!/usr/bin/env python3
"""Build a searchable static page from the homelab changelog."""
import html
import re
import argparse
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from markdown_it import MarkdownIt

SOURCE = 'https://github.com/duynhlab/homelab/blob/main/'
HEADING = re.compile(r'^## \[(Unreleased|\d+\.\d+\.\d+(?:[-+][^\]]+)?)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$', re.MULTILINE)


def render(text: str) -> str:
    md = MarkdownIt('commonmark', {'html': False}).enable('table').enable('strikethrough')
    tokens = md.parse(text)
    for token in tokens:
        if token.children:
            for child in token.children:
                if child.type == 'link_open':
                    href = child.attrGet('href')
                    if href and href.startswith('#'):
                        child.attrSet('href', SOURCE + 'CHANGELOG.md' + href)
                    elif href and not urlsplit(href).scheme and not href.startswith('//'):
                        child.attrSet('href', urljoin(SOURCE, href.lstrip('/')))
    return md.renderer.render(tokens, md.options, {})


def build(text: str) -> str:
    matches = list(HEADING.finditer(text))
    if not matches:
        raise ValueError('No changelog releases found')
    releases = [m for m in matches if m.group(1) != 'Unreleased']
    articles = []
    seen = set()
    appendix = re.search(r'^## (?!\[)', text[matches[-1].end():], re.MULTILINE)
    appendix_start = matches[-1].end() + appendix.start() if appendix else len(text)
    for i, match in enumerate(matches):
        version, date = match.groups()
        end = matches[i + 1].start() if i + 1 < len(matches) else appendix_start
        body = text[match.end():end]
        anchor = 'unreleased' if version == 'Unreleased' else 'v' + version
        if anchor in seen:
            anchor += '-' + (date or str(i))
        seen.add(anchor)
        date_html = f' <time datetime="{html.escape(date)}">{html.escape(date)}</time>' if date else ''
        articles.append(f'<article class="entry" id="{html.escape(anchor, quote=True)}"><h2><a href="#{html.escape(anchor, quote=True)}">{html.escape(version)}</a>{date_html}</h2>{render(body)}</article>')
    latest = releases[0].group(1) if releases else '—'
    entries = '\n'.join(articles)
    extra = render(text[appendix_start:])
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Homelab changelog</title><style>
* {{ box-sizing: border-box }} body {{ margin: 0; font: 15px/1.6 system-ui, sans-serif; color: #222; background: #fff }}
header {{ background: #1d98dc; color: white; text-align: center; padding: 2rem 1rem }} header h1 {{ margin: 0 }} header p {{ margin: .3rem 0 0 }}
main {{ max-width: 850px; margin: auto; padding: 0 1rem 2rem }} .search {{ position: sticky; top: 0; padding: 1rem 0; background: white; z-index: 1 }}
input {{ width: 100%; font: inherit; padding: .6rem; border: 1px solid #aaa; border-radius: 4px }} input:focus {{ outline: 2px solid #168acd }}
.entry {{ padding: .5rem 0 1.5rem; border-bottom: 1px solid #ddd; scroll-margin-top: 5rem; overflow-wrap: anywhere }}
h2 {{ margin-bottom: .3rem }} h2 a {{ color: inherit; text-decoration: none }} h2 a:hover {{ text-decoration: underline }} time {{ color: #777; font-size: .75em; font-weight: normal }}
h3 {{ margin-bottom: .4rem }} h4 {{ margin: .8rem 0 .3rem }} li {{ margin: .3rem 0 }} a {{ color: #0874ad }} code {{ background: #f2f2f2; padding: .1em .2em }} pre {{ overflow: auto }}
[hidden] {{ display: none }} footer {{ text-align: center; color: #666; padding: 1rem }}
</style></head><body><header><h1>Homelab changelog</h1><p>{len(releases)} releases · latest: {html.escape(latest)}</p></header>
<main><div class="search"><input id="search" type="search" aria-label="Search versions and changes" placeholder="Search versions and changes…"></div><div id="entries">{entries}</div><p id="empty" hidden>No matching entries.</p><section>{extra}</section></main>
<footer>Generated from <a href="{SOURCE}CHANGELOG.md">CHANGELOG.md</a>.</footer>
<script>const input = document.querySelector('#search'); const entries = [...document.querySelectorAll('.entry')]; let timer;
input.addEventListener('input', () => {{ clearTimeout(timer); timer = setTimeout(() => {{ const q = input.value.trim().toLowerCase(); let visible = 0; for (const entry of entries) {{ entry.hidden = !entry.textContent.toLowerCase().includes(q); if (!entry.hidden) visible++; }} document.querySelector('#empty').hidden = visible !== 0; }}, 150); }});</script></body></html>'''


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    src, out = args.source, args.output
    page = build(src.read_text(encoding='utf-8'))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding='utf-8')
    print(f'Generated {out} ({len(page):,} characters)')


if __name__ == '__main__':
    main()
