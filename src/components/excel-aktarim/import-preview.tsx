'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImportPreviewProps {
  data: Array<Record<string, string>>;
  onConfirm: (entityType: string, mappedData: Array<Record<string, string>>) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

const ENTITY_TYPES = [
  { value: 'company', label: 'Cari Hesap (Firma)' },
  { value: 'ledger_entry', label: 'Finansal İşlem (Cari/Kasa)' },
  { value: 'product', label: 'Ürün / Stok' },
  { value: 'vehicle', label: 'Araç' },
  { value: 'worker', label: 'İşçi' },
];

const REQUIRED_FIELDS: Record<string, { key: string; label: string; }[]> = {
  company: [
    { key: 'name', label: 'Firma Adı (Zorunlu)' },
    { key: 'tax_no', label: 'Vergi No / VKN' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'E-posta' },
    { key: 'contact_person', label: 'Yetkili Kişi' }
  ],
  ledger_entry: [
    { key: 'company_name', label: 'Firma / Cari Adı' },
    { key: 'date', label: 'Tarih' },
    { key: 'document_no', label: 'Belge No' },
    { key: 'description', label: 'Açıklama' },
    { key: 'tutar', label: 'Tutar (Genel)' },
    { key: 'debit', label: 'Borç Tutarı' },
    { key: 'credit', label: 'Alacak Tutarı' }
  ],
  product: [
    { key: 'name', label: 'Ürün Adı (Zorunlu)' },
    { key: 'sku', label: 'Ürün Kodu' },
    { key: 'category', label: 'Kategori' },
    { key: 'purchase_price', label: 'Alış Fiyatı' },
    { key: 'sale_price', label: 'Satış Fiyatı' },
    { key: 'current_stock', label: 'Mevcut Stok' }
  ],
  vehicle: [
    { key: 'plate', label: 'Plaka (Zorunlu)' },
    { key: 'brand', label: 'Marka' },
    { key: 'model', label: 'Model' },
    { key: 'year', label: 'Yıl' },
    { key: 'km', label: 'Kilometre' }
  ],
  worker: [
    { key: 'full_name', label: 'Ad Soyad (Zorunlu)' },
    { key: 'tc_no', label: 'TC Kimlik No' },
    { key: 'position', label: 'Pozisyon' },
    { key: 'salary', label: 'Maaş' }
  ]
};

import { Bot } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export function ImportPreview({
  data,
  onConfirm,
  onBack,
  isLoading = false,
}: ImportPreviewProps) {
  const [entityType, setEntityType] = useState(() => {
    if (data.length > 0) {
      const keys = Object.keys(data[0]).map(k => k.toLowerCase());
      if (keys.includes('tutar') && keys.includes('açıklama') || keys.includes('tarih')) {
        return 'ledger_entry';
      }
    }
    return 'company';
  });
  const [currentPage, setCurrentPage] = useState(0);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Column mapping: TargetFieldKey -> ExcelColumnName
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isAiMapping, setIsAiMapping] = useState(false);

  // Otomatik kaba eşleştirme
  const autoMapColumns = (type: string) => {
    const newMapping: Record<string, string> = {};
    const fields = REQUIRED_FIELDS[type] || [];
    
    fields.forEach(field => {
      const match = columns.find(c => 
        c.toLowerCase().includes(field.key.toLowerCase()) || 
        c.toLowerCase().includes(field.label.toLowerCase().split(' ')[0])
      );
      if (match) newMapping[field.key] = match;
    });
    setColumnMapping(newMapping);
  };

  // Tür değiştiğinde eşleştirmeyi sıfırla
  const handleTypeChange = (val: string) => {
    setEntityType(val);
    autoMapColumns(val);
  };

  const handleAiAutoMap = async () => {
    setIsAiMapping(true);
    try {
      const sampleRow = data[0];
      const colsStr = columns.join(", ");
      
      const aiRes: string = await invoke("ai_auto_map_excel", { 
        headers: columns,
        sampleRow: JSON.stringify(sampleRow)
      });

      // Try to parse AI response
      const jsonStart = aiRes.indexOf("{");
      const jsonEnd = aiRes.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(aiRes.substring(jsonStart, jsonEnd + 1));
        if (parsed.entity_type) setEntityType(parsed.entity_type);
        if (parsed.mapping) setColumnMapping(parsed.mapping);
        toast.success("Yapay zeka eşleştirmesi tamamlandı!");
      }
    } catch (err: any) {
      toast.error(err.message || "Eşleştirme başarısız.");
      autoMapColumns(entityType);
    } finally {
      setIsAiMapping(false);
    }
  };

  const handleConfirmAction = () => {
    // Verileri eşleşmeye göre dönüştür
    const mappedData = data.map(row => {
      const newRow: Record<string, string> = { ...row }; // Orijinal verileri de tut (esneklik için)
      Object.entries(columnMapping).forEach(([targetKey, excelCol]) => {
        if (excelCol && row[excelCol] !== undefined) {
          newRow[targetKey] = row[excelCol];
        }
      });
      return newRow;
    });
    
    onConfirm(entityType, mappedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adım 2: Önizleme ve Eşleme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <Label htmlFor="entity_type">Veri Türü</Label>
            <Select value={entityType} onValueChange={handleTypeChange} disabled={isLoading || isAiMapping}>
              <SelectTrigger id="entity_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleAiAutoMap} 
            disabled={isLoading || isAiMapping}
            className="w-full sm:w-auto"
          >
            {isAiMapping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4 text-primary" />}
            Yapay Zeka ile Eşleştir
          </Button>
        </div>

        {/* Eşleştirme Paneli */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="col-span-full">
            <h3 className="text-sm font-medium mb-1">Sütun Eşleştirmeleri</h3>
            <p className="text-xs text-muted-foreground mb-4">Excel sütunlarını sistemdeki alanlarla eşleştirin.</p>
          </div>
          
          {(REQUIRED_FIELDS[entityType] || []).map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label className="text-xs">{field.label}</Label>
              <Select 
                value={columnMapping[field.key] || "unmapped"} 
                onValueChange={(val) => setColumnMapping(prev => ({...prev, [field.key]: val === "unmapped" ? "" : val}))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unmapped" className="text-muted-foreground italic">-- Atla --</SelectItem>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col} className="whitespace-nowrap">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row, idx) => (
                <TableRow key={startIndex + idx}>
                  {columns.map((col) => (
                    <TableCell key={`${startIndex + idx}-${col}`} className="whitespace-nowrap">
                      {row[col] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Sayfa {currentPage + 1} / {totalPages} ({data.length} satır)
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0 || isLoading}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1 || isLoading}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button onClick={onBack} disabled={isLoading} variant="outline">
            Geri
          </Button>
          <Button onClick={handleConfirmAction} disabled={isLoading || isAiMapping}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            İçe Aktar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
