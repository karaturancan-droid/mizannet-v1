'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NotificationFiltersProps {
  moduleFilter: string;
  statusFilter: string;
  onModuleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

const MODULES = [
  { value: '', label: 'Tümü' },
  { value: 'vergi', label: 'Vergi' },
  { value: 'araclar', label: 'Araçlar' },
  { value: 'belgeler', label: 'Belgeler' },
  { value: 'depo', label: 'Depo' },
  { value: 'isciler', label: 'İşçiler' },
];

const STATUSES = [
  { value: '', label: 'Tümü' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'okundu', label: 'Okundu' },
  { value: 'ertelendi', label: 'Ertelendi' },
];

export function NotificationFilters({
  moduleFilter,
  statusFilter,
  onModuleChange,
  onStatusChange,
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Select value={moduleFilter} onValueChange={onModuleChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue  />
        </SelectTrigger>
        <SelectContent>
          {MODULES.map((module) => (
            <SelectItem key={module.value} value={module.value}>
              {module.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue  />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
