<?php
// index.php : Assignment Service (Kelompok 6), port 8104
// Tahap 2E: /health, GET dan POST /api/assignments, DELETE /api/assignments/{id}
// Tiga endpoint /api/assignments wajib membawa token (diperiksa ke Authentication Service)
// GET dan POST memastikan course_id ada di Course Service (GET /api/courses/{id})
// Endpoint tambahan: GET /api/assignments/{id}

header('Content-Type: application/json');

$rid      = $_SERVER['HTTP_X_REQUEST_ID'] ?? 'req-001';
$method   = $_SERVER['REQUEST_METHOD'];
$path     = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$dataFile = __DIR__ . '/data/assignments.json';

// Mengirim respons sukses (format Bagian 8.1 modul)
function ok($data, $rid, $status = 200) {
    http_response_code($status);
    echo json_encode([
        'success' => true,
        'data'    => $data,
        'meta'    => ['request_id' => $rid],
    ]);
    exit;
}

// Mengirim respons gagal (format Bagian 8.2 modul)
function fail($status, $code, $message, $rid) {
    http_response_code($status);
    echo json_encode([
        'success' => false,
        'error'   => ['code' => $code, 'message' => $message],
        'meta'    => ['request_id' => $rid],
    ]);
    exit;
}

// Membaca data tugas dari berkas. Jika berkas belum ada, dibuat dengan data awal.
function loadAssignments($file) {
    if (!file_exists($file)) {
        if (!is_dir(dirname($file))) {
            mkdir(dirname($file), 0777, true);
        }
        $seed = [
            [
                'id'          => 'asg-001',
                'course_id'   => 'course-001',
                'title'       => 'Integrasi Mini LMS',
                'description' => 'Bangun satu service dan hubungkan lewat Gateway',
                'due_date'    => '2026-11-13',
            ],
        ];
        file_put_contents($file, json_encode($seed, JSON_PRETTY_PRINT));
    }
    $items = json_decode(file_get_contents($file), true);
    return is_array($items) ? $items : [];
}

// Membaca alamat service dari services.json (Bagian 9 modul)
function loadServices() {
    $file = __DIR__ . '/services.json';
    $cfg  = file_exists($file) ? json_decode(file_get_contents($file), true) : null;
    return is_array($cfg) ? $cfg : [];
}

// Memanggil service lain dengan batas waktu (timeout).
// status 0 berarti service tidak terjangkau atau melewati batas waktu.
function callService($url, $method, $headers, $timeout = 3) {
    $ctx = stream_context_create(['http' => [
        'method'        => $method,
        'header'        => implode("\r\n", $headers),
        'timeout'       => $timeout,
        'ignore_errors' => true,
    ]]);
    $start = microtime(true);
    $resp  = @file_get_contents($url, false, $ctx);
    if ($resp === false) {
        $timedOut = (microtime(true) - $start) >= ($timeout - 0.2);
        return ['status' => 0, 'timeout' => $timedOut, 'body' => null];
    }
    $status = 0;
    if (isset($http_response_header[0]) && preg_match('#HTTP/\S+\s+(\d{3})#', $http_response_header[0], $mm)) {
        $status = (int) $mm[1];
    }
    return ['status' => $status, 'timeout' => false, 'body' => json_decode($resp, true)];
}

// Membaca header Authorization dari request yang masuk
function getAuthHeader() {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($auth === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') {
                $auth = $v;
            }
        }
    }
    return $auth;
}

// Memeriksa token lewat Authentication Service: POST /api/auth/validate
function requireAuth($rid) {
    $auth = getAuthHeader();
    if (stripos($auth, 'Bearer ') !== 0 || trim(substr($auth, 7)) === '') {
        fail(401, 'unauthorized', 'Token tidak ada atau tidak valid', $rid);
    }

    $services = loadServices();
    if (empty($services['auth'])) {
        fail(503, 'service_unavailable', 'Alamat Authentication Service belum diatur di services.json', $rid);
    }

    $res = callService($services['auth'] . '/api/auth/validate', 'POST', [
        'Authorization: ' . $auth,
        'X-Request-ID: ' . $rid,
        'Content-Type: application/json',
        'Content-Length: 0',
    ]);

    if ($res['status'] === 0) {
        if ($res['timeout']) {
            fail(504, 'gateway_timeout', 'Authentication Service melewati batas waktu', $rid);
        }
        fail(503, 'service_unavailable', 'Authentication Service tidak dapat dihubungi', $rid);
    }
    if ($res['status'] === 200 && ($res['body']['data']['valid'] ?? false) === true) {
        return;
    }
    if ($res['status'] === 200 || $res['status'] === 401) {
        fail(401, 'unauthorized', 'Token tidak ada atau tidak valid', $rid);
    }
    fail(503, 'service_unavailable', 'Respons Authentication Service tidak sesuai kontrak', $rid);
}

// Memastikan course_id ada di Course Service: GET /api/courses/{id}
// (endpoint ini disediakan Kelompok 3, lihat API_CONTRACT Course)
function requireCourse($courseId, $rid) {
    $services = loadServices();
    if (empty($services['course'])) {
        fail(503, 'service_unavailable', 'Alamat Course Service belum diatur di services.json', $rid);
    }

    $res = callService($services['course'] . '/api/courses/' . rawurlencode($courseId), 'GET', [
        'Authorization: ' . getAuthHeader(),
        'X-Request-ID: ' . $rid,
    ]);

    if ($res['status'] === 0) {
        if ($res['timeout']) {
            fail(504, 'gateway_timeout', 'Course Service melewati batas waktu', $rid);
        }
        fail(503, 'service_unavailable', 'Course Service tidak dapat dihubungi', $rid);
    }
    if ($res['status'] === 200) {
        return;
    }
    if ($res['status'] === 404 && ($res['body']['error']['code'] ?? '') === 'course_not_found') {
        fail(404, 'course_not_found', 'Course tidak ditemukan', $rid);
    }
    if ($res['status'] === 504) {
        fail(504, 'gateway_timeout', 'Course Service melewati batas waktu', $rid);
    }
    fail(503, 'service_unavailable', 'Course Service tidak dapat memproses permintaan', $rid);
}

// GET /health
if ($path === '/health' && $method === 'GET') {
    ok(['service' => 'assignment', 'status' => 'healthy'], $rid);
}

// GET /api/assignments?course_id=...
if ($path === '/api/assignments' && $method === 'GET') {
    requireAuth($rid);
    $courseId = $_GET['course_id'] ?? '';
    if ($courseId === '') {
        fail(400, 'validation_error', 'Parameter course_id wajib diisi', $rid);
    }
    requireCourse($courseId, $rid);
    $all  = loadAssignments($dataFile);
    $list = array_values(array_filter($all, function ($a) use ($courseId) {
        return $a['course_id'] === $courseId;
    }));
    ok(['assignments' => $list], $rid);
}

// POST /api/assignments
if ($path === '/api/assignments' && $method === 'POST') {
    requireAuth($rid);
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') === false) {
        fail(415, 'unsupported_media_type', 'Content-Type harus application/json', $rid);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        fail(400, 'invalid_json', 'Body harus berupa JSON yang valid', $rid);
    }

    $courseId    = (isset($body['course_id']) && is_string($body['course_id'])) ? trim($body['course_id']) : '';
    $title       = (isset($body['title']) && is_string($body['title'])) ? trim($body['title']) : '';
    $description = (isset($body['description']) && is_string($body['description'])) ? trim($body['description']) : '';
    $dueDate     = (isset($body['due_date']) && is_string($body['due_date'])) ? trim($body['due_date']) : '';

    if ($courseId === '' || $title === '') {
        fail(400, 'validation_error', 'course_id dan title wajib diisi', $rid);
    }
    requireCourse($courseId, $rid);

    // Membuat id baru: asg-001, asg-002, dst.
    $all = loadAssignments($dataFile);
    $max = 0;
    foreach ($all as $a) {
        $n = (int) substr($a['id'], 4);
        if ($n > $max) {
            $max = $n;
        }
    }
    $new = [
        'id'          => 'asg-' . str_pad((string) ($max + 1), 3, '0', STR_PAD_LEFT),
        'course_id'   => $courseId,
        'title'       => $title,
        'description' => $description,
        'due_date'    => $dueDate,
    ];
    $all[] = $new;
    file_put_contents($dataFile, json_encode($all, JSON_PRETTY_PRINT));

    ok($new, $rid, 201);
}

// GET /api/assignments/{id} (endpoint tambahan, dipakai Submission Service)
if ($method === 'GET' && preg_match('#^/api/assignments/([A-Za-z0-9_-]+)$#', $path, $m)) {
    requireAuth($rid);
    foreach (loadAssignments($dataFile) as $a) {
        if ($a['id'] === $m[1]) {
            ok($a, $rid);
        }
    }
    fail(404, 'assignment_not_found', 'Assignment tidak ditemukan', $rid);
}

// DELETE /api/assignments/{id}
if ($method === 'DELETE' && preg_match('#^/api/assignments/([A-Za-z0-9_-]+)$#', $path, $m)) {
    requireAuth($rid);
    $id  = $m[1];
    $all = loadAssignments($dataFile);

    $found = false;
    $rest  = [];
    foreach ($all as $a) {
        if ($a['id'] === $id) {
            $found = true;
        } else {
            $rest[] = $a;
        }
    }

    if (!$found) {
        fail(404, 'assignment_not_found', 'Assignment tidak ditemukan', $rid);
    }

    file_put_contents($dataFile, json_encode($rest, JSON_PRETTY_PRINT));
    ok(['id' => $id, 'deleted' => true], $rid);
}

fail(404, 'not_found', 'Endpoint tidak ditemukan', $rid);