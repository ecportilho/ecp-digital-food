import { useState, useCallback, useRef, useEffect } from 'react';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const getToken = () => localStorage.getItem('ff_token');

  const sendMessage = useCallback(async (message) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId ?? '',
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      abortRef.current = new AbortController();
      const token = getToken();

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId: conversationId ?? undefined,
          message,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 401) {
        localStorage.removeItem('ff_token');
        localStorage.removeItem('ff_user');
        window.location.href = '/login';
        throw new Error('Sessao expirada');
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Erro ao enviar mensagem');
      }

      const data = await res.json();

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...withoutTemp,
          { ...tempUserMsg, id: `user-${Date.now()}`, conversationId: data.conversationId },
          data.message,
        ];
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Erro ao enviar mensagem');
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [conversationId, isLoading]);

  const loadConversation = useCallback(async (convId) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/chat/conversations/${convId}/messages?limit=50`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Erro ao carregar conversa');
      const data = await res.json();
      setMessages(data.messages || []);
      setConversationId(convId);
    } catch (err) {
      setError(err.message || 'Erro ao carregar conversa');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    loadConversation,
    startNewConversation,
  };
}

export default useChat;
