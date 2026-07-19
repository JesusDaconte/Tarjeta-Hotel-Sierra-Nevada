<?php
require_once __DIR__ . '/auth.php';

session_name('hsn_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => false,
]);
session_start();

$logueado = is_logged_in();
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#731616" />
<meta name="robots" content="noindex,nofollow" />
<title>Panel · Hotel Sierra Nevada</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap" />
<link rel="stylesheet" href="styles.css" />
</head>
<body>

  <!-- ================= LOGIN ================= -->
  <main class="login" id="loginSection">
    <form id="loginForm" class="login__card" autocomplete="off" method="post">
      <img class="login__logo" src="../logo_hotel.png" alt="" />
      <h1 class="login__title">Panel de administración</h1>
      <p class="login__subtitle">Hotel Sierra Nevada · Santa Marta</p>

      <label class="field">
        <span>Usuario</span>
        <input type="text" name="username" required autofocus />
      </label>
      <label class="field">
        <span>Contraseña</span>
        <input type="password" name="password" required />
      </label>

      <button class="btn btn--primary" type="submit">Entrar</button>
      <p id="loginErr" class="login__err" hidden></p>
    </form>
  </main>

  <!-- ================= PANEL (oculto inicialmente) ================= -->
  <main class="app" id="panelSection" hidden>
    <header class="app__bar">
      <div class="app__brand">
        <img src="../logo_hotel.png" alt="" />
        <div>
          <h1>Hotel Sierra Nevada</h1>
          <p>Panel de edición</p>
        </div>
      </div>
      <div class="app__actions">
        <a class="btn btn--ghost" href="../index.html" target="_blank" rel="noopener" title="Ver micrositio">
          <svg viewBox="0 0 24 24"><path d="M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7zM3 5v16h16v-7h-2v5H5V7h5V5H3z"/></svg>
        </a>
        <button class="btn btn--ghost" type="button" id="btnPassword" title="Cambiar contraseña">
          <svg viewBox="0 0 24 24"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3z"/></svg>
        </button>
        <button class="btn btn--ghost" id="btnLogout" title="Cerrar sesión">
          <svg viewBox="0 0 24 24"><path d="M16 17l5-5-5-5v3H9v4h7v3zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z"/></svg>
        </button>
      </div>
    </header>

    <nav class="nav">
      <button class="nav__tab is-active" data-panel="general">
        <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
        <span>General</span>
      </button>
      <button class="nav__tab" data-panel="info">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M11 8h2v13h-2zM18 5h2v6h-2zM4 5h2v6H4z"/></svg>
        <span>Info</span>
      </button>
      <button class="nav__tab" data-panel="policies">
        <svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 14H7v-2h10zm0-4H7v-2h10zm0-4H7V7h10z"/></svg>
        <span>Políticas</span>
      </button>
      <button class="nav__tab" data-panel="map">
        <svg viewBox="0 0 24 24"><path d="M9 2 3 4.2v17.6L9 19.8 15 22l6-2.2V2.2L15 4.4 9 2zm0 17.6L5 20.8V6.2l4-1.3v14.7zm6-1.3-4-1.4V5.3l4 1.4v11.6zm6-15v14.6l-4 1.4V4.6l4-1.3z"/></svg>
        <span>Ubicación</span>
      </button>
      <button class="nav__tab" data-panel="tours">
        <svg viewBox="0 0 24 24"><path d="M17 2h-2v2h2v2.4A5.5 5.5 0 0 0 12.5 12V2h-2v20h2V13A5.5 5.5 0 0 0 17 18.6V21l-3 1.5V22h7v-2h-2v-2.4A5.5 5.5 0 0 0 21.5 12V2h-2v18M5 2H2v2h3v18l3-1.5V2L5 2z"/></svg>
        <span>Tours</span>
      </button>
      <button class="nav__tab" data-panel="products">
        <svg viewBox="0 0 24 24"><path d="M19 6h-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM9 4h6v2H9V4zm10 16H5V8h14v12z"/><path d="M7 10h2v6H7zm4 0h2v6h-2zm4 0h2v6h-2z"/></svg>
        <span>Productos</span>
      </button>
      <button class="nav__tab" data-panel="contact">
        <svg viewBox="0 0 24 24"><path d="M4 2h16a2 2 0 0 1 2 2v18H6a4 4 0 0 1-4-4V4a2 2 0 0 1 2-2zm0 2v10h18V4H4z"/><path fill="none" d="M0 0h24v24H0z"/></svg>
        <span>Contacto</span>
      </button>
    </nav>

    <!-- PANEL GENERAL -->
    <section id="panel-general" class="panel is-active">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL INFO -->
    <section id="panel-info" class="panel">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL POLÍTICAS -->
    <section id="panel-policies" class="panel">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL MAP -->
    <section id="panel-map" class="panel">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL TOURS -->
    <section id="panel-tours" class="panel">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL PRODUCTOS -->
    <section id="panel-products" class="panel">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL CONTACTO -->
    <section id="panel-contact" class="panel">
      <div class="loading">Cargando…</div>
    </section>

    <div id="toast" class="toast" hidden></div>
  </main>

  <!-- Modal cambiar contraseña -->
  <div id="pwdModal" class="modal" style="display:none">
    <div class="modal__card">
      <h2>Cambiar contraseña</h2>
      <label class="field"><span>Nueva contraseña</span>
        <input type="password" id="newPwd" minlength="6" />
      </label>
      <div class="modal__actions">
        <button class="btn btn--ghost" type="button" id="pwdCancel">Cancelar</button>
        <button class="btn btn--primary" type="button" id="pwdSave">Guardar</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>

</body>
</html>
