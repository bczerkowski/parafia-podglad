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
  function isHoliday(d, cfg) {
    if (!cfg.wakacje) return false;
    var md = pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    return md >= cfg.wakacje.od && md <= cfg.wakacje.do;
  }
  /* Aktualny czas w Polsce (Europe/Warsaw) – niezależnie od strefy ustawionej w urządzeniu.
     Zwracamy „lokalną” datę z polskimi wartościami, żeby dalsze obliczenia były proste. */
  function warsawNow() {
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
    var list = (ex && ex.msze) ? ex.msze : (sunday ? cfg.niedziele : cfg.powszednie).filter(function (m) { return !(hol && m.bezWakacji); });
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
  window.ParafiaKalendarz = { massesFor: massesFor, nextMass: nextMass, warsawNow: warsawNow, isFeast: isFeast, relDay: function (n) { return relDay(n); } };
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
      var now = warsawNow(), today = massesFor(now, cfg), next = nextMass(cfg, now);
      var nextToday = next && next.offset === 0 && !today.exception ? next : null;
      if (elSun) elSun.innerHTML = renderTimes(cfg.niedziele, cfg, today.sunday, nextToday) +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaNiedziele) + '</span></p>';
      if (elWeek) elWeek.innerHTML = renderTimes(cfg.powszednie, cfg, !today.sunday, nextToday) +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaPowszednie) + '</span></p>' +
        '<p class="note">' + icon('info') + '<span>' + esc(cfg.uwagaSwieta) + '</span></p>';
      if (elConf) elConf.innerHTML = '<ul class="checklist">' + cfg.spowiedz.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
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
    if (sameDay(d, trinitySunday(d.getFullYear()))) out.push({ t: 'Odpust parafialny – Uroczystość Najświętszej Trójcy', h: 'porządek niedzielny', feast: true });
    if (dow === 3) out.push({ t: 'Nabożeństwo do NMP Nieustającej Pomocy', h: 'po Mszy św. o 18:30' });
    if (dom === 13 && m >= 4 && m <= 9) out.push({ t: 'Nabożeństwo fatimskie', h: sun ? 'godz. 17:00' : 'po Mszy św. o 18:30' });
    if (dom === 22) out.push({ t: 'Nabożeństwo do św. Rity z poświęceniem róż', h: sun ? 'po Mszy św. o 18:00' : 'po Mszy św. o 18:30' });
    if (dom <= 7 && dow === 4) out.push({ t: 'I czwartek, piątek i sobota miesiąca – adoracja Najświętszego Sakramentu i spowiedź', h: '17:00–19:00 (cz–sb)' });
    if (dom <= 7 && sun) out.push({ t: 'Żywy Różaniec – spotkanie i zmiana tajemnic', h: 'godz. 17:00' });
    if (lent && dow === 5) out.push({ t: 'Droga Krzyżowa', h: '17:00 (dzieci), 18:00, 19:30 (młodzież)' });
    if (lent && sun) out.push({ t: 'Gorzkie Żale', h: 'godz. 17:00' });
    return out;
  }
  // nabożeństwa codzienne w danym okresie: pokazywane jako jedna pozycja („trwa” albo „od …”)
  function seasonsAround(today, horizon) {
    var y = today.getFullYear(), list = [];
    var adv = adventStart(y);
    list.push({ od: addDays(adv, 1), do: new Date(y, 11, 24), t: 'Roraty (Adwent)', h: 'pn–sb o 6:30 i 18:30 (z udziałem dzieci)' });
    list.push({ od: new Date(y, 4, 1), do: new Date(y, 4, 31), t: 'Nabożeństwa majowe', h: 'dni powszednie 18:00, niedziele 17:00' });
    list.push({ od: new Date(y, 5, 1), do: new Date(y, 5, 30), t: 'Nabożeństwa czerwcowe', h: 'dni powszednie 18:00, niedziele 17:00' });
    list.push({ od: new Date(y, 9, 1), do: new Date(y, 9, 31), t: 'Różaniec październikowy', h: 'dorośli: dni powszednie 18:00, niedziele 17:00; dzieci: pn–śr 17:00' });
    var t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return list.filter(function (s) { return s.do >= t0 && s.od <= horizon; }).map(function (s) {
      return { d: s.od < t0 ? t0 : s.od, ongoing: s.od <= t0, t: s.t, h: s.h, od: s.od, season: true };
    });
  }
  var elUp = $('#najblizsze');
  if (elUp) {
    try {
      var now0 = warsawNow(), t0 = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate());
      var horizon = addDays(t0, 13), items = [];
      for (var i = 0; i < 14; i++) {
        var dd = addDays(t0, i);
        devotionsOn(dd).forEach(function (x) { items.push({ d: dd, t: x.t, h: x.h, feast: x.feast }); });
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
          return '<li' + (x.feast ? ' class="is-feast"' : '') + '><span class="upcoming__date">' + esc(label(x)) + '</span>' +
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
  window.ParafiaKalendarz && (window.ParafiaKalendarz.liturgyToday = liturgyToday, window.ParafiaKalendarz.seasonDayName = seasonDayName);
  var elLit = $('#liturgia-dnia');
  if (elLit) {
    loadOptional('ogloszenia', null).then(function (ann) {
      var txt = null;
      try { txt = liturgyToday(warsawNow(), ann); } catch (err) { txt = null; }
      if (txt) { $('.liturgy__text', elLit).textContent = txt; elLit.hidden = false; }
    });
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
      if (q.length < 2) { res.textContent = ''; res.className = 'street-search__result'; return; }
      var match = function (qq) { return streets.filter(function (s) { return s.key.indexOf(qq) === 0 || s.key.split(' ').some(function (w) { return w.indexOf(qq) === 0; }); }); };
      var hits = match(q);
      // pełna nazwa z imieniem (np. „Wojciecha Korfantego”) – dopasuj po ostatnim słowie, czyli nazwisku/nazwie
      if (!hits.length && q.indexOf(' ') > 0) { var last = q.split(' ').pop(); if (last.length >= 3) hits = match(last); }
      hits.forEach(function (s) { s.el.classList.add('is-match'); });
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
        (p.lista ? '<ul>' + p.lista.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (p.dopisek ? '<p class="dopisek">' + esc(p.dopisek) + '</p>' : '') + '</li>';
    }).join('');
  }
  var elAnn = $('#ogloszenia');
  if (elAnn) {
    Promise.all([load('ogloszenia'), loadOptional('ogloszenia-archiwum', { tygodnie: [] })]).then(function (res) {
      var current = res[0];
      var weeks = [current].concat((res[1].tygodnie || []).filter(function (w) { return w.data !== current.data; }))
        .sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      var sel = $('#ann-week'), note = $('#ann-archive-note');
      function render(o) {
        var d = parseDate(o.data);
        $$('[data-ann-title]').forEach(function (el) { el.textContent = o.tytul; });
        $$('[data-ann-date]').forEach(function (el) { el.textContent = longDate(d) + ' r.'; el.setAttribute('datetime', o.data); });
        elAnn.innerHTML = '<ol>' + annItems(o) + '</ol>';
        if (note) {
          note.hidden = o === current;
          if (o !== current) note.innerHTML = icon('info') + '<span>To ogłoszenia archiwalne z dnia ' + esc(longDate(d)) + ' r. <a href="ogloszenia.html">Wróć do bieżących ogłoszeń</a></span>';
        }
      }
      var chosen = weeks.filter(function (w) { return w.data === param('tydzien'); })[0] || current;
      render(chosen);
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
  var elTabs = $('#intencje-tabs');
  if (elTabs) {
    load('intencje').then(function (data) {
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
    Promise.all([load('intencje'), loadOptional('intencje-archiwum', { tygodnie: [] })]).then(function (res) {
      var current = res[0], todayIso = isoDate(warsawNow());
      var first = function (w) { return w.dni[0].data; };
      // tygodnie od najstarszego do najnowszego
      var weeks = [current].concat((res[1].tygodnie || []).filter(function (w) { return first(w) !== first(current); }))
        .sort(function (a, b) { return first(a) < first(b) ? -1 : 1; });
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
        if (st) {
          statusHtml = st.open
            ? '<p class="office-status office-status--open"><b>Kancelaria jest teraz czynna</b><span>dziś do ' + esc(st.g.godz.split(/[–-]/).pop().trim()) + '</span></p>'
            : '<p class="office-status"><b>' + (st.today ? 'Dziś dyżur: ' : 'Najbliższy dyżur: ') + esc(st.today ? st.g.godz : (st.offset === 1 ? 'jutro' : st.g.dzien.toLowerCase())) + '</b>' +
              '<span>' + (st.today ? 'kancelaria będzie czynna w tych godzinach' : esc(st.g.godz)) + '</span></p>';
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
  function slug(s) {
    return String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]; })
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function newsImage(w) {
    if (w.zdjecie) return w.zdjecie;
    if (w.youtube) return 'https://i.ytimg.com/vi/' + encodeURIComponent(w.youtube) + '/hqdefault.jpg';
    return null;
  }
  // strona główna: maks. 3 wpisy z ostatnich 12 miesięcy; bez takich wpisów sekcja pozostaje ukryta
  var elNewsHome = $('#aktualnosci-home');
  if (elNewsHome) {
    load('aktualnosci').then(function (a) {
      var limit = addDays(warsawNow(), -365);
      var recent = a.wpisy.filter(function (w) { return w.data && parseDate(w.data) >= limit; })
        .sort(function (x, y) { return x.data < y.data ? 1 : -1; }).slice(0, 3);
      if (!recent.length) return;
      elNewsHome.innerHTML = recent.map(function (w) {
        var img = newsImage(w), href = w.link || ('aktualnosci.html#' + slug(w.tytul));
        return '<article class="news-card">' +
          (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<div class="tile__ph"><img src="img/triquetra.svg" alt="" width="56" height="56"></div>') +
          '<div class="news-card__body"><time datetime="' + esc(w.data) + '">' + longDate(parseDate(w.data)) + ' r.</time>' +
          '<h3>' + esc(w.tytul) + '</h3><p>' + esc(w.opis || w.tresc[0] || '') + '</p>' +
          '<a href="' + esc(href) + '"' + (/^https?:/.test(href) ? ' rel="noopener" target="_blank"' : '') + '>Pełna relacja →</a></div></article>';
      }).join('');
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
      var card = function (w) {
        return '<article class="card news-entry" id="' + slug(w.tytul) + '">' +
          (w.zdjecie ? '<img class="news-entry__img" src="' + esc(w.zdjecie) + '" alt="" loading="lazy">' : '') +
          '<h2>' + esc(w.tytul) + '</h2>' +
          (w.data ? '<p class="day__sub"><time datetime="' + esc(w.data) + '">' + longDate(parseDate(w.data)) + ' r.</time></p>' : '') +
          w.tresc.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
          (w.link ? '<p><a href="' + esc(w.link) + '"' + (/^https?:/.test(w.link) ? ' rel="noopener" target="_blank"' : '') + '>' + (/^https?:/.test(w.link) ? 'Pełna relacja →' : 'Zobacz ogłoszenia parafialne →') + '</a></p>' : '') +
          (w.youtube ? '<div class="video"><button type="button" class="video__facade" data-yt="' + esc(w.youtube) + '"' +
            ' style="background-image:url(\'https://i.ytimg.com/vi/' + encodeURIComponent(w.youtube) + '/hqdefault.jpg\')"' +
            ' aria-label="Odtwórz film: ' + esc(w.tytul) + ' (YouTube)">' +
            '<span>' + icon('play') + ' Odtwórz film</span></button></div>' : '') + '</article>';
      };
      elNews.innerHTML = (recent.length ? recent.map(card).join('') : '<p class="note">Brak nowych wpisów – bieżące informacje znajdziesz w <a href="ogloszenia.html">ogłoszeniach parafialnych</a>.</p>') +
        (older.length ? '<h2 class="news-archive__title">Archiwum</h2><div class="grid news-archive">' + older.map(card).join('') + '</div>' : '');
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
