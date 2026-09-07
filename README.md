# Studio Video Al-Qur'an

Aplikasi web internal: upload gambar produk Al-Qur'an → generate video + caption promosi TikTok Shop.

## Cara kerja singkat
1. User upload 1-3 gambar referensi + prompt tambahan (opsional)
2. Aplikasi panggil Gemini (Veo) buat generate video, dan Gemini teks buat generate judul+caption — dua-duanya jalan bersamaan
3. Video di-generate di background (1-3 menit), halaman polling otomatis tiap 8 detik sampai selesai
4. Video final disimpan ke Supabase Storage, siap didownload
5. Semua hasil generate tersimpan di "Riwayat generate" di bawah halaman utama

## Setup

### 1. Siapkan Supabase
- Buat project baru di supabase.com (atau reuse yang sudah ada)
- Buka **SQL Editor**, jalankan isi file `sql/schema.sql`
- Buka menu **Storage**, buat bucket baru namanya **`videos`**, set jadi **Public**
- Catat **Project URL** dan **service_role key** dari Project Settings > API

### 2. Siapkan API key Gemini
- Ambil dari https://aistudio.google.com/apikey

### 3. Isi environment variable
Copy `.env.example` jadi `.env.local` (untuk coba lokal), isi semua nilainya:
```
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
APP_USERNAME=admin
APP_PASSWORD=isi-password-kamu-sendiri
```

### 4. Coba jalan lokal (opsional, butuh Node.js terpasang)
```
npm install
npm run dev
```
Buka http://localhost:3000, browser akan minta username/password (dari APP_USERNAME/APP_PASSWORD).

### 5. Deploy ke Vercel
- Push folder ini ke GitHub (bikin repo baru)
- Buka vercel.com, klik "Add New Project", pilih repo tadi
- Di bagian Environment Variables, isi 5 variable yang sama seperti `.env.local`
- Klik Deploy

## Catatan penting

- **Autentikasi pakai Basic Auth sederhana** (dialog login bawaan browser), bukan sistem akun. Cukup untuk pemakaian tim internal kecil. Kalau nanti butuh multi-user dengan role berbeda, perlu upgrade ke sistem auth yang lebih lengkap (misal Supabase Auth) — kabari saya kalau sampai ke titik itu.
- **Referensi 3 gambar sekaligus (`referenceImages`) bersifat eksperimental** di API Google — kalau gagal, sistem otomatis fallback pakai gambar pertama saja secara diam-diam (`usedFallback` di database bisa dicek untuk tahu kapan ini kejadian).
- **Durasi video di-set 8 detik** (maksimal yang didukung Veo saat ini), bisa diubah di `lib/gemini.ts` kalau mau lebih pendek/murah (opsi: 4, 6, atau 8 detik).
- **Biaya**: tiap generate video kena biaya dari Google (per detik video, tergantung model). Pantau di Google Cloud Billing.
