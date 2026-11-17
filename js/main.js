/* Parafia pw. Trójcy Świętej — skrypt strony.
   Treści (ogłoszenia, intencje, msze, kancelaria, galeria, aktualności) wczytywane są z plików w folderze /content. */
(function () {
  'use strict';

  var ICONS = 'img/icons.svg';
  var DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var DNI_KR = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  var MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

  /* ---------- pomocnicze ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(id, cls) { return '<svg aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '><use href="' + ICONS + '#i-' + id + '"/></svg>'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function longDate(d) { return d.getDate() + ' ' + MIES[d.getMonth()] + ' ' + d.getFullYear(); }
  function toMin(godz) { var p = godz.replace('.', ':').split(':'); return (+p[0]) * 60 + (+(p[1] || 0)); }
  function telHref(n) { return 'tel:+48' + n.replace(/\D/g, ''); }

  var cache = {};
  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch('content/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      });
    }
    return cache[name];
  }
  function fail(el, what) {
    el.innerHTML = '<p class="error-box">Nie udało się wczytać: ' + esc(what) + '. Prosimy odświeżyć stronę.</p>';
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ---------- dostępność: wielkość tekstu i kontrast ---------- */
  var root = document.documentElement;
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* brak dostępu */ } }
  function syncA11y() {
    var f = root.getAttribute('data-font') || '0';
    $$('[data-font-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-font-set') === f)); });
    var hc = root.getAttribute('data-contrast') === 'high';
    $$('[data-contrast-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(hc)); });
  }
  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-font-set]');
    if (f) {
      var v = f.getAttribute('data-font-set');
      if (v === '0') root.removeAttribute('data-font'); else root.setAttribute('data-font', v);
      store('font', v); syncA11y();
    }
    var c = e.target.closest('[data-contrast-toggle]');
    if (c) {
      var on = root.getAttribute('data-contrast') !== 'high';
      if (on) root.setAttribute('data-contrast', 'high'); else root.removeAttribute('data-contrast');
      store('contrast', on ? 'high' : ''); syncA11y();
    }
  });
  syncA11y();

  /* ---------- nawigacja ---------- */
  var nav = $('#nav'), burger = $('#burger'), backdrop;
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    if (backdrop) { backdrop.remove(); backdrop = null; }
    document.body.style.overflow = '';
  }
  function openNav() {
    nav.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.addEventListener('click', closeNav);
    nav.parentNode.insertBefore(backdrop, nav); // w nagłówku, aby menu było nad przyciemnieniem
    document.body.style.overflow = 'hidden';
    var first = $('a', nav); if (first) first.focus();
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { nav.classList.contains('is-open') ? closeNav() : openNav(); });
    var closeBtn = $('.nav__close', nav);
    if (closeBtn) closeBtn.addEventListener('click', function () { closeNav(); burger.focus(); });
  }
  var more = $('.nav__more'), sub = more && document.getElementById(more.getAttribute('aria-controls'));
  if (more && sub) {
    more.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = more.getAttribute('aria-expanded') !== 'true';
      more.setAttribute('aria-expanded', String(open));
      sub.classList.toggle('is-open', open);
    });
    document.addEventListener('click', function (e) {
      if (!sub.contains(e.target)) { more.setAttribute('aria-expanded', 'false'); sub.classList.remove('is-open'); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (nav && nav.classList.contains('is-open')) { closeNav(); burger.focus(); }
    if (sub && sub.classList.contains('is-open')) { sub.classList.remove('is-open'); more.setAttribute('aria-expanded', 'false'); more.focus(); }
  });
  // zaznacz bieżącą stronę
  var here = location.pathname.split('/').pop() || 'index.html';
  $$('#nav a').forEach(function (a) {
    if (a.getAttribute('href') === here) {
      a.setAttribute('aria-current', 'page');
      if (more && sub && sub.contains(a)) more.style.boxShadow = 'inset 0 -2px 0 var(--gold)';
    }
  });

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* ---------- kalendarz: święta i wakacje ---------- */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function isFeast(d, cfg) {
    var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if ((cfg.swietaStale || []).indexOf(md) >= 0) return true;
    if ((cfg.dodatkoweSwieta || []).indexOf(isoDate(d)) >= 0) return true;
    var e = easter(d.getFullYear()), iso = isoDate(d);
    return iso === isoDate(addDays(e, 1)) || iso === isoDate(addDays(e, 60)); // Poniedziałek Wielkanocny, Boże Ciało
  }
  function isHoliday(d, cfg) {
    if (!cfg.wakacje) return false;
    var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    return md >= cfg.wakacje.od && md <= cfg.wakacje.do;
  }
  function massesFor(d, cfg) {
    var sunday = d.getDay() === 0 || isFeast(d, cfg);
    var list = sunday ? cfg.niedziele : cfg.powszednie;
    var hol = isHoliday(d, cfg);
    return { sunday: sunday, list: list.filter(function (m) { return !(hol && m.bezWakacji); }) };
  }
  function nextMass(cfg, now) {
    for (var i = 0; i < 8; i++) {
      var d = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), i);
      var ms = massesFor(d, cfg).list;
      for (var j = 0; j < ms.length; j++) {
        var t = toMin(ms[j].godz);
        if (i > 0 || t > now.getHours() * 60 + now.getMinutes()) return { day: d, offset: i, mass: ms[j] };
      }
    }
    return null;
  }
  function relDay(n) {
    if (n.offset === 0) return 'dziś';
    if (n.offset === 1) return 'jutro';
    var w = n.day.getDay();
    return (w === 2 ? 'we ' : 'w ') + ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'][w];
  }

  /* ---------- Msze święte ---------- */
  function renderTimes(list, cfg, isToday, next) {
    var hol = isHoliday(new Date(), cfg);
    return '<ul class="times">' + list.map(function (m) {
      var off = hol && m.bezWakacji;
      var isNext = next && isToday && next.mass === m;
      var label = m.uwaga || (off ? 'nie w wakacje' : '');
      return '<li><span class="time' + (off ? ' time--off' : '') + (isNext ? ' time--next' : '') + '"' +
        (isNext ? ' aria-label="' + esc(m.godz) + ' – najbliższa Msza"' : '') + '>' + esc(m.godz) +
        (isNext ? '<small>najbliższa</small>' : (label ? '<small>' + esc(label) + '</small>' : '')) + '</span></li>';
    }).join('') + '</ul>';
  }
  var elSun = $('#msze-niedziele'), elWeek = $('#msze-powszednie'), elNext = $('#next-mass'), elConf = $('#spowiedz-lista');
  if (elSun || elWeek || elNext || elConf) {
    load('msze').then(function (cfg) {
      var now = new Date(), today = massesFor(now, cfg), next = nextMass(cfg, now);
      if (elSun) elSun.innerHTML = renderTimes(cfg.niedziele, cfg, today.sunday, next && next.offset === 0 ? next : null) +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaNiedziele) + '</span></p>';
      if (elWeek) elWeek.innerHTML = renderTimes(cfg.powszednie, cfg, !today.sunday, next && next.offset === 0 ? next : null) +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaPowszednie) + '</span></p>' +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaSwieta) + '</span></p>';
      if (elConf) elConf.innerHTML = '<ul class="checklist">' + cfg.spowiedz.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
      if (elNext && next) {
        $('.next-mass__value', elNext).textContent = cap(relDay(next)) + ', godz. ' + next.mass.godz;
        elNext.hidden = false;
      }
      $$('[data-today-type]').forEach(function (el) {
        el.textContent = today.sunday ? 'Dziś obowiązuje porządek niedzielny' : 'Dziś: porządek dni powszednich';
      });
    }).catch(function () { [elSun, elWeek].forEach(function (el) { if (el) fail(el, 'porządek Mszy'); }); });
  }

  /* ---------- Ogłoszenia ---------- */
  var elAnn = $('#ogloszenia');
  if (elAnn) {
    load('ogloszenia').then(function (o) {
      var items = o.punkty.map(function (p) {
        if (typeof p === 'string') return '<li><p>' + esc(p) + '</p></li>';
        return '<li><p>' + esc(p.tekst) + '</p>' +
          (p.lista ? '<ul>' + p.lista.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
          (p.dopisek ? '<p class="dopisek">' + esc(p.dopisek) + '</p>' : '') + '</li>';
      }).join('');
      var d = parseDate(o.data);
      $$('[data-ann-title]').forEach(function (el) { el.textContent = o.tytul; });
      $$('[data-ann-date]').forEach(function (el) { el.textContent = longDate(d) + ' r.'; el.setAttribute('datetime', o.data); });
      elAnn.innerHTML = '<ol>' + items + '</ol>';
      var lim = elAnn.getAttribute('data-collapse');
      if (lim && elAnn.scrollHeight > 640) {
        elAnn.classList.add('announce--collapsed');
        var btn = document.createElement('button');
        btn.className = 'btn btn--line btn--sm'; btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = 'Pokaż wszystkie ogłoszenia ' + icon('chevron');
        btn.addEventListener('click', function () {
          var open = elAnn.classList.toggle('announce--collapsed') === false;
          btn.setAttribute('aria-expanded', String(open));
          btn.innerHTML = open ? 'Zwiń ogłoszenia' : 'Pokaż wszystkie ogłoszenia ' + icon('chevron');
        });
        elAnn.insertAdjacentElement('afterend', btn);
      }
    }).catch(function () { fail(elAnn, 'ogłoszenia'); });
  }

  /* ---------- Intencje ---------- */
  function intentionsList(day) {
    return '<ul class="intentions">' + day.msze.map(function (m) {
      var many = m.intencje.length > 1 || m.naglowek;
      var body = (m.naglowek ? '<p style="margin:0 0 4px;font-weight:600">' + esc(m.naglowek) + '</p>' : '') +
        (many ? (m.naglowek ? '<ol>' : '<ul>') : '<ul class="single">') +
        m.intencje.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + (m.naglowek ? '</ol>' : '</ul>');
      return '<li><span class="hour">' + esc(m.godz) + '</span><div>' + body + '</div></li>';
    }).join('') + '</ul>';
  }
  function dayHeading(day) {
    var d = parseDate(day.data);
    return { title: cap(DNI[d.getDay()]) + ', ' + d.getDate() + ' ' + MIES[d.getMonth()], sub: day.nazwa || '' };
  }
  var elTabs = $('#intencje-tabs');
  if (elTabs) {
    load('intencje').then(function (data) {
      var todayIso = isoDate(new Date());
      var idx = data.dni.findIndex(function (d) { return d.data === todayIso; });
      if (idx < 0) idx = data.dni.findIndex(function (d) { return d.data > todayIso; });
      if (idx < 0) idx = 0;
      var tabs = data.dni.map(function (day, i) {
        var d = parseDate(day.data);
        return '<button type="button" role="tab" class="tab' + (day.data === todayIso ? ' is-today' : '') + '" id="tab-' + i +
          '" aria-controls="int-panel" aria-selected="' + (i === idx) + '" tabindex="' + (i === idx ? 0 : -1) + '">' +
          '<span>' + DNI_KR[d.getDay()] + '</span><b>' + d.getDate() + '</b></button>';
      }).join('');
      elTabs.innerHTML = '<p class="day__sub" style="margin-bottom:10px">Tydzień: ' + esc(data.tydzien) + '</p>' +
        '<div class="tabs" role="tablist" aria-label="Wybierz dzień tygodnia">' + tabs + '</div>' +
        '<div id="int-panel" role="tabpanel" tabindex="0"></div>';
      var panel = $('#int-panel', elTabs), btns = $$('.tab', elTabs);
      function show(i) {
        btns.forEach(function (b, j) { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
        var day = data.dni[i], h = dayHeading(day);
        panel.setAttribute('aria-labelledby', 'tab-' + i);
        panel.innerHTML = '<p class="day__title">' + esc(h.title) + (day.data === todayIso ? ' <span class="badge">dziś</span>' : '') + '</p>' +
          (h.sub ? '<p class="day__sub">' + esc(h.sub) + '</p>' : '<div style="height:8px"></div>') + intentionsList(day);
      }
      btns.forEach(function (b, i) {
        b.addEventListener('click', function () { show(i); });
        b.addEventListener('keydown', function (e) {
          var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
          if (n === null) return;
          n = (n + btns.length) % btns.length; show(n); btns[n].focus(); e.preventDefault();
        });
      });
      show(idx);
      btns[idx].scrollIntoView({ block: 'nearest', inline: 'center' });
      window.scrollTo(0, 0);
    }).catch(function () { fail(elTabs, 'intencje mszalne'); });
  }
  var elWeekInt = $('#intencje-tydzien');
  if (elWeekInt) {
    load('intencje').then(function (data) {
      var todayIso = isoDate(new Date());
      $$('[data-week]').forEach(function (el) { el.textContent = data.tydzien; });
      elWeekInt.innerHTML = data.dni.map(function (day) {
        var h = dayHeading(day), today = day.data === todayIso;
        return '<article class="card week-day' + (today ? ' is-today' : '') + '" id="d-' + day.data + '">' +
          '<h2 class="day__title" style="font-size:1.6rem">' + esc(h.title) + (today ? ' <span class="badge">dziś</span>' : '') + '</h2>' +
          (h.sub ? '<p class="day__sub">' + esc(h.sub) + '</p>' : '') + intentionsList(day) + '</article>';
      }).join('');
      var t = document.getElementById('d-' + todayIso);
      if (t && location.hash === '#dzis') t.scrollIntoView();
    }).catch(function () { fail(elWeekInt, 'intencje mszalne'); });
  }

  /* ---------- Kancelaria ---------- */
  var elOffice = $('#kancelaria-godziny'), elContact = $('#kancelaria-kontakt'), elAcc = $('#konto');
  if (elOffice || elContact || elAcc) {
    load('kancelaria').then(function (k) {
      var wd = cap(DNI[new Date().getDay()]);
      if (elOffice) elOffice.innerHTML = (k.uwaga ? '<p class="alert">' + esc(k.uwaga) + '</p>' : '') +
        '<ul class="hours">' + k.godziny.map(function (g) {
          return '<li' + (g.dzien === wd ? ' class="is-today"' : '') + '><b>' + esc(g.dzien) + '</b><span>' + esc(g.godz) + '</span>' +
            (g.dopisek ? '<small>' + esc(g.dopisek) + '</small>' : '') + '</li>';
        }).join('') + '</ul>' +
        k.godzinyDodatkowe.map(function (s) { return '<p class="note">' + icon('info') + '<span>' + esc(s) + '</span></p>'; }).join('');
      if (elContact) elContact.innerHTML = '<ul class="contact-list">' + k.telefony.map(function (t) {
        return '<li>' + icon('phone') + '<div><small>' + esc(t.opis) + '</small><a href="' + telHref(t.numer) + '">' + esc(t.numer) + '</a></div></li>';
      }).join('') + '<li>' + icon('mail') + '<div><small>E-mail</small><a href="mailto:' + esc(k.email) + '">' + esc(k.email) + '</a></div></li></ul>';
      if (elAcc) {
        elAcc.innerHTML = '<div class="account__label">Konto parafii – ofiary</div>' +
          '<div class="account__nr" id="konto-nr">' + esc(k.konto) + '</div>' +
          '<div class="account__to">' + esc(k.odbiorcaKonta) + '</div>' +
          '<button type="button" class="btn btn--sm" id="copy-acc">' + icon('copy') + ' Kopiuj numer konta</button>';
        $('#copy-acc').addEventListener('click', function () {
          var nr = k.konto.replace(/\s/g, '');
          (navigator.clipboard ? navigator.clipboard.writeText(nr) : Promise.reject()).then(function () {
            toast('Skopiowano numer konta');
          }).catch(function () {
            var r = document.createRange(); r.selectNodeContents($('#konto-nr'));
            var s = getSelection(); s.removeAllRanges(); s.addRange(r);
            toast('Zaznaczono numer – skopiuj Ctrl+C');
          });
        });
      }
    }).catch(function () { [elOffice, elContact, elAcc].forEach(function (el) { if (el) fail(el, 'dane kancelarii'); }); });
  }

  /* ---------- Galeria ---------- */
  var elGal = $('#galeria');
  if (elGal) {
    load('galeria').then(function (g) {
      var all = [];
      elGal.innerHTML = g.albumy.map(function (a, ai) {
        var id = 'album-' + ai;
        return '<section class="album" aria-labelledby="' + id + '"><div class="album__head"><h2 id="' + id + '">' + esc(a.tytul) +
          '</h2><span class="badge">' + a.zdjecia.length + ' zdjęć</span></div><div class="photos">' +
          a.zdjecia.map(function (f, fi) {
            var n = all.length;
            all.push({ src: 'img/' + a.katalog + '/' + f, cap: a.tytul + ' – zdjęcie ' + (fi + 1) + ' z ' + a.zdjecia.length });
            return '<button type="button" class="photo" data-i="' + n + '" aria-label="Powiększ: ' + esc(all[n].cap) + '">' +
              '<img src="img/' + esc(a.katalog) + '/thumb/' + esc(f) + '" alt="" loading="lazy" decoding="async"></button>';
          }).join('') + '</div></section>';
      }).join('');
      lightbox(all);
      var target = location.hash && document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }).catch(function () { fail(elGal, 'galeria'); });
  }
  function lightbox(items) {
    var dlg = document.createElement('dialog');
    dlg.className = 'lightbox'; dlg.setAttribute('aria-label', 'Podgląd zdjęcia');
    dlg.innerHTML = '<div class="lightbox__bar"><span class="lb-count" aria-live="polite"></span>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Zamknij podgląd">' + icon('close') + '</button></div>' +
      '<div class="lightbox__stage"><img alt=""></div>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Poprzednie zdjęcie">' + icon('left') + '</button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Następne zdjęcie">' + icon('right') + '</button>' +
      '<p class="lightbox__caption"></p>';
    document.body.appendChild(dlg);
    var img = $('img', dlg), capEl = $('.lightbox__caption', dlg), cnt = $('.lb-count', dlg), cur = 0, opener;
    function show(i) {
      cur = (i + items.length) % items.length;
      img.src = items[cur].src; img.alt = items[cur].cap;
      capEl.textContent = items[cur].cap; cnt.textContent = (cur + 1) + ' / ' + items.length;
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.photo');
      if (b) { opener = b; show(+b.getAttribute('data-i')); dlg.showModal(); }
    });
    $('.lb-close', dlg).addEventListener('click', function () { dlg.close(); });
    $('.lb-prev', dlg).addEventListener('click', function () { show(cur - 1); });
    $('.lb-next', dlg).addEventListener('click', function () { show(cur + 1); });
    dlg.addEventListener('close', function () { if (opener) opener.focus(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
    var x0 = null;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ---------- Aktualności ---------- */
  var elNews = $('#aktualnosci');
  if (elNews) {
    load('aktualnosci').then(function (a) {
      elNews.innerHTML = a.wpisy.map(function (w) {
        return '<article class="card"><h2 style="font-size:1.8rem">' + esc(w.tytul) + '</h2>' +
          (w.data ? '<p class="day__sub"><time datetime="' + esc(w.data) + '">' + longDate(parseDate(w.data)) + ' r.</time></p>' : '') +
          w.tresc.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
          (w.youtube ? '<div class="video"><button type="button" class="video__facade" data-yt="' + esc(w.youtube) + '"' +
            ' style="background-image:url(\'https://i.ytimg.com/vi/' + encodeURIComponent(w.youtube) + '/hqdefault.jpg\')"' +
            ' aria-label="Odtwórz film: ' + esc(w.tytul) + ' (YouTube)">' +
            '<span>' + icon('play') + ' Odtwórz film</span></button></div>' : '') + '</article>';
      }).join('');
    }).catch(function () { fail(elNews, 'aktualności'); });
    elNews.addEventListener('click', function (e) {
      var b = e.target.closest('[data-yt]');
      if (!b) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.getAttribute('data-yt')) + '?autoplay=1';
      f.title = 'Film YouTube'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
      b.replaceWith(f);
    });
  }
})();
