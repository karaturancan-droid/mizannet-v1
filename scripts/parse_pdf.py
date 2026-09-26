import json
import os
import re
import PyPDF2

VUK_PDF = r'C:\Users\turan\.gemini\antigravity-ide\brain\0f75ad66-2bea-4500-afa3-cd5ed907f64b\.user_uploaded\media_1790282355084.pdf'
TEKDUZEN_PDF = r'C:\Users\turan\.gemini\antigravity-ide\brain\0f75ad66-2bea-4500-afa3-cd5ed907f64b\.user_uploaded\media_1790282515309.pdf'
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

os.makedirs(DATA_DIR, exist_ok=True)

def parse_vuk():
    text = ""
    with open(VUK_PDF, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"

    # Split by "Madde XX"
    matches = list(re.finditer(r'Madde\s+(\d+[\w/]*)\s*[-–]', text))
    results = []
    
    if matches and matches[0].start() > 0:
        results.append({
            "id": "vuk-giris",
            "title": "Vergi Usul Kanunu - Giriş",
            "content": text[:matches[0].start()].strip()
        })
        
    for i in range(len(matches)):
        start_idx = matches[i].start()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
        chunk = text[start_idx:end_idx].strip()
        results.append({
            "id": f"vuk-{matches[i].group(1)}",
            "title": f"Madde {matches[i].group(1)}",
            "content": chunk
        })
        
    with open(os.path.join(DATA_DIR, 'vuk.json'), 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Parsed VUK: {len(results)} items")

def parse_tekduzen():
    text = ""
    with open(TEKDUZEN_PDF, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"

    # Split by "XXX. " or "XXX- "
    matches = list(re.finditer(r'\n(\d{3})[.\-]\s+([A-ZÇĞİÖŞÜ ]+)', text))
    results = []
    
    if matches and matches[0].start() > 0:
        results.append({
            "id": "tekduzen-giris",
            "title": "Tekdüzen Hesap Planı - Giriş",
            "content": text[:matches[0].start()].strip()
        })
        
    for i in range(len(matches)):
        start_idx = matches[i].start()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
        chunk = text[start_idx:end_idx].strip()
        results.append({
            "id": f"hesap-{matches[i].group(1)}",
            "title": f"{matches[i].group(1)} - {matches[i].group(2).strip()}",
            "content": chunk
        })
        
    with open(os.path.join(DATA_DIR, 'tekduzen.json'), 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Parsed Tekdüzen: {len(results)} items")

if __name__ == "__main__":
    parse_vuk()
    parse_tekduzen()
    
    # Create empty IS Kanunu
    with open(os.path.join(DATA_DIR, 'is_kanunu.json'), 'w', encoding='utf-8') as f:
        json.dump([{"id":"is-1", "title":"4857 İş Kanunu", "content":"Kısa süre içerisinde PDF olarak entegre edilecektir."}], f, ensure_ascii=False, indent=2)
