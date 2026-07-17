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

require_login();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No se envió ningún archivo.']);
    exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Error al subir el archivo.']);
    exit;
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
if (!in_array($ext, $allowed)) {
    http_response_code(400);
    echo json_encode(['error' => 'Formato no permitido. Usa: jpg, png, gif, webp.']);
    exit;
}

$dir = __DIR__ . '/../uploads/tours/';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$name = uniqid('tour_') . '.' . $ext;
$dest = $dir . $name;

if (move_uploaded_file($file['tmp_name'], $dest)) {
    echo json_encode([
        'ok' => true,
        'url' => 'uploads/tours/' . $name,
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo guardar el archivo.']);
}
