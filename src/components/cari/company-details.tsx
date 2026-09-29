'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrencyTRY, formatDateTR } from '@/lib/format';
import { open } from '@tauri-apps/plugin-shell';
import type { Company, LedgerEntry, LedgerSummary } from '@/hooks/use-cari';

interface CompanyDetailsProps {
  company: Company | null;
  ledgerEntries: LedgerEntry[];
  ledgerSummary: LedgerSummary | null;
  yearFilter: number | null;
  onChangeYearFilter: (year: number | null) => void;
  onEditCompany: () => void;
  onDeleteCompany: () => void;
  onPayDebt: () => void;
  onAddLedgerEntry: () => void;
  onEditLedgerEntry: (entry: LedgerEntry) => void;
  onDeleteLedgerEntry: (id: string) => void;
  onExportCSV: () => void;
  loading: boolean;
}

export function CompanyDetails({
  company,
  ledgerEntries,
  ledgerSummary,
  yearFilter,
  onChangeYearFilter,
  onEditCompany,
  onDeleteCompany,
  onPayDebt,
  onAddLedgerEntry,
  onEditLedgerEntry,
  onDeleteLedgerEntry,
  onExportCSV,
  loading,
}: CompanyDetailsProps) {
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg">Sol taraftan bir firma seçerek cari hareketlerini inceleyin</p>
        </div>
      </div>
    );
  }

  // Tüm yılları topla
  const allYears = Array.from(
    new Set(
      ledgerEntries.map((entry) => parseInt(entry.date.substring(0, 4)))
    )
  ).sort((a, b) => b - a);

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      {/* Firma Başlığı ve Bilgileri */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{company.name}</CardTitle>
              {company.tax_no && (
                <p className="text-sm text-gray-600 mt-1">
                  VKN: {company.tax_no}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0 items-center">
              {/* Mail Gönder Butonu */}
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                onClick={async () => {
                  const bakiye = formatCurrencyTRY(company.balance || 0);
                  const durum = (company.balance || 0) < 0 ? 'Borcunuz' : 'Alacağınız';
                  const msg = `Merhaba ${company.name} yetkilisi,\n\nGüncel hesap ekstrenize göre bakiyeniz: ${bakiye} (${durum}).\n\nDetaylı bilgi için bizimle iletişime geçebilirsiniz. İyi çalışmalar dileriz.`;
                  
                  const targetEmail = company.email ? company.email : '';
                  const mailUrl = `mailto:${targetEmail}?subject=${encodeURIComponent('Cari Hesap Ekstresi')}&body=${encodeURIComponent(msg)}`;
                  try {
                    await open(mailUrl);
                  } catch (e) {
                    window.open(mailUrl, '_blank');
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                Mail
              </Button>
              
              {/* WhatsApp Gönder Butonu */}
              <Button
                variant="outline"
                size="sm"
                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                onClick={async () => {
                  const bakiye = formatCurrencyTRY(company.balance || 0);
                  const durum = (company.balance || 0) < 0 ? 'Borcunuz' : 'Alacağınız';
                  const msg = `Merhaba ${company.name} yetkilisi,\nGüncel hesap ekstrenize göre bakiyeniz: ${bakiye} (${durum}).\n\nDetaylı bilgi için bizimle iletişime geçebilirsiniz. İyi çalışmalar dileriz.`;
                  
                  // Telefon numarasındaki boşluk vb karakterleri temizle
                  const phoneCleaned = company.phone ? company.phone.replace(/[^0-9]/g, '') : '';
                  
                  // Eğer başta 0 varsa 90 yap, yoksa başına 90 ekle vb (Türkiye varsayılan)
                  // Kullanıcı zaten uluslararası kod ile girmişse olduğu gibi bırakabiliriz.
                  // Şimdilik sadece temizlenmiş halini kullanıyoruz.
                  const waUrl = phoneCleaned 
                    ? `https://wa.me/${phoneCleaned}?text=${encodeURIComponent(msg)}`
                    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    
                  try {
                    await open(waUrl);
                  } catch (e) {
                    window.open(waUrl, '_blank');
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditCompany}
                disabled={loading}
              >
                Düzenle
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                onClick={onPayDebt}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                Ödeme Ekle
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteCompany}
                disabled={loading}
              >
                Sil
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* İletişim Bilgileri */}
          <div className="grid grid-cols-2 gap-4">
            {company.phone && (
              <div>
                <p className="text-xs text-gray-600">Telefon</p>
                <p className="font-medium">{company.phone}</p>
              </div>
            )}
            {company.email && (
              <div>
                <p className="text-xs text-gray-600">E-posta</p>
                <p className="font-medium break-all">{company.email}</p>
              </div>
            )}
            {company.contact_person && (
              <div className="col-span-2">
                <p className="text-xs text-gray-600">Yetkili Kişi</p>
                <p className="font-medium">{company.contact_person}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Özet Kartları */}
      {ledgerSummary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-gray-600 mb-1">Toplam Alacağımız (Bize Borcu)</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrencyTRY(ledgerSummary.total_debit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-gray-600 mb-1">Toplam Borcumuz (Bizden Alacağı)</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrencyTRY(ledgerSummary.total_credit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-gray-600 mb-1">Net Bakiye</p>
              <p className={`text-xl font-bold ${ledgerSummary.net > 0 ? 'text-emerald-600' : ledgerSummary.net < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {formatCurrencyTRY(Math.abs(ledgerSummary.net))}
                <span className="text-sm font-normal ml-2">
                  {ledgerSummary.net > 0 ? '(Bize Borçlu)' : ledgerSummary.net < 0 ? '(Biz Borçluyuz)' : ''}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtreler ve İşlemler */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-2">Dönem / Yıl</label>
          <Select
            value={yearFilter?.toString() || 'all'}
            onValueChange={(value) => {
              onChangeYearFilter(value === 'all' ? null : parseInt(value));
            }}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Yıllar</SelectItem>
              {allYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          disabled={loading || ledgerEntries.length === 0}
        >
          Excel'e Aktar
        </Button>
        <Button
          size="sm"
          onClick={onAddLedgerEntry}
          disabled={loading}
        >
          + Hareket Ekle
        </Button>
      </div>

      {/* Hareket Tablosu */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cari Hareketler</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {loading && ledgerEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Hareketler yükleniyor...
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Bu dönemde hareket bulunmamaktadır
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold sticky top-0 bg-background z-10">
                    <th className="py-2.5 px-3 text-center w-12">SIRA</th>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">TARİH</th>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">BELGE NO</th>
                    <th className="py-2.5 px-3 text-left">AÇIKLAMA</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">BORÇ (BİZE)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">ALACAK (BİZDEN)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">BAKİYE</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap w-24">İŞLEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ledgerEntries.map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-muted-foreground">{index + 1}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium">{formatDateTR(entry.date)}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">{entry.document_no || '-'}</td>
                      <td className="py-2.5 px-3 min-w-[140px] max-w-[260px] truncate" title={entry.description || ''}>
                        {entry.description || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {entry.debit > 0 ? formatCurrencyTRY(entry.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-medium text-red-600 dark:text-red-400">
                        {entry.credit > 0 ? formatCurrencyTRY(entry.credit) : '-'}
                      </td>
                      <td className={`py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold ${
                        entry.running_balance > 0
                          ? 'text-red-600 dark:text-red-400'
                          : entry.running_balance < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}>
                        {formatCurrencyTRY(entry.running_balance)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEditLedgerEntry(entry)}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline disabled:text-muted-foreground text-xs font-medium cursor-pointer"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => onDeleteLedgerEntry(entry.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 hover:underline disabled:text-muted-foreground text-xs font-medium cursor-pointer"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {ledgerEntries.length > 0 && ledgerSummary && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-bold">
                      <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-muted-foreground">
                        TOPLAM
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-foreground">
                        {formatCurrencyTRY(ledgerSummary.total_debit)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyTRY(ledgerSummary.total_credit)}
                      </td>
                      <td className={`py-3 px-3 text-right whitespace-nowrap font-mono ${
                        ledgerSummary.net > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : ledgerSummary.net < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-foreground'
                      }`}>
                        {formatCurrencyTRY(ledgerSummary.net)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
