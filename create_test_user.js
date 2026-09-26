const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = 'D:\\Web-Siteleri\\mizannet-web\\mizannet.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("DB Connection error:", err);
        process.exit(1);
    }
});

const email = 'test@mizannet.com';
const password = 'Test1234!';
const name = 'Test Kullanıcısı';

const hash = bcrypt.hashSync(password, 10);

db.serialize(() => {
    db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hash], function(err) {
        if (err) {
            console.error("Error inserting user:", err);
            return;
        }
        const userId = this.lastID;
        console.log(`User created successfully! ID: ${userId}`);
        
        // Also add a trial subscription for this user
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);
        
        db.run(`INSERT INTO subscriptions (user_id, plan, status, trial_end) VALUES (?, 'trial', 'active', ?)`, [userId, trialEnd.toISOString()], function(err2) {
            if (err2) {
                console.error("Error adding subscription:", err2);
            } else {
                console.log("Trial subscription added successfully!");
            }
            db.close();
        });
    });
});
