'use client';

import { useCari, type Company } from '@/hooks/use-cari';
import { tlKuruşsuz } from '@/lib/dashboard-data';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { exportToExcel } from '@/lib/excel';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function ExcelView() {
  const {
    companies,
    selectedCompanyId,
    ledgerEntries,
    selectCompany,
    loading
  } = useCari();

  useEffect(() => {
    // If no company is selected and we have companies, select the first one
    if (!selectedCompanyId && companies.length > 0) {
      selectCompany(companies[0].id);
    }
  }, [companies, selectedCompanyId, selectCompany]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const { addToast } = useToast();

  const handleBulkExport = async () => {
    try {
      const wb = (await import('xlsx')).utils.book_new();
      let hasData = false;

      // Loop through all companies to fetch their ledgers
      for (const company of companies) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const entries: any[] = await invoke('list_ledger_entries', { company_id: company.id });
          
          if (entries && entries.length > 0) {
            hasData = true;
            
            const columns = [
              { header: 'SIRA', key: (r: any) => entries.indexOf(r) + 1 },
              { header: 'TARİH', key: 'date' },
              { header: 'NO', key: 'document_no' },
              { header: 'AÇIKLAMA', key: 'description' },
              { header: 'BORÇ', key: (r: any) => r.debit > 0 ? tlKuruşsuz(r.debit) : '' },
              { header: 'ALACAK', key: (r: any) => r.credit > 0 ? tlKuruşsuz(r.credit) : '' },
              { header: 'BAKİYE', key: (r: any) => tlKuruşsuz(r.running_balance) }
            ];

            const formattedData = entries.map((row) => {
              const formattedRow: Record<string, any> = {};
              columns.forEach((col) => {
                const val = typeof col.key === 'function' ? col.key(row) : row[col.key as keyof typeof row];
                formattedRow[col.header] = val;
              });
              return formattedRow;
            });

            const ws = (await import('xlsx')).utils.json_to_sheet(formattedData);
            
            // Limit sheet name length to 31 chars (Excel limit) and remove invalid chars
            const safeSheetName = company.name.substring(0, 31).replace(/[\\/?*\[\]:]/g, '');
            (await import('xlsx')).utils.book_append_sheet(wb, ws, safeSheetName || 'Sheet');
          }
        } catch (err) {
          console.error(`Failed to fetch entries for ${company.name}`, err);
        }
      }

      if (!hasData) {
        addToast({
          title: "Bilgi",
          description: "Dışa aktarılacak herhangi bir cari hareket bulunamadı.",
          variant: "default"
        });
        return;
      }

      // Generate Excel Buffer and save it via Tauri dialog
      const excelBuffer = (await import('xlsx')).write(wb, { bookType: 'xlsx', type: 'array' });
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      
      const filePath = await save({
        filters: [{ name: 'Excel Dosyası', extensions: ['xlsx'] }],
        defaultPath: `Tum_Firmalar_Hesap_Dokumu.xlsx`,
      });

      if (filePath) {
        await writeFile(filePath, new Uint8Array(excelBuffer));
        addToast({
          title: "Başarılı",
          description: "Toplu Excel dosyası başarıyla kaydedildi.",
          variant: "default"
        });
      }

    } catch (e) {
      console.error(e);
      addToast({
        title: "Hata",
        description: "Toplu aktarım sırasında hata oluştu.",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    if (!selectedCompany) return;
    
    try {
      const success = await exportToExcel(
        `${selectedCompany.name}_Hesaplari`,
        'Hesaplar',
        ledgerEntries,
        [
          { header: 'SIRA', key: (r: any) => ledgerEntries.indexOf(r) + 1 },
          { header: 'TARİH', key: 'date' },
          { header: 'NO', key: 'document_no' },
          { header: 'AÇIKLAMA', key: 'description' },
          { header: 'BORÇ', key: (r: any) => r.debit > 0 ? tlKuruşsuz(r.debit) : '' },
          { header: 'ALACAK', key: (r: any) => r.credit > 0 ? tlKuruşsuz(r.credit) : '' },
          { header: 'BAKİYE', key: (r: any) => tlKuruşsuz(r.running_balance) }
        ]
      );
      
      if (success) {
        addToast({
          title: "Başarılı",
          description: "Excel dosyası başarıyla kaydedildi.",
          variant: "default"
        });
      }
    } catch (e) {
      console.error(e);
      addToast({
        title: "Hata",
        description: "Excel dosyası kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full border border-gray-300 rounded-sm bg-white font-mono text-sm shadow-md overflow-hidden relative">
      {/* Excel Header / Title */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-lg mx-auto">
          {selectedCompany ? `${selectedCompany.name.toUpperCase()} HESAPLARI` : 'FİRMA SEÇİNİZ'}
        </h3>
        {selectedCompany && (
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleBulkExport} variant="outline" size="sm" className="text-xs h-7">
              <Download className="w-3 h-3 mr-1" />
              Tümünü Aktar
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="text-xs h-7 bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
              <Download className="w-3 h-3 mr-1" />
              Seçili Firmayı Aktar
            </Button>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-200 z-10 shadow-sm text-xs border-b-2 border-gray-400">
            <tr>
              <th className="border-r border-gray-300 px-2 py-1 text-center w-12 bg-gray-100"></th>
              <th className="border-r border-gray-300 px-2 py-1 text-center bg-gray-100 w-16">A</th>
              <th className="border-r border-gray-300 px-2 py-1 text-center bg-gray-100 w-24">B</th>
              <th className="border-r border-gray-300 px-2 py-1 text-center bg-gray-100 w-20">C</th>
              <th className="border-r border-gray-300 px-2 py-1 text-center bg-gray-100 min-w-[200px]">D</th>
              <th className="border-r border-gray-300 px-2 py-1 text-center bg-gray-100 w-32">E</th>
              <th className="border-r border-gray-300 px-2 py-1 text-center bg-gray-100 w-32">F</th>
              <th className="border-r border-gray-300 px-2 py-1 text-center bg-gray-100 w-32">G</th>
            </tr>
            <tr className="bg-gray-100 text-gray-800 font-bold">
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center bg-gray-200">1</th>
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center">SIRA</th>
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center">TARİH</th>
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center">NO</th>
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center">AÇIKLAMA</th>
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center">BORÇ</th>
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center">ALACAK</th>
              <th className="border-r border-b border-gray-300 px-2 py-1 text-center text-red-700">BAKİYE</th>
            </tr>
          </thead>
          <tbody>
            {ledgerEntries.length === 0 ? (
              <tr>
                <td className="border-r border-b border-gray-300 px-2 py-1 text-center bg-gray-100">2</td>
                <td colSpan={7} className="border-b border-gray-300 px-2 py-4 text-center text-gray-500 italic">
                  Henüz hareket bulunmuyor
                </td>
              </tr>
            ) : (
              ledgerEntries.map((entry, idx) => (
                <tr key={entry.id} className="hover:bg-blue-50/50">
                  <td className="border-r border-b border-gray-300 px-2 py-1 text-center bg-gray-100 text-xs font-semibold text-gray-600">{idx + 2}</td>
                  <td className="border-r border-b border-gray-300 px-2 py-1 text-center font-bold">{idx + 1}</td>
                  <td className="border-r border-b border-gray-300 px-2 py-1 text-center whitespace-nowrap">{entry.date}</td>
                  <td className="border-r border-b border-gray-300 px-2 py-1 text-center">{entry.document_no || ''}</td>
                  <td className="border-r border-b border-gray-300 px-2 py-1 font-semibold uppercase">{entry.description || ''}</td>
                  <td className="border-r border-b border-gray-300 px-2 py-1 text-right">{entry.debit > 0 ? tlKuruşsuz(entry.debit) : ''}</td>
                  <td className="border-r border-b border-gray-300 px-2 py-1 text-right">{entry.credit > 0 ? tlKuruşsuz(entry.credit) : ''}</td>
                  <td className="border-r border-b border-gray-300 px-2 py-1 text-right text-red-700 font-bold">{tlKuruşsuz(entry.running_balance)}</td>
                </tr>
              ))
            )}
            {/* Add some empty rows to make it look more like Excel */}
            {Array.from({ length: Math.max(0, 15 - ledgerEntries.length) }).map((_, idx) => (
              <tr key={`empty-${idx}`}>
                <td className="border-r border-b border-gray-300 px-2 py-1 text-center bg-gray-100 text-xs font-semibold text-gray-600">{ledgerEntries.length + idx + 2}</td>
                <td className="border-r border-b border-gray-300 px-2 py-1"></td>
                <td className="border-r border-b border-gray-300 px-2 py-1"></td>
                <td className="border-r border-b border-gray-300 px-2 py-1"></td>
                <td className="border-r border-b border-gray-300 px-2 py-1"></td>
                <td className="border-r border-b border-gray-300 px-2 py-1"></td>
                <td className="border-r border-b border-gray-300 px-2 py-1"></td>
                <td className="border-r border-b border-gray-300 px-2 py-1"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Excel Sheet Tabs (Bottom) */}
      <div className="bg-gray-200 border-t border-gray-300 flex overflow-x-auto whitespace-nowrap">
        {/* Navigation arrows (decorative) */}
        <div className="flex items-center px-2 bg-gray-200 border-r border-gray-300">
          <span className="text-gray-500 hover:text-black cursor-pointer px-1">&lt;</span>
          <span className="text-gray-500 hover:text-black cursor-pointer px-1">&gt;</span>
        </div>
        
        {companies.length === 0 ? (
          <div className="px-4 py-1 text-gray-500 italic text-xs flex items-center">Firma Yok</div>
        ) : (
          companies.map((company) => (
            <button
              key={company.id}
              onClick={() => selectCompany(company.id)}
              className={`px-4 py-1.5 text-xs font-semibold uppercase border-r border-gray-300 transition-colors ${
                selectedCompanyId === company.id
                  ? 'bg-white text-green-800 border-b-[3px] border-b-green-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {company.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
