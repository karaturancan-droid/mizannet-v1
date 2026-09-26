'use client';

import { Vehicle } from '@/hooks/use-araclar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTR } from '@/lib/format';

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
  onAddExpense: () => void;
  onAddTire: () => void;
  loading: boolean;
}

const statusColors: Record<string, string> = {
  aktif: 'bg-green-600',
  bakımda: 'bg-yellow-500',
  pasif: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  aktif: 'Aktif',
  bakımda: 'Bakımda',
  pasif: 'Pasif',
};

export function VehicleDetails({
  vehicle,
  onEdit,
  onDelete,
  onAddExpense,
  onAddTire,
  loading,
}: VehicleDetailsProps) {
  const getDateWarning = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { type: 'overdue', days: Math.abs(daysUntil) };
    } else if (daysUntil <= 30) {
      return { type: 'warning', days: daysUntil };
    }
    return null;
  };

  const inspectionWarning = getDateWarning(vehicle.inspection_due_date);
  const insuranceWarning = getDateWarning(vehicle.insurance_due_date);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{vehicle.plate}</h2>
          {(vehicle.brand || vehicle.model) && (
            <p className="text-sm text-muted-foreground">
              {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
            </p>
          )}
        </div>
        <Badge
          className={`text-white ${statusColors[vehicle.status]}`}
          variant="secondary"
        >
          {statusLabels[vehicle.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {vehicle.km !== undefined && vehicle.km !== null && (
          <div>
            <p className="text-xs text-muted-foreground">KM</p>
            <p className="font-semibold">{vehicle.km.toLocaleString('tr-TR')}</p>
          </div>
        )}
        {vehicle.inspection_due_date && (
          <div>
            <p className="text-xs text-muted-foreground">Muayene Tarihi</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{formatDateTR(vehicle.inspection_due_date)}</p>
              {inspectionWarning && (
                <Badge
                  variant={inspectionWarning.type === 'overdue' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {inspectionWarning.type === 'overdue'
                    ? `${inspectionWarning.days}g geçmiş`
                    : `${inspectionWarning.days}g kaldı`}
                </Badge>
              )}
            </div>
          </div>
        )}
        {vehicle.insurance_due_date && (
          <div>
            <p className="text-xs text-muted-foreground">Sigorta Tarihi</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{formatDateTR(vehicle.insurance_due_date)}</p>
              {insuranceWarning && (
                <Badge
                  variant={insuranceWarning.type === 'overdue' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {insuranceWarning.type === 'overdue'
                    ? `${insuranceWarning.days}g geçmiş`
                    : `${insuranceWarning.days}g kaldı`}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onEdit} variant="outline" disabled={loading}>
          Düzenle
        </Button>
        <Button onClick={onDelete} variant="destructive" disabled={loading}>
          Sil
        </Button>
        <Button onClick={onAddExpense} disabled={loading}>
          Masraf Ekle
        </Button>
        <Button onClick={onAddTire} disabled={loading}>
          Lastik Ekle
        </Button>
      </div>
    </div>
  );
}
