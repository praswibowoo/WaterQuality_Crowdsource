import { Prisma } from '@prisma/client';
import prisma from '../db/prisma.js';

// Location deduplication radius in meters
export const LOCATION_DEDUP_RADIUS_METERS = 10;

export interface FindOrCreateLocationResult {
  location: { id: string; latitude: number; longitude: number; address: string | null; createdAt: Date };
  created: boolean;
}

/**
 * Find or create a location within a proximity radius using PostGIS ST_DWithin.
 * Wrapped in a database transaction to prevent race conditions (WQ-158, WQ-205).
 *
 * @returns { location, created } — `created` is true if a new Location was inserted
 */
export async function findOrCreateLocation(
  lat: number,
  lng: number,
  address?: string
): Promise<FindOrCreateLocationResult> {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Try to find an existing location within the radius using PostGIS
    const existing = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Location"
      WHERE ST_DWithin(
        geog,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${LOCATION_DEDUP_RADIUS_METERS}
      )
      LIMIT 1
      FOR UPDATE
    `;

    if (existing.length > 0) {
      const found = await tx.location.findUnique({ where: { id: existing[0].id } });
      if (found) return { location: found, created: false };
    }

    // Create a new location within the same transaction — prevents race conditions
    const location = await tx.location.create({
      data: { latitude: lat, longitude: lng, address },
    });

    // Set geography column for PostGIS
    try {
      await tx.$executeRaw`
        UPDATE "Location"
        SET geog = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        WHERE id = ${location.id} AND geog IS NULL
      `;
    } catch (e) {
      console.warn('Failed to set geography for new location:', e);
    }

    return { location, created: true };
  });
}
