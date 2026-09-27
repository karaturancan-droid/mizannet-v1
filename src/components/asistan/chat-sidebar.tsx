'use client';

import { Button } from '@/components/ui/button';
import { ChatSession } from '@/hooks/use-asistan';
import { Plus, Library, MessageCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenLibrary: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onOpenLibrary,
}: ChatSidebarProps) {
  return (
    <div className="w-64 h-full bg-[#F9F9F9] border-r border-border flex flex-col shrink-0">
      <div className="p-3">
        <Button
          onClick={onCreateSession}
          variant="outline"
          className="w-full justify-start text-left bg-white border-border hover:bg-gray-50 h-10 px-3 shadow-sm rounded-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="font-medium text-sm">Yeni sohbet</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-1 mt-2">
          <Button
            variant="ghost"
            onClick={onOpenLibrary}
            className="w-full justify-start text-left h-9 px-3 hover:bg-gray-200/50 rounded-lg text-gray-700"
          >
            <Library className="mr-3 h-4 w-4" />
            <span className="text-sm">Kitaplık</span>
          </Button>
        </div>

        {sessions.length > 0 && (
          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
              Yakın zamandakiler
            </h3>
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <div key={session.id} className="relative group flex items-center">
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors flex items-center gap-2',
                      activeSessionId === session.id
                        ? 'bg-gray-200 text-gray-900 font-medium pr-8'
                        : 'text-gray-700 hover:bg-gray-200/50 pr-8'
                    )}
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{session.title}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Bu sohbeti silmek istediğinize emin misiniz?')) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className={cn(
                      'absolute right-2 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-white/80 transition-opacity',
                      activeSessionId === session.id
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    )}
                    title="Sohbeti Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
