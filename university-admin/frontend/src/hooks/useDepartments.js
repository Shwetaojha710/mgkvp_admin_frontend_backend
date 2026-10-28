import { useEffect, useState } from 'react';
import { departments } from '../services/contentService';

export default function useDepartments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    departments
      .options()
      .then((res) => {
        if (mounted) setItems(res.data || []);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { departments: items, loading };
}
