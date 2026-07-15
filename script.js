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
      var res = await fetch('/api/content.php', { cache: 'no-store' });
      var data = await res.json();
      if (!data.ok) return; // fallback al HTML estático
      injectSettings(data.settings);
      injectPolicies(data.policies);
      injectLocation(data.location);
    } catch (e) {
      // silencioso: usamos el HTML estático como fallback
    }
  }

  function injectSettings(s) {
    if (!s) return;
    // Textos simples (data-key en elemento con data-es/data-en)
    Object.keys(s).forEach(function (key) {
      var val = s[key];
      if (!val) return;
      var els = document.querySelectorAll('[data-key="' + key + '"]');
      els.forEach(function (el) {
        // Si es un input/textarea, actualizar value
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = val[currentLang] || val.es || '';
        } else {
          // Actualizar data-es/data-en y el textContent visible si coincide con idioma actual
          el.setAttribute('data-es', val.es || '');
          el.setAttribute('data-en', val.en || '');
          if (el.textContent.trim() === (el.getAttribute('data-' + currentLang) || '').trim()) {
            // solo si parece que no ha sido editado por el usuario
            el.textContent = val[currentLang] || val.es || '';
          }
        }
        // Enlaces: si es <a>, actualizar href
        if (el.tagName === 'A') {
          var url = val[currentLang] || val.es || '';
          if (url) el.href = url;
        }
      });
    });
    // Forzar re-aplicar idioma actual para que se vean los cambios
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

  function esc(s) {
    return String(s == null ? ' : s)
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