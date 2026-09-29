'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, useBelgeler } from '@/hooks/use-belgeler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface DocumentFormProps {
  document?: Document;
  onSubmit: (data: Omit<Document, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  'Muhasebe',
  'Vergi',
  'Araç',
  'Depo',
  'İşçi',
  'Diğer',
];

const FILE_TYPES = [
  'PDF',
  'Word',
  'Excel',
  'Resim',
  'Diğer',
];

function guessFileType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'Word';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) return 'Excel';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => lower.endsWith(ext))) return 'Resim';
  return 'Diğer';
}

function fileNameFromPath(path?: string): string {
  if (!path) return '';
  const parts = path.split(/[\\/]/);
  const last = parts[parts.length - 1] || '';
  return last.replace(/^[a-f0-9-]{36}_/i, '');
}

export function DocumentForm({ document, onSubmit, onCancel, isLoading = false }: DocumentFormProps) {
  const { uploadDocumentFile } = useBelgeler();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Document, 'id' | 'created_at'>>({
    title: '',
    category: '',
    file_type: '',
    file_path: '',
    related_type: '',
    related_id: '',
    expiry_date: '',
    tags: '',
    notes: '',
  });

  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        category: document.category || '',
        file_type: document.file_type || '',
        file_path: document.file_path || '',
        related_type: document.related_type || '',
        related_id: document.related_id || '',
        expiry_date: document.expiry_date || '',
        tags: document.tags || '',
        notes: document.notes || '',
      });
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast({ title: 'Başlık gereklidir', variant: 'destructive' });
      return;
    }
    await onSubmit(formData);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const filePath = await uploadDocumentFile(file);
      setFormData((prev) => ({
        ...prev,
        file_path: filePath,
        file_type: prev.file_type || guessFileType(file.name),
        title: prev.title.trim() ? prev.title : file.name.replace(/\.[^.]+$/, ''),
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Dosya yüklenemedi');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{document ? 'Belgeyi Düzenle' : 'Yeni Belge Ekle'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Başlık *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={formData.category || ''}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={isLoading}
              >
                <SelectTrigger id="category">
                  <SelectValue  />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file_type">Dosya Tipi</Label>
              <Select
                value={formData.file_type || ''}
                onValueChange={(value) => setFormData({ ...formData, file_type: value })}
                disabled={isLoading}
              >
                <SelectTrigger id="file_type">
                  <SelectValue  />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Dosya</Label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading || isUploading}
            />
            <div className="flex items-center gap-3 rounded-md border border-dashed p-3">
              {formData.file_path ? (
                <>
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{fileNameFromPath(formData.file_path)}</span>
                </>
              ) : (
                <span className="flex-1 text-sm text-muted-foreground">Henüz dosya seçilmedi</span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {formData.file_path ? 'Değiştir' : 'Dosya Seç'}
              </Button>
            </div>
            {uploadError && <p className="mt-1 text-xs text-destructive">{uploadError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="related_type">İlişkili Tür</Label>
              <Input
                id="related_type"
                value={formData.related_type}
                onChange={(e) => setFormData({ ...formData, related_type: e.target.value })}
                
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="related_id">İlişkili ID</Label>
              <Input
                id="related_id"
                value={formData.related_id}
                onChange={(e) => setFormData({ ...formData, related_id: e.target.value })}
                
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expiry_date">Son Geçerlilik Tarihi</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="tags">Etiketler (virgülle ayrılmış)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {document ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
