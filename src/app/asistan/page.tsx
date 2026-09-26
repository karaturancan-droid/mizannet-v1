'use client';

import { ChatWindow } from '@/components/asistan/chat-window';
import { ChatSidebar } from '@/components/asistan/chat-sidebar';
import { useAsistan } from '@/hooks/use-asistan';

export default function AsistanPage() {
  const { 
    messages, 
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    isLoading, 
    error, 
    sendMessage, 
    analyzeFile, 
    importAnalyzedData,
    deleteSession
  } = useAsistan();

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <ChatSidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={() => createSession()}
        onDeleteSession={deleteSession}
      />
      <div className="flex-1 min-w-0 relative">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          onAnalyzeFile={analyzeFile}
          onImportData={importAnalyzedData}
          error={error}
        />
      </div>
    </div>
  );
}
