'use client';

import { Tire } from '@/hooks/use-araclar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTR } from '@/lib/format';

interface VehicleTiresTabProps {
  tires: Tire[];
  loading: boolean;
}

export function VehicleTiresTab({ tires, loading }: VehicleTiresTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (tires.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Bu araç için lastik kaydı bulunmamaktadır.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>POZİSYON</TableHead>
            <TableHead>DOT KODU</TableHead>
            <TableHead className="text-right">DİŞ DERİNLİĞİ (mm)</TableHead>
            <TableHead>DEĞİŞİM TARİHİ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tires.map((tire) => (
            <TableRow key={tire.id}>
              <TableCell>{tire.position || '-'}</TableCell>
              <TableCell>{tire.dot_code || '-'}</TableCell>
              <TableCell className="text-right">
                {tire.tread_depth !== undefined && tire.tread_depth !== null ? `${tire.tread_depth}` : '-'}
              </TableCell>
              <TableCell>
                {tire.change_date ? formatDateTR(tire.change_date) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
