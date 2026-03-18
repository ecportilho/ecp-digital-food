import { useEffect, useRef, useState, useCallback } from 'react';

export function useSSE(url, { enabled = true, onMessage, onError } = {}) {
  const [status, setStatus] = useState('disconnected');
  const [lastEvent, setLastEvent] = useState(null);
  const esRef = useRef(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    const token = localStorage.getItem('ff_token');
    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = token ? `${url}${separator}token=${token}` : url;

    const es = new EventSource(fullUrl);
    esRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      retriesRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onMessage?.(data);
      } catch {
        setLastEvent(event.data);
        onMessage?.(event.data);
      }
    };

    es.addEventListener('payment_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onMessage?.(data);
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      es.close();
      setStatus('reconnecting');
      onError?.();

      if (retriesRef.current < maxRetries) {
        retriesRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 10000);
        setTimeout(connect, delay);
      } else {
        setStatus('failed');
      }
    };
  }, [url, enabled, onMessage, onError]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  const close = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setStatus('disconnected');
  }, []);

  return { status, lastEvent, close };
}

export default useSSE;
