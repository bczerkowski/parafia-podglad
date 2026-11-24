/* Parafia pw. Trójcy Świętej — skrypt strony.
   Treści (ogłoszenia, intencje, msze, kancelaria, galeria, aktualności) wczytywane są z plików w folderze /content. */
(function () {
  'use strict';

  var ICONS = 'img/icons.svg' + (((document.currentScript && document.currentScript.src) || '').match(/\?v=[^#]*/) || [''])[0];
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
      }).then(function (j) { return name === 'msze' ? expandYearlyRules(j) : j; });
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
  var hdr = $('.site-header');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
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
  // Dni bez Mszy oznaczonych „bezSwiat” (np. 19:30) – lista „bezWieczornej” w msze.json:
  // daty MM-DD oraz nazwy świąt ruchomych: wielkanoc, poniedzialek-wielkanocny, boze-cialo.
  function movableKey(d) {
    var e = easter(d.getFullYear()), iso = isoDate(d);
    if (iso === isoDate(e)) return 'wielkanoc';
    if (iso === isoDate(addDays(e, 1))) return 'poniedzialek-wielkanocny';
    if (iso === isoDate(addDays(e, 60))) return 'boze-cialo';
    if (iso === isoDate(addDays(e, -46))) return 'popielec';
    return null;
  }
  function noEveningFeast(d, cfg) {
    var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var list = cfg.bezWieczornej || (cfg.swietaStale || []).concat(['boze-cialo']);
    return list.indexOf(md) >= 0 || list.indexOf(movableKey(d)) >= 0;
  }
  // Reguły powtarzające się co roku („regulyRoczne” w msze.json) zamieniamy na zwykłe „zmiany” na ten, poprzedni i przyszły rok.
  // Rodzaje: { data: "MM-DD" lub ruchome: "popielec", opis, zamien: { "13:30": "14:00" } | dodaj: ["9:00"] | msze: ["6:30", ...] }.
  // Ręcznie wpisana zmiana na konkretny dzień ma pierwszeństwo przed regułą.
  function expandYearlyRules(cfg) {
    var rules = cfg.regulyRoczne || [];
    if (!rules.length) return cfg;
    var manual = (cfg.zmiany || []).slice(), taken = {}, out = [], y0 = warsawNow().getFullYear();
    manual.forEach(function (z) { taken[z.data] = true; });
    var base = { niedziele: cfg.niedziele, powszednie: cfg.powszednie, wakacje: cfg.wakacje, swietaStale: cfg.swietaStale, dodatkoweSwieta: cfg.dodatkoweSwieta, bezWieczornej: cfg.bezWieczornej, zmiany: [] };
    rules.forEach(function (r) {
      for (var y = y0 - 1; y <= y0 + 1; y++) {
        var d = null;
        if (r.ruchome === 'popielec') d = addDays(easter(y), -46);
        else if (r.data) { var p = r.data.split('-'); d = new Date(y, +p[0] - 1, +p[1]); if (r.zNiedzieliNaPoniedzialek && d.getDay() === 0) d = addDays(d, 1); }
        if (!d || taken[isoDate(d)]) continue;
        var list;
        if (r.msze) list = r.msze.map(function (g) { return typeof g === 'string' ? { godz: g } : g; });
        else {
          list = massesFor(d, base).list.map(function (m) { return { godz: m.godz, uwaga: m.uwaga }; });
          if (r.zamien) list.forEach(function (m) { if (r.zamien[m.godz]) m.godz = r.zamien[m.godz]; });
          (r.dodaj || []).forEach(function (g) { if (!list.some(function (m) { return m.godz === g; })) list.push({ godz: g }); });
        }
        list.sort(function (a, b) { return toMin(a.godz) - toMin(b.godz); });
        list.forEach(function (m) { if (!m.uwaga) delete m.uwaga; });
        out.push({ data: isoDate(d), opis: r.opis || '', msze: list, regula: true });
        taken[isoDate(d)] = true;
      }
    });
    cfg.zmiany = manual.concat(out);
    return cfg;
  }
  function isHoliday(d, cfg) {
    if (!cfg.wakacje) return false;
    var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    return md >= cfg.wakacje.od && md <= cfg.wakacje.do;
  }
  /* Aktualny czas w Polsce (Europe/Warsaw) – niezależnie od strefy ustawionej w urządzeniu.
     Zwracamy „lokalną” datę z polskimi wartościami, żeby dalsze obliczenia były proste. */
  // Symulacja dowolnego dnia: ?data=2027-03-28 (opcjonalnie &godz=10:00) – cała strona zachowuje się jak w tym dniu
  var simDay = (function () {
    var m = /[?&]data=(\d{4})-(\d{2})-(\d{2})/.exec(location.search), h = /[?&]godz=(\d{1,2}):(\d{2})/.exec(location.search);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], h ? +h[1] : 9, h ? +h[2] : 0) : null;
  })();
  if (simDay) {
    document.addEventListener('DOMContentLoaded', function () {
      var bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;background:#7f6119;color:#fff;padding:8px 16px;border-radius:999px;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3)';
      bar.textContent = 'Symulacja: ' + simDay.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      document.body.appendChild(bar);
    });
  }
  function warsawNow() {
    if (simDay) return new Date(simDay);
    try {
      var parts = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
        .forEach(function (p) { parts[p.type] = p.value; });
      return new Date(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    } catch (e) { return new Date(); }
  }
  function exceptionFor(d, cfg) {
    var iso = isoDate(d);
    return (cfg.zmiany || []).filter(function (z) { return z.data === iso; })[0] || null;
  }
  function massesFor(d, cfg) {
    var ex = exceptionFor(d, cfg);
    var sunday = d.getDay() === 0 || isFeast(d, cfg);
    if (ex) {
      if (ex.porzadek === 'niedzielny') sunday = true;
      if (ex.porzadek === 'powszedni') sunday = false;
    }
    var hol = isHoliday(d, cfg);
    var list = (ex && ex.msze) ? ex.msze : (sunday ? cfg.niedziele : cfg.powszednie).filter(function (m) { return !(hol && m.bezWakacji) && !(m.bezSwiat && noEveningFeast(d, cfg)); });
    list = list.slice().sort(function (a, b) { return toMin(a.godz) - toMin(b.godz); });
    return { sunday: sunday, list: list, exception: ex };
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
  // do testów logiki „najbliższej Mszy” w konsoli przeglądarki
  window.ParafiaKalendarz = { massesFor: massesFor, nextMass: nextMass, warsawNow: warsawNow, isFeast: isFeast, expandYearlyRules: expandYearlyRules, relDay: function (n) { return relDay(n); } };
  function relDay(n) {
    if (n.offset === 0) return 'dziś';
    if (n.offset === 1) return 'jutro';
    var w = n.day.getDay();
    return (w === 2 ? 'we ' : 'w ') + ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'][w] +
      ' ' + n.day.getDate() + '.' + pad(n.day.getMonth() + 1);
  }

  /* ---------- Msze święte ---------- */
  function renderTimes(list, cfg, isToday, next) {
    var hol = isHoliday(warsawNow(), cfg);
    return '<ul class="times">' + list.map(function (m) {
      var feastOff = isToday && m.bezSwiat && noEveningFeast(warsawNow(), cfg);
      var off = (hol && m.bezWakacji) || feastOff;
      var isNext = next && isToday && next.mass === m;
      var label = m.uwaga || (feastOff ? 'nie w to święto' : (off ? 'nie w wakacje' : ''));
      return '<li><span class="time' + (off ? ' time--off' : '') + (isNext ? ' time--next' : '') + '"' +
        (isNext ? ' aria-label="' + esc(m.godz) + ' – najbliższa Msza"' : '') + '>' + esc(m.godz) +
        (isNext ? '<small>najbliższa</small>' : (label ? '<small>' + esc(label) + '</small>' : '')) + '</span></li>';
    }).join('') + '</ul>';
  }
  var elSun = $('#msze-niedziele'), elWeek = $('#msze-powszednie'), elNext = $('#next-mass'), elConf = $('#spowiedz-lista');
  if (elSun || elWeek || elNext || elConf) {
    load('msze').then(function (cfg) {
      var now = warsawNow(), today = massesFor(now, cfg), next = nextMass(cfg, now);
      var nextToday = next && next.offset === 0 && !today.exception ? next : null;
      if (elSun) elSun.innerHTML = renderTimes(cfg.niedziele, cfg, today.sunday, nextToday) +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaNiedziele) + '</span></p>';
      if (elWeek) elWeek.innerHTML = renderTimes(cfg.powszednie, cfg, !today.sunday, nextToday) +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaPowszednie) + '</span></p>' +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaSwieta) + '</span></p>';
      if (elConf) {
        // na stronie głównej (wąski pasek) – skrócone nazwy dni, żeby pasek nie puchł
        var short = !!elConf.closest('.confession');
        elConf.innerHTML = '<ul class="checklist">' + cfg.spowiedz.map(function (s) {
          if (short) s = s.replace(/pierwszy czwartek, piątek i sobotę/i, 'pierwszy czw., pt. i sb.')
            .replace(/podczas adoracji Najświętszego Sakramentu od (\d{1,2}:\d{2}) do (\d{1,2}:\d{2})/i, 'adoracja, $1–$2');
          return '<li>' + esc(s) + '</li>';
        }).join('') + '</ul>';
      }
      // legenda: co oznacza granatowe wyróżnienie godziny
      var leg = $('#msze-legenda');
      if (leg && nextToday) {
        $('.legend-chip', leg).textContent = nextToday.mass.godz;
        leg.hidden = false;
      }
      // karta obowiązująca dziś dostaje wyróżnienie i znaczek „Dziś”
      if (!today.exception) {
        var card = $(today.sunday ? '.mass-card--sunday' : '.mass-card--weekday');
        if (card) {
          card.classList.add('mass-card--today');
          var b = $('[data-today-badge]', card); if (b) b.hidden = false;
        }
      }
      // zmiany godzin w najbliższych 14 dniach
      var elCh = $('#msze-zmiany');
      if (elCh) {
        var soon = (cfg.zmiany || []).filter(function (z) {
          var dd = parseDate(z.data); return dd >= addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 0) && dd <= addDays(now, 14);
        }).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
        if (soon.length) {
          elCh.innerHTML = '<div class="alert alert--changes"><strong>' + icon('info') + ' Zmiany w porządku Mszy</strong><ul>' + soon.map(function (z) {
            var dd = parseDate(z.data);
            var times = (z.msze || []).length ? z.msze.map(function (m) { return m.godz + (m.uwaga ? ' (' + m.uwaga + ')' : ''); }).join(', ') : 'brak Mszy świętych';
            return '<li><b>' + cap(DNI[dd.getDay()]) + ', ' + dd.getDate() + ' ' + MIES[dd.getMonth()] + (z.opis ? ' – ' + esc(z.opis) : '') + ':</b> ' + esc(times) + '</li>';
          }).join('') + '</ul></div>';
          elCh.hidden = false;
        }
      }
      if (elNext && next) {
        $('.next-mass__label', elNext).textContent = 'Najbliższa Msza święta';
        $('.next-mass__value', elNext).textContent = cap(relDay(next)) + ', godz. ' + next.mass.godz;
        if (elNext.tagName === 'A') elNext.setAttribute('aria-label', 'Najbliższa Msza święta: ' + relDay(next) + ', godzina ' + next.mass.godz + '. Pokaż wszystkie godziny');
      }
      $$('[data-today-type]').forEach(function (el) {
        el.textContent = today.exception ? 'Dziś zmieniony porządek Mszy – szczegóły poniżej'
          : (today.sunday ? 'Dziś obowiązuje porządek niedzielny' : 'Dziś obowiązuje porządek dni powszednich');
      });
    }).catch(function () { [elSun, elWeek].forEach(function (el) { if (el) fail(el, 'porządek Mszy'); }); });
  }

  /* ---------- Najbliższe nabożeństwa i odpust parafialny ----------
     Wyliczane ze stałych reguł podanych na stronie „Msze i nabożeństwa” – nie trzeba ich wpisywać co tydzień.
     Przy zmianie zasad nabożeństw zaktualizuj funkcję devotionsOn() i stronę src/pages/msze.html. */
  var DNI_KR2 = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  function adventStart(y) { var c = new Date(y, 11, 25), w = c.getDay(); return addDays(c, -(w === 0 ? 28 : w + 21)); }
  function trinitySunday(y) { return addDays(easter(y), 56); }
  function sameDay(a, b) { return isoDate(a) === isoDate(b); }
  function devotionsOn(d) {
    var out = [], dow = d.getDay(), dom = d.getDate(), m = d.getMonth(), sun = dow === 0;
    var e = easter(d.getFullYear()), ash = addDays(e, -46), lent = d >= ash && d < e;
    if (sameDay(d, trinitySunday(d.getFullYear()))) out.push({ t: 'Odpust parafialny – Uroczystość Najświętszej Trójcy', h: 'porządek niedzielny', feast: true, e: 'trojca' });
    if (dow === 3) out.push({ t: 'Nabożeństwo do NMP Nieustającej Pomocy', h: 'po Mszy św. o 18:30', e: 'maryja' });
    if (dom === 13 && m >= 4 && m <= 9) out.push({ t: 'Nabożeństwo fatimskie', h: sun ? 'godz. 17:00' : 'po Mszy św. o 18:30', e: 'maryja' });
    if (dom === 22) out.push({ t: 'Nabożeństwo do św. Rity z poświęceniem róż', h: sun ? 'po Mszy św. o 18:00' : 'po Mszy św. o 18:30', e: 'roza' });
    if (dom <= 7 && dow === 4) out.push({ t: 'I czwartek, piątek i sobota miesiąca – adoracja Najświętszego Sakramentu i spowiedź', h: '17:00–19:00 (cz–sb)', e: 'monstrancja' });
    if (dom <= 7 && sun) out.push({ t: 'Żywy Różaniec – spotkanie i zmiana tajemnic', h: 'godz. 17:00', e: 'rozaniec' });
    if (lent && dow === 5) out.push({ t: 'Droga Krzyżowa', h: '17:00 (dzieci), 18:00, 19:30 (młodzież)', e: 'krzyz' });
    if (lent && sun) out.push({ t: 'Gorzkie Żale', h: 'godz. 17:00', e: 'krzyz' });
    return out;
  }
  // nabożeństwa codzienne w danym okresie: pokazywane jako jedna pozycja („trwa” albo „od …”)
  function seasonsAround(today, horizon) {
    var y = today.getFullYear(), list = [];
    var adv = adventStart(y);
    list.push({ od: addDays(adv, 1), do: new Date(y, 11, 24), t: 'Roraty (Adwent)', h: 'pn–sb o 6:30 i 18:30 (z udziałem dzieci)', e: 'lampion' });
    list.push({ od: new Date(y, 4, 1), do: new Date(y, 4, 31), t: 'Nabożeństwa majowe', h: 'dni powszednie 18:00, niedziele 17:00', e: 'lilia' });
    list.push({ od: new Date(y, 5, 1), do: new Date(y, 5, 30), t: 'Nabożeństwa czerwcowe', h: 'dni powszednie 18:00, niedziele 17:00', e: 'serce' });
    list.push({ od: new Date(y, 9, 1), do: new Date(y, 9, 31), t: 'Różaniec październikowy', h: 'dorośli: dni powszednie 18:00, niedziele 17:00; dzieci: pn–śr 17:00', e: 'rozaniec' });
    var t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return list.filter(function (s) { return s.do >= t0 && s.od <= horizon; }).map(function (s) {
      return { d: s.od < t0 ? t0 : s.od, ongoing: s.od <= t0, t: s.t, h: s.h, od: s.od, season: true, e: s.e };
    });
  }
  var elUp = $('#najblizsze');
  if (elUp) {
    try {
      var now0 = warsawNow(), t0 = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate());
      var horizon = addDays(t0, 13), items = [];
      for (var i = 0; i < 14; i++) {
        var dd = addDays(t0, i);
        devotionsOn(dd).forEach(function (x) { items.push({ d: dd, t: x.t, h: x.h, feast: x.feast, e: x.e }); });
      }
      items = seasonsAround(now0, horizon).concat(items)
        .sort(function (a, b) { return a.d - b.d || (b.season ? 1 : 0) - (a.season ? 1 : 0); }).slice(0, 5);
      var label = function (x) {
        if (x.season) return x.ongoing ? 'trwa' : 'od ' + x.od.getDate() + '.' + pad(x.od.getMonth() + 1);
        var diff = Math.round((x.d - t0) / 864e5);
        return diff === 0 ? 'dziś' : diff === 1 ? 'jutro' : DNI_KR2[x.d.getDay()] + ' ' + x.d.getDate() + '.' + pad(x.d.getMonth() + 1);
      };
      if (items.length) {
        $('.upcoming__list', elUp).innerHTML = items.map(function (x) {
          return '<li' + (x.feast ? ' class="is-feast"' : '') + '>' + (x.e ? '<span class="upcoming__em" aria-hidden="true"><svg><use href="' + ICONS + '#e-' + x.e + '"/></svg></span>' : '') + '<span class="upcoming__date">' + esc(label(x)) + '</span>' +
            '<span class="upcoming__text"><b>' + esc(x.t) + '</b> ' + esc(x.h) + '</span></li>';
        }).join('');
      } else {
        $('.upcoming__list', elUp).innerHTML = '<li><span class="upcoming__text">W najbliższych dniach nie ma dodatkowych nabożeństw. <a href="msze.html">Zobacz porządek nabożeństw</a></span></li>';
      }
      // odpust parafialny – najbliższa Uroczystość Najświętszej Trójcy
      var feast = trinitySunday(t0.getFullYear());
      if (feast < t0) feast = trinitySunday(t0.getFullYear() + 1);
      var elF = $('#odpust');
      if (elF) elF.innerHTML = 'Odpust parafialny – Uroczystość Najświętszej Trójcy: <b>niedziela, ' + feast.getDate() + ' ' + MIES[feast.getMonth()] + ' ' + feast.getFullYear() + ' r.</b>';
      elUp.hidden = false;
    } catch (err) { /* sekcja pomocnicza – przy błędzie po prostu się nie pokazuje */ }
  }
  window.ParafiaKalendarz && (window.ParafiaKalendarz.devotionsOn = devotionsOn, window.ParafiaKalendarz.trinitySunday = trinitySunday, window.ParafiaKalendarz.adventStart = adventStart);

  /* ---------- Dziś w liturgii ----------
     1) wspomnienia i święta z punktu „Liturgia tygodnia” w ogłoszeniach (dane od parafii),
     2) najważniejsze uroczystości i święta (stałe i ruchome, kalendarz ogólny i polski),
     3) w pozostałe dni – nazwa dnia okresu liturgicznego, np. „Czwartek XXXIII tygodnia zwykłego”. */
  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV'];
  var FIXED = {
    '01-01': 'Uroczystość Świętej Bożej Rodzicielki Maryi', '01-06': 'Uroczystość Objawienia Pańskiego',
    '02-02': 'Święto Ofiarowania Pańskiego', '03-19': 'Uroczystość św. Józefa, Oblubieńca NMP',
    '03-25': 'Uroczystość Zwiastowania Pańskiego', '04-23': 'Uroczystość św. Wojciecha, biskupa i męczennika, patrona Polski',
    '05-03': 'Uroczystość Najświętszej Maryi Panny, Królowej Polski', '05-08': 'Uroczystość św. Stanisława, biskupa i męczennika, patrona Polski',
    '06-24': 'Uroczystość Narodzenia św. Jana Chrzciciela', '06-29': 'Uroczystość św. Apostołów Piotra i Pawła',
    '08-06': 'Święto Przemienienia Pańskiego', '08-15': 'Uroczystość Wniebowzięcia Najświętszej Maryi Panny',
    '08-26': 'Uroczystość Najświętszej Maryi Panny Częstochowskiej', '09-14': 'Święto Podwyższenia Krzyża Świętego',
    '11-01': 'Uroczystość Wszystkich Świętych', '11-02': 'Wspomnienie wszystkich wiernych zmarłych',
    '12-08': 'Uroczystość Niepokalanego Poczęcia Najświętszej Maryi Panny', '12-25': 'Uroczystość Narodzenia Pańskiego',
    '12-26': 'Święto św. Szczepana, pierwszego męczennika'
  };
  function sundayOnOrBefore(d) { return addDays(d, -d.getDay()); }
  function weeksBetween(a, b) { return Math.round((b - a) / (7 * 864e5)); }
  function baptismOfLord(y) { var j6 = new Date(y, 0, 6); return j6.getDay() === 0 ? new Date(y, 0, 7) : addDays(j6, 7 - j6.getDay()); }
  function holyFamily(y) { // niedziela w oktawie Narodzenia Pańskiego, a gdy jej brak – 30 grudnia
    for (var i = 26; i <= 31; i++) { var x = new Date(y, 11, i); if (x.getDay() === 0) return x; }
    return new Date(y, 11, 30);
  }
  function movableName(d) {
    var y = d.getFullYear(), e = easter(y), k = function (n) { return sameDay(d, addDays(e, n)); };
    if (k(-46)) return 'Środa Popielcowa';
    if (k(-7)) return 'Niedziela Palmowa, czyli Męki Pańskiej';
    if (k(-3)) return 'Wielki Czwartek';
    if (k(-2)) return 'Wielki Piątek Męki Pańskiej';
    if (k(-1)) return 'Wielka Sobota';
    if (k(0)) return 'Niedziela Zmartwychwstania Pańskiego';
    if (k(7)) return 'II Niedziela Wielkanocna, czyli Miłosierdzia Bożego';
    if (k(42)) return 'Uroczystość Wniebowstąpienia Pańskiego';
    if (k(49)) return 'Uroczystość Zesłania Ducha Świętego';
    if (k(50)) return 'Święto Najświętszej Maryi Panny, Matki Kościoła';
    if (k(56)) return 'Uroczystość Najświętszej Trójcy – odpust parafialny';
    if (k(60)) return 'Uroczystość Najświętszego Ciała i Krwi Chrystusa (Boże Ciało)';
    if (k(68)) return 'Uroczystość Najświętszego Serca Pana Jezusa';
    if (sameDay(d, addDays(adventStart(y), -7))) return 'Uroczystość Jezusa Chrystusa, Króla Wszechświata';
    if (sameDay(d, baptismOfLord(y))) return 'Święto Chrztu Pańskiego';
    if (sameDay(d, holyFamily(y))) return 'Święto Świętej Rodziny: Jezusa, Maryi i Józefa';
    return null;
  }
  function seasonDayName(d) {
    var y = d.getFullYear(), e = easter(y), ash = addDays(e, -46), pent = addDays(e, 49), adv = adventStart(y);
    var day = cap(DNI[d.getDay()]), sun = d.getDay() === 0, s = sundayOnOrBefore(d);
    if (d >= adv && d < new Date(y, 11, 25)) {
      var na = weeksBetween(adv, s) + 1;
      return sun ? ROMAN[na] + ' Niedziela Adwentu' : day + ' ' + ROMAN[na] + ' tygodnia Adwentu';
    }
    if (d >= new Date(y, 11, 25) || d < baptismOfLord(y)) {
      if (d >= new Date(y, 11, 25) && d <= new Date(y, 11, 31)) return day + ' w oktawie Narodzenia Pańskiego';
      return day + ' okresu Narodzenia Pańskiego';
    }
    if (d >= ash && d < addDays(e, -7)) {
      if (d < addDays(ash, 4)) return day + ' po Popielcu';
      var nl = weeksBetween(addDays(ash, 4), s) + 1;
      return sun ? ROMAN[nl] + ' Niedziela Wielkiego Postu' : day + ' ' + ROMAN[nl] + ' tygodnia Wielkiego Postu';
    }
    if (d > addDays(e, -7) && d < e) return ({ 1: 'Wielki Poniedziałek', 2: 'Wielki Wtorek', 3: 'Wielka Środa' })[d.getDay()] || day + ' Wielkiego Tygodnia';
    if (d > e && d <= pent) {
      if (d < addDays(e, 7)) return day + ' w oktawie Wielkanocy';
      var ne = weeksBetween(e, s) + 1;
      return sun ? ROMAN[ne] + ' Niedziela Wielkanocna' : day + ' ' + ROMAN[ne] + ' tygodnia wielkanocnego';
    }
    // okres zwykły: przed Wielkim Postem liczony od Chrztu Pańskiego, po Zesłaniu Ducha Świętego – wstecz od Chrystusa Króla (XXXIV)
    var n = d < ash ? weeksBetween(sundayOnOrBefore(baptismOfLord(y)), s) + 1 : 34 - weeksBetween(s, addDays(adv, -7));
    if (n < 1 || n > 34) return null;
    return sun ? ROMAN[n] + ' Niedziela zwykła' : day + ' ' + ROMAN[n] + ' tygodnia zwykłego';
  }
  // „Liturgia tygodnia” z ogłoszeń: „wtorek – św. Elżbiety Węgierskiej, zakonnicy” → wpis na odpowiedni dzień tygodnia po niedzieli ogłoszeń
  var WEEKDAY_IDX = { niedziela: 0, poniedzialek: 1, wtorek: 2, sroda: 3, czwartek: 4, piatek: 5, sobota: 6 };
  function annLiturgyFor(d, ann) {
    if (!ann || !ann.data) return null;
    var base = parseDate(ann.data), diff = Math.round((d - base) / 864e5);
    if (diff < 1 || diff > 7) return null;
    var p = (ann.punkty || []).filter(function (x) { return x && x.lista && /liturgia tygodnia/i.test(x.tekst || ''); })[0];
    if (!p) return null;
    for (var i = 0; i < p.lista.length; i++) {
      var m = p.lista[i].match(/^\s*([^\s–-]+)\s*[–-]\s*(.+)$/);
      if (!m) continue;
      var key = m[1].toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]; }).replace(/\.$/, '');
      var idx = WEEKDAY_IDX[key];
      if (idx === undefined) continue;
      if (idx === d.getDay() && (idx !== 0 || diff === 7)) return m[2].trim();
    }
    return null;
  }
  function liturgyToday(d, ann) {
    var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var fromAnn = annLiturgyFor(d, ann), season = seasonDayName(d);
    // uroczystość ze stałą datą wypadająca w niedzielę Adwentu, Wielkiego Postu lub okresu wielkanocnego przechodzi na poniedziałek
    var privileged = function (x) { var s = seasonDayName(x) || ''; return x.getDay() === 0 && /Adwentu|Wielkiego Postu|Wielkanocna/.test(s); };
    var fixed = FIXED[md] || null;
    if (fixed && /^Uroczysto/.test(fixed) && privileged(d)) fixed = null;
    var prev = addDays(d, -1), prevFixed = FIXED[pad(prev.getMonth() + 1) + '-' + pad(prev.getDate())];
    if (!fixed && d.getDay() === 1 && prevFixed && /^Uroczysto/.test(prevFixed) && privileged(prev)) fixed = prevFixed + ' (przeniesiona z niedzieli)';
    var big = movableName(d) || fixed;
    if (big) return big; // uroczystości i święta mają pierwszeństwo przed wspomnieniami
    return season ? season + (fromAnn ? ' · ' + fromAnn : '') : fromAnn;
  }
  // Kolor liturgiczny dnia – liczony z tych samych danych co „Dziś w liturgii”.
  // Wspomnienia świętych bierzemy z „Liturgii tygodnia” w ogłoszeniach (męczennicy – czerwony, pozostali – biały).
  var LIT_COLORS = { green: 'zielony', violet: 'fioletowy', white: 'biały', red: 'czerwony', rose: 'różowy' };
  // Święta o stałej dacie z innym kolorem niż okres (apostołowie, ewangeliści, męczennicy; wyjątki białe).
  // Mają pierwszeństwo przed dniem powszednim (także w Adwencie i okresie wielkanocnym), ale nie przed niedzielą
  // ani przed Wielkim Tygodniem i oktawą Wielkanocy.
  var FEAST_COLORS = {
    '01-25': 'white', // Nawrócenie św. Pawła Apostoła
    '02-22': 'white', // Katedry św. Piotra Apostoła
    '04-25': 'red',   // św. Marka Ewangelisty
    '05-06': 'red',   // św. Apostołów Filipa i Jakuba (w Polsce 6 maja)
    '05-14': 'red',   // św. Macieja Apostoła
    '07-03': 'red',   // św. Tomasza Apostoła
    '07-25': 'red',   // św. Jakuba Apostoła
    '08-10': 'red',   // św. Wawrzyńca, diakona i męczennika
    '08-24': 'red',   // św. Bartłomieja Apostoła
    '08-29': 'red',   // Męczeństwo św. Jana Chrzciciela
    '09-21': 'red',   // św. Mateusza, Apostoła i Ewangelisty
    '10-18': 'red',   // św. Łukasza Ewangelisty
    '10-28': 'red',   // św. Apostołów Szymona i Judy Tadeusza
    '11-30': 'red',   // św. Andrzeja Apostoła
    '12-27': 'white', // św. Jana, Apostoła i Ewangelisty
    '12-28': 'red'    // Świętych Młodzianków, męczenników
  };
  function liturgyColor(d, ann) {
    var txt = liturgyToday(d, ann) || '', season = seasonDayName(d) || '', fromAnn = annLiturgyFor(d, ann) || '';
    var big = txt.indexOf(season) === 0 && season ? '' : txt; // uroczystość/święto zamiast nazwy dnia okresu
    var RED = /Palmowa|Wielki Piątek|Zesłania Ducha|męczenni|męczeńs|Apostoł|Ewangelist|Podwyższenia Krzyża/i;
    var WHITE_EXC = /Nawrócenie|Katedry św\. Piotra|Jana,? Apostoła i Ewangelisty/i; // apostołowie w kolorze białym
    var isRed = function (s) { return RED.test(s) && !WHITE_EXC.test(s); };
    if (big) {
      if (isRed(big)) return 'red';
      if (/zmarłych|Popielcowa|Wielka Sobota/i.test(big)) return 'violet';
      return 'white';
    }
    var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var holyWeekOrOctave = /Wielki Poniedziałek|Wielki Wtorek|Wielka Środa|Wielkiego Tygodnia|oktawie Wielkanocy/.test(season);
    if (d.getDay() !== 0 && FEAST_COLORS[md] && !holyWeekOrOctave) return FEAST_COLORS[md];
    if (/III Niedziela Adwentu|IV Niedziela Wielkiego Postu/.test(season)) return 'rose';
    if (/Adwentu|Wielkiego Postu|po Popielcu|Wielki Poniedziałek|Wielki Wtorek|Wielka Środa|Wielkiego Tygodnia/.test(season)) return 'violet';
    var memorial = d.getDay() !== 0 && fromAnn;
    if (/Narodzenia|Wielkanoc|wielkanocnego/.test(season)) return memorial && isRed(fromAnn) ? 'red' : 'white';
    if (memorial) return isRed(fromAnn) ? 'red' : 'white';
    return 'green';
  }
  window.ParafiaKalendarz && (window.ParafiaKalendarz.liturgyToday = liturgyToday, window.ParafiaKalendarz.seasonDayName = seasonDayName);
  window.ParafiaKalendarz && (window.ParafiaKalendarz.liturgyColor = liturgyColor);
  var elLit = $('#liturgia-dnia');
  if (elLit) {
    loadOptional('ogloszenia', null).then(function (ann) {
      var txt = null;
      try { txt = liturgyToday(warsawNow(), ann); } catch (err) { txt = null; }
      var col = null;
      try { col = liturgyColor(warsawNow(), ann); } catch (err) { col = null; }
      if (txt && col) {
        var dot = document.createElement('span');
        dot.className = 'lit-color lit-color--' + col;
        dot.title = 'Kolor liturgiczny dnia: ' + LIT_COLORS[col];
        dot.innerHTML = '<span class="visually-hidden">Kolor liturgiczny: ' + LIT_COLORS[col] + '. </span>';
        // kropka w linii tekstu (wyrównana do napisu), zamiast ikony krzyżyka
        var ic = $('svg', elLit), host = $('.mass-liturgy__label', elLit);
        if (ic) ic.remove();
        if (host) host.parentNode.insertBefore(dot, host); else elLit.insertBefore(dot, elLit.firstChild);
      }
      if (txt) { $('.liturgy__text', elLit).textContent = txt; elLit.hidden = false; }
    });
  }

  /* ---------- Kalendarz parafialny (z kalendarza liturgicznego, nabożeństw, zmian Mszy i stałych spotkań wspólnot) ---------- */
  var elCal = $('#kalendarz');
  if (elCal) {
    var CATS = [
      { id: 'liturgia', name: 'Liturgia' },
      { id: 'nabozenstwa', name: 'Nabożeństwa' },
      { id: 'msze', name: 'Zmiany w porządku Mszy' },
      { id: 'wspolnoty', name: 'Spotkania wspólnot' }
    ];
    var MIES_M = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    // stałe spotkania wspólnot (zgodnie ze stroną Wspólnoty i grupy)
    var groupsOn = function (d) {
      var out = [], dow = d.getDay(), dom = d.getDate();
      if (dow === 4) out.push({ t: 'Wspólnota Młodzieżowa Phileō', h: 'godz. 19:15', href: 'wspolnoty.html#mlodziez' });
      if (dow === 3) out.push({ t: 'Schola młodzieżowa Cordis – próba', h: 'godz. 19:00, salka parafialna', href: 'wspolnoty.html#cordis' });
      if (dom <= 7 && dow === 4) out.push({ t: 'Stowarzyszenie Krwi Chrystusa', h: 'godz. 17:00, dolny kościół', href: 'wspolnoty.html#krew' });
      if (dom <= 7 && dow === 5) out.push({ t: 'Straż Honorowa NSPJ – czuwanie i adoracja', h: 'godz. 17:00', href: 'wspolnoty.html#straz' });
      return out;
    };
    var seasonsOf = function (y) {
      var adv = adventStart(y), e = easter(y);
      return [
        { od: addDays(adv, 1), do: new Date(y, 11, 24), t: 'Roraty – pn–sb o 6:30 i 18:30 (z udziałem dzieci)' },
        { od: addDays(e, -46), do: addDays(e, -3), t: 'Wielki Post – Droga Krzyżowa w piątki (17:00, 18:00, 19:30), Gorzkie Żale w niedziele o 17:00' },
        { od: new Date(y, 4, 1), do: new Date(y, 4, 31), t: 'Nabożeństwa majowe – dni powszednie 18:00, niedziele 17:00' },
        { od: new Date(y, 5, 1), do: new Date(y, 5, 30), t: 'Nabożeństwa czerwcowe – dni powszednie 18:00, niedziele 17:00' },
        { od: new Date(y, 9, 1), do: new Date(y, 9, 31), t: 'Różaniec październikowy – dorośli: dni powszednie 18:00, niedziele 17:00; dzieci: pn–śr 17:00' }
      ];
    };
    Promise.all([load('msze'), loadOptional('ogloszenia', null)]).then(function (res) {
      var cfg = res[0], ann = res[1];
      var today = warsawNow(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      var view = new Date(today.getFullYear(), today.getMonth(), 1), selected = today;
      var active = {}; CATS.forEach(function (c) { active[c.id] = true; });
      var eventsOn = function (d) {
        var ev = [], lit = '', season = '';
        try { lit = liturgyToday(d, ann) || ''; season = seasonDayName(d) || ''; } catch (e) {}
        var big = lit && !(season && lit.indexOf(season) === 0);
        if (big || d.getDay() === 0) {
          var col = ''; try { col = liturgyColor(d, ann); } catch (e) {}
          ev.push({ c: 'liturgia', t: lit.split(' · ')[0], h: big ? 'uroczystość / święto' : 'niedziela', col: col });
        }
        devotionsOn(d).forEach(function (x) { ev.push({ c: 'nabozenstwa', t: x.t, h: x.h, href: 'msze.html' }); });
        (cfg.zmiany || []).filter(function (z) { return z.data === isoDate(d); }).forEach(function (z) {
          ev.push({ c: 'msze', t: (z.opis ? z.opis + ' – ' : '') + 'zmieniony porządek Mszy', h: (z.msze || []).length ? 'Msze: ' + z.msze.map(function (m) { return m.godz; }).join(', ') : 'brak Mszy świętych', href: 'msze.html' });
        });
        groupsOn(d).forEach(function (x) { ev.push({ c: 'wspolnoty', t: x.t, h: x.h, href: x.href }); });
        return ev.filter(function (x) { return active[x.c]; });
      };
      var dayLabel = function (d) { return cap(DNI[d.getDay()]) + ', ' + d.getDate() + ' ' + MIES[d.getMonth()]; };
      var evList = function (ev) {
        return '<ul class="cal-list">' + ev.map(function (x) {
          return '<li class="cal-ev cal-ev--' + x.c + '">' + (x.col ? '<span class="lit-color lit-color--' + x.col + '" title="Kolor liturgiczny"></span>' : '<span class="cal-dot" aria-hidden="true"></span>') +
            '<span><b>' + (x.href ? '<a href="' + x.href + '">' + esc(x.t) + '</a>' : esc(x.t)) + '</b>' + (x.h ? ' <small>' + esc(x.h) + '</small>' : '') + '</span></li>';
        }).join('') + '</ul>';
      };
      function render() {
        var y = view.getFullYear(), m = view.getMonth();
        var first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
        var cells = '';
        for (var i = 0; i < lead; i++) cells += '<span class="cal-cell cal-cell--empty" aria-hidden="true"></span>';
        for (var dn = 1; dn <= days; dn++) {
          var d = new Date(y, m, dn), ev = eventsOn(d), cats = [];
          ev.forEach(function (x) { if (cats.indexOf(x.c) < 0) cats.push(x.c); });
          var cls = 'cal-cell' + (sameDay(d, today) ? ' is-today' : '') + (sameDay(d, selected) ? ' is-selected' : '') + (d.getDay() === 0 ? ' is-sunday' : '');
          cells += '<button type="button" class="' + cls + '" data-day="' + dn + '" aria-label="' + esc(dayLabel(d)) + (ev.length ? ', wydarzenia: ' + ev.length : '') + '"' + (sameDay(d, selected) ? ' aria-pressed="true"' : '') + '>' +
            '<span class="cal-num">' + dn + '</span><span class="cal-dots">' + cats.map(function (c) { return '<i class="cal-dot cal-dot--' + c + '"></i>'; }).join('') + '</span></button>';
        }
        var seas = seasonsOf(y).filter(function (s) { return s.od <= new Date(y, m + 1, 0) && s.do >= first; });
        // lista: wybrany dzień + najbliższe wydarzenia w miesiącu
        var selEv = eventsOn(selected);
        var upcoming = '', count = 0;
        for (var k = 1; k <= days && count < 12; k++) {
          var dd = new Date(y, m, k);
          if (dd < today && !(y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth()))) continue;
          if (sameDay(dd, selected)) continue;
          var e2 = eventsOn(dd);
          if (!e2.length) continue;
          upcoming += '<div class="cal-day"><h4>' + esc(dayLabel(dd)) + '</h4>' + evList(e2) + '</div>'; count++;
        }
        elCal.innerHTML =
          '<div class="cal-toolbar">' +
            '<div class="cal-nav"><button type="button" class="btn btn--line btn--sm" data-nav="-1" aria-label="Poprzedni miesiąc">' + icon('left') + '</button>' +
            '<h2 class="cal-title">' + MIES_M[m] + ' ' + y + '</h2>' +
            '<button type="button" class="btn btn--line btn--sm" data-nav="1" aria-label="Następny miesiąc">' + icon('right') + '</button>' +
            (y !== today.getFullYear() || m !== today.getMonth() ? '<button type="button" class="btn btn--gold btn--sm" data-nav="0">Dziś</button>' : '') + '</div>' +
            '<div class="cal-filters" role="group" aria-label="Pokaż kategorie">' + CATS.map(function (c) {
              return '<button type="button" class="cal-filter cal-filter--' + c.id + (active[c.id] ? ' is-on' : '') + '" data-cat="' + c.id + '" aria-pressed="' + active[c.id] + '"><i class="cal-dot cal-dot--' + c.id + '"></i>' + c.name + '</button>';
            }).join('') + '</div>' +
          '</div>' +
          (seas.length ? '<div class="cal-seasons">' + seas.map(function (s) { return '<p>' + icon('calendar') + '<span><b>W tym miesiącu:</b> ' + esc(s.t) + ' <small>(' + s.od.getDate() + ' ' + MIES[s.od.getMonth()] + ' – ' + s.do.getDate() + ' ' + MIES[s.do.getMonth()] + ')</small>' + '</span></p>'; }).join('') + '</div>' : '') +
          '<div class="cal-layout"><div class="card cal-grid-card"><div class="cal-week" aria-hidden="true"><span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pt</span><span>So</span><span>Nd</span></div>' +
          '<div class="cal-grid">' + cells + '</div></div>' +
          '<div class="card cal-side"><h3>' + esc(dayLabel(selected)) + (sameDay(selected, today) ? ' <span class="badge">dziś</span>' : '') + '</h3>' +
            (selEv.length ? evList(selEv) : '<p class="newcomer-small">Brak wydarzeń w wybranych kategoriach. Msze święte – według <a href="msze.html">stałego porządku</a>.</p>') +
            (upcoming ? '<h3 class="cal-next">Dalej w tym miesiącu</h3>' + upcoming : '') + '</div></div>';
      }
      elCal.addEventListener('click', function (e) {
        var b = e.target.closest('[data-day],[data-nav],[data-cat]');
        if (!b) return;
        if (b.hasAttribute('data-day')) { selected = new Date(view.getFullYear(), view.getMonth(), +b.getAttribute('data-day')); }
        else if (b.hasAttribute('data-nav')) {
          var n = +b.getAttribute('data-nav');
          view = n === 0 ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(view.getFullYear(), view.getMonth() + n, 1);
          selected = n === 0 ? today : (view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth() ? today : new Date(view));
        } else { var c = b.getAttribute('data-cat'); active[c] = !active[c]; }
        render();
      });
      render();
    }).catch(function () { fail(elCal, 'kalendarz'); });
  }

  /* ---------- Zamówienie intencji: przygotowanie wiadomości e-mail do kancelarii (bez wysyłania danych przez stronę) ---------- */
  var intForm = $('#intention-form');
  if (intForm) {
    intForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = intForm.elements, err = $('#intention-error');
      var missing = ['rodzaj', 'data', 'tresc', 'imie', 'tel'].filter(function (n) { return !f[n].value.trim(); });
      if (missing.length) { err.textContent = 'Uzupełnij wymagane pola: rodzaj, dzień, treść intencji, imię i nazwisko oraz telefon.'; err.hidden = false; f[missing[0]].focus(); return; }
      err.hidden = true;
      var body = 'Szczęść Boże,\n\nproszę o przyjęcie intencji mszalnej:\n\n' +
        'Rodzaj: ' + f.rodzaj.value + '\nProponowany dzień: ' + f.data.value + '\nProponowana godzina: ' + f.godz.value +
        '\nTreść intencji: ' + f.tresc.value.trim() + '\n\nZamawiający: ' + f.imie.value.trim() + '\nTelefon: ' + f.tel.value.trim() +
        (f.email.value.trim() ? '\nE-mail: ' + f.email.value.trim() : '') + '\n\nProszę o potwierdzenie terminu.\n';
      location.href = 'mailto:proboszczswtrojca@gmail.com?subject=' + encodeURIComponent('Zamówienie intencji mszalnej – ' + f.data.value) + '&body=' + encodeURIComponent(body);
    });
  }

  /* ---------- Mapa terytorium parafii (Leaflet + content/teren.json z OpenStreetMap) ---------- */
  var elMap = $('#teren-map');
  if (elMap) {
    var startMap = function () {
      if (!window.L) { setTimeout(startMap, 150); return; }
      load('teren').then(function (t) {
        elMap.innerHTML = '';
        var map = L.map(elMap, { scrollWheelZoom: false }).setView(t.kosciol, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        var area = L.polygon(t.obszar, { color: '#b8860b', weight: 3, dashArray: '8 6', fillColor: '#c9a23f', fillOpacity: .14 }).addTo(map);
        var layers = {};
        t.ulice.forEach(function (u) {
          if (!u.linie.length) return;
          layers[u.nazwa] = L.polyline(u.linie, { color: '#1b2942', weight: 5, opacity: .85 })
            .bindTooltip(u.nazwa, { sticky: true }).addTo(map);
        });
        var church = L.circleMarker(t.kosciol, { radius: 9, color: '#fff', weight: 3, fillColor: '#b3262e', fillOpacity: 1 })
          .bindPopup('<b>Kościół Trójcy Świętej</b><br>ul. Krzycka 42-44').addTo(map);
        map.fitBounds(area.getBounds(), { padding: [20, 20] });
        // wyróżnienie ulic znalezionych w wyszukiwarce
        document.addEventListener('parafia:ulice', function (e) {
          var names = e.detail || [], hit = [];
          Object.keys(layers).forEach(function (n) {
            var on = names.indexOf(n) >= 0;
            layers[n].setStyle(on ? { color: '#c9a23f', weight: 8, opacity: 1 } : { color: '#1b2942', weight: 5, opacity: names.length ? .35 : .85 });
            if (on) { layers[n].bringToFront(); hit.push(layers[n]); }
          });
          if (hit.length) map.fitBounds(L.featureGroup(hit).getBounds(), { padding: [40, 40], maxZoom: 17 });
          else if (!names.length) map.fitBounds(area.getBounds(), { padding: [20, 20] });
        });
        church.bringToFront();
      }).catch(function () { fail(elMap, 'mapa'); });
    };
    startMap();
  }

  /* ---------- Czy moja ulica należy do parafii? ---------- */
  var sq = $('#street-q');
  if (sq) {
    var norm = function (s) {
      return s.toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]; })
        .replace(/\b(ul|ulica|al|aleja|ks|sw|gen)\.?\s+/g, '').replace(/\b[a-z]\.\s*/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    };
    var streetEls = $$('.streets li');
    var streets = streetEls.map(function (li) { return { el: li, name: li.textContent.trim(), key: norm(li.textContent.replace(/\(.*\)/, '')) }; });
    var res = $('#street-result');
    sq.addEventListener('input', function () {
      var q = norm(sq.value);
      streetEls.forEach(function (li) { li.classList.remove('is-match'); });
      if (q.length < 2) { res.textContent = ''; res.className = 'street-search__result'; document.dispatchEvent(new CustomEvent('parafia:ulice', { detail: [] })); return; }
      var match = function (qq) { return streets.filter(function (s) { return s.key.indexOf(qq) === 0 || s.key.split(' ').some(function (w) { return w.indexOf(qq) === 0; }); }); };
      var hits = match(q);
      // pełna nazwa z imieniem (np. „Wojciecha Korfantego”) – dopasuj po ostatnim słowie, czyli nazwisku/nazwie
      if (!hits.length && q.indexOf(' ') > 0) { var last = q.split(' ').pop(); if (last.length >= 3) hits = match(last); }
      hits.forEach(function (s) { s.el.classList.add('is-match'); });
      document.dispatchEvent(new CustomEvent('parafia:ulice', { detail: hits.map(function (s) { return s.name; }) }));
      if (hits.length === 1 || (hits.length && hits.some(function (s) { return s.key === q; }))) {
        var h = hits.filter(function (s) { return s.key === q; })[0] || hits[0];
        res.innerHTML = '<b>Tak</b> – ulica <b>' + esc(h.name) + '</b> należy do naszej parafii.';
        res.className = 'street-search__result is-yes';
      } else if (hits.length) {
        res.innerHTML = 'Pasujące ulice: ' + hits.map(function (s) { return '<b>' + esc(s.name) + '</b>'; }).join(', ') + ' – wszystkie należą do naszej parafii.';
        res.className = 'street-search__result is-yes';
      } else {
        res.innerHTML = 'Nie znaleziono tej ulicy na liście naszej parafii. Sprawdź pisownię lub zadzwoń do kancelarii: <a href="tel:+48713628254">71 362 82 54</a>.';
        res.className = 'street-search__result is-no';
      }
    });
  }

  /* ---------- Ogłoszenia ---------- */
  // plik opcjonalny (np. archiwum) – brak pliku nie jest błędem
  function loadOptional(name, fallback) { return load(name).catch(function () { return fallback; }); }
  function param(name) { var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : null; }
  function setParam(name, value) {
    try { var u = new URL(location.href); if (value) u.searchParams.set(name, value); else u.searchParams.delete(name); history.replaceState(null, '', u); } catch (e) { /* stara przeglądarka */ }
  }
  function annItems(o) {
    return o.punkty.map(function (p) {
      if (typeof p === 'string') return '<li><p>' + esc(p) + '</p></li>';
      return '<li><p>' + esc(p.tekst) + '</p>' +
        (p.lista && p.lista.length ? '<ul>' + p.lista.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (p.dopisek ? '<p class="dopisek">' + esc(p.dopisek) + '</p>' : '') + '</li>';
    }).join('');
  }
  var elAnn = $('#ogloszenia');
  if (elAnn) {
    Promise.all([load('ogloszenia'), loadOptional('ogloszenia-archiwum', { tygodnie: [] })]).then(function (res) {
      var current = res[0];
      var seenAnn = {}; seenAnn[current.data] = 1;
      var weeks = [current].concat((current.archiwum || []).concat(res[1].tygodnie || []).filter(function (w) { if (!w.data || seenAnn[w.data]) return false; seenAnn[w.data] = 1; return true; }))
        .sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      var sel = $('#ann-week'), note = $('#ann-archive-note');
      function render(o) {
        var d = parseDate(o.data);
        $$('[data-ann-title]').forEach(function (el) { el.textContent = o.tytul; });
        // przy dacie – nazwa uroczystości/święta tej niedzieli (tylko gdy to coś więcej niż zwykła „Niedziela okresu”)
        var feast = '';
        try {
          var lit = liturgyToday(d, null) || '', season = seasonDayName(d) || '';
          if (lit && !(season && lit.indexOf(season) === 0) && lit.toLowerCase().replace(/[^a-ząćęłńóśźż]+/g, '') !== (o.tytul || '').toLowerCase().replace(/[^a-ząćęłńóśźż]+/g, '')) feast = lit.replace(/ – odpust parafialny$/, '');
        } catch (err) { feast = ''; }
        $$('[data-ann-date]').forEach(function (el) { el.textContent = longDate(d) + ' r.' + (feast ? ' · ' + feast : ''); el.setAttribute('datetime', o.data); });
        elAnn.innerHTML = '<ol>' + annItems(o) + '</ol>';
        // ogłoszenia starsze niż 9 dni – uczciwa informacja zamiast „porzuconej” daty
        var stale = $('#ann-stale');
        if (stale) {
          var age = Math.round((warsawNow() - d) / 864e5);
          stale.hidden = !(o === current && age > 9);
          if (!stale.hidden) stale.innerHTML = icon('info') + '<span>Nowe ogłoszenia pojawią się wkrótce. Poniżej ostatnie ogłoszenia z dnia ' + esc(longDate(d)) + ' r.</span>';
        }
        if (note) {
          note.hidden = o === current;
          if (o !== current) note.innerHTML = icon('info') + '<span>To ogłoszenia archiwalne z dnia ' + esc(longDate(d)) + ' r. <a href="ogloszenia.html">Wróć do bieżących ogłoszeń</a></span>';
        }
      }
      var chosen = weeks.filter(function (w) { return w.data === param('tydzien'); })[0] || current;
      render(chosen);
      if (param('druk')) setTimeout(function () { window.print(); }, 400); // link „Drukuj / zapisz jako PDF” ze strony głównej
      if (sel) {
        sel.innerHTML = weeks.map(function (w) {
          return '<option value="' + esc(w.data) + '"' + (w === chosen ? ' selected' : '') + '>' +
            esc(longDate(parseDate(w.data))) + ' – ' + esc(w.tytul) + (w === current ? ' (bieżące)' : '') + '</option>';
        }).join('');
        sel.disabled = weeks.length < 2;
        var hint = $('#ann-week-hint'); if (hint) hint.hidden = weeks.length > 1;
        sel.addEventListener('change', function () {
          var w = weeks.filter(function (x) { return x.data === sel.value; })[0];
          setParam('tydzien', w === current ? null : w.data); render(w);
        });
      }
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
  // Bieżący tydzień intencji: tydzień zawierający dzisiejszą datę – z intencje.json albo z archiwum
  // (można więc wpisać kolejne tygodnie z wyprzedzeniem; strona przełączy się sama). Zapasowo: intencje.json.
  function loadIntentionWeeks() {
    return Promise.all([load('intencje'), loadOptional('intencje-archiwum', { tygodnie: [] })]).then(function (res) {
      var file = res[0], todayIso = isoDate(warsawNow());
      var first = function (w) { return w.dni[0].data; }, last = function (w) { return w.dni[w.dni.length - 1].data; };
      var seenInt = {}; seenInt[first(file)] = 1;
      var weeks = [file].concat((file.archiwum || []).concat(res[1].tygodnie || []).filter(function (w) { if (!w.dni || !w.dni.length || seenInt[first(w)]) return false; seenInt[first(w)] = 1; return true; }))
        .sort(function (a, b) { return first(a) < first(b) ? -1 : 1; });
      var current = weeks.filter(function (w) { return first(w) <= todayIso && todayIso <= last(w); })[0];
      if (!current && last(file) < todayIso) {
        // intencje.json są już nieaktualne – weź najbliższy przyszły tydzień z archiwum, jeśli jest
        current = weeks.filter(function (w) { return first(w) > todayIso; })[0];
      }
      return { current: current || file, weeks: weeks };
    });
  }
  var elTabs = $('#intencje-tabs');
  if (elTabs) {
    loadIntentionWeeks().then(function (r) {
      var data = r.current;
      var todayIso = isoDate(warsawNow());
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
    loadIntentionWeeks().then(function (r) {
      var current = r.current, weeks = r.weeks, todayIso = isoDate(warsawNow());
      var first = function (w) { return w.dni[0].data; };
      var pos = weeks.indexOf(weeks.filter(function (w) { return first(w) === param('tydzien'); })[0] || current);
      var prev = $('#week-prev'), next = $('#week-next'), now = $('#week-now');
      function render() {
        var data = weeks[pos], isCur = data === current;
        $$('[data-week]').forEach(function (el) { el.textContent = data.tydzien; });
        elWeekInt.innerHTML = data.dni.map(function (day) {
          var h = dayHeading(day), today = day.data === todayIso;
          return '<article class="card week-day' + (today ? ' is-today' : '') + '" id="d-' + day.data + '">' +
            '<h2 class="day__title">' + esc(h.title) + (today ? ' <span class="badge">dziś</span>' : '') + '</h2>' +
            (h.sub ? '<p class="day__sub">' + esc(h.sub) + '</p>' : '') + intentionsList(day) + '</article>';
        }).join('');
        // pasek skrótów dni (Nd | Pn | … | Sb) – szybkie przejście do dnia, dzisiejszy wyróżniony
        var jumpBar = $('#day-jump');
        if (jumpBar) {
          jumpBar.innerHTML = data.dni.map(function (day) {
            var dd = parseDate(day.data);
            return '<li><a href="#d-' + day.data + '"' + (day.data === todayIso ? ' class="is-today" aria-current="date"' : '') + '>' +
              DNI_KR[dd.getDay()] + ' ' + dd.getDate() + '</a></li>';
          }).join('');
        }
        if (prev) { prev.disabled = pos === 0; prev.title = pos === 0 ? 'Brak wcześniejszych tygodni w archiwum' : ''; }
        if (next) next.disabled = pos === weeks.length - 1;
        if (now) now.hidden = isCur;
        var lab = $('#week-label'); if (lab) lab.textContent = isCur ? 'Bieżący tydzień' : (first(data) < first(current) ? 'Tydzień archiwalny' : 'Kolejny tydzień');
        var jump = $('#jump-today'); if (jump) jump.hidden = !document.getElementById('d-' + todayIso);
        setParam('tydzien', isCur ? null : first(data));
      }
      if (prev) prev.addEventListener('click', function () { if (pos > 0) { pos--; render(); } });
      if (next) next.addEventListener('click', function () { if (pos < weeks.length - 1) { pos++; render(); } });
      if (now) now.addEventListener('click', function () { pos = weeks.indexOf(current); render(); });
      render();
      var t = document.getElementById('d-' + todayIso);
      if (t && location.hash === '#dzis') t.scrollIntoView();
    }).catch(function () { fail(elWeekInt, 'intencje mszalne'); });
  }

  /* ---------- Kancelaria ---------- */
  var elOffice = $('#kancelaria-godziny'), elContact = $('#kancelaria-kontakt'), elAcc = $('#konto');
  if (elOffice || elContact || elAcc) {
    load('kancelaria').then(function (k) {
      var now = warsawNow(), wd = cap(DNI[now.getDay()]);
      // najbliższy dyżur wyliczony z godzin w kancelaria.json (bez zgadywania wyjątków – te opisują notki pod spodem)
      function officeStatus() {
        var nowMin = now.getHours() * 60 + now.getMinutes();
        for (var i = 0; i < 8; i++) {
          var d = addDays(now, i), name = cap(DNI[d.getDay()]);
          var g = k.godziny.filter(function (x) { return x.dzien === name; })[0];
          if (!g) continue;
          var m = g.godz.match(/(\d{1,2})[:.](\d{2})\D+(\d{1,2})[:.](\d{2})/);
          if (!m) continue;
          var start = +m[1] * 60 + +m[2], end = +m[3] * 60 + +m[4];
          if (i === 0 && nowMin >= start && nowMin < end) return { open: true, g: g };
          if (i > 0 || nowMin < start) return { open: false, g: g, today: i === 0, offset: i, d: d };
        }
        return null;
      }
      if (elOffice) {
        var st = officeStatus(), statusHtml = '';
        // Tylko komunikat „teraz czynna” – najbliższy dyżur widać w tabeli godzin poniżej
        if (st && st.open) {
          statusHtml = '<p class="office-status office-status--open"><b>Kancelaria jest teraz czynna</b><span>dziś do ' + esc(st.g.godz.split(/[–-]/).pop().trim()) + '</span></p>';
        }
        elOffice.innerHTML = (k.uwaga ? '<p class="alert">' + esc(k.uwaga) + '</p>' : '') + statusHtml +
          '<ul class="hours">' + k.godziny.map(function (g) {
            return '<li' + (g.dzien === wd ? ' class="is-today"' : '') + '><b>' + esc(g.dzien) + '</b><span>' + esc(g.godz) + '</span>' +
              (g.dopisek ? '<small>' + esc(g.dopisek) + '</small>' : '') + '</li>';
          }).join('') + '</ul>' +
          '<div class="office-notes">' + k.godzinyDodatkowe.map(function (s) { return '<p class="note">' + icon('info') + '<span>' + esc(s) + '</span></p>'; }).join('') + '</div>';
      }
      if (elContact) {
        var main = k.telefony[0], rest = k.telefony.slice(1);
        elContact.innerHTML = '<div class="contact-main"><small>' + esc(main.opis) + '</small>' +
          '<a class="contact-main__tel" href="' + telHref(main.numer) + '">' + icon('phone') + esc(main.numer) + '</a></div>' +
          '<ul class="contact-list">' + rest.map(function (t) {
            return '<li>' + icon('phone') + '<div><small>' + esc(t.opis) + '</small><a href="' + telHref(t.numer) + '">' + esc(t.numer) + '</a></div></li>';
          }).join('') + '<li>' + icon('mail') + '<div><small>E-mail</small><a href="mailto:' + esc(k.email) + '">' + esc(k.email) + '</a></div></li></ul>';
      }
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
  // f = „12.jpg” (folder img/<katalog>/ + miniatura w thumb/) albo pełna ścieżka „img/kokpit/zdjecie.jpg” (zdjęcie wgrane w kokpicie)
  function pic(katalog, f, thumb) {
    f = rel(f);
    var base = katalog ? 'img/' + katalog + '/' : null;
    if (base && f.indexOf(base) === 0) f = f.slice(base.length);          // „img/<katalog>/12.jpg” → „12.jpg”
    return f.indexOf('/') >= 0 ? f : base + (thumb ? 'thumb/' : '') + f;  // wgrane w kokpicie: pełna ścieżka, bez miniatury
  }
  var elGal = $('#galeria');
  if (elGal) {
    load('galeria').then(function (g) {
      // lista albumów jako kompaktowe karty; pojedynczy album: ?album=galeria-triduum-2026 (dawne #… też działa)
      var key = function (a) { return a.katalog ? a.katalog.replace(/\//g, '-') : slug(a.tytul); };
      var count = function (n) { return n + (n === 1 ? ' zdjęcie' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? ' zdjęcia' : ' zdjęć'); };
      var want = param('album') || (location.hash ? decodeURIComponent(location.hash.slice(1)) : '');
      var one = want && g.albumy.filter(function (a) { return key(a) === want; })[0];
      if (one) {
        var all = one.zdjecia.map(function (f, fi) { return { src: pic(one.katalog, f), cap: ((one.podpisy && one.podpisy[fi]) ? one.podpisy[fi] + ' – ' : '') + one.tytul + ' – zdjęcie ' + (fi + 1) + ' z ' + one.zdjecia.length + (one.foto ? ' (fot. ' + one.foto + ')' : '') }; });
        elGal.innerHTML = '<p><a class="news-back" href="galeria.html">← Wszystkie albumy</a></p>' +
          '<p class="news-photos__credit">Kliknij zdjęcie, aby je powiększyć. Strzałki lub przesunięcie palcem – kolejne zdjęcia.</p>' +
          '<section class="album" id="' + esc(key(one)) + '"><div class="album__head"><h2>' + esc(one.tytul) + '</h2><span class="badge">' + count(one.zdjecia.length) + '</span></div>' +
          (one.foto ? '<p class="news-photos__credit">fot. ' + esc(one.foto) + '</p>' : '') + '<div class="photos">' +
          one.zdjecia.map(function (f, fi) {
            return '<button type="button" class="photo" data-i="' + fi + '" aria-label="Powiększ: ' + esc(all[fi].cap) + '">' +
              '<img src="' + esc(pic(one.katalog, f, true)) + '" alt="" loading="lazy" decoding="async"></button>';
          }).join('') + '</div></section>';
        document.title = one.tytul + ' – Galeria – Parafia Trójcy Świętej we Wrocławiu';
        lightbox(all);
        window.scrollTo(0, 0);
        return;
      }
      elGal.innerHTML = '<div class="news-grid">' + g.albumy.map(function (a) {
        var href = 'galeria.html?album=' + key(a), cover = a.okladka || a.zdjecia[0];
        return '<article class="news-card album-card"><a class="news-card__media" href="' + esc(href) + '" tabindex="-1" aria-hidden="true">' +
          '<img src="' + esc(pic(a.katalog, cover, true)) + '" alt="" loading="lazy">' +
          '<span class="news-card__count">' + icon('image') + a.zdjecia.length + '</span></a>' +
          '<div class="news-card__body"><h3><a href="' + esc(href) + '">' + esc(a.tytul) + '</a></h3>' +
          '<p>' + count(a.zdjecia.length) + '</p><a class="news-card__more" href="' + esc(href) + '">Otwórz album →</a></div></article>';
      }).join('') + '</div>' + '<p class="news-more-years"><a class="btn btn--line" href="aktualnosci.html?rok=2025">Więcej fotorelacji z lat 2024–2026 znajdziesz w Aktualnościach →</a></p>';
    }).catch(function () { fail(elGal, 'galeria'); });
    window.addEventListener('hashchange', function () { location.reload(); });
  }
  // Powiększanie zdjęć na zwykłych podstronach: <div class="photos" data-lightbox> z przyciskami .photo[data-full][data-cap]
  // oraz pojedyncze obrazy z atrybutem data-zoom (np. zdjęcie z lotu ptaka w Historii)
  if (!$('#galeria') && !$('#aktualnosci')) {
    var lbItems = [];
    $$('img[data-zoom]').forEach(function (im) {
      var n = lbItems.length, cap = im.getAttribute('data-cap') || im.alt || '';
      lbItems.push({ src: im.getAttribute('data-zoom'), cap: cap });
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'photo photo--inline'; b.setAttribute('data-i', n); b.setAttribute('aria-label', 'Powiększ: ' + cap);
      im.parentNode.insertBefore(b, im); b.appendChild(im);
    });
    $$('[data-lightbox] .photo[data-full]').forEach(function (b) {
      var n = lbItems.length, cap = b.getAttribute('data-cap') || '';
      b.setAttribute('data-i', n); b.setAttribute('aria-label', 'Powiększ: ' + cap);
      lbItems.push({ src: b.getAttribute('data-full'), cap: cap });
    });
    if (lbItems.length) lightbox(lbItems);
  }
  // wersja angielska: przełącznik w górnym pasku prowadzi z powrotem do polskiej
  if (/\/en\.html$/.test(location.pathname)) {
    var langA = $('.topbar__lang');
    if (langA) { langA.href = 'index.html'; langA.lang = 'pl'; langA.hreflang = 'pl'; langA.innerHTML = 'PL<span class="topbar__lang-long"> · Polski</span>'; }
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
  function slug(s) {
    return String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]; })
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  // kokpit zapisuje ścieżki zdjęć od „/” (/img/…) – na stronie liczone od jej folderu (działa też w podfolderze)
  function rel(p) { return p && p.charAt(0) === '/' ? p.slice(1) : p; }
  function newsImage(w) {
    if (w.zdjecie) return rel(w.zdjecie);
    if (w.youtube) return 'https://i.ytimg.com/vi/' + encodeURIComponent(w.youtube) + '/hqdefault.jpg';
    return null;
  }
  // kompaktowa karta wpisu – ta sama na stronie głównej i na liście aktualności
  function newsHref(w) { return 'aktualnosci.html?wpis=' + slug(w.tytul); }
  function newsCard(w) {
    var img = newsImage(w), href = newsHref(w), n = (w.zdjecia || []).length;
    return '<article class="news-card">' +
      '<a class="news-card__media" href="' + esc(href) + '" tabindex="-1" aria-hidden="true">' +
      (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<div class="tile__ph"><img src="img/triquetra.svg" alt="" width="56" height="56"></div>') +
      (n ? '<span class="news-card__count">' + icon('image') + n + '</span>' : '') +
      (w.youtube ? '<span class="news-card__count">' + icon('play') + 'film</span>' : '') + '</a>' +
      '<div class="news-card__body"><time datetime="' + esc(w.data) + '">' + longDate(parseDate(w.data)) + ' r.</time>' +
      '<h3><a href="' + esc(href) + '">' + esc(w.tytul) + '</a></h3><p>' + esc(w.opis || w.tresc[0] || '') + '</p>' +
      '<a class="news-card__more" href="' + esc(href) + '">' + (n ? 'Relacja i zdjęcia →' : 'Czytaj więcej →') + '</a></div></article>';
  }
  // strona główna: maks. 3 wpisy z ostatnich 12 miesięcy; bez takich wpisów sekcja pozostaje ukryta
  var elNewsHome = $('#aktualnosci-home');
  if (elNewsHome) {
    load('aktualnosci').then(function (a) {
      var limit = addDays(warsawNow(), -365);
      var recent = a.wpisy.filter(function (w) { return w.data && parseDate(w.data) >= limit; })
        .sort(function (x, y) { return x.data < y.data ? 1 : -1; }).slice(0, 3);
      if (!recent.length) return;
      elNewsHome.innerHTML = recent.map(function (w) { return newsCard(w); }).join('');
      $('#aktualnosci-sekcja').hidden = false;
    }).catch(function () { /* sekcja opcjonalna */ });
  }
  var elNews = $('#aktualnosci');
  if (elNews) {
    load('aktualnosci').then(function (a) {
      // wpisy z ostatnich 12 miesięcy na górze, starsze w wyraźnie oddzielonym archiwum
      var limit = addDays(warsawNow(), -365);
      var isRecent = function (w) { return w.data && parseDate(w.data) >= limit; };
      var recent = a.wpisy.filter(isRecent), older = a.wpisy.filter(function (w) { return !isRecent(w); });
      var photos = [];
      var linkLabel = function (l) {
        if (/^https?:/.test(l)) return 'Więcej: ' + l.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + ' →';
        if (/^ogloszenia/.test(l)) return 'Zobacz ogłoszenia parafialne →';
        if (/^wspolnoty/.test(l)) return 'Zobacz na stronie Wspólnoty i grupy →';
        if (/^sakramenty/.test(l)) return 'Zobacz informacje o sakramentach →';
        return 'Zobacz więcej →';
      };
      var gallery = function (w) {
        if (!w.zdjecia || !w.zdjecia.length) return '';
        return '<div class="news-photos">' + w.zdjecia.map(function (f, fi) {
          var n = photos.length;
          photos.push({ src: pic(w.katalog, f), cap: w.tytul + ' – zdjęcie ' + (fi + 1) + ' z ' + w.zdjecia.length + (w.foto ? ' (fot. ' + w.foto + ')' : '') });
          return '<button type="button" class="photo" data-i="' + n + '" aria-label="Powiększ: ' + esc(photos[n].cap) + '">' +
            '<img src="' + esc(pic(w.katalog, f, true)) + '" alt="" loading="lazy" decoding="async"></button>';
        }).join('') + '</div>' + (w.foto ? '<p class="news-photos__credit">fot. ' + esc(w.foto) + '</p>' : '');
      };
      var card = function (w) {
        var g = gallery(w);
        return '<article class="card news-entry" id="' + slug(w.tytul) + '">' +
          (w.zdjecie && !g ? '<img class="news-entry__img" src="' + esc(rel(w.zdjecie)) + '" alt="" loading="lazy">' : '') +
          '<h2>' + esc(w.tytul) + '</h2>' +
          (w.data ? '<p class="day__sub"><time datetime="' + esc(w.data) + '">' + longDate(parseDate(w.data)) + ' r.</time></p>' : '') +
          w.tresc.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + g +
          (w.album ? '<p><a class="btn btn--line btn--sm" href="galeria.html#' + esc(w.album.replace(/\//g, '-')) + '">' + icon('image') + ' Zobacz całą galerię zdjęć →</a></p>' : '') +
          (w.link ? '<p><a href="' + esc(w.link) + '"' + (/^https?:/.test(w.link) ? ' rel="noopener" target="_blank"' : '') + '>' + esc(linkLabel(w.link)) + '</a></p>' : '') +
          (w.youtube ? '<div class="video"><button type="button" class="video__facade" data-yt="' + esc(w.youtube) + '"' +
            ' style="background-image:url(\'https://i.ytimg.com/vi/' + encodeURIComponent(w.youtube) + '/hqdefault.jpg\')"' +
            ' aria-label="Odtwórz film: ' + esc(w.tytul) + ' (YouTube)">' +
            '<span>' + icon('play') + ' Odtwórz film</span></button></div>' : '') + '</article>';
      };
      // pojedynczy wpis: ?wpis=slug (dawne linki #slug też działają)
      var want = param('wpis') || (location.hash ? decodeURIComponent(location.hash.slice(1)) : '');
      var one = want && a.wpisy.filter(function (w) { return slug(w.tytul) === want; })[0];
      if (one) {
        var others = a.wpisy.filter(function (w) { return w !== one && isRecent(w); }).slice(0, 3);
        elNews.innerHTML = '<div class="news-single">' +
          '<p><a class="news-back" href="aktualnosci.html">← Wszystkie aktualności</a></p>' + card(one) + '</div>' +
          (others.length ? '<h2 class="news-others__title">Inne wydarzenia</h2><div class="news-grid">' + others.map(newsCard).join('') + '</div>' : '');
        document.title = one.tytul + ' – Aktualności – Parafia Trójcy Świętej we Wrocławiu';
        var h1 = $('.page-hero h1'); if (h1) h1.textContent = 'Aktualności';
        if (photos.length) lightbox(photos);
        window.scrollTo(0, 0);
        return;
      }
      // lista według lat kalendarzowych: zakładki lat u góry, domyślnie najnowszy rok (?rok=2025 lub ?rok=wszystkie)
      var all = a.wpisy.slice().sort(function (x, y) { return (x.data || '') < (y.data || '') ? 1 : -1; });
      var years = [];
      all.forEach(function (w) { var y = (w.data || '').slice(0, 4); if (y && years.indexOf(y) < 0) years.push(y); });
      var byYear = function (y) { return all.filter(function (w) { return (w.data || '').slice(0, 4) === y; }); };
      function show(sel) {
        var tabs = '<ul class="toc news-years" aria-label="Wybierz rok">' + years.concat(['wszystkie']).map(function (y) {
          return '<li><a href="?rok=' + y + '"' + (y === sel ? ' aria-current="page" class="is-active"' : '') + ' data-rok="' + y + '">' + (y === 'wszystkie' ? 'Wszystkie' : y) + ' <small>' + (y === 'wszystkie' ? all.length : byYear(y).length) + '</small></a></li>';
        }).join('') + '</ul>';
        var body = sel === 'wszystkie'
          ? years.map(function (y) { return '<h2 class="news-year">' + y + '</h2><div class="news-grid">' + byYear(y).map(newsCard).join('') + '</div>'; }).join('')
          : '<div class="news-grid">' + byYear(sel).map(newsCard).join('') + '</div>';
        var idx = years.indexOf(sel), older = idx >= 0 && idx < years.length - 1 ? years[idx + 1] : null;
        elNews.innerHTML = tabs + body + (older ? '<p class="news-more-years"><a class="btn btn--line" href="?rok=' + older + '" data-rok="' + older + '">Pokaż starsze wpisy (' + older + ') →</a></p>' : '');
      }
      var startYear = param('rok') && (years.indexOf(param('rok')) >= 0 || param('rok') === 'wszystkie') ? param('rok') : years[0];
      show(startYear);
      elNews.addEventListener('click', function (e) {
        var t = e.target.closest('[data-rok]');
        if (!t) return;
        e.preventDefault();
        var y = t.getAttribute('data-rok');
        setParam('rok', y === years[0] ? null : y);
        show(y);
        elNews.scrollIntoView({ block: 'start' });
      });
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

  /* ---------- Kolęda (content/koleda.json): strona z planem + pasek na stronie głównej ---------- */
  var elKol = $('#koleda'), elKolPasek = $('#koleda-pasek');
  if (elKol || elKolPasek) {
    loadOptional('koleda', { dni: [] }).then(function (k) {
      var dni = (k.dni || []).filter(function (d) { return d.data; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      var dzis = isoDate(warsawNow());
      function etykieta(d) { var x = parseDate(d.data); return cap(DNI[x.getDay()]) + ', ' + x.getDate() + ' ' + MIES[x.getMonth()]; }
      var norm = function (s) { return String(s).toLowerCase().replace(/^(ul\.|al\.|pl\.|os\.)\s*/, '').replace(/[ąćęłńóśźż]/g, function (c) { return 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]; }); };
      if (elKolPasek && dni.length) {
        var pierwszy = parseDate(dni[0].data), ostatni = dni[dni.length - 1].data, t = warsawNow();
        if (t >= addDays(pierwszy, -21) && dzis <= ostatni) {
          var dzisiaj = dni.filter(function (d) { return d.data === dzis; })[0];
          elKolPasek.innerHTML = '<div class="koleda-pasek"><div class="wrap"><p><b>' + esc(k.tytul || 'Kolęda') + '</b>' +
            (dzisiaj ? 'Dziś odwiedzamy: ' + esc(dzisiaj.ulice.join(', ')) : 'Sprawdź, kiedy ksiądz odwiedzi Twoją ulicę.') + '</p>' +
            '<a class="btn btn--gold btn--sm" href="koleda.html">Plan kolędy →</a></div></div>';
          elKolPasek.hidden = false;
        }
      }
      if (!elKol) return;
      $$('[data-koleda-tytul]').forEach(function (e) { e.textContent = k.tytul || 'Kolęda'; });
      var html = (k.wstep ? '<p class="lead koleda-intro">' + esc(k.wstep) + '</p>' : '');
      if (!dni.length) {
        elKol.innerHTML = html + '<p class="note"><span>Plan kolędy opublikujemy wkrótce – będzie też w ogłoszeniach parafialnych.</span></p>';
        return;
      }
      html += '<div class="koleda-search"><label for="koleda-q">Kiedy kolęda na mojej ulicy?</label>' +
        '<input id="koleda-q" type="search" autocomplete="off" placeholder="Wpisz nazwę ulicy, np. Krzycka"><p class="koleda-search__wynik" id="koleda-wynik" aria-live="polite"></p></div>';
      html += '<ol class="koleda-dni">' + dni.map(function (d, i) {
        var cls = d.data === dzis ? ' is-dzis' : (d.data < dzis ? ' is-minione' : '');
        return '<li class="koleda-dzien' + cls + '" data-i="' + i + '"><div class="koleda-dzien__data">' + esc(etykieta(d)) +
          '<small>' + (d.data === dzis ? 'DZIŚ · ' : '') + esc(d.godz || '') + (d.ksiadz ? ' · ' + esc(d.ksiadz) : '') + '</small></div>' +
          '<ul>' + (d.ulice || []).map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') + '</ul>' +
          (d.uwaga ? '<p class="koleda-dzien__uwaga">' + esc(d.uwaga) + '</p>' : '') + '</li>';
      }).join('') + '</ol>';
      if (k.uwagi && k.uwagi.length) html += '<ul class="checklist" style="margin-top:22px">' + k.uwagi.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') + '</ul>';
      elKol.innerHTML = html;
      var q = $('#koleda-q'), wynik = $('#koleda-wynik');
      q.addEventListener('input', function () {
        var v = norm(q.value.trim());
        $$('.koleda-dzien').forEach(function (li) { li.classList.remove('is-traf'); });
        if (v.length < 3) { wynik.textContent = ''; return; }
        var traf = [];
        dni.forEach(function (d, i) { (d.ulice || []).forEach(function (u) { if (norm(u).indexOf(v) === 0 || norm(u).indexOf(' ' + v) >= 0) traf.push({ d: d, i: i, u: u }); }); });
        if (!traf.length) { wynik.innerHTML = 'Nie znaleziono tej ulicy w planie kolędy. W razie wątpliwości zadzwoń do kancelarii.'; return; }
        wynik.innerHTML = traf.map(function (x) { return '<b>' + esc(x.u) + '</b> – ' + esc(etykieta(x.d)) + (x.d.godz ? ', ' + esc(x.d.godz) : ''); }).join('<br>');
        traf.forEach(function (x) { var li = $('.koleda-dzien[data-i="' + x.i + '"]'); if (li) li.classList.add('is-traf'); });
        var first = $('.koleda-dzien[data-i="' + traf[0].i + '"]'); if (first && traf.length === 1) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    });
  }

  /* ---------- Baner strony głównej: zdjęcie na wielkie święta (content/baner.json) ---------- */
  // napis i cytat w banerze zostają – zmienia się tylko zdjęcie w tle; podgląd: ?swieto=1, 2, …
  var heroBg = $('.hero__bg');
  if (heroBg) {
    loadOptional('baner', { okresy: [] }).then(function (cfg) {
      var okresy = cfg.okresy || [], today = warsawNow(), y = today.getFullYear();
      var t = new Date(y, today.getMonth(), today.getDate());
      function md(s, year) { var p = String(s || '').split('-'); return p.length === 2 ? new Date(year, +p[0] - 1, +p[1]) : null; }
      function active(o) {
        if (o.rodzaj === 'adwent') {
          // dni = przesunięcie względem I niedzieli Adwentu (niedziela 27.11–3.12; -7 = Chrystusa Króla)
          for (var ay = y - 1; ay <= y; ay++) {
            var xmas = new Date(ay, 11, 25), adv = addDays(xmas, -((xmas.getDay() + 6) % 7 + 1) - 21);
            var ab = addDays(adv, +o.dni || 0);
            if (t >= addDays(ab, -(+o.przed || 0)) && t <= addDays(ab, +o.po || 0)) return true;
          }
          return false;
        }
        if (o.rodzaj === 'wielkanoc' || o.rodzaj === 'trojca') {
          for (var yy = y - 1; yy <= y; yy++) {
            // dni = przesunięcie względem Niedzieli Zmartwychwstania (np. 56 = Trójca Święta, 60 = Boże Ciało)
            var base = addDays(easter(yy), o.rodzaj === 'trojca' ? 56 : (+o.dni || 0));
            if (t >= addDays(base, -(+o.przed || 0)) && t <= addDays(base, +o.po || 0)) return true;
          }
          return false;
        }
        var od = md(o.od, y), dd = md(o.do, y);
        if (!od || !dd) return false;
        return od <= dd ? (t >= od && t <= dd) : (t >= od || t <= dd);   // okres przez Nowy Rok
      }
      var forced = parseInt(param('swieto'), 10), o = null;
      if (forced > 0) o = okresy[forced - 1];
      else o = okresy.filter(function (x) { return x.zdjecie && active(x); })[0];
      if (!o || !o.zdjecie) return;
      heroBg.style.setProperty('background-image', 'url("' + rel(o.zdjecie) + '")');
      heroBg.style.setProperty('background-position', o.pozycja || '50% 40%');
      if (o.opis) heroBg.setAttribute('aria-label', o.opis);
      heroBg.classList.add('hero__bg--swieto');
    });
  }

  /* ---------- Wspólnoty: logo w kartach obok siebie na tej samej wysokości ---------- */
  // tytuły mają różną długość, więc logo (za tytułem) zaczynają się na różnej wysokości;
  // w każdym rzędzie kart przesuwamy wyżej stojące logo do poziomu najniższego
  function alignGroupArt() {
    $$('.grid--2').forEach(function (grid) {
      var arts = [].slice.call(grid.querySelectorAll('.group .group__art'));
      arts.forEach(function (a) { a.style.marginTop = ''; });
      var rows = {};
      arts.forEach(function (a) {
        var card = a.closest('.group'), key = Math.round(card.getBoundingClientRect().top + window.scrollY);
        (rows[key] = rows[key] || []).push({ a: a, off: a.getBoundingClientRect().top - card.getBoundingClientRect().top });
      });
      Object.keys(rows).forEach(function (k) {
        var r = rows[k];
        if (r.length < 2) return;
        var max = Math.max.apply(null, r.map(function (x) { return x.off; }));
        r.forEach(function (x) {
          var d = max - x.off;
          if (d > 1) x.a.style.marginTop = (parseFloat(getComputedStyle(x.a).marginTop) + d) + 'px';
        });
      });
    });
  }
  if ($('.group__art')) {
    var alignTimer;
    window.addEventListener('load', alignGroupArt);
    window.addEventListener('resize', function () { clearTimeout(alignTimer); alignTimer = setTimeout(alignGroupArt, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignGroupArt);
    alignGroupArt();
  }
})();
