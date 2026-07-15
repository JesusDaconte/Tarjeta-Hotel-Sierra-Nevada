<?php
require_once __DIR__ . '/auth.php';
$logueado = is_logged_in();
$csrf = csrf_token();
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

<?php if (!$logueado): ?>
  <!-- ================= LOGIN ================= -->
  <main class="login">
    <form id="loginForm" class="login__card" autocomplete="off">
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

<?php else: ?>
  <!-- ================= PANEL ================= -->
  <main class="app">
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
        <a class="btn btn--ghost" href="logout.php" title="Cerrar sesión">
          <svg viewBox="0 0 24 24"><path d="M16 17l5-5-5-5v3H9v4h7v3zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z"/></svg>
        </a>
      </div>
    </header>

    <nav class="nav">
      <button class="nav__tab is-active" data-panel="texts">
        <svg viewBox="0 0 24 24"><path d="M5 4v3h5.5v12.5h3V7.5H19V4H5z"/></svg>
        <span>Textos</span>
      </button>
      <button class="nav__tab" data-panel="policies">
        <svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 14H7v-2h10zm0-4H7v-2h10zm0-4H7V7h10z"/></svg>
        <span>Políticas</span>
      </button>
      <button class="nav__tab" data-panel="location">
        <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
        <span>Ubicación</span>
      </button>
      <button class="nav__tab" data-panel="links">
        <svg viewBox="0 0 24 24"><path d="M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 11h8v2H8zM17 7h-4v1.9h4a3.1 3.1 0 1 1 0 6.2h-4V19h4a5 5 0 0 0 0-10z"/></svg>
        <span>Enlaces</span>
      </button>
    </nav>

    <!-- PANEL TEXTOS -->
    <section id="panel-texts" class="panel is-active">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL POLÍTICAS -->
    <section id="panel-policies" class="panel">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL UBICACIÓN -->
    <section id="panel-location" class="panel">
      <div class="loading">Cargando…</div>
    </section>
    <!-- PANEL ENLACES -->
    <section id="panel-links" class="panel">
      <div class="loading">Cargando…</div>
    </section>

    <div id="toast" class="toast" hidden></div>
  </main>

  <!-- Modal cambiar contraseña -->
  <div id="pwdModal" class="modal" hidden>
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

  <script>
    window.HSN_CSRF = <?= json_encode($csrf) ?>;
  </script>
  <script src="app.js"></script>
<?php endif; ?>

</body>
</html>
