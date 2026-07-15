<?php
/**
 * API del dashboard (protegida).
 *  GET  api.php            -> devuelve JSON con toda la configuración editable.
 *  POST api.php            -> guarda una sección.
 *        Body JSON: { "type": "settings"|"policies"|"location", "data": {...} }
 *
 *  Acción especial: POST {type:"login", data:{username,password}} -> no requiere sesión.
 *  Acción especial: POST {type:"change_password", data:{new_password}} -> requiere sesión.
 */

require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// === Dispatch por método HTTP ===
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body   = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $body['type'] ?? $_GET['action'] ?? '';

// ----- LOGIN: único endpoint público -----
if ($action === 'login') {
    $u = (string)($body['data']['username'] ?? '');
    $p = (string)($body['data']['password'] ?? '');
    if (attempt_login($u, $p)) {
        echo json_encode(['ok' => true, 'csrf' => csrf_token()]);
    } else {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => too_many_attempts()
            ? 'Demasiados intentos. Intenta de nuevo en 5 minutos.'
            : 'Usuario o contraseña incorrectos.']);
    }
    exit;
}

// ----- A partir de aquí requiere sesión -----
require_login();
csrf_check();

if ($method === 'GET') {
    return_full_state();
    exit;
}

if ($method === 'POST') {
    switch ($action) {
        case 'settings':
            save_settings($body['data'] ?? []);
            break;
        case 'policies':
            save_policies($body['data'] ?? []);
            break;
        case 'location':
            save_location($body['data'] ?? []);
            break;
        case 'change_password':
            $np = (string)($body['data']['new_password'] ?? '');
            if (strlen($np) < 6) {
                http_response_code(400);
                echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres.']);
                exit;
            }
            $h = password_hash($np, PASSWORD_DEFAULT);
            db()->prepare('UPDATE admin SET password_hash = ? WHERE username = ?')
                ->execute([$h, $_SESSION['admin_user']]);
            echo json_encode(['ok' => true]);
            exit;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Acción desconocida: ' . $action]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);

// ============== Helpers ==============

function return_full_state(): void {
    // settings (map id => {es,en})
    $rows = db()->query('SELECT id, value_es, value_en FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $r) {
        $settings[$r['id']] = ['es' => $r['value_es'], 'en' => $r['value_en']];
    }
    // policies
    $st = db()->query('SELECT * FROM policies ORDER BY sort_order, id')->fetchAll();
    // location
    $li = db()->query('SELECT * FROM location_items ORDER BY sort_order, id')->fetchAll();
    echo json_encode([
        'ok'      => true,
        'csrf'    => $_SESSION['csrf'] ?? null,
        'admin'   => $_SESSION['admin_user'] ?? null,
        'settings' => $settings,
        'policies' => $st,
        'location' => $li,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function save_settings(array $data): void {
    $pdo = db();
    $up = $pdo->prepare(
        'INSERT INTO settings (id, value_es, value_en) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value_es = VALUES(value_es), value_en = VALUES(value_en)'
    );
    $pdo->beginTransaction();
    try {
        foreach ($data as $id => $vals) {
            if (!preg_match('/^[a-z0-9_]{1,78}$/i', $id)) continue; // sanitize id
            $es = trim((string)($vals['es'] ?? ''));
            $en = trim((string)($vals['en'] ?? ''));
            $up->execute([$id, $es, $en]);
        }
        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo guardar: ' . $e->getMessage()]);
    }
}

function save_policies(array $items): void {
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM policies'); // full-replace: se reciben todas
        $ins = $pdo->prepare(
            'INSERT INTO policies (icon, title_es, title_en, text_es, text_en, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $i = 0;
        foreach ($items as $it) {
            $icon = mb_substr(trim((string)($it['icon'] ?? '✅')), 0, 16);
            $tes  = trim((string)($it['title_es'] ?? ''));
            $ten  = trim((string)($it['title_en'] ?? ''));
            $xes  = trim((string)($it['text_es'] ?? ''));
            $xen  = trim((string)($it['text_en'] ?? ''));
            $ord  = (int)($it['sort_order'] ?? (++$i));
            if ($tes === '' && $ten === '') continue;
            $ins->execute([$icon, $tes, $ten, $xes, $xen, $ord]);
            $i++;
        }
        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'No se guardaron las políticas: ' . $e->getMessage()]);
    }
}

function save_location(array $items): void {
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM location_items');
        $ins = $pdo->prepare(
            'INSERT INTO location_items (title_es, title_en, text_es, text_en, sort_order)
             VALUES (?, ?, ?, ?, ?)'
        );
        $i = 0;
        foreach ($items as $it) {
            $tes  = trim((string)($it['title_es'] ?? ''));
            $ten  = trim((string)($it['title_en'] ?? ''));
            $xes  = trim((string)($it['text_es'] ?? ''));
            $xen  = trim((string)($it['text_en'] ?? ''));
            $ord  = (int)($it['sort_order'] ?? (++$i));
            if ($tes === '' && $ten === '') continue;
            $ins->execute([$tes, $ten, $xes, $xen, $ord]);
            $i++;
        }
        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'No se guardó la ubicación: ' . $e->getMessage()]);
    }
}
