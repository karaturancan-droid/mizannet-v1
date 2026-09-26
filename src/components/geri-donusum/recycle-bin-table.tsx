'use client';

import * as React from 'react';
import { formatDateTR } from '@/lib/format';
import { RecycleBinItem } from '@/hooks/use-recycle-bin';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RestoreDialog } from './restore-dialog';
import { DeleteDialog } from './delete-dialog';
import { ItemDetailDialog, getItemTitle, entityTypeLabels } from './item-detail-dialog';
import { useToast } from '@/components/ui/toast';
import { Eye, RotateCcw, Trash2 } from 'lucide-react';

interface RecycleBinTableProps {
  items: RecycleBinItem[];
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function RecycleBinTable({
  items,
  onRestore,
  onDelete,
  isLoading = false,
}: RecycleBinTableProps) {
  const { addToast } = useToast();
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<RecycleBinItem | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleRowClick = (item: RecycleBinItem) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
  };

  const handleRestoreClick = (e: React.MouseEvent, item: RecycleBinItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setRestoreDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, item: RecycleBinItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleRestoreConfirm = async (itemToRestore?: RecycleBinItem) => {
    const target = itemToRestore || selectedItem;
    if (!target) return;
    setActionLoading(true);
    try {
      await onRestore(target.id);
      addToast({
        title: '✅ Öğe Geri Yüklendi',
        description: `"${getItemTitle(target)}" başarıyla geri yüklendi.`,
        variant: 'success',
      });
      setDetailDialogOpen(false);
      setRestoreDialogOpen(false);
    } catch (error) {
      addToast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Geri yükleme başarısız oldu.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async (itemToDelete?: RecycleBinItem) => {
    const target = itemToDelete || selectedItem;
    if (!target) return;
    
    // If called from detail modal directly, open delete confirmation first or confirm directly
    if (itemToDelete && !deleteDialogOpen) {
      setSelectedItem(itemToDelete);
      setDeleteDialogOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      await onDelete(target.id);
      addToast({
        title: 'Kalıcı Olarak Silindi',
        description: `"${getItemTitle(target)}" kalıcı olarak kaldırıldı.`,
        variant: 'success',
      });
      setDetailDialogOpen(false);
      setDeleteDialogOpen(false);
    } catch (error) {
      addToast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Silme başarısız oldu.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Geri dönüşüm kutunuz boş.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold">TÜR / MODÜL</TableHead>
              <TableHead className="font-bold">BAŞLIK / İÇERİK</TableHead>
              <TableHead className="font-bold">SİLİNME TARİHİ</TableHead>
              <TableHead className="font-bold">KALAN SÜRE</TableHead>
              <TableHead className="font-bold">DURUM</TableHead>
              <TableHead className="text-right font-bold">İŞLEMLER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const itemTitle = getItemTitle(item);
              const entityLabel = entityTypeLabels[item.entity_type] || item.entity_type;

              return (
                <TableRow
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="cursor-pointer hover:bg-accent/40 transition-colors group"
                >
                  <TableCell className="font-semibold text-xs">
                    <Badge variant="outline" className="bg-background group-hover:bg-primary/10 transition-colors">
                      {entityLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm text-foreground">
                    {itemTitle}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTR(item.deleted_at)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.days_left !== undefined ? (
                      <span className={item.days_left <= 7 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                        {item.days_left} gün
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" className="text-[11px]">
                      Geri Yüklenebilir
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRowClick(item)}
                        disabled={isLoading || actionLoading}
                        className="h-8 text-xs gap-1"
                        title="Detayları Gör"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detay</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleRestoreClick(e, item)}
                        disabled={isLoading || actionLoading}
                        className="h-8 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Geri Yükle</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => handleDeleteClick(e, item)}
                        disabled={isLoading || actionLoading}
                        className="h-8 text-xs gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Kalıcı Sil</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedItem && (
        <>
          {/* Öğe / Dosya Detay Modalı (İnceleme, Dokunma, Geri Yükle, Sil) */}
          <ItemDetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            item={selectedItem}
            onRestore={handleRestoreConfirm}
            onDelete={handleDeleteConfirm}
            isLoading={actionLoading}
          />

          {/* Hızlı Geri Yükleme Onay Diyaloğu */}
          <RestoreDialog
            open={restoreDialogOpen}
            onOpenChange={setRestoreDialogOpen}
            itemTitle={getItemTitle(selectedItem)}
            onConfirm={() => handleRestoreConfirm(selectedItem)}
            isLoading={actionLoading}
          />

          {/* Hızlı Kalıcı Silme Onay Diyaloğu */}
          <DeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            itemTitle={getItemTitle(selectedItem)}
            onConfirm={() => handleDeleteConfirm(selectedItem)}
            isLoading={actionLoading}
          />
        </>
      )}
    </>
  );
}
