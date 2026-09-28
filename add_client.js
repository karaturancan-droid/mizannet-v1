const fs = require('fs');

['src/app/banka/page.tsx', 'src/app/cek-senet/page.tsx'].forEach(f => {
    let code = fs.readFileSync(f, 'utf8');
    if (!code.startsWith('"use client"')) {
        code = '"use client";\n\n' + code;
        fs.writeFileSync(f, code);
    }
});
