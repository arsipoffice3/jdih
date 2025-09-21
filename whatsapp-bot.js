#!/usr/bin/env node

/**
 * WhatsApp Bot menggunakan Baileys (GRATIS)
 * JDIH Kementerian Perhubungan Bot
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const P = require('pino');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Ensure Web Crypto is available in Node (required for pairing code on some hosts)
try {
  if (!globalThis.crypto) {
    const { webcrypto } = require('crypto');
    globalThis.crypto = webcrypto;
  }
} catch (_) {}



// Bot will be injected via constructor to avoid circular dependency

class WhatsAppBot {
  constructor(bot) {
    this.sock = null;
    this.isConnected = false;
    this.sessionPath = process.env.WHATSAPP_SESSION_PATH || './whatsapp-session';
    this.logger = P({ level: 'silent' });
    this.bot = bot;
  }

  async start() {
    try {
      console.log('🚀 Starting WhatsApp Bot...');
      
      // Create session directory
      if (!fs.existsSync(this.sessionPath)) {
        fs.mkdirSync(this.sessionPath, { recursive: true });
      }

      // Load auth state
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      // Create socket
      this.sock = makeWASocket({
        auth: state,
        // We handle QR manually to also persist to files
        printQRInTerminal: false,
        logger: this.logger,
        browser: ['JDIH Bot', 'Chrome', '1.0.0']
      });

      // Optional: Pairing code flow for headless environments (no QR rendering)
      try {
        if (process.env.WA_PAIRING === 'true' && !state.creds.registered) {
          const phone = (process.env.WA_PHONE_NUMBER || '').replace(/\D/g, '');
          if (!phone) {
            console.log('⚠️  WA_PAIRING enabled but WA_PHONE_NUMBER is missing.');
          } else {
            const pairingCode = await this.sock.requestPairingCode('+' + phone);
            const pairingPath = path.join(this.sessionPath, 'pairing-code.txt');
            fs.writeFileSync(pairingPath, pairingCode);
            console.log('🔐 Pairing code generated (also saved to pairing-code.txt):', pairingCode);
          }
        }
      } catch (pairErr) {
        console.log('⚠️  Failed to generate pairing code:', pairErr?.message || pairErr);
      }

      // Handle connection updates
      this.sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('📱 Scan QR Code berikut dengan WhatsApp Anda (Linked devices).');
          qrcode.generate(qr, { small: true });
          // Persist QR to files for hosting panels that don't render terminal graphics
          try {
            const qrTxtPath = path.join(this.sessionPath, 'qr.txt');
            const qrPngPath = path.join(this.sessionPath, 'qr.png');
            // Save textual (ASCII) representation
            qrcode.generate(qr, { small: true }, (ascii) => {
              try { fs.writeFileSync(qrTxtPath, String(ascii || '')); } catch {}
            });
            // Save PNG for download via File Manager
            QRCode.toFile(qrPngPath, qr).catch(() => {});
            console.log(`💾 QR saved to ${qrTxtPath} and ${qrPngPath}`);
          } catch (qrErr) {
            console.log('⚠️  Failed to persist QR:', qrErr?.message || qrErr);
          }
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
            console.log('🔄 Reconnecting...');
            this.start();
          } else {
            console.log('❌ Connection closed. Please restart the bot.');
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp Bot connected successfully!');
          this.isConnected = true;
        }
      });

      // Handle credentials update
      this.sock.ev.on('creds.update', saveCreds);

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', async (m) => {
        console.log('📨 Event messages.upsert triggered');
        console.log('📨 Raw message received:', JSON.stringify(m, null, 2));
        
        // Check if bot is connected
        if (!this.isConnected) {
          console.log('❌ Bot not connected, ignoring message');
          return;
        }
        
        try {
          // Handle different message structures
          let messageText, phoneNumber, isGroup;
          
          console.log('🔍 Checking message structure...');
          console.log('🔍 m.conversation:', m.conversation);
          console.log('🔍 m.messageContextInfo:', !!m.messageContextInfo);
          console.log('🔍 m.messages:', !!m.messages);
          console.log('🔍 m.messages length:', m.messages ? m.messages.length : 'N/A');
          
          // Check if this is a direct message object (like the one you showed)
          if (m.conversation && m.messageContextInfo) {
            console.log('📨 Processing direct message object');
            messageText = m.conversation;
            phoneNumber = '+6285299996990'; // Default phone number for testing
            isGroup = false;
            console.log('📝 Direct message text:', messageText);
          } else if (m.messages && m.messages.length > 0) {
            // Handle standard message structure
            console.log('📨 Processing standard message structure');
            const msg = m.messages[0];
            console.log('📨 First message:', JSON.stringify(msg, null, 2));
            
            if (!msg) {
              console.log('❌ No message found in array');
              return;
            }
            
            // Check if this is a message from the bot itself (to avoid loops)
            if (msg.key && msg.key.fromMe) {
              console.log('⏭️ Skipping message from bot itself');
              return;
            }
            
            // Check if message has content
            if (!msg.message) {
              console.log('❌ No message content found');
              return;
            }
            
            // Check if message is from a valid sender
            if (!msg.key || !msg.key.remoteJid) {
              console.log('❌ No valid sender found');
              return;
            }
            
            // Check if this is a message update (not a new message)
            if (m.type === 'notify' && !m.messages[0].message) {
              console.log('⏭️ Skipping message update notification');
              return;
            }
            
            // Check if this is a valid message (not a status update)
            if (!msg.messageTimestamp) {
              console.log('⏭️ Skipping message without timestamp');
              return;
            }
            
            // Check if message is too old (more than 5 minutes)
            const messageAge = Date.now() - (msg.messageTimestamp * 1000);
            if (messageAge > 300000) { // 5 minutes
              console.log('⏭️ Skipping old message (age:', messageAge, 'ms)');
              return;
            }
            
            phoneNumber = msg.key.remoteJid;
            isGroup = phoneNumber.endsWith('@g.us');
            
            // Extract message text from various message types
            if (msg.message.conversation) {
              messageText = msg.message.conversation;
              console.log('📝 Found conversation text:', messageText);
            } else if (msg.message.extendedTextMessage?.text) {
              messageText = msg.message.extendedTextMessage.text;
              console.log('📝 Found extended text:', messageText);
            } else if (msg.message.imageMessage?.caption) {
              messageText = msg.message.imageMessage.caption;
              console.log('📝 Found image caption:', messageText);
            } else if (msg.message.videoMessage?.caption) {
              messageText = msg.message.videoMessage.caption;
              console.log('📝 Found video caption:', messageText);
            } else if (msg.message.documentMessage?.caption) {
              messageText = msg.message.documentMessage.caption;
              console.log('📝 Found document caption:', messageText);
            } else if (msg.message.audioMessage?.caption) {
              messageText = msg.message.audioMessage.caption;
              console.log('📝 Found audio caption:', messageText);
            } else if (msg.message.stickerMessage?.caption) {
              messageText = msg.message.stickerMessage.caption;
              console.log('📝 Found sticker caption:', messageText);
            } else {
              console.log('❌ No recognizable message type found');
              console.log('🔍 Full message structure:', JSON.stringify(msg.message, null, 2));
              
              // Try to extract text from any text field
              const textFields = ['text', 'body', 'content', 'message'];
              for (const field of textFields) {
                if (msg.message[field]) {
                  messageText = msg.message[field];
                  console.log(`📝 Found text in field '${field}':`, messageText);
                  break;
                }
              }
            }
          } else {
            console.log('❌ No recognizable message structure found');
            return;
          }

          console.log(`📝 Extracted message text: "${messageText}"`);

          if (!messageText || messageText.trim() === '') {
            console.log('❌ No message text found or empty message');
            return;
          }
          
          console.log(`📞 Phone number: ${phoneNumber}, Is group: ${isGroup}`);
          
          // Process group messages (bot can respond in groups)
          if (isGroup) {
            console.log('📱 Processing group message');
            // For group messages, we can still process commands
          }

          console.log(`📱 Received message from ${phoneNumber}: ${messageText}`);

          console.log(`🤖 Processing message: "${messageText}"`);
          
          // Process message
          console.log('🔄 Calling bot.processMessage...');
          console.log('🔄 Parameters:', { phoneNumber, messageText, platform: 'whatsapp' });
          
          try {
            const response = await this.bot.processMessage(phoneNumber, messageText, 'whatsapp');
            
            console.log(`📤 Response generated: "${response}"`);
            
            if (!response || response.trim() === '') {
              console.log('❌ Empty response generated, not sending');
              return;
            }
            
            // Send response
            console.log(`📤 Sending response to ${phoneNumber}...`);
            console.log(`📤 Response content:`, response);
            
            await this.sock.sendMessage(phoneNumber, { text: response });
            
            console.log(`✅ Response sent to ${phoneNumber}`);
          } catch (processError) {
            console.error('❌ Error processing message:', processError);
            console.error('❌ Process error details:', processError.message);
            console.error('❌ Process error stack:', processError.stack);
            
            // Try to send error message
            try {
              await this.sock.sendMessage(phoneNumber, { 
                text: '❌ Terjadi error saat memproses pesan. Silakan coba lagi.' 
              });
              console.log(`✅ Error message sent to ${phoneNumber}`);
            } catch (sendError) {
              console.error('❌ Failed to send error message:', sendError);
            }
          }
        } catch (error) {
          console.error('❌ Error in message handler:', error);
          console.error('❌ Error details:', error.message);
          console.error('❌ Error stack:', error.stack);
          
          // Try to send error message if possible
          try {
            const msg = m.messages[0];
            if (msg && msg.key && msg.key.remoteJid) {
              console.log('🔄 Attempting to send error message...');
              await this.sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Terjadi error. Silakan coba lagi.' 
              });
              console.log(`✅ Error message sent to ${msg.key.remoteJid}`);
            } else {
              console.log('❌ Cannot send error message - no valid message key');
            }
          } catch (sendError) {
            console.error('❌ Failed to send error message:', sendError);
          }
        }
      });

      // Handle message status updates
      this.sock.ev.on('messages.update', (updates) => {
        console.log('📨 Event messages.update triggered:', updates);
        updates.forEach(update => {
          if (update.status === 'read') {
            console.log(`📖 Message read by ${update.key.remoteJid}`);
          }
        });
      });

      // Handle presence updates
      this.sock.ev.on('presence.update', (presence) => {
        console.log(`👤 ${presence.id} is ${presence.presences[presence.id]?.lastSeen ? 'online' : 'offline'}`);
      });

    } catch (error) {
      console.error('❌ Error starting WhatsApp Bot:', error);
      setTimeout(() => this.start(), 5000); // Retry after 5 seconds
    }
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp Bot not connected');
    }

    try {
      await this.sock.sendMessage(phoneNumber, { text: message });
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  async sendBroadcast(phoneNumbers, message) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp Bot not connected');
    }

    const results = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        await this.sock.sendMessage(phoneNumber, { text: message });
        results.push({ phoneNumber, success: true });
        console.log(`✅ Message sent to ${phoneNumber}`);
      } catch (error) {
        results.push({ phoneNumber, success: false, error: error.message });
        console.error(`❌ Failed to send to ${phoneNumber}:`, error.message);
      }
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async getContactInfo(phoneNumber) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp Bot not connected');
    }

    try {
      const contact = await this.sock.onWhatsApp(phoneNumber);
      return contact[0] || null;
    } catch (error) {
      console.error('❌ Error getting contact info:', error);
      return null;
    }
  }

  async getGroupInfo(groupId) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp Bot not connected');
    }

    try {
      const groupMetadata = await this.sock.groupMetadata(groupId);
      return groupMetadata;
    } catch (error) {
      console.error('❌ Error getting group info:', error);
      return null;
    }
  }

  stop() {
    if (this.sock) {
      this.sock.end();
      this.isConnected = false;
      console.log('🛑 WhatsApp Bot stopped');
    }
  }
}

// Initialize and start bot
if (require.main === module) {
  const whatsappBot = new WhatsAppBot();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down WhatsApp Bot...');
    whatsappBot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down WhatsApp Bot...');
    whatsappBot.stop();
    process.exit(0);
  });

  // Start bot
  whatsappBot.start();
}

module.exports = WhatsAppBot;
