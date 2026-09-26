'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecycleBinItem } from '@/hooks/use-recycle-bin';
import { formatDateTR } from '@/lib/format';
import { RotateCcw, Trash2, X, Eye, FileText, Package, Truck, User, Building, FileCheck } from 'lucide-react';

interface ItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RecycleBinItem | null;
  onRestore: (item: RecycleBinItem) => Promise<void>;
  onDelete: (item: RecycleBinItem) => Promise<void>;
  isLoading?: boolean;
}

// Entity type labels
export const entityTypeLabels: Record<string, string> = {
  company: 'Firma',
  ledger_entry: 'Cari / Finansal Hareket',
  product: 'Ürün / Stok',
  vehicle: 'Araç',
  vehicle_expense: 'Araç Masrafı',
  tire: 'Lastik',
  worker: 'İşçi / Personel',
  leave: 'İzin Kaydı',
  overtime: 'Mesai Kaydı',
  payroll: 'Maaş Bordrosu',
  document: 'Belge / Arşiv',
  tax_item: 'Vergi Takip Kaydı',
};

// Field key Turkish dictionary
const fieldKeyLabels: Record<string, string> = {
  name: 'Adı / Başlık',
  title: 'Başlık',
  description: 'Açıklama',
  code: 'Ürün Kodu',
  category: 'Kategori',
  unit: 'Birim',
  purchase_price: 'Alış Fiyatı',
  sale_price: 'Satış Fiyatı',
  current_stock: 'Mevcut Stok',
  min_stock: 'Min. Stok Leveli',
  plate: 'Plaka',
  brand: 'Marka',
  model: 'Model',
  year: 'Yıl',
  serial_no: 'Seri No',
  amount: 'Tutar',
  debit: 'Borç / Alacak',
  credit: 'Kredi / Tahsilat',
  company_name: 'Firma Adı',
  tax_no: 'Vergi No',
  tax_office: 'Vergi Dairesi',
  phone: 'Telefon',
  email: 'E-Posta',
  address: 'Adres',
  period: 'Dönem / Ay',
  salary: 'Maaş',
  date: 'Tarih',
  created_at: 'Oluşturulma Tarihi',
  file_name: 'Dosya Adı',
  file_size: 'Dosya Boyutu',
  type: 'Tür',
  status: 'Durum',
  notes: 'Notlar',
};

export function parseRecordData(recordData: Record<string, unknown> | string | any): Record<string, unknown> {
  if (!recordData) return {};
  if (typeof recordData === 'string') {
    try {
      return JSON.parse(recordData);
    } catch {
      return { raw: recordData };
    }
  }
  return recordData;
}

export function getItemTitle(item: RecycleBinItem | null): string {
  if (!item) return 'Silinen Öğe';
  const data = parseRecordData(item.record_data);
  
  const titleCandidate =
    data.name ||
    data.title ||
    data.plate ||
    data.code ||
    data.file_name ||
    data.serial_no ||
    data.description ||
    data.period ||
    data.company_name;

  if (titleCandidate && typeof titleCandidate === 'string' && titleCandidate.trim() !== '') {
    return titleCandidate;
  }

  const label = entityTypeLabels[item.entity_type] || 'Öğe';
  return `Silinen ${label} (#${item.id.slice(0, 6)})`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (typeof value === 'number') {
    return value.toLocaleString('tr-TR');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export function ItemDetailDialog({
  open,
  onOpenChange,
  item,
  onRestore,
  onDelete,
  isLoading = false,
}: ItemDetailDialogProps) {
  if (!item) return null;

  const data = parseRecordData(item.record_data);
  const title = getItemTitle(item);
  const entityLabel = entityTypeLabels[item.entity_type] || item.entity_type;

  // Key-value entries excluding internal IDs or redundant flags
  const entries = Object.entries(data).filter(
    ([key]) => !['id', 'deleted_at', 'is_deleted', 'created_at_ts'].includes(key)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20">
              {entityLabel}
            </Badge>
            {item.days_left !== undefined && (
              <Badge variant={item.days_left <= 7 ? 'destructive' : 'secondary'} className="text-xs">
                Kalan Süre: {item.days_left} gün
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg font-bold mt-1 text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bu kaydın ayrıntılı bilgilerini inceleyebilir, geri yükleyebilir veya kalıcı olarak silebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        {/* İçerik Alanı */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Zaman ve Durum Kartı */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg border text-xs">
            <div>
              <span className="text-muted-foreground block">Silinme Tarihi</span>
              <strong className="text-foreground">{formatDateTR(item.deleted_at)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Otomatik Silinme Tarihi</span>
              <strong className="text-foreground">{formatDateTR(item.restore_deadline)}</strong>
            </div>
          </div>

          {/* Kayıt Detayları Tablosu */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Kayıt Veri Bilgileri
            </h4>
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Detaylı veri bulunamadı.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden divide-y text-xs bg-card">
                {entries.map(([key, val]) => {
                  const label = fieldKeyLabels[key] || key.replace(/_/g, ' ').toUpperCase();
                  const formatted = formatValue(val);
                  return (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 hover:bg-muted/30 transition-colors gap-1">
                      <span className="font-medium text-muted-foreground sm:w-1/3 shrink-0">
                        {label}
                      </span>
                      <span className="font-semibold text-foreground sm:w-2/3 text-left sm:text-right break-all">
                        {formatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Alt Butonlar - Kullanıcının İstediği 3 Seçenek */}
        <DialogFooter className="border-t pt-3 flex-col sm:flex-row gap-2 justify-between items-center bg-card">
          {/* Dokunma (Kapat) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto text-xs gap-1.5"
          >
            <X className="h-4 w-4" />
            <span>Dokunma (Geri Dön)</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Kalıcı Sil */}
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                await onDelete(item);
                onOpenChange(false);
              }}
              disabled={isLoading}
              className="flex-1 sm:flex-initial text-xs gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>Kalıcı Sil</span>
            </Button>

            {/* Geri Yükle */}
            <Button
              type="button"
              onClick={async () => {
                await onRestore(item);
                onOpenChange(false);
              }}
              disabled={isLoading}
              className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5 shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Geri Yükle</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
