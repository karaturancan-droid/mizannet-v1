const fs = require('fs');

let code = fs.readFileSync('src-tauri/src/commands/telegram.rs', 'utf8');

const oldPrompt = `let sys_prompt = "Sen MizanNet Telegram asistanısın. Samimi, nazik ve güler yüzlü bir dille cevap veriyorsun.
  Eğer kullanıcı sana sadece selam veriyor, sohbet ediyor veya soru soruyorsa \\"is_command\\" alanını false yap ve \\"response_message\\" ile cevap ver.
  Eğer kullanıcı stok, fiş, cari, fatura gibi bir MizanNet verisi kaydetmek istiyorsa \\"is_command\\" alanını true yap ve ilgili detayları doldur.`;

const newPrompt = `
          // Get user role
          let role_opt: Option<String> = conn.query_row(
              "SELECT role FROM telegram_users WHERE telegram_user_id = ?1",
              [&from_id],
              |row| row.get(0)
          ).ok().flatten();
          let user_role = role_opt.unwrap_or_else(|| "personel".to_string());
          
          let sys_prompt = format!("Sen MizanNet Telegram asistanısın. Karşındaki kullanıcının yetki seviyesi/rolü: {}.
  ÖNEMLİ: Eğer kullanıcının rolü 'yönetici' veya 'patron' değilse, ona kesinlikle şirketin toplam bakiyesi, kar/zarar durumu, maaş bordroları gibi gizli/hassas finansal bilgileri verme. Gizli bilgileri sorarsa nazikçe yetkisinin olmadığını belirt.
  Eğer kullanıcı sana sadece selam veriyor, sohbet ediyor veya soru soruyorsa \\"is_command\\" alanını false yap ve \\"response_message\\" ile cevap ver.
  Eğer kullanıcı stok, fiş, cari, fatura gibi bir MizanNet verisi kaydetmek istiyorsa \\"is_command\\" alanını true yap ve ilgili detayları doldur.", user_role);
`;

code = code.replace(oldPrompt.replace(/\r/g, ''), newPrompt);
// Fallback if not matched due to turkish chars or formatting
if (!code.includes('Karşındaki kullanıcının yetki seviyesi')) {
    code = code.replace(/let sys_prompt = "Sen MizanNet Telegram asistan[^"]+;/g, newPrompt);
    code = code.replace(/let sys_prompt = "Sen MizanNet Telegram asistan[\s\S]*?ilgili detaylar doldur\./, newPrompt.replace('let sys_prompt = format!("', ''));
}

fs.writeFileSync('src-tauri/src/commands/telegram.rs', code);
console.log("Updated sys_prompt in telegram.rs");
