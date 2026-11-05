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
| 400 | `validation_error` | JSON rusak, atau `course_id` / `title` kosong |
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

## Endpoint tambahan [USULAN]: Detail satu assignment

Modul hanya mewajibkan tiga operasi, tetapi Submission Service perlu memastikan `assignment_id` ada (Bagian 6 dan 10.2). Endpoint ini mempermudah pemeriksaan itu. Perlu disepakati dengan Kelompok Submission.

- Metode dan URL: `GET /api/assignments/{id}`
- Autentikasi: Bearer token wajib
- Respons sukses: `200`, `data` berisi satu objek Assignment (bentuk sama seperti Endpoint 2)
- Respons gagal: `401 unauthorized`, `404 assignment_not_found`

---

## Dependensi ke service lain

- **Course Service** (Kelompok 3, port 8103): memastikan `course_id` ada sebelum membuat atau menampilkan assignment. Pemeriksaan memakai endpoint wajib `GET /api/courses`, lalu mencari `course_id` di daftar yang dikembalikan. Alamatnya dibaca dari `services.json`, tidak ditulis berulang di kode. Panggilan memakai batas waktu (*timeout*) beberapa detik. Jika Course tidak dapat dihubungi, kembalikan 503. Jika melewati batas waktu, kembalikan 504.
- **Authentication Service** (Kelompok 1, port 8102): memastikan token valid. Cara pemeriksaannya mengikuti kontrak kelompok Authentication.

## Hal yang masih harus disepakati

1. **Course:** Assignment memakai `GET /api/courses` (endpoint wajib di modul). Yang perlu dikonfirmasi hanya bentuk responsnya, yaitu nama field daftar course dan nama field id (misalnya `data.courses[].id`), supaya pencarian `course_id` benar.
2. **Authentication:** nama field token pada respons login dan cara memeriksa token (`GET /api/auth/me` atau `POST /api/auth/validate`).
3. **Submission:** apakah endpoint tambahan `GET /api/assignments/{id}` disetujui?
4. **Gateway:** nama service pada rute `/api/{service}/{path}` untuk Assignment, dan alamat `assignment` pada `services.json`.
5. **Semua kelompok:** kode error yang dipakai. Modul hanya memberi contoh `assignment_not_found` dan `not_found`, sisanya pada draf ini adalah usulan.
