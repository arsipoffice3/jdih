#!/usr/bin/env node

/**
 * Telegram Bot (GRATIS)
 * JDIH Kementerian Perhubungan Bot
 */

const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Remove circular dependency - bot will be injected

class TelegramBotWrapper {
  constructor(botInstance) {
    this.bot = null;
    this.isConnected = false;
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.botInstance = botInstance; // Store bot instance
  }

  async start() {
    if (!this.token) {
      console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
      return;
    }

    try {
      console.log('🚀 Starting Telegram Bot...');
      
      // Create bot instance
      this.bot = new TelegramBot(this.token, { polling: true });
      
      // Handle polling errors
      this.bot.on('polling_error', (error) => {
        console.error('❌ Telegram polling error:', error.message);
      });

      // Handle successful connection
      this.bot.on('message', async (msg) => {
        await this.handleMessage(msg);
      });

      // Handle callback queries (inline keyboard)
      this.bot.on('callback_query', async (callbackQuery) => {
        await this.handleCallbackQuery(callbackQuery);
      });

      // Get bot info
      const botInfo = await this.bot.getMe();
      console.log(`✅ Telegram Bot connected as @${botInfo.username}`);
      this.isConnected = true;

      // Set bot commands
      await this.setCommands();

    } catch (error) {
      console.error('❌ Error starting Telegram Bot:', error);
    }
  }

  async setCommands() {
    const commands = [
      { command: 'start', description: 'Mulai bot JDIH' },
      { command: 'help', description: 'Tampilkan bantuan' },
      { command: 'bantuan', description: 'Tampilkan bantuan' },
      { command: 'search', description: 'Cari peraturan (contoh: /search transportasi)' },
      { command: 'cari', description: 'Cari peraturan (contoh: /cari transportasi)' },
      { command: 'tahun', description: 'Cari peraturan tahun tertentu (contoh: /tahun 2024)' },
      { command: 'jenis', description: 'Cari peraturan jenis tertentu (contoh: /jenis peraturan)' },
      { command: 'kelompok', description: 'Cari peraturan kelompok tertentu (contoh: /kelompok hubud)' },
      { command: 'detail', description: 'Lihat detail peraturan lengkap (contoh: /detail [link])' },
      { command: 'lengkap', description: 'Lihat detail peraturan lengkap (contoh: /lengkap [link])' },
      { command: 'stats', description: 'Lihat statistik pencarian' },
      { command: 'statistik', description: 'Lihat statistik pencarian' },
      { command: 'recent', description: 'Lihat pencarian terbaru' },
      { command: 'terbaru', description: 'Lihat pencarian terbaru' }
    ];

    try {
      await this.bot.setMyCommands(commands);
      console.log('✅ Bot commands set successfully');
    } catch (error) {
      console.error('❌ Error setting bot commands:', error);
    }
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text || '';
    const username = msg.from.username || msg.from.first_name || 'Unknown';

    console.log(`📱 Received message from @${username} (${chatId}): ${messageText}`);

    try {
      let response;

      // Handle different message types
      if (messageText.startsWith('/')) {
        // Command message
        const command = messageText.split(' ')[0].substring(1);
        const query = messageText.split(' ').slice(1).join(' ');

        switch (command) {
          case 'start':
            response = `👋 Halo @${username}!\n\n` + this.botInstance.showHelp('telegram');
            break;
          case 'help':
          case 'bantuan':
            response = this.botInstance.showHelp('telegram');
            break;
          case 'search':
          case 'cari':
            if (!query) {
              response = '❌ Silakan berikan kata kunci pencarian\n\nContoh: /cari transportasi';
            } else {
              response = await this.botInstance.searchPeraturan(chatId.toString(), query, 'telegram');
            }
            break;
          case 'tahun':
            if (!query) {
              response = '❌ Silakan berikan tahun pencarian\n\nContoh: /tahun 2024';
            } else {
              response = await this.botInstance.searchByYear(chatId.toString(), query, 'telegram');
            }
            break;
          case 'jenis':
            if (!query) {
              response = '❌ Silakan berikan jenis peraturan\n\nContoh: /jenis peraturan';
            } else {
              response = await this.botInstance.searchByType(chatId.toString(), query, 'telegram');
            }
            break;
          case 'kelompok':
            if (!query) {
              response = '❌ Silakan berikan kelompok peraturan\n\nContoh: /kelompok hubud';
            } else {
              response = await this.botInstance.searchByGroup(chatId.toString(), query, 'telegram');
            }
            break;
          case 'detail':
          case 'lengkap':
            if (!query) {
              response = '❌ Silakan berikan link detail peraturan\n\nContoh: /lengkap https://jdih.dephub.go.id/peraturan/detail?data=...';
            } else {
              response = await this.botInstance.getDetailPeraturan(chatId.toString(), query, 'telegram');
            }
            break;
          case 'stats':
          case 'statistik':
            response = this.botInstance.showStats(chatId.toString(), 'telegram');
            break;
          case 'recent':
          case 'terbaru':
            response = this.botInstance.showRecentSearches(chatId.toString(), 'telegram');
            break;
          default:
            response = '❌ Perintah tidak dikenali. Ketik /bantuan untuk melihat daftar perintah.';
        }
      } else if (messageText.trim()) {
        // Direct search
        response = await this.botInstance.processMessage(chatId.toString(), messageText, 'telegram');
      } else {
        response = this.botInstance.showHelp('telegram');
      }

      // Send response
      await this.sendMessage(chatId, response);

    } catch (error) {
      console.error('❌ Error processing message:', error);
      
      // Send error message
      await this.sendMessage(chatId, '❌ Terjadi error. Silakan coba lagi.');
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      // Handle callback data
      let response = '';

      switch (data) {
        case 'help':
          response = this.botInstance.showHelp('telegram');
          break;
        case 'stats':
          response = this.botInstance.showStats(chatId.toString(), 'telegram');
          break;
        case 'recent':
          response = this.botInstance.showRecentSearches(chatId.toString(), 'telegram');
          break;
        default:
          response = '❌ Aksi tidak dikenali';
      }

      // Send response
      await this.sendMessage(chatId, response);

      // Answer callback query
      await this.bot.answerCallbackQuery(callbackQuery.id);

    } catch (error) {
      console.error('❌ Error handling callback query:', error);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Terjadi error' });
    }
  }

  async sendMessage(chatId, text, options = {}) {
    if (!this.bot) {
      throw new Error('Telegram Bot not initialized');
    }

    try {
      // Split long messages
      if (text.length > 4096) {
        const chunks = this.splitMessage(text, 4096);
        for (const chunk of chunks) {
          await this.bot.sendMessage(chatId, chunk, options);
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }
      } else {
        await this.bot.sendMessage(chatId, text, options);
      }
      
      console.log(`✅ Message sent to ${chatId}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  splitMessage(text, maxLength) {
    const chunks = [];
    let currentChunk = '';

    const lines = text.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 <= maxLength) {
        currentChunk += (currentChunk ? '\n' : '') + line;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          // Line is too long, split it
          const words = line.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            if (currentLine.length + word.length + 1 <= maxLength) {
              currentLine += (currentLine ? ' ' : '') + word;
            } else {
              if (currentLine) {
                chunks.push(currentLine);
                currentLine = word;
              } else {
                chunks.push(word.substring(0, maxLength));
                currentLine = word.substring(maxLength);
              }
            }
          }
          
          if (currentLine) {
            currentChunk = currentLine;
          }
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  async sendBroadcast(chatIds, message) {
    if (!this.bot) {
      throw new Error('Telegram Bot not initialized');
    }

    const results = [];
    
    for (const chatId of chatIds) {
      try {
        await this.sendMessage(chatId, message);
        results.push({ chatId, success: true });
        console.log(`✅ Broadcast sent to ${chatId}`);
      } catch (error) {
        results.push({ chatId, success: false, error: error.message });
        console.error(`❌ Failed to send to ${chatId}:`, error.message);
      }
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async getChatInfo(chatId) {
    if (!this.bot) {
      throw new Error('Telegram Bot not initialized');
    }

    try {
      const chat = await this.bot.getChat(chatId);
      return chat;
    } catch (error) {
      console.error('❌ Error getting chat info:', error);
      return null;
    }
  }

  stop() {
    if (this.bot) {
      this.bot.stopPolling();
      this.isConnected = false;
      console.log('🛑 Telegram Bot stopped');
    }
  }
}

// Initialize and start bot
if (require.main === module) {
  const telegramBot = new TelegramBotWrapper();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Telegram Bot...');
    telegramBot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Telegram Bot...');
    telegramBot.stop();
    process.exit(0);
  });

  // Start bot
  telegramBot.start();
}

module.exports = TelegramBotWrapper;
