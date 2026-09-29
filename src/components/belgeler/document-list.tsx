'use client';

import { useState, useEffect } from 'react';
import { useBelgeler, Document } from '@/hooks/use-belgeler';
import { formatDateTR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ExternalLink, Trash2, Edit2, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  error: string | null;
  onEdit: (doc: Document) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function DocumentList({ documents, loading, error, onEdit, onDelete, onRefresh }: DocumentListProps) {
  const { openDocumentFile } = useBelgeler();
  const { addToast } = useToast();
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    let filtered = documents;

    if (categoryFilter) {
      filtered = filtered.filter((doc) => doc.category === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(term) ||
          (doc.tags && doc.tags.toLowerCase().includes(term))
      );
    }

    setFilteredDocs(filtered);
  }, [documents, searchTerm, categoryFilter]);

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return <Badge variant="destructive">Süresi Doldu</Badge>;
    } else if (daysLeft <= 30) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        {daysLeft} Gün Kaldı
      </Badge>;
    }

    return null;
  };

  const handleOpenFile = (doc: Document) => {
    if (!doc.file_path) return;
    openDocumentFile(doc.file_path).catch((err) => {
      addToast({ title: 'Dosya açılamadı', description: err instanceof Error ? err.message : 'Bilinmeyen hata', variant: 'destructive' });
    });
  };

  const categories = Array.from(new Set(documents.map((doc) => doc.category).filter(Boolean)));

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-800">Hata: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Belge arşivinde kayıt bulunmamaktadır.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Başlık veya etiket ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={categoryFilter === '' ? 'all' : categoryFilter} onValueChange={(val) => setCategoryFilter(val === 'all' ? '' : val)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue  />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat || 'other'}>
                {cat || 'Diğer'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sonuç bulunamadı
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={doc.title}>{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.category || 'Diğer'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {doc.file_path && (
                    <button
                      type="button"
                      onClick={() => handleOpenFile(doc)}
                      title="Dosyayı Aç"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(doc)}
                    title="Düzenle"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    title="Sil"
                    className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {doc.expiry_date && (
                  <>
                    <span className="text-muted-foreground">{formatDateTR(doc.expiry_date)}</span>
                    {getExpiryBadge(doc.expiry_date)}
                  </>
                )}
                {doc.tags?.split(',').map((tag) => (
                  <Badge key={tag.trim()} variant="outline">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
