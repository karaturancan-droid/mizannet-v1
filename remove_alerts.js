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

const files = walkDir('src/app');
files.forEach(f => {
    let code = fs.readFileSync(f, 'utf8');
    let changed = false;
    
    // Check if file has the alert
    if (code.includes('onClick={() => alert("Bu modül/özellik henüz yapım aşamasındadır. Yakında aktif olacaktır.")}')) {
        code = code.replace(/onClick=\{\(\) => alert\("Bu modül\/özellik henüz yapım aşamasındadır. Yakında aktif olacaktır."\)\}\s/g, '');
        code = code.replace(/onClick=\{\(\) => alert\("Bu modül\/özellik henüz yapım aşamasındadır. Yakında aktif olacaktır."\)\}/g, '');
        changed = true;
    }
    // Also remove the weird encoded version if it exists
    if (code.includes('alert("Bu modǬl/zellik henǬz yapm aYamasndadr. Yaknda aktif olacaktr.")')) {
        code = code.replace(/onClick=\{\(\) => alert\("Bu modǬl\/zellik henǬz yapm aYamasndadr. Yaknda aktif olacaktr."\)\}\s/g, '');
        code = code.replace(/onClick=\{\(\) => alert\("Bu modǬl\/zellik henǬz yapm aYamasndadr. Yaknda aktif olacaktr."\)\}/g, '');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(f, code);
        console.log(`Cleaned: ${f}`);
    }
});
