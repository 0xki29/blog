/* Build a pixel-accurate production preview of a drafts/ post.
   Usage: node tools/build-preview.js drafts/microweber-unauth-rce-chain-d.md */
'use strict';
const fs = require('fs');
const path = require('path');
const { marked } = require(path.join(__dirname, 'node_modules', 'marked'));

const root = path.resolve(__dirname, '..');
const md = fs.readFileSync(path.join(root, process.argv[2]), 'utf8');

const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (!fm) { throw new Error('no front matter found'); }
const meta = {};
(fm[1] || '').split(/\r?\n/).forEach(l => {
  const m = l.match(/^(\w[\w-]*):\s*"?(.*?)"?\s*(?:#.*)?$/);
  if (m) meta[m[1]] = m[2];
});
const body = md.slice(fm[0].length);

let html = marked.parse(body, { gfm: true });

/* production-grade syntax highlighting: highlight.js -> rouge class names
   (phantom.scss styles rouge tokens, so preview matches production colors) */
const hljs = require(path.join(__dirname, 'node_modules', 'highlight.js'));
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const MAP = { keyword: 'k', built_in: 'nb', string: 's', comment: 'c', number: 'm', title: 'nf', attr: 'na', attribute: 'na', literal: 'kc', variable: 'nv', 'function': 'nf', type: 'kt', symbol: 'o', operator: 'o', property: 'na', regexp: 'sr', subst: 'p', params: 'p', tag: 'nt', name: 'nt', 'selector-tag': 'nt', 'selector-class': 'nc', doctag: 'c', section: 'gh', meta: 'gh', 'meta-keyword': 'k', 'meta-string': 's', addition: 'gi', deletion: 'gd' };
html = html.replace(/<pre><code(?: class="language-([\w#+.-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (m, lang, esc) => {
  let inner = esc;
  const raw = unesc(esc);
  if (lang && hljs.getLanguage(lang)) {
    try {
      inner = hljs.highlight(raw, { language: lang, ignoreIllegals: true }).value
        .replace(/<span class="hljs-([\w-]+)">/g, (mm, cls) => MAP[cls] ? '<span class="' + MAP[cls] + '">' : '<span>');
    } catch (e) { inner = esc; }
  }
  return '<div class="' + (lang ? 'language-' + lang + ' ' : '') +
    'highlighter-rouge code"><div class="highlight"><pre><code>' + inner + '</code></pre></div></div>';
});

const words = body.replace(/[#`>*\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;
const mins = Math.max(1, Math.round(words / 200));
const tags = (meta.tags || '').replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
const title = meta.title || 'Untitled';
const date = (meta.date || '').split(' ')[0] || '';

const head = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#050a14">
<meta name="color-scheme" content="dark">
<title>${title} — 0xki29</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='%2322d3ee' stroke-width='9' stroke-dasharray='14 12'/%3E%3Ccircle cx='50' cy='50' r='9' fill='%2322d3ee'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<style>body{margin:0;background:#050a14;color:#c7d2e0;font-family:Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}</style>
<script>(function(){var s=false;try{s=!!sessionStorage.getItem('phantom_intro_seen')}catch(e){}if(!s&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)s=true;if(s)document.documentElement.classList.add('no-intro')})();</script>
<link rel="stylesheet" href="/blog/drafts/preview.css">
</head>`;

const intro = `<div id="intro" aria-hidden="true"><div class="stage"><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div><svg class="locksvg" id="locksvg" viewBox="0 0 120 150" fill="none" aria-hidden="true"><g class="lockg"><path class="shackle" d="M42 62 V40 a18 18 0 0 1 36 0 V62"/><rect class="lockbody" x="30" y="58" width="60" height="64" rx="9"/><rect class="chamber" x="34" y="66" width="8" height="30" rx="2"/><rect class="chamber" x="45" y="66" width="8" height="30" rx="2"/><rect class="chamber" x="56" y="66" width="8" height="30" rx="2"/><rect class="chamber" x="67" y="66" width="8" height="30" rx="2"/><rect class="chamber" x="78" y="66" width="8" height="30" rx="2"/><rect class="pin" x="34" y="88" width="8" height="7" rx="2"/><rect class="pin" x="45" y="88" width="8" height="7" rx="2"/><rect class="pin" x="56" y="88" width="8" height="7" rx="2"/><rect class="pin" x="67" y="88" width="8" height="7" rx="2"/><rect class="pin" x="78" y="88" width="8" height="7" rx="2"/><rect class="keyway" x="54" y="101" width="12" height="15" rx="3"/></g></svg><div class="log" id="intro-log"></div><div class="bar"><i id="intro-fill"></i></div><div class="granted" id="intro-granted"></div></div><div class="flash" id="intro-flash"></div></div>`;

/* --- simulate Jekyll server-side pieces: related posts + prev/next nav ---
   (reads the real _posts/ front matter, same scoring as the Liquid template) */
const postsDir = path.join(root, '_posts');
const posts = [];
if (fs.existsSync(postsDir)) {
  fs.readdirSync(postsDir).filter(f => f.endsWith('.md')).forEach(f => {
    const t = fs.readFileSync(path.join(postsDir, f), 'utf8');
    const m2 = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m2) return;
    const mm = {};
    m2[1].split(/\r?\n/).forEach(l => {
      const x = l.match(/^(\w[\w-]*):\s*"?(.*?)"?\s*(?:#.*)?$/);
      if (x) mm[x[1]] = x[2];
    });
    posts.push({
      file: f,
      date: mm.date || '',
      title: mm.title || f,
      tags: (mm.tags || '').replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean)
    });
  });
}
posts.sort((a, b) => (a.date < b.date ? -1 : 1));            /* oldest -> newest */
const slug = f => f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
let related = posts.filter(p => p.tags.some(t => tags.indexOf(t) !== -1));   /* shared tags first */
const fillers = posts.slice().reverse().filter(p => related.indexOf(p) === -1);
while (related.length < 3 && fillers.length) related.push(fillers.shift());  /* newest fill */
related = related.slice(0, 3);
const relHtml = related.length ? `
  <section class="related">
    <div class="sec-title">// related reports</div>
    <div class="cards">
    ${related.map(r => '      <a class="card hud" href="/blog/' + slug(r.file) + '"><div class="card-meta"><span>' + (r.date || '').split(' ')[0] + '</span></div><h3>' + r.title + '</h3><span class="card-read">open report &rarr;</span></a>').join('\n')}
    </div>
  </section>` : '';
const prevPost = posts[posts.length - 1];                     /* newest existing = "previous" */
const prevHtml = prevPost ? `
  <nav class="post-nav"><a class="prev" href="/blog/${slug(prevPost.file)}">&larr; ${prevPost.title.slice(0, 44)}</a></nav>` : '';

const page = `${head}
<body>
<a class="skip" href="#main_content">[ skip to content ]</a>
<div class="bg-glow" aria-hidden="true"></div>
<div class="bg-orb o1" aria-hidden="true"></div><div class="bg-orb o2" aria-hidden="true"></div><div class="bg-orb o3" aria-hidden="true"></div>
<div class="bg-grid" aria-hidden="true"></div><div class="scanlines" aria-hidden="true"></div><div class="sweep" aria-hidden="true"></div>
${intro}
<div id="rprogress" aria-hidden="true"></div>
<div class="site">
<header class="nav">
  <a class="nav-logo" href="/blog/">0xki29<span class="at">@ops</span>:~$<span class="cur"></span></a>
  <nav class="nav-links" aria-label="Primary">
    <a href="/blog/">Blog</a><a href="/blog/archive/">Archive</a><a href="/blog/tags/">Tags</a><a href="/blog/about/">About</a><a href="/blog/atom.xml">RSS</a>
    <span class="status"><span class="dot"></span>RED&nbsp;TEAM&nbsp;ACTIVE</span>
  </nav>
</header>
<main class="container" id="main_content" tabindex="-1">
<article class="post">
  <div class="post-meta">
    <time>${date}</time><span>&middot; ${mins} min read</span>
    ${tags.map(t => '<span class="tag">' + t + '</span>').join('')}
  </div>
  <h1 class="post-title">${title}</h1>
  <div class="post-body">
${html}
  </div>
  <div class="cite-wrap">
    <button class="cite-btn" type="button" aria-expanded="false" aria-controls="cite-pop">[ cite ]</button>
    <div class="cite-pop" id="cite-pop" hidden>
      <div class="cite-tabs"><button class="cite-tab on" type="button" data-tab="bibtex">bibtex</button><button class="cite-tab" type="button" data-tab="plain">plain text</button></div>
      <pre class="cite-code" id="cite-bibtex">@misc{ki292026microweber,
  author = {0xki29},
  title  = {${title}},
  year   = {2026},
  url    = {[FILL]}
}</pre>
      <pre class="cite-code" id="cite-plain" hidden>0xki29. "${title}." 0xki29 - security research, 2026. [FILL] (accessed [DATE]).</pre>
      <button class="cite-copy" type="button">copy</button>
    </div>
  </div>
${relHtml}${prevHtml}
  <p style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:40px;border:1px dashed var(--line);border-radius:10px;padding:12px 16px">[ preview mode ] everything above is the real production markup - related posts and prev/next are simulated from the live _posts directory. Search (/) needs the Jekyll-built search.json and only works on production.</p>
</article>
</main>
<footer>
  <div class="foot-line">&copy; 2026 <b>0xki29</b> &middot; security researcher</div>
  <div class="foot-sub">every finding responsibly disclosed &middot; <span class="sig">red is reserved for threats</span> &middot; <a href="https://github.com/0xki29" rel="me noopener noreferrer">github</a></div>
</footer>
</div>
<button id="totop" type="button" aria-label="Back to top">&#9650; top</button>
<script src="/blog/js/main.js" defer></script>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'drafts', 'preview.html'), page);
console.log('preview written: drafts/preview.html (' + page.length + ' bytes, ' + mins + ' min read, ' + tags.length + ' tags)');

