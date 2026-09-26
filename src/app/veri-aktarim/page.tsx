import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExcelAktarimPage } from "@/components/veri-aktarim/excel-aktarim";
import { FaturaAktarimPage } from "@/components/veri-aktarim/fatura-aktarim";
import { FileSpreadsheet, ReceiptText } from "lucide-react";

export default function VeriAktarimPage() {
  return (
    <div className="h-full flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dışarıdan Veri Aktarımı</h1>
        <p className="text-muted-foreground mt-2">Sisteme Excel/CSV dosyalarından toplu veri aktarın veya fatura fotoğraflarını yapay zeka ile otomatik okutup sisteme entegre edin.</p>
      </div>

      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-auto">
          <TabsTrigger value="excel" className="flex items-center gap-2 py-3 text-base">
            <FileSpreadsheet className="w-5 h-5" />
            Excel / CSV ile Aktarım
          </TabsTrigger>
          <TabsTrigger value="fatura" className="flex items-center gap-2 py-3 text-base">
            <ReceiptText className="w-5 h-5" />
            Fatura Fotoğrafı Okutma
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="excel" className="mt-0 outline-none">
          <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm min-h-[500px]">
            <ExcelAktarimPage />
          </div>
        </TabsContent>
        
        <TabsContent value="fatura" className="mt-0 outline-none">
          <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm min-h-[500px]">
            <FaturaAktarimPage />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
