#!/usr/bin/env node
'use strict';
// Local emulation of: htmlproofer ./_site --assume-extension --allow-hash-href --disable-external --check-html
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', '_site');
const BASE = '/blog';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

function resolveInternal(p) {
  // strip baseurl, query, hash
  let p2 = p.split('#')[0].split('?')[0];
  if (p2.startsWith(BASE)) p2 = p2.slice(BASE.length);
  if (!p2.startsWith('/')) return null; // relative handled separately
  return p2;
}

function existsFor(target, fromDir, rawHref) {
  // assume-extension: try target itself, target + .html, target + /index.html
  const candidates = rawHref.startsWith('/')
    ? [path.join(SITE, target), path.join(SITE, target + '.html'), path.join(SITE, target, 'index.html')]
    : [path.join(fromDir, rawHref.split('#')[0].split('?')[0]),
       path.join(fromDir, rawHref.split('#')[0].split('?')[0] + '.html'),
       path.join(fromDir, rawHref.split('#')[0].split('?')[0], 'index.html')];
  return candidates.some(c => fs.existsSync(c) && fs.statSync(c).isFile());
}

const files = walk(SITE).filter(f => /\.(html|md|xhtml|htm)$/i.test(f));
let failures = 0;
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const fromDir = path.dirname(file);
  const attrs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const raw of attrs) {
    if (!raw || raw.startsWith('#')) continue; // --allow-hash-href
    if (/^[a-z]+:/i.test(raw) || raw.startsWith('//')) continue; // external (disabled) + data:, mailto:, tel:
    const ok = existsFor(resolveInternal(raw) || '', fromDir, raw);
    if (!ok) {
      failures++;
      console.log(`BROKEN  ${path.relative(SITE, file)}  ->  ${raw}`);
    }
  }
}
console.log(failures === 0 ? 'OK: no broken internal links' : `${failures} broken link(s)`);
process.exit(failures === 0 ? 0 : 1);
