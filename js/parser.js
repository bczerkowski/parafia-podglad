/* Rozpoznawanie wklejonych intencji i ogłoszeń (wspólne dla kokpitu /admin i edytora /edytor). */
(function () {
  'use strict';
  var DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  var MIES_KR = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  var DAY_RE = /^(niedziela|niedz\.?|poniedziałek|poniedz\.?|pon\.?|wtorek|wt\.?|środa|śr\.?|czwartek|czw\.?|piątek|pt\.?|sobota|sob\.?)(?![\p{L}])/iu;
  var TIME_RE = /^(\d{1,2})[:.](\d{2})(?!\d)\s*[-–]?\s*(.*)$/;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  // ---------- porządkowanie tekstu ----------
  function clean(s) {
    s = String(s).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
    s = s.replace(/(^|[\s,(])(\+{1,3})(?=[^\s+])/g, '$1$2 ');      // „++z” → „++ z”
    s = s.replace(/(\p{L})\.(?=\p{Lu})/gu, '$1. ');                   // „R.Zubrzyckich” → „R. Zubrzyckich”
    s = s.replace(/(\p{L}):(?=\p{L})/gu, '$1: ');                     // „ADS:Za” → „ADS: Za”
    s = s.replace(/\s+,/g, ',').replace(/,(?=\p{L})/gu, ', ');        // przecinki
    s = s.replace(/\s+[-–—]\s*|(\p{L})\s*[–—]\s+/gu, function (m, l) { return (l || '') + ' – '; }); // myślniki
    return s.replace(/\s{2,}/g, ' ').trim();
  }
  function fixSplitMonths(s) {
    MIES.forEach(function (m) { s = s.replace(new RegExp(m.split('').join('\\s*'), 'giu'), m); });
    return s;
  }
  function findDate(s, yearHint) {
    var m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?\s*(\d{4})/.exec(s);
    if (m) return { date: new Date(+m[3], m[2] - 1, +m[1]), match: m[0] };
    var re = new RegExp('(\\d{1,2})\\s+(' + MIES.join('|') + ')(?:\\s+(\\d{4}))?', 'iu');
    m = re.exec(s);
    if (m) {
      var mi = MIES.indexOf(m[2].toLowerCase());
      return { date: new Date(m[3] ? +m[3] : (yearHint || new Date().getFullYear()), mi, +m[1]), match: m[0] };
    }
    return null;
  }
  function isHeader(line) {
    if (TIME_RE.test(line)) return false;
    if (DAY_RE.test(line)) return true;
    var d = findDate(line);
    return !!(d && /\d{4}/.test(d.match));
  }

  // ---------- INTENCJE ----------
  function parseIntentions(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.replace(/ /g, ' ').trim(); }).filter(function (l) { return l && l !== '&nbsp;'; });
    var days = [], day = null, mass = null, warnings = [], headerParts = null, pre = [];
    function closeHeader() {
      if (!headerParts) return;
      var raw = fixSplitMonths(headerParts.join(' ').replace(/\s+/g, ' '));
      day.raw = raw;
      headerParts = null;
    }
    lines.forEach(function (line) {
      // wewnątrz listy intencji data (np. „zm. 12.03.2020”) nie zaczyna nowego dnia – tylko nazwa dnia albo niedziela/uroczystość
      if (isHeader(line) && (!mass || DAY_RE.test(line) || /niedziel|uroczysto|święto/iu.test(line))) {
        if (day) closeHeader();
        day = { raw: '', msze: [] }; days.push(day); mass = null; headerParts = [line];
        return;
      }
      var t = TIME_RE.exec(line);
      if (t && day) {
        closeHeader();
        mass = { godz: (+t[1]) + ':' + t[2], intencje: [] };
        day.msze.push(mass);
        if (t[3]) addLine(t[3]);
        return;
      }
      if (!day) { pre.push(line); return; }
      if (headerParts) { headerParts.push(line); return; }
      if (!mass) { day.raw += ' ' + line; return; }
      addLine(line);
    });
    if (day) closeHeader();
    function addLine(line) {
      var num = /^(\d{1,2})\s*[.)]\s*(?=\D)/.exec(line);
      if (num) { mass.numbered = true; mass.intencje.push(clean(line.slice(num[0].length))); return; }
      if (/:\s*$/.test(line) && !mass.intencje.length && !mass.naglowek) { mass.naglowek = clean(line); return; }
      var last = mass.intencje.length - 1;
      if (last >= 0 && (/^[-–—,;]/.test(line) || /^\p{Ll}/u.test(line))) {
        mass.intencje[last] = clean(mass.intencje[last] + ' ' + line);
        return;
      }
      mass.intencje.push(clean(line));
    }
    if (pre.length) warnings.push('Pominięto tekst przed pierwszym dniem: „' + pre.join(' ').slice(0, 80) + '…”');

    // daty i nazwy dni
    var yearHint = null;
    days.forEach(function (d) { var f = findDate(d.raw); if (f && /\d{4}/.test(f.match)) yearHint = yearHint || f.date.getFullYear(); });
    var prev = null;
    days.forEach(function (d, i) {
      var f = findDate(d.raw, yearHint), wd = DAY_RE.exec(d.raw);
      if (f) d.date = f.date;
      else if (prev) d.date = addDays(prev, 1);
      var name = d.raw;
      if (f) name = name.replace(f.match, ' ');
      if (wd) name = name.replace(DAY_RE, ' ');
      name = name.replace(/^[\s,–—-]+|[\s,–—-]+$/g, '').replace(/\s*[–—-]\s*[–—-]\s*/g, ' – ');
      d.nazwa = clean(name);
      if (!d.date) warnings.push('Nie rozpoznano daty dnia: „' + d.raw + '”.');
      else {
        if (wd) {
          var w = wd[1].toLowerCase().replace('.', '');
          var expected = DNI[d.date.getDay()];
          if (expected.indexOf(w.slice(0, 2)) !== 0) warnings.push('Nazwa dnia „' + wd[1] + '” nie pasuje do daty ' + d.date.toLocaleDateString('pl-PL') + ' (to ' + expected + ').');
        }
        if (prev && iso(addDays(prev, 1)) !== iso(d.date)) warnings.push('Daty nie idą po kolei: po ' + prev.toLocaleDateString('pl-PL') + ' jest ' + d.date.toLocaleDateString('pl-PL') + '.');
        prev = d.date;
      }
      if (!d.msze.length) warnings.push('Dzień „' + d.raw + '” nie ma żadnej Mszy (godziny).');
      d.msze.forEach(function (m) { if (!m.intencje.length) warnings.push(dayLabel(d) + ', ' + m.godz + ' – brak intencji.'); });
    });
    if (days.length && days.length !== 7) warnings.push('Rozpoznano ' + days.length + ' dni (zwykle jest 7).');

    var out = {
      tydzien: days.length && days[0].date && days[days.length - 1].date ? weekLabel(days[0].date, days[days.length - 1].date) : '',
      dni: days.filter(function (d) { return d.date; }).map(function (d) {
        return { data: iso(d.date), nazwa: d.nazwa, msze: d.msze.map(function (m) {
          var o = { godz: m.godz };
          if (m.naglowek) o.naglowek = m.naglowek;
          o.intencje = m.intencje;
          return o;
        }) };
      })
    };
    return { data: out, warnings: warnings };
  }
  function dayLabel(d) { return d.date ? d.date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }) : d.raw; }
  function weekLabel(a, b) {
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return a.getDate() + '–' + b.getDate() + ' ' + MIES[b.getMonth()] + ' ' + b.getFullYear();
    if (a.getFullYear() === b.getFullYear()) return a.getDate() + ' ' + MIES[a.getMonth()] + ' – ' + b.getDate() + ' ' + MIES[b.getMonth()] + ' ' + b.getFullYear();
    return a.getDate() + ' ' + MIES[a.getMonth()] + ' ' + a.getFullYear() + ' – ' + b.getDate() + ' ' + MIES[b.getMonth()] + ' ' + b.getFullYear();
  }

  // ---------- OGŁOSZENIA ----------
  var LIST_RE = /^([-–—•*·▪●○]|\(?[a-z]\))\s*/;
  var DAYITEM_RE = /^(w?\s*)?(niedziela|niedz\.|poniedziałek|poniedz\.|pon\.|wtorek|wt\.|środa|śr\.|czwartek|czw\.|piątek|pt\.|sobota|sob\.)\s*(\d{1,2}\.\d{1,2}\.?)?\s*[–—-]/iu;
  function parseAnnouncements(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.replace(/ /g, ' ').trim(); });
    var warnings = [], head = [], points = [], cur = null, numbered = lines.some(function (l) { return /^\d{1,2}\s*[.)]\s+\S/.test(l); });
    var blankBefore = false;
    lines.forEach(function (line) {
      if (!line) { blankBefore = true; return; }
      var num = /^(\d{1,2})\s*[.)]\s*(?=\S)/.exec(line);
      var startsPoint = numbered ? !!num : (blankBefore || !cur);
      blankBefore = false;
      if (numbered && !cur && !num) { head.push(line); return; }
      if (startsPoint) {
        cur = { tekst: clean(num ? line.slice(num[0].length) : line) };
        points.push(cur);
        return;
      }
      var li = LIST_RE.exec(line);
      if (li || DAYITEM_RE.test(line)) {
        cur.lista = cur.lista || [];
        cur.lista.push(clean(li ? line.slice(li[0].length) : line));
        return;
      }
      if (cur.lista) { cur.dopisek = clean((cur.dopisek ? cur.dopisek + ' ' : '') + line); return; }
      cur.tekst = clean(cur.tekst + ' ' + line);
    });
    if (!numbered && points.length) { head = [points[0].tekst]; points.shift(); if (head[0].length > 120) { points.unshift({ tekst: head[0] }); head = []; } }
    var headText = head.join(' '), title = '', date = null;
    if (headText) {
      var f = findDate(headText);
      if (f) date = f.date;
      title = clean(headText.replace(f ? f.match : '', ' ').replace(/(^|\s)r\.(?=\s|$)/g, ' ').replace(/ogłoszenia(\s+parafialne)?/iu, ' ').replace(/^[\s,:–—-]+|[\s,:–—-]+$/g, '').replace(/\s*[–—-]\s*[–—-]\s*/g, ' – '));
    }
    var out = points.map(function (p) { return (p.lista || p.dopisek) ? p : p.tekst; });
    if (!out.length) warnings.push('Nie rozpoznano żadnego punktu ogłoszeń.');
    return { punkty: out, title: title, date: date, warnings: warnings };
  }

  window.ParafiaParser = { DNI: DNI, MIES: MIES, pad: pad, iso: iso, parseIso: parseIso, addDays: addDays, clean: clean, findDate: findDate,
    dayLabel: dayLabel, weekLabel: weekLabel, parseIntentions: parseIntentions, parseAnnouncements: parseAnnouncements };
})();
