/* Kokpit parafii – dodatki do Decap CMS:
   1) pole „Wklej…” w ogłoszeniach i intencjach (rozpoznawanie tekstu – js/parser.js, to samo co w edytorze),
   2) przy publikacji: zastosowanie wklejonego tekstu i przeniesienie poprzedniego tygodnia do archiwum,
   3) porządkowanie danych (puste pola nie trafiają do plików). */
(function () {
  'use strict';
  var CMS = window.CMS, h = window.h, createClass = window.createClass, P = window.ParafiaParser, Imm = window.Immutable;
  if (!CMS || !P || !Imm) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px;font:16px sans-serif">Nie udało się wczytać kokpitu – odśwież stronę (Ctrl+F5). Jeśli to nie pomoże, sprawdź, czy w folderze admin/vendor są pliki bibliotek.</p>'); return; }

  // stan pliku w chwili otwarcia (do rozpoznania, że wpisano nowy tydzień)
  var original = {};
  function keyOf(entry) { return entry.get('collection') + '/' + entry.get('slug'); }
  function remember(entry) { if (entry && entry.get('data')) original[keyOf(entry)] = entry.get('data').toJS(); }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function longDate(isoStr) { var d = P.parseIso(isoStr); return d.getDate() + ' ' + P.MIES[d.getMonth()] + ' ' + d.getFullYear(); }

  // ---------- rozpoznanie wklejonego tekstu ----------
  function parse(mode, text) {
    if (!text || !text.trim()) return null;
    if (mode === 'intencje') {
      var r = P.parseIntentions(text);
      return { intencje: r.data, warnings: r.warnings };
    }
    var a = P.parseAnnouncements(text);
    var w = a.warnings.slice();
    if (!a.date) w.unshift('Nie rozpoznano daty niedzieli – po publikacji sprawdź pole „Data niedzieli”.');
    if (!a.title) w.unshift('Nie rozpoznano tytułu niedzieli – po publikacji sprawdź pole „Tytuł niedzieli”.');
    return { ogloszenia: { tytul: a.title, data: a.date ? P.iso(a.date) : '', punkty: normPoints(a.punkty) }, warnings: w };
  }
  function normPoints(list) {
    return (list || []).map(function (p) {
      if (typeof p === 'string') return { tekst: p };
      var o = { tekst: p.tekst || '' };
      if (p.lista && p.lista.length) o.lista = p.lista.filter(Boolean);
      if (p.dopisek) o.dopisek = p.dopisek;
      return o;
    }).filter(function (p) { return p.tekst || p.lista; });
  }
  function normDays(dni) {
    return (dni || []).map(function (d) {
      var o = { data: d.data, nazwa: d.nazwa || '', msze: (d.msze || []).map(function (m) {
        var x = { godz: m.godz };
        if (m.naglowek) x.naglowek = m.naglowek;
        x.intencje = (m.intencje || []).filter(Boolean);
        return x;
      }) };
      return o;
    });
  }

  function previewHtml(mode, res) {
    if (!res) return '';
    var warn = res.warnings.length ? '<div class="kp-warn"><b>Sprawdź:</b><ul>' + res.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>' : '';
    if (mode === 'intencje') {
      var t = res.intencje;
      return warn + '<p class="kp-ok">Rozpoznano: <b>' + esc(t.tydzien || '?') + '</b> – ' + t.dni.length + ' dni, ' +
        t.dni.reduce(function (n, d) { return n + d.msze.length; }, 0) + ' Mszy.</p>' +
        t.dni.map(function (d) {
          var dt = P.parseIso(d.data);
          return '<div class="kp-day"><b>' + esc(P.DNI[dt.getDay()] + ', ' + dt.getDate() + ' ' + P.MIES[dt.getMonth()]) + '</b>' + (d.nazwa ? ' <i>' + esc(d.nazwa) + '</i>' : '') +
            d.msze.map(function (m) {
              return '<div class="kp-mass"><span>' + esc(m.godz) + '</span><div>' + (m.naglowek ? '<b>' + esc(m.naglowek) + '</b>' : '') +
                '<ul>' + m.intencje.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>';
            }).join('') + '</div>';
        }).join('');
    }
    var o = res.ogloszenia;
    return warn + '<p class="kp-ok">Rozpoznano: <b>' + esc(o.tytul || '(bez tytułu)') + '</b> · ' + esc(o.data ? longDate(o.data) : '(bez daty)') + ' – ' + o.punkty.length + ' punktów.</p>' +
      '<ol class="kp-ann">' + o.punkty.map(function (p) {
        return '<li>' + esc(p.tekst) + (p.lista ? '<ul>' + p.lista.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (p.dopisek ? '<p><i>' + esc(p.dopisek) + '</i></p>' : '') + '</li>';
      }).join('') + '</ol>';
  }

  // ---------- pole „Wklej…” ----------
  var PasteControl = createClass({
    getInitialState: function () { return { res: parse(this.mode(), this.props.value) }; },
    mode: function () { return this.props.field.get('tryb') || 'ogloszenia'; },
    componentDidMount: function () { if (!original[keyOf(this.props.entry)]) remember(this.props.entry); },
    onInput: function (e) {
      var v = e.target.value;
      this.props.onChange(v);
      this.setState({ res: parse(this.mode(), v) });
    },
    clear: function () { this.props.onChange(''); this.setState({ res: null }); },
    render: function () {
      var mode = this.mode(), res = this.state.res, self = this;
      var what = mode === 'intencje' ? 'intencje na cały tydzień' : 'ogłoszenia (razem z tytułem i datą niedzieli)';
      return h('div', { className: 'kp-paste ' + (this.props.classNameWrapper || '') },
        h('p', { className: 'kp-help' },
          'Skopiuj ' + what + ' z Worda, maila lub Facebooka i wklej poniżej. Kokpit sam rozpozna układ – sprawdź podgląd i kliknij „Opublikuj” u góry. ',
          'Poprzedni tydzień trafi wtedy sam do archiwum. Pojedyncze poprawki rób w polach niżej – wtedy to pole zostaw puste.'),
        h('textarea', { id: this.props.forID, value: this.props.value || '', onChange: this.onInput, rows: res ? 6 : 8,
          placeholder: mode === 'intencje' ? 'Niedziela – 29.11.2026\n7:00\n+ Jan Kowalski…' : 'I Niedziela Adwentu – 29.11.2026\n1. Dzisiaj…\n2. …' }),
        res ? h('div', null,
          h('div', { className: 'kp-preview', dangerouslySetInnerHTML: { __html: previewHtml(mode, res) } }),
          h('p', { className: 'kp-next' }, h('b', null, 'Jeśli wszystko się zgadza – kliknij „Opublikuj” u góry. '), 'Tekst zastąpi pola poniżej.',
            ' ', h('button', { type: 'button', className: 'kp-clear', onClick: function () { self.clear(); } }, 'Wyczyść'))) : null
      );
    }
  });
  CMS.registerWidget('wklej', PasteControl);

  // przeskok z jednego formularza wprost do innego (przyciski wstecz/dalej przeglądarki) – Decap potrafi wtedy
  // pomylić pola; pełne przeładowanie pokazuje właściwy formularz
  window.addEventListener('hashchange', function (e) {
    if (/\/entries\//.test(e.oldURL) && /\/entries\//.test(e.newURL)) location.reload();
  });

  // ---------- edytor wizualny sekcji strony (wygląd jak na stronie) ----------
  var SITE_CSS = new URL('css/style.css', document.baseURI).href;
  var EDITOR_CSS = 'html,body{background:#fff}body{margin:0;padding:6px 4px;min-height:60px}body:focus{outline:none}' +
    // pola uzupełniane automatycznie przez stronę – w edytorze tylko opis
    '[id]:empty::before{content:"(uzupełnia się samo na stronie)";color:#8a8a8a;font-style:italic;font-size:14px}' +
    '.reveal,.fade-in{opacity:1!important;transform:none!important}';
  var VisualControl = createClass({
    getInitialState: function () { return { code: false }; },
    componentDidMount: function () { this.setupFrame(); },
    componentWillUnmount: function () { if (this.ro) this.ro.disconnect(); clearTimeout(this.t); },
    componentDidUpdate: function () {
      // zmiana z zewnątrz (np. inny wpis) – wczytaj na nowo
      if (!this.state.code && this.doc && (this.props.value || '') !== this.lastEmitted) this.load(this.props.value || '');
    },
    setupFrame: function () {
      var self = this, f = this.frame;
      if (!f) return;
      f.srcdoc = '<!doctype html><html lang="pl"><head><meta charset="utf-8"><base href="' + document.baseURI + '"><link rel="stylesheet" href="' + SITE_CSS + '"><style>' + EDITOR_CSS + '</style></head><body contenteditable="true"></body></html>';
      f.onload = function () {
        self.doc = f.contentDocument;
        self.doc.execCommand('defaultParagraphSeparator', false, 'p');
        self.load(self.props.value || '');
        self.doc.body.addEventListener('input', function () { self.emitSoon(); });
        // wklejanie: tylko czysty tekst (bez stylów z Worda / stron www)
        self.doc.body.addEventListener('paste', function (e) {
          var t = (e.clipboardData || window.clipboardData).getData('text/plain');
          if (!t) return;
          e.preventDefault();
          var parts = t.replace(/\r/g, '').split(/\n{2,}/);
          if (parts.length > 1) self.doc.execCommand('insertHTML', false, parts.map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join(''));
          else self.doc.execCommand('insertText', false, t);
        });
        self.ro = new ResizeObserver(function () { self.fit(); });
        self.ro.observe(self.doc.documentElement);
        self.fit();
      };
    },
    fit: function () { if (this.doc && this.frame) this.frame.style.height = Math.max(this.doc.documentElement.scrollHeight, 80) + 'px'; },
    load: function (html) {
      this.doc.body.innerHTML = html;
      // zwinięte „Czytaj więcej” – w edytorze rozwinięte, żeby dało się poprawić ich treść
      Array.prototype.forEach.call(this.doc.querySelectorAll('details:not([open])'), function (d) { d.setAttribute('open', ''); d.setAttribute('data-kp-zwiniete', ''); });
      this.lastEmitted = html;
      this.fit();
    },
    serialize: function () {
      var c = this.doc.body.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('[data-kp-zwiniete]'), function (d) { d.removeAttribute('open'); d.removeAttribute('data-kp-zwiniete'); });
      return c.innerHTML;
    },
    emitSoon: function () {
      var self = this;
      clearTimeout(this.t);
      this.t = setTimeout(function () { self.lastEmitted = self.serialize(); self.props.onChange(self.lastEmitted); self.fit(); }, 250);
    },
    cmd: function (name, arg) {
      if (!this.doc) return;
      this.frame.contentWindow.focus();
      if (name === 'createLink') {
        arg = window.prompt('Adres linku (np. https://… albo kancelaria.html, mailto:…, tel:…):', 'https://');
        if (!arg) return;
      }
      this.doc.execCommand(name, false, arg);
      this.emitSoon();
    },
    toggleCode: function () {
      if (this.state.code) { this.setState({ code: false }, this.setupFrame); }
      else { if (this.doc) { this.lastEmitted = this.serialize(); this.props.onChange(this.lastEmitted); } this.setState({ code: true }); }
    },
    render: function () {
      var self = this;
      function btn(label, title, fn) { return h('button', { type: 'button', className: 'kp-tb', title: title, onMouseDown: function (e) { e.preventDefault(); fn(); } }, label); }
      return h('div', { className: 'kp-visual ' + (this.props.classNameWrapper || '') },
        h('div', { className: 'kp-toolbar' },
          this.state.code ? null : [
            btn(h('b', null, 'B'), 'Pogrubienie', function () { self.cmd('bold'); }),
            btn(h('i', null, 'I'), 'Kursywa', function () { self.cmd('italic'); }),
            btn('Nagłówek', 'Zamień akapit na śródtytuł', function () { self.cmd('formatBlock', 'h3'); }),
            btn('Akapit', 'Zwykły tekst', function () { self.cmd('formatBlock', 'p'); }),
            btn('• Lista', 'Lista punktowana', function () { self.cmd('insertUnorderedList'); }),
            btn('Link', 'Wstaw link do zaznaczonego tekstu', function () { self.cmd('createLink'); }),
            btn('Usuń link', 'Usuń link', function () { self.cmd('unlink'); }),
            btn('↶ Cofnij', 'Cofnij', function () { self.cmd('undo'); })
          ],
          btn(this.state.code ? 'Edytor wizualny' : 'Kod HTML', 'Dla zaawansowanych: kod HTML sekcji', function () { self.toggleCode(); })),
        this.state.code
          ? h('textarea', { className: 'kp-code', value: this.props.value || '', onChange: function (e) { self.lastEmitted = e.target.value; self.props.onChange(e.target.value); } })
          : h('iframe', { className: 'kp-frame', title: 'Edytor treści', ref: function (el) { self.frame = el; } })
      );
    }
  });
  CMS.registerWidget('wizualny', VisualControl);

  // ---------- przy publikacji ----------
  function annKey(w) { return w && w.data; }
  function intKey(w) { return w && w.dni && w.dni[0] && w.dni[0].data; }

  function withArchive(d, before, keyFn, pick) {
    var arch = (d.archiwum || []).slice();
    var curKey = keyFn(d), oldKey = keyFn(before);
    // poprzedni bieżący tydzień → archiwum (gdy wpisano inny tydzień)
    if (before && oldKey && oldKey !== curKey) arch.unshift(pick(before));
    var seen = {};
    arch = arch.filter(function (w) { var k = keyFn(w); if (!k || k === curKey || seen[k]) return false; seen[k] = 1; return true; });
    arch.sort(function (a, b) { return keyFn(a) < keyFn(b) ? 1 : -1; });
    d.archiwum = arch;
    return d;
  }

  function prepareAnn(d, before) {
    var res = parse('ogloszenia', d.wklej);
    if (res) {
      d.punkty = res.ogloszenia.punkty;
      if (res.ogloszenia.tytul) d.tytul = res.ogloszenia.tytul;
      if (res.ogloszenia.data) d.data = res.ogloszenia.data;
    }
    delete d.wklej;
    d.punkty = normPoints(d.punkty);
    (d.archiwum || []).forEach(function (w) { w.punkty = normPoints(w.punkty); });
    return withArchive(d, before, annKey, function (b) { return { tytul: b.tytul, data: b.data, punkty: normPoints(b.punkty) }; });
  }

  function prepareInt(d, before) {
    var res = parse('intencje', d.wklej);
    if (res && res.intencje.dni.length) {
      d.tydzien = res.intencje.tydzien;
      d.dni = res.intencje.dni;
    }
    delete d.wklej;
    d.dni = normDays(d.dni);
    (d.archiwum || []).forEach(function (w) { w.dni = normDays(w.dni); });
    return withArchive(d, before, intKey, function (b) { return { tydzien: b.tydzien, dni: normDays(b.dni) }; });
  }

  // usuwa puste pola opcjonalne (np. "dopisek": "", "lista": []), żeby pliki pozostały czytelne
  function prune(v) {
    if (Array.isArray(v)) return v.map(prune);
    if (v && typeof v === 'object') {
      Object.keys(v).forEach(function (k) {
        var x = prune(v[k]);
        if (x === '' || x === null || x === undefined || (Array.isArray(x) && !x.length && /^(lista|tresc|zdjecia|podpisy|godzinyDodatkowe|archiwum)$/.test(k))) delete v[k];
        else v[k] = x;
      });
    }
    return v;
  }

  CMS.registerEventListener({
    name: 'preSave',
    handler: function (ev) {
      var entry = ev.entry, k = keyOf(entry), d = entry.get('data').toJS(), before = original[k];
      if (k === 'tydzien/ogloszenia') d = prepareAnn(d, before);
      else if (k === 'tydzien/intencje') d = prepareInt(d, before);
      return Imm.fromJS(prune(d));
    }
  });
  CMS.registerEventListener({
    name: 'postSave',
    handler: function (ev) {
      remember(ev.entry);
      // formularz pokazuje wtedy dokładnie to, co zapisano (po rozpoznaniu wklejonego tekstu)
      var k = keyOf(ev.entry);
      if (k === 'tydzien/ogloszenia' || k === 'tydzien/intencje') setTimeout(function () { location.reload(); }, 600);
    }
  });
})();
