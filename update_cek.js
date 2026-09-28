const fs = require('fs');
let code = fs.readFileSync('src/app/cek-senet/page.tsx', 'utf8');

if (!code.includes('CekSenetDialog')) {
  const imports = `import { useState } from "react";\nimport { CreditCard, Plus, Clock } from "lucide-react";\nimport { Button } from "@/components/ui/button";\nimport { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";\nimport { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";\nimport { Input } from "@/components/ui/input";\nimport { Label } from "@/components/ui/label";\n`;
  
  code = code.replace(/import .* from "lucide-react";\nimport { Button } from "@\/components\/ui\/button";\nimport { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@\/components\/ui\/card";/, imports);
  
  code = code.replace(
    'export default function CekSenetPage() {',
    `export default function CekSenetPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [items, setItems] = useState<{type: string, amount: string, date: string}[]>([]);

  const handleAdd = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newItem = {
      type: formData.get('type') as string,
      amount: formData.get('amount') as string || "0,00 ₺",
      date: formData.get('date') as string
    };
    setItems([...items, newItem]);
    setShowAdd(false);
  };
`
  );
  
  code = code.replace(
    '<Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">\n          <Plus className="h-4 w-4" /> Yeni \u00E7ek/Senet Ekle\n        </Button>',
    `<Button onClick={() => setShowAdd(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
          <Plus className="h-4 w-4" /> Yeni Çek/Senet Ekle
        </Button>`
  );
  
  code = code.replace(
    '<Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">\n          <Plus className="h-4 w-4" /> Yeni Çek/Senet Ekle\n        </Button>',
    `<Button onClick={() => setShowAdd(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
          <Plus className="h-4 w-4" /> Yeni Çek/Senet Ekle
        </Button>`
  );
  
  code = code.replace(
    '<Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">\n          <Plus className="h-4 w-4" /> Yeni ek/Senet Ekle\n        </Button>',
    `<Button onClick={() => setShowAdd(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
          <Plus className="h-4 w-4" /> Yeni Çek/Senet Ekle
        </Button>`
  );

  const emptyStateRegex = /<Card className="flex-1 shadow-sm border-zinc-200\/60">[\s\S]*?<\/CardContent>\n      <\/Card>/;
  const newContent = `<Card className="flex-1 shadow-sm border-zinc-200/60">
        <CardContent className="flex flex-col items-center justify-center min-h-[16rem] text-center p-6">
          {items.length > 0 ? (
            <div className="w-full text-left">
              <h3 className="text-lg font-bold mb-4">Portföyünüz</h3>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="border rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-700 flex items-center justify-center rounded-lg">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold">{item.type}</div>
                        <div className="text-xs text-muted-foreground">Vade: {item.date}</div>
                      </div>
                    </div>
                    <div className="font-bold text-lg text-blue-700">{item.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Henüz kayıtlı çek veya senet yok</h3>
              <p className="text-sm text-zinc-500 max-w-md">
                Yeni bir çek veya senet ekleyerek vade takibini otomatik hale getirebilirsiniz.
              </p>
              <Button onClick={() => setShowAdd(true)} variant="outline" className="mt-4 border-blue-200 text-blue-700 hover:bg-blue-50">
                İlk Evrakınızı Ekleyin
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Çek / Senet Ekle</DialogTitle>
            <DialogDescription>
              Portföyünüze alınan çek veya senet kaydedin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Evrak Tipi</Label>
              <Input name="type" required placeholder="Müşteri Çeki, Alınan Senet vb." />
            </div>
            <div className="space-y-2">
              <Label>Tutar (₺)</Label>
              <Input name="amount" required placeholder="10.000,00 ₺" />
            </div>
            <div className="space-y-2">
              <Label>Vade Tarihi</Label>
              <Input name="date" type="date" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>İptal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>`;
      
  code = code.replace(emptyStateRegex, newContent);
  fs.writeFileSync('src/app/cek-senet/page.tsx', code);
}
