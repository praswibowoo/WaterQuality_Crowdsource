import prisma from '../db/prisma.js';

export async function migrateLocationsToPostGIS(): Promise<number> {
  console.log('Migrating existing locations to PostGIS geography column...');

  const result = await prisma.$executeRaw`
    UPDATE "Location"
    SET geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
    WHERE geog IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
  `;

  console.log(`Migrated ${result} locations to PostGIS`);

  try {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_location_geog
      ON "Location"
      USING GIST (geog)
    `;
    console.log('Spatial index created');
  } catch (e) {
    console.warn('Spatial index may already exist:', e);
  }

  return result;
}

if (process.argv[1]?.endsWith('migratePostGIS.ts')) {
  migrateLocationsToPostGIS()
    .then((n) => {
      console.log(`Done. ${n} locations migrated.`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    });
}
