'use client';

import { useState } from 'react';
import { ChatWindow } from '@/components/asistan/chat-window';
import { ChatSidebar } from '@/components/asistan/chat-sidebar';
import { LibraryPanel } from '@/components/asistan/library-panel';
import { useAsistan } from '@/hooks/use-asistan';

export default function AsistanPage() {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const {
    messages,
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    isLoading,
    error,
    agentSteps,
    sendMessage,
    analyzeFile,
    importAnalyzedData,
    deleteSession,
  } = useAsistan();

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={() => createSession()}
        onDeleteSession={deleteSession}
        onOpenLibrary={() => setLibraryOpen(true)}
      />
      <div className="flex-1 min-w-0 relative">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          agentSteps={agentSteps}
          onSendMessage={sendMessage}
          onAnalyzeFile={analyzeFile}
          onImportData={importAnalyzedData}
          error={error}
        />
      </div>
      {libraryOpen && (
        <LibraryPanel onClose={() => setLibraryOpen(false)} />
      )}
    </div>
  );
}
