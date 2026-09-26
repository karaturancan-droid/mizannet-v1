const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const VUK_PDF = 'C:/Users/turan/.gemini/antigravity-ide/brain/0f75ad66-2bea-4500-afa3-cd5ed907f64b/.user_uploaded/media_1790282355084.pdf';
const TEKDUZEN_PDF = 'C:/Users/turan/.gemini/antigravity-ide/brain/0f75ad66-2bea-4500-afa3-cd5ed907f64b/.user_uploaded/media_1790282515309.pdf';

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function parseVuk() {
  const dataBuffer = fs.readFileSync(VUK_PDF);
  const data = await pdf(dataBuffer);
  const text = data.text;
  
  // Split by "Madde XX"
  const regex = /Madde\s+(\d+[\/\w]*)\s*[-–]/g;
  const matches = [...text.matchAll(regex)];
  
  const results = [];
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const startIndex = match.index;
    const endIndex = i + 1 < matches.length ? matches[i+1].index : text.length;
    
    let chunk = text.substring(startIndex, endIndex).trim();
    
    results.push({
      id: `vuk-${match[1]}`,
      title: `Madde ${match[1]}`,
      content: chunk
    });
  }
  
  // Add intro part
  if (matches.length > 0 && matches[0].index > 0) {
    results.unshift({
      id: 'vuk-giris',
      title: 'Vergi Usul Kanunu - Giriş',
      content: text.substring(0, matches[0].index).trim()
    });
  }

  fs.writeFileSync(path.join(DATA_DIR, 'vuk.json'), JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Parsed VUK: ${results.length} items`);
}

async function parseTekduzen() {
  const dataBuffer = fs.readFileSync(TEKDUZEN_PDF);
  const data = await pdf(dataBuffer);
  const text = data.text;
  
  // Split by "XXX. " or "XXX- " (e.g. 100. KASA)
  const regex = /\n(\d{3})[.\-]\s+([A-ZÇĞİÖŞÜ ]+)/g;
  const matches = [...text.matchAll(regex)];
  
  const results = [];
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const startIndex = match.index;
    const endIndex = i + 1 < matches.length ? matches[i+1].index : text.length;
    
    let chunk = text.substring(startIndex, endIndex).trim();
    
    results.push({
      id: `hesap-${match[1]}`,
      title: `${match[1]} - ${match[2].trim()}`,
      content: chunk
    });
  }
  
  if (matches.length > 0 && matches[0].index > 0) {
    results.unshift({
      id: 'tekduzen-giris',
      title: 'Tekdüzen Hesap Planı - Giriş',
      content: text.substring(0, matches[0].index).trim()
    });
  }

  fs.writeFileSync(path.join(DATA_DIR, 'tekduzen.json'), JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Parsed Tekdüzen: ${results.length} items`);
}

async function main() {
  try {
    await parseVuk();
    await parseTekduzen();
    
    // Create empty IS Kanunu for now to avoid errors
    fs.writeFileSync(path.join(DATA_DIR, 'is_kanunu.json'), JSON.stringify([{id:'is-1', title:'4857 İş Kanunu', content:'Kısa süre içerisinde PDF olarak entegre edilecektir.'}]), 'utf-8');
    
  } catch (err) {
    console.error(err);
  }
}

main();
