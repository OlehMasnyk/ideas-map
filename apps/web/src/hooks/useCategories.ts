import { useEffect, useState } from 'react';
import type { Category } from '@ideas-map/shared';
import { api } from '../api';

let cache: Promise<Category[]> | null = null;

function loadCategories(): Promise<Category[]> {
  cache ??= api.categories().catch((err: unknown) => {
    cache = null;
    throw err;
  });
  return cache;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadCategories()
      .then((c) => active && setCategories(c))
      .catch(() => active && setError('Could not load categories'));
    return () => {
      active = false;
    };
  }, []);

  return { categories, error };
}
