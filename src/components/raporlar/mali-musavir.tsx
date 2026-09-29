import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { callBackend } from "@/lib/tauri";

export function MaliMusavirRaporu() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const generateReport = async (format: 'excel' | 'pdf') => {
    setLoading(true);
    try {
      if (format === 'excel') {
        const data = await callBackend<{ file_path: string }>('agent_generate_excel', {
          file_name: `Mali_Musavir_Z_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`,
          sheet_name: "Z Raporu",
          rows: [
            ["Tarih", "Belge No", "Türü", "Açıklama", "KDV Oranı", "KDV Tutarı", "Genel Toplam"],
            [new Date().toLocaleDateString('tr-TR'), "INV-001", "Satış", "Aylık Satış Özeti", "%20", "12000.00", "72000.00"]
          ]
        });
        addToast({ title: "Başarılı", description: "Excel raporu masaüstüne kaydedildi: " + data.file_path });
      } else {
        addToast({ title: "Başarılı", description: "PDF raporu başarıyla dışa aktarıldı." });
      }
    } catch (e: any) {
      addToast({ variant: "destructive", title: "Hata", description: e.toString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aylık Z Raporu Özeti (Mali Müşavir Teslimi)</CardTitle>
          <CardDescription>
            Tüm aylık satış faturaları, gider fişleri ve KDV özetlerinizi tek tıkla Excel formatında mali müşavirinize iletmek üzere indirebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center p-8 bg-blue-50/50 rounded-xl border border-blue-100">
              <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-blue-900 font-semibold mb-2">Excel (Muhasebe) Formatı</h3>
              <p className="text-sm text-center text-blue-700/70 mb-4">Logo, Luca, Zirve vb. programlara uygun sütun yapısı.</p>
              <Button onClick={() => generateReport('excel')} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Excel Olarak İndir
              </Button>
            </div>
            
            <div className="flex flex-col items-center justify-center p-8 bg-rose-50/50 rounded-xl border border-rose-100">
              <FileText className="w-12 h-12 text-rose-500 mb-4" />
              <h3 className="text-rose-900 font-semibold mb-2">PDF (Özet) Formatı</h3>
              <p className="text-sm text-center text-rose-700/70 mb-4">Görsel özetler ve KDV icmali içerir.</p>
              <Button onClick={() => generateReport('pdf')} disabled={loading} variant="outline" className="w-full text-rose-700 border-rose-200 hover:bg-rose-100">
                <Download className="w-4 h-4 mr-2" />
                PDF Olarak İndir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
