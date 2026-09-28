const fs = require('fs');
let content = fs.readFileSync('src/components/raporlar/ceo-dashboard.tsx', 'utf8');

content = content.replace('import { useToast } from "@/hooks/use-toast";\n', '');
content = content.replace('const { toast } = useToast();\n', '');
content = content.replace(
    /toast\(\{ title: 'Hata', description: e\.toString\(\), variant: 'destructive' \}\);/g,
    'alert("Hata: " + e.toString());'
);
content = content.replace(
    /toast\(\{ \n        title: 'Yapay Zeka Hatası',\n        description: 'Lütfen Ayarlar -> Yapay Zeka \(Ollama\) yapılandırmasını kontrol edin\.',\n        variant: 'destructive'\n      \}\);/g,
    'alert("Yapay Zeka Hatası: Lütfen Ayarlar -> Yapay Zeka (Ollama) yapılandırmasını kontrol edin.");'
);
content = content.replace(/toast\(\{[\s\S]*?\}\);/g, 'alert("Yapay Zeka Hatası");'); // Catch any other toast

fs.writeFileSync('src/components/raporlar/ceo-dashboard.tsx', content);
