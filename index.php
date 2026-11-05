<?php
// index.php : Assignment Service (Kelompok 6)
header('Content-Type: application/json');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$rid  = $_SERVER['HTTP_X_REQUEST_ID'] ?? 'req-001';

if ($path === '/health' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data'    => ['service' => 'assignment', 'status' => 'healthy'],
        'meta'    => ['request_id' => $rid],
    ]);
    exit;
}

http_response_code(404);
echo json_encode([
    'success' => false,
    'error'   => ['code' => 'not_found', 'message' => 'Endpoint tidak ditemukan'],
    'meta'    => ['request_id' => $rid],
]);