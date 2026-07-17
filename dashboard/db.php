<?php
/**
 * Conexión PDO a MySQL y utilidades de configuración.
 * Cargado por el resto de scripts del dashboard.
 */

if (!defined('HSN_ROOT')) {
    define('HSN_ROOT', dirname(__DIR__)); // raíz del proyecto (donde está index.html)
}

function load_config(): array {
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Falta dashboard/config.php. Copia config.php.example a config.php y rellena los datos.";
        exit;
    }
    $cfg = require $path;
    if (!is_array($cfg) || empty($cfg['db']['name']) || $cfg['db']['pass'] === 'CAMBIA_ESTA_CLAVE') {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Configura dashboard/config.php con las credenciales reales de MySQL.";
        exit;
    }
    return $cfg;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $cfg = load_config()['db'];
        $dsn = empty($cfg['socket'])
        ? "mysql:host={$cfg['host']};dbname={$cfg['name']};charset={$cfg['charset']}"
        : "mysql:unix_socket={$cfg['socket']};dbname={$cfg['name']};charset={$cfg['charset']}";
        try {
            $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'No se pudo conectar a la base de datos.']);
            exit;
        }
    }
    return $pdo;
}

function setting(string $key, string $lang = 'es'): ?string {
    $stmt = db()->prepare('SELECT value_es, value_en FROM settings WHERE id = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) return null;
    return $lang === 'en' ? $row['value_en'] : $row['value_es'];
}
