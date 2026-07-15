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
    // scroll a inicio del contenido (debajo de tabs sticky)
    var card = document.querySelector('.card');
    if (card) { card.scrollTop = 0; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showPanel(t.dataset.tab); });
  });

  // Soporte hash en URL: #info, #policies, #map, #tour, #contact
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

})();
