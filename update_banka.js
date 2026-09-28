const fs = require('fs');
let code = fs.readFileSync('src/app/banka/page.tsx', 'utf8');

if (!code.includes('BankaEkleDialog')) {
  // We'll wrap the page with a minimal functional dialog
  const imports = `import { useState } from "react";\nimport { Landmark, ArrowDownLeft, ArrowUpRight, Download, Plus } from "lucide-react";\nimport { Button } from "@/components/ui/button";\nimport { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";\nimport { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";\nimport { Input } from "@/components/ui/input";\nimport { Label } from "@/components/ui/label";\n`;
  
  code = code.replace(/import .* from "lucide-react";\nimport { Button } from "@\/components\/ui\/button";\nimport { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@\/components\/ui\/card";/, imports);
  
  code = code.replace(
    'export default function BankaPage() {',
    `export default function BankaPage() {
  const [showAddBank, setShowAddBank] = useState(false);
  const [banks, setBanks] = useState<{name: string, iban: string, balance: string}[]>([]);

  const handleAddBank = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newBank = {
      name: formData.get('bankName') as string,
      iban: formData.get('iban') as string,
      balance: formData.get('balance') as string || "0,00 ₺"
    };
    setBanks([...banks, newBank]);
    setShowAddBank(false);
  };
`
  );
  
  // Find the button and replace it
  code = code.replace(
    '<Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">\n          <Download className="h-4 w-4" /> Hareketleri ek\n        </Button>',
    `<div className="flex gap-2">
          <Button onClick={() => setShowAddBank(true)} className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl">
            <Plus className="h-4 w-4" /> Banka Hesabı Ekle
          </Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
            <Download className="h-4 w-4" /> Hareketleri Çek
          </Button>
        </div>`
  );
  
  // Replace the empty state area
  const emptyStateRegex = /<Card className="flex-1 shadow-sm border-zinc-200\/60">[\s\S]*?<\/CardContent>\n      <\/Card>/;
  const newContent = `<Card className="flex-1 shadow-sm border-zinc-200/60">
        <CardContent className="flex flex-col items-center justify-center min-h-[16rem] text-center p-6">
          {banks.length > 0 ? (
            <div className="w-full text-left">
              <h3 className="text-lg font-bold mb-4">Kayıtlı Banka Hesaplarınız</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banks.map((b, i) => (
                  <div key={i} className="border rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded-lg">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold">{b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.iban}</div>
                      </div>
                    </div>
                    <div className="font-bold text-lg text-emerald-700">{b.balance}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Landmark className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Banka Hesabı Tanımlanmamış</h3>
              <p className="text-sm text-zinc-500 max-w-md mb-4">
                Açık bankacılık entegrasyonu ile Akbank, Garanti, İş Bankası gibi bankalarınızı bağlayabilirsiniz.
              </p>
              <Button onClick={() => setShowAddBank(true)} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                Hesap Ekle / Bağla
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showAddBank} onOpenChange={setShowAddBank}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Banka Hesabı Ekle</DialogTitle>
            <DialogDescription>
              İşletmenize ait banka hesabını manuel ekleyebilir veya açık bankacılık ile bağlayabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBank} className="space-y-4">
            <div className="space-y-2">
              <Label>Banka Adı (Örn: Garanti BBVA)</Label>
              <Input name="bankName" required placeholder="Banka adını girin..." />
            </div>
            <div className="space-y-2">
              <Label>IBAN Numarası</Label>
              <Input name="iban" required placeholder="TR00 0000..." />
            </div>
            <div className="space-y-2">
              <Label>Açılış Bakiyesi (₺)</Label>
              <Input name="balance" type="text" placeholder="0,00 ₺" defaultValue="0,00 ₺" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddBank(false)}>İptal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Hesabı Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>`;
      
  code = code.replace(emptyStateRegex, newContent);
  fs.writeFileSync('src/app/banka/page.tsx', code);
}
