# Assignment Service: Mini LMS Terdistribusi (Kelompok 6)

Service untuk mengelola tugas (assignment) pada proyek Mini LMS Terdistribusi, mata kuliah Sistem Terdistribusi. Setiap tugas terkait dengan satu `course_id`.

## Identitas anggota dan pembagian kontribusi

| Nama | NIM | Kontribusi |
| --- | --- | --- |
| UCI ADITYANTIKASARI | 240209502001 | Implementasi service (tiga endpoint, /health, pemeriksaan token), kontrak API, koleksi Postman, repositori GitHub. Peran demo: Operator |
| NURHANDAYANI | 240209502024 | Penanggung jawab koordinasi antarkelompok. Peran demo: Pencatat |
| MUHAMMAD FAUZAN | 240209502034 | Penanggung jawab dokumentasi pengujian (TESTING.md dan bukti). Peran demo: Penguji |
| ANDI NURRIZQAH HAMDANA | 240209501084 | Penanggung jawab diagram alur. Peran demo: Penjelas alur |

## Informasi service

| Item | Nilai |
| --- | --- |
| Nama service | Assignment Service |
| Port | 8104 |
| Alamat | http://127.0.0.1:8104 |
| Bahasa dan runtime | PHP 8.2 (dari XAMPP) |
| Penyimpanan data | Berkas JSON di `data/assignments.json` (dibuat otomatis) |

## Cara menjalankan

1. Pastikan PHP terpasang. Cek dengan `php -v`.
2. Buka terminal di folder proyek ini.
3. Jalankan:

```
php -S 127.0.0.1:8104 index.php
```

4. Uji dengan `GET http://127.0.0.1:8104/health`. Hasil yang benar adalah status 200 dan `"status": "healthy"`.
5. Hentikan service dengan `Ctrl + C`.

Alamat service lain dibaca dari `services.json`. Berkas ini tidak berisi kata sandi atau token.

## Endpoint

Rincian request, response, dan status HTTP ada di [API_CONTRACT.md](API_CONTRACT.md).

| Metode | Path | Token |
| --- | --- | --- |
| GET | `/health` | tidak |
| GET | `/api/assignments?course_id=...` | wajib |
| POST | `/api/assignments` | wajib |
| DELETE | `/api/assignments/{id}` | wajib |
| GET | `/api/assignments/{id}` (endpoint tambahan, dipakai Submission Service) | wajib |

## Hubungan dengan service lain

- **Authentication Service** (Kelompok 1, port 8102): token diperiksa lewat `POST /api/auth/validate`.
- **Course Service** (Kelompok 3, port 8103): memastikan `course_id` ada lewat `GET /api/courses/{id}` sebelum tugas dibuat atau ditampilkan.
- **Monitoring Service** (Kelompok 7, port 8107): memanggil `GET /health` ke service ini.
- **Submission Service** (Kelompok 4, port 8105): memeriksa `assignment_id` ke service ini.

## Pengujian

Koleksi Postman ada di folder `postman/`. Ringkasan dan bukti pengujian ada di `docs/TESTING.md` dan `docs/bukti/`.

## Keterbatasan implementasi yang diketahui

- Kasus Authentication atau Course melewati batas waktu (504) belum diuji.
- Integrasi melalui API Gateway dan antar laptop belum diuji.
- Peran pengguna (`mahasiswa` atau `dosen`) belum dibedakan. Token yang sah dianggap boleh.
- Data disimpan di berkas JSON, belum memakai basis data, dan belum aman untuk akses bersamaan oleh banyak request.
- Belum ada pengujian otomatis. Pengujian dilakukan lewat Postman.