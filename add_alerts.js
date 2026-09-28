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
            if (file.endsWith('.tsx')) {
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
    
    // Split by tags to find Button tags
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('<Button') && !line.includes('onClick') && !line.includes('type="submit"') && !line.includes('asChild') && !line.includes('type="button"')) {
            // Find the <Button part and inject onClick
            lines[i] = line.replace(/<Button\s/g, '<Button onClick={() => alert("Bu modül/özellik henüz yapım aşamasındadır. Yakında aktif olacaktır.")} ');
            // Handle edge case where it's exactly <Button>
            if (lines[i] === line) {
                lines[i] = line.replace(/<Button>/g, '<Button onClick={() => alert("Bu modül/özellik henüz yapım aşamasındadır. Yakında aktif olacaktır.")}>');
            }
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(f, lines.join('\n'));
    }
});
