# API Contract: Assignment Service (Kelompok 6)

> Status: DRAFT. Bagian bertanda **[USULAN]** belum disepakati dengan kelompok lain.

## Informasi umum

- Port: 8104
- URL dasar: http://127.0.0.1:8104
- Format data: JSON
- Header yang dipakai:
  - `Content-Type: application/json` untuk request dan response JSON
  - `Authorization: Bearer <token>` untuk endpoint terproteksi
  - `X-Request-ID: <id unik>` agar request dapat ditelusuri lintas service

### Format respons sukses

```json
{
  "success": true,
  "data": { },
  "meta": { "request_id": "req-001" }
}
```

### Format respons gagal

```json
{
  "success": false,
  "error": {
    "code": "assignment_not_found",
    "message": "Assignment tidak ditemukan"
  },
  "meta": { "request_id": "req-001" }
}
```

Error tidak pernah dikirim dengan status 200.

### Bentuk objek Assignment

| Field | Tipe | Wajib saat dibuat | Keterangan |
| --- | --- | --- | --- |
| `id` | string | tidak (dibuat server) | Contoh: `asg-001` |
| `course_id` | string | ya | Harus ada di Course Service. Contoh: `course-001` |
| `title` | string | ya | Judul tugas. Contoh: `Integrasi Mini LMS` |
| `description` | string | tidak | **[USULAN]** Penjelasan tugas |
| `due_date` | string | tidak | **[USULAN]** Format `YYYY-MM-DD` |

Nama field `id` dan `course_id` mengikuti contoh pada modul (Bagian 11) dan harus sama persis di semua kelompok.

---

## Endpoint 0: Health check

- Metode dan URL: `GET /health`
- Autentikasi: tidak
- Request body: -
- Respons sukses: `200`

```json
{
  "success": true,
  "data": { "service": "assignment", "status": "healthy" },
  "meta": { "request_id": "req-001" }
}
```

- Respons gagal: -

---

## Endpoint 1: Daftar assignment berdasarkan course

- Metode dan URL: `GET /api/assignments?course_id=course-001`
- Autentikasi: Bearer token wajib
- Request body: -
- Respons sukses: `200`

```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "asg-001",
        "course_id": "course-001",
        "title": "Integrasi Mini LMS",
        "description": "Bangun satu service dan hubungkan lewat Gateway",
        "due_date": "2026-11-13"
      }
    ]
  },
  "meta": { "request_id": "req-001" }
}
```

Jika course belum punya tugas, `assignments` berisi daftar kosong `[]` dengan status 200.

- Respons gagal:

| Status | error.code | Penyebab |
| --- | --- | --- |
| 400 | `validation_error` | Query `course_id` tidak diisi **[USULAN]** |
| 401 | `unauthorized` | Token tidak ada atau tidak valid |
| 404 | `course_not_found` | `course_id` tidak ada di Course Service |
| 503 | `service_unavailable` | Course Service tidak dapat dihubungi |
| 504 | `gateway_timeout` | Course Service melewati batas waktu |

---

## Endpoint 2: Membuat assignment

- Metode dan URL: `POST /api/assignments`
- Autentikasi: Bearer token wajib
- Request body:

```json
{
  "course_id": "course-001",
  "title": "Integrasi Mini LMS",
  "description": "Bangun satu service dan hubungkan lewat Gateway",
  "due_date": "2026-11-13"
}
```

- Respons sukses: `201`

```json
{
  "success": true,
  "data": {
    "id": "asg-001",
    "course_id": "course-001",
    "title": "Integrasi Mini LMS",
    "description": "Bangun satu service dan hubungkan lewat Gateway",
    "due_date": "2026-11-13"
  },
  "meta": { "request_id": "req-001" }
}
```

- Respons gagal:

| Status | error.code | Penyebab |
| --- | --- | --- |
| 400 | `invalid_json` | Isi body bukan JSON yang valid |
| 400 | `validation_error` | `course_id` atau `title` kosong |
| 401 | `unauthorized` | Token tidak ada atau tidak valid |
| 404 | `course_not_found` | `course_id` tidak ada di Course Service |
| 415 | `unsupported_media_type` | `Content-Type` bukan `application/json` |
| 503 | `service_unavailable` | Course Service tidak dapat dihubungi |
| 504 | `gateway_timeout` | Course Service melewati batas waktu |

---

## Endpoint 3: Menghapus assignment

- Metode dan URL: `DELETE /api/assignments/{id}`, contoh `DELETE /api/assignments/asg-001`
- Autentikasi: Bearer token wajib
- Request body: -
- Respons sukses: `200`

```json
{
  "success": true,
  "data": { "id": "asg-001", "deleted": true },
  "meta": { "request_id": "req-001" }
}
```

- Respons gagal:

| Status | error.code | Penyebab |
| --- | --- | --- |
| 401 | `unauthorized` | Token tidak ada atau tidak valid |
| 404 | `assignment_not_found` | `id` tidak ditemukan |

---

## Endpoint tambahan: Detail satu assignment

Bukan endpoint wajib di modul. Disediakan agar Submission Service dapat memastikan `assignment_id` ada (Bagian 6). Perlu dikonfirmasi dengan Kelompok 4.

- Metode dan URL: `GET /api/assignments/{id}`, contoh `GET /api/assignments/asg-001`
- Autentikasi: Bearer token wajib
- Request body: -
- Respons sukses: `200`, `data` berisi satu objek Assignment (bentuk sama seperti Endpoint 2)

```json
{
  "success": true,
  "data": {
    "id": "asg-001",
    "course_id": "course-001",
    "title": "Integrasi Mini LMS",
    "description": "Bangun satu service dan hubungkan lewat Gateway",
    "due_date": "2026-11-13"
  },
  "meta": { "request_id": "req-001" }
}
```

- Respons gagal:

| Status | error.code | Penyebab |
| --- | --- | --- |
| 401 | `unauthorized` | Token tidak ada atau tidak valid |
| 404 | `assignment_not_found` | `id` tidak ditemukan |

---

## Dependensi ke service lain

- **Course Service** (Kelompok 3, port 8103): memastikan `course_id` ada sebelum membuat atau menampilkan assignment. Pemeriksaan memakai `GET /api/courses/{id}` (endpoint tambahan dari Kelompok 3, dibuat khusus untuk Assignment) dengan header `Authorization` dan `X-Request-ID` yang diteruskan dari request client. Respons `200` berarti course ada. Respons `404` dengan kode `course_not_found` diteruskan sebagai `404 course_not_found`. Jika Course tidak dapat dihubungi, kembalikan 503. Jika melewati batas waktu, kembalikan 504. Alamatnya dibaca dari `services.json`, tidak ditulis berulang di kode. Panggilan memakai batas waktu (*timeout*) 3 detik.
- **Authentication Service** (Kelompok 1, port 8102): memastikan token valid dengan memanggil `POST /api/auth/validate` yang membawa header `Authorization: Bearer <token>`. Respons `200` berisi `data.valid: true` dan `data.user`. Respons `401` berarti token ditolak, dan Assignment meneruskannya sebagai `401 unauthorized`. Jika Authentication tidak dapat dihubungi, kembalikan 503. Jika melewati batas waktu, kembalikan 504.

## Hal yang masih harus disepakati

1. **Course:** SUDAH JELAS dari kontrak Kelompok 3. Assignment memakai `GET /api/courses/{id}`. Jawaban untuk pertanyaan Kelompok 3: jika `course_id` tidak ada, Assignment membalas `404` dengan kode `course_not_found`.
2. **Authentication:** SUDAH JELAS dari kontrak Kelompok 1. Token diperiksa lewat `POST /api/auth/validate`, dan token diterbitkan pada `data.token` saat login.
3. **Submission:** apakah endpoint tambahan `GET /api/assignments/{id}` sesuai kebutuhan mereka untuk memeriksa `assignment_id`?
4. **Gateway:** nama service pada rute `/api/{service}/{path}` untuk Assignment, dan alamat `assignment` pada `services.json`.
5. **Kode error:** sudah dibandingkan dengan kontrak Kelompok 1, 2, dan 3. Kode yang sama: `unauthorized`, `validation_error`, `unsupported_media_type`. Kode untuk service lain yang mati atau lambat berbeda di tiap kelompok, tetapi statusnya sama (503 dan 504), jadi tidak diseragamkan. Kelompok 1 tidak menuliskan kode error pada kontraknya (hanya `username_already_exists`). Kontrak Kelompok 4, 5, dan 7 belum dibandingkan.