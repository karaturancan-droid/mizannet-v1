'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

type DeleteStep = 'confirm' | 'verify';

export function DeleteDialog({
  open,
  onOpenChange,
  itemTitle,
  onConfirm,
  isLoading = false,
}: DeleteDialogProps) {
  const [step, setStep] = React.useState<DeleteStep>('confirm');
  const [verificationText, setVerificationText] = React.useState('');

  const handleFirstConfirm = () => {
    setStep('verify');
    setVerificationText('');
  };

  const handleSecondConfirm = async () => {
    if (verificationText === 'SİL') {
      await onConfirm();
      onOpenChange(false);
      setStep('confirm');
      setVerificationText('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('confirm');
    setVerificationText('');
  };

  if (step === 'confirm') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Öğeyi Kalıcı Olarak Sil</DialogTitle>
            <DialogDescription>
              Bu kaydı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleFirstConfirm} disabled={isLoading}>
              Devam Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Silmeyi Onayla</DialogTitle>
          <DialogDescription>
            Onaylamak için aşağıya "SİL" yazınız:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            
            value={verificationText}
            onChange={(e) => setVerificationText(e.target.value.toUpperCase())}
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            İptal
          </Button>
          <Button
            variant="destructive"
            onClick={handleSecondConfirm}
            disabled={isLoading || verificationText !== 'SİL'}
          >
            {isLoading ? 'Siliniyor...' : 'Kalıcı Olarak Sil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
