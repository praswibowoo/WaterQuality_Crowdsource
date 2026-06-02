import { describe, it, expect } from 'vitest';
import { MEASUREMENT_FIELDS, type MeasurementFieldKey } from '../utils/measurements';

describe('MEASUREMENT_FIELDS Validation Ranges', () => {
  describe('pH field', () => {
    it('should have correct range for pH', () => {
      const field = MEASUREMENT_FIELDS.ph;
      expect(field.min).toBe(0);
      expect(field.max).toBe(14);
      expect(field.step).toBe(0.01);
      expect(field.unit).toBe('');
    });

    it('should be within valid pH range', () => {
      const field = MEASUREMENT_FIELDS.ph;
      const validPh = 7.0;
      const invalidPhLow = -1;
      const invalidPhHigh = 15;

      expect(validPh >= field.min && validPh <= field.max).toBe(true);
      expect(invalidPhLow < field.min).toBe(true);
      expect(invalidPhHigh > field.max).toBe(true);
    });
  });

  describe('conductivity field', () => {
    it('should have correct range for conductivity', () => {
      const field = MEASUREMENT_FIELDS.conductivity;
      expect(field.min).toBe(0);
      expect(field.max).toBe(199900);
      expect(field.step).toBe(1);
      expect(field.unit).toBe('µS/cm');
    });

    it('should validate typical brackish water conductivity', () => {
      const field = MEASUREMENT_FIELDS.conductivity;
      // Typical mangrove/estuary: 5,000-15,000 µS/cm
      const brackishValue = 10000;
      expect(brackishValue >= field.min && brackishValue <= field.max).toBe(true);
    });
  });

  describe('salinity field', () => {
    it('should have correct range for salinity', () => {
      const field = MEASUREMENT_FIELDS.salinity;
      expect(field.min).toBe(0);
      expect(field.max).toBe(100);
      expect(field.step).toBe(0.1);
      expect(field.unit).toBe('‰');
    });

    it('should validate estuary/mangrove salinity range', () => {
      const field = MEASUREMENT_FIELDS.salinity;
      // Estuary range: 5-30‰
      const estuarySalinity = 15;
      expect(estuarySalinity >= field.min && estuarySalinity <= field.max).toBe(true);
    });
  });

  describe('nitrate field', () => {
    it('should have correct range for nitrate', () => {
      const field = MEASUREMENT_FIELDS.nitrate;
      expect(field.min).toBe(0);
      expect(field.max).toBe(6200);
      expect(field.step).toBe(0.1);
      expect(field.unit).toBe('mg/L');
    });

    it('should validate typical nitrate values for Wonorejo', () => {
      const field = MEASUREMENT_FIELDS.nitrate;
      const typicalNitrate = 2.5;
      expect(typicalNitrate >= field.min && typicalNitrate <= field.max).toBe(true);
    });
  });

  describe('calcium field', () => {
    it('should have correct range for calcium', () => {
      const field = MEASUREMENT_FIELDS.calcium;
      expect(field.min).toBe(0);
      expect(field.max).toBe(4000);
      expect(field.step).toBe(0.1);
      expect(field.unit).toBe('mg/L');
    });
  });

  describe('potassium field', () => {
    it('should have correct range for potassium', () => {
      const field = MEASUREMENT_FIELDS.potassium;
      expect(field.min).toBe(0);
      expect(field.max).toBe(2000);
      expect(field.step).toBe(0.1);
      expect(field.unit).toBe('mg/L');
    });
  });

  describe('sodium field', () => {
    it('should have correct range for sodium', () => {
      const field = MEASUREMENT_FIELDS.sodium;
      expect(field.min).toBe(0);
      expect(field.max).toBe(2000);
      expect(field.step).toBe(0.1);
      expect(field.unit).toBe('mg/L');
    });
  });

  describe('temperature field', () => {
    it('should have correct range for temperature', () => {
      const field = MEASUREMENT_FIELDS.temperature;
      expect(field.min).toBe(-100);
      expect(field.max).toBe(100);
      expect(field.step).toBe(0.1);
      expect(field.unit).toBe('°C');
    });

    it('should validate typical water temperature', () => {
      const field = MEASUREMENT_FIELDS.temperature;
      // Typical tropical water: 25-30°C
      const tropicalTemp = 28;
      expect(tropicalTemp >= field.min && tropicalTemp <= field.max).toBe(true);
    });
  });

  describe('all fields have required properties', () => {
    const requiredProps = ['key', 'label', 'unit', 'min', 'max', 'step', 'meterGroup', 'laquatwin', 'description'];

    for (const fieldKey of Object.keys(MEASUREMENT_FIELDS) as MeasurementFieldKey[]) {
      it(`should have all required properties for ${fieldKey}`, () => {
        const field = MEASUREMENT_FIELDS[fieldKey];
        for (const prop of requiredProps) {
          expect(field).toHaveProperty(prop);
        }
      });

      it(`should have valid min/max for ${fieldKey}`, () => {
        const field = MEASUREMENT_FIELDS[fieldKey];
        expect(field.min).toBeLessThanOrEqual(field.max);
        expect(field.step).toBeGreaterThan(0);
      });
    }
  });
});