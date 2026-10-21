export interface CategoryDefinition {
  slug: string;
  name: string;
  icon: string;
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  { slug: 'cafe', name: 'Cafe', icon: '☕' },
  { slug: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { slug: 'grocery', name: 'Grocery', icon: '🛒' },
  { slug: 'pharmacy', name: 'Pharmacy', icon: '💊' },
  { slug: 'gym', name: 'Gym', icon: '🏋️' },
  { slug: 'bakery', name: 'Bakery', icon: '🥐' },
  { slug: 'kids', name: 'Kids', icon: '🧸' },
  { slug: 'other', name: 'Other', icon: '📍' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
