import { EInvoiceModule } from '@/components/e-fatura/gib-einvoice';
import { SmmPanel } from '@/components/e-fatura/smm-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText } from 'lucide-react';

export default function EFaturaPage() {
  return (
    <div className="h-full flex flex-col gap-6 w-full max-w-5xl mx-auto overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-7 w-7 text-blue-600" />
          e-Fatura & e-SMM (GİB)
        </h1>
        <p className="text-muted-foreground mt-2">
          GİB e-Arşiv portalına bağlanın; resmi e-Fatura ve e-Serbest Meslek Makbuzu (e-SMM) oluşturun, SMS ile imzalayıp yasal olarak kesin. Belgeler GİB sistemlerinde saklanır ve buradan indirilebilir.
        </p>
      </div>

      <Tabs defaultValue="fatura" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fatura">e-Fatura</TabsTrigger>
          <TabsTrigger value="smm">e-SMM Makbuzu</TabsTrigger>
        </TabsList>

        <TabsContent value="fatura" className="mt-4">
          <EInvoiceModule />
        </TabsContent>

        <TabsContent value="smm" className="mt-4">
          <SmmPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
