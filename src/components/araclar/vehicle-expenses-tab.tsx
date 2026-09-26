'use client';

import { VehicleExpense, VehicleExpenseSummary } from '@/hooks/use-araclar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { formatCurrencyTRY, formatDateTR } from '@/lib/format';

interface VehicleExpensesTabProps {
  expenses: VehicleExpense[];
  summary: VehicleExpenseSummary | null;
  loading: boolean;
}

export function VehicleExpensesTab({
  expenses,
  summary,
  loading,
}: VehicleExpensesTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {summary.by_type.map((item) => (
            <Card key={item.type} className="p-3">
              <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
              <p className="font-semibold">{formatCurrencyTRY(item.total)}</p>
            </Card>
          ))}
          <Card className="p-3 bg-primary text-primary-foreground">
            <p className="text-xs opacity-90">Toplam</p>
            <p className="font-semibold">{formatCurrencyTRY(summary.grand_total)}</p>
          </Card>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          Bu araç için masraf bulunmamaktadır.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TARİH</TableHead>
                <TableHead>TİP</TableHead>
                <TableHead className="text-right">TUTAR</TableHead>
                <TableHead>NOT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDateTR(expense.date)}</TableCell>
                  <TableCell className="capitalize">{expense.type}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrencyTRY(expense.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{expense.note || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
