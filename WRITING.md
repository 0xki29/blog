# WRITING.md — author guide (internal, excluded from the site build)

Mọi convention khi viết bài mới cho blog. File này KHÔNG được publish (đã nằm trong `exclude` của `_config.yml`).

## 1. Front matter chuẩn

```yaml
---
layout: post
title: "Post Title"
date: 2026-01-01 10:00:00 +0700
categories: [Security, PHP]          # broad groups
tags: [rce, php, cms]                # lowercase, kebab-case — drives /tags/, search, related
image: "https://0xki29.github.io/blog/assets/og/<slug>.png"   # optional, override OG default
updated: 2026-02-01                  # optional — hiển thị "updated" trên post
changelog:                           # optional — list strings
  - "Fixed wrong opcode offset"
  - "Added mitigation section"
series: "my-series-slug"             # optional — cùng giá trị cho các phần
series_order: 1                      # optional — thứ tự trong series
comments: false                      # optional — tắt giscus cho bài nhạy cảm
---
```

## 2. Ảnh

1. Thả file vào `assets/`, chạy `powershell tools\optimize-images.ps1` (tự convert WebP nếu nhỏ hơn ≥ 8%)
2. Nhúng: `![Mô tả ảnh: vị trí UI + hành động/kết quả](/blog/assets/ten-file.webp)`
3. Alt KHÔNG để trống (trừ ảnh thuần trang trí). Công thức: *vị trí UI + hành động/hiển thị gì*
4. OG image cho bài mới: sửa `tools/make-og.ps1` thêm 1 dòng `New-OgImage`, chạy lại, rồi khai báo `image:` ở front matter

## 3. Diff / patch

Dùng fenced block ` ```diff ` — style added/removed đã có sẵn:

```diff
- $blocked = false;
+ $blocked = !in_array($cb, $ALLOWED_CALLBACKS, true);
```

## 4. Sơ đồ mermaid (attack flow)

Không ship mermaid runtime (1MB). Render lúc viết:

```
powershell tools\render-mermaid.ps1 assets\diagrams\attack-flow.mmd
```

→ nhúng `attack-flow.svg` như ảnh thường.

## 5. Comments (giscus) — kích hoạt 1 lần

1. Bật Discussions trên repo
2. Cài app https://giscus.app, chọn category
3. Điền 4 giá trị `giscus:` trong `_config.yml`

Reader chỉ load iframe khi bấm `[ load_comments ]`.

## 6. Analytics (GoatCounter) — kích hoạt 1 lần

Tạo account free tại goatcounter.com → điền `goatcounter.code` trong `_config.yml`. Cookieless, 2.5KB.

## 7. Trước khi push

- `node --check js\main.js`
- Push → CI (GitHub Actions) tự build + html-proofer
- Sau deploy: chạy checklist 8 bước trong `upgrade.md` §7
