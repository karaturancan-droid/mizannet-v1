import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { callBackend } from '@/lib/tauri';

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { account_id: string; date: string; amount: number; description?: string }) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentForm({ open, onOpenChange, onSubmit, isLoading }: PaymentFormProps) {
  const [accounts, setAccounts] = useState<{id: string, name: string, balance: number}[]>([]);

  useEffect(() => {
    if (open) {
      callBackend<any[]>('list_accounts', {}).then(accs => setAccounts(accs)).catch(console.error);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amountStr = formData.get('amount') as string;
    const amount = parseFloat(amountStr.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;

    onSubmit({
      account_id: formData.get('account_id') as string,
      date: formData.get('date') as string,
      amount,
      description: (formData.get('description') as string) || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Borç Ödemesi Yap</DialogTitle>
          <DialogDescription>
            Firmaya yapacağınız ödemeyi kaydedin. Bu işlem hem cari bakiyeyi hem de seçilen kasanın bakiyesini düşürecektir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_id">Ödemenin Yapılacağı Kasa / Banka</Label>
            <select name="account_id" required className="w-full h-10 px-3 border rounded-md">
              <option value="">Seçiniz...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Ödeme Tarihi</Label>
            <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Ödenen Tutar (₺)</Label>
            <Input id="amount" name="amount" type="text" required placeholder="0,00" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama (İsteğe Bağlı)</Label>
            <Input id="description" name="description" placeholder="Örn: Nakit elden ödendi" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Ödemeyi Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
