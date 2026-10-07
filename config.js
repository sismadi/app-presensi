// Satu-satunya berkas yang perlu disesuaikan saat deploy.
// API_ORIGIN harus sama dengan origin Worker api-presensi DAN dengan connect-src CSP di index.html.
const CONFIG = {
    API_ORIGIN: 'https://presensi.piawai.workers.dev',
    // Bobot model face-api.js. Default: CDN. Untuk self-host: jalankan scripts/fetch-models.sh
    // lalu ganti ke './models' (dan hapus jsDelivr dari connect-src bila tak dipakai lagi).
    MODEL_URL: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
    ENROLL_SAMPLES: 5,    // sampel saat pendaftaran wajah (server minta 3-8)
    ATTEND_SAMPLES: 3,    // sampel saat presensi (server minta 2-5)
    MIN_FACE_PX: 120,     // lebar kotak wajah minimum (px) — terlalu jauh = ditolak
    MIN_SCORE: 0.6,       // skor deteksi minimum
};
