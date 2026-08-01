import { PrismaClient, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BCRYPT_COST = 12;

// Load env from .env file (seed runs from prisma/ dir)
try {
  // Try multiple locations
  const possiblePaths = [
    resolve(__dirname, '../.env'),
    resolve(__dirname, '../../api/.env'),
  ];
  let envLoaded = false;
  for (const envPath of possiblePaths) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
      envLoaded = true;
      break;
    } catch {
      continue;
    }
  }
  if (!envLoaded) {
    console.warn('Could not load .env — ADMIN_PASSWORD must be set in environment');
  }
} catch {
  console.warn('Could not load .env — ADMIN_PASSWORD must be set in environment');
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample locations near Mangrove Wonorejo, Surabaya
  const locations = [
    { latitude: -7.3059612, longitude: 112.8443053, address: 'Mangrove Wonorejo, Surabaya, Indonesia' },
    { latitude: -7.3085000, longitude: 112.8468000, address: 'Wonorejo Mangrove Entrance, Surabaya' },
    { latitude: -7.3025000, longitude: 112.8420000, address: 'Wonorejo Pier Area, Surabaya' },
  ];

  for (const loc of locations) {
    const location = await prisma.location.create({
      data: loc,
    });
    // Set PostGIS geography column
    await prisma.$executeRaw`
      UPDATE "Location"
      SET geog = ST_SetSRID(ST_MakePoint(${loc.longitude}, ${loc.latitude}), 4326)::geography
      WHERE id = ${location.id}
    `;
  }

  console.log('Created sample locations');

  // Create sample water quality data with Laquatwin measurements
  // Realistic values for brackish mangrove/estuary water at Wonorejo
  const samples = [
    {
      authorName: 'Ahmad Wijaya',
      latitude: -7.3059612,
      longitude: 112.8443053,
      ph: 7.2,
      temperature: 26.5,
      conductivity: 8500,
      salinity: 15.5,
      nitrate: 2.5,
      calcium: 120,
      potassium: 65,
      sodium: 4500,
      waterBodyType: 'estuary',
      landUse: 'mangrove_forest',
      notes: 'Clear water near mangrove roots, incoming tide',
      status: 'pending',
    },
    {
      authorName: 'Siti Nurhaliza',
      latitude: -7.3085000,
      longitude: 112.8468000,
      ph: 6.8,
      temperature: 27.0,
      conductivity: 12300,
      salinity: 22.0,
      nitrate: 3.8,
      calcium: 180,
      potassium: 90,
      sodium: 6800,
      waterBodyType: 'estuary',
      landUse: 'mangrove_forest',
      notes: 'Near pier area, some boat activity',
      status: 'approved',
    },
    {
      authorName: 'Budi Santoso',
      latitude: -7.3025000,
      longitude: 112.8420000,
      ph: 7.5,
      temperature: 25.0,
      conductivity: 5200,
      salinity: 8.5,
      nitrate: 1.2,
      calcium: 80,
      potassium: 40,
      sodium: 2800,
      waterBodyType: 'flowing',
      landUse: 'coastal_beach',
      notes: 'Deeper water channel, high oxygen from tidal flow',
      status: 'approved',
    },
    {
      authorName: 'Diana Kusuma',
      latitude: -7.3059612,
      longitude: 112.8443053,
      ph: 7.0,
      temperature: 28.2,
      conductivity: 15200,
      salinity: 28.0,
      nitrate: 5.1,
      calcium: 240,
      potassium: 120,
      sodium: 9200,
      waterBodyType: 'estuary',
      landUse: 'mangrove_forest',
      notes: 'Low tide, water stagnant near sediments',
      status: 'pending',
    },
  ];

  for (const sample of samples) {
    // Find or create location
    const location = await prisma.location.findFirst({
      where: { latitude: sample.latitude, longitude: sample.longitude },
    });

    if (location) {
      await prisma.sample.create({
        data: {
          authorName: sample.authorName,
          ph: sample.ph,
          temperature: sample.temperature,
          conductivity: sample.conductivity,
          salinity: sample.salinity,
          nitrate: sample.nitrate,
          calcium: sample.calcium,
          potassium: sample.potassium,
          sodium: sample.sodium,
          waterBodyType: sample.waterBodyType,
          landUse: sample.landUse,
          notes: sample.notes,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: sample.status as any,
          locationId: location.id,
        },
      });
    }
  }

  console.log('Created sample water quality data');

  // Create admin user — password from env var, never hardcoded
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is required for seeding');
  }
  if (adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }
  const hashedAdminPassword = await bcrypt.hash(adminPassword, BCRYPT_COST);

  await prisma.userAccount.upsert({
    where: { username: 'admin' },
    update: { password: hashedAdminPassword, name: 'Admin' },
    create: {
      username: 'admin',
      password: hashedAdminPassword,
      name: 'Admin',
      role: 'admin',
    },
  });
  console.log('Created admin user');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });