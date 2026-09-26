'use client';

import { useState, useEffect } from 'react';
import { useBelgeler, Document } from '@/hooks/use-belgeler';
import { DocumentList } from '@/components/belgeler/document-list';
import { DocumentForm } from '@/components/belgeler/document-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { StatCard, StatCardRow } from '@/components/ui/stat-card';

export default function BelgelerPage() {
  const { documents, loading, error, createDocument, updateDocument, deleteDocument, loadDocuments } = useBelgeler();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const kategoriSayisi = new Set(documents.map((d) => d.category).filter(Boolean)).size;
  const suresiYakinSayisi = documents.filter((d) => {
    if (!d.expiry_date) return false;
    const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  const handleEdit = (doc: Document) => {
    setSelectedDocument(doc);
    setShowForm(true);
  };

  const handleDeleteRequest = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    setIsLoading(true);
    deleteDocument(pendingDeleteId)
      .then(() => {
        addToast({ title: 'Belge silindi', variant: 'success' });
        loadDocuments();
      })
      .catch((err) => {
        addToast({ title: 'Hata', description: err.message || 'Belge silinemedi', variant: 'destructive' });
      })
      .finally(() => {
        setIsLoading(false);
        setPendingDeleteId(null);
      });
  };

  const handleSubmit = async (data: Omit<Document, 'id' | 'created_at'>) => {
    setIsLoading(true);
    try {
      if (selectedDocument) {
        await updateDocument(selectedDocument.id, data);
        addToast({ title: 'Belge güncellendi', variant: 'success' });
      } else {
        await createDocument(data);
        addToast({ title: 'Belge oluşturuldu', variant: 'success' });
      }
      setShowForm(false);
      setSelectedDocument(null);
      loadDocuments();
    } catch (err) {
      addToast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'İşlem başarısız',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Belge Arşivi</h1>
        <Button onClick={() => {
          setSelectedDocument(null);
          setShowForm(true);
        }}>
          + Yeni Belge
        </Button>
      </div>

      <StatCardRow>
        <StatCard label="Toplam Belge" value={documents.length} />
        <StatCard label="Kategori" value={kategoriSayisi} />
        <StatCard label="Süresi Yakın" value={suresiYakinSayisi} variant={suresiYakinSayisi > 0 ? 'warning' : 'default'} />
      </StatCardRow>

      <DocumentList
        documents={documents}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onRefresh={loadDocuments}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument ? 'Belgeyi Düzenle' : 'Yeni Belge Ekle'}</DialogTitle>
          </DialogHeader>
          <DocumentForm
            document={selectedDocument || undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedDocument(null);
            }}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Belgeyi Sil"
        description="Bu belgeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Sil"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
