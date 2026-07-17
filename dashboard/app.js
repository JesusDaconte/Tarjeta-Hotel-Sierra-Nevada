(function () {
  'use strict';

  var SESSION = JSON.parse(localStorage.getItem('hsn_session') || 'null');
  var CSRF = SESSION ? SESSION.csrf : '';
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
  function imgSrc(path) {
    if (!path) return '';
    if (path.match(/^(https?:|\/)/)) return path;
    return '../' + path;
  }
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
    console.log('[api] POST', action, data);
    var headers = { 'Content-Type': 'application/json' };
    if (SESSION && SESSION.token) headers['X-Session-Token'] = SESSION.token;
    if (CSRF) headers['X-CSRF-Token'] = CSRF;
    var res = await fetch('api.php', {
      method: 'POST',
      headers: headers,
      body: body,
    });
    var json = await res.json();
    console.log('[api] response', json);
    return json;
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
        if (r.ok) {
          SESSION = { token: r.token, csrf: r.csrf };
          CSRF = r.csrf;
          localStorage.setItem('hsn_session', JSON.stringify(SESSION));
          location.reload();
        } else { err.textContent = r.error || 'Error'; err.hidden = false; }
      } catch (ex) {
        console.error('[login] error', ex);
        err.textContent = 'Error de red'; err.hidden = false;
      }
    });
  }

  // ============== PANEL: cargas y tabs ==============
  async function loadState() {
    try {
      var headers = {};
      if (SESSION && SESSION.token) {
        headers['X-Session-Token'] = SESSION.token;
      }
      var res = await fetch('api.php', { headers: headers });
      var data = await res.json();
      if (!data.ok) {
        SESSION = null;
        localStorage.removeItem('hsn_session');
        return;
      }
      CSRF = data.csrf || CSRF;
      state = data;
      renderGeneral(); renderInfo(); renderPolicies(); renderMap(); renderTours(); renderContact();
      $all('.loading').forEach(function (l) { l.parentNode.removeChild(l); });

      $('#loginSection').hidden = true;
      $('#panelSection').hidden = false;
    } catch (e) {
      console.error('[loadState] error:', e);
      $all('.loading').forEach(function (l) { l.textContent = 'Error al cargar. Recarga la página.'; });
    }
  }

  function setSetting(id, es, en) {
    if (!state.settings) state.settings = {};
    state.settings[id] = { es: es, en: en };
  }

  // ===== Utilidad para renderizar grupos de campos bilingües =====
  function renderGroups(hostId, groups, saveBtnId, saveBtnLabel) {
    var host = $('#' + hostId);
    var html = '';
    groups.forEach(function (g) {
      html += '<div class="group"><h2 class="group__title">' + esc(g.title) + '</h2>' +
              '<p class="group__hint">' + esc(g.hint) + '</p>';
      g.fields.forEach(function (f) {
        var id = f[0], label = f[1], long = f[2];
        if (f[3] === 'link') {
          var v = state.settings[id] || { es: '', en: '' };
          html += '<div class="field"><span>' + esc(label) + '</span>' +
                  '<input type="text" data-link="' + id + '" value="' + esc(v.es || v.en) + '">' +
                  (f[4] ? '<small style="color:var(--muted);font-size:.75rem">' + f[4] + '</small>' : '') +
                  '</div>';
        } else {
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
        }
      });
      html += '</div>';
    });
    html += '<button class="btn btn--save" id="' + saveBtnId + '" type="button">' + esc(saveBtnLabel) + '</button>';
    host.innerHTML = html;
  }

  // ---------- Render: GENERAL ----------
  var GENERAL_GROUPS = [
    { title: 'Encabezado', hint: 'Texto de bienvenida en la parte superior.', fields: [
      ['header_title',     'Bienvenida (primera línea)', false],
      ['header_hotel_name','Nombre del hotel', false],
      ['header_subtitle',  'Subtítulo (ubicación)', false],
      ['header_intro',      'Frase introductoria', true],
    ]},
    { title: 'Paneles · títulos y pestañas', hint: 'Nombres de las pestañas y títulos de paneles.', fields: [
      ['tab_info',     'Pestaña Info', false],
      ['tab_policies', 'Pestaña Políticas', false],
      ['tab_map',      'Pestaña Ubicación', false],
      ['tab_tour',      'Pestaña Tour', false],
      ['tab_contact',  'Pestaña Contacto', false],
      ['policies_title', 'Título panel Políticas', false],
      ['policies_lead',   'Intro de Políticas', true],
      ['policies_thanks', 'Frase de agradecimiento', false],
    ]},
    { title: 'Footer / eslogan', hint: 'Eslogan y ubicación al pie de la tarjeta.', fields: [
      ['footer_slogan', 'Eslogan final', true],
      ['footer_loc',     'Línea de ubicación', false],
    ]},
  ];
  function renderGeneral() { renderGroups('panel-general', GENERAL_GROUPS, 'saveGeneral', 'Guardar general'); }

  // ---------- Render: INFO ----------
  var INFO_GROUPS = [
    { title: 'Desayuno', hint: 'Horario del desayuno.', fields: [
      ['block_breakfast_title', 'Título', false],
      ['block_breakfast_text',   'Texto', true],
    ]},
    { title: 'Check-out', hint: 'Horario de salida.', fields: [
      ['block_checkout_title', 'Título', false],
      ['block_checkout_text',   'Texto', true],
    ]},
    { title: 'Recepción', hint: 'Horario de recepción 24h.', fields: [
      ['block_reception_title', 'Título', false],
      ['block_reception_text',   'Texto', true],
    ]},
    { title: 'Wi-Fi', hint: 'Red y contraseña. La contraseña es la que copian los huéspedes.', fields: [
      ['wifi_title',          'Título del bloque', false],
      ['wifi_password_label', 'Etiqueta "Contraseña:"', false],
      ['wifi_password',       'Contraseña Wi-Fi', false],
      ['wifi_hint',            'Pista del QR por piso', true],
    ]},
    { title: 'Ubicación privilegiada (textos)', hint: 'Título y párrafo introductorio que aparecen en la pestaña Info.', fields: [
      ['location_intro_title', 'Título del bloque', false],
      ['location_intro_text',  'Párrafo introductorio', true],
    ]},
  ];
  function renderInfo() {
    renderGroups('panel-info', INFO_GROUPS, 'saveInfo', 'Guardar info');
    var host = $('#panel-info');
    var listHtml = '<div class="group"><h2 class="group__title">Ubicación privilegiada (lista)</h2>' +
      '<p class="group__hint">Puntos de interés cercanos. Usa ↑ ↓ para reordenar.</p>' +
      '<ul id="locList" class="items">';
    (state.location || []).forEach(function (p, i) { listHtml += locRow(p, i); });
    listHtml += '</ul><button class="items__add" id="locAdd" type="button">+ Añadir elemento</button></div>';
    host.insertAdjacentHTML('beforeend', listHtml);
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

  // ---------- Render: MAPA / UBICACIÓN ----------
  var MAP_GROUPS = [
    { title: 'Mapa y direcciones', hint: 'Configuración del mapa embebido y el botón "Cómo llegar". Para cambiar el mapa: ve a Google Maps, busca la dirección, pulsa "Compartir" → "Insertar un mapa", copia la URL del src del iframe.', fields: [
      ['map_title',       'Título del panel', false],
      ['map_address',     'Dirección textual', false],
      ['map_iframe_src',  'URL del iframe de Google Maps', 'link', '', 'Ej.: https://www.google.com/maps?q=...&output=embed'],
      ['map_directions_url', 'URL "Cómo llegar"', 'link', '', 'Ej.: https://www.google.com/maps/dir/?api=1&destination=lat,lng'],
      ['map_directions_btn', 'Texto del botón "Cómo llegar"', false],
    ]},
  ];
  function renderMap() { renderGroups('panel-map', MAP_GROUPS, 'saveMap', 'Guardar ubicación'); }
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

  // ---------- Render: CONTACTO ----------
  var CONTACT_GROUPS = [
    { title: 'Tarjeta de contacto', hint: 'Datos que aparecen en la tarjeta de presentación.', fields: [
      ['contact_card_name',    'Nombre del hotel', false],
      ['contact_card_tagline', 'Eslogan corto', false],
      ['contact_card_addr',    'Dirección (puede usar <br>)', true],
    ]},
    { title: 'WhatsApp', hint: 'Número y texto del botón de WhatsApp.', fields: [
      ['contact_whatsapp_url',   'URL de WhatsApp', 'link', '', 'Ej.: https://wa.me/573127417352'],
      ['contact_whatsapp_label', 'Texto del botón', false],
    ]},
    { title: 'Teléfono', hint: 'Número y texto del botón de llamada.', fields: [
      ['contact_phone_url',   'URL tel:', 'link', '', 'Ej.: tel:+573127417352'],
      ['contact_phone_label', 'Texto del botón', false],
    ]},
    { title: 'Email', hint: 'Dirección y texto del botón de correo.', fields: [
      ['contact_email_url',   'URL mailto:', 'link', '', 'Ej.: mailto:htsierranevada@gmail.com'],
      ['contact_email_label', 'Texto del botón', false],
    ]},
  ];
  function renderContact() { renderGroups('panel-contact', CONTACT_GROUPS, 'saveContact', 'Guardar contacto'); }

  // ---------- Render: TOURS ----------
  function renderTours() {
    var host = $('#panel-tours');
    var html = '<div class="group"><h2 class="group__title">Tours a la Sierra Nevada</h2>' +
               '<p class="group__hint">Cada tour incluye título, descripción, imagen, etiquetas y botones. Usa ↑ ↓ para reordenar.</p>' +
               '<ul id="tourList" class="items">';
    (state.tours || []).forEach(function (t, i) { html += tourRow(t, i); });
    html += '</ul><button class="items__add" id="tourAdd" type="button">+ Añadir tour</button></div>' +
            '<button class="btn btn--save" id="saveTours" type="button">Guardar tours</button>';
    host.innerHTML = html;
  }

  function tagRow(tag, ti, tIdx) {
    return '<div class="field--two" style="margin-top:6px" data-tag="' + ti + '">' +
      '<div><label class="field__flag">Ícono</label>' +
      '<input type="text" data-tour-tag="icon" data-tour-idx="' + tIdx + '" value="' + esc(tag.icon || '') + '" maxlength="4" style="width:60px"></div>' +
      '<div><label class="field__flag">🇪🇸 Texto</label>' +
      '<input type="text" data-tour-tag="text_es" data-tour-idx="' + tIdx + '" value="' + esc(tag.text_es || '') + '"></div>' +
      '<div><label class="field__flag">🇬🇧 Texto</label>' +
      '<input type="text" data-tour-tag="text_en" data-tour-idx="' + tIdx + '" value="' + esc(tag.text_en || '') + '"></div>' +
      '<button class="btn btn--small btn--danger" data-del-tag type="button" style="align-self:end">✕</button></div>';
  }

  function tourRow(t, i) {
    var tags = [];
    try { tags = JSON.parse(t.tags_json || '[]'); } catch (e) {}
    var tagsHtml = tags.map(function (tag, ti) { return tagRow(tag, ti, i); }).join('');
    return '<li data-i="' + i + '">' +
      '<div class="items__head">' +
        '<strong style="color:var(--c-primary)">Tour #' + (i + 1) + '</strong>' +
        '<div class="items__reorder">' +
          '<button type="button" data-up title="Subir"><svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg></button>' +
          '<button type="button" data-down title="Bajar"><svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class="field--two">' +
        '<div><label class="field__flag">🇪🇸 Título</label><input type="text" data-tour="title_es" value="' + esc(t.title_es || '') + '"></div>' +
        '<div><label class="field__flag">🇬🇧 Título</label><input type="text" data-tour="title_en" value="' + esc(t.title_en || '') + '"></div>' +
      '</div>' +
      '<div class="field--two" style="margin-top:10px">' +
        '<div><label class="field__flag">🇪🇸 Descripción</label><textarea data-tour="description_es">' + esc(t.description_es || '') + '</textarea></div>' +
        '<div><label class="field__flag">🇬🇧 Descripción</label><textarea data-tour="description_en">' + esc(t.description_en || '') + '</textarea></div>' +
      '</div>' +
      '<div class="field--two" style="margin-top:10px">' +
        '<div><label class="field__flag">🇪🇸 Texto recepción</label><input type="text" data-tour="reception_es" value="' + esc(t.reception_es || '') + '"></div>' +
        '<div><label class="field__flag">🇬🇧 Texto recepción</label><input type="text" data-tour="reception_en" value="' + esc(t.reception_en || '') + '"></div>' +
      '</div>' +
      '<div class="field" style="margin-top:10px">' +
        '<label class="field__flag">Imagen del tour</label>' +
        '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">' +
          '<button class="btn btn--small btn--primary" type="button" data-upload-tour-img="' + i + '">Seleccionar imagen</button>' +
          '<span style="font-size:.78rem;color:var(--muted)">' + esc(t.image || 'Sin imagen') + '</span>' +
        '</div>' +
        '<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-file-input="' + i + '" style="display:none">' +
        '<input type="hidden" data-tour="image" value="' + esc(t.image || '') + '">' +
        '<div class="tour-preview" style="border:1px solid var(--line);border-radius:8px;overflow:hidden;max-width:280px;aspect-ratio:4/3;background:#f9f4ec;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:var(--muted)">' +
          '<img src="' + esc(imgSrc(t.image)) + '" alt="Preview" class="tour-preview-img" style="width:100%;height:100%;object-fit:cover" />' +
        '</div>' +
      '</div>' +
      '<div class="field" style="margin-top:10px">' +
        '<label class="field__flag">Etiquetas <button class="btn btn--small" type="button" data-add-tag style="margin-left:8px">+ Añadir etiqueta</button></label>' +
        tagsHtml +
      '</div>' +
      '<div class="field--two" style="margin-top:10px">' +
        '<div><label class="field__flag">🇪🇸 Botón info</label><input type="text" data-tour="info_label_es" value="' + esc(t.info_label_es || '') + '"></div>' +
        '<div><label class="field__flag">🇬🇧 Botón info</label><input type="text" data-tour="info_label_en" value="' + esc(t.info_label_en || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="field__flag">URL botón info</label><input type="text" data-tour="info_url" value="' + esc(t.info_url || '') + '"></div>' +
      '<div class="field--two" style="margin-top:10px">' +
        '<div><label class="field__flag">🇪🇸 Botón WhatsApp</label><input type="text" data-tour="whatsapp_label_es" value="' + esc(t.whatsapp_label_es || '') + '"></div>' +
        '<div><label class="field__flag">🇬🇧 Botón WhatsApp</label><input type="text" data-tour="whatsapp_label_en" value="' + esc(t.whatsapp_label_en || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="field__flag">URL botón WhatsApp</label><input type="text" data-tour="whatsapp_url" value="' + esc(t.whatsapp_url || '') + '"></div>' +
      '<button class="items__del" data-del type="button">Eliminar tour</button>' +
    '</li>';
  }

  // ============== EVENTOS ==============
  function bind() {
    console.log('[bind] called');
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
      if (e.target.id === 'saveGeneral') { saveSettingsFrom('panel-general', 'saveGeneral', 'General guardado ✓'); return; }
      if (e.target.id === 'saveInfo') { saveInfo(); return; }
      if (e.target.id === 'savePolicies') { savePolicies(); return; }
      if (e.target.id === 'saveMap') { saveSettingsFrom('panel-map', 'saveMap', 'Ubicación guardada ✓'); return; }
      if (e.target.id === 'saveContact') { saveSettingsFrom('panel-contact', 'saveContact', 'Contacto guardado ✓'); return; }
      if (e.target.id === 'saveTours') { saveTours(); return; }

      if (e.target.id === 'polAdd') {
        state.policies.push({ icon: '✅', title_es: '', title_en: '', text_es: '', text_en: '', sort_order: state.policies.length });
        renderPolicies(); return;
      }
      if (e.target.id === 'locAdd') {
        state.location.push({ title_es: '', title_en: '', text_es: '', text_en: '', sort_order: state.location.length });
        renderInfo(); return;
      }
      if (e.target.id === 'tourAdd') {
        state.tours.push({
          title_es: '', title_en: '', description_es: '', description_en: '',
          reception_es: '', reception_en: '', image: '', tags_json: '[]',
          info_label_es: '', info_label_en: '', info_url: '',
          whatsapp_label_es: '', whatsapp_label_en: '', whatsapp_url: '',
          sort_order: state.tours.length
        });
        renderTours(); return;
      }
      var li = e.target.closest('li[data-i]');
      if (li && e.target.dataset.del !== undefined) {
        var kind = tour_kind_of(li);
        var idx = +li.dataset.i;
        state[kind].splice(idx, 1);
        if (kind === 'policies') renderPolicies();
        else if (kind === 'location') renderInfo();
        else renderTours();
        return;
      }
      if (li && e.target.dataset.up !== undefined) reorder(li, tour_kind_of(li), -1);
      if (li && e.target.dataset.down !== undefined) reorder(li, tour_kind_of(li), 1);

      // add/delete tag dentro de tours
      if (li && e.target.dataset.addTag !== undefined) {
        var tIdx = +li.dataset.i;
        var tour = state.tours[tIdx];
        var tags = [];
        try { tags = JSON.parse(tour.tags_json || '[]'); } catch (e) {}
        tags.push({ icon: '🏷️', text_es: '', text_en: '' });
        tour.tags_json = JSON.stringify(tags);
        renderTours(); return;
      }
      if (e.target.dataset.delTag !== undefined) {
        var tagDiv = e.target.closest('[data-tag]');
        if (tagDiv) {
          var tourLi = e.target.closest('li[data-i]');
          if (tourLi) {
            var tIdx2 = +tourLi.dataset.i;
            var tagIdx = +tagDiv.dataset.tag;
            var tour2 = state.tours[tIdx2];
            var tags2 = [];
            try { tags2 = JSON.parse(tour2.tags_json || '[]'); } catch (e) {}
            tags2.splice(tagIdx, 1);
            tour2.tags_json = JSON.stringify(tags2);
            renderTours(); return;
          }
        }
      }
      // upload imagen del tour
      var uploadBtn = e.target.closest('[data-upload-tour-img]');
      if (uploadBtn) {
        var idx = uploadBtn.dataset.uploadTourImg;
        var fileInput = document.querySelector('[data-file-input="' + idx + '"]');
        if (fileInput) fileInput.click();
        return;
      }
    });
    // file input change → upload image
    document.addEventListener('change', function (e) {
      if (e.target.dataset.fileInput !== undefined) {
        uploadTourImage(e.target);
      }
    });
  }

  async function uploadTourImage(input) {
    var file = input.files[0];
    if (!file) return;
    var form = new FormData();
    form.append('file', file);
    try {
      var res = await fetch('upload.php', { method: 'POST', body: form });
      var json = await res.json();
      if (json.ok) {
        var li = input.closest('li[data-i]');
        if (!li) return;
        var hidden = li.querySelector('[data-tour="image"]');
        if (hidden) hidden.value = json.url;
        var preview = li.querySelector('.tour-preview-img');
        if (preview) preview.src = '../' + json.url;
        var label = li.querySelector('[data-upload-tour-img]');
        if (label) {
          var span = label.nextElementSibling;
          if (span) span.textContent = json.url;
        }
        toast('Imagen subida ✓', 'ok');
      } else {
        toast(json.error || 'Error al subir', 'err');
      }
    } catch (e) {
      toast('Error de red', 'err');
    }
  }

  function tour_kind_of(li) {
    if (li.closest('#polList')) return 'policies';
    if (li.closest('#tourList')) return 'tours';
    return 'location';
  }

  function reorder(li, kind, dir) {
    var idx = +li.dataset.i; var arr = state[kind]; var ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return;
    var t = arr[idx]; arr[idx] = arr[ni]; arr[ni] = t;
    if (kind === 'policies') renderPolicies();
    else if (kind === 'tours') renderTours();
    else renderInfo();
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

  async function saveSettingsFrom(panelId, btnId, msg) {
    var scope = $('#' + panelId);
    // collectSettings recoge data-set y data-link
    var s = collectSettings(scope);
    var full = Object.assign({}, state.settings);
    for (var k in s) full[k] = s[k];
    var r = await api('settings', full);
    if (r.ok) { state.settings = full; toast(msg || 'Guardado ✓', 'ok'); }
    else toast(r.error || 'Error', 'err');
  }
  async function saveInfo() {
    var scope = $('#panel-info');
    var s = collectSettings(scope);
    var full = Object.assign({}, state.settings);
    for (var k in s) full[k] = s[k];
    var list = $all('#locList > li').map(function (li, i) {
      return {
        title_es: $('[data-loc=title_es]', li).value,
        title_en: $('[data-loc=title_en]', li).value,
        text_es: $('[data-loc=text_es]', li).value,
        text_en: $('[data-loc=text_en]', li).value,
        sort_order: i + 1,
      };
    });
    var r1 = await api('settings', full);
    if (!r1.ok) return toast(r1.error || 'Error al guardar settings', 'err');
    state.settings = full;
    var r2 = await api('location', list);
    if (r2.ok) { state.location = list; toast('Info guardada ✓', 'ok'); }
    else toast(r2.error || 'Error', 'err');
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

  async function saveTours() {
    var list = $all('#tourList > li').map(function (li, i) {
      var tags = $all('[data-tour-tag]', li).reduce(function (acc, el) {
        var key = el.dataset.tourTag;
        var idx = el.dataset.tourIdx;
        if (!acc[idx]) acc[idx] = {};
        acc[idx][key] = el.value;
        return acc;
      }, []);
      return {
        title_es: $('[data-tour=title_es]', li).value,
        title_en: $('[data-tour=title_en]', li).value,
        description_es: $('[data-tour=description_es]', li).value,
        description_en: $('[data-tour=description_en]', li).value,
        reception_es: $('[data-tour=reception_es]', li).value,
        reception_en: $('[data-tour=reception_en]', li).value,
        image: $('[data-tour=image]', li).value,
        tags: tags,
        info_label_es: $('[data-tour=info_label_es]', li).value,
        info_label_en: $('[data-tour=info_label_en]', li).value,
        info_url: $('[data-tour=info_url]', li).value,
        whatsapp_label_es: $('[data-tour=whatsapp_label_es]', li).value,
        whatsapp_label_en: $('[data-tour=whatsapp_label_en]', li).value,
        whatsapp_url: $('[data-tour=whatsapp_url]', li).value,
        sort_order: i + 1,
      };
    });
    var r = await api('tours', list);
    if (r.ok) { state.tours = list; toast('Tours guardados ✓', 'ok'); }
    else toast(r.error || 'Error', 'err');
  }

  // ============== INIT ==============
  function init() {
    if (!SESSION || !SESSION.token) return;
    loadState().then(function() {
      var pwdModal = $('#pwdModal');
      var pwdBtn = $('#btnPassword');
      if (pwdBtn) {
        pwdBtn.addEventListener('click', function () { pwdModal.style.display = 'flex'; });
      }
      if ($('#pwdCancel')) $('#pwdCancel').addEventListener('click', function () { pwdModal.style.display = 'none'; });
      if ($('#pwdSave')) $('#pwdSave').addEventListener('click', async function () {
        var np = $('#newPwd').value.trim();
        if (np.length < 6) { toast('Mínimo 6 caracteres', 'err'); return; }
        var r = await api('change_password', { new_password: np });
        if (r.ok) { pwdModal.style.display = 'none'; $('#newPwd').value = ''; toast('Contraseña actualizada', 'ok'); }
        else toast(r.error || 'Error', 'err');
      });
    });
  }

  // ============== LOGOUT ==============
  var logoutBtn = $('#btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      SESSION = null;
      CSRF = '';
      localStorage.removeItem('hsn_session');
      location.reload();
    });
  }

  bind();
  init();
})();
