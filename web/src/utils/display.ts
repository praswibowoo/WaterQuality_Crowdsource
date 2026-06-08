import { MEASUREMENT_FIELDS, MEASUREMENT_PRIORITY } from './measurements';

export type MeasurementPriorityKey = typeof MEASUREMENT_PRIORITY[number];

export interface KeyMeasurementData {
  key: MeasurementPriorityKey;
  value: number;
  unit: string;
  label: string;
}

type MeasurementFields = {
  ph?: number | null;
  conductivity?: number | null;
  salinity?: number | null;
  nitrate?: number | null;
  calcium?: number | null;
  potassium?: number | null;
  sodium?: number | null;
  temperature?: number | null;
};

/**
 * Extract top N measurements from a sample for card previews.
 * Works with any object that has the measurement keys (Sample, or inline type).
 */
export function getKeyMeasurements(sample: MeasurementFields): KeyMeasurementData[] {
  const measurements: KeyMeasurementData[] = [];

  for (const key of MEASUREMENT_PRIORITY) {
    if (sample[key] != null) {
      const field = MEASUREMENT_FIELDS[key];
      measurements.push({
        key,
        value: sample[key] as number,
        unit: field.unit,
        label: field.label,
      });
      if (measurements.length >= 3) break;
    }
  }

  return measurements;
}

/**
 * Format a measurement value with icon (for SampleList cards).
 */
export function formatMeasurementValueWithIcon(
  key: MeasurementPriorityKey,
  value: number,
  unit: string,
  label: string
): string {
  const icons: Record<MeasurementPriorityKey, string> = {
    ph: '🌊', conductivity: '⚡', salinity: '🧂',
    nitrate: '🔬', calcium: '🔬', potassium: '🔬', sodium: '🔬',
    temperature: '🌡️',
  };
  return unit ? `${icons[key]} ${label}: ${value} ${unit}` : `${icons[key]} ${label}: ${value}`;
}

/**
 * Format a measurement value without icon (for AdminDashboard cards).
 */
export function formatMeasurementValue(label: string, value: number, unit: string): string {
  if (unit) {
    return `${label}: ${value} ${unit}`;
  }
  return `${label}: ${value}`;
}

/**
 * Get status-based icon for a sample (used in SampleList).
 */
export function getStatusIcon(status: string): string {
  const icons: Record<string, string> = { approved: '✅', rejected: '❌', pending: '⏳' };
  return icons[status] || '📋';
}

/**
 * Get measurement-based icon for a sample (used in AdminDashboard).
 */
export function getMeasurementIcon(sample: MeasurementFields): string {
  if (sample.ph != null) return '💧';
  if (sample.conductivity != null) return '⚡';
  if (sample.salinity != null) return '🧂';
  if (sample.nitrate != null) return '🔬';
  if (sample.calcium != null) return '🔬';
  if (sample.potassium != null) return '🔬';
  if (sample.sodium != null) return '🔬';
  if (sample.temperature != null) return '🌡️';
  return '📋';
}

/**
 * Format a date to a short readable string.
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Truncate an address string to a maximum length.
 */
export function truncateAddress(address: string): string {
  if (address.length > 30) {
    return address.substring(0, 30) + '...';
  }
  return address;
}
