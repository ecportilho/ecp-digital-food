import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function formatAddress(address) {
  if (!address) return '';
  const parts = [
    `${address.street}, ${address.number}`,
    address.complement || null,
    address.neighborhood,
    `${address.city || 'São Paulo'}/${address.state || 'SP'}`,
  ].filter(Boolean);
  return parts.join(' — ');
}

export function formatAddressShort(address) {
  if (!address) return '';
  return `${address.street}, ${address.number}`;
}

// Intentionally avoid `useApi()` here: the hook returns a new object identity on every
// render, which made the useEffect's dependency array fire on every render and produced
// an infinite fetch loop (hundreds of /api/consumer/addresses per second).
async function fetchAddressesOnce() {
  const token = localStorage.getItem('ff_token');
  const res = await fetch('/api/consumer/addresses', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  const list = json?.data !== undefined ? json.data : json;
  return Array.isArray(list) ? list : [];
}

export function useAddress() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setAddresses(await fetchAddressesOnce());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setAddresses([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const list = await fetchAddressesOnce();
      if (!cancelled) {
        setAddresses(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0] || null;
  const addressText = formatAddress(defaultAddress);

  return { addresses, defaultAddress, addressText, loading, reload };
}

export default useAddress;
