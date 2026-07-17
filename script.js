(function () {
  'use strict';

  // ===== Tabs navegación =====
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));

  function showPanel(name) {
    panels.forEach(function (p) {
      var match = p.id === 'panel-' + name;
      p.hidden = !match;
      if (match) { p.classList.add('is-active'); }
      else { p.classList.remove('is-active'); }
    });
    tabs.forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === name);
    });
    var card = document.querySelector('.card');
    if (card) { card.scrollTop = 0; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showPanel(t.dataset.tab); });
  });

  function tabFromHash() {
    var h = (location.hash || '').replace('#', '');
    return (['info', 'policies', 'map', 'tour', 'contact'].indexOf(h) !== -1) ? h : 'info';
  }
  if (location.hash) { showPanel(tabFromHash()); }
  window.addEventListener('hashchange', function () { showPanel(tabFromHash()); });

  // ===== Idioma ES/EN =====
  var langBtn = document.getElementById('langToggle');
  var currentLang = localStorage.getItem('hsn-lang') || 'es';

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('hsn-lang', lang);
    document.documentElement.lang = lang;
    if (langBtn) {
      langBtn.classList.remove('is-es', 'is-en');
      langBtn.classList.add('is-' + lang);
      langBtn.setAttribute('aria-label', lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish');
    }
    document.querySelectorAll('[data-es][data-en]').forEach(function (el) {
      var txt = el.getAttribute('data-' + lang);
      if (txt !== null) { el.textContent = txt; }
    });
  }

  langBtn.addEventListener('click', function () {
    applyLang(currentLang === 'es' ? 'en' : 'es');
  });
  applyLang(currentLang);

  // ===== Cargar contenido desde API =====
  async function loadContent() {
    try {
      var res = await fetch('api/content.php', { cache: 'no-store' });
      var data = await res.json();
      if (!data.ok) return; // fallback al HTML estático
      injectSettings(data.settings);
      injectPolicies(data.policies);
      injectLocation(data.location);
      injectTours(data.tours);
    } catch (e) {
      // silencioso: usamos el HTML estático como fallback
    }
  }

  function injectSettings(s) {
    if (!s) return;
    Object.keys(s).forEach(function (key) {
      var val = s[key];
      if (!val) return;
      var els = document.querySelectorAll('[data-key="' + key + '"]');
      els.forEach(function (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = val[currentLang] || val.es || '';
        } else if (el.tagName === 'A') {
          var url = val[currentLang] || val.es || '';
          if (url) el.href = url;
        } else {
          el.setAttribute('data-es', val.es || '');
          el.setAttribute('data-en', val.en || '');
          // Forzar actualización de texto siempre (no solo si coincide)
          el.textContent = val[currentLang] || val.es || '';
        }
      });
    });
    applyLang(currentLang);
  }

  function injectPolicies(policies) {
    if (!policies || !policies.length) return;
    var list = document.getElementById('policiesList');
    if (!list) return;
    list.innerHTML = policies.map(function (p) {
      return '<li>' +
        '<span class="policies__icon">' + esc(p.icon) + '</span>' +
        '<div>' +
        '<strong data-es="' + esc(p.title_es) + '" data-en="' + esc(p.title_en) + '">' + esc(p.title_es) + '</strong>' +
        '<span data-es="' + esc(p.text_es) + '" data-en="' + esc(p.text_en) + '">' + esc(p.text_es) + '</span>' +
        '</div>' +
        '</li>';
    }).join('');
    applyLang(currentLang);
  }

  function injectLocation(location) {
    if (!location || !location.length) return;
    var quote = document.querySelector('.block--quote .list');
    if (!quote) return;
    quote.innerHTML = location.map(function (p) {
      return '<li>' +
        '<strong data-es="' + esc(p.title_es) + '" data-en="' + esc(p.title_en) + '">' + esc(p.title_es) + '</strong> ' +
        '<span data-es="' + esc(p.text_es) + '" data-en="' + esc(p.text_en) + '">' + esc(p.text_es) + '</span>' +
        '</li>';
    }).join('');
    applyLang(currentLang);
  }

  function injectTours(tours) {
    if (!tours || !tours.length) return;
    var panel = document.getElementById('panel-tour');
    if (!panel) return;
    panel.innerHTML = tours.map(function (t, i) {
      var tags = [];
      try { tags = JSON.parse(t.tags_json || '[]'); } catch (e) {}
      var tagsHtml = tags.map(function (tag) {
        return '<li>' +
          esc(tag.icon || '') + ' <span data-es="' + esc(tag.text_es || '') + '" data-en="' + esc(tag.text_en || '') + '">' + esc(tag.text_es || '') + '</span></li>';
      }).join('');
      var te = t.title_es || '';
      var ten = t.title_en || '';
      return '<h2 class="panel__title" data-es="' + esc(te) + '" data-en="' + esc(ten) + '">' + esc(te) + '</h2>' +
        '<article class="tour">' +
        (t.image ? '<div class="tour__hero"><img src="' + esc(t.image) + '" alt="" class="tour__img" /></div>' : '') +
        (tagsHtml ? '<ul class="tour__tags">' + tagsHtml + '</ul>' : '') +
        (t.description_es ? '<p data-es="' + esc(t.description_es) + '" data-en="' + esc(t.description_en || '') + '">' + esc(t.description_es) + '</p>' : '') +
        (t.reception_es ? '<p data-es="' + esc(t.reception_es) + '" data-en="' + esc(t.reception_en || '') + '">' + esc(t.reception_es) + '</p>' : '') +
        '</article>' +
        (t.info_url ? '<a class="btn btn--block btn--info" href="' + esc(t.info_url) + '" target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3 3 3 0 0 0 .6 1.8L5 10.5a3 3 0 0 0-1-.2 3 3 0 1 0 3 3l5-4.5 5 4.5a3 3 0 1 0 3-3 3 3 0 0 0-1 .2l-4.6-3.7A3 3 0 0 0 15 5a3 3 0 0 0-3-3zm0 14a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 3 0v-3A1.5 1.5 0 0 0 12 16z"/></svg>' +
          '<span data-es="' + esc(t.info_label_es || 'Más información') + '" data-en="' + esc(t.info_label_en || 'More information') + '">' + esc(t.info_label_es || 'Más información') + '</span></a>' : '') +
        (t.whatsapp_url ? '<a class="btn btn--block btn--whatsapp" href="' + esc(t.whatsapp_url) + '" target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23z"/></svg>' +
          '<span data-es="' + esc(t.whatsapp_label_es || 'Consultar por WhatsApp') + '" data-en="' + esc(t.whatsapp_label_en || 'Ask by WhatsApp') + '">' + esc(t.whatsapp_label_es || 'Consultar por WhatsApp') + '</span></a>' : '');
    }).join('');
    applyLang(currentLang);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  // ===== Copiar contraseña WiFi =====
  var copyBtn = document.getElementById('wifiCopy');
  var pwd = document.getElementById('wifiPwd');
  var toast = document.getElementById('toast');

  function showToast(msg) {
    if (toast.hidden === false) { return; }
    if (msg) { toast.textContent = msg; }
    toast.hidden = false;
    setTimeout(function () { toast.hidden = true; }, 1800);
  }

  if (copyBtn && pwd) {
    copyBtn.addEventListener('click', function () {
      var text = pwd.textContent.trim();
      var done = function () { showToast(currentLang === 'es' ? 'Contraseña copiada ✓' : 'Password copied ✓'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }

  // Iniciar carga de contenido
  loadContent();

})();