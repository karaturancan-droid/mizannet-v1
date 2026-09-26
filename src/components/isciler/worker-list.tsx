'use client';

import { useState, useMemo } from 'react';
import { Worker } from '@/hooks/use-isciler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/toast";
import { open } from '@tauri-apps/plugin-shell';

interface WorkerListProps {
  workers: Worker[];
  selectedWorkerId: string | null;
  onSelectWorker: (id: string) => void;
  onAddWorker: () => void;
  loading: boolean;
}

export function WorkerList({
  workers,
  selectedWorkerId,
  onSelectWorker,
  onAddWorker,
  loading,
}: WorkerListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const { addToast: toast } = useToast();

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) =>
      w.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workers, searchTerm]);

  const getStatusBadge = (exitDate?: string) => {
    if (exitDate) {
      return <Badge className="bg-gray-500 hover:bg-gray-600">Ayrılmış</Badge>;
    }
    return <Badge className="bg-green-700 hover:bg-green-800">Aktif</Badge>;
  };

  // Define position hierarchy for sorting
  const positionHierarchy: Record<string, number> = {
    'Patron': 1,
    'Yönetici': 2,
    'Şantiye Şefi': 3,
    'Mühendis': 4,
    'Formen': 5,
    'Usta': 6,
    'İşçi': 7
  };

  const getPositionLevel = (position?: string) => {
    if (!position) return 99;
    return positionHierarchy[position] || 8; // Unknown positions go to level 8
  };

  const groupedWorkers = useMemo(() => {
    const groups: Record<string, Worker[]> = {};
    filteredWorkers.forEach(w => {
      const pos = w.position || 'Belirtilmemiş';
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(w);
    });

    // Sort groups by hierarchy
    return Object.entries(groups).sort((a, b) => {
      return getPositionLevel(a[0]) - getPositionLevel(b[0]);
    });
  }, [filteredWorkers]);

  const toggleBulkSelect = (id: string) => {
    const next = new Set(selectedForBulk);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedForBulk(next);
  };

  const handleBulkWhatsApp = async () => {
    const selected = workers.filter(w => selectedForBulk.has(w.id));
    if (selected.length > 0) {
      toast({ title: "WhatsApp Mesajı", description: `${selected.length} işçi için WhatsApp Web başlatılıyor...` });
      const msg = `Değerli çalışanımız, bu ayki maaş bordronuz ve hesap ekstreniz sisteme yüklenmiştir.`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      try {
        await open(waUrl);
      } catch (e) {
        window.open(waUrl, '_blank');
      }
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="İşçi ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button onClick={onAddWorker}>İşçi Ekle</Button>
      </div>
      
      {selectedForBulk.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 text-blue-800 p-2 rounded-lg border border-blue-200">
          <span className="text-sm font-semibold">{selectedForBulk.size} işçi seçildi</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white" onClick={handleBulkWhatsApp}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Toplu Mesaj
            </Button>
            <Button variant="outline" size="sm" className="bg-white text-blue-600 hover:text-blue-700" onClick={() => {
              const selectedEmails = workers.filter(w => selectedForBulk.has(w.id) && w.email).map(w => w.email).join(',');
              if (selectedEmails) {
                window.location.href = `mailto:?bcc=${selectedEmails}&subject=Bilgilendirme`;
              } else {
                toast({ title: "Hata", description: "Seçili işçilerin e-posta adresi bulunamadı.", variant: "destructive" });
              }
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Toplu Mail
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          </div>
        ) : groupedWorkers.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-sm text-muted-foreground">İşçi bulunamadı</p>
          </div>
        ) : (
          groupedWorkers.map(([position, positionWorkers]) => (
            <div key={position} className="mb-4">
              <h3 className="sticky top-0 bg-white/95 backdrop-blur z-10 py-1.5 font-bold text-sm text-zinc-500 border-b mb-2 flex items-center justify-between">
                {position}
                <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full text-xs font-semibold">{positionWorkers.length} Kişi</span>
              </h3>
              <div className="space-y-2">
                {positionWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={selectedForBulk.has(worker.id)} 
                      onChange={() => toggleBulkSelect(worker.id)}
                      className="ml-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Card
                      className={`flex-1 cursor-pointer p-3 transition-colors hover:bg-muted/50 ${
                        selectedWorkerId === worker.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => onSelectWorker(worker.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {worker.image_path ? (
                            <img
                              src={worker.image_path.startsWith('data:') ? worker.image_path : `file://${worker.image_path}`}
                              alt={worker.full_name}
                              className="h-10 w-10 rounded-full object-cover shadow-sm border"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium border">
                              {worker.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">{worker.full_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {worker.tc_no || 'TC Kimlik No Yok'}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(worker.exit_date)}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
