import { useState, useCallback, useEffect } from 'react';
import { callBackend } from '@/lib/tauri';
import { listen } from '@tauri-apps/api/event';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggested_action?: {
    type: string;
    description: string;
    payload: Record<string, unknown>;
  };
  media_path?: string;
}

export interface ChatHistory {
  messages: Message[];
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface FileAnalysis {
  entity_type: string;
  items: Record<string, unknown>[];
  summary: string;
}

export interface ImportResult {
  imported: number;
  entity_type: string;
}

/** Ajan aracının canlı çalışma adımı (terminal, dosya, excel, word, gorsel, veritabanı) */
export interface AgentStep {
  id: string;
  tool: string;
  detail: string;
  status: 'running' | 'done' | 'error';
  timestamp: string;
}

export interface AgentEventPayload {
  session_id: string;
  tool: string;
  detail: string;
  status: 'running' | 'done' | 'error';
}

export const useAsistan = (initialSessionId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);

  // Load chat history on mount or when activeSessionId changes
  useEffect(() => {
    const loadHistory = async () => {
      if (!activeSessionId) {
        setMessages([]);
        return;
      }
      try {
        const result = await callBackend<ChatHistory>('asistan_get_history', { session_id: activeSessionId });
        if (result && result.messages) {
          setMessages(result.messages);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Sohbet geçmişi yüklenemedi';
        setError(errorMsg);
      }
    };

    loadHistory();
  }, [activeSessionId]);

  // Listen for real-time background AI responses
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<Message>('ai_response', (event) => {
        // Sadece aktif oturuma ait mesajları ekle
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.payload.id)) return prev;
          return [...prev, event.payload];
        });
        setIsLoading(false);
      });
      return unlisten;
    };

    let unlistenFn: (() => void) | undefined;
    setupListener().then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Listen for live agent tool steps (terminal, dosya işlemleri, excel, word...)
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<AgentEventPayload>('agent_event', (event) => {
        const payload = event.payload;
        // Aktif oturum farklıysa yine de göster (arka planda başka oturum da çalışıyor olabilir)
        setAgentSteps((prev) => {
          // Aynı aracın önceki 'running' adımını 'done/error' ile güncelle
          const existingIdx = prev.findIndex(
            (s) => s.tool === payload.tool && s.detail === payload.detail && s.status === 'running'
          );
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = { ...next[existingIdx], status: payload.status };
            return next;
          }
          const step: AgentStep = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tool: payload.tool,
            detail: payload.detail,
            status: payload.status,
            timestamp: new Date().toISOString(),
          };
          // En fazla 20 adım tut
          return [...prev.slice(-19), step];
        });
      });
      return unlisten;
    };

    let unlistenFn: (() => void) | undefined;
    setupListener().then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Load chat sessions
  const loadSessions = useCallback(async () => {
    try {
      const result = await callBackend<ChatSession[]>('get_chat_sessions');
      setSessions(result || []);
      if (result && result.length > 0 && !activeSessionId) {
        setActiveSessionId(result[0].id);
      }
    } catch (err) {
      console.error('Sohbet oturumları yüklenemedi:', err);
    }
  }, [activeSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createSession = useCallback(async (title: string = "Yeni Sohbet") => {
    try {
      const result = await callBackend<ChatSession>('create_chat_session', { title });
      setSessions((prev) => [result, ...prev]);
      setActiveSessionId(result.id);
      return result;
    } catch (err) {
      console.error('Yeni sohbet oluşturulamadı:', err);
      return null;
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string, image_base64?: string) => {
      if (!message.trim() && !image_base64) return;

      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const newSession = await createSession(message.substring(0, 30) + (message.length > 30 ? "..." : ""));
        if (!newSession) return;
        currentSessionId = newSession.id;
      }

      setIsLoading(true);
      setError(null);

      // Optimistic update for the user message
      const tempUserId = Math.random().toString();

      try {
        setMessages((prev) => [
          ...prev,
          {
            id: tempUserId,
            role: 'user',
            content: message || "Görsel gönderildi",
            timestamp: new Date().toISOString(),
            media_path: image_base64 ? `data:image/jpeg;base64,${image_base64}` : undefined,
          },
        ]);

        const result = await callBackend<Message>('asistan_mesaj_gonder', {
          session_id: currentSessionId,
          mesaj: message || "Görsel gönderildi",
          image_base64: image_base64 || null,
        });
        // We no longer append the assistant result here because the backend returns 
        // the user's message acknowledgement. The actual AI response will arrive via 'ai_response' event.
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Mesaj gönderilemedi';
        setError(errorMsg);
        setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
        setIsLoading(false);
      }
      // Note: We do NOT set isLoading(false) in finally block anymore because we are waiting for the 'ai_response' event.
    },
    [activeSessionId, createSession]
  );

  const deleteSession = useCallback(async (id: string) => {
    try {
      await callBackend('delete_chat_session', { id });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      // Reload sessions to be absolutely sure we're in sync with the database
      const result = await callBackend<ChatSession[]>('get_chat_sessions');
      setSessions(result || []);
    } catch (err) {
      console.error('Sohbet silinemedi:', err);
      const errorMsg = err instanceof Error ? err.message : 'Sohbet silinemedi';
      setError(errorMsg);
    }
  }, [activeSessionId]);

  // Sohbet geçmişini temizle
  const clearHistory = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await callBackend('asistan_clear_history', { session_id: activeSessionId });
      setMessages([]);
      setAgentSteps([]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sohbet temizlenemedi';
      setError(errorMsg);
    }
  }, [activeSessionId]);

  // Dosyayı AI ile çözümle
  const analyzeFile = useCallback(
    async (fileData: string, fileName: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await callBackend<FileAnalysis>('analyze_file', {
          file_data: fileData,
          file_name: fileName,
        });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Dosya çözümlenemedi';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Onaylanan veriyi veritabanına aktar
  const importAnalyzedData = useCallback(
    async (entityType: string, items: Record<string, unknown>[]) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await callBackend<ImportResult>('import_analyzed_data', {
          entity_type: entityType,
          items,
        });
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Veri aktarılamadı';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    messages,
    sessions,
    activeSessionId,
    setActiveSessionId,
    isLoading,
    error,
    agentSteps,
    sendMessage,
    clearHistory,
    createSession,
    deleteSession,
    analyzeFile,
    importAnalyzedData,
  };
};

// ==================== KİTAPLIK HOOK ====================

export interface LibraryDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  content_text?: string;
  size_bytes: number;
  created_at: string;
}

export const useLibrary = () => {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBackend<LibraryDocument[]>('library_list_documents');
      setDocuments(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kitaplık yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const result = await callBackend<LibraryDocument>('library_upload_document', {
        file_name: file.name,
        file_data: base64,
        file_type: file.type || 'application/octet-stream',
      });
      setDocuments((prev) => [result, ...prev]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya yüklenemedi');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    setError(null);
    try {
      await callBackend('library_delete_document', { id });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge silinemedi');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return { documents, loading, error, uploadDocument, deleteDocument, loadDocuments };
};
