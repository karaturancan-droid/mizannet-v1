const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Create test_verileri directory
const dir = path.join(__dirname, 'test_verileri');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// 1. Create a mock Excel file for Veri Aktarımı (Data Import)
const workbook = xlsx.utils.book_new();

// Banka Hareketleri
const bankaData = [
    { Tarih: '2023-10-01', Aciklama: 'Kira Ödemesi', Tutar: -5000, Bakiye: 15000 },
    { Tarih: '2023-10-02', Aciklama: 'Müşteri Ödemesi', Tutar: 12000, Bakiye: 27000 },
    { Tarih: '2023-10-03', Aciklama: 'Fatura Ödemesi Elektrik', Tutar: -450, Bakiye: 26550 }
];
const bankaSheet = xlsx.utils.json_to_sheet(bankaData);
xlsx.utils.book_append_sheet(workbook, bankaSheet, 'Banka_Hareketleri');

// Cari Hesaplar
const cariData = [
    { Unvan: 'Ahmet Yılmaz', VKN: '11111111111', Telefon: '05321112233', Bakiye: 5000 },
    { Unvan: 'ABC Ltd. Şti.', VKN: '22222222222', Telefon: '02123334455', Bakiye: -12500 }
];
const cariSheet = xlsx.utils.json_to_sheet(cariData);
xlsx.utils.book_append_sheet(workbook, cariSheet, 'Cari_Hesaplar');

xlsx.writeFile(workbook, path.join(dir, 'ornek_veri_aktarimi.xlsx'));
console.log('✅ Excel test verisi oluşturuldu: ornek_veri_aktarimi.xlsx');

// 2. Create a dummy image for OCR / Visual Testing
const canvasText = `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="50" y="50" font-family="Arial" font-size="20" fill="black">TEST FİŞİ</text>
  <text x="50" y="100" font-family="Arial" font-size="16" fill="black">Tarih: 01.10.2023</text>
  <text x="50" y="150" font-family="Arial" font-size="16" fill="black">Tutar: 150.00 TL</text>
  <text x="50" y="200" font-family="Arial" font-size="16" fill="black">KDV: %18</text>
  <text x="50" y="250" font-family="Arial" font-size="16" fill="black">Market Alışverişi</text>
</svg>`;

fs.writeFileSync(path.join(dir, 'ornek_fis.svg'), canvasText);
console.log('✅ Görsel test verisi oluşturuldu: ornek_fis.svg');

console.log('Tüm test verileri test_verileri/ klasöründe hazır!');
