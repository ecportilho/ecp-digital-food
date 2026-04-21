import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
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

export function useAddress() {
  const api = useApi();
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
      const list = await api.get('/api/consumer/addresses');
      setAddresses(Array.isArray(list) ? list : []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0] || null;
  const addressText = formatAddress(defaultAddress);

  return { addresses, defaultAddress, addressText, loading, reload };
}

export default useAddress;
