'use client';

import { useState } from 'react';
import { Worker, Leave, Overtime, Payroll, WorkerAdvance } from '@/hooks/use-isciler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrencyTRY, formatDateTR } from '@/lib/format';

interface WorkerDetailsProps {
  worker: Worker | null;
  leaves: Leave[];
  overtimes: Overtime[];
  payrolls: Payroll[];
  advances: WorkerAdvance[];
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
  onAddLeave: () => void;
  onDeleteLeave: (id: string) => void;
  onAddOvertime: () => void;
  onDeleteOvertime: (id: string) => void;
  onAddPayroll: () => void;
  onEditPayroll: (payroll: Payroll) => void;
  onDeletePayroll: (id: string) => void;
  onAddAdvance: () => void;
  onDeleteAdvance: (id: string) => void;
  loading: boolean;
}

export function WorkerDetails({
  worker,
  leaves,
  overtimes,
  payrolls,
  advances,
  onEdit,
  onDelete,
  onAddLeave,
  onDeleteLeave,
  onAddOvertime,
  onDeleteOvertime,
  onAddPayroll,
  onEditPayroll,
  onDeletePayroll,
  onAddAdvance,
  onDeleteAdvance,
  loading,
}: WorkerDetailsProps) {

  if (!worker) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Sol taraftan bir işçi seçerek detaylarını inceleyin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleDeleteWorker = () => {
    onDelete(worker.id);
  };

  const getStatusBadge = (exitDate?: string) => {
    if (exitDate) {
      return <Badge className="bg-gray-500 hover:bg-gray-600">Ayrılmış</Badge>;
    }
    return <Badge className="bg-green-700 hover:bg-green-800">Aktif</Badge>;
  };

  const getPayrollStatusBadge = (status: string) => {
    switch (status) {
      case 'taslak':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Taslak</Badge>;
      case 'ödendi':
        return <Badge className="bg-green-700 hover:bg-green-800">Ödendi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Temel Bilgiler */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{worker.full_name}</CardTitle>
              <CardDescription>{worker.position || 'Pozisyon belirtilmemiş'}</CardDescription>
            </div>
            {getStatusBadge(worker.exit_date)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {worker.tc_no && (
              <div>
                <p className="text-sm text-muted-foreground">TC Kimlik No</p>
                <p className="font-semibold">{worker.tc_no}</p>
              </div>
            )}
            {worker.birth_date && (
              <div>
                <p className="text-sm text-muted-foreground">Doğum Tarihi</p>
                <p className="font-semibold">{formatDateTR(worker.birth_date)}</p>
              </div>
            )}
            {worker.hire_date && (
              <div>
                <p className="text-sm text-muted-foreground">İşe Giriş Tarihi</p>
                <p className="font-semibold">{formatDateTR(worker.hire_date)}</p>
              </div>
            )}
            {worker.exit_date && (
              <div>
                <p className="text-sm text-muted-foreground">Ayrılış Tarihi</p>
                <p className="font-semibold">{formatDateTR(worker.exit_date)}</p>
              </div>
            )}
            {worker.sgk_no && (
              <div>
                <p className="text-sm text-muted-foreground">SGK No</p>
                <p className="font-semibold">{worker.sgk_no}</p>
              </div>
            )}
            {worker.iban && (
              <div>
                <p className="text-sm text-muted-foreground">IBAN</p>
                <p className="font-semibold font-mono">{worker.iban}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Maaş</p>
              <p className="font-semibold">{formatCurrencyTRY(worker.salary)}</p>
            </div>
            {worker.severance_pay !== undefined && worker.severance_pay !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Kıdem Tazminatı (Güncel)</p>
                <p className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md inline-block">
                  {formatCurrencyTRY(worker.severance_pay)}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onEdit(worker)}
              className="flex-1"
            >
              Düzenle
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorker}
              className="flex-1"
            >
              Sil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sekmeler */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylar</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="leaves" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="leaves">İzinler</TabsTrigger>
              <TabsTrigger value="overtimes">Mesai</TabsTrigger>
              <TabsTrigger value="payrolls">Maaşlar & Avanslar</TabsTrigger>
            </TabsList>

            {/* İzinler Sekmesi */}
            <TabsContent value="leaves" className="space-y-4">
              <Button onClick={onAddLeave} className="w-full">
                İzin Ekle
              </Button>
              {leaves.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  İzin kaydı bulunmamaktadır.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>BAŞLANGIÇ</TableHead>
                        <TableHead>BİTİŞ</TableHead>
                        <TableHead>TİP</TableHead>
                        <TableHead>GÜN</TableHead>
                        <TableHead className="text-right">İŞLEMLER</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell>{formatDateTR(leave.start_date)}</TableCell>
                          <TableCell>{formatDateTR(leave.end_date)}</TableCell>
                          <TableCell>{leave.type || '-'}</TableCell>
                          <TableCell>{leave.days || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDeleteLeave(leave.id)}
                            >
                              Sil
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Mesai Sekmesi */}
            <TabsContent value="overtimes" className="space-y-4">
              <Button onClick={onAddOvertime} className="w-full">
                Mesai Ekle
              </Button>
              {overtimes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Mesai kaydı bulunmamaktadır.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TARİH</TableHead>
                        <TableHead>SAAT</TableHead>
                        <TableHead>ORAN</TableHead>
                        <TableHead className="text-right">İŞLEMLER</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overtimes.map((overtime) => (
                        <TableRow key={overtime.id}>
                          <TableCell>{formatDateTR(overtime.date)}</TableCell>
                          <TableCell>{overtime.hours}</TableCell>
                          <TableCell>{overtime.rate}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDeleteOvertime(overtime.id)}
                            >
                              Sil
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Maaşlar ve Avanslar Sekmesi */}
            <TabsContent value="payrolls" className="mt-4">
              <div className="flex flex-col gap-6">
                {/* Avanslar Bölümü */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Avans Kayıtları</h3>
                    <Button variant="outline" size="sm" onClick={onAddAdvance}>
                      + Avans Ver
                    </Button>
                  </div>
                  {advances.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                      Avans kaydı bulunmamaktadır.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Açıklama</TableHead>
                          <TableHead className="text-right">Tutar</TableHead>
                          <TableHead className="w-[100px] text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {advances.map((advance) => (
                          <TableRow key={advance.id}>
                            <TableCell>{formatDateTR(advance.date)}</TableCell>
                            <TableCell>{advance.description || '-'}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              - {formatCurrencyTRY(advance.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive h-8 px-2"
                                onClick={() => onDeleteAdvance(advance.id)}
                              >
                                Sil
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Maaşlar Bölümü */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Maaş Bordroları</h3>
                    <Button variant="outline" size="sm" onClick={onAddPayroll}>
                      + Bordro Ekle
                    </Button>
                  </div>
                  {payrolls.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                      Maaş kaydı bulunmamaktadır.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dönem</TableHead>
                          <TableHead className="text-right">Brüt</TableHead>
                          <TableHead className="text-right">Kesintiler</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrolls.map((payroll) => (
                          <TableRow key={payroll.id}>
                            <TableCell>{payroll.period}</TableCell>
                            <TableCell className="text-right">{formatCurrencyTRY(payroll.gross || 0)}</TableCell>
                            <TableCell className="text-right text-red-600">
                              - {formatCurrencyTRY(payroll.deductions || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrencyTRY(payroll.net || 0)}
                            </TableCell>
                            <TableCell>
                              {getPayrollStatusBadge(payroll.status)}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => onEditPayroll(payroll)}
                              >
                                Düzenle
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive h-8 px-2"
                                onClick={() => onDeletePayroll(payroll.id)}
                              >
                                Sil
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
