// Admin Panel JavaScript - JDIH Bot
// File: admin.js

let logInterval;
let qrGenerated = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initialized');
    loadStatus();
    loadConfig();
    startLogUpdates();
    startStatusUpdates();
    
        // Add event listeners
        addEventListeners();
        
        // Update disconnect button visibility based on WhatsApp status
        updateDisconnectButtonVisibility();
    
    // Auto-load QR code if WhatsApp is enabled
    setTimeout(() => {
        if (document.getElementById('whatsapp-enabled')?.value === 'true') {
            console.log('Auto-loading QR code...');
            generateQR();
        }
    }, 2000);
});

// Add event listeners for all buttons
function addEventListeners() {
    // Universal save button
    const saveAllBtn = document.getElementById('save-all-config-btn');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', saveAllConfig);
    }
    
    // WhatsApp buttons
    const generateQrBtn = document.getElementById('generate-qr-btn');
    if (generateQrBtn) {
        generateQrBtn.addEventListener('click', generateQR);
    }
    
    const checkConnectionBtn = document.getElementById('check-connection-btn');
    if (checkConnectionBtn) {
        checkConnectionBtn.addEventListener('click', checkConnection);
    }
    
    const disconnectWhatsAppBtn = document.getElementById('disconnect-whatsapp-btn');
    if (disconnectWhatsAppBtn) {
        disconnectWhatsAppBtn.addEventListener('click', disconnectWhatsApp);
    }
    
    const testTelegramBtn = document.getElementById('test-telegram-btn');
    if (testTelegramBtn) {
        testTelegramBtn.addEventListener('click', testTelegram);
    }
    
    const restartTelegramBtn = document.getElementById('restart-telegram-btn');
    if (restartTelegramBtn) {
        restartTelegramBtn.addEventListener('click', restartTelegram);
    }
    
    // Sheets buttons
    
    const testSheetsBtn = document.getElementById('test-sheets-btn');
    if (testSheetsBtn) {
        testSheetsBtn.addEventListener('click', testSheets);
    }
}

// Load bot status
async function loadStatus() {
    try {
        console.log('Loading status...');
        const response = await fetch('/admin/status');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        console.log('Status data:', data);
        updateStatusCards(data);
        updateStatistics(data);
        updateDisconnectButtonVisibility();
    } catch (error) {
        console.error('Error loading status:', error);
        showAlert('Error loading status: ' + error.message, 'error');
    }
}

// Update status cards
function updateStatusCards(data) {
    // WhatsApp Status
    const whatsappCard = document.getElementById('whatsapp-status');
    const whatsappIndicator = document.getElementById('whatsapp-indicator');
    const whatsappInfo = document.getElementById('whatsapp-info');
    
    if (whatsappCard && whatsappIndicator && whatsappInfo) {
        if (data.whatsapp && data.whatsapp.connected) {
            whatsappCard.classList.remove('disabled');
            whatsappIndicator.classList.remove('disabled');
            whatsappInfo.textContent = `Status: Terhubung (${data.whatsapp.phoneNumber || 'Unknown'})`;
        } else {
            whatsappCard.classList.add('disabled');
            whatsappIndicator.classList.add('disabled');
            whatsappInfo.textContent = `Status: ${data.whatsapp ? 'Disconnected' : 'Disabled'}`;
        }
    }

    // Update WhatsApp QR visibility based on connection status
    updateWhatsAppQRVisibility(data.whatsapp && data.whatsapp.connected);

    // Telegram Status
    const telegramCard = document.getElementById('telegram-status');
    const telegramIndicator = document.getElementById('telegram-indicator');
    const telegramInfo = document.getElementById('telegram-info');
    
    if (telegramCard && telegramIndicator && telegramInfo) {
        if (data.telegram && data.telegram.connected) {
            telegramCard.classList.remove('disabled');
            telegramIndicator.classList.remove('disabled');
            telegramInfo.textContent = `Status: Terhubung (@${data.telegram.username || 'Unknown'})`;
        } else {
            telegramCard.classList.add('disabled');
            telegramIndicator.classList.add('disabled');
            telegramInfo.textContent = `Status: ${data.telegram ? 'Disconnected' : 'Disabled'}`;
        }
    }

    // Google Sheets Status
    const sheetsCard = document.getElementById('sheets-status');
    const sheetsIndicator = document.getElementById('sheets-indicator');
    const sheetsInfo = document.getElementById('sheets-info');
    
    if (sheetsCard && sheetsIndicator && sheetsInfo) {
        if (data.sheets && data.sheets.connected) {
            sheetsCard.classList.remove('disabled');
            sheetsIndicator.classList.remove('disabled');
            sheetsInfo.textContent = `Status: Terhubung (${data.sheets.sheetName || 'Unknown'})`;
        } else {
            sheetsCard.classList.add('disabled');
            sheetsIndicator.classList.add('disabled');
            sheetsInfo.textContent = `Status: ${data.sheets ? 'Disconnected' : 'Not configured'}`;
        }
    }
}

// Update statistics
function updateStatistics(data) {
    const totalSearches = document.getElementById('total-searches');
    const totalUsers = document.getElementById('total-users');
    const todaySearches = document.getElementById('today-searches');
    const uptime = document.getElementById('uptime');
    
    if (totalSearches) totalSearches.textContent = data.stats?.totalSearches || 0;
    if (totalUsers) totalUsers.textContent = data.stats?.totalUsers || 0;
    if (todaySearches) todaySearches.textContent = data.stats?.todaySearches || 0;
    if (uptime) uptime.textContent = data.stats?.uptime || '0h 0m';
}

// Load configuration
async function loadConfig() {
    try {
        console.log('Loading config...');
        const response = await fetch('/admin/config');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        
        console.log('Config data:', data);
        
        // Set default values if elements exist
        const whatsappEnabled = document.getElementById('whatsapp-enabled');
        const whatsappSessionPath = document.getElementById('whatsapp-session-path');
        const telegramEnabled = document.getElementById('telegram-enabled');
        const telegramToken = document.getElementById('telegram-token');
        const sheetsId = document.getElementById('sheets-id');
        const sheetsCredentials = document.getElementById('sheets-credentials');
        
        if (whatsappEnabled) whatsappEnabled.value = data.whatsapp?.enabled ? 'true' : 'false';
        if (whatsappSessionPath) whatsappSessionPath.value = data.whatsapp?.sessionPath || './whatsapp-session';
        if (telegramEnabled) telegramEnabled.value = data.telegram?.enabled ? 'true' : 'false';
        if (telegramToken) telegramToken.value = data.telegram?.token || '';
        if (sheetsId) sheetsId.value = data.sheets?.sheetId || '';
        if (sheetsCredentials) sheetsCredentials.value = data.sheets?.credentials || '';
    } catch (error) {
        console.error('Error loading config:', error);
        showAlert('Error loading configuration: ' + error.message, 'error');
    }
}

// Save WhatsApp configuration
async function saveWhatsAppConfig() {
    try {
        const config = {
            enabled: document.getElementById('whatsapp-enabled').value === 'true',
            sessionPath: document.getElementById('whatsapp-session-path').value
        };

        const response = await fetch('/admin/config/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showAlert('Konfigurasi WhatsApp berhasil disimpan!', 'success');
            loadStatus();
        } else {
            throw new Error('Failed to save WhatsApp config');
        }
    } catch (error) {
        showAlert('Error saving WhatsApp config: ' + error.message, 'error');
    }
}

// Save Telegram configuration
async function saveTelegramConfig() {
    try {
        const config = {
            enabled: document.getElementById('telegram-enabled').value === 'true',
            token: document.getElementById('telegram-token').value
        };

        const response = await fetch('/admin/config/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showAlert('Konfigurasi Telegram berhasil disimpan!', 'success');
            loadStatus();
        } else {
            throw new Error('Failed to save Telegram config');
        }
    } catch (error) {
        showAlert('Error saving Telegram config: ' + error.message, 'error');
    }
}

// Save Google Sheets configuration
async function saveSheetsConfig() {
    try {
        const config = {
            sheetId: document.getElementById('sheets-id').value,
            credentials: document.getElementById('sheets-credentials').value
        };

        const response = await fetch('/admin/config/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showAlert('Konfigurasi Google Sheets berhasil disimpan!', 'success');
            loadStatus();
        } else {
            throw new Error('Failed to save Sheets config');
        }
    } catch (error) {
        showAlert('Error saving Sheets config: ' + error.message, 'error');
    }
}

// Generate QR Code
async function generateQR() {
    try {
        console.log('Generating QR code...');
        const qrContainer = document.getElementById('qr-container');
        
        // Show loading state
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    <p style="color: #666;">Loading QR Code...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
        
        const response = await fetch('/admin/whatsapp/qr', {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            console.log('QR response:', data);
            
            if (data.qrCode) {
                if (qrContainer) {
                    qrContainer.innerHTML = `
                        <img src="data:image/png;base64,${data.qrCode}" alt="WhatsApp QR Code" style="max-width: 300px; border: 2px solid #ddd; border-radius: 10px;">
                        <p style="margin-top: 10px; color: #666; font-weight: bold;">Scan QR Code ini dengan WhatsApp</p>
                        <p style="margin-top: 5px; color: #999; font-size: 12px;">WhatsApp → Menu → Linked Devices → Link a Device</p>
                    `;
                }
                qrGenerated = true;
                showAlert('QR Code berhasil dibuat!', 'success');
            } else {
                // Try to load QR from direct endpoint
                if (qrContainer) {
                    qrContainer.innerHTML = `
                        <img src="/admin/qr?t=${Date.now()}" alt="WhatsApp QR Code" style="max-width: 300px; border: 2px solid #ddd; border-radius: 10px;" 
                             onload="this.nextElementSibling.style.display='none'; this.nextElementSibling.nextElementSibling.style.display='block';"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block'; this.nextElementSibling.nextElementSibling.style.display='none';">
                        <p style="margin-top: 10px; color: #f44336; display: none;">QR Code tidak tersedia. Silakan restart WhatsApp bot.</p>
                        <p style="margin-top: 10px; color: #666; font-weight: bold; display: none;">Scan QR Code ini dengan WhatsApp</p>
                        <p style="margin-top: 5px; color: #999; font-size: 12px; display: none;">WhatsApp → Menu → Linked Devices → Link a Device</p>
                    `;
                }
                showAlert(data.message || 'QR Code tidak tersedia. Pastikan WhatsApp bot aktif.', 'warning');
            }
        } else {
            throw new Error('Failed to generate QR code');
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        const qrContainer = document.getElementById('qr-container');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #f44336;">
                    <p>❌ Error loading QR Code</p>
                    <p style="font-size: 12px; margin-top: 5px;">${error.message}</p>
                </div>
            `;
        }
        showAlert('Error generating QR code: ' + error.message, 'error');
    }
}

// Check WhatsApp connection
async function checkConnection() {
    try {
        await loadStatus();
        showAlert('Status koneksi telah diperbarui!', 'success');
    } catch (error) {
        showAlert('Error checking connection: ' + error.message, 'error');
    }
}

// Restart WhatsApp
async function restartWhatsApp() {
    try {
        const response = await fetch('/admin/whatsapp/restart', {
            method: 'POST'
        });

        if (response.ok) {
            showAlert('WhatsApp bot sedang restart...', 'success');
            setTimeout(loadStatus, 3000);
        } else {
            throw new Error('Failed to restart WhatsApp');
        }
    } catch (error) {
        showAlert('Error restarting WhatsApp: ' + error.message, 'error');
    }
}

// Disconnect WhatsApp
async function disconnectWhatsApp() {
    const disconnectBtn = document.getElementById('disconnect-whatsapp-btn');
    if (!disconnectBtn) return;

    // Show loading state
    const originalText = disconnectBtn.textContent;
    disconnectBtn.disabled = true;
    disconnectBtn.textContent = 'Disconnecting...';

    try {
        const response = await fetch('/admin/whatsapp/disconnect', {
            method: 'POST'
        });

        if (response.ok) {
            showAlert('WhatsApp bot telah disconnect!', 'success');
            // Hide disconnect button
            disconnectBtn.style.display = 'none';
            setTimeout(loadStatus, 1000);
        } else {
            throw new Error('Failed to disconnect WhatsApp');
        }
    } catch (error) {
        showAlert('Error disconnecting WhatsApp: ' + error.message, 'error');
    } finally {
        // Restore button state
        disconnectBtn.disabled = false;
        disconnectBtn.textContent = originalText;
    }
}

// Update disconnect button visibility based on WhatsApp connection status
function updateDisconnectButtonVisibility() {
    const disconnectBtn = document.getElementById('disconnect-whatsapp-btn');
    if (!disconnectBtn) return;

    // Check current status
    fetch('/admin/status')
        .then(response => response.json())
        .then(data => {
            if (data.whatsapp && data.whatsapp.connected) {
                disconnectBtn.style.display = 'inline-block';
            } else {
                disconnectBtn.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error checking WhatsApp status:', error);
            disconnectBtn.style.display = 'none';
        });
}

// Restart Telegram
async function restartTelegram() {
    try {
        const response = await fetch('/admin/telegram/restart', {
            method: 'POST'
        });

        if (response.ok) {
            showAlert('Telegram bot sedang restart...', 'success');
            setTimeout(loadStatus, 3000);
        } else {
            throw new Error('Failed to restart Telegram');
        }
    } catch (error) {
        showAlert('Error restarting Telegram: ' + error.message, 'error');
    }
}

// Test Google Sheets connection
async function testSheetsConnection() {
    try {
        const response = await fetch('/admin/sheets/test', {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            showAlert(data.message || 'Google Sheets connection test completed!', 'success');
        } else {
            throw new Error('Failed to test Sheets connection');
        }
    } catch (error) {
        showAlert('Error testing Sheets connection: ' + error.message, 'error');
    }
}

// Refresh logs
async function refreshLogs() {
    try {
        const response = await fetch('/admin/logs');
        if (response.ok) {
            const data = await response.json();
            const logsContainer = document.getElementById('logs-container');
            if (logsContainer) {
                logsContainer.innerHTML = `<pre>${data.logs || 'No logs available'}</pre>`;
            }
        }
    } catch (error) {
        console.error('Error refreshing logs:', error);
    }
}

// Clear logs
async function clearLogs() {
    try {
        const response = await fetch('/admin/logs/clear', {
            method: 'POST'
        });

        if (response.ok) {
            showAlert('Logs berhasil dihapus!', 'success');
            refreshLogs();
        } else {
            throw new Error('Failed to clear logs');
        }
    } catch (error) {
        showAlert('Error clearing logs: ' + error.message, 'error');
    }
}

// Export data
async function exportData() {
    try {
        const response = await fetch('/admin/export');
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'jdih-bot-data.json';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showAlert('Data berhasil diekspor!', 'success');
        } else {
            throw new Error('Failed to export data');
        }
    } catch (error) {
        showAlert('Error exporting data: ' + error.message, 'error');
    }
}

// Start log updates
function startLogUpdates() {
    refreshLogs();
    logInterval = setInterval(refreshLogs, 5000); // Update every 5 seconds
}

// Start status updates
function startStatusUpdates() {
    setInterval(loadStatus, 10000); // Update every 10 seconds
}

// Show alert
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success':
            alertDiv.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            alertDiv.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            alertDiv.style.backgroundColor = '#ff9800';
            break;
        default:
            alertDiv.style.backgroundColor = '#2196F3';
    }
    
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => alertDiv.remove(), 500);
    }, 5000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (logInterval) {
        clearInterval(logInterval);
    }
});

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showAlert('Terjadi error: ' + event.error.message, 'error');
});

// CSP error handler
window.addEventListener('securitypolicyviolation', function(event) {
    console.error('CSP violation:', event);
    showAlert('Security policy violation: ' + event.violatedDirective, 'warning');
});

// Save all configurations at once
async function saveAllConfig() {
    try {
        console.log('Saving all configurations...');
        
        // Show loading state
        const saveBtn = document.getElementById('save-all-config-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '💾 Menyimpan...';
        }
        
        // Collect all configuration data
        const config = {
            whatsappEnabled: document.getElementById('whatsapp-enabled')?.value === 'true',
            telegramEnabled: document.getElementById('telegram-enabled')?.value === 'true',
            telegramToken: document.getElementById('telegram-token')?.value || '',
            googleSheetId: document.getElementById('google-sheet-id')?.value || '',
            googleCredentials: document.getElementById('google-credentials')?.value || ''
        };
        
        console.log('Saving config:', config);
        
        // Validate JSON credentials before sending
        if (config.googleCredentials) {
            try {
                JSON.parse(config.googleCredentials);
            } catch (jsonError) {
                showAlert('Error: Credentials JSON tidak valid. ' + jsonError.message, 'error');
                return;
            }
        }
        
        const response = await fetch('/admin/config/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert('✅ ' + result.message, 'success');
            
            // Refresh status and config after saving
            setTimeout(() => {
                loadStatus();
                loadConfig();
            }, 1000);
        } else {
            const error = await response.json();
            showAlert('❌ Error: ' + error.error, 'error');
        }
    } catch (error) {
        console.error('Error saving all config:', error);
        showAlert('❌ Error saving configuration: ' + error.message, 'error');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('save-all-config-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Simpan Semua Konfigurasi';
        }
    }
}

// Save configuration (legacy function for backward compatibility)
async function saveConfig() {
    try {
        const config = {
            whatsappEnabled: document.getElementById('whatsapp-enabled')?.value === 'true',
            telegramEnabled: document.getElementById('telegram-enabled')?.value === 'true',
            telegramToken: document.getElementById('telegram-token')?.value || '',
            googleSheetId: document.getElementById('google-sheet-id')?.value || '',
            googleCredentials: document.getElementById('google-credentials')?.value || ''
        };
        
        console.log('Saving config:', config);
        
        // Validate JSON credentials before sending
        if (config.googleCredentials) {
            try {
                JSON.parse(config.googleCredentials);
            } catch (jsonError) {
                showAlert('Error: Credentials JSON tidak valid. ' + jsonError.message, 'error');
                return;
            }
        }
        
        const response = await fetch('/admin/config/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert(result.message, 'success');
            // Refresh status and config after saving
            setTimeout(() => {
                loadStatus();
                loadConfig(); // Reload configuration to ensure form is updated
            }, 1000);
        } else {
            const error = await response.json();
            showAlert('Error: ' + error.error, 'error');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        showAlert('Error saving configuration: ' + error.message, 'error');
    }
}

// Test Telegram connection
async function testTelegram() {
    try {
        const token = document.getElementById('telegram-token')?.value;
        if (!token) {
            showAlert('Please enter Telegram bot token first', 'warning');
            return;
        }
        
        showAlert('Testing Telegram connection...', 'info');
        
        const response = await fetch('/admin/telegram/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert(`✅ ${result.message}\nBot: @${result.bot.username}`, 'success');
        } else {
            const error = await response.json();
            showAlert('❌ ' + error.error, 'error');
        }
    } catch (error) {
        console.error('Error testing Telegram:', error);
        showAlert('Error testing Telegram: ' + error.message, 'error');
    }
}

// Test Google Sheets connection
async function testSheets() {
    try {
        showAlert('Testing Google Sheets connection...', 'info');
        
        const response = await fetch('/admin/sheets/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert(`✅ ${result.message}\nSheet: ${result.sheet.properties.title}`, 'success');
        } else {
            const error = await response.json();
            showAlert('❌ ' + error.error, 'error');
        }
    } catch (error) {
        console.error('Error testing Sheets:', error);
        showAlert('Error testing Google Sheets: ' + error.message, 'error');
    }
}

// Refresh logs
async function refreshLogs() {
    try {
        const response = await fetch('/admin/logs');
        if (response.ok) {
            const data = await response.json();
            const logsContainer = document.getElementById('logs-container');
            if (logsContainer) {
                logsContainer.textContent = data.logs || 'No logs available';
            }
        }
    } catch (error) {
        console.error('Error refreshing logs:', error);
    }
}

// Check WhatsApp connection
async function checkConnection() {
    try {
        const response = await fetch('/admin/whatsapp/status');
        const data = await response.json();
        
        if (data.connected) {
            showAlert('✅ WhatsApp bot terhubung!', 'success');
        } else {
            showAlert('❌ WhatsApp bot tidak terhubung. Silakan scan QR code.', 'warning');
        }
    } catch (error) {
        console.error('Error checking connection:', error);
        showAlert('Error checking connection: ' + error.message, 'error');
    }
}

// Test Telegram connection
async function testTelegram() {
    try {
        const response = await fetch('/admin/telegram/test', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Telegram bot berhasil terhubung!', 'success');
        } else {
            showAlert('❌ Telegram bot gagal terhubung: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error testing Telegram:', error);
        showAlert('Error testing Telegram: ' + error.message, 'error');
    }
}

// Restart Telegram bot
async function restartTelegram() {
    try {
        const response = await fetch('/admin/telegram/restart', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Telegram bot berhasil di-restart!', 'success');
        } else {
            showAlert('❌ Gagal restart Telegram bot: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error restarting Telegram:', error);
        showAlert('Error restarting Telegram: ' + error.message, 'error');
    }
}

// Test Google Sheets connection
async function testSheets() {
    try {
        const response = await fetch('/admin/sheets/test', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('✅ Google Sheets berhasil terhubung!', 'success');
        } else {
            showAlert('❌ Google Sheets gagal terhubung: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error testing Sheets:', error);
        showAlert('Error testing Sheets: ' + error.message, 'error');
    }
}

// Load configuration
async function loadConfig() {
    try {
        console.log('Loading configuration...');
        const response = await fetch('/admin/config');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const config = await response.json();
        console.log('Config received:', config);
        
        // Update form fields
        if (config.whatsappEnabled !== undefined) {
            const whatsappSelect = document.getElementById('whatsapp-enabled');
            if (whatsappSelect) {
                whatsappSelect.value = config.whatsappEnabled ? 'true' : 'false';
                console.log('WhatsApp enabled set to:', whatsappSelect.value);
            } else {
                console.warn('WhatsApp enabled select not found');
            }
        }
        
        if (config.telegramEnabled !== undefined) {
            const telegramSelect = document.getElementById('telegram-enabled');
            if (telegramSelect) {
                telegramSelect.value = config.telegramEnabled ? 'true' : 'false';
                console.log('Telegram enabled set to:', telegramSelect.value);
            }
        }
        
        if (config.telegramToken) {
            const telegramTokenInput = document.getElementById('telegram-token');
            if (telegramTokenInput) {
                telegramTokenInput.value = config.telegramToken;
                console.log('Telegram token set');
            }
        }
        
        if (config.googleSheetId) {
            const googleSheetInput = document.getElementById('google-sheet-id');
            if (googleSheetInput) {
                googleSheetInput.value = config.googleSheetId;
                console.log('Google Sheet ID set');
            }
        }
        
        if (config.googleCredentials) {
            const googleCredentialsTextarea = document.getElementById('google-credentials');
            if (googleCredentialsTextarea) {
                googleCredentialsTextarea.value = config.googleCredentials;
                console.log('Google credentials set');
            }
        }
        
        console.log('Configuration loaded successfully');
    } catch (error) {
        console.error('Error loading configuration:', error);
        showAlert('Error loading configuration: ' + error.message, 'error');
    }
}

// Update WhatsApp QR visibility based on connection status
function updateWhatsAppQRVisibility(isConnected) {
    const qrContainer = document.getElementById('qr-container');
    const connectedMessage = document.getElementById('whatsapp-connected-message');
    const disconnectedMessage = document.getElementById('whatsapp-disconnected-message');
    const generateQRBtn = document.getElementById('generate-qr-btn');
    const disconnectBtn = document.getElementById('disconnect-whatsapp-btn');

    if (isConnected) {
        // Hide QR code and show connected message
        if (qrContainer) qrContainer.style.display = 'none';
        if (connectedMessage) connectedMessage.style.display = 'block';
        if (disconnectedMessage) disconnectedMessage.style.display = 'none';
        if (generateQRBtn) generateQRBtn.style.display = 'none';
        if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
    } else {
        // Show QR code and hide connected message
        if (qrContainer) qrContainer.style.display = 'flex';
        if (connectedMessage) connectedMessage.style.display = 'none';
        if (disconnectedMessage) disconnectedMessage.style.display = 'block';
        if (generateQRBtn) generateQRBtn.style.display = 'inline-block';
        if (disconnectBtn) disconnectBtn.style.display = 'none';
    }
}

console.log('Admin panel JavaScript loaded successfully');

