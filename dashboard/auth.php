<?php
/**
 * Autenticación del panel admin:
 *  - sesión segura (HttpOnly, SameSite)
 *  - login con password_hash / password_verify
 *  - CSRF token por sesión
 *  - rate-limit básico por IP (login_attempts)
 */

require_once __DIR__ . '/db.php';

function cfg(string $key, $default = null) {
    static $c = null;
    if ($c === null) $c = load_config();
    return $c[$key] ?? $default;
}

function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $name = cfg('session_name', 'hsn_admin');
    session_name($name);
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => !empty($_SERVER['HTTPS']),
    ]);
    session_start();
}

function is_logged_in(): bool {
    start_session();
    return !empty($_SESSION['admin_id']);
}

function require_login(): void {
    if (!is_logged_in()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'no-auth', 'login' => true]);
        exit;
    }
}

function csrf_token(): string {
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function csrf_check(): void {
    start_session();
    $token = $_SERVER['HTTP_X_CSRF_TOKEN']
        ?? ($_POST['csrf'] ?? '')
        ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'] ?? '', $token)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'csrf']);
        exit;
    }
}

function client_ip(): string {
    // En cPanel detrás de proxy, REMOTE_ADDR suele ser fiable. Si usas Cloudflare
    // ajusta para leer HTTP_CF_CONNECTING_IP con cuidado.
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function too_many_attempts(): bool {
    $ip = client_ip();
    $stmt = db()->prepare(
        'SELECT COUNT(*) AS n FROM login_attempts
         WHERE ip = ? AND attempted_at > (NOW() - INTERVAL 5 MINUTE)'
    );
    $stmt->execute([$ip]);
    return ((int)$stmt->fetchColumn()) >= 5;
}

function record_attempt(): void {
    $stmt = db()->prepare('INSERT INTO login_attempts (ip) VALUES (?)');
    $stmt->execute([client_ip()]);
}

function attempt_login(string $username, string $password): bool {
    if (too_many_attempts()) return false;
    record_attempt();
    $stmt = db()->prepare('SELECT id, password_hash FROM admin WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        return false;
    }
    // rehash si hace falta (bcrypt coste cambiado)
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        $new = password_hash($password, PASSWORD_DEFAULT);
        $u = db()->prepare('UPDATE admin SET password_hash = ? WHERE id = ?');
        $u->execute([$new, $row['id']]);
    }
    start_session();
    session_regenerate_id(true);
    $_SESSION['admin_id']  = (int)$row['id'];
    $_SESSION['admin_user'] = $username;
    // limpiar intentos de esta IP
    $clean = db()->prepare('DELETE FROM login_attempts WHERE ip = ?');
    $clean->execute([client_ip()]);
    return true;
}

function logout(): void {
    start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], '', $p['secure'], $p['httponly']);
    }
    session_destroy();
}
