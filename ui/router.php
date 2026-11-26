<?php
// router.php : server web untuk UI Tugas (dipakai bersama `php -S`).
//
// Dua tugasnya:
//   1. Menyajikan berkas statis (index.html, css, js, font).
//   2. Meneruskan semua request /api/... ke API Gateway di sisi server.
//
// Mengapa perlu diteruskan? Browser hanya mau memanggil API yang beralamat sama dengan halaman
// (atau yang mengirim header CORS). Gateway dan service kita belum mengirim header CORS,
// jadi halaman memanggil /api/... di alamatnya sendiri, dan file ini yang berbicara ke Gateway.
// Pola yang sama dipakai saat hosting: satu alamat web untuk halaman dan API.
//
// Alamat Gateway dapat diubah lewat variabel lingkungan GATEWAY_URL
// (contoh: GATEWAY_URL=http://192.168.1.20:8101). Bawaannya http://127.0.0.1:8101.

$gateway = rtrim(getenv('GATEWAY_URL') ?: 'http://127.0.0.1:8101', '/');
$path    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

function jsonError($status, $code, $message) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error'   => ['code' => $code, 'message' => $message],
        'meta'    => ['request_id' => $_SERVER['HTTP_X_REQUEST_ID'] ?? 'ui-router'],
    ]);
    exit;
}

// ---------- 1. Teruskan /api/... ke Gateway ----------
if (strpos($path, '/api/') === 0) {
    $method = $_SERVER['REQUEST_METHOD'];
    $url    = $gateway . $path;
    if (!empty($_SERVER['QUERY_STRING'])) {
        $url .= '?' . $_SERVER['QUERY_STRING'];
    }

    // Header yang diteruskan: hanya yang dibutuhkan service.
    $headers = ['Accept: application/json'];
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!empty($_SERVER['HTTP_X_REQUEST_ID'])) {
        $headers[] = 'X-Request-ID: ' . $_SERVER['HTTP_X_REQUEST_ID'];
    }
    if (!empty($_SERVER['CONTENT_TYPE'])) {
        $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);   // lebih lama dari batas Gateway (5 detik)
    if (in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
    }

    $body   = curl_exec($ch);
    $errno  = curl_errno($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno === CURLE_OPERATION_TIMEDOUT) {
        jsonError(504, 'gateway_timeout', 'API Gateway tidak menjawab dalam batas waktu');
    }
    if ($errno !== 0 || $body === false || $status === 0) {
        jsonError(503, 'gateway_unavailable', 'API Gateway tidak dapat dihubungi');
    }

    http_response_code($status);
    header('Content-Type: application/json');
    echo $body;
    exit;
}

// ---------- 2. Berkas statis ----------
if ($path === '/' || $path === '/index.html') {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    exit;
}

// Berkas lain (css, js, font): `return false` meminta php -S menyajikannya apa adanya.
if (is_file(__DIR__ . $path) && basename($path) !== 'router.php') {
    return false;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Halaman tidak ditemukan';
