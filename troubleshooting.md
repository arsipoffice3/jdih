# 🔧 Troubleshooting JDIH Bot

## ❌ Error yang Sering Terjadi

### 1. **Error: logger.child is not a function**

**Penyebab:** Konfigurasi logger Baileys tidak benar

**Solusi:**
```javascript
// Di whatsapp-admin.js, gunakan pino logger
const P = require('pino');

this.sock = makeWASocket({
  auth: state,
  printQRInTerminal: false,
  logger: P({ level: 'silent' }) // Gunakan pino logger
});
```

### 2. **Error: EADDRINUSE: address already in use**

**Penyebab:** Port 3000 sudah digunakan

**Solusi:**
```bash
# Windows
taskkill /F /IM node.exe

# Linux/Mac
pkill -f node
```

### 3. **WhatsApp QR Code Tidak Muncul**

**Penyebab:** WhatsApp bot belum diinisialisasi

**Solusi:**
1. Pastikan `WHATSAPP_ENABLED=true` di `.env`
2. Restart bot
3. Generate QR code melalui admin panel

### 4. **Google Sheets Not Configured**

**Penyebab:** Credentials Google Sheets belum dikonfigurasi

**Solusi:**
1. Buat Google Cloud Project
2. Enable Google Sheets API
3. Buat Service Account
4. Download credentials JSON
5. Masukkan ke `.env`

### 5. **Telegram Bot Tidak Terhubung**

**Penyebab:** Bot token salah atau bot tidak aktif

**Solusi:**
1. Buat bot di @BotFather
2. Dapatkan token bot
3. Masukkan token ke `.env`
4. Restart bot

## 🔧 Cara Fix Error

### 1. **Restart Bot**
```bash
# Stop bot
taskkill /F /IM node.exe

# Start bot
node index.js
```

### 2. **Check Logs**
```bash
# Lihat console output
node index.js

# Cek error di admin panel
http://localhost:3000/admin
```

### 3. **Test Endpoints**
```bash
# Health check
curl http://localhost:3000/health

# Admin status
curl http://localhost:3000/admin/status

# Test bot
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+6281234567890", "message": "bantuan", "platform": "general"}'
```

### 4. **Check Dependencies**
```bash
# Install dependencies
npm install

# Check package.json
cat package.json
```

## 🚀 Setup yang Benar

### 1. **Environment Variables**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# WhatsApp Configuration
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./whatsapp-session

# Telegram Configuration
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Google Sheets Configuration
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_CREDENTIALS={"type":"service_account",...}
```

### 2. **File Structure**
```
bot-jdih/
├── index.js              # Main bot file
├── whatsapp-admin.js      # WhatsApp admin
├── telegram-bot.js        # Telegram bot
├── whatsapp-bot.js        # WhatsApp bot
├── hybrid-bot.js          # Hybrid bot
├── admin.html             # Admin panel
├── package.json           # Dependencies
├── env.example            # Environment template
├── .htaccess              # Apache config
├── start.sh               # Startup script
└── node_modules/          # Dependencies
```

### 3. **Dependencies**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "@whiskeysockets/baileys": "^6.6.0",
    "node-telegram-bot-api": "^0.64.0",
    "googleapis": "^128.0.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "qrcode-terminal": "^0.12.0",
    "pino": "^8.16.0"
  }
}
```

## 📱 WhatsApp Setup

### 1. **Generate QR Code**
```bash
# Via admin panel
http://localhost:3000/admin

# Via API
curl -X POST http://localhost:3000/admin/whatsapp/qr
```

### 2. **Scan QR Code**
1. Buka WhatsApp di HP
2. Menu → Linked Devices
3. Scan QR code dari admin panel
4. Tunggu hingga terhubung

### 3. **Check Connection**
```bash
curl http://localhost:3000/admin/whatsapp/status
```

## ✈️ Telegram Setup

### 1. **Create Bot**
1. Chat dengan @BotFather
2. `/newbot`
3. Masukkan nama bot
4. Dapatkan token

### 2. **Configure Bot**
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_ENABLED=true
```

### 3. **Test Bot**
```bash
# Send message to bot
/start
/bantuan
/cari transportasi
```

## 📊 Google Sheets Setup

### 1. **Create Project**
1. Google Cloud Console
2. Create new project
3. Enable Google Sheets API

### 2. **Create Service Account**
1. IAM & Admin → Service Accounts
2. Create Service Account
3. Download JSON key

### 3. **Configure Bot**
```env
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CREDENTIALS={"type":"service_account",...}
```

### 4. **Test Connection**
```bash
curl -X POST http://localhost:3000/admin/sheets/test
```

## 🔍 Debugging

### 1. **Check Bot Status**
```bash
# Via admin panel
http://localhost:3000/admin

# Via API
curl http://localhost:3000/admin/status
```

### 2. **Check Logs**
```bash
# Console logs
node index.js

# Admin panel logs
http://localhost:3000/admin
```

### 3. **Test Individual Components**
```bash
# Test scraper
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+6281234567890", "message": "cari transportasi", "platform": "general"}'

# Test detail
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+6281234567890", "message": "detail https://jdih.dephub.go.id/peraturan/detail?data=...", "platform": "general"}'
```

## 🚨 Common Issues

### 1. **Bot Tidak Merespon**
- Cek status bot di admin panel
- Restart bot
- Cek logs untuk error

### 2. **QR Code Expired**
- Generate QR code baru
- Scan dengan cepat
- Pastikan HP dan komputer dalam jaringan yang sama

### 3. **Google Sheets Error**
- Cek credentials JSON
- Pastikan sheet ID benar
- Test koneksi di admin panel

### 4. **Telegram Bot Error**
- Cek bot token
- Pastikan bot aktif di @BotFather
- Restart Telegram bot

## 📞 Support

Jika masih ada masalah:

1. **Cek Logs** - Lihat console output
2. **Admin Panel** - Cek status di http://localhost:3000/admin
3. **Test Endpoints** - Test API endpoints
4. **Restart Bot** - Restart bot untuk reset
5. **Check Config** - Pastikan konfigurasi benar

**Bot JDIH sudah siap digunakan!** 🎉

Dengan troubleshooting guide ini, Anda bisa mengatasi masalah yang sering terjadi dan menjalankan bot dengan lancar.
