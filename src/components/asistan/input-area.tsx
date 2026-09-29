'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Plus, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';

interface InputAreaProps {
  onSendMessage: (message: string, imageBase64?: string) => void;
  isLoading: boolean;
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAnalyzing?: boolean;
}

export function InputArea({ onSendMessage, isLoading, onFileSelect, isAnalyzing }: InputAreaProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((message.trim() || imagePreview) && !isLoading) {
      onSendMessage(message, imagePreview?.base64);
      setMessage('');
      setImagePreview(null);
    }
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        setImagePreview({ url: URL.createObjectURL(file), base64 });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    } else {
      if (onFileSelect) onFileSelect(e);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      // Kaydı durdur ve metne çevir (Masaüstü Yerel)
      try {
        const transcript = await invoke<string>('stop_voice_recording');
        if (transcript) {
           setMessage((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      } catch (error) {
        console.error("Ses tanıma hatası:", error);
      }
      return;
    }

    // Masaüstü uygulamasından mikrofonu başlat (Offline/Native)
    try {
      await invoke('start_voice_recording');
      setIsRecording(true);
    } catch (error) {
      alert("Masaüstü mikrofon erişimi sağlanamadı. Lütfen mikrofon ayarlarınızı kontrol edin.");
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {imagePreview && (
        <div className="relative inline-block w-fit ml-4 mb-2">
          <img src={imagePreview.url} alt="Preview" className="h-20 rounded-lg object-cover border border-gray-200 shadow-sm" />
          <button 
            onClick={() => setImagePreview(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
      <div className="relative flex items-center bg-[#f4f4f4] dark:bg-zinc-800 rounded-3xl p-1 shadow-sm border border-transparent focus-within:border-gray-300 transition-colors w-full">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleLocalFileSelect}
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx"
        />
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 text-gray-500 hover:bg-gray-200 shrink-0 ml-1"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading || isAnalyzing}
        title="Dosya Ekle"
      >
        {isAnalyzing ? <div className="h-4 w-4 rounded-full border-2 border-t-blue-500 animate-spin" /> : <Plus className="h-5 w-5" />}
      </Button>

      <Input
        
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
        className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-base h-12"
      />

      <div className="flex items-center gap-1 shrink-0 mr-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleRecording}
          className={cn(
            "rounded-full h-10 w-10 transition-colors",
            isRecording ? "text-red-500 bg-red-50 hover:bg-red-100 animate-pulse" : "text-gray-500 hover:bg-gray-200"
          )} 
          title="Sesle yaz (Web Speech)"
        >
          <Mic className="h-5 w-5" />
        </Button>
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !imagePreview) || isLoading}
          size="icon"
          className={cn("rounded-full h-10 w-10 transition-all duration-200", (message.trim() || imagePreview) ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-200 text-gray-400")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
    </div>
  );
}
