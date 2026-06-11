/**
 * Recalculate all sample quality scores
 * 
 * Run with: npx ts-node api/src/scripts/recalculateQualityScores.ts
 * 
 * This script recalculates quality scores for all samples in the database.
 * Useful after fixing scoring bugs (e.g., C1 spatial outlier SQL fix).
 */

import { PrismaClient } from '@prisma/client';
import { calculateQualityScore } from '../services/qualityScoring';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting quality score recalculation...\n');

  // Fetch all sample IDs
  const samples = await prisma.sample.findMany({
    select: { id: true, authorName: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${samples.length} samples to process\n`);

  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const progress = `[${i + 1}/${samples.length}]`;

    try {
      const result = await calculateQualityScore(sample.id);

      await prisma.sample.update({
        where: { id: sample.id },
        data: { qualityScore: result.qualityScore },
      });

      const spatial = result.breakdown.spatialOutlier.score;
      const temporal = result.breakdown.temporalConsistency.score;
      const gps = result.breakdown.gpsAccuracy.score;
      const range = result.breakdown.rangeValidity.score;
      const meta = result.breakdown.metadataCompleteness.score;
      const photo = result.breakdown.photoPresence.score;

      console.log(
        `${progress} ✅ ${sample.authorName || 'Unknown'} | ` +
        `Score: ${result.qualityScore.toFixed(3)} | ` +
        `Spatial: ${spatial.toFixed(2)} | Temporal: ${temporal.toFixed(2)} | ` +
        `GPS: ${gps.toFixed(2)} | Range: ${range.toFixed(2)} | ` +
        `Meta: ${meta.toFixed(2)} | Photo: ${photo.toFixed(2)}`
      );

      successCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${progress} ❌ ${sample.authorName || 'Unknown'} | Error: ${msg}`);
      errorCount++;
    }

    // Small delay to avoid overwhelming the database
    if (i % 10 === 9) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Recalculation complete!');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors:  ${errorCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log('='.repeat(60));

  // Show summary of score distribution
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      AVG("qualityScore") as avg_score,
      MIN("qualityScore") as min_score,
      MAX("qualityScore") as max_score,
      COUNT(CASE WHEN "qualityScore" >= 0.8 THEN 1 END) as high_count,
      COUNT(CASE WHEN "qualityScore" >= 0.5 AND "qualityScore" < 0.8 THEN 1 END) as moderate_count,
      COUNT(CASE WHEN "qualityScore" < 0.5 THEN 1 END) as low_count
    FROM "Sample"
    WHERE "qualityScore" IS NOT NULL
  ` as { total: bigint; avg_score: number; min_score: number; max_score: number; high_count: bigint; moderate_count: bigint; low_count: bigint }[];

  if (stats.length > 0) {
    const s = stats[0];
    console.log('\nScore Distribution:');
    console.log(`  Total scored: ${s.total}`);
    console.log(`  Average:      ${Number(s.avg_score).toFixed(3)}`);
    console.log(`  Min:          ${Number(s.min_score).toFixed(3)}`);
    console.log(`  Max:          ${Number(s.max_score).toFixed(3)}`);
    console.log(`  High (≥0.8):  ${s.high_count}`);
    console.log(`  Moderate:     ${s.moderate_count}`);
    console.log(`  Low (<0.5):   ${s.low_count}`);
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
