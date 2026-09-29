"use client";

import { useState, useEffect } from "react";
import { Landmark, ArrowDownLeft, ArrowUpRight, Download, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callBackend } from "@/lib/tauri";
import { useToast } from "@/components/ui/toast";
import { formatCurrencyTRY } from "@/lib/format";

export default function BankaPage() {
  const [showAddBank, setShowAddBank] = useState(false);
  const [showEditBalance, setShowEditBalance] = useState<{id: string, name: string, balance: number} | null>(null);
  const [banks, setBanks] = useState<{id: string, name: string, account_type: string, currency: string, iban: string | null, opening_balance: number}[]>([]);
  const { addToast } = useToast();

  const loadAccounts = async () => {
    try {
      const accs = await callBackend<any[]>('list_accounts', {});
      setBanks(accs);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAddBank = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const balanceStr = formData.get('balance') as string;
    const balance = parseFloat(balanceStr.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
    
    try {
      await callBackend('create_account', {
        name: formData.get('bankName') as string,
        account_type: formData.get('accountType') as string || 'banka',
        currency: 'TRY',
        iban: formData.get('iban') as string,
        opening_balance: balance
      });
      setShowAddBank(false);
      loadAccounts();
    } catch(e: any) {
      alert("Hata: " + e.toString());
    }
  };

  const handleEditBalance = async (e: any) => {
    e.preventDefault();
    if(!showEditBalance) return;
    const formData = new FormData(e.target);
    const balanceStr = formData.get('balance') as string;
    const balance = parseFloat(balanceStr.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
    
    try {
      await callBackend('update_account_balance', {
        id: showEditBalance.id,
        opening_balance: balance
      });
      setShowEditBalance(null);
      loadAccounts();
    } catch(e: any) {
      alert("Hata: " + e.toString());
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 w-full max-w-6xl mx-auto overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-zinc-900">
            <Landmark className="h-8 w-8 text-emerald-600" />
            Banka Hareketleri
          </h1>
          <p className="text-muted-foreground mt-2">
            Tüm banka hesaplarınızı tek ekrandan takip edin ve cari hesaplara otomatik işleyin.
          </p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
          <Download className="h-4 w-4" /> Hareketleri Çek
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md border-none">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-emerald-100 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" /> Gelen Havale/EFT (Bugün)
            </CardDescription>
            <CardTitle className="text-3xl">0,00 ₺</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md border-none">
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-rose-100 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Giden Havale/EFT (Bugün)
            </CardDescription>
            <CardTitle className="text-3xl">0,00 ₺</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="flex-1 shadow-sm border-zinc-200/60">
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
                        <div className="text-xs text-muted-foreground">{b.iban || b.account_type.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-lg text-emerald-700">{formatCurrencyTRY(b.opening_balance)}</div>
                      <Button variant="ghost" size="sm" onClick={() => setShowEditBalance({id: b.id, name: b.name, balance: b.opening_balance})}>
                        <Edit className="w-4 h-4 text-zinc-500" />
                      </Button>
                    </div>
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
              <Label>Hesap Türü</Label>
              <select name="accountType" className="w-full h-10 px-3 py-2 border rounded-md" defaultValue="banka">
                <option value="banka">Banka Hesabı</option>
                <option value="kasa">Nakit Kasa</option>
                <option value="pos">POS / Sanal POS</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Banka / Kasa Adı (Örn: Merkez Kasa, Garanti BBVA)</Label>
              <Input name="bankName" required  />
            </div>
            <div className="space-y-2">
              <Label>IBAN Numarası (Kasa ise boş bırakın)</Label>
              <Input name="iban" />
            </div>
            <div className="space-y-2">
              <Label>Mevcut Bakiye (₺)</Label>
              <Input name="balance" type="text"  defaultValue="0,00" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddBank(false)}>İptal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Hesabı Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEditBalance} onOpenChange={(open) => !open && setShowEditBalance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{showEditBalance?.name} Bakiyesini Güncelle</DialogTitle>
            <DialogDescription>
              Bu kasanın / bankanın mevcut güncel bakiyesini manuel olarak buradan girebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditBalance} className="space-y-4">
            <div className="space-y-2">
              <Label>Güncel Bakiye (₺)</Label>
              <Input name="balance" type="text" defaultValue={showEditBalance?.balance} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditBalance(null)}>İptal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
