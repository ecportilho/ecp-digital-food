import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import styles from './CategoryChips.module.css';

export default function CategoryChips({ onSelect, selected = null }) {
  const [categories, setCategories] = useState([]);
  const api = useApi();

  useEffect(() => {
    api.get('/api/categories')
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  const allCategories = [{ id: null, name: 'Todos', emoji: '' }, ...categories];

  return (
    <div className={styles.chipsRow}>
      {allCategories.map((cat) => (
        <button
          key={cat.id || 'all'}
          className={`${styles.chip} ${selected === cat.id ? styles.active : ''}`}
          onClick={() => onSelect?.(cat.id)}
        >
          {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
        </button>
      ))}
    </div>
  );
}
