const fs = require('fs');
let content = fs.readFileSync('src/app/ayarlar/page.tsx', 'utf8');

// Replace the grid-cols-7 part
content = content.replace(
    'className="grid w-full grid-cols-7"',
    'className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 h-auto p-1 mb-8"'
);

// Add py-2 to triggers if needed
content = content.replace(/<TabsTrigger value="(.*?)">/g, '<TabsTrigger value="$1" className="py-2">');

fs.writeFileSync('src/app/ayarlar/page.tsx', content);
