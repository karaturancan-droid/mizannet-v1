const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('src/app').concat(walkDir('src/components'));

let totalRemoved = 0;

files.forEach(f => {
    let code = fs.readFileSync(f, 'utf8');
    let original = code;
    
    // We want to remove placeholder="anything" or placeholder={'anything'} 
    // BUT we should probably keep placeholders that say "Ara..." or "Search..." 
    // because those are usually in search bars, not data entry forms.
    // The user said: "veri girişi yaparken bunun gibi örnek veriler göstermesin metin kutuları boş olsun tüm metin girişi yapılan kutular da örnek veri bulunmasın"
    
    // Regular expression to match placeholder="..." or placeholder={'...'} or placeholder={...}
    // We will replace it with empty string, EXCEPT if it contains "ara" (search) ignoring case.
    
    const placeholderRegex = /placeholder\s*=\s*(["'])(.*?)\1|placeholder\s*=\s*\{([^}]+)\}/g;
    
    code = code.replace(placeholderRegex, (match, quote, textInsideQuote, textInsideBraces) => {
        const text = textInsideQuote || textInsideBraces || "";
        const lower = text.toLowerCase();
        
        // Keep search placeholders
        if (lower.includes('ara...') || lower.includes('search') || lower.includes('arayın') || lower.includes('ne arıyorsunuz')) {
            return match; 
        }
        
        // Remove the placeholder attribute completely for everything else
        totalRemoved++;
        return "";
    });

    if (code !== original) {
        fs.writeFileSync(f, code);
        console.log(`Cleaned placeholders in: ${f}`);
    }
});

console.log(`Total placeholders removed: ${totalRemoved}`);
