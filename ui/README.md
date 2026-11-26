# UI Tugas (Assignment Service, Kelompok 6)

Halaman web untuk Assignment Service. Fungsinya sama dengan koleksi Postman, tetapi lewat tampilan: masuk, pilih course, lihat daftar tugas, lihat detail, buat tugas, dan hapus tugas. Semua aksi memanggil API lewat API Gateway (port 8101).

Tidak memakai framework dan tidak perlu `npm install`. Hanya HTML, CSS, JavaScript, dan satu berkas PHP kecil.

## Cara menjalankan

1. Nyalakan service seperti biasa, masing-masing di terminalnya sendiri: Authentication (8102), Course (8103), Assignment (8104), dan API Gateway (8101).
2. Buka terminal baru di folder `ui` ini, lalu jalankan:

```
php -S 127.0.0.1:8110 router.php
```

3. Buka http://127.0.0.1:8110 di browser.
4. Masuk dengan akun contoh (tombol di halaman masuk): `dosen_distribusi` atau `mahasiswa01`, kata sandi `password123`.

Berhenti dengan `Ctrl + C`.

Jika Gateway berjalan di laptop lain, atur alamatnya sebelum menjalankan:

```
PowerShell:  $env:GATEWAY_URL = "http://192.168.1.20:8101"
CMD:         set GATEWAY_URL=http://192.168.1.20:8101
```

## Mengapa ada router.php

Browser hanya mengizinkan halaman memanggil API yang beralamat sama dengannya, kecuali API itu mengirim header CORS. Gateway dan service kita belum mengirim header CORS. Karena itu halaman memanggil `/api/...` di alamatnya sendiri, dan `router.php` meneruskannya ke Gateway dari sisi server.

Pola ini sama dengan yang dibutuhkan saat hosting satu web untuk semua service: satu alamat untuk halaman dan `/api`.

```
Browser -> web UI (8110) -> API Gateway (8101) -> Authentication / Course / Assignment
              router.php
```

## Struktur berkas

| Berkas | Isi |
| --- | --- |
| `index.html` | Kerangka halaman |
| `router.php` | Menyajikan berkas statis dan meneruskan `/api/...` ke Gateway |
| `assets/js/config.js` | Pengaturan: daftar course, akun contoh, batas waktu. Satu-satunya berkas yang diubah saat dipindah |
| `assets/js/api.js` | Semua panggilan API, penyeragaman hasil, dan pencatatan Jejak request |
| `assets/js/app.js` | Halaman masuk dan halaman tugas |
| `assets/css/style.css` | Tampilan |
| `assets/fonts/` | Font disimpan lokal, jadi halaman tidak butuh internet |

## Hubungan tombol dengan endpoint

| Aksi di halaman | Request |
| --- | --- |
| Masuk | `POST /api/auth/login` |
| Buka course / Muat ulang | `GET /api/assignments?course_id=...` |
| Detail | `GET /api/assignments/{id}` |
| Buat tugas | `POST /api/assignments` |
| Hapus | `DELETE /api/assignments/{id}` |

Tabel Jejak request di bagian bawah halaman mencatat 8 request terakhir beserta status HTTP-nya. Tabel ini berguna saat demo untuk menunjukkan 200, 201, 401, 404, dan 503 dari tindakan nyata di halaman.

Kegagalan ditampilkan dengan kalimat yang menjelaskan penyebab dan langkah perbaikan, misalnya Course Service mati (503) atau course tidak ada (404).

## Menggabungkan dengan UI kelompok lain (satu web untuk semua service)

Syaratnya hanya satu: server web gabungan meneruskan `/api/...` ke Gateway.

- **Memakai `router.php` yang sama.** Letakkan isi folder ini (atau folder kelompok lain) di bawah folder web gabungan, dan pakai satu `router.php` untuk semuanya.
- **Apache atau Nginx.** Sajikan folder ini sebagai berkas statis, lalu teruskan `/api/` ke Gateway. Contoh (belum diuji kelompok kami):

```
# Nginx
location /api/ {
    proxy_pass http://127.0.0.1:8101;
    proxy_set_header Authorization $http_authorization;
}

# Apache (mod_proxy aktif)
ProxyPass        /api http://127.0.0.1:8101/api
ProxyPassReverse /api http://127.0.0.1:8101/api
```

- **Satu login untuk semua.** Token disimpan di browser dengan kunci `lms_token` (lihat `config.js`). UI kelompok lain yang memakai kunci yang sama akan ikut masuk dan keluar bersama halaman ini.
- Jika halaman dipasang di subfolder, semua jalur berkas di `index.html` sudah relatif. Hanya `API_BASE` di `config.js` yang perlu disesuaikan jika `/api` tidak berada di akar web.
- Setelah demo, ubah `SHOW_DEMO_ACCOUNTS` di `config.js` menjadi `false` agar akun contoh tidak tampil.

## Pengujian

Diuji otomatis dengan browser sungguhan (Playwright), 29 pemeriksaan, semua lulus:

- masuk salah, kosong, dan benar; sesi bertahan setelah muat ulang; keluar; token palsu kembali ke halaman masuk (401)
- daftar per course, tenggat lewat ditandai, course kosong, course tidak ada (404)
- buat tugas (201), validasi judul kosong, hapus dengan konfirmasi, detail
- Course, Authentication, Assignment, dan Gateway dimatikan satu per satu: pesan kesalahan tampil dan halaman pulih setelah service dinyalakan lagi (503)
- tampilan layar HP tanpa gulir horizontal

Catatan: pengujian memakai Assignment Service dan Gateway Kelompok 5 yang asli, tetapi Authentication dan Course berupa tiruan yang mengikuti kontrak API (`data.token` pada login, `data.valid` pada validate, `course_not_found` pada 404). Pengujian dengan Authentication dan Course yang asli dilakukan di laptop kelompok.

## Keterbatasan

- Belum ada fitur mengubah tugas, karena Assignment Service belum punya endpoint ubah.
- Peran (dosen atau mahasiswa) hanya ditampilkan, belum membedakan hak akses. Assignment Service belum membedakannya.
- Daftar course pada tab diatur manual di `config.js`. Course lain dibuka lewat kolom "Course lain".
- Kasus timeout (504) belum diuji.
- Token disimpan di `localStorage` browser. Cukup untuk proyek kuliah, belum untuk produksi.
