const express = require('express');
const cors = require('cors');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

let sock = null;
let qrCode = null;
let isConnected = false;
let messageQueue = [];

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            try {
                qrCode = await qrcode.toDataURL(qr);
                console.log('New QR code received and converted to Data URL');
            } catch (err) {
                console.error('Failed to generate QR code', err);
                qrCode = qr;
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            isConnected = false;
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Logged out. Please delete auth folder and restart.');
                qrCode = null;
                // Delete auth info if logged out
                if (fs.existsSync(AUTH_DIR)) {
                    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                }
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connected!');
            qrCode = null;
            isConnected = true;
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        
        for (const msg of m.messages) {
            if (!msg.message) continue;
            if (msg.key.fromMe) continue; // Kendimizin gönderdiklerini yoksay
            
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!text) continue;
            
            const sender = msg.key.remoteJid;
            const senderName = msg.pushName || 'Bilinmiyor';
            
            messageQueue.push({
                id: msg.key.id,
                sender_number: sender,
                sender_name: senderName,
                original_message: text,
                timestamp: new Date().toISOString()
            });
            console.log(`Yeni WhatsApp mesajı alındı: ${sender} - ${text}`);
        }
    });
}

// Start connection
connectToWhatsApp();

// API Endpoints for Tauri to call
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        qr: qrCode
    });
});

app.get('/messages', (req, res) => {
    const msgs = [...messageQueue];
    messageQueue = []; // Clear queue after reading
    res.json(msgs);
});

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!isConnected || !sock) {
        return res.status(500).json({ error: 'WhatsApp is not connected' });
    }
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }

    try {
        // Format number: remove non-digits. Ensure it has 90 if Turkish, etc.
        let formattedNumber = number.replace(/\D/g, '');
        if (!formattedNumber.startsWith('90') && formattedNumber.length === 10) {
            formattedNumber = '90' + formattedNumber;
        }
        
        const jid = formattedNumber + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true, message: 'Sent successfully' });
    } catch (err) {
        console.error('Failed to send message:', err);
        res.status(500).json({ error: err.toString() });
    }
});

app.post('/logout', async (req, res) => {
    if (sock) {
        sock.logout();
        isConnected = false;
        qrCode = null;
    }
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`WhatsApp worker listening on port ${PORT}`);
});
