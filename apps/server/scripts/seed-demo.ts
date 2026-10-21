/**
 * Fills the database with fake demand around Berlin so the map has something to show.
 * Re-running replaces the previous demo data. Usage: npm run db:seed:demo [-- --count 2000]
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  CATEGORIES,
  MAX_REQUESTS_PER_USER_PER_CATEGORY,
  RADIUS_MAX_METERS,
  RADIUS_MIN_METERS,
} from '@ideas-map/shared';

const prisma = new PrismaClient();

const DEMO_EMAIL_DOMAIN = 'demo.demand-map.local';
const DEMO_PASSWORD = 'demo-password';
const USER_COUNT = 400;

const countArg = process.argv.indexOf('--count');
const REQUEST_COUNT = countArg > -1 ? Number(process.argv[countArg + 1]) : 1500;

interface Hotspot {
  name: string;
  lat: number;
  lng: number;
  spreadMeters: number;
  weight: number;
  categories: Partial<Record<string, number>>;
}

const HOTSPOTS: Hotspot[] = [
  { name: 'Prenzlauer Berg', lat: 52.5388, lng: 13.4244, spreadMeters: 900, weight: 3, categories: { cafe: 3, bakery: 2, kids: 3 } },
  { name: 'Kreuzberg', lat: 52.4986, lng: 13.4033, spreadMeters: 1000, weight: 3, categories: { cafe: 2, restaurant: 3, gym: 1 } },
  { name: 'Friedrichshain', lat: 52.5145, lng: 13.4543, spreadMeters: 900, weight: 2, categories: { gym: 3, cafe: 2, restaurant: 2 } },
  { name: 'Neukölln', lat: 52.4811, lng: 13.4354, spreadMeters: 1100, weight: 2, categories: { grocery: 3, pharmacy: 2, cafe: 1 } },
  { name: 'Mitte', lat: 52.5208, lng: 13.4094, spreadMeters: 800, weight: 2, categories: { restaurant: 2, pharmacy: 1, grocery: 1 } },
  { name: 'Charlottenburg', lat: 52.5058, lng: 13.3036, spreadMeters: 1200, weight: 1, categories: { bakery: 2, pharmacy: 2, other: 1 } },
  { name: 'Lichtenberg', lat: 52.5155, lng: 13.4995, spreadMeters: 1300, weight: 1, categories: { grocery: 3, kids: 2, gym: 1 } },
  { name: 'Wedding', lat: 52.5503, lng: 13.3593, spreadMeters: 1000, weight: 1, categories: { gym: 2, grocery: 2, other: 1 } },
];

// Deterministic PRNG so the demo looks the same every time.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function gaussian(): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickWeighted<T>(items: T[], weight: (item: T) => number): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = rand() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

const COMMENTS: Record<string, string[]> = {
  cafe: ['Somewhere with good coffee and wifi', 'A quiet cafe to work from', 'Specialty coffee please!'],
  restaurant: ['Affordable lunch place', 'Vegetarian restaurant', 'Family friendly dinner spot'],
  grocery: ['Supermarket open late', 'Organic grocery store', 'Anything closer than 15 minutes walk'],
  pharmacy: ['The nearest pharmacy is too far', 'Pharmacy open on weekends'],
  gym: ['24h gym', 'Climbing or bouldering gym', 'Small gym with classes'],
  bakery: ['Fresh bread in the morning', 'A real bakery, not a chain'],
  kids: ['Indoor playground', 'Kids music school', 'Toy store'],
  other: ['Bike repair shop', 'Co-working space', 'Hardware store'],
};

try {
  const categories = await prisma.category.findMany();
  if (categories.length === 0) throw new Error('No categories found. Run `npm run db:seed` first.');
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const allSlugs = CATEGORIES.map((c) => c.slug).filter((s) => categoryIdBySlug.has(s));

  const removed = await prisma.user.deleteMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
  });
  if (removed.count) console.log(`Removed ${removed.count} previous demo users`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = Array.from({ length: USER_COUNT }, (_, i) => ({
    id: crypto.randomUUID(),
    email: `demo${i + 1}@${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
  }));
  await prisma.user.createMany({ data: users });

  const perUserCategory = new Map<string, number>();
  const rows: { userId: string; categoryId: number; lat: number; lng: number; radius: number; comment: string | null }[] = [];

  let attempts = 0;
  while (rows.length < REQUEST_COUNT && attempts < REQUEST_COUNT * 5) {
    attempts++;
    const spot = pickWeighted(HOTSPOTS, (h) => h.weight);
    const slug =
      rand() < 0.8
        ? pickWeighted(Object.keys(spot.categories), (s) => spot.categories[s] ?? 0)
        : allSlugs[Math.floor(rand() * allSlugs.length)]!;
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) continue;

    const user = users[Math.floor(rand() * users.length)]!;
    const key = `${user.id}:${slug}`;
    const used = perUserCategory.get(key) ?? 0;
    if (used >= MAX_REQUESTS_PER_USER_PER_CATEGORY) continue;
    perUserCategory.set(key, used + 1);

    const dNorth = gaussian() * spot.spreadMeters;
    const dEast = gaussian() * spot.spreadMeters;
    const lat = spot.lat + dNorth / 111_320;
    const lng = spot.lng + dEast / (111_320 * Math.cos((spot.lat * Math.PI) / 180));
    const radius = Math.min(
      RADIUS_MAX_METERS,
      Math.max(RADIUS_MIN_METERS, Math.round((300 + Math.abs(gaussian()) * 500) / 50) * 50),
    );
    const options = COMMENTS[slug] ?? [];
    const comment = rand() < 0.4 && options.length ? options[Math.floor(rand() * options.length)]! : null;
    rows.push({ userId: user.id, categoryId, lat, lng, radius, comment });
  }

  await prisma.$executeRaw`
    INSERT INTO demand_requests (id, user_id, category_id, location, radius_meters, comment)
    SELECT gen_random_uuid(), u, c, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, r, m
    FROM unnest(
      ${rows.map((r) => r.userId)}::uuid[],
      ${rows.map((r) => r.categoryId)}::int[],
      ${rows.map((r) => r.lat)}::float8[],
      ${rows.map((r) => r.lng)}::float8[],
      ${rows.map((r) => r.radius)}::int[],
      ${rows.map((r) => r.comment)}::text[]
    ) AS t(u, c, lat, lng, r, m)`;

  console.log(
    `Created ${users.length} demo users and ${rows.length} demand requests around Berlin.\n` +
      `Sign in as demo1@${DEMO_EMAIL_DOMAIN} / ${DEMO_PASSWORD} to see a user with requests.`,
  );
} finally {
  await prisma.$disconnect();
}
