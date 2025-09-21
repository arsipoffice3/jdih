# JDIH Hybrid Bot - Node.js

**Hybrid Bot** untuk pencarian peraturan JDIH Kementerian Perhubungan dengan integrasi Google Sheets.
Support **WhatsApp (Baileys)** dan **Telegram** sekaligus - **100% GRATIS**!

## 🚀 Fitur

- ✅ **WhatsApp Integration** - Real-time messaging via Baileys (GRATIS)
- ✅ **Telegram Integration** - Real-time messaging via Telegram Bot API (GRATIS)
- ✅ **Google Sheets Integration** - Otomatis simpan data pencarian
- ✅ **JDIH Scraping** - Ambil data peraturan dari website JDIH
- ✅ **Multiple Search Types** - Pencarian berdasarkan kata kunci, tahun, jenis, kelompok
- ✅ **Analytics** - Statistik pencarian dan history
- ✅ **Error Handling** - Robust error handling dan logging
- ✅ **Hybrid Mode** - Jalankan kedua platform bersamaan
- ✅ **Broadcast** - Kirim pesan ke multiple users

## 📋 Prerequisites

- Node.js >= 16.0.0
- **WhatsApp** - Tidak perlu API key (menggunakan Baileys)
- **Telegram** - Bot token dari @BotFather (GRATIS)
- Google Cloud Account (untuk Google Sheets API)

## 🛠️ Installation

1. **Clone atau download project**
```bash
cd bot-node
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp env.example .env
# Edit .env dengan credentials Anda
```

4. **Run bot**
```bash
# Hybrid Bot (WhatsApp + Telegram)
npm start

# WhatsApp only
npm run whatsapp

# Telegram only
npm run telegram

# Development
npm run dev
```

## ⚙️ Configuration

### 1. WhatsApp Setup (Baileys - GRATIS)

1. **Tidak perlu API key!** Baileys menggunakan WhatsApp Web
2. Bot akan generate QR code untuk scan
3. Scan QR code dengan WhatsApp Anda
4. Session akan tersimpan otomatis

### 2. Telegram Setup (GRATIS)

1. Chat dengan [@BotFather](https://t.me/botfather) di Telegram
2. Ketik `/newbot` dan ikuti instruksi
3. Dapatkan bot token
4. Set token di environment variable

### 3. Google Sheets Setup

1. Buat Google Cloud Project
2. Enable Google Sheets API
3. Buat Service Account
4. Download credentials JSON
5. Share Google Sheet dengan service account email

### 4. Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# WhatsApp (Baileys - GRATIS)
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./whatsapp-session

# Telegram (GRATIS)
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CREDENTIALS={"type":"service_account",...}
```

## 📱 Usage

### Bot Commands (WhatsApp & Telegram)

**WhatsApp:** Kirim pesan ke bot WhatsApp
**Telegram:** Kirim pesan ke bot Telegram atau gunakan command

- `help` - Tampilkan bantuan
- `search transportasi` - Cari peraturan dengan kata kunci
- `tahun 2024` - Cari peraturan tahun 2024
- `jenis peraturan` - Cari peraturan jenis tertentu
- `kelompok hubud` - Cari peraturan kelompok tertentu
- `stats` - Lihat statistik pencarian
- `recent` - Lihat pencarian terbaru

### Telegram Commands

- `/start` - Mulai bot
- `/help` - Tampilkan bantuan
- `/search [kata kunci]` - Cari peraturan
- `/tahun [tahun]` - Cari peraturan tahun tertentu
- `/jenis [jenis]` - Cari peraturan jenis tertentu
- `/kelompok [kelompok]` - Cari peraturan kelompok tertentu
- `/stats` - Lihat statistik
- `/recent` - Lihat pencarian terbaru

### API Endpoints

- `GET /health` - Health check
- `GET /status` - Bot status
- `POST /test` - Test endpoint
- `POST /broadcast` - Broadcast message

### Test Bot

```bash
# Run tests
npm test

# Manual test
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+6281234567890", "message": "search transportasi"}'
```

## 🗂️ Project Structure

```
bot-node/
├── index.js              # Main bot application
├── test.js               # Test script
├── package.json          # Dependencies
├── env.example           # Environment variables example
├── README.md             # Documentation
└── .env                  # Environment variables (create this)
```

## 🔧 Development

### Local Development

1. **Start bot**
```bash
npm run dev
```

2. **Test with ngrok**
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Update Twilio webhook URL
# https://your-ngrok-url.ngrok.io/webhook
```

### Production Deployment

#### Heroku

1. **Create Heroku app**
```bash
heroku create your-app-name
```

2. **Set environment variables**
```bash
heroku config:set TWILIO_ACCOUNT_SID=your_account_sid
heroku config:set TWILIO_AUTH_TOKEN=your_auth_token
heroku config:set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
heroku config:set GOOGLE_SHEET_ID=your_sheet_id
heroku config:set GOOGLE_CREDENTIALS='{"type":"service_account",...}'
```

3. **Deploy**
```bash
git add .
git commit -m "Deploy JDIH WhatsApp Bot"
git push heroku main
```

4. **Setup webhook**
- Update Twilio webhook URL: `https://your-app-name.herokuapp.com/webhook`

#### Railway

1. **Connect GitHub repository**
2. **Set environment variables**
3. **Deploy automatically**

## 📊 Google Sheets Integration

Data otomatis tersimpan di Google Sheet dengan kolom:

| Kolom | Deskripsi |
|-------|-----------|
| Timestamp | Waktu pencarian |
| Phone Number | Nomor WhatsApp |
| Search Type | Jenis pencarian |
| Query | Kata kunci pencarian |
| Results Count | Jumlah hasil |
| Judul | Judul peraturan |
| Nomor Peraturan | Nomor peraturan |
| Tahun | Tahun peraturan |
| Status | Status (Berlaku/Dicabut) |
| Tanggal | Tanggal peraturan |
| Dilihat | Jumlah dilihat |
| Link Detail | Link ke halaman detail |

## 🐛 Troubleshooting

### Common Issues

1. **Twilio Webhook Error**
   - Pastikan webhook URL benar
   - Check Twilio credentials
   - Verify phone number format

2. **Google Sheets Error**
   - Pastikan service account email di-share ke sheet
   - Check GOOGLE_CREDENTIALS format
   - Verify GOOGLE_SHEET_ID

3. **JDIH Scraping Error**
   - Check internet connection
   - Website mungkin down
   - Rate limiting

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start
```

### Logs

```bash
# View logs
heroku logs --tail

# Local logs
npm run dev
```

## 📈 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Metrics

- Search history count
- Response time
- Error rate
- Google Sheets sync status

## 🔒 Security

- Environment variables untuk credentials
- Input validation
- Rate limiting
- Error handling
- Logging untuk monitoring

## 📝 API Documentation

### POST /webhook

Twilio webhook endpoint untuk menerima pesan WhatsApp.

**Request:**
```json
{
  "From": "whatsapp:+6281234567890",
  "Body": "search transportasi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "🔍 Hasil Pencarian JDIH..."
}
```

### POST /test

Test endpoint untuk manual testing.

**Request:**
```json
{
  "phoneNumber": "+6281234567890",
  "message": "search transportasi"
}
```

**Response:**
```json
{
  "phoneNumber": "+6281234567890",
  "message": "search transportasi",
  "response": "🔍 Hasil Pencarian JDIH..."
}
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- Create issue di GitHub
- Email: support@example.com
- WhatsApp: +6281234567890

## 🔄 Changelog

### v1.0.0
- Initial release
- WhatsApp integration
- Google Sheets integration
- JDIH scraping
- Multiple search types
- Analytics and statistics


**Nonton anime dan donghua sub indonesia gratis**
- site URL: `https://rijunime.com`
