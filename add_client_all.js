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
    if (code.includes('onClick=') && !code.includes('"use client"') && !code.includes("'use client'")) {
        code = '"use client";\n\n' + code;
        fs.writeFileSync(f, code);
        console.log("Added use client to " + f);
    }
});
