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

session_name('hsn_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => false,
]);
session_start();

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
    $result = attempt_login($u, $p);
    if ($result) {
        echo json_encode(['ok' => true, 'token' => $result['token'], 'csrf' => $result['csrf']]);
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

if ($method === 'GET') {
    return_full_state();
    exit;
}

if ($method === 'POST') {
    csrf_check();
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
        case 'tours':
            save_tours($body['data'] ?? []);
            break;
        case 'products':
            save_products($body['data'] ?? []);
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
    $data = api_get_state();
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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

function save_tours(array $items): void {
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM tours');
        $ins = $pdo->prepare(
            'INSERT INTO tours (title_es, title_en, description_es, description_en, reception_es, reception_en, image, tags_json, info_label_es, info_label_en, info_url, whatsapp_label_es, whatsapp_label_en, whatsapp_url, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $i = 0;
        foreach ($items as $it) {
            $tes = trim((string)($it['title_es'] ?? ''));
            $ten = trim((string)($it['title_en'] ?? ''));
            if ($tes === '' && $ten === '') continue;
            $des = trim((string)($it['description_es'] ?? ''));
            $den = trim((string)($it['description_en'] ?? ''));
            $res = trim((string)($it['reception_es'] ?? ''));
            $ren = trim((string)($it['reception_en'] ?? ''));
            $img = trim((string)($it['image'] ?? ''));
            $tags = isset($it['tags']) ? json_encode($it['tags'], JSON_UNESCAPED_UNICODE) : '[]';
            $ile = trim((string)($it['info_label_es'] ?? ''));
            $ien = trim((string)($it['info_label_en'] ?? ''));
            $iur = trim((string)($it['info_url'] ?? ''));
            $wle = trim((string)($it['whatsapp_label_es'] ?? ''));
            $wen = trim((string)($it['whatsapp_label_en'] ?? ''));
            $wur = trim((string)($it['whatsapp_url'] ?? ''));
            $ord = (int)($it['sort_order'] ?? (++$i));
            $ins->execute([$tes, $ten, $des, $den, $res, $ren, $img, $tags, $ile, $ien, $iur, $wle, $wen, $wur, $ord]);
            $i++;
        }
        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'No se guardaron los tours: ' . $e->getMessage()]);
    }
}

function save_products(array $items): void {
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM products');
        $ins = $pdo->prepare(
            'INSERT INTO products (icon, name_es, name_en, price_es, price_en, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $i = 0;
        foreach ($items as $it) {
            $icon = mb_substr(trim((string)($it['icon'] ?? '🛍️')), 0, 16);
            $nes  = trim((string)($it['name_es'] ?? ''));
            $nen  = trim((string)($it['name_en'] ?? ''));
            $pes  = trim((string)($it['price_es'] ?? ''));
            $pen  = trim((string)($it['price_en'] ?? ''));
            $ord  = (int)($it['sort_order'] ?? (++$i));
            if ($nes === '' && $nen === '') continue;
            $ins->execute([$icon, $nes, $nen, $pes, $pen, $ord]);
            $i++;
        }
        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'No se guardaron los productos: ' . $e->getMessage()]);
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
