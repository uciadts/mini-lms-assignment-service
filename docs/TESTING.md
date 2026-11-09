# Rangkuman Pengujian: Assignment Service (Kelompok 6)

- Tanggal pengujian: 9 November 2026
- Penyusun: UCI ADITYANTIKASARI
- Alat uji: Postman. Koleksi ada di `postman/Mini-LMS.postman_collection.json`
- Lingkungan: Assignment Service (PHP 8.2.12, port 8104) dan Authentication Service Kelompok 1 (port 8102), keduanya pada laptop yang sama. Environment Postman: `Lokal`.

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

## Uji kegagalan: service Authentication tidak berjalan

Tujuannya membuktikan Assignment Service tetap menjawab dengan rapi saat service yang dipanggilnya mati, dan pulih sendiri saat service itu hidup kembali (Bagian 10.3 modul).

| No | Langkah | Hasil yang diharapkan | Hasil sebenarnya | Bukti |
| --- | --- | --- | --- | --- |
| 9 | Health Assignment saat Authentication dimatikan (pukul 20.22) | 200, Assignment tetap sehat | 200, `status` = `healthy` | `01-health-assignment-200.png` |
| 10 | Daftar tugas dengan token saat Authentication mati (pukul 20.24) | 503, kode `service_unavailable` | 503, pesan "Authentication Service tidak dapat dihubungi" | `02-auth-mati-503.png` |
| 11 | Authentication dihidupkan kembali, cek `GET :8102/health` (pukul 20.26) | 200 | 200, `status` = `healthy` | `03-auth-hidup-kembali-200.png` |
| 12 | Daftar tugas dengan token setelah Authentication hidup (pukul 20.28) | 200 | 200, berisi tugas `asg-001` | `04-daftar-assignment-200-pulih.png` |

## Belum diuji

- Pemeriksaan `course_id` ke Course Service belum diimplementasikan, sehingga belum ada pengujiannya.
- Kasus Authentication melewati batas waktu (504) belum diuji.
- Integrasi melalui API Gateway dan antar laptop belum diuji.
- Pembedaan peran `mahasiswa` dan `dosen` belum diimplementasikan.
