'use client';

import { useEffect, useRef } from 'react';
import { AgentStep } from '@/hooks/use-asistan';
import {
  Terminal,
  Folder,
  FileText,
  FileOutput,
  Image as ImageIcon,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStepsProps {
  steps: AgentStep[];
  visible: boolean;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType }> = {
  terminal: { label: 'Terminal', icon: Terminal },
  list_dir: { label: 'Klasör', icon: Folder },
  read_file: { label: 'Dosya Oku', icon: FileText },
  write_file: { label: 'Dosya Yaz', icon: FileText },
  move: { label: 'Taşı', icon: FileText },
  copy: { label: 'Kopyala', icon: FileText },
  delete: { label: 'Sil', icon: FileText },
  search_files: { label: 'Ara', icon: Folder },
  excel: { label: 'Excel', icon: FileOutput },
  word: { label: 'Word', icon: FileOutput },
  belge: { label: 'Belge', icon: FileOutput },
  dosya: { label: 'Dosya', icon: FileOutput },
  gorsel: { label: 'Görsel Üret', icon: ImageIcon },
  veritabanı: { label: 'Veritabanı', icon: Database },
  'veritabanı-yazma': { label: 'Veritabanı Yaz', icon: Database },
};

function StepRow({ step }: { step: AgentStep }) {
  const meta = TOOL_META[step.tool] ?? { label: step.tool, icon: FileText };
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div
        className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5',
          step.status === 'error'
            ? 'bg-red-100 text-red-600'
            : step.status === 'running'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-green-100 text-green-600'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
          {step.status === 'running' && (
            <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
          )}
          {step.status === 'done' && (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          )}
          {step.status === 'error' && (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
        <p
          className={cn(
            'text-xs text-gray-500 break-all font-mono',
            step.status === 'error' && 'text-red-600'
          )}
          title={step.detail}
        >
          {step.detail.length > 120 ? `${step.detail.slice(0, 120)}...` : step.detail}
        </p>
      </div>
    </div>
  );
}

export function AgentSteps({ steps, visible }: AgentStepsProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (!visible || steps.length === 0) return null;

  const hasRunning = steps.some((s) => s.status === 'running');

  return (
    <div className="max-w-3xl mx-auto w-full px-4 mb-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-bold text-blue-700">
            Ajan Çalışıyor
            {hasRunning && (
              <span className="ml-1.5 text-[10px] font-normal text-blue-400">
                (adımlar canlı gösteriliyor)
              </span>
            )}
          </span>
        </div>
        <div className="divide-y divide-blue-50">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
}
