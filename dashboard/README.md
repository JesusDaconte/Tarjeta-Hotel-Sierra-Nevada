# Hotel Sierra Nevada — Dashboard de Administración

Panel de control para editar el micrositio de bienvenida (tarjeta vertical mobile-first) del Hotel Sierra Nevada, Santa Marta.

---

## 📦 Estructura del proyecto

```
Tarjeta-Hotel-Sierra-Nevada/
├── index.html          # Micrositio público (HTML5 + CSS3 + JS vanilla)
├── styles.css          # Estilos del micrositio
├── script.js           # Lógica del micrositio + carga API
├── logo_hotel.png      # Logo del hotel
├── tour.jpeg           # Foto del tour
│
├── api/
│   └── content.php     # Endpoint público JSON (GET) → consume el micrositio
│
└── dashboard/          # Panel de administración (protegido)
    ├── index.php       # Login + SPA (pestañas: Textos, Políticas, Ubicación, Enlaces)
    ├── styles.css      # Estilos del panel
    ├── app.js          # Lógica del panel (fetch a api.php)
    ├── api.php         # API protegida (GET estado, POST guardar)
    ├── auth.php        # Sesión, login, CSRF, rate-limit
    ├── db.php          # Conexión PDO + helpers
    ├── config.php.example # Plantilla de configuración (copiar a config.php)
    ├── setup.php       # Ejecutar UNA vez para crear usuario admin
    ├── logout.php      # Cerrar sesión
    └── schema.sql      # Esquema MySQL + datos semilla ES/EN
```

---

## 🚀 Despliegue en el hosting del hotel (cPanel / PHP + MySQL)

### 1. Base de datos
- En cPanel → **Bases de datos MySQL** crea:
  - Base de datos: `hotel_sierra` (o el nombre que prefieras)
  - Usuario: `hotel_user` con contraseña segura
  - Asigna usuario a la base con **todos los privilegios**
- Entra a **phpMyAdmin**, selecciona la base y **Importa** `dashboard/schema.sql`
  - Esto crea las tablas `settings`, `policies`, `location_items`, `admin`, `login_attempts`
  - Y rellena **todos los textos actuales** en español e inglés (listos para editar)

### 2. Configuración
```bash
cd dashboard
cp config.php.example config.php
```
Edita `config.php` con los datos reales:
```php
'db' => [
    'host' => 'localhost',
    'name' => 'hotel_sierra',
    'user' => 'hotel_user',
    'pass' => 'TU_CONTRASEÑA_MYSQL_REAL',
    'charset' => 'utf8mb4',
],
'admin' => [
    'username' => 'admin',
    'password' => 'sierranevada2024', // se hashea en el primer setup
],
'session_secret' => 'UNA_CADENA_ALEATORIA_LARGA_Y_SECRETA_32_CHARS_MIN',
```

### 3. Crear el usuario admin (una sola vez)
Abre en el navegador:
```
https://tudominio.com/dashboard/setup.php
```
Verás: "OK: usuario 'admin' creado. **Borra ahora setup.php del servidor**."
⚠️ **Borra `setup.php` inmediatamente** por seguridad.

### 4. Subir archivos
Sube todo el proyecto a `public_html/` (o la carpeta raíz de tu dominio) manteniendo la estructura:
```
public_html/
├── index.html
├── styles.css
├── script.js
├── logo_hotel.png
├── tour.jpeg
├── api/
│   └── content.php
└── dashboard/
    ├── index.php
    ├── styles.css
    ├── app.js
    ├── api.php
    ├── auth.php
    ├── db.php
    ├── config.php          # (no está en git, creado manualmente)
    ├── logout.php
    └── schema.sql          # (opcional, solo referencia)
```

### 5. Probar
- **Micrositio público**: `https://tudominio.com/` → debe cargar y mostrar los textos de la BD
- **Panel admin**: `https://tudominio.com/dashboard/` → login con `admin` / `sierranevada2024`
- En el panel: edita textos, políticas, ubicación, enlaces → **Guardar** → recarga el micrositio y verás los cambios al instante.

---

## 🔐 Seguridad incluida
- **PDO + prepared statements** en todas las consultas (anti-inyección SQL)
- Contraseña hasheada con `password_hash()` / `password_verify()` (bcrypt)
- Sesión con cookie `HttpOnly`, `SameSite=Lax`, `Secure` (si HTTPS)
- CSRF token por sesión (`X-CSRF-Token` en headers POST)
- Rate-limit básico: máx 5 intentos de login / 5 min por IP (`login_attempts`)
- `config.php` fuera de git (en `.gitignore`)

---

## ✏️ Qué se puede editar desde el panel

| Pestaña | Contenido |
|---------|-----------|
| **Textos** | Encabezado, bloques (desayuno, check-out, recepción, Wi-Fi), intro ubicación, tour, contacto, footer, pestañas |
| **Políticas** | Lista completa: icono, título ES/EN, texto ES/EN, orden (arrastrar con ↑↓), añadir/borrar |
| **Ubicación** | Intro + 4 ítems (supermercados, restaurantes, playas, Tayrona) con título/texto ES/EN y orden |
| **Enlaces** | WhatsApp recepción, teléfono (tel:), email (mailto:), WhatsApp tour, Linktree tour, iframe Google Maps, URL "Cómo llegar" |

Todos los campos tienen **español e inglés** en paralelo.

---

## 🛠️ Flujo de trabajo del cliente (hotel)
1. Entra a `tudominio.com/dashboard/`
2. Usuario: `admin` · Contraseña: la que definió en `config.php` (cambiar en primer login desde el botón 🔒)
3. Edita lo que necesite → botón **Guardar** por sección
4. Abre el micrositio en otra pestaña (botón 🌐 en la barra superior) → verifica
5. Comparte el enlace `https://tudominio.com/` con los huéspedes tras check-in

---

## 🔧 Personalización rápida

- **Colores**: variables CSS `--c-primary` (#731616) y `--c-accent` (#D9843B) en `styles.css` (micrositio) y `dashboard/styles.css` (panel)
- **Fuentes**: Playfair Display (títulos) + Poppins (cuerpo) — ya vienen de Google Fonts
- **Logo**: reemplaza `logo_hotel.png` (1024×1024 PNG con transparencia)
- **Foto tour**: reemplaza `tour.jpeg` (mismo nombre, 4:3 recomendado)

---

## 📝 Notas técnicas

- El micrositio **funciona sin JS** (contenido estático en el HTML) y **mejora progresivamente** cargando `/api/content.php` para sobrescribir con lo de la BD.
- Si la BD falla o está vacía, se ve el contenido por defecto del HTML (fallback robusto).
- `script.js` inyecta los valores en elementos con `data-key="clave"` y actualiza `href` en enlaces con `data-href="clave"`.
- El panel usa **vanilla JS** (sin frameworks), pestañas con `hidden` + CSS, y `fetch` JSON.

---

## 📄 Licencia
Uso interno del Hotel Sierra Nevada. Sin garantías.