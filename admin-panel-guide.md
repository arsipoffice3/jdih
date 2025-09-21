# 🔧 Admin Panel JDIH Bot

## 📋 Overview

Admin Panel adalah halaman web untuk mengelola dan memantau Bot JDIH Kementerian Perhubungan. Panel ini menyediakan antarmuka yang mudah digunakan untuk:

- ✅ **Konfigurasi Bot** - WhatsApp, Telegram, Google Sheets
- ✅ **QR Code WhatsApp** - Login WhatsApp dengan scan QR code
- ✅ **Monitoring Real-time** - Status bot dan statistik
- ✅ **Kontrol Bot** - Restart, stop, disconnect
- ✅ **Logs & Export** - Lihat logs dan export data

## 🚀 Akses Admin Panel

### URL Admin Panel:
```
http://localhost:3000/admin
```

### URL API Admin:
```
http://localhost:3000/admin/status
http://localhost:3000/admin/config
```

## 📱 Fitur Admin Panel

### 1. **Dashboard Status**
- 📊 **Statistik Real-time** - Total pencarian, pengguna, uptime
- 🔴 **Status Bot** - WhatsApp, Telegram, Google Sheets
- 📈 **Monitoring** - Update otomatis setiap 10 detik

### 2. **Konfigurasi WhatsApp**
- ⚙️ **Enable/Disable** - Aktifkan atau nonaktifkan WhatsApp bot
- 📁 **Session Path** - Path untuk menyimpan session WhatsApp
- 🔄 **Restart/Disconnect** - Kontrol koneksi WhatsApp

### 3. **QR Code WhatsApp**
- 📱 **Generate QR Code** - Buat QR code untuk login WhatsApp
- 🔍 **Check Connection** - Cek status koneksi WhatsApp
- 📲 **Scan & Connect** - Scan QR code dengan WhatsApp

### 4. **Konfigurasi Telegram**
- ⚙️ **Enable/Disable** - Aktifkan atau nonaktifkan Telegram bot
- 🔑 **Bot Token** - Masukkan token bot Telegram
- 🔄 **Restart** - Restart Telegram bot

### 5. **Konfigurasi Google Sheets**
- 📊 **Sheet ID** - ID Google Sheet untuk menyimpan data
- 🔐 **Credentials** - JSON credentials Google Sheets
- 🧪 **Test Connection** - Test koneksi Google Sheets

### 6. **Kontrol Bot**
- 🔄 **Restart Bot** - Restart seluruh bot
- ⏹️ **Stop Bot** - Hentikan bot
- 🗑️ **Clear Logs** - Hapus semua logs
- 📤 **Export Data** - Export data ke file JSON

### 7. **Logs Real-time**
- 📝 **Activity Logs** - Log aktivitas bot real-time
- 🔄 **Auto Refresh** - Update otomatis setiap 5 detik
- 📊 **Search History** - Riwayat pencarian pengguna

## 🔧 Cara Menggunakan Admin Panel

### 1. **Akses Admin Panel**
```
1. Buka browser
2. Kunjungi: http://localhost:3000/admin
3. Panel akan terbuka dengan dashboard lengkap
```

### 2. **Setup WhatsApp Bot**
```
1. Klik "Generate QR Code"
2. Scan QR code dengan WhatsApp
3. Tunggu hingga status berubah menjadi "Terhubung"
4. Bot WhatsApp siap digunakan
```

### 3. **Setup Telegram Bot**
```
1. Masukkan Bot Token dari @BotFather
2. Klik "Simpan Konfigurasi"
3. Klik "Restart Telegram"
4. Bot Telegram siap digunakan
```

### 4. **Setup Google Sheets**
```
1. Masukkan Google Sheet ID
2. Masukkan Credentials JSON
3. Klik "Test Koneksi"
4. Jika berhasil, klik "Simpan Konfigurasi"
```

### 5. **Monitoring Bot**
```
1. Dashboard menampilkan status real-time
2. Statistik update otomatis
3. Logs menampilkan aktivitas terbaru
4. Export data untuk backup
```

## 📱 QR Code WhatsApp

### Cara Login WhatsApp:
1. **Aktifkan WhatsApp Bot** di konfigurasi
2. **Klik "Generate QR Code"**
3. **Buka WhatsApp** di HP
4. **Pilih Menu** → **Linked Devices**
5. **Scan QR Code** yang muncul di admin panel
6. **Tunggu** hingga status berubah menjadi "Terhubung"

### Troubleshooting QR Code:
- **QR Code tidak muncul**: Pastikan WhatsApp bot aktif
- **QR Code expired**: Generate ulang QR code
- **Tidak bisa scan**: Pastikan HP dan komputer dalam jaringan yang sama
- **Connection failed**: Restart WhatsApp bot

## 🔒 Security

### 1. **Access Control**
- Admin panel hanya bisa diakses dari server
- Tidak ada autentikasi (untuk development)
- Tambahkan autentikasi untuk production

### 2. **Environment Variables**
- File `.env` tidak bisa diakses publik
- Credentials tersimpan aman
- Token tidak ditampilkan di logs

### 3. **HTTPS**
- Gunakan HTTPS untuk production
- SSL certificate untuk keamanan
- CORS configuration

## 📊 API Endpoints

### Status Endpoints:
```bash
GET /admin/status          # Status bot
GET /admin/config          # Konfigurasi bot
GET /admin/logs            # Logs bot
```

### WhatsApp Endpoints:
```bash
POST /admin/whatsapp/qr           # Generate QR code
GET /admin/whatsapp/status        # Status WhatsApp
POST /admin/whatsapp/restart      # Restart WhatsApp
POST /admin/whatsapp/disconnect   # Disconnect WhatsApp
```

### Telegram Endpoints:
```bash
POST /admin/telegram/restart      # Restart Telegram
```

### Google Sheets Endpoints:
```bash
POST /admin/sheets/test           # Test connection
```

### Control Endpoints:
```bash
POST /admin/restart               # Restart bot
POST /admin/stop                  # Stop bot
POST /admin/logs/clear            # Clear logs
GET /admin/export                 # Export data
```

## 🚨 Troubleshooting

### Admin Panel Tidak Bisa Diakses:
```bash
1. Cek apakah bot berjalan: curl http://localhost:3000/health
2. Cek port 3000: netstat -tulpn | grep :3000
3. Restart bot: node index.js
```

### QR Code Tidak Muncul:
```bash
1. Pastikan WhatsApp bot aktif di .env
2. Cek logs bot untuk error
3. Restart WhatsApp bot
4. Generate ulang QR code
```

### Bot Tidak Terhubung:
```bash
1. Cek konfigurasi di admin panel
2. Test koneksi Google Sheets
3. Cek token Telegram
4. Restart bot
```

### Logs Tidak Update:
```bash
1. Refresh halaman admin panel
2. Cek koneksi internet
3. Restart bot
4. Clear browser cache
```

## 📈 Monitoring

### 1. **Real-time Status**
- Status bot update setiap 10 detik
- Logs update setiap 5 detik
- Statistik real-time

### 2. **Performance Metrics**
- Total pencarian
- Total pengguna
- Pencarian hari ini
- Uptime bot

### 3. **Error Tracking**
- Error logs di console
- Failed requests tracking
- Connection issues monitoring

## 🎯 Best Practices

### 1. **Regular Monitoring**
- Cek status bot setiap hari
- Monitor logs untuk error
- Backup data secara berkala

### 2. **Security**
- Update credentials secara berkala
- Monitor akses admin panel
- Gunakan HTTPS untuk production

### 3. **Maintenance**
- Restart bot secara berkala
- Clear logs jika terlalu banyak
- Update dependencies

## 🚀 Production Deployment

### 1. **Environment Setup**
```bash
NODE_ENV=production
PORT=3000
WHATSAPP_ENABLED=true
TELEGRAM_ENABLED=true
```

### 2. **Security**
- Tambahkan autentikasi admin panel
- Gunakan HTTPS
- Setup firewall

### 3. **Monitoring**
- Setup log rotation
- Monitor server resources
- Setup alerts

## 📞 Support

Jika ada masalah dengan admin panel:

1. **Cek Logs** - Lihat console bot untuk error
2. **Restart Bot** - Restart bot untuk reset
3. **Check Config** - Pastikan konfigurasi benar
4. **Test Endpoints** - Test API endpoints manual

**Admin Panel JDIH Bot sudah siap digunakan!** 🎉

Dengan admin panel ini, Anda bisa mengelola bot dengan mudah dan memantau status real-time. QR code WhatsApp akan muncul otomatis untuk login, dan semua konfigurasi bisa diubah melalui antarmuka web yang user-friendly.
