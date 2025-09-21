# 🚀 Panduan Deploy Bot JDIH ke Hosting DirectAdmin

## 📋 Persiapan

### 1. File yang Diperlukan
- `jdih-bot.zip` (sudah dibuat)
- `package-production.json` (rename ke `package.json`)
- `.htaccess`
- `start.sh`

### 2. Konfigurasi Environment
Buat file `.env` di hosting dengan isi:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# WhatsApp Configuration (Baileys - GRATIS)
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./whatsapp-session

# Telegram Configuration (GRATIS)
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Google Sheets Configuration
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# Optional: Logging
LOG_LEVEL=info
```

## 🔧 Langkah-langkah Deploy

### 1. Upload File ke Hosting
1. Login ke **DirectAdmin**
2. Buka **File Manager**
3. Navigasi ke folder `public_html` atau `domains/yourdomain.com/public_html`
4. Upload file `jdih-bot.zip`
5. Extract file zip tersebut

### 2. Install Node.js Dependencies
```bash
# Via Terminal SSH atau DirectAdmin Terminal
cd public_html
npm install --production
```

### 3. Konfigurasi Environment
1. Buat file `.env` dengan konfigurasi di atas
2. Pastikan file `.env` tidak bisa diakses publik (ada di .htaccess)

### 4. Set Permissions
```bash
chmod +x start.sh
chmod 755 *.js
chmod 644 package.json
```

### 5. Konfigurasi DirectAdmin

#### A. Setup Node.js App
1. Buka **Node.js Selector** di DirectAdmin
2. Pilih versi Node.js (minimal 16.x)
3. Set **Application Root** ke folder bot
4. Set **Application URL** ke domain Anda
5. Set **Application Startup File** ke `index.js`

#### B. Setup Cron Job (Optional)
Untuk menjalankan bot secara otomatis:
```bash
# Tambahkan ke crontab
@reboot cd /home/username/domains/yourdomain.com/public_html && ./start.sh
```

#### C. Setup SSL Certificate
1. Buka **SSL Certificates**
2. Generate atau upload SSL certificate
3. Pastikan HTTPS aktif

### 6. Test Deployment
1. Buka browser ke `https://yourdomain.com/health`
2. Test API: `https://yourdomain.com/test`
3. Test WhatsApp bot (jika dikonfigurasi)
4. Test Telegram bot (jika dikonfigurasi)

## 🔧 Konfigurasi Tambahan

### 1. WhatsApp Bot Setup
1. Scan QR code yang muncul di log
2. Tunggu hingga terhubung
3. Test dengan mengirim pesan ke bot

### 2. Telegram Bot Setup
1. Buat bot di @BotFather
2. Dapatkan token bot
3. Masukkan token ke file `.env`
4. Test dengan mengirim `/start` ke bot

### 3. Google Sheets Setup
1. Buat Google Cloud Project
2. Enable Google Sheets API
3. Buat Service Account
4. Download credentials JSON
5. Masukkan ke file `.env`

## 🚨 Troubleshooting

### Error: Port Already in Use
```bash
# Cek port yang digunakan
netstat -tulpn | grep :3000

# Kill process jika perlu
kill -9 PID
```

### Error: Permission Denied
```bash
# Set permission yang benar
chmod 755 start.sh
chmod 644 *.js
chmod 600 .env
```

### Error: Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install --production
```

### Error: WhatsApp Connection
1. Pastikan session folder bisa ditulis
2. Cek log untuk error detail
3. Restart bot jika perlu

## 📱 Testing

### 1. Health Check
```bash
curl https://yourdomain.com/health
```

### 2. API Test
```bash
curl -X POST https://yourdomain.com/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+6281234567890", "message": "bantuan", "platform": "general"}'
```

### 3. WhatsApp Test
Kirim pesan ke nomor bot WhatsApp:
- `bantuan`
- `cari transportasi`
- `tahun 2024`

### 4. Telegram Test
Kirim command ke bot Telegram:
- `/start`
- `/bantuan`
- `/cari transportasi`

## 🔒 Security

### 1. File Permissions
```bash
chmod 600 .env
chmod 644 *.js
chmod 755 start.sh
```

### 2. Firewall
Pastikan port 3000 terbuka untuk akses eksternal

### 3. SSL Certificate
Gunakan HTTPS untuk keamanan data

## 📊 Monitoring

### 1. Log Files
```bash
# Cek log aplikasi
tail -f /var/log/yourdomain.com/error.log

# Cek log bot
tail -f bot.log
```

### 2. Process Monitoring
```bash
# Cek proses bot
ps aux | grep node

# Cek penggunaan memory
free -h
```

## 🎉 Selesai!

Bot JDIH sudah berhasil di-deploy ke hosting DirectAdmin dan siap digunakan!

### URL Endpoints:
- Health Check: `https://yourdomain.com/health`
- API Test: `https://yourdomain.com/test`
- WhatsApp Bot: Aktif otomatis
- Telegram Bot: Aktif otomatis

### Command yang Tersedia:
- `bantuan` / `help` - Tampilkan bantuan
- `cari [kata kunci]` / `search [kata kunci]` - Cari peraturan
- `tahun [tahun]` - Cari peraturan tahun tertentu
- `jenis [jenis]` - Cari peraturan jenis tertentu
- `kelompok [kelompok]` - Cari peraturan kelompok tertentu
- `lengkap [link]` / `detail [link]` - Lihat detail peraturan
- `statistik` / `stats` - Lihat statistik pencarian
- `terbaru` / `recent` - Lihat pencarian terbaru
