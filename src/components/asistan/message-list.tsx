'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/hooks/use-asistan';
import { formatDateTR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Sparkles, User } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onActionClick?: (action: Message['suggested_action']) => void;
}

export function MessageList({ messages, isLoading, onActionClick }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Henüz bir sohbet başlatılmadı. Bir mesaj göndererek başlayın.</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto w-full space-y-6 pb-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex w-full group',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'flex gap-4 max-w-[85%]',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* İkon */}
                <div className={cn(
                  "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border",
                  message.role === 'user' ? "bg-white text-gray-500 border-gray-200" : "bg-white text-blue-600 border-blue-100 shadow-sm"
                )}>
                  {message.role === 'user' ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>

                {/* Mesaj İçeriği */}
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl whitespace-pre-wrap',
                    message.role === 'user'
                      ? 'bg-[#f4f4f4] text-gray-900 rounded-tr-sm'
                      : message.content.includes('Yapay zeka yanıtı alınamadı')
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-transparent text-gray-900 px-0'
                  )}
                >
                  {message.media_path && (
                    <div className="mb-2">
                      <img 
                        src={message.media_path.startsWith('data:') ? message.media_path : convertFileSrc(message.media_path)} 
                        alt="Ek" 
                        className="max-w-[250px] max-h-[250px] rounded-lg object-contain shadow-sm border border-gray-100" 
                      />
                    </div>
                  )}
                  <div className="text-base leading-relaxed text-[15px]">{message.content}</div>
                  
                  {message.suggested_action && (
                    <div className="mt-3 pt-3 border-t border-gray-100/50 flex flex-col gap-2">
                      <div className="text-sm font-medium text-gray-700">Önerilen İşlem:</div>
                      <div className="text-sm text-gray-600 bg-white/50 p-2 rounded-md">
                        {message.suggested_action.description}
                      </div>
                      <button
                        onClick={() => onActionClick?.(message.suggested_action!)}
                        className="mt-1 flex items-center justify-center gap-1.5 w-full md:w-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors border border-blue-200"
                      >
                        <Sparkles className="h-4 w-4" />
                        İşlemi Onayla
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex w-full group justify-start">
              <div className="flex gap-4 max-w-[85%] flex-row">
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border bg-white text-blue-600 border-blue-100 shadow-sm">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="py-3 text-gray-500 text-[15px] flex items-center gap-1.5">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
