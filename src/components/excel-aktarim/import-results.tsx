'use client';

import { ImportResult } from '@/hooks/use-excel-aktarim';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ImportResultsProps {
  result: ImportResult;
  onReset: () => void;
}

export function ImportResults({ result, onReset }: ImportResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adım 3: İçe Aktarma Sonuçları</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">Başarılı Kayıt Sayısı</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">{result.imported}</p>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onReset}>Yeni Dosya Yükle</Button>
        </div>
      </CardContent>
    </Card>
  );
}
