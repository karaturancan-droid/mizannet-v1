import { EInvoiceModule } from '@/components/e-fatura/gib-einvoice';
import { FileText } from 'lucide-react';

export default function EFaturaPage() {
  return (
    <div className="h-full flex flex-col gap-6 w-full max-w-5xl mx-auto overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-7 w-7 text-blue-600" />
          e-Fatura (GİB e-Arşiv)
        </h1>
        <p className="text-muted-foreground mt-2">
          GİB e-Arşiv portalına bağlanın, resmi e-Fatura oluşturun, SMS ile imzalayıp yasal olarak kesin. Belgeler GİB sistemlerinde saklanır ve buradan indirilebilir.
        </p>
      </div>

      <EInvoiceModule />
    </div>
  );
}
