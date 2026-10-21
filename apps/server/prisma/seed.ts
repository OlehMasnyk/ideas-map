import { PrismaClient } from '@prisma/client';
import { CATEGORIES } from '@ideas-map/shared';

const prisma = new PrismaClient();

try {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon },
      create: c,
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);
} finally {
  await prisma.$disconnect();
}
