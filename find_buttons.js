const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    const code = fs.readFileSync(f, 'utf8');
    const lines = code.split('\n');
    lines.forEach((l, i) => {
        if (l.includes('<Button') && !l.includes('onClick') && !l.includes('type="submit"') && !l.includes('asChild')) {
            console.log(f + ':' + (i+1) + ': ' + l.trim());
        }
    });
});
