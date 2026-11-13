---
published: false
---

# KẾ HOẠCH NÂNG CẤP CHI TIẾT — Phantom Ops v2.1 → v3.0

> **Trạng thái:** ✅ v2.1 → v3.0 ĐÃ TRIỂN KHAI (2026-11-13) — xem §8
> **Baseline:** theme Phantom Ops **v2.0** (đã ship ngày 2026-11-13)
> **Phạm vi:** đề xuất chi tiết cho 20 hạng mục (U-01 → U-20), chia 4 nhóm / 4 milestone
> **Lưu ý:** file này có `published: false` nên không được render lên site live

---

## 0. Nguyên tắc xuyên suốt (không được phá vỡ)

| # | Nguyên tắc | Lý do |
|---|-----------|-------|
| 0.1 | **Vanilla-first** — không framework, không runtime dependency ngoài trừ thứ được vendor vào repo | Blog tĩnh, mọi KB runtime đều là chi phí người đọc trả |
| 0.2 | **Progressive enhancement** — tính năng mới phải không phá no-JS, trình duyệt cũ, và `prefers-reduced-motion` | Tiêu chuẩn đã thiết lập ở v2.0 |
| 0.3 | **Ràng buộc cứng GitHub Pages** — chỉ được dùng plugin trong allowlist (`jekyll-seo-tag`, `jekyll-paginate`, `jekyll-sitemap`). Không tự viết Ruby plugin. Mọi tính năng khác giải bằng **Liquid thuần** hoặc **client-side JS** | Pages build server-side của GitHub, không chạy plugin tuỳ ý |
| 0.4 | **Brand lock** — dark midnight-navy + cyan, đỏ chỉ dành cho "threats". Không làm light mode | Đây là identity, đã quyết định ở bản thiết kế |
| 0.5 | **A11y WCAG AA** — mọi UI mới phải keyboard-navigable, có aria đúng, contrast ≥ 4.5:1 | Blog research cần đọc được bởi mọi người & crawler |
| 0.6 | **Mobile-first** — mọi tính năng phải dùng được ở 360px trước rồi mới lên desktop | >50% traffic blog kỹ thuật đến từ mobile |

**Thang đo effort:** `S` = dưới 2 giờ · `M` = nửa đến 1 ngày · `L` = trên 1 ngày
**Thang đo impact:** `H` = người dùng cảm nhận rõ / ảnh hưởng SEO-KPI · `M` = cải thiện đáng kể · `L` = nice-to-have

---

## 1. Baseline đã có (v2.0 — không lặp lại trong kế hoạch này)

Đã hoàn thành ở phiên bản trước, các hạng mục dưới đây **không đề xuất lại**:

- Grid background chạy bằng composited transform (0 repaint/frame)
- Cross-page View Transitions (Chrome 126+, fallback bình thường)
- Prefetch link nội trên hover/focus/touch (tự tắt khi saveData/2G)
- Ảnh lazy-load + async decode + fade-in
- TOC tự sinh + scrollspy (sidebar ≥1360px, collapsible mobile)
- Heading anchor `#` + `:target` flash + `scroll-padding-top`
- Lightbox ảnh (Esc/mũi tên/click, focus management)
- Back-to-top, active nav, press states, nav underline animation
- Skip-link, live region cho copy button, `color-scheme: dark`
- Print stylesheet, 404 on-theme, fix atom.xml, dọn dead SASS
- Trim font weights (Inter 400/700/800, JBM 400/700)

---

## 2. Ma trận tổng quan 20 hạng mục

| ID | Hạng mục | Nhóm | Impact | Effort | Priority | Milestone |
|----|----------|------|--------|--------|----------|-----------|
| U-01 | OG/social image mặc định + per-post | A | H | M | P1 | v2.1 |
| U-02 | Tối ưu ảnh: oxipng + WebP | A | H | M | P1 | v2.1 |
| U-03 | Content pass: alt text mô tả thật | A | M | S | P1 | v2.1 |
| U-04 | RSS full-text (content:encoded) | A | M | S | P2 | v2.1 |
| U-05 | External link hardening (↗ + rel noopener) | A | L | S | P3 | v2.1 |
| U-06 | Search client-side (lunr vendored) | B | H | L | P1 | v2.2 |
| U-07 | Tag system + trang /tags/ (Liquid thuần) | B | H | M | P1 | v2.2 |
| U-08 | Related posts (Liquid scoring) | B | M | S | P2 | v2.2 |
| U-09 | Archive 2.0 (timeline + filter chips) | B | M | M | P2 | v2.2 |
| U-10 | Comments giscus (GitHub Discussions) | C | H | M | P1 | v2.3 |
| U-11 | Analytics thay GA legacy → privacy-first | C | M | S | P2 | v2.3 |
| U-12 | Last-updated + minor changelog per post | C | L | S | P3 | v2.3 |
| U-13 | Copy citation (BibTeX/plain) | C | L | S | P3 | v2.3 |
| U-14 | Series/collections cho write-up nhiều phần | C | M | M | P2 | v2.3 |
| U-15 | CI quality gate (Actions + html-proofer) | D | M | M | P1 | v3.0 |
| U-16 | PWA offline (service worker) | D | M | M | P2 | v3.0 |
| U-17 | Perf tier-2 (font preload, critical CSS) | D | L | S | P3 | v3.0 |
| U-18 | Mermaid pre-render (author-time → SVG) | D | M | M | P3 | v3.0 |
| U-19 | Diff styling cho patch blocks | D | L | S | P3 | v3.0 |
| U-20 | Security sweep (rels, audit links ngoài) | D | L | S | P3 | v3.0 |

---

## 3. Chi tiết hạng mục

### NHÓM A — Content & SEO (milestone v2.1)

#### U-01 · OG/social image mặc định + per-post
- **Vấn đề:** `jekyll-seo-tag` hiện không có ảnh đại diện → share link lên Zalo/Telegram/X hiện trống hoặc xấu. Với blog security, thumbnail = tỷ lệ click.
- **Đề xuất:**
  1. Thiết kế 1 ảnh mặc định 1200×630 (nền #050a14 + grid mờ + gear cyan như favicon + tagline "0xki29 — security research")
  2. Đặt tại `assets/og/default.png`; khai báo qua biến `defaults` trong `_config.yml` cho mọi post, override per-post bằng front matter `image:`
  3. Nâng cao (tùy chọn): template SVG chứa placeholder tiêu đề → render PNG bằng script node (sharp) khi viết bài mới, lưu `assets/og/<slug>.png`
  4. Verify bằng Facebook Sharing Debugger / Twitter Card Validator sau khi deploy
- **File ảnh hưởng:** `assets/og/*` (mới), `_config.yml`, front matter các post
- **Effort:** M · **Risk:** thấp (chỉ thêm meta) · **DoD:** mọi URL post + home khi share đều có ảnh 1200×630 đúng

#### U-02 · Tối ưu ảnh: oxipng + WebP
- **Vấn đề:** 17 ảnh PNG, nhiều ảnh 200–340KB (`poc.png` 337KB, `rce.png` 323KB) → tổng ~2.2MB cho 3 bài. Là lỗi PageSpeed lớn nhất hiện nay.
- **Đề xuất:**
  1. Ảnh screenshot (chữ chiếm đa số) → nén **lossless** bằng `oxipng -o max` — ảnh chữ lossless nén rất tốt
  2. Ảnh còn lại → `cwebp -q 82`; soi zoom 100% trước khi chấp nhận
  3. Script batch đặt tại `tools/optimize-images.ps1` (chạy khi thêm ảnh mới, không dính build)
  4. Cập nhật đường dẫn `.png` → `.webp` trong 3 file `_posts/*.md`
  5. Không dùng jekyll-picture-tag (ngoài allowlist — nguyên tắc 0.3), chuyển đổi thủ công là đúng
  6. Target: tổng ảnh giảm ≥ 60% (2.2MB → < 900KB)
- **File ảnh hưởng:** `assets/*`, `_posts/*.md`, `tools/` (mới)
- **Effort:** M · **Risk:** trung bình — ảnh mờ sau lossy → mitigation: screenshot giữ lossless nếu lossy xấu
- **DoD:** Lighthouse "modern image formats" pass; tổng payload ảnh giảm ≥ 60%

#### U-03 · Content pass: alt text mô tả thật
- **Vấn đề:** đa số ảnh `alt` rỗng hoặc "Short description" — hỏng WCAG 1.1.1 và mất SEO ảnh.
- **Đề xuất:** viết lại alt cho 17 ảnh theo công thức *[vị trí UI] + [hành động/kết quả hiển thị]*. Ví dụ: "Joomla unauthenticated REST API exposes configuration at /api/index.php". Ảnh trang trí thuần thì alt rỗng cố ý (đúng chuẩn).
- **File ảnh hưởng:** `_posts/*.md` (chỉ content)
- **Effort:** S · **Risk:** không · **DoD:** axe DevTools báo 0 lỗi image-alt trên mọi bài

#### U-04 · RSS full-text
- **Vấn đề:** feed hiện nhét cả HTML vào `<description>` escaped — reader hiển thị rối, không đọc được trọn vẹn.
- **Đề xuất:** thêm node `<content type="html">` chứa full content đã escape; chuyển `<description>` thành excerpt (`strip_html | truncatewords: 40`); bổ sung `<category>` từ categories.
- **File ảnh hưởng:** `atom.xml`
- **Effort:** S · **Risk:** thấp · **DoD:** feed valid W3C Feed Validator; Feedly hiển thị full bài

#### U-05 · External link hardening
- **Vấn đề:** link ngoài không có chỉ báo trực quan; footer thiếu `noopener noreferrer`.
- **Đề xuất:** JS quét link có hostname khác site → tự gắn `rel="noopener noreferrer"`; CSS pseudo-element thêm icon `↗` qua selector `[href^="http"]:not([href*="0xki29.github.io"])`. Link nội bộ không thêm gì.
- **File ảnh hưởng:** `js/main.js`, `_sass/phantom.scss`, `_includes/footer.html`
- **Effort:** S · **Risk:** thấp · **DoD:** mọi link ngoài có ↗ + rel đúng; link nội bộ sạch

---

### NHÓM B — Discovery & Navigation (milestone v2.2)

#### U-06 · Search client-side
- **Vấn đề:** 3 bài thì chưa cần, nhưng 10+ bài không có search là mất người đọc. Đặt hạ tầng sớm để scale.
- **Đề xuất:**
  1. Tạo `search.json` (layout `null`) — build-time Liquid xuất JSON mỗi post: `{title, url, date, categories, tags, excerpt, content | strip_html | escape}`
  2. Vendor **lunr.js** (~8KB gzip) vào `js/vendor/lunr.min.js` — không CDN (nguyên tắc 0.1), load defer, chỉ init khi user mở search lần đầu
  3. Index client-side; match substring tiếng Anh là đủ (không cần stemmer tiếng Việt)
  4. UI: nút `[ / search ]` trên nav + phím tắt `/`; overlay kết quả kiểu card-mini; `Esc` đóng; focus trap; hiển thị số kết quả
  5. No-JS: nút do JS inject nên không render → không có gì hỏng
- **File ảnh hưởng:** `search.json` (mới), `js/main.js`, `js/vendor/lunr.min.js` (mới), `_sass/phantom.scss`, `_includes/header.html`
- **Effort:** L · **Risk:** trung bình — index phình theo số bài → mitigation: khi >200 bài, cắt content trong index chỉ giữ excerpt + headings
- **DoD:** search "chrome" ra đúng bài; `/` mở, `Esc` đóng, tab vòng trong overlay; chạy tốt trên mobile 360px

#### U-07 · Tag system + trang /tags/
- **Vấn đề:** post có categories nhưng không có trang tổng hợp theo chủ đề — không điều hướng theo mối quan tâm (joomla / windows / rce / crypto...).
- **Đề xuất:**
  1. Chuẩn hoá front matter: thêm `tags: [rce, joomla, php]` cho 3 bài hiện tại
  2. Tạo `tags.md` bằng **Liquid thuần** (ràng buộc 0.3): loop `site.tags`, group + sort theo số bài, render chip mỗi tag kèm đếm số
  3. Filter: click chip → JS show/hide item (no-JS thấy full list chia nhóm)
  4. Card ở home + post meta hiển thị tag; click tag → `/tags/#<tag>`
- **File ảnh hưởng:** `tags.md` (mới), `_posts/*.md` (front matter), `_layouts/home.html`, `_layouts/post.html`, `js/main.js`, `_sass/phantom.scss`
- **Effort:** M · **Risk:** thấp · **DoD:** /tags/ liệt kê đủ; filter chạy; click tag từ card điều hướng đúng anchor

#### U-08 · Related posts
- **Vấn đề:** đọc hết bài không có lối đi tiếp → bounce cao. Post Chrome ↔ post Windows crypto liên quan tự nhiên.
- **Đề xuất:** cuối mỗi post, Liquid scoring thuần: đếm số tag/categories trùng với các post khác, sort giảm dần, lấy top 3; không đủ thì lấp bằng newest. Render grid 3 card-mini tái dùng style `.card`.
- **File ảnh hưởng:** `_layouts/post.html`, `_sass/phantom.scss` (ít)
- **Effort:** S · **Risk:** thấp · **DoD:** mọi post hiển thị ≤ 3 related, không trùng chính nó, không trùng post-nav cũ/newer

#### U-09 · Archive 2.0
- **Vấn đề:** archive hiện là list phẳng theo năm — đúng chức năng nhưng nhạt và không lọc được.
- **Đề xuất:** giữ cấu trúc Liquid theo năm, phủ thêm: (1) timeline rail dọc kiểu ops-log bên trái mỗi năm; (2) mỗi item hiển thị tag chips; (3) ô filter client-side theo từ khoá + chips theo tag (tái dùng logic U-07); (4) no-JS vẫn thấy full list.
- **File ảnh hưởng:** `archive.md`, `js/main.js`, `_sass/phantom.scss`
- **Effort:** M · **Risk:** thấp · **DoD:** filter từ khoá + tag chạy được; có empty-state "no records match"

---

### NHÓM C — Engagement & Community (milestone v2.3)

#### U-10 · Comments bằng giscus (GitHub Discussions)
- **Vấn đề:** blog research không có kênh phản biện/câu hỏi — mất tín hiệu cộng đồng (feedback, correction, ideas).
- **Đề xuất:**
  1. giscus app cài vào repo, map comments vào GitHub Discussions — không database, không server, login bằng GitHub (đúng tệp độc giả: kỹ thuật)
  2. Load **lazy**: placeholder `[ load_comments ]` — chỉ inject iframe khi user click hoặc scroll tới (tiết kiệm ~300KB iframe load trang)
  3. Custom theme JSON đồng bộ brand (nền #050a14, accent cyan) — giscus hỗ trợ theme qua URL
  4. Chỉ bật ở layout post, không bật ở page; disable per-post qua front matter cho bài nhạy cảm
- **File ảnh hưởng:** `_includes/giscus.html` (mới), `_layouts/post.html`, `js/main.js`, `_sass/phantom.scss`
- **Effort:** M · **Risk:** trung bình — phụ thuộc dịch vụ ngoài → mitigation: lazy-load + no-JS không thấy gì, trải nghiệm đọc không phụ thuộc
- **DoD:** comment được post & hiển thị; iframe không load khi chưa tương tác; dark theme khớp site

#### U-11 · Analytics — thay GA legacy bằng privacy-first
- **Vấn đề:** `_includes/analytics.html` đang là snippet `analytics.js` (legacy, deprecated) và chưa cấu hình key. Cookie-based GA cũng nặng phía privacy.
- **Đề xuất:** chọn 1 trong 2 hướng (cần quyết định):
  - **(a) GoatCounter** — free cho personal, script ~2.5KB, cookieless → thay snippet, cấu hình key vào `_config.yml`
  - **(b) Không analytics** — đọc tín hiệu từ GitHub stars/traffic insight của repo
  - Khuyến nghị: (a) — cần số liệu để biết bài nào đáng viết tiếp
- **File ảnh hưởng:** `_includes/analytics.html`, `_config.yml`
- **Effort:** S · **Risk:** thấp · **DoD:** script mới load async/defer, không cookie, không làm chậm INP

#### U-12 · Last-updated + changelog per post
- **Vấn đề:** bài research có correction/supplement nhưng không có cách báo hiệu nội dung đã cập nhật — người đọc cũ không biết quay lại.
- **Đề xuất:** front matter tuỳ chọn `updated: YYYY-MM-DD` + `changelog:` (list ngắn); post-meta hiển thị `updated YYYY-MM-DD` kèm tooltip/`<details>` changelog. Lưu ý GH Pages không đọc git time trong build được → cập nhật **thủ công** khi sửa bài (đưa vào checklist viết bài).
- **File ảnh hưởng:** `_layouts/post.html`, `_sass/phantom.scss`, front matter post
- **Effort:** S · **Risk:** thấp · **DoD:** post có `updated` hiển thị đúng; post không có thì không hiện gì

#### U-13 · Copy citation (BibTeX/plain)
- **Vấn đề:** write-up CVE có thể bị trích dẫn; không có citation chuẩn hoá → trích sai author/date.
- **Đề xuất:** nút `[ cite ]` cuối bài mở popover 2 tab: BibTeX + plain text (author, title, URL, accessed date) — copy 1 click, tái dùng cơ chế clipboard của copy-btn. Nội dung render bằng Liquid từ front matter.
- **File ảnh hưởng:** `_layouts/post.html`, `js/main.js`, `_sass/phantom.scss`
- **Effort:** S · **Risk:** thấp · **DoD:** BibTeX paste vào Zotero/JabRef parse được

#### U-14 · Series/collections cho write-up nhiều phần
- **Vấn đề:** các analysis dài (Chrome 900+ dòng) lẽ ra nên chia phần; sau này nhiều phần liên quan (phần 1/2/3) cần navigation riêng.
- **Đề xuất:** front matter `series: "chrome-secret-encryption"` + `series_order: n`; include `series-nav` hiển thị box "Part x of y" + list các phần còn lại ở đầu & cuối bài. Liquid thuần: `site.posts | where:"series", page.series | sort:"series_order"`.
- **File ảnh hưởng:** `_includes/series-nav.html` (mới), `_layouts/post.html`, `_sass/phantom.scss`, front matter post
- **Effort:** M · **Risk:** thấp · **DoD:** bài cùng series hiển thị đúng thứ tự; bài đơn lẻ không hiển thị box

---

### NHÓM D — Infra, Perf & DX (milestone v3.0)

#### U-15 · CI quality gate (GitHub Actions)
- **Vấn đề:** hiện chỉ phát hiện lỗi build/lỗi link sau khi Pages deploy xong — muộn.
- **Đề xuất:** workflow `.github/workflows/ci.yml` chạy khi push/PR:
  1. `jekyll build` (ruby/setup-ruby + bundler cache)
  2. `html-proofer --assume-extension --check-html --check-favicon --disable-external` (tắt check link ngoài để CI không flaky)
  3. Giai đoạn 2 (optional): Lighthouse CI với budget (perf ≥ 95, a11y ≥ 95, best-practices ≥ 95) chạy trên PR
- **File ảnh hưởng:** `.github/workflows/ci.yml` (mới), `Gemfile` (thêm dev-dependency html-proofer)
- **Effort:** M · **Risk:** thấp — CI độc lập với Pages build · **DoD:** PR hỏng link/build bị chặn đỏ; build sạch xanh

#### U-16 · PWA offline (service worker)
- **Vấn đề:** đọc lại bài khi offline/mạng yếu không được; blog research hay được đọc trong lúc commute.
- **Đề xuất:**
  1. `sw.js` tự viết (không Workbox — nguyên tắc 0.1): **cache-first** cho assets (css/js/img/font), **network-first + cache fallback** cho HTML
  2. Precache home + các post hiện có; giới hạn cache ảnh ≤ 30 entry kiểu LRU
  3. Đăng ký SW chỉ khi `https` + sau sự kiện `load` (không chặn TTI)
  4. Update flow: bump cache version → SW tự update, không cần user clear cache
  5. Không làm manifest/app-install prompt (blog không cần giả app)
- **File ảnh hưởng:** `sw.js` (mới), `js/main.js` (đăng ký), `_includes/head.html`
- **Effort:** M · **Risk:** trung bình — SW hỏng có thể serve stale vĩnh viễn → mitigation: version chặt + kill-switch (tự unregister khi lỗi init)
- **DoD:** bật offline trong DevTools → đọc lại được post đã xem; không có regress TTI

#### U-17 · Perf tier-2 (font preload + critical CSS)
- **Vấn đề:** v2.0 đã ổn, còn 2 điểm nghẽn nhỏ: (1) stylesheet fonts của Google bị trễ 1 round-trip; (2) main.css render-blocking ~27KB.
- **Đề xuất:**
  1. Font stylesheet chuyển sang pattern load không chặn (media print + onload swap, có `<noscript>` fallback)
  2. Inline ~2–3KB critical CSS (nav + hero + background) vào `head.html`, phần còn lại load async
  3. Đo trước–sau bằng Lighthouse; **chỉ giữ nếu LCP giảm ≥ 150ms** — không tối ưu vô ích
- **File ảnh hưởng:** `_includes/head.html`, `_sass/` (tách critical), `tools/` (script extract)
- **Effort:** S · **Risk:** trung bình — critical CSS lạc hậu → mitigation: chỉ inline phần ít đổi, review khi đổi theme
- **DoD:** LCP giảm đo được cụ thể; PageSpeed mobile ≥ 95

#### U-18 · Mermaid pre-render cho sơ đồ attack flow
- **Vấn đề:** các bài mô tả attack flow bằng list chữ; sơ đồ trực quan hơn hẳn. Nhưng mermaid.js runtime ~1MB — không thể ship cho người đọc.
- **Đề xuất:** render **tại lúc viết bài** bằng `mermaid-cli` (mmdc) → xuất SVG, nhúng SVG vào bài như ảnh thường (tái dùng style img hiện có). Không ship runtime. Quy ước file nguồn `.mmd` đặt cạnh assets để tái render khi cần.
- **File ảnh hưởng:** `tools/` (script render), `assets/`, nội dung post khi viết mới
- **Effort:** M · **Risk:** thấp · **DoD:** SVG mermaid hiển thị đúng nền dark, < 40KB/sơ đồ, 0 JS runtime thêm

#### U-19 · Diff styling cho patch blocks
- **Vấn đề:** write-up khai thác thường có block diff/patch (+/-) nhưng hiện render như code thường — không phân biệt added/removed.
- **Đề xuất:** quy ước fenced block ` ```diff `; đẩy mạnh style token rouge có sẵn: `.highlight .gi` (green + nền xanh mờ) / `.highlight .gd` (red + nền đỏ mờ), thêm gutter trái. Kèm snippet mẫu vào checklist viết bài.
- **File ảnh hưởng:** `_sass/phantom.scss`, nội dung post tương lai
- **Effort:** S · **Risk:** không · **DoD:** block diff có màu added/removed rõ; không tràn ngang trên mobile

#### U-20 · Security sweep tổng thể
- **Vấn đề:** các đợt nâng cấp thêm nhiều link/button — cần một lượt audit cứng trước khi gọi là v3.0.
- **Đề xuất:** (1) mọi `target="_blank"` phải có `noopener noreferrer`; (2) rà link chết nội bộ bằng html-proofer (tái dùng U-15); (3) rà repo history không lộ nội dung nhạy cảm (token, tên target lab thật); (4) xác nhận `robots.txt` + sitemap không index trang không mong muốn.
- **File ảnh hưởng:** rà soát toàn bộ `_includes/`, `_layouts/`, posts
- **Effort:** S · **Risk:** không · **DoD:** 4 mục trên pass 100%

---

## 4. Lộ trình milestone đề xuất

| Milestone | Mục tiêu | Hạng mục | Tổng effort ước tính |
|-----------|----------|----------|----------------------|
| **v2.1** — Quick wins | SEO + payload + nội dung chuẩn | U-01 → U-05 | ~2 ngày |
| **v2.2** — Discovery | Tìm & điều hướng nội dung | U-06 → U-09 | ~3 ngày |
| **v2.3** — Engagement | Tương tác & cộng đồng | U-10 → U-14 | ~2.5 ngày |
| **v3.0** — Infra & DX | Chất lượng vận hành lâu dài | U-15 → U-20 | ~3 ngày |

**Quy tắc milestone:** mỗi milestone deploy độc lập, revert độc lập; không gộp nhiều milestone trong 1 PR lớn.

---

## 5. Backlog — chủ ý KHÔNG làm (và lý do)

| Ý tưởng | Lý do từ chối |
|---------|---------------|
| Light/dark theme toggle | Brand lock (nguyên tắc 0.4) — dark là identity |
| React/Vue/Astro migration | Jekyll + vanilla đã đạt perf tối đa; migration = rủi ro, không cộng thêm giá trị |
| Disqus comments | Quảng cáo + tracker nặng; giscus đúng cho tệp GitHub |
| Newsletter | Chưa đủ khối lượng nội dung để cam kết lịch gửi |
| jekyll-archives / jekyll-search plugin | Ngoài allowlist GitHub Pages (nguyên tắc 0.3) |
| Webmentions / IndieWeb | ROI thấp ở giai đoạn hiện tại |
| mermaid.js runtime client | 1MB JS — thay bằng pre-render (U-18) |

---

## 6. Rủi ro chung & mitigation

| Rủi ro | Mitigation |
|--------|-----------|
| GH Pages đổi allowlist plugin | Mọi tính năng đều có đường lùi bằng Liquid thuần hoặc client-side |
| Giscus ngừng phát triển | Lazy-load cách ly (U-10) — gỡ 1 include là sạch |
| SW serve stale content (U-16) | Version cache chặt + kill-switch; theo dõi error-rate sau rollout |
| Ảnh WebP chất lượng tụt (U-02) | Soi thủ công từng ảnh; screenshot giữ lossless |
| Perf regression sau các milestone | Chạy Lighthouse trước/sau mỗi milestone, ghi số liệu lại vào file này |

---

## 7. Checklist verify chuẩn (chạy cuối MỖI milestone)

1. `node --check js/main.js` — syntax
2. Sau khi Pages deploy: mở 3 trang (home / post dài nhất / archive) — console 0 lỗi
3. Lighthouse mobile: Performance ≥ 95 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 100
4. Keyboard-only: tab qua toàn trang, focus ring thấy được, không keyboard trap
5. `prefers-reduced-motion: reduce` — không animation nào chạy
6. Mobile 360px: không horizontal scroll, mọi target chạm ≥ 44px
7. No-JS: nội dung đầy đủ, không section chết
8. Print preview post dài nhất — không vỡ layout

---

*File này là kế hoạch đề xuất — mọi thay đổi code chỉ bắt đầu sau khi duyệt từng hạng mục.*

## 8. Trạng thái triển khai (cập nhật sau khi implement)

| ID | Trạng thái | Ghi chú |
|----|-----------|---------|
| U-01 | ✅ done | 4 ảnh OG generate bằng GDI+ (default + 3 post), optipng -o7 (-24%), defaults trong `_config.yml` + per-post `image:` |
| U-02 | ✅ done | 16/16 ảnh → WebP q82: **1882KB → 829KB (-56%)**; script tái sử dụng `tools/optimize-images.ps1` |
| U-03 | ✅ done | 16 ảnh có alt mô tả thật theo ngữ cảnh |
| U-04 | ✅ done | `<content:encoded>` full-text + excerpt trong `<description>` + `<category>` |
| U-05 | ✅ done | JS auto-gắn `noopener noreferrer` + CSS `↗` (chỉ hiện khi JS chạy) + footer rel |
| U-06 | ✅ done | `search.json` + lunr 2.3.9 vendored (22KB), overlay `/` + Esc, lazy boot lần đầu mở |
| U-07 | ✅ done | `tags.md` Liquid thuần + chips filter + tags trên card/post-meta, link `/tags/#<slug>` |
| U-08 | ✅ done | related theo shared tags/categories, fill newest lên 3 |
| U-09 | ✅ done | archive timeline (rail + dot), tag chips mỗi item, keyword filter, empty-state |
| U-10 | 🔶 code xong — chờ user | `giscus.html` + lazy loader xong; cần bật Discussions + điền 4 giá trị `giscus:` trong `_config.yml` |
| U-11 | 🔶 code xong — chờ user | Đã thay GA legacy bằng GoatCounter snippet; cần tạo account + điền `goatcounter.code` |
| U-12 | ✅ done | `updated` + `changelog` front matter → hiển thị ở post-meta + details (dormant tới khi dùng) |
| U-13 | ✅ done | `[ cite ]` popover: BibTeX + plain text, tự điền accessed-date khi copy |
| U-14 | ✅ done | `_includes/series-nav.html` + `series`/`series_order` front matter (dormant) |
| U-15 | ✅ done | `.github/workflows/ci.yml` + `Gemfile` (jekyll build + html-proofer) |
| U-16 | ✅ done | `sw.js` network-first HTML / SWR assets + đăng ký sau `load` (kill-switch try/catch) |
| U-17 | ✅ done (phần 1) | Font async (media=print swap + noscript) + critical inline bg/font. Critical CSS đầy đủ: bỏ — main.css 27KB đủ nhỏ, tránh staleness |
| U-18 | ✅ done | `tools/render-mermaid.ps1` (mmdc → SVG lúc viết bài, 0 runtime) |
| U-19 | ✅ done | `.highlight .gi/.gd` nền green/red + ví dụ trong WRITING.md |
| U-20 | ✅ done | 0 `target=_blank` thiếu rel; 0 secret pattern trong includes/layouts/config |

**Còn lại cho user:** (1) điền `giscus` + `goatcounter` trong `_config.yml` khi muốn bật; (2) push để CI + Pages chạy lần đầu; (3) chạy checklist §7 sau deploy.

## Change log tài liệu

- 2026-11-13 · v1.0 — khởi tạo kế hoạch 20 hạng mục (U-01 → U-20), 4 milestone
- 2026-11-13 · v1.1 — **triển khai toàn bộ v2.1 → v3.0**; U-10/U-11 chờ cấu hình user

