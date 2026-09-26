'use client';

import { StockSummary } from '@/hooks/use-depo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyTRY } from '@/lib/format';

interface StockSummaryProps {
  summary: StockSummary | null;
  loading: boolean;
}

export function StockSummaryCards({ summary, loading }: StockSummaryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Toplam Stok Değeri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyTRY(summary.total_stock_value)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Kritik Stok Sayısı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.critical_products.length}</div>
          {summary.critical_products.length > 0 && (
            <div className="mt-2 space-y-1">
              {summary.critical_products.slice(0, 3).map((item) => (
                <div key={item.id} className="text-xs text-muted-foreground">
                  <span className="font-semibold">{item.name}</span>
                  <span className="ml-1">({item.current_stock}/{item.min_stock})</span>
                </div>
              ))}
              {summary.critical_products.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{summary.critical_products.length - 3} daha...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
