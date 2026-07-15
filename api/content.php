<?php
/**
 * Endpoint público (sin login) que devuelve TODO el contenido del micrositio
 * como un único JSON, para que index.html / script.js lo inyecten en el DOM.
 *
 * Si la base de datos falla o está vacía, devuelve 200 con {"ok":false}
 * y el micrositio seguirá mostrando el contenido estático del HTML (fallback).
 */

require_once dirname(__DIR__) . '/dashboard/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');
header('X-Content-Type-Options: nosniff');

try {
    $rows = db()->query('SELECT id, value_es, value_en FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $r) {
        $settings[$r['id']] = ['es' => $r['value_es'], 'en' => $r['value_en']];
    }
    $policies = db()->query(
        'SELECT icon, title_es, title_en, text_es, text_en FROM policies ORDER BY sort_order, id'
    )->fetchAll();
    $location = db()->query(
        'SELECT title_es, title_en, text_es, text_en FROM location_items ORDER BY sort_order, id'
    )->fetchAll();

    echo json_encode([
        'ok'       => true,
        'settings' => $settings,
        'policies' => $policies,
        'location' => $location,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['ok' => false]);
}
