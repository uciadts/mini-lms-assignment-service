# Rangkuman Pengujian: Assignment Service (Kelompok 6)

- Tanggal pengujian: 9 dan 12 November 2026
- Penyusun: UCI ADITYANTIKASARI
- Alat uji: Postman. Koleksi ada di `postman/Mini-LMS.postman_collection.json`
- Lingkungan: Assignment Service (PHP 8.2.12, port 8104), Authentication Service Kelompok 1 (port 8102), dan Course Service Kelompok 3 (port 8103), semuanya pada laptop yang sama. Environment Postman: `Lokal`.

## Cakupan

Pengujian mencakup kasus sukses, input salah (400), sumber daya tidak ditemukan (404), tanpa token (401), dan uji kegagalan saat service lain tidak berjalan (503), sesuai Bagian 12.4 modul.

## Hasil pengujian fungsional

| No | Skenario | Request | Hasil yang diharapkan | Hasil sebenarnya | Bukti |
| --- | --- | --- | --- | --- | --- |
| 1 | Health check | `GET /health` | 200, status `healthy` | 200, `data.service` = `assignment`, `data.status` = `healthy` | `01-health-assignment-200.png` |
| 2 | Login ke Authentication | `POST :8102/api/auth/login` | 200, token diterbitkan | 200, tes Postman lulus | `05-collection-runner-15-lulus.png` |
| 3 | Daftar tugas dengan token | `GET /api/assignments?course_id=course-001` | 200, berisi daftar tugas | 200, berisi tugas `asg-001` "Integrasi Mini LMS" | `04-daftar-assignment-200-pulih.png` |
| 4 | Daftar tugas tanpa token | `GET /api/assignments?course_id=course-001` tanpa Authorization | 401 | 401, kedua tes Postman lulus | `05-collection-runner-15-lulus.png` |
| 5 | Daftar tugas tanpa `course_id` | `GET /api/assignments` dengan token | 400, kode `validation_error` | 400, tes Postman lulus | `05-collection-runner-15-lulus.png` |
| 6 | Membuat tugas | `POST /api/assignments` dengan token | 201, berisi `id` baru | Lulus pada Collection Runner (ringkasan 15 dari 15 tes lulus) | `05-collection-runner-15-lulus.png` (ringkasan) |
| 7 | Menghapus tugas | `DELETE /api/assignments/{id}` dengan token | 200, `deleted` bernilai `true` | Lulus pada Collection Runner (ringkasan 15 dari 15 tes lulus) | `05-collection-runner-15-lulus.png` (ringkasan) |
| 8 | Menghapus tugas yang tidak ada | `DELETE /api/assignments/{id}` untuk id yang sudah terhapus | 404, kode `assignment_not_found` | Lulus pada Collection Runner (ringkasan 15 dari 15 tes lulus) | `05-collection-runner-15-lulus.png` (ringkasan) |

## Hasil Collection Runner

Dijalankan pada 9 November 2026 pukul 21.02 dengan environment `Lokal`, 1 iterasi. Hasil: 15 tes, 15 lulus, 0 gagal, 0 error, durasi sekitar 2 detik.

Catatan: Runner ini dijalankan sebelum pemeriksaan `course_id` ke Course Service dipasang di kode, sehingga hasilnya belum mencakup pemeriksaan tersebut.

Dijalankan ulang pada 12 November 2026, setelah pemeriksaan `course_id` dipasang, dengan Authentication Service, Course Service, dan Assignment Service berjalan bersamaan dan environment `Lokal`. Hasil: 17 tes, 17 lulus, 0 gagal. Bukti: `10-collection-runner-setelah-course.png`.

## Uji kegagalan: service Authentication tidak berjalan

Tujuannya membuktikan Assignment Service tetap menjawab dengan rapi saat service yang dipanggilnya mati, dan pulih sendiri saat service itu hidup kembali (Bagian 10.3 modul).

| No | Langkah | Hasil yang diharapkan | Hasil sebenarnya | Bukti |
| --- | --- | --- | --- | --- |
| 9 | Health Assignment saat Authentication dimatikan (pukul 20.22) | 200, Assignment tetap sehat | 200, `status` = `healthy` | `01-health-assignment-200.png` |
| 10 | Daftar tugas dengan token saat Authentication mati (pukul 20.24) | 503, kode `service_unavailable` | 503, pesan "Authentication Service tidak dapat dihubungi" | `02-auth-mati-503.png` |
| 11 | Authentication dihidupkan kembali, cek `GET :8102/health` (pukul 20.26) | 200 | 200, `status` = `healthy` | `03-auth-hidup-kembali-200.png` |
| 12 | Daftar tugas dengan token setelah Authentication hidup (pukul 20.28) | 200 | 200, berisi tugas `asg-001` | `04-daftar-assignment-200-pulih.png` |

## Pemeriksaan course_id ke Course Service

Assignment memeriksa `course_id` lewat `GET /api/courses/{id}` di Course Service Kelompok 3 sebelum membuat atau menampilkan tugas. Course Service dijalankan pada laptop yang sama dengan course `course-001`.

| No | Langkah | Hasil yang diharapkan | Hasil sebenarnya | Bukti |
| --- | --- | --- | --- | --- |
| 13 | Daftar tugas dengan `course_id=course-001` (course ada) | 200 | 200, sesuai harapan | `06-course-ada-200.png` |
| 14 | Daftar tugas dengan `course_id=course-999` (course tidak ada) | 404, kode `course_not_found` | 404, sesuai harapan | `07-course-tidak-ada-404.png` |
| 15 | Course Service dimatikan, lalu daftar tugas dengan `course_id=course-001` | 503, kode `service_unavailable` | 503, sesuai harapan | `08-course-mati-503.png` |
| 16 | Course Service dihidupkan kembali, lalu daftar tugas dengan `course_id=course-001` | 200 | 200, sesuai harapan | `09-course-pulih-200.png` |

## Pengujian melalui API Gateway (Kelompok 5)

Tujuannya membuktikan Assignment dapat diakses lewat Gateway (port 8101), sesuai Bagian 10 dan 12 modul. Semua service berjalan pada laptop yang sama.

**Temuan awal.** Dengan Gateway Kelompok 5 versi GitHub (commit 9 November 2026), `GET /api/assignments?course_id=course-001` dengan token dijawab 404 dengan kode `service_not_found` ("Service 'assignments' tidak terdaftar"). Penyebabnya ada dua: Gateway mencari nama `assignments` di `services.json` padahal kuncinya `assignment`, dan alamat tujuan disusun ulang menjadi `/api/assignment/...` padahal endpoint Assignment adalah `/api/assignments`. Bukti: `12-gateway-asli-404.png`.

**Penanganan.** Dua perubahan kecil pada `index.php` Gateway: (1) tabel alias yang menerjemahkan `assignments` menjadi `assignment` (juga `courses`, `submissions`, `notifications`), dan (2) path asli dari client diteruskan apa adanya ke service tujuan. Perubahan ini disampaikan kepada Kelompok 5. Pengujian di bawah memakai salinan Gateway yang sudah memuat perubahan tersebut.

**Hasil.** Dijalankan pada 12 November 2026 pukul 12.53 dengan environment Postman `Gateway` (`base_url` = `http://127.0.0.1:8101`), dengan Authentication, Course, Assignment, dan Gateway berjalan bersamaan. Hasil: 21 tes, 21 lulus, 0 gagal, 0 error. Bukti: `11-collection-runner-lewat-gateway.png`.

Catatan:

- Request `Login (Authentication)` memanggil Authentication langsung (port 8102), tidak lewat Gateway.
- Tes `Health Assignment` memanggil `{{base_url}}/health`, sehingga yang menjawab adalah Gateway, bukan Assignment.

## Uji kegagalan lewat Gateway: service Assignment tidak berjalan

Tujuannya membuktikan Gateway tetap menjawab dengan rapi saat Assignment mati, dan semuanya pulih saat Assignment dihidupkan kembali (Bagian 10.3 modul). Pengujian memakai salinan Gateway yang sudah ditambal dan environment Postman `Gateway`, dengan Authentication, Course, dan Gateway tetap berjalan.

| No | Langkah | Hasil yang diharapkan | Hasil sebenarnya | Bukti |
| --- | --- | --- | --- | --- |
| 17 | Assignment dimatikan (Ctrl + C), lalu `GET :8101/api/assignments?course_id=course-001` dengan token | 503, kode `service_unavailable` | 503, pesan "Service tujuan tidak dapat dihubungi", waktu respons sekitar 2 detik | `13-gateway-assignment-mati-503.png` |
| 18 | Assignment dihidupkan kembali, lalu request yang sama | 200 | 200, berisi tugas `asg-001` dan `asg-002`, waktu respons 212 ms | `14-gateway-assignment-pulih-200.png` |

## Belum diuji

- Pemeriksaan `course_id` pada pembuatan tugas (POST) belum tercatat pengujiannya di dokumen ini.
- Kasus Authentication atau Course melewati batas waktu (504) belum diuji.
- Integrasi antar laptop belum diuji.
- Pembedaan peran `mahasiswa` dan `dosen` belum diimplementasikan.