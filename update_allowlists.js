const fs = require('fs');

// 1. Update whatsapp.rs
let wa = fs.readFileSync('src-tauri/src/commands/whatsapp.rs', 'utf8');

if (!wa.includes('whatsapp_allowlist')) {
    const waAllowlistCheck = `
                                let is_allowed: bool = conn.query_row(
                                    "SELECT COUNT(*) FROM whatsapp_allowlist WHERE phone_number = ?1 AND status = 'approved'",
                                    [&msg.sender_number],
                                    |row| row.get::<_, i64>(0)
                                ).map(|c| c > 0).unwrap_or(false);
                                
                                if !is_allowed {
                                    continue;
                                }
`;
    // We want to insert this inside the `for msg in new_messages` loop, right after getting the connection.
    wa = wa.replace(
        'let id = uuid::Uuid::new_v4().to_string();',
        waAllowlistCheck + '\n                                let id = uuid::Uuid::new_v4().to_string();'
    );
    fs.writeFileSync('src-tauri/src/commands/whatsapp.rs', wa);
}

// 2. Update telegram.rs
let tg = fs.readFileSync('src-tauri/src/commands/telegram.rs', 'utf8');

if (!tg.includes('let role_opt: Option<String>')) {
    // Replace the old check
    tg = tg.replace(
        `let is_allowed: bool = conn.query_row(
        "SELECT COUNT(*) FROM telegram_allowlist WHERE telegram_user_id = ?1 AND status = 'approved'",
        [&from_id],
        |row| row.get::<_, i64>(0)
    ).map(|c| c > 0).unwrap_or(false);`,
        `let role_opt: Option<String> = conn.query_row(
        "SELECT role FROM telegram_allowlist WHERE telegram_user_id = ?1 AND status = 'approved'",
        [&from_id],
        |row| row.get(0)
    ).ok();
    
    let is_allowed = role_opt.is_some();
    let role_desc = role_opt.unwrap_or_else(|| "Bilinmiyor".to_string());`
    );

    // Replace the old system prompt
    const oldPrompt = `let sys_prompt = "Sen MizanNet Telegram asistanısın. Samimi, nazik ve güler yüzlü bir dille cevap veriyorsun.
Eğer kullanıcı sana sadece selam veriyor, sohbet ediyor veya soru soruyorsa \\"is_command\\" alanını false yap ve \\"response_message\\" ile cevap ver.
Eğer kullanıcı stok, fiş, cari, fatura gibi bir MizanNet verisi kaydetmek istiyorsa \\"is_command\\" alanını true yap ve ilgili detayları doldur.
Sadece geçerli bir JSON döndür.
Format:
{
  \\"is_command\\": false,
  \\"target_module\\": \\"Depo\\",
  \\"title\\": \\"Yeni Stok/Fiş\\",
  \\"payload_json\\": \\"{...detaylar...}\\",
  \\"uncertainties_json\\": \\"[]\\",
  \\"response_message\\": \\"Kullanıcıya gönderilecek samimi ve nazik yanıt metni.\\"
}";`;

    const newPrompt = `let sys_prompt = format!("Sen MizanNet Telegram asistanısın. Samimi, nazik ve güler yüzlü bir dille cevap veriyorsun.
Eğer kullanıcı sana sadece selam veriyor, sohbet ediyor veya soru soruyorsa \\"is_command\\" alanını false yap ve \\"response_message\\" ile cevap ver.
Eğer kullanıcı stok, fiş, cari, fatura gibi bir MizanNet verisi kaydetmek istiyorsa \\"is_command\\" alanını true yap ve ilgili detayları doldur.
Sadece geçerli bir JSON döndür.

ÖNEMLİ: Bu kullanıcının rolü/statüsü: '{}'. 
Eğer bu statü, ticari sırları veya ciro/kârlılık gibi bilgileri görmeye yetkili değilse (örneğin Patron veya Yönetici değilse), gizli bilgileri kesinlikle verme ve nazikçe yetkisi olmadığını belirt.

Format:
{{
  \\"is_command\\": false,
  \\"target_module\\": \\"Depo\\",
  \\"title\\": \\"Yeni Stok/Fiş\\",
  \\"payload_json\\": \\"{{...detaylar...}}\\",
  \\"uncertainties_json\\": \\"[]\\",
  \\"response_message\\": \\"Kullanıcıya gönderilecek samimi ve nazik yanıt metni.\\"
}}", role_desc);`;

    tg = tg.replace(oldPrompt, newPrompt);
    fs.writeFileSync('src-tauri/src/commands/telegram.rs', tg);
}
