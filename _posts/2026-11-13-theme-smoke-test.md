---
layout: post
title: "Theme Smoke Test (temporary)"
date: 2026-11-13 23:30:00 +0700
categories: [Meta]
tags: [meta]
---

> This post exists only to verify every layout element on production. It will be deleted after review. Nothing sensitive here — just markup.

## Headings and typography

Inline styles: **bold**, *italic*, `inline code`, an [internal link](/blog/about/) and an [external link](https://github.com/microweber/microweber/releases) (should get the ↗ marker). Lorem-grade filler follows so the reading-time and TOC behave like a real article. The quick brown fox jumps over the lazy dog while `parse_params($data)` keeps the mono font honest.

### A third-level heading (TOC indents me)

Text under h3 — check the left border accent and spacing.

## Lists and quote

1. Ordered item with `code`
2. Ordered item two
   - Nested bullet
   - Another nested bullet
3. Ordered item three

> A blockquote for the dotted-border style. Severity of a bug is a property of primitives and their composition — not of single lines.

## Table

| Primitive | Isolation severity | In a chain |
|---|---|---|
| Raw write to DB | low | webshell seed |
| Arbitrary file copy | medium | shell placement |
| Referer-only guard | low | execution gate |

## Code blocks (php / bash / nginx / diff)

```php
public function save($data)
{
    if (is_string($data)) {
        $data = parse_params($data);   // keyword/string/comment colors
    }
    return $data . '-' . 42;
}
```

```bash
# comment line
python exploit/example.py -t http://127.0.0.1:8888 --test
```

```nginx
location ~* ^/userfiles/.*\.php$ { deny all; }
```

```diff
- $blocked = false;
+ $blocked = !in_array($cb, $ALLOWED, true);
```

## Images (lightbox targets)

![NukeViet custom field screen reused as a layout fixture](/blog/assets/custom.webp)

![Registration request capture reused as a layout fixture](/blog/assets/custom1.webp)

## Final section for TOC length

Scroll back up: the TOC on the right should have tracked this whole trip. Click `[ cite ]` below to check the citation popover, try `/` for search, and `Ctrl+P` for the print sheet. When everything looks right, this post gets deleted.
