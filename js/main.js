/* Phantom Ops — site scripts (vanilla, no dependencies) */
document.documentElement.classList.add('js');

(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- screen-reader live region (announcements) ---------- */
  var live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  function announce(msg) { live.textContent = msg; }

  /* ---------- text decode (scramble -> resolve) ---------- */
  function decode(node, text, dur) {
    var glyphs = '!<>-_\\/[]{}=+*^?#$%&@0123456789ABCDEF';
    var start = performance.now();
    (function frame(now) {
      now = now || performance.now();
      var p = Math.min(1, (now - start) / dur);
      var lock = Math.floor(p * text.length), out = '';
      for (var i = 0; i < text.length; i++) {
        out += i < lock ? text[i] : (text[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0]);
      }
      node.textContent = out;
      if (p < 1) requestAnimationFrame(frame); else node.textContent = text;
    })();
  }

  /* ---------- 2s intro: once per session, skippable, reduced-motion safe ---------- */
  var INTRO_KEY = 'phantom_intro_seen';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = !!sessionStorage.getItem(INTRO_KEY); } catch (e) { /* storage blocked */ }

  function runIntro() {
    var intro = $('#intro');
    if (!intro) return;
    intro.classList.add('show');
    document.body.classList.add('locked');

    var timers = [];
    function T(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function say(html, ms) {
      T(function () {
        var d = document.createElement('div');
        d.innerHTML = html;
        $('#intro-log').appendChild(d);
      }, ms);
    }

    say('&gt; INSERTING TENSION WRENCH <span class="ok">. OK</span>', 150);
    say('&gt; SAMPLING KEYWAY <span class="ok">........ OK</span>', 560);

    var svg = $('#locksvg');
    var pins = svg ? $all('.pin', svg) : [];
    var lockg = svg ? $('.lockg', svg) : null;
    pins.forEach(function (p, i) {
      T(function () {
        p.classList.add('set');
        if (lockg) {
          lockg.classList.remove('jolt');
          void lockg.getBoundingClientRect(); /* restart jolt animation */
          lockg.classList.add('jolt');
        }
      }, 850 + i * 320);
    });

    T(function () { if (svg) svg.classList.add('open'); }, 2280);
    say('&gt; PINS SET — ROTATING PLUG <span class="ok">. OK</span>', 2310);

    var fill = $('#intro-fill');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fill.style.transition = 'width 2.15s cubic-bezier(.3,.6,.3,1)';
        fill.style.width = '100%';
      });
    });

    var granted = $('#intro-granted');
    T(function () { decode(granted, 'ACCESS GRANTED', 350); }, 2520);
    T(finish, 3050);

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      var f = $('#intro-flash');
      if (f) f.classList.add('go');
      intro.classList.add('out');
      document.body.classList.remove('locked');
      setTimeout(function () {
        intro.classList.remove('show', 'out');
        intro.style.display = 'none';
      }, 720);
      try { sessionStorage.setItem(INTRO_KEY, '1'); } catch (e) {}
    }
    document.addEventListener('click', finish, { once: true });
    document.addEventListener('keydown', finish, { once: true });
    document.addEventListener('touchstart', finish, { once: true });
  }

  if (!reduceMotion && !seen) runIntro();

  /* ---------- home: ops console typing ---------- */
  var term = $('#ops-term');
  if (term) {
    var script = [
      { p: '0xki29@ops:~$ ', c: '', t: './identify --operator' },
      { p: '', c: 'ok', t: '[+] operator authenticated — 0xki29' },
      { p: '', c: 'dim', t: '[+] focus: web exploitation · malware internals' },
      { p: '', c: '', t: '' },
      { p: '0xki29@ops:~$ ', c: '', t: 'cat ROE.txt' },
      { p: '', c: 'warn', t: '[!] lab-only targets — zero production impact' },
      { p: '', c: 'warn', t: '[!] all findings — responsible disclosure only' },
      { p: '', c: '', t: '' },
      { p: '0xki29@ops:~$ ', c: '', t: './engagement --status' },
      { p: '', c: 'ok', t: '✔ ACTIVE — after-action reports declassified below' }
    ];
    var li = 0;
    (function typeLine() {
      if (li >= script.length) {
        var end = document.createElement('div');
        end.innerHTML = '<span class="p">0xki29@ops:~$</span> <span class="cursor-block"></span>';
        term.appendChild(end);
        return;
      }
      var s = script[li++];
      var d = document.createElement('div');
      d.innerHTML = (s.p ? '<span class="p">' + s.p + '</span>' : '') + '<span class="' + s.c + '"></span>';
      term.appendChild(d);
      var span = d.lastChild, i = 0;
      (function tick() {
        if (i <= s.t.length) { span.textContent = s.t.slice(0, i++); setTimeout(tick, 14); }
        else setTimeout(typeLine, s.t ? 260 : 140);
      })();
    })();
  }

  /* ---------- scroll reveal ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    $all('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $all('.reveal').forEach(function (el) { el.classList.add('on'); });
  }

  /* ---------- code blocks: language label + copy button ---------- */
  $all('div.highlighter-rouge').forEach(function (wrap) {
    if (!wrap.querySelector('.highlight')) return;
    var m = wrap.className.match(/language-([\w#+.-]+)/);
    var lang = m ? m[1] : 'code';
    wrap.classList.add('code');
    var bar = document.createElement('div');
    bar.className = 'code-bar';
    bar.innerHTML = '<i></i><i></i><i></i><span class="code-lang"></span>' +
      '<button class="copy-btn" type="button">copy</button>';
    bar.querySelector('.code-lang').textContent = lang;
    wrap.insertBefore(bar, wrap.firstChild);
    var btn = bar.querySelector('.copy-btn');
    var pre = wrap.querySelector('pre');
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function () {
      var txt = pre.innerText;
      function ok() {
        btn.textContent = 'copied!';
        announce('Code copied to clipboard');
        setTimeout(function () { btn.textContent = 'copy'; }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(ok, ok);
      } else {
        var ta = document.createElement('textarea');
        ta.value = txt;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        ok();
      }
    });
  });

  /* ---------- wrap tables for mobile horizontal scroll ---------- */
  $all('.post-body table').forEach(function (t) {
    if (t.parentNode.classList && t.parentNode.classList.contains('table-wrap')) return;
    var w = document.createElement('div');
    w.className = 'table-wrap';
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  });

  /* ---------- active nav link (longest prefix match wins) ---------- */
  (function () {
    var here = location.pathname;
    var best = null, bestLen = 0;
    $all('.nav-links a').forEach(function (a) {
      var p = a.pathname;
      if ((p === here || here.indexOf(p) === 0) && p.length > bestLen) { best = a; bestLen = p.length; }
    });
    if (best) best.classList.add('active');
  })();

  /* ---------- prefetch internal links on hover/focus (instant-feel navigation) ---------- */
  (function () {
    var conn = navigator.connection || {};
    if (conn.saveData || /2g/.test(conn.effectiveType || '')) return; /* respect metered/slow networks */
    var seen = {};
    function onHint(e) {
      var t = e.target;
      var a = t && t.closest ? t.closest('a') : null;
      if (!a || (a.target && a.target !== '_self')) return;
      if (a.protocol !== 'http:' && a.protocol !== 'https:') return;
      if (a.origin !== location.origin) return;
      if (a.pathname === location.pathname) return;
      if (seen[a.href]) return;
      seen[a.href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = a.href;
      document.head.appendChild(l);
    }
    document.addEventListener('mouseover', onHint);
    document.addEventListener('focusin', onHint);
    document.addEventListener('touchstart', onHint, { passive: true });
  })();

  /* ---------- external links: always noopener + noreferrer (U-05) ---------- */
  $all('a[href^="http"]').forEach(function (a) {
    if (a.hostname === location.hostname) return;
    var rel = a.rel ? a.rel.split(/\s+/) : [];
    if (rel.indexOf('noopener') === -1) rel.push('noopener');
    if (rel.indexOf('noreferrer') === -1) rel.push('noreferrer');
    a.rel = rel.join(' ');
  });

  /* ---------- site root (derived from canonical; baseurl-safe) ---------- */
  function siteRoot() {
    var c = document.querySelector('link[rel="canonical"]');
    return (c && c.href) ? c.href.replace(/[^/]*$/, '') : location.origin + '/blog/';
  }

  /* ---------- search: lunr overlay, lazy boot on first open (U-06) ---------- */
  (function () {
    var nav = $('.nav-links');
    if (!nav || typeof window.fetch !== 'function') return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-search';
    btn.innerHTML = '[ / ] search';
    nav.insertBefore(btn, nav.firstChild);

    var ov = null, input = null, list = null, meta = null;
    var idx = null, docs = null, lastFocus = null;

    function ensure() {
      if (ov) return;
      ov = document.createElement('div');
      ov.className = 'search-overlay';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', 'Search posts');
      ov.innerHTML =
        '<div class="search-box">' +
          '<div class="search-head">' +
            '<input type="search" placeholder="grep reports ..." aria-label="Search posts">' +
            '<button class="search-close" type="button" aria-label="Close search">[ esc ]</button>' +
          '</div>' +
          '<div class="search-meta"></div>' +
          '<ul class="search-results"></ul>' +
        '</div>';
      document.body.appendChild(ov);
      input = ov.querySelector('input');
      list = ov.querySelector('ul');
      meta = ov.querySelector('.search-meta');
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('.search-close').addEventListener('click', close);
      var deb = null;
      input.addEventListener('input', function () {
        clearTimeout(deb);
        deb = setTimeout(run, 120);
      });
    }

    function boot() {
      if (idx) return Promise.resolve();
      var root = siteRoot();
      return fetch(root + 'search.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          docs = data;
          return new Promise(function (res) {
            var s = document.createElement('script');
            s.src = root + 'js/vendor/lunr.min.js';
            s.onload = function () {
              idx = window.lunr(function () {
                this.ref('url');
                this.field('title', { boost: 3 });
                this.field('tags');
                this.field('categories');
                this.field('excerpt');
                this.field('content');
                docs.forEach(function (d) { this.add(d); }, this);
              });
              res();
            };
            s.onerror = function () { res(); };
            document.head.appendChild(s);
          });
        })
        .catch(function () {});
    }

    function esc(t) {
      return String(t).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    function run() {
      if (!idx) { meta.textContent = 'index loading...'; return; }
      var q = input.value.trim();
      list.innerHTML = '';
      if (!q) { meta.textContent = 'type to grep ' + docs.length + ' reports'; return; }
      var res = idx.search(q);
      meta.textContent = res.length + ' match' + (res.length === 1 ? '' : 'es');
      res.slice(0, 8).forEach(function (m) {
        var d = null;
        for (var i = 0; i < docs.length; i++) if (docs[i].url === m.ref) { d = docs[i]; break; }
        if (!d) return;
        var li = document.createElement('li');
        li.innerHTML = '<a href="' + esc(d.url) + '"><b>' + esc(d.title) + '</b><time>' + esc(d.date) + '</time><p>' + esc((d.excerpt || '').slice(0, 140)) + '</p></a>';
        list.appendChild(li);
      });
    }

    function open() {
      lastFocus = document.activeElement;
      ensure();
      ov.classList.add('show');
      document.body.classList.add('lb-open');
      setTimeout(function () { input.focus(); }, 40);
      boot().then(function () {
        if (input.value.trim()) run();
        else meta.textContent = 'type to grep ' + (docs ? docs.length : '') + ' reports';
      });
    }
    function close() {
      if (!ov || !ov.classList.contains('show')) return;
      ov.classList.remove('show');
      document.body.classList.remove('lb-open');
      if (lastFocus) { try { lastFocus.focus(); } catch (e) {} lastFocus = null; }
    }

    btn.addEventListener('click', open);
    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
      if (e.key === '/' && !typing && !(ov && ov.classList.contains('show'))) { e.preventDefault(); open(); }
      else if (e.key === 'Escape') close();
    });
  })();

  /* ---------- tags/archive filter: keyword + chips (U-07/U-09) ---------- */
  (function () {
    var input = $('#tag-filter');
    var items = $all('.arch-item');
    if (!input && !items.length) return;
    var empty = $('#tag-empty');
    var groups = $all('.tag-group, .arch-year');
    groups.forEach(function (g, i) { g.setAttribute('data-gid', 'g' + i); });

    function apply() {
      var q = (input && input.value.trim().toLowerCase()) || '';
      var chip = $('.chip.on');
      var counts = {};
      var n = 0;
      items.forEach(function (el) {
        var g = el.closest('.tag-group');
        var okTag = !chip || !g || g.getAttribute('data-tag') === chip.getAttribute('data-tag');
        var okKw = !q || (el.getAttribute('data-text') || '').indexOf(q) !== -1;
        var vis = okTag && okKw;
        el.style.display = vis ? '' : 'none';
        if (!vis) return;
        n++;
        var owner = el.closest('.tag-group') || el.closest('.arch-year');
        if (owner) counts[owner.getAttribute('data-gid')] = true;
      });
      groups.forEach(function (g) {
        if (chip && g.classList.contains('tag-group')) {
          g.style.display = g.getAttribute('data-tag') === chip.getAttribute('data-tag') ? '' : 'none';
        } else {
          g.style.display = counts[g.getAttribute('data-gid')] ? '' : 'none';
        }
      });
      if (empty) empty.hidden = n > 0;
    }

    $all('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        var was = c.classList.contains('on');
        $all('.chip.on').forEach(function (x) { x.classList.remove('on'); });
        if (!was) c.classList.add('on');
        apply();
      });
    });
    if (input) input.addEventListener('input', apply);
    apply();
  })();

  /* ---------- citation popover (U-13) ---------- */
  (function () {
    var btn = $('.cite-btn');
    if (!btn) return;
    var pop = $('.cite-pop');
    btn.addEventListener('click', function () {
      var show = pop.hidden;
      pop.hidden = !show;
      btn.setAttribute('aria-expanded', show ? 'true' : 'false');
    });
    $all('.cite-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $all('.cite-tab').forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
        $all('.cite-code').forEach(function (c) { c.hidden = c.id !== 'cite-' + tab.getAttribute('data-tab'); });
      });
    });
    var copy = $('.cite-copy');
    if (copy) copy.addEventListener('click', function () {
      var pre = $('.cite-code:not([hidden])');
      if (!pre) return;
      var txt = pre.textContent.replace('[DATE]', new Date().toISOString().slice(0, 10));
      function ok() {
        announce('Citation copied');
        copy.textContent = 'copied!';
        setTimeout(function () { copy.textContent = 'copy'; }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, ok);
      else {
        var ta = document.createElement('textarea');
        ta.value = txt;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        ok();
      }
    });
  })();

  /* ---------- giscus: inject script only on demand (U-10) ---------- */
  (function () {
    var load = $('#giscus-load');
    if (!load) return;
    load.addEventListener('click', function () {
      var s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      s.async = true;
      s.crossOrigin = 'anonymous';
      ['data-repo', 'data-repo-id', 'data-category', 'data-category-id'].forEach(function (name) {
        var v = load.getAttribute(name);
        if (v) s.setAttribute(name, v);
      });
      s.setAttribute('data-mapping', 'pathname');
      s.setAttribute('data-strict', '0');
      s.setAttribute('data-reactions-enabled', '1');
      s.setAttribute('data-emit-metadata', '0');
      s.setAttribute('data-input-position', 'top');
      s.setAttribute('data-theme', 'transparent_dark');
      s.setAttribute('data-lang', 'en');
      load.parentNode.replaceChild(s, load);
    });
  })();

  /* ---------- service worker: offline reading (U-16) ---------- */
  window.addEventListener('load', function () {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    try {
      navigator.serviceWorker.register(siteRoot() + 'sw.js').catch(function () {});
    } catch (e) { /* never block the page */ }
  });

  /* ---------- post images: lazy decode + fade-in ---------- */
  var postBody = $('.post-body');
  var tocHeads = [], tocLinks = [];
  if (postBody) {
    $all('img', postBody).forEach(function (img) {
      img.loading = 'lazy';
      img.decoding = 'async';
      var show = function () { img.classList.add('in'); };
      if (img.complete) show();
      else { img.addEventListener('load', show); img.addEventListener('error', show); }
    });
  }

  /* ---------- image lightbox (zoom PoC screenshots; Esc/arrows/click) ---------- */
  (function () {
    if (!postBody) return;
    var imgs = $all('img', postBody).filter(function (i) { return !i.closest('a'); });
    if (!imgs.length) return;
    var lb = null, lbImg = null, lbCount = null, cur = 0, lastFocus = null;

    function build() {
      lb = document.createElement('div');
      lb.className = 'lb';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.setAttribute('aria-label', 'Image viewer');
      lb.innerHTML =
        '<button class="lb-close" type="button" aria-label="Close viewer">[ esc ] close</button>' +
        '<button class="lb-arrow lb-prev" type="button" aria-label="Previous image">&#9664;</button>' +
        '<img alt="">' +
        '<button class="lb-arrow lb-next" type="button" aria-label="Next image">&#9654;</button>' +
        '<div class="lb-count"></div>';
      document.body.appendChild(lb);
      lbImg = lb.querySelector('img');
      lbCount = lb.querySelector('.lb-count');
      lb.addEventListener('click', function (e) { if (e.target === lb) hide(); });
      lb.querySelector('.lb-close').addEventListener('click', hide);
      lb.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
      lb.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    }
    function show(i) {
      cur = (i + imgs.length) % imgs.length;
      if (!lb) build();
      var src = imgs[cur];
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt || '';
      lbCount.textContent = (cur + 1) + ' / ' + imgs.length;
      document.body.classList.add('lb-open');
      requestAnimationFrame(function () { lb.classList.add('show'); });
      lb.querySelector('.lb-close').focus();
    }
    function hide() {
      if (!lb || !lb.classList.contains('show')) return;
      lb.classList.remove('show');
      document.body.classList.remove('lb-open');
      if (lastFocus) { try { lastFocus.focus(); } catch (e) {} lastFocus = null; }
    }
    imgs.forEach(function (img, i) {
      img.classList.add('lb-img');
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Zoom image ' + (i + 1) + ' of ' + imgs.length);
      img.addEventListener('click', function (e) { e.preventDefault(); lastFocus = img; show(i); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lastFocus = img; show(i); }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (!lb || !lb.classList.contains('show')) return;
      if (e.key === 'Escape') hide();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    });
  })();

  /* ---------- posts: heading anchors + TOC with scrollspy ---------- */
  (function () {
    var article = $('article.post');
    if (!postBody || !article || !$('.post-meta', article)) return; /* posts only */
    var heads = $all('h2, h3', postBody).filter(function (h) { return h.textContent.trim().length > 0; });
    if (heads.length < 3) return;

    var used = {};
    function slug(t) {
      var s = t.toLowerCase().trim()
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\- ]+/g, '')
        .trim().replace(/\s+/g, '-').replace(/-{2,}/g, '-');
      if (!s) s = 'sec';
      if (used[s]) s += '-' + (++used[s]); else used[s] = 1;
      return s;
    }

    var items = '';
    heads.forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent);
      var cls = h.tagName === 'H3' ? ' class="lvl-3"' : '';
      items += '<li><a href="#' + h.id + '"' + cls + '>' + h.textContent.trim() + '</a></li>';
    });

    var toc = document.createElement('nav');
    toc.className = 'toc';
    toc.setAttribute('aria-label', 'Table of contents');
    toc.innerHTML =
      '<button class="toc-toggle" type="button" aria-expanded="false"><span>// contents</span><i>&#9662;</i></button>' +
      '<div class="toc-head">contents</div><ol>' + items + '</ol>';
    article.insertBefore(toc, postBody);

    var tbtn = toc.querySelector('.toc-toggle');
    tbtn.addEventListener('click', function () {
      var open = toc.classList.toggle('open');
      tbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    tocHeads = heads;
    tocLinks = $all('a', toc);
    tocLinks.forEach(function (a) {
      a.addEventListener('click', function () {
        toc.classList.remove('open');
        tbtn.setAttribute('aria-expanded', 'false');
      });
    });

    heads.forEach(function (h) { /* deep-link anchors, appended after TOC is built */
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.className = 'hlink';
      a.textContent = '#';
      a.setAttribute('aria-label', 'Link to this section');
      h.appendChild(a);
    });
  })();

  /* ---------- scroll UI: reading progress + back-to-top + TOC spy (one listener) ---------- */
  var rbar = $('#rprogress');
  var totop = $('#totop');
  var spyIdx = -1;
  function onScroll() {
    var h = document.documentElement;
    var st = window.pageYOffset || h.scrollTop;
    if (rbar) {
      var max = h.scrollHeight - h.clientHeight;
      rbar.style.width = (max > 0 ? (st / max) * 100 : 0) + '%';
    }
    if (totop) totop.classList.toggle('show', st > 640);
    if (tocHeads.length) {
      var i = 0;
      for (var k = 0; k < tocHeads.length; k++) {
        if (tocHeads[k].getBoundingClientRect().top <= 120) i = k; else break;
      }
      if (i !== spyIdx) {
        spyIdx = i;
        tocLinks.forEach(function (a, j) {
          a.classList.toggle('active', j === i);
          if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (totop) totop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    totop.focus();
  });

})();