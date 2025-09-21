#!/usr/bin/env node

// Disable undici WASM (llhttp) to avoid OOM on some shared hosts (CloudLinux)
if (!process.env.UNDICI_NO_WASM) {
  process.env.UNDICI_NO_WASM = '1';
}
if (!process.env.UNDICI_NO_GLOBAL) {
  process.env.UNDICI_NO_GLOBAL = '1';
}

/**
 * JDIH Hybrid Bot - WhatsApp & Telegram
 * Bot untuk pencarian peraturan JDIH Kementerian Perhubungan
 * Support: WhatsApp (Baileys) + Telegram + Google Sheets
 */

// Minimal Web API polyfills BEFORE any other imports (fix for Node 18 + undici)
try {
  if (!globalThis.Blob) {
    const { Blob } = require('buffer');
    globalThis.Blob = Blob;
  }
  if (!globalThis.File) {
    const { Blob } = require('buffer');
    class File extends Blob {
      constructor(sources = [], name = 'file', options = {}) {
        super(sources, options);
        this.name = String(name);
        this.lastModified = options.lastModified || Date.now();
        this.webkitRelativePath = '';
      }
      get [Symbol.toStringTag]() { return 'File'; }
    }
    globalThis.File = File;
  }
} catch (_) {}

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const WhatsAppBot = require('./whatsapp-bot');
const TelegramBot = require('./telegram-bot');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Google Sheets
let sheets;
let spreadsheetId = process.env.GOOGLE_SHEET_ID;

// Primary: inline credentials via GOOGLE_CREDENTIALS
if (process.env.GOOGLE_CREDENTIALS) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  sheets = google.sheets({ version: 'v4', auth });
}

// Fallback: credentials file path via GOOGLE_CREDENTIALS_PATH or GOOGLE_APPLICATION_CREDENTIALS
if (!sheets && (process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  try {
    const credentialsPath = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const raw = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(raw);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('Google Sheets: Configured via credentials file');
  } catch (err) {
    console.warn('Failed to load credentials file:', err.message);
  }
}

// Fallback: load from GOOGLE_CREDENTIALS_PATH (JSON file path)
if (!sheets && process.env.GOOGLE_CREDENTIALS_PATH) {
  try {
    const credentialsPath = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH);
    const raw = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(raw);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('Google Sheets: Configured via GOOGLE_CREDENTIALS_PATH');
  } catch (err) {
    console.warn('Failed to load GOOGLE_CREDENTIALS_PATH:', err.message);
  }
}

// JDIH Scraper Class
class JDIHScraper {
  constructor() {
    this.baseUrl = 'https://jdih.dephub.go.id';
    this.searchUrl = `${this.baseUrl}/peraturan/index`;
  }

  async searchPeraturan(options = {}) {
    const {
      kataKunci = '',
      nomorPeraturan = '',
      tahunPeraturan = '',
      jenisPeraturan = '',
      kelompok = '',
      page = 1,
      perPage = 12
    } = options;

    try {
      console.log('🔍 JDIHScraper searchPeraturan called with:', options);
      
      // Add random delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      const params = new URLSearchParams({
        'PencarianPeraturanForm[kataKunci]': kataKunci,
        'PencarianPeraturanForm[nomorPeraturan]': nomorPeraturan,
        'PencarianPeraturanForm[tahunPeraturan]': tahunPeraturan,
        'PencarianPeraturanForm[jenisPeraturan]': jenisPeraturan,
        page: page,
        'per-page': perPage
      });

      if (kelompok) {
        params.append('kelompok', kelompok);
      }
      
      console.log('🔍 Search URL:', `${this.searchUrl}?${params}`);
      console.log('🔍 Search params:', params.toString());

      // Random User-Agent rotation
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
      ];
      
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

      const response = await axios.get(`${this.searchUrl}?${params}`, {
        headers: {
          'User-Agent': randomUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://jdih.dephub.go.id/'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response data length:', response.data.length);
      console.log('🔍 Response data preview:', response.data.substring(0, 500));
      
      const results = this.parseSearchResults(response.data);
      console.log('🔍 Parsed results count:', results.length);
      
      return results;
    } catch (error) {
      console.error('Error searching peraturan:', error.message);
      
      // Retry with exponential backoff if it's a rate limit or network error
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || 
          error.response?.status === 429 || error.response?.status >= 500) {
        console.log('Retrying request with exponential backoff...');
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        try {
          const retryResponse = await axios.get(`${this.searchUrl}?${params}`, {
            headers: {
              'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Cache-Control': 'max-age=0',
              'Referer': 'https://jdih.dephub.go.id/'
            },
            timeout: 45000,
            maxRedirects: 5,
            validateStatus: function (status) {
              return status >= 200 && status < 400;
            }
          });
          return this.parseSearchResults(retryResponse.data);
        } catch (retryError) {
          console.error('Retry failed:', retryError.message);
          return [];
        }
      }
      
      return [];
    }
  }

  async getDetailPeraturan(detailUrl) {
    try {
      // Add delay before detail request
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

      // Random User-Agent rotation
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
      ];
      
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

      const response = await axios.get(detailUrl, {
        headers: {
          'User-Agent': randomUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://jdih.dephub.go.id/peraturan/index'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });

      return this.parseDetailPeraturan(response.data);
    } catch (error) {
      console.error('Error getting detail peraturan:', error.message);
      return null;
    }
  }

  parseDetailPeraturan(html) {
    const $ = cheerio.load(html);
    const detail = {};

    try {
      // Extract detail information from the page using the correct structure
      $('.row').each((index, element) => {
        const $row = $(element);
        const labelElement = $row.find('.col-md-4 b, .col-md-4 strong');
        const valueElement = $row.find('.col-md-8');
        
        if (labelElement.length && valueElement.length) {
          const label = labelElement.text().trim();
          const value = valueElement.text().trim();

          if (label && value) {
            switch (label.toLowerCase()) {
              case 'judul':
                detail.judul = value;
                break;
              case 'nomor peraturan':
                detail.nomorPeraturan = value;
                break;
              case 'jenis/bentuk peraturan':
                detail.jenisPeraturan = value;
                break;
              case 'tempat penetapan':
                detail.tempatPenetapan = value;
                break;
              case 'tanggal penetapan':
                detail.tanggalPenetapan = value;
                break;
              case 'status':
                detail.status = value;
                break;
              case 'file':
                detail.file = value;
                break;
              case 'tanggal berlaku efektif':
                detail.tanggalBerlakuEfektif = value;
                break;
              case 'subjek':
                detail.subjek = value;
                break;
              case 'jumlah unduhan':
                detail.jumlahUnduhan = value;
                break;
              case 'jumlah tayang':
                detail.jumlahTayang = value;
                break;
              case 'bahasa':
                detail.bahasa = value;
                break;
              case 'bidang hukum':
                detail.bidangHukum = value;
                break;
              case 'sumber':
                detail.sumber = value;
                break;
              case 'lokasi':
                detail.lokasi = value;
                break;
              case 'tajuk entri utama':
                detail.tajukEntriUtama = value;
                break;
              case 'singkatan jenis/bentuk peraturan':
                detail.singkatanJenisPeraturan = value;
                break;
              case 'tipe dokumen':
                detail.tipeDokumen = value;
                break;
            }
          }
        }
      });

      // Extract PDF download link
      const pdfLink = $('a[href*=".pdf"]').attr('href');
      if (pdfLink) {
        detail.pdfLink = pdfLink.startsWith('http') ? pdfLink : this.baseUrl + pdfLink;
      }

      // Check for download links
      if (!detail.pdfLink) {
        const downloadLink = $('a').filter(function() {
          const href = $(this).attr('href');
          const text = $(this).text().trim();
          return href && (text.includes('Download') || text.includes('Unduh'));
        }).first().attr('href');
        
        if (downloadLink) {
          detail.pdfLink = downloadLink.startsWith('http') ? downloadLink : this.baseUrl + downloadLink;
        }
      }

      // Extract file name from button or text content
      const fileText = $('button, *').filter(function() {
        const text = $(this).text().trim();
        return text.includes('.pdf') && text.length < 100;
      }).first().text().trim();
      
      if (fileText && fileText.includes('.pdf')) {
        detail.fileName = fileText;
      }

      // Extract full text content if available
      const fullText = $('.content-text, .peraturan-content, .post-content').text().trim();
      if (fullText) {
        detail.fullText = fullText.substring(0, 1000) + (fullText.length > 1000 ? '...' : '');
      }

      // If no data found, try alternative parsing
      if (Object.keys(detail).length === 0) {
        // Try to extract from title
        const title = $('h1').text().trim();
        if (title) {
          detail.judul = title;
        }

        // Try to extract from any text that looks like structured data
        $('*').each((index, element) => {
          const $el = $(element);
          const text = $el.text().trim();
          
          if (text.includes('Nomor') && text.includes('Tahun')) {
            const match = text.match(/(\d+)\s+Tahun\s+(\d{4})/);
            if (match) {
              detail.nomorPeraturan = match[0];
              detail.tahun = match[2];
            }
          }
        });
      }

      return detail;
    } catch (error) {
      console.error('Error parsing detail peraturan:', error);
      return null;
    }
  }

  parseSearchResults(html) {
    const $ = cheerio.load(html);
    const results = [];

    $('.strip.grid').each((index, element) => {
      try {
        const $el = $(element);
        
        // Extract title and link
        const titleLink = $el.find('h3 a');
        const judul = titleLink.text().trim();
        const linkDetail = this.baseUrl + titleLink.attr('href');

        // Extract description
        const deskripsi = $el.find('p').text().trim();

        // Extract metadata
        let tanggal = '';
        let dilihat = 0;
        let status = 'Tidak Diketahui';

        $el.find('ul li').each((i, li) => {
          const text = $(li).text().trim();
          if ($(li).find('.ti-calendar').length) {
            tanggal = text;
          } else if ($(li).find('.ti-eye').length) {
            dilihat = parseInt(text.replace(' x Dilihat', '').replace(' x Dilihat', '')) || 0;
          }
        });

        // Extract status
        const statusEl = $el.find('span[style*="background-color"]');
        if (statusEl.length) {
          const style = statusEl.attr('style');
          if (style.includes('green')) {
            status = 'Berlaku';
          } else if (style.includes('red')) {
            status = 'Dicabut';
          }
        }

        // Extract nomor peraturan and tahun
        const nomorPeraturan = this.extractNomorPeraturan(judul);
        const tahun = this.extractTahun(judul);

        results.push({
          judul,
          deskripsi,
          tanggal,
          status,
          dilihat,
          linkDetail,
          nomorPeraturan,
          tahun
        });
      } catch (error) {
        console.warn('Error parsing peraturan item:', error.message);
      }
    });

    return results;
  }

  extractNomorPeraturan(judul) {
    const pattern = /([A-Z]{1,3})\s+(\d+)\s+Tahun\s+(\d{4})/;
    const match = judul.match(pattern);
    if (match) {
      return `${match[1]} ${match[2]} Tahun ${match[3]}`;
    }
    return '';
  }

  extractTahun(judul) {
    const pattern = /Tahun\s+(\d{4})/;
    const match = judul.match(pattern);
    return match ? match[1] : '';
  }
}

// Bot Core Class
class JDIHBot {
  constructor() {
    this.scraper = new JDIHScraper();
    this.searchHistory = [];
    this.commands = {
      help: this.showHelp.bind(this),
      bantuan: this.showHelp.bind(this),
      mulai: this.showHelp.bind(this),
      start: this.showHelp.bind(this),
      search: this.searchPeraturan.bind(this),
      cari: this.searchPeraturan.bind(this),
      tahun: this.searchByYear.bind(this),
      jenis: this.searchByType.bind(this),
      kelompok: this.searchByGroup.bind(this),
      detail: this.getDetailPeraturan.bind(this),
      lengkap: this.getDetailPeraturan.bind(this),
      stats: this.showStats.bind(this),
      statistik: this.showStats.bind(this),
      recent: this.showRecentSearches.bind(this),
      terbaru: this.showRecentSearches.bind(this)
    };
  }

  showHelp(platform = 'general') {
    const emoji = platform === 'whatsapp' ? '📱' : platform === 'telegram' ? '✈️' : '🤖';
    
    return `${emoji} *Bot JDIH HUBLA Kementerian Perhubungan*

*Perintah yang tersedia:*

🔎 *Pencarian HUBLA:*
• \`cari [kata kunci]\` atau \`search [kata kunci]\` - Cari peraturan HUBLA
• \`tahun [tahun]\` - Cari peraturan HUBLA tahun tertentu
• \`jenis [jenis]\` - Cari peraturan HUBLA jenis tertentu
• \`kelompok hubla\` - Lihat semua peraturan HUBLA
• \`lengkap [link]\` atau \`detail [link]\` - Lihat detail peraturan lengkap

📊 *Informasi:*
• \`statistik\` atau \`stats\` - Lihat statistik pencarian HUBLA
• \`terbaru\` atau \`recent\` - Lihat pencarian terbaru HUBLA
• \`bantuan\` atau \`help\` - Tampilkan bantuan ini

*Contoh penggunaan:*
• \`cari transportasi\`
• \`tahun 2024\`
• \`jenis peraturan\`
• \`kelompok hubla\`
• \`lengkap https://jdih.dephub.go.id/peraturan/detail?data=...\`

*Jenis peraturan HUBLA:*
• peraturan (104)
• keputusan (102)
• instruksi (109)
• surat edaran (114)

*Kelompok HUBLA:*
• hubla (4) - Fokus utama bot ini`;
  }

  // Add delay function to avoid rate limiting
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchPeraturan(phoneNumber, query, platform = 'general') {
    try {
      console.log(`🔍 Searching HUBLA for: ${query} (${platform})`);
      
      // Add delay to avoid rate limiting
      await this.delay(1000 + Math.random() * 2000);
      
      // Search only in HUBLA (Kelompok 4)
      const results = await this.scraper.searchPeraturan({ 
        kataKunci: query,
        kelompok: '4' // HUBLA only
      });
      
      return this.formatSearchResults(results, phoneNumber, 'search', query, platform);
    } catch (error) {
      console.error('Error searching HUBLA peraturan:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  async searchByYear(phoneNumber, year, platform = 'general') {
    try {
      console.log(`🔍 Searching HUBLA by year: ${year} (${platform})`);
      
      // Add delay to avoid rate limiting
      await this.delay(1000 + Math.random() * 2000);
      
      // Search only in HUBLA (Kelompok 4)
      const results = await this.scraper.searchPeraturan({ 
        tahunPeraturan: year,
        kelompok: '4' // HUBLA only
      });
      
      return this.formatSearchResults(results, phoneNumber, 'tahun', year, platform);
    } catch (error) {
      console.error('Error searching HUBLA by year:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  async searchByType(phoneNumber, typeName, platform = 'general') {
    try {
      console.log(`🔍 Searching HUBLA by type: ${typeName} (${platform})`);
      
      // Add delay to avoid rate limiting
      await this.delay(1000 + Math.random() * 2000);
      
      const typeMapping = {
        'peraturan': '104',
        'keputusan': '102',
        'instruksi': '109',
        'surat edaran': '114',
        'uu': '3'
      };

      const jenisId = typeMapping[typeName.toLowerCase()] || typeName;
      
      // Search only in HUBLA (Kelompok 4)
      const results = await this.scraper.searchPeraturan({ 
        jenisPeraturan: jenisId,
        kelompok: '4' // HUBLA only
      });
      
      return this.formatSearchResults(results, phoneNumber, 'jenis', typeName, platform);
    } catch (error) {
      console.error('Error searching HUBLA by type:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  async searchByGroup(phoneNumber, groupName, platform = 'general') {
    try {
      console.log(`🔍 Searching HUBLA by group: ${groupName} (${platform})`);
      
      // Add delay to avoid rate limiting
      await this.delay(1000 + Math.random() * 2000);
      
      // Force HUBLA (Kelompok 4) only
      const results = await this.scraper.searchPeraturan({ 
        kelompok: '4' // HUBLA only
      });
      
      return this.formatSearchResults(results, phoneNumber, 'kelompok', 'HUBLA', platform);
    } catch (error) {
      console.error('Error searching HUBLA by group:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  async getDetailPeraturan(phoneNumber, detailUrl, platform = 'general') {
    try {
      if (!detailUrl) {
        return `❌ Silakan berikan link detail peraturan\n\nContoh: detail https://jdih.dephub.go.id/peraturan/detail?data=...`;
      }

      const detail = await this.scraper.getDetailPeraturan(detailUrl);
      
      if (!detail) {
        return `❌ Tidak dapat mengambil detail peraturan dari link tersebut`;
      }

      // Save to Google Sheets
      this.saveDetailToGoogleSheets(detail, phoneNumber, platform);

      // Add to search history
      this.searchHistory.push({
        timestamp: new Date().toISOString(),
        phoneNumber,
        platform,
        searchType: 'detail',
        query: detailUrl,
        resultsCount: 1
      });

      // Format message
      const platformEmoji = platform === 'whatsapp' ? '📱' : platform === 'telegram' ? '✈️' : '🤖';
      
      let message = `${platformEmoji} *Detail Peraturan JDIH*\n\n`;
      
      if (detail.judul) {
        message += `📋 *Judul:*\n${detail.judul}\n\n`;
      }
      
      if (detail.nomorPeraturan) {
        message += `🔢 *Nomor Peraturan:* ${detail.nomorPeraturan}\n`;
      }
      
      if (detail.jenisPeraturan) {
        message += `📄 *Jenis/Bentuk:* ${detail.jenisPeraturan}\n`;
      }
      
      if (detail.tempatPenetapan) {
        message += `📍 *Tempat Penetapan:* ${detail.tempatPenetapan}\n`;
      }
      
      if (detail.tanggalPenetapan) {
        message += `📅 *Tanggal Penetapan:* ${detail.tanggalPenetapan}\n`;
      }
      
      if (detail.status) {
        const statusEmoji = detail.status.toLowerCase().includes('berlaku') ? '✅' : '❌';
        message += `${statusEmoji} *Status:* ${detail.status}\n`;
      }
      
      if (detail.tanggalBerlakuEfektif) {
        message += `⏰ *Tanggal Berlaku Efektif:* ${detail.tanggalBerlakuEfektif}\n`;
      }
      
      if (detail.subjek) {
        message += `🏷️ *Subjek:* ${detail.subjek}\n`;
      }
      
      if (detail.bidangHukum) {
        message += `⚖️ *Bidang Hukum:* ${detail.bidangHukum}\n`;
      }
      
      if (detail.bahasa) {
        message += `🌐 *Bahasa:* ${detail.bahasa}\n`;
      }
      
      if (detail.sumber) {
        message += `📚 *Sumber:* ${detail.sumber}\n`;
      }
      
      if (detail.lokasi) {
        message += `🏢 *Lokasi:* ${detail.lokasi}\n`;
      }
      
      if (detail.jumlahUnduhan) {
        message += `⬇️ *Jumlah Unduhan:* ${detail.jumlahUnduhan}\n`;
      }
      
      if (detail.jumlahTayang) {
        message += `👁️ *Jumlah Tayang:* ${detail.jumlahTayang}\n`;
      }
      
      if (detail.pdfLink) {
        if (detail.fileName) {
          message += `\n📄 *File:* ${detail.fileName}\n`;
        }
        message += `\n🔗 *Link Download:*\n${detail.pdfLink}\n`;
        message += `\n⬇️ *Download langsung:* Klik link di atas untuk mengunduh file PDF`;
      }
      
      if (detail.fullText) {
        message += `\n📝 *Ringkasan Isi:*\n${detail.fullText}\n`;
      }
      
      message += '\n💾 *Data telah disimpan ke Google Sheet*';

      return message;
    } catch (error) {
      console.error('Error getting detail peraturan:', error);
      return `❌ Error: ${error.message}`;
    }
  }

  formatSearchResults(results, phoneNumber, searchType, query, platform = 'general') {
    if (!results || results.length === 0) {
      return `❌ Tidak ditemukan peraturan HUBLA untuk pencarian: ${query}`;
    }

    // Save to Google Sheets
    this.saveToGoogleSheets(results, phoneNumber, searchType, query, platform);

    // Add to search history
    this.searchHistory.push({
      timestamp: new Date().toISOString(),
      phoneNumber,
      platform,
      searchType,
      query,
      resultsCount: results.length
    });

    // Format message based on platform
    const platformEmoji = platform === 'whatsapp' ? '📱' : platform === 'telegram' ? '✈️' : '🤖';
    
    let message = `${platformEmoji} *Hasil Pencarian HUBLA*\n`;
    message += `📝 Query: ${query}\n`;
    message += `📊 Ditemukan: ${results.length} peraturan HUBLA\n\n`;

    // Show ALL results
    results.forEach((result, index) => {
      message += `*${index + 1}. ${result.judul}*\n`;
      
      // Add colored status based on status
      const status = result.status.toLowerCase();
      if (status.includes('dicabut') || status.includes('tidak berlaku')) {
        message += `📅 ${result.tanggal} | 🔴 *${result.status}*\n`;
      } else if (status.includes('berlaku') || status.includes('aktif')) {
        message += `📅 ${result.tanggal} | 🟢 *${result.status}*\n`;
      } else {
        message += `📅 ${result.tanggal} | ${result.status}\n`;
      }
      
      message += `👁️ ${result.dilihat}x dilihat\n`;
      if (result.deskripsi) {
        const desc = result.deskripsi.length > 100 
          ? result.deskripsi.substring(0, 100) + '...' 
          : result.deskripsi;
        message += `📄 ${desc}\n`;
      }
      message += `🔗 ${result.linkDetail}\n\n`;
    });

    message += `📋 *Total: ${results.length} peraturan HUBLA ditemukan*\n`;
    message += '\n💾 *Data telah disimpan ke Google Sheet*';

    return message;
  }

  async saveToGoogleSheets(results, phoneNumber, searchType, query, platform = 'general') {
    if (!sheets || !spreadsheetId) {
      console.warn('Google Sheets not configured');
      return;
    }

    try {
      const timestamp = new Date().toLocaleString('id-ID');
      const values = results.map(result => [
        timestamp,
        phoneNumber,
        platform,
        searchType,
        query,
        results.length,
        result.judul,
        result.nomorPeraturan,
        result.tahun,
        result.status,
        result.tanggal,
        result.dilihat,
        result.linkDetail
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:M',
        valueInputOption: 'RAW',
        resource: { values }
      });

      console.log(`Saved ${results.length} results to Google Sheets`);
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
    }
  }

  async saveDetailToGoogleSheets(detail, phoneNumber, platform = 'general') {
    if (!sheets || !spreadsheetId) {
      console.warn('Google Sheets not configured');
      return;
    }

    try {
      const timestamp = new Date().toLocaleString('id-ID');
      const values = [[
        timestamp,
        phoneNumber,
        platform,
        'detail',
        detail.judul || '',
        1, // results count
        detail.judul || '',
        detail.nomorPeraturan || '',
        detail.tanggalPenetapan || '',
        detail.status || '',
        detail.tanggalPenetapan || '',
        detail.jumlahTayang || '0',
        detail.pdfLink || '',
        detail.jenisPeraturan || '',
        detail.tempatPenetapan || '',
        detail.tanggalBerlakuEfektif || '',
        detail.subjek || '',
        detail.bidangHukum || '',
        detail.bahasa || '',
        detail.sumber || '',
        detail.lokasi || '',
        detail.jumlahUnduhan || '0',
        detail.tajukEntriUtama || '',
        detail.singkatanJenisPeraturan || '',
        detail.tipeDokumen || '',
        detail.fullText || ''
      ]];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'DetailPeraturan!A:Z',
        valueInputOption: 'RAW',
        resource: { values }
      });

      console.log('Saved detail peraturan to Google Sheets');
    } catch (error) {
      console.error('Error saving detail to Google Sheets:', error);
    }
  }

  showStats(phoneNumber, platform = 'general') {
    if (this.searchHistory.length === 0) {
      return '📊 Belum ada data pencarian';
    }

    const totalSearches = this.searchHistory.length;
    const searchTypes = {};
    const platforms = {};
    const recentSearches = this.searchHistory.slice(-5);

    this.searchHistory.forEach(search => {
      searchTypes[search.searchType] = (searchTypes[search.searchType] || 0) + 1;
      platforms[search.platform] = (platforms[search.platform] || 0) + 1;
    });

    const platformEmoji = platform === 'whatsapp' ? '📱' : platform === 'telegram' ? '✈️' : '🤖';
    
    let message = `${platformEmoji} *Statistik Pencarian*\n\n`;
    message += `🔍 Total pencarian: ${totalSearches}\n\n`;
    message += `📈 Jenis pencarian:\n`;
    Object.entries(searchTypes).forEach(([type, count]) => {
      message += `• ${type}: ${count}\n`;
    });

    message += `\n📱 Platform:\n`;
    Object.entries(platforms).forEach(([plat, count]) => {
      const emoji = plat === 'whatsapp' ? '📱' : plat === 'telegram' ? '✈️' : '🤖';
      message += `• ${emoji} ${plat}: ${count}\n`;
    });

    message += `\n🕒 Pencarian terbaru:\n`;
    recentSearches.forEach(search => {
      const emoji = search.platform === 'whatsapp' ? '📱' : search.platform === 'telegram' ? '✈️' : '🤖';
      message += `• ${emoji} ${search.query} (${search.searchType})\n`;
    });

    return message;
  }

  showRecentSearches(phoneNumber, platform = 'general') {
    if (this.searchHistory.length === 0) {
      return '🕒 Belum ada pencarian terbaru';
    }

    const recent = this.searchHistory.slice(-10).reverse();
    const platformEmoji = platform === 'whatsapp' ? '📱' : platform === 'telegram' ? '✈️' : '🤖';
    
    let message = `${platformEmoji} *Pencarian Terbaru*\n\n`;

    recent.forEach(search => {
      const timestamp = new Date(search.timestamp).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const emoji = search.platform === 'whatsapp' ? '📱' : search.platform === 'telegram' ? '✈️' : '🤖';
      message += `• ${emoji} ${search.query} (${search.searchType}) - ${timestamp}\n`;
    });

    return message;
  }

  async processMessage(phoneNumber, messageBody, platform = 'general') {
    try {
      const message = messageBody.trim();
      const parts = message.split(' ');
      const command = parts[0].toLowerCase();
      const query = parts.slice(1).join(' ');

      if (this.commands[command]) {
        if (['search', 'cari', 'tahun', 'jenis', 'kelompok', 'detail', 'lengkap'].includes(command) && !query) {
          return `❌ Silakan berikan parameter untuk perintah ${command}\n\nContoh: ${command} [parameter]`;
        }
        return await this.commands[command](phoneNumber, query, platform);
      } else {
        // If no command found, treat the entire message as search query
        if (message) {
          console.log(`🔍 No command found, treating as search: "${message}"`);
          return await this.searchPeraturan(phoneNumber, message, platform);
        } else {
          return this.showHelp(platform);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return `❌ Error: ${error.message}`;
    }
  }
}

// Initialize bot
const bot = new JDIHBot();

// Initialize WhatsApp Bot
const whatsappBot = new WhatsAppBot(bot);

// Initialize Telegram Bot
const telegramBot = new TelegramBot(bot);

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    searchHistoryCount: bot.searchHistory.length,
    platforms: {
      whatsapp: process.env.WHATSAPP_ENABLED === 'true',
      telegram: process.env.TELEGRAM_ENABLED === 'true'
    }
  });
});

app.post('/test', async (req, res) => {
  try {
    const { phoneNumber = '+6281234567890', message = 'help', platform = 'general' } = req.body;
    const responseText = await bot.processMessage(phoneNumber, message, platform);

    res.json({
      phoneNumber,
      message,
      platform,
      response: responseText
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Panel Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve admin.js
app.get('/admin.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.js'));
});

// Serve QR code image directly
app.get('/admin/qr', (req, res) => {
  try {
    const qrPath = path.resolve(whatsappBot.sessionPath, 'qr.png');
    console.log('QR path:', qrPath);
    console.log('QR exists:', fs.existsSync(qrPath));
    
    if (fs.existsSync(qrPath)) {
      res.setHeader('Content-Type', 'image/png');
      const qrBuffer = fs.readFileSync(qrPath);
      res.send(qrBuffer);
    } else {
      res.status(404).json({ error: 'QR code not found' });
    }
  } catch (error) {
    console.error('QR serve error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin API Routes
app.get('/admin/status', (req, res) => {
  try {
    console.log('Admin status requested');
    console.log('WhatsApp enabled:', process.env.WHATSAPP_ENABLED);
    console.log('WhatsApp bot exists:', !!whatsappBot);
    console.log('WhatsApp connected:', whatsappBot ? whatsappBot.isConnected : false);
    console.log('Sheets configured:', !!sheets);
    
    const status = {
      whatsapp: {
        enabled: process.env.WHATSAPP_ENABLED === 'true',
        connected: whatsappBot ? whatsappBot.isConnected : false,
        phoneNumber: null // Will be updated when connected
      },
      telegram: {
        enabled: process.env.TELEGRAM_ENABLED === 'true',
        connected: telegramBot ? telegramBot.isConnected : false,
        username: null
      },
      sheets: {
        connected: !!sheets,
        sheetName: process.env.GOOGLE_SHEET_ID ? 'Configured' : 'Not configured'
      },
      stats: {
        totalSearches: bot.searchHistory.length,
        totalUsers: new Set(bot.searchHistory.map(s => s.phoneNumber)).size,
        todaySearches: bot.searchHistory.filter(s => {
          const today = new Date().toDateString();
          return new Date(s.timestamp).toDateString() === today;
        }).length,
        uptime: Math.floor(process.uptime() / 60) + 'm ' + Math.floor(process.uptime() % 60) + 's'
      }
    };
    
    console.log('Sending status response:', JSON.stringify(status, null, 2));
    res.json(status);
  } catch (error) {
    console.error('Error in admin status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/config', (req, res) => {
  const config = {
    whatsapp: {
      enabled: process.env.WHATSAPP_ENABLED === 'true',
      sessionPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-session'
    },
    telegram: {
      enabled: process.env.TELEGRAM_ENABLED === 'true',
      token: process.env.TELEGRAM_BOT_TOKEN || ''
    },
    sheets: {
      sheetId: process.env.GOOGLE_SHEET_ID || '',
      credentials: process.env.GOOGLE_CREDENTIALS || ''
    }
  };
  res.json(config);
});

app.post('/admin/config/whatsapp', (req, res) => {
  const { enabled, sessionPath } = req.body;
  process.env.WHATSAPP_ENABLED = enabled.toString();
  process.env.WHATSAPP_SESSION_PATH = sessionPath;
  res.json({ success: true });
});

app.post('/admin/config/telegram', (req, res) => {
  const { enabled, token } = req.body;
  process.env.TELEGRAM_ENABLED = enabled.toString();
  process.env.TELEGRAM_BOT_TOKEN = token;
  res.json({ success: true });
});

app.post('/admin/config/sheets', (req, res) => {
  const { sheetId, credentials } = req.body;
  process.env.GOOGLE_SHEET_ID = sheetId;
  process.env.GOOGLE_CREDENTIALS = credentials;
  res.json({ success: true });
});

app.post('/admin/whatsapp/qr', async (req, res) => {
  try {
    if (process.env.WHATSAPP_ENABLED !== 'true') {
      return res.json({ qrCode: null, message: 'WhatsApp bot disabled' });
    }
    
    if (whatsappBot.isConnected) {
      return res.json({ qrCode: null, message: 'WhatsApp bot already connected' });
    }
    
    // Check if QR code file exists
    const qrPath = path.join(whatsappBot.sessionPath, 'qr.png');
    console.log('Checking QR path:', qrPath);
    console.log('QR file exists:', fs.existsSync(qrPath));
    
    if (fs.existsSync(qrPath)) {
      try {
        const qrBuffer = fs.readFileSync(qrPath);
        const qrBase64 = qrBuffer.toString('base64');
        console.log('QR code loaded successfully, size:', qrBuffer.length);
        return res.json({ qrCode: qrBase64, message: 'QR Code generated' });
      } catch (error) {
        console.error('Error reading QR file:', error);
        return res.json({ qrCode: null, message: 'Error reading QR file: ' + error.message });
      }
    } else {
      // Try to restart WhatsApp bot to generate QR
      console.log('QR not found, attempting to restart WhatsApp bot...');
      try {
        whatsappBot.stop();
        setTimeout(async () => {
          await whatsappBot.start();
        }, 2000);
        return res.json({ qrCode: null, message: 'QR Code not found. Restarting WhatsApp bot to generate QR...' });
      } catch (restartError) {
        console.error('Error restarting WhatsApp bot:', restartError);
        return res.json({ qrCode: null, message: 'Error restarting WhatsApp bot: ' + restartError.message });
      }
    }
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/whatsapp/status', (req, res) => {
  res.json({ 
    connected: whatsappBot.isConnected, 
    phoneNumber: null, // Will be updated when connected
    qrCode: null // Will be updated when QR is generated
  });
});

app.post('/admin/whatsapp/restart', async (req, res) => {
  try {
    whatsappBot.stop();
    setTimeout(async () => {
      await whatsappBot.start();
    }, 2000);
    res.json({ success: true, message: 'WhatsApp bot restart initiated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/whatsapp/disconnect', async (req, res) => {
  try {
    if (whatsappBot) {
      await whatsappBot.stop();
      console.log('WhatsApp bot disconnected');
      
      // Delete session files
      try {
        const sessionPath = whatsappBot.sessionPath;
        if (fs.existsSync(sessionPath)) {
          const files = fs.readdirSync(sessionPath);
          for (const file of files) {
            const filePath = path.join(sessionPath, file);
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
              console.log('Deleted session file:', file);
            }
          }
          console.log('WhatsApp session files deleted');
        }
      } catch (deleteError) {
        console.error('Error deleting session files:', deleteError);
      }
    }
    
    res.json({ success: true, message: 'WhatsApp bot disconnected and session cleared' });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove duplicate endpoint - this is handled below

// Test Telegram connection
app.post('/admin/telegram/test', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Telegram token required' });
    }
    
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    res.json({ 
      success: true, 
      bot: response.data.result,
      message: 'Telegram bot connected successfully' 
    });
  } catch (error) {
    console.error('Telegram test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to connect to Telegram: ' + error.message 
    });
  }
});

// Test Google Sheets connection
app.post('/admin/sheets/test', async (req, res) => {
  try {
    if (!sheets) {
      return res.status(400).json({ error: 'Google Sheets not configured' });
    }
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID
    });
    
    res.json({ 
      success: true, 
      sheet: response.data,
      message: 'Google Sheets connected successfully' 
    });
  } catch (error) {
    console.error('Sheets test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to connect to Google Sheets: ' + error.message 
    });
  }
});

// Save configuration
app.post('/admin/config/save', async (req, res) => {
  try {
    console.log('Saving configuration:', req.body);
    
    const { whatsappEnabled, telegramEnabled, telegramToken, googleSheetId, googleCredentials } = req.body;
    
    // Update environment variables
    if (whatsappEnabled !== undefined) {
      process.env.WHATSAPP_ENABLED = whatsappEnabled ? 'true' : 'false';
      console.log('WhatsApp enabled set to:', process.env.WHATSAPP_ENABLED);
    }
    
    if (telegramEnabled !== undefined) {
      process.env.TELEGRAM_ENABLED = telegramEnabled ? 'true' : 'false';
      console.log('Telegram enabled set to:', process.env.TELEGRAM_ENABLED);
    }
    
    if (telegramToken) {
      process.env.TELEGRAM_BOT_TOKEN = telegramToken;
      console.log('Telegram token updated');
    }
    
    if (googleSheetId) {
      process.env.GOOGLE_SHEET_ID = googleSheetId;
      console.log('Google Sheet ID updated:', googleSheetId);
    }
    
    if (googleCredentials) {
      try {
        // Validate JSON first
        const parsedCredentials = JSON.parse(googleCredentials);
        console.log('Credentials JSON is valid');
        
        // Save credentials to file
        const credentialsPath = path.join(__dirname, 'google-credentials.json');
        fs.writeFileSync(credentialsPath, JSON.stringify(parsedCredentials, null, 2));
        process.env.GOOGLE_CREDENTIALS_PATH = credentialsPath;
        console.log('Credentials saved to file');
        
        // Reinitialize Google Sheets
        const auth = new google.auth.GoogleAuth({
          credentials: parsedCredentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        sheets = google.sheets({ version: 'v4', auth });
        console.log('Google Sheets reinitialized');
        
      } catch (jsonError) {
        console.error('Invalid JSON credentials:', jsonError.message);
        return res.status(400).json({ error: 'Invalid JSON credentials: ' + jsonError.message });
      }
    }
    
    // Save to .env file
    try {
      const envPath = path.join(__dirname, '.env');
      let envContent = '';
      
      // Read existing .env file if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Update existing variables or add new ones
      const envVars = {
        'WHATSAPP_ENABLED': process.env.WHATSAPP_ENABLED,
        'TELEGRAM_ENABLED': process.env.TELEGRAM_ENABLED,
        'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
        'GOOGLE_SHEET_ID': process.env.GOOGLE_SHEET_ID,
        'GOOGLE_CREDENTIALS_PATH': process.env.GOOGLE_CREDENTIALS_PATH
      };
      
      for (const [key, value] of Object.entries(envVars)) {
        if (value) {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          const newLine = `${key}=${value}`;
          
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, newLine);
          } else {
            envContent += `\n${newLine}`;
          }
        }
      }
      
      // Write updated .env file
      fs.writeFileSync(envPath, envContent);
      console.log('Configuration saved to .env file');
    } catch (fileError) {
      console.warn('Failed to save to .env file:', fileError.message);
    }
    
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get configuration
app.get('/admin/config', (req, res) => {
  try {
    const config = {
      whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true',
      telegramEnabled: process.env.TELEGRAM_ENABLED === 'true',
      telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
      googleSheetId: process.env.GOOGLE_SHEET_ID || '',
      googleCredentials: process.env.GOOGLE_CREDENTIALS || ''
    };
    
    console.log('Sending config:', config);
    res.json(config);
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get logs
app.get('/admin/logs', (req, res) => {
  try {
    // Get recent console logs (simplified version)
    const logs = [
      `[${new Date().toISOString()}] JDIH Bot started`,
      `[${new Date().toISOString()}] WhatsApp: ${whatsappBot ? (whatsappBot.isConnected ? 'Connected' : 'Disconnected') : 'Not initialized'}`,
      `[${new Date().toISOString()}] Google Sheets: ${sheets ? 'Connected' : 'Not configured'}`,
      `[${new Date().toISOString()}] Server running on port ${PORT}`,
      `[${new Date().toISOString()}] Admin panel accessible at /admin`
    ];
    
    res.json({ logs: logs.join('\n') });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/telegram/restart', (req, res) => {
  res.json({ success: true, message: 'Telegram bot restart initiated' });
});

app.post('/admin/sheets/test', async (req, res) => {
  try {
    if (!sheets || !spreadsheetId) {
      throw new Error('Google Sheets not configured');
    }
    
    // Test connection by trying to read a cell
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A1'
    });
    
    res.json({ success: true, message: 'Google Sheets connection successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/restart', (req, res) => {
  res.json({ success: true, message: 'Bot restart initiated' });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

app.post('/admin/stop', (req, res) => {
  res.json({ success: true, message: 'Bot stop initiated' });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

app.get('/admin/logs', (req, res) => {
  const logs = bot.searchHistory
    .slice(-50) // Last 50 entries
    .map(entry => `${new Date(entry.timestamp).toLocaleString()} - ${entry.platform} - ${entry.searchType} - ${entry.query}`)
    .join('\n');
  res.json({ logs });
});

app.post('/admin/logs/clear', (req, res) => {
  bot.searchHistory = [];
  res.json({ success: true, message: 'Logs cleared' });
});

app.get('/admin/export', (req, res) => {
  const exportData = {
    timestamp: new Date().toISOString(),
    searchHistory: bot.searchHistory,
    config: {
      whatsapp: {
        enabled: process.env.WHATSAPP_ENABLED === 'true',
        sessionPath: process.env.WHATSAPP_SESSION_PATH
      },
      telegram: {
        enabled: process.env.TELEGRAM_ENABLED === 'true',
        token: process.env.TELEGRAM_BOT_TOKEN ? '***configured***' : ''
      },
      sheets: {
        sheetId: process.env.GOOGLE_SHEET_ID ? '***configured***' : '',
        credentials: process.env.GOOGLE_CREDENTIALS ? '***configured***' : ''
      }
    }
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="jdih-bot-data-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(exportData);
});

// Start server
app.listen(PORT, async () => {
  console.log(`🤖 JDIH Hybrid Bot running on port ${PORT}`);
  console.log(`📱 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`📊 Google Sheets: ${sheets ? 'Connected' : 'Not configured'}`);
  console.log(`📱 WhatsApp: ${process.env.WHATSAPP_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`✈️ Telegram: ${process.env.TELEGRAM_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  
  // Initialize WhatsApp Bot if enabled
  if (process.env.WHATSAPP_ENABLED === 'true') {
    console.log('🔄 Starting WhatsApp Bot...');
    await whatsappBot.start();
  }
  
  // Initialize Telegram Bot if enabled
  if (process.env.TELEGRAM_ENABLED === 'true') {
    console.log('🔄 Starting Telegram Bot...');
    await telegramBot.start();
  }
});

module.exports = { app, bot };