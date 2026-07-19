<?php
/**
 * Autenticación del panel admin (sin cookies/sesiones PHP):
 *  - Token en header X-Session-Token (almacenado en localStorage)
 *  - CSRF en header X-CSRF-Token (guardado en admin table)
 *  - rate-limit básico por IP (login_attempts)
 */

require_once __DIR__ . '/db.php';

function cfg(string $key, $default = null) {
    static $c = null;
    if ($c === null) $c = load_config();
    return $c[$key] ?? $default;
}

function get_session_token(): ?string {
    $h = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? null;
    if (!$h || !is_string($h) || strlen($h) > 128) return null;
    return $h;
}

function get_csrf_token(): ?string {
    $h = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    if (!$h || !is_string($h) || strlen($h) > 128) return null;
    return $h;
}

function is_logged_in(): bool {
    $token = get_session_token();
    if (!$token) return false;
    $stmt = db()->prepare(
        'SELECT id, username FROM admin
         WHERE session_token = ? AND session_expires_at > NOW() LIMIT 1'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) return false;
    return true;
}

function require_login(): void {
    if (!is_logged_in()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'no-auth', 'login' => true]);
        exit;
    }
}

function csrf_token_from_db(): ?string {
    $token = get_session_token();
    if (!$token) return null;
    $stmt = db()->prepare('SELECT csrf_token FROM admin WHERE session_token = ? AND session_expires_at > NOW() LIMIT 1');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    return $row ? $row['csrf_token'] : null;
}

function csrf_check(): void {
    $token = get_csrf_token();
    $expected = csrf_token_from_db();
    if (!is_string($token) || !is_string($expected) || !hash_equals($expected, $token)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'csrf']);
        exit;
    }
}

function client_ip(): string {
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

function attempt_login(string $username, string $password) {
    if (too_many_attempts()) return false;
    record_attempt();
    $stmt = db()->prepare('SELECT id, password_hash FROM admin WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        return false;
    }
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        $new = password_hash($password, PASSWORD_DEFAULT);
        $u = db()->prepare('UPDATE admin SET password_hash = ? WHERE id = ?');
        $u->execute([$new, $row['id']]);
    }
    $session_token = bin2hex(random_bytes(32));
    $csrf = bin2hex(random_bytes(16));
    $expires = date('Y-m-d H:i:s', strtotime('+7 days'));
    $upd = db()->prepare(
        'UPDATE admin SET session_token = ?, session_expires_at = ?, csrf_token = ? WHERE id = ?'
    );
    $upd->execute([$session_token, $expires, $csrf, $row['id']]);
    $clean = db()->prepare('DELETE FROM login_attempts WHERE ip = ?');
    $clean->execute([client_ip()]);
    return ['token' => $session_token, 'csrf' => $csrf];
}

function logout(): void {
    $token = get_session_token();
    if ($token) {
        $stmt = db()->prepare(
            'UPDATE admin SET session_token = NULL, session_expires_at = NULL, csrf_token = NULL WHERE session_token = ?'
        );
        $stmt->execute([$token]);
    }
}

function api_get_state(): array {
    $token = get_session_token();
    $csrf = csrf_token_from_db();
    $stmt = db()->prepare('SELECT username FROM admin WHERE session_token = ? AND session_expires_at > NOW() LIMIT 1');
    $stmt->execute([$token]);
    $admin = $stmt->fetch();

    $rows = db()->query('SELECT id, value_es, value_en FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $r) {
        $settings[$r['id']] = ['es' => $r['value_es'], 'en' => $r['value_en']];
    }
    $policies = db()->query('SELECT * FROM policies ORDER BY sort_order, id')->fetchAll();
    $location = db()->query('SELECT * FROM location_items ORDER BY sort_order, id')->fetchAll();
    $tours = [];
    try { $tours = db()->query('SELECT * FROM tours ORDER BY sort_order, id')->fetchAll(); } catch (Throwable $e) {}
    $products = [];
    try { $products = db()->query('SELECT * FROM products ORDER BY sort_order, id')->fetchAll(); } catch (Throwable $e) {}
    if (empty($tours)) {
        $tagIcons = ['🥾', '🎯', '🐦', '🪶'];
        $tags = [];
        for ($i = 1; $i <= 4; $i++) {
            $key = 'tour_tag_' . $i;
            if (!empty($settings[$key]['es']) || !empty($settings[$key]['en'])) {
                $tags[] = [
                    'icon' => $tagIcons[$i - 1],
                    'text_es' => $settings[$key]['es'] ?? '',
                    'text_en' => $settings[$key]['en'] ?? '',
                ];
            }
        }
        $url = function ($k) use ($settings) { return $settings[$k]['es'] ?? $settings[$k]['en'] ?? ''; };
        $tours[] = [
            'id' => 0,
            'title_es' => $settings['tour_title']['es'] ?? '',
            'title_en' => $settings['tour_title']['en'] ?? '',
            'description_es' => $settings['tour_desc']['es'] ?? '',
            'description_en' => $settings['tour_desc']['en'] ?? '',
            'reception_es' => $settings['tour_reception']['es'] ?? '',
            'reception_en' => $settings['tour_reception']['en'] ?? '',
            'image' => (function () use ($settings) {
                $img = $settings['tour_image']['es'] ?? $settings['tour_image']['en'] ?? '';
                if (empty($img) || $img === 'tour.jpeg') return 'uploads/tours/tour.jpeg';
                return $img;
            })(),
            'tags_json' => json_encode($tags, JSON_UNESCAPED_UNICODE),
            'info_label_es' => $settings['tour_info_label']['es'] ?? '',
            'info_label_en' => $settings['tour_info_label']['en'] ?? '',
            'info_url' => $url('tour_info_url'),
            'whatsapp_label_es' => $settings['tour_whatsapp_label']['es'] ?? '',
            'whatsapp_label_en' => $settings['tour_whatsapp_label']['en'] ?? '',
            'whatsapp_url' => $url('tour_whatsapp_url'),
            'sort_order' => 1,
        ];
    }
    return [
        'ok' => true,
        'csrf' => $csrf,
        'admin' => $admin ? $admin['username'] : null,
        'settings' => $settings,
        'policies' => $policies,
        'location' => $location,
        'tours' => $tours,
        'products' => $products,
    ];
}