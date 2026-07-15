(function () {
  'use strict';

  var CSRF = window.HSN_CSRF || '';
  var state = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&').replace(/</g, '<')
      .replace(/>/g, '>').replace(/"/g, '"');
  }
  function hex(s) { return s == null ? '' : String(s); }
  function val(el) { return el ? el.value : ''; }

  function toast(msg, kind) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (kind === 'err' ? ' is-err' : kind === 'ok' ? ' is-ok' : '');
    t.hidden = false;
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.hidden = true; }, 2600);
  }

  async function api(action, data) {
    var body = JSON.stringify({ type: action, data: data || null });
    var res = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
      body: body, credentials: 'same-origin',
    });
    return res.json();
  }

  // ============== LOGIN ==============
  var loginForm = $('#loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var err = $('#loginErr');
      err.hidden = true;
      var data = { username: val(loginForm.username), password: val(loginForm.password) };
      try {
        var r = await api('login', data);
        if (r.ok) location.reload();
        else { err.textContent = r.error || 'Error'; err.hidden = false; }
      } catch (ex) {
        err.textContent = 'Error de red'; err.hidden = false;
      }
    });
    return; // resto solo aplica al panel
  }

  // ============== PANEL: cargas y tabs ==============
  async function loadState() {
    try {
      var res = await fetch('api.php', { credentials: 'same-origin' });
      var data = await res.json();
      if (!data.ok) { location.reload(); return; }
      CSRF = data.csrf || CSRF;
      state = data;
      renderTexts(); renderPolicies(); renderLocation(); renderLinks();
      $all('.loading').forEach(function (l) { l.parentNode.removeChild(l); });
    } catch (e) {
      $all('.loading').forEach(function (l) { l.textContent = 'Error al cargar. Recarga la página.'; });
    }
  }

  function setSetting(id, es, en) {
    if (!state.settings) state.settings = {};
    state.settings[id] = { es: es, en: en };
  }

  // ---------- Render: TEXTOS ----------
  var TEXT_GROUPS = [
    { title: 'Encabezado', hint: 'Texto de bienvenida en la parte superior.', fields: [
      ['header_title',     'Bienvenida (primera línea)', false],
      ['header_hotel_name','Nombre del hotel', false],
      ['header_subtitle',  'Subtítulo (ubicación)', false],
      ['header_intro',      'Frase introductoria', true],
    ]},
    { title: 'Desayuno', hint: 'Bloque de horario de desayuno.', fields: [
      ['block_breakfast_title', 'Título', false],
      ['block_breakfast_text',   'Texto', true],
    ]},
    { title: 'Check-out', hint: 'Bloque de horario de salida.', fields: [
      ['block_checkout_title', 'Título', false],
      ['block_checkout_text',   'Texto', true],
    ]},
    { title: 'Recepción', hint: 'Bloque de horario de recepción.', fields: [
      ['block_reception_title', 'Título', false],
      ['block_reception_text',   'Texto', true],
    ]},
    { title: 'Wi-Fi', hint: 'Red y contraseña del Wi-Fi. La contraseña es la que copian los huéspedes.', fields: [
      ['wifi_title',          'Título del bloque', false],
      ['wifi_password_label', 'Etiqueta "Contraseña:"', false],
      ['wifi_password',       'Contraseña Wi-Fi (¡importante!)', false],
      ['wifi_hint',            'Pista del QR por piso', true],
    ]},
    { title: 'Panel Tour', hint: 'Descripción del tour a la Sierra Nevada.', fields: [
      ['tour_title',    'Título del panel', false],
      ['tour_desc',      'Descripción larga', true],
      ['tour_reception', 'Nota sobre recepción', true],
      ['tour_tag_1', 'Etiqueta 1', false],
      ['tour_tag_2', 'Etiqueta 2', false],
      ['tour_tag_3', 'Etiqueta 3', false],
      ['tour_tag_4', 'Etiqueta 4', false],
    ]},
    { title: 'Tour · botones', hint: 'Texto de los botones del tour.', fields: [
      ['tour_info_label',     'Botón "Más información"', false],
      ['tour_whatsapp_label', 'Botón "Consultar WhatsApp"', false],
    ]},
    { title: 'Panel Contacto · tarjeta', hint: 'Datos de la tarjeta de presentación.', fields: [
      ['contact_title',         'Título del panel', false],
      ['contact_card_name',    'Nombre del hotel', false],
      ['contact_card_tagline', 'Eslogan corto', false],
      ['contact_card_addr',    'Dirección (puede usar <br> para saltos de línea)', true],
    ]},
    { title: 'Paneles · títulos y pestañas', hint: 'Nombres internos de las pestañas y títulos de paneles.', fields: [
      ['policies_title', 'Título panel Políticas', false],
      ['policies_lead',   'Intro de Políticas', true],
      ['policies_thanks', 'Frase de agradecimiento', false],
      ['map_title',       'Título panel Ubicación', false],
      ['map_address',     'Dirección textual', false],
      ['map_directions_btn', 'Botón "Cómo llegar"', false],
      ['tab_info',     'Pestaña Info', false],
      ['tab_policies', 'Pestaña Políticas', false],
      ['tab_map',      'Pestaña Ubicación', false],
      ['tab_tour',      'Pestaña Tour', false],
      ['tab_contact',  'Pestaña Contacto', false],
    ]},
    { title: 'Footer / eslogan', hint: 'Eslogan y ubicación al pie de la tarjeta.', fields: [
      ['footer_slogan', 'Eslogan final', true],
      ['footer_loc',     'Línea de ubicación', false],
    ]},
  ];

  function renderTexts() {
    var host = $('#panel-texts');
    var html = '';
    TEXT_GROUPS.forEach(function (g) {
      html += '<div class="group"><h2 class="group__title">' + esc(g.title) + '</h2>' +
              '<p class="group__hint">' + esc(g.hint) + '</p>';
      g.fields.forEach(function (f) {
        var id = f[0], label = f[1], long = f[2];
        var v = state.settings[id] || { es: '', en: '' };
        html += '<div class="field"><span>' + esc(label) + '</span>' +
                '<div class="field--two">' +
                  '<div><label class="field__flag">🇪🇸 Español</label>' +
                    (long ? '<textarea data-set="' + id + '" data-lang="es">' + esc(v.es) + '</textarea>'
                          : '<input type="text" data-set="' + id + '" data-lang="es" value="' + esc(v.es) + '">') +
                  '</div><div><label class="field__flag">🇬🇧 Inglés</label>' +
                    (long ? '<textarea data-set="' + id + '" data-lang="en">' + esc(v.en) + '</textarea>'
                          : '<input type="text" data-set="' + id + '" data-lang="en" value="' + esc(v.en) + '">') +
                  '</div></div></div>';
      });
      html += '</div>';
    });
    html += '<button class="btn btn--save" id="saveTexts" type="button">Guardar textos</button>';
    host.innerHTML = html;
  }

  // ---------- Render: POLÍTICAS ----------
  function renderPolicies() {
    var host = $('#panel-policies');
    var html = '<div class="group"><h2 class="group__title">Políticas del hotel</h2>' +
               '<p class="group__hint">Cada política aparece como una tarjeta. Usa ↑ ↓ para reordenar. El ícono es un emoji (🐾, 🚭, 🌿…).</p>' +
               '<ul id="polList" class="items">';
    (state.policies || []).forEach(function (p, i) {
      html += policyRow(p, i);
    });
    html += '</ul><button class="items__add" id="polAdd" type="button">+ Añadir política</button></div>' +
            '<button class="btn btn--save" id="savePolicies" type="button">Guardar políticas</button>';
    host.innerHTML = html;
  }
  function policyRow(p, i) {
    return '<li data-i="' + i + '"><div class="items__head">' +
      '<input class="icon-input" data-pol="icon" value="' + esc(p.icon) + '" maxlength="4" aria-label="Icono">' +
      '<div class="items__reorder">' +
        '<button type="button" data-up title="Subir"><svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg></button>' +
        '<button type="button" data-down title="Bajar"><svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>' +
      '</div></div>' +
      '<div class="field--two"><div><label class="field__flag">🇪🇸 Título</label>' +
        '<input type="text" data-pol="title_es" value="' + esc(p.title_es) + '"></div>' +
      '<div><label class="field__flag">🇬🇧 Título</label>' +
        '<input type="text" data-pol="title_en" value="' + esc(p.title_en) + '"></div></div>' +
      '<div class="field--two" style="margin-top:10px"><div><label class="field__flag">🇪🇸 Texto</label>' +
        '<textarea data-pol="text_es">' + esc(p.text_es) + '</textarea></div>' +
      '<div><label class="field__flag">🇬🇧 Texto</label>' +
        '<textarea data-pol="text_en">' + esc(p.text_en) + '</textarea></div></div>' +
      '<button class="items__del" data-del type="button">Eliminar</button></li>';
  }

  // ---------- Render: UBICACIÓN ----------
  function renderLocation() {
    var host = $('#panel-location');
    var html = '<div class="group"><h2 class="group__title">Ubicación privilegiada</h2>' +
               '<p class="group__hint">Lista que aparece en la pestaña "Info" (supermercados, playas, etc.).</p>';
    [['location_intro_title', 'Título del bloque', false],
     ['location_intro_text',  'Párrafo introductorio', true]
    ].forEach(function (f) {
      var id = f[0], long = f[2]; var v = state.settings[id] || { es: '', en: '' };
      html += '<div class="field"><span>' + esc(f[1]) + '</span><div class="field--two">' +
        '<div><label class="field__flag">🇪🇸</label>' + (long
          ? '<textarea data-set="' + id + '" data-lang="es">' + esc(v.es) + '</textarea>'
          : '<input type="text" data-set="' + id + '" data-lang="es" value="' + esc(v.es) + '">') + '</div>' +
        '<div><label class="field__flag">🇬🇧</label>' + (long
          ? '<textarea data-set="' + id + '" data-lang="en">' + esc(v.en) + '</textarea>'
          : '<input type="text" data-set="' + id + '" data-lang="en" value="' + esc(v.en) + '">') + '</div></div></div>';
    });
    html += '<ul id="locList" class="items">';
    (state.location || []).forEach(function (p, i) { html += locRow(p, i); });
    html += '</ul><button class="items__add" id="locAdd" type="button">+ Añadir elemento</button></div>' +
            '<button class="btn btn--save" id="saveLocation" type="button">Guardar ubicación</button>';
    host.innerHTML = html;
  }
  function locRow(p, i) {
    return '<li data-i="' + i + '"><div class="items__head"><div class="items__reorder" style="margin-left:0">' +
      '<button type="button" data-up><svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg></button>' +
      '<button type="button" data-down><svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>' +
      '</div></div>' +
      '<div class="field--two"><div><label class="field__flag">🇪🇸 Título</label>' +
        '<input type="text" data-loc="title_es" value="' + esc(p.title_es) + '"></div>' +
      '<div><label class="field__flag">🇬🇧 Título</label>' +
        '<input type="text" data-loc="title_en" value="' + esc(p.title_en) + '"></div></div>' +
      '<div class="field--two" style="margin-top:10px"><div><label class="field__flag">🇪🇸 Texto</label>' +
        '<textarea data-loc="text_es">' + esc(p.text_es) + '</textarea></div>' +
      '<div><label class="field__flag">🇬🇧 Texto</label>' +
        '<textarea data-loc="text_en">' + esc(p.text_en) + '</textarea></div></div>' +
      '<button class="items__del" data-del type="button">Eliminar</button></li>';
  }

  // ---------- Render: ENLACES ----------
  function renderLinks() {
    var host = $('#panel-links');
    var g = function (id, label, help) {
      var v = state.settings[id] || { es: '', en: '' };
      if (id === 'contact_phone_url' || id === 'contact_email_url') {
        // single field (no idioma)
        return '<div class="field"><span>' + esc(label) + '</span>' +
               '<input type="text" data-link="' + id + '" value="' + esc(v.es || v.en) + '">' +
               (help ? '<small style="color:var(--muted);font-size:.75rem">' + help + '</small>' : '') +
               '</div>';
      }
      return '<div class="field"><span>' + esc(label) + '</span><div class="field--two">' +
        '<div><label class="field__flag">ES/EN igual?</label>' +
        '<input type="text" data-set="' + id + '" data-lang="es" value="' + esc(v.es) + '"></div>' +
        '<div><label class="field__flag">🇬🇧 EN (si difiere)</label>' +
        '<input type="text" data-set="' + id + '" data-lang="en" value="' + esc(v.en) + '"></div></div>' +
        (help ? '<small style="color:var(--muted);font-size:.75rem">' + help + '</small>' : '') +
        '</div>';
    };
    var html = '<div class="group"><h2 class="group__title">Contacto (teléfono, email, WhatsApp)</h2>' +
      '<p class="group__hint">URLs y números que usan los botones de contacto. Mantén el formato: <code>https://wa.me/57…</code>, <code>tel:+57…</code>, <code>mailto:…</code>.</p>' +
      g('contact_whatsapp_url', 'WhatsApp de recepción', 'Ej.: https://wa.me/573127417352') +
      g('contact_phone_url',    'Teléfono (tel:)',       'Ej.: tel:+573127417352') +
      '<div class="field"><span>Teléfono visible (texto del botón)</span>' +
        '<input type="text" data-set="contact_phone_label" data-lang="es" value="' + esc((state.settings['contact_phone_label']||{}).es || '') + '"></div>' +
      g('contact_email_url',    'Email (mailto:)',         'Ej.: mailto:htsierranevada@gmail.com') +
      g('contact_email_label', 'Texto botón email',        '') +
      '</div>';

    html += '<div class="group"><h2 class="group__title">Tour (WhatsApp y Linktree)</h2>' +
      g('tour_whatsapp_url', 'WhatsApp del tour', 'Incluye ?text=… con mensaje predefinido') +
      g('tour_info_url',      'Enlace "Más información"', 'Ej.: https://linktr.ee/Maruamake') +
      '</div>';

    html += '<div class="group"><h2 class="group__title">Mapa de ubicación</h2>' +
      '<p class="group__hint">' + esc('Para cambiar el mapa:') + ' ve a Google Maps, busca la dirección, pulsa "Compartir" → "Insertar un mapa", copia solo la URL del atributo src del iframe y pégala aquí.</p>' +
      g('map_iframe_src',     'URL del iframe de Google Maps', '') +
      g('map_directions_url', 'URL "Cómo llegar" (Google Maps directions)', 'Ej.: https://www.google.com/maps/dir/?api=1&destination=lat,lng') +
      '</div>';

    html += '<button class="btn btn--save" id="saveLinks" type="button">Guardar enlaces</button>';
    host.innerHTML = html;
  }

  // ============== EVENTOS ==============
  function bind() {
    // tabs
    $all('.nav__tab').forEach(function (t) {
      t.addEventListener('click', function () {
        $all('.nav__tab').forEach(function (x) { x.classList.remove('is-active'); });
        t.classList.add('is-active');
        $all('.panel').forEach(function (p) { p.classList.remove('is-active'); });
        $('#panel-' + t.dataset.panel).classList.add('is-active');
      });
    });

    document.addEventListener('click', function (e) {
      // guardar textos
      if (e.target.id === 'saveTexts') { saveTexts(); return; }
      if (e.target.id === 'savePolicies') { savePolicies(); return; }
      if (e.target.id === 'saveLocation') { saveLocation(); return; }
      if (e.target.id === 'saveLinks') { saveLinks(); return; }

      // add / delete / reorder (común a policies y location)
      if (e.target.id === 'polAdd') {
        state.policies.push({ icon: '✅', title_es: '', title_en: '', text_es: '', text_en: '', sort_order: state.policies.length });
        renderPolicies(); return;
      }
      if (e.target.id === 'locAdd') {
        state.location.push({ title_es: '', title_en: '', text_es: '', text_en: '', sort_order: state.location.length });
        renderLocation(); return;
      }
      var li = e.target.closest('li[data-i]');
      if (li && e.target.dataset.del !== undefined) {
        var kind = li.closest('#polList') ? 'policies' : 'location';
        var idx = +li.dataset.i;
        state[kind].splice(idx, 1);
        kind === 'policies' ? renderPolicies() : renderLocation();
        return;
      }
      if (li && e.target.dataset.up !== undefined) reorder(li, kind_of(li), -1);
      if (li && e.target.dataset.down !== undefined) reorder(li, kind_of(li), 1);
    });

    // cambiar contraseña
    var pwdBtn = $('#btnPassword'), pwdModal = $('#pwdModal');
    if (pwdBtn) {
      pwdBtn.addEventListener('click', function () { pwdModal.hidden = false; });
    }
    $('#pwdCancel').addEventListener('click', function () { pwdModal.hidden = true; });
    $('#pwdSave').addEventListener('click', async function () {
      var np = $('#newPwd').value.trim();
      if (np.length < 6) { toast('Mínimo 6 caracteres', 'err'); return; }
      var r = await api('change_password', { new_password: np });
      if (r.ok) { pwdModal.hidden = true; $('#newPwd').value = ''; toast('Contraseña actualizada', 'ok'); }
      else toast(r.error || 'Error', 'err');
    });
  }

  function kind_of(li) {
    return li.closest('#polList') ? 'policies' : 'location';
  }
  function reorder(li, kind, dir) {
    var idx = +li.dataset.i; var arr = state[kind]; var ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    var t = arr[idx]; arr[idx] = arr[ni]; arr[ni] = t;
    kind === 'policies' ? renderPolicies() : renderLocation();
  }

  // Recoger inputs del panel de textos/enlaces con data-set
  function collectSettings(scope) {
    var out = {};
    $all('[data-set]', scope).forEach(function (el) {
      var id = el.dataset.set, lang = el.dataset.lang;
      out[id] = out[id] || { es: '', en: '' };
      out[id][lang] = el.value;
      if (lang === 'es' && el.dataset.lang === 'es' && !out[id].en) out[id].en = el.value;
    });
    // data-link (single, se guarda en es y en)
    $all('[data-link]', scope).forEach(function (el) {
      out[el.dataset.link] = { es: el.value, en: el.value };
    });
    return out;
  }

  async function saveTexts() {
    var s = collectSettings($('#panel-texts'));
    var full = Object.assign({}, state.settings);
    for (var k in s) full[k] = s[k];
    var r = await api('settings', full);
    r.ok ? (state.settings = full, toast('Textos guardados ✓', 'ok')) : toast(r.error || 'Error', 'err');
  }
  async function saveLinks() {
    var s = collectSettings($('#panel-links'));
    var full = Object.assign({}, state.settings);
    for (var k in s) full[k] = s[k];
    var r = await api('settings', full);
    r.ok ? (state.settings = full, toast('Enlaces guardados ✓', 'ok')) : toast(r.error || 'Error', 'err');
  }
  async function savePolicies() {
    var list = $all('#polList > li').map(function (li, i) {
      return {
        icon: $('[data-pol=icon]', li).value,
        title_es: $('[data-pol=title_es]', li).value,
        title_en: $('[data-pol=title_en]', li).value,
        text_es: $('[data-pol=text_es]', li).value,
        text_en: $('[data-pol=text_en]', li).value,
        sort_order: i + 1,
      };
    });
    var r = await api('policies', list);
    if (r.ok) { state.policies = list; toast('Políticas guardadas ✓', 'ok'); }
    else toast(r.error || 'Error', 'err');
  }
  async function saveLocation() {
    var list = $all('#locList > li').map(function (li, i) {
      return {
        title_es: $('[data-loc=title_es]', li).value,
        title_en: $('[data-loc=title_en]', li).value,
        text_es: $('[data-loc=text_es]', li).value,
        text_en: $('[data-loc=text_en]', li).value,
        sort_order: i + 1,
      };
    });
    // incluye settings del bloque intro
    var intro = collectSettings($('#panel-location'));
    var full = Object.assign({}, state.settings);
    for (var k in intro) full[k] = intro[k];
    var r1 = await api('settings', full);
    if (!r1.ok) return toast(r1.error || 'Error al guardar intro', 'err');
    state.settings = full;
    var r2 = await api('location', list);
    if (r2.ok) { state.location = list; toast('Ubicación guardada ✓', 'ok'); }
    else toast(r2.error || 'Error', 'err');
  }

  bind();
  loadState();
})();
