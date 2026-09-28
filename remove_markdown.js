const fs = require('fs');
let content = fs.readFileSync('src/components/raporlar/ceo-dashboard.tsx', 'utf8');

// Remove imports
content = content.replace("import ReactMarkdown from 'react-markdown';\n", "");
content = content.replace("import remarkGfm from 'remark-gfm';\n", "");

// Replace the ReactMarkdown usage with a pre block
const oldMarkup = `<ReactMarkdown remarkPlugins={[remarkGfm]}>{aiReport}</ReactMarkdown>`;
const newMarkup = `<div className="whitespace-pre-wrap font-sans text-indigo-900">{aiReport}</div>`;

content = content.replace(oldMarkup, newMarkup);

fs.writeFileSync('src/components/raporlar/ceo-dashboard.tsx', content);
