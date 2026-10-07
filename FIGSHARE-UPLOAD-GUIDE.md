# Panduan Upload ke Figshare — Presensi Wajah
## Tujuan: Mendapatkan DOI untuk sismadi/app-presensi + sismadi/api-presensi

Satu rekaman Figshare mencakup **dua repositori** (frontend dan backend), diunggah sebagai dua berkas ZIP.

---

## Langkah 0 — Cek sebelum rilis

- [ ] `LICENSE` (MIT) ada di **kedua** repo. Salinan di folder ini dapat dipakai.
- [ ] `CITATION.cff` ditaruh di root repo `app-presensi` (dan boleh juga di `api-presensi`).
- [ ] Tidak ada rahasia di repo: `TEMPLATE_KEY`, `SESSION_SECRET`, token, atau berkas `.dev.vars`.
- [ ] `ALLOWED_ORIGINS` dan nama Worker di `wrangler.toml` tidak memuat data sensitif.
- [ ] README menyebut jelas keterbatasan: *belum diuji dengan kamera/wajah nyata*, liveness dievaluasi di klien.
- [ ] Beri tag rilis `v1.0.0` di kedua repo (GitHub → Releases → Create a new release).

---

## Langkah 1 — Siapkan file ZIP

Unduh kedua repo sebagai ZIP:

  https://github.com/sismadi/app-presensi/archive/refs/heads/main.zip
  https://github.com/sismadi/api-presensi/archive/refs/heads/main.zip

Ganti nama menjadi:

  app-presensi-v1.0.0.zip
  api-presensi-v1.0.0.zip

---

## Langkah 2 — Login Figshare

Buka https://figshare.com dan login dengan akun Pak Wawan.
Disarankan login via ORCID agar terhubung otomatis:

  ORCID: 0009-0007-2685-5663

---

## Langkah 3 — Buat item baru

Klik "+ Create new item" atau "My data → Upload", lalu unggah kedua berkas ZIP di atas.

---

## Langkah 4 — Isi metadata (salin dari figshare.json)

TITLE:
  Presensi Wajah: Sistem Presensi Kuliah Berbasis Pengenalan Wajah di Peramban

AUTHORS:
  Wawan Sismadi | ORCID: 0009-0007-2685-5663

ITEM TYPE:
  Software

DESCRIPTION:
  (salin dari field "description" di figshare.json)

CATEGORIES:
  Computer Science
  Software Engineering
  Education

KEYWORDS (paste satu per satu):
  presensi wajah, face recognition, face attendance, liveness detection,
  biometric privacy, face-api.js, cloudflare workers, cloudflare d1,
  vanilla javascript, single page application, educational technology,
  higher education, ipwija, indonesia

LICENSE:
  MIT

FUNDING:
  (kosongkan)

---

## Langkah 5 — Tambah Related Materials

  1. https://github.com/sismadi/app-presensi   (Is supplemented by)
  2. https://github.com/sismadi/api-presensi   (Is supplemented by)
  3. https://presensi.piawai.id                (Is documented by)

---

## Langkah 6 — Publish & dapatkan DOI

Klik "Save" lalu "Publish". Figshare membuat DOI berformat:

  https://doi.org/10.6084/m9.figshare.XXXXXXX

---

## Langkah 7 — Perbarui DOI di repo

Setelah DOI diterima, perbarui di tempat berikut:

1. `README.md` kedua repo — tambahkan badge DOI:
   `[![DOI](https://img.shields.io/badge/DOI-10.6084%2Fm9.figshare.NOMOR-blue)](https://doi.org/10.6084/m9.figshare.NOMOR)`

2. `CITATION.cff` — hapus tanda `#` pada baris `doi:` dan isi nomornya:
   `doi: "10.6084/m9.figshare.NOMOR"`

3. `figshare.json` — untuk arsip referensi (opsional).

4. Buku panduan pengguna / halaman bantuan aplikasi — bila memuat baris sitasi.

---

## Catatan penting

- Format DOI Figshare: `10.6084/m9.figshare.[ID]`; format DOI Zenodo: `10.5281/zenodo.[ID]`. Jangan tertukar.
- Jangan memakai ulang DOI dari proyek lain (mis. ocw-pw). Setiap rekaman punya DOI sendiri.
- Setelah publish, DOI tidak bisa dihapus. Periksa metadata dan isi ZIP sebelum klik Publish.
- Karena aplikasi memproses data biometrik, pastikan **tidak ada data pengguna, dump database, maupun template wajah** di dalam ZIP.
