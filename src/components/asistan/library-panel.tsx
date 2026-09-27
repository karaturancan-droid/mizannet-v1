'use client';

import { useRef } from 'react';
import { useLibrary, LibraryDocument } from '@/hooks/use-asistan';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, FileText, File, FileImage, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryPanelProps {
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FileImage;
  if (['txt', 'md', 'csv'].includes(ext)) return FileText;
  return File;
}

function DocCard({ doc, onDelete }: { doc: LibraryDocument; onDelete: () => void }) {
  const Icon = getFileIcon(doc.file_type, doc.name);
  const hasText = !!doc.content_text;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-white hover:shadow-sm transition-shadow group">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate" title={doc.name}>{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatBytes(doc.size_bytes)}</span>
          {hasText ? (
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">AI bağlamında</span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">İkili dosya</span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
        title="Sil"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function LibraryPanel({ onClose }: LibraryPanelProps) {
  const { documents, loading, error, uploadDocument, deleteDocument } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        await uploadDocument(file);
      } catch {
        // error shown via hook state
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-72 h-full bg-white border-l border-border flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Kitaplık</h2>
          <p className="text-xs text-gray-400">AI bağlamına belge ekle</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Upload Zone */}
      <div className="px-3 pt-3">
        <div
          className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="h-6 w-6 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Belge yükle</p>
          <p className="text-xs text-gray-400 mt-0.5">PDF, TXT, CSV, MD — sürükle bırak</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".txt,.md,.csv,.pdf,.docx"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && documents.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Yükleniyor...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10">
            <File className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Henüz belge yok</p>
            <p className="text-xs text-gray-300 mt-1">Yüklediğiniz belgeler AI asistanınızın bağlamına eklenir</p>
          </div>
        ) : (
          documents.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              onDelete={() => deleteDocument(doc.id)}
            />
          ))
        )}
      </div>

      {/* Footer info */}
      {documents.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-gray-50">
          <p className="text-xs text-gray-400">
            {documents.filter(d => d.content_text).length} / {documents.length} belge AI bağlamında
          </p>
        </div>
      )}
    </div>
  );
}
