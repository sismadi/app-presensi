# app-presensi

Frontend statis presensi wajah (tanpa build). Pasangan backend: `api-presensi`. Berevolusi dari instrumen riset `app-riset-pdp`: jalur **face-api.js** (TinyFaceDetector → 68 landmark → descriptor 128-D) dipakai ulang; seluruh ekstraksi wajah tetap di peramban dan hanya descriptor yang dikirim.

## Fitur
- **Mahasiswa:** daftar/ulangi/hapus data wajah (persetujuan eksplisit + konfirmasi password), presensi wajah dengan tantangan liveness (kedip / tengok kiri / tengok kanan), riwayat presensi.
- **Dosen:** buat kelas, kelola anggota (lihat siapa yang belum mendaftarkan wajah), buka/tutup pertemuan (durasi + batas terlambat), laporan per pertemuan, override manual (izin/sakit/alpa + alasan), ekspor CSV (aman dari formula injection).
- **Admin:** statistik, buat akun, ubah peran, ganti password, reset template wajah.

## Menjalankan lokal
```bash
python -m http.server 8080      # lalu buka http://localhost:8080
```
Kamera butuh **HTTPS atau localhost**. `http://localhost:8080` sudah ada di `ALLOWED_ORIGINS` default API.

## Konfigurasi
1. `config.js` → `API_ORIGIN` = URL Worker `api-presensi` Anda.
2. `index.html` → `connect-src` CSP harus memuat origin yang sama.
3. (Opsional) self-host model: `sh scripts/fetch-models.sh`, lalu `MODEL_URL: './models'` di `config.js` (±6.8 MB; bobot dimuat dari jsDelivr jika tidak).
4. Deploy ke GitHub Pages / Cloudflare Pages; tambahkan origin-nya ke `ALLOWED_ORIGINS` di API.

## Catatan
- Token sesi disimpan di `sessionStorage` (hilang saat tab ditutup), bukan `localStorage`.
- Semua data server dirender via `textContent` (tanpa `innerHTML`); `face-api.js` dimuat dengan SRI.
- Batas keamanan, termasuk liveness yang dievaluasi di klien: lihat `../api-presensi/SECURITY.md`.
- **Belum diuji dengan kamera/wajah nyata.** Ambang liveness di `face.js` (EAR kedip 0.21/0.25; rasio tolehan 0.38/0.62) adalah nilai awal yang perlu dikalibrasi di perangkat target. Pengujian otomatis yang dilakukan: alur UI di jsdom terhadap API lokal, dengan model wajah dimock.
