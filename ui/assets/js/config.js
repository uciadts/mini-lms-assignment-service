/*
 * config.js : satu-satunya berkas yang perlu diubah saat web ini dipindah ke tempat lain.
 */
window.LMS_CONFIG = {
  // Alamat dasar API. Kosong berarti web ini memanggil /api/... di alamat web itu sendiri,
  // lalu server web (router.php, Apache, atau Nginx) meneruskannya ke API Gateway.
  // Contoh jika web dipasang di subfolder: '/lms'
  API_BASE: '',

  // Batas waktu tunggu satu request di browser (milidetik).
  TIMEOUT_MS: 10000,

  // Course yang muncul sebagai tab. Course lain tetap bisa dibuka lewat kolom "Course lain".
  COURSES: ['course-001', 'course-002'],

  // Akun contoh di halaman masuk. Ubah SHOW_DEMO_ACCOUNTS menjadi false setelah demo.
  SHOW_DEMO_ACCOUNTS: true,
  DEMO_ACCOUNTS: [
    { username: 'dosen_distribusi', password: 'password123', role: 'dosen' },
    { username: 'mahasiswa01', password: 'password123', role: 'mahasiswa' }
  ],

  // Nama kunci penyimpanan di browser. Samakan dengan UI kelompok lain agar satu login berlaku untuk semua.
  TOKEN_KEY: 'lms_token',
  USER_KEY: 'lms_user'
};
