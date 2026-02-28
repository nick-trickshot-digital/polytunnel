import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { beds } from './schema';
import 'dotenv/config';

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const bedData = [
    // Left column (L1-L6)
    { id: 'L1', column: 'left', position: 1, widthMm: 700, lengthMm: 2300 },
    { id: 'L2', column: 'left', position: 2, widthMm: 700, lengthMm: 2300 },
    { id: 'L3', column: 'left', position: 3, widthMm: 700, lengthMm: 2300 },
    { id: 'L4', column: 'left', position: 4, widthMm: 700, lengthMm: 2300 },
    { id: 'L5', column: 'left', position: 5, widthMm: 700, lengthMm: 2300 },
    { id: 'L6', column: 'left', position: 6, widthMm: 700, lengthMm: 2300 },
    // Middle column (M1-M5)
    { id: 'M1', column: 'middle', position: 1, widthMm: 1380, lengthMm: 2300 },
    { id: 'M2', column: 'middle', position: 2, widthMm: 1380, lengthMm: 2300 },
    { id: 'M3', column: 'middle', position: 3, widthMm: 1380, lengthMm: 2300 },
    { id: 'M4', column: 'middle', position: 4, widthMm: 1380, lengthMm: 2300 },
    { id: 'M5', column: 'middle', position: 5, widthMm: 1380, lengthMm: 2300 },
    // Right column (R1-R6)
    { id: 'R1', column: 'right', position: 1, widthMm: 700, lengthMm: 2300 },
    { id: 'R2', column: 'right', position: 2, widthMm: 700, lengthMm: 2300 },
    { id: 'R3', column: 'right', position: 3, widthMm: 700, lengthMm: 2300 },
    { id: 'R4', column: 'right', position: 4, widthMm: 700, lengthMm: 2300 },
    { id: 'R5', column: 'right', position: 5, widthMm: 700, lengthMm: 2300 },
    { id: 'R6', column: 'right', position: 6, widthMm: 700, lengthMm: 2300 },
  ];

  console.log('Seeding beds...');
  for (const bed of bedData) {
    await db.insert(beds).values(bed).onConflictDoNothing();
  }
  console.log('Seeded 17 beds successfully!');
}

seed().catch(console.error);
