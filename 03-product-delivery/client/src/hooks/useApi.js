import { useCallback } from 'react';

export function useApi() {
  const request = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('ff_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem('ff_token');
      localStorage.removeItem('ff_user');
      window.location.href = '/login';
      throw new Error('Sessão expirada');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Erro ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json().then(json => json.data !== undefined ? json.data : json);
  }, []);

  const get = useCallback((url) => request(url), [request]);
  const post = useCallback(
    (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
    [request]
  );
  const put = useCallback(
    (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
    [request]
  );
  const patch = useCallback(
    (url, data) => request(url, { method: 'PATCH', body: JSON.stringify(data) }),
    [request]
  );
  const del = useCallback(
    (url) => request(url, { method: 'DELETE' }),
    [request]
  );

  return { get, post, put, patch, del, request };
}

export default useApi;

