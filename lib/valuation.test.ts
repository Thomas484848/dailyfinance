import { describe, it, expect } from 'vitest';
import {
  calculateValuationStatus,
  generatePlaceholderPeAvg,
  computeValuation,
  getStatusLabel,
  getStatusEmoji,
} from './valuation';
import { ValuationStatus } from './types';

describe('calculateValuationStatus', () => {
  it('retourne NA si peCurrent est null', () => {
    expect(calculateValuationStatus(null, 20)).toBe(ValuationStatus.NA);
  });

  it('retourne NA si peAvg est null', () => {
    expect(calculateValuationStatus(15, null)).toBe(ValuationStatus.NA);
  });

  it('retourne NA si peAvg est <= 0', () => {
    expect(calculateValuationStatus(15, 0)).toBe(ValuationStatus.NA);
    expect(calculateValuationStatus(15, -5)).toBe(ValuationStatus.NA);
  });

  it('retourne UNDER si peCurrent < peAvg * 0.9', () => {
    // peAvg = 20, seuil bas = 18
    expect(calculateValuationStatus(17, 20)).toBe(ValuationStatus.UNDER);
    expect(calculateValuationStatus(10, 20)).toBe(ValuationStatus.UNDER);
  });

  it('retourne FAIR si peCurrent entre peAvg * 0.9 et peAvg * 1.1', () => {
    // peAvg = 20, seuils = 18-22
    expect(calculateValuationStatus(18, 20)).toBe(ValuationStatus.FAIR);
    expect(calculateValuationStatus(20, 20)).toBe(ValuationStatus.FAIR);
    expect(calculateValuationStatus(22, 20)).toBe(ValuationStatus.FAIR);
  });

  it('retourne OVER si peCurrent > peAvg * 1.1', () => {
    // peAvg = 20, seuil haut = 22
    expect(calculateValuationStatus(23, 20)).toBe(ValuationStatus.OVER);
    expect(calculateValuationStatus(30, 20)).toBe(ValuationStatus.OVER);
  });
});

describe('generatePlaceholderPeAvg', () => {
  it('retourne null si peCurrent est null', () => {
    expect(generatePlaceholderPeAvg(null, 'Technology')).toBeNull();
  });

  it('retourne la moyenne sectorielle si le secteur est connu', () => {
    expect(generatePlaceholderPeAvg(30, 'Technology')).toBe(25);
    expect(generatePlaceholderPeAvg(30, 'Energy')).toBe(12);
  });

  it('retourne une valeur deterministe si secteur inconnu', () => {
    const result1 = generatePlaceholderPeAvg(20, null);
    const result2 = generatePlaceholderPeAvg(20, null);
    expect(result1).toBe(result2); // Deterministe
    expect(result1).not.toBeNull();
  });
});

describe('computeValuation', () => {
  it('calcule une valorisation complete', () => {
    const result = computeValuation(30, 'Technology');
    expect(result.peCurrent).toBe(30);
    expect(result.peAvg).toBe(25);
    expect(result.status).toBe(ValuationStatus.OVER);
  });

  it('gere les cas null', () => {
    const result = computeValuation(null, null);
    expect(result.peCurrent).toBeNull();
    expect(result.peAvg).toBeNull();
    expect(result.status).toBe(ValuationStatus.NA);
  });
});

describe('getStatusLabel', () => {
  it('retourne les labels corrects', () => {
    expect(getStatusLabel(ValuationStatus.UNDER)).toBe('Sous-evalue');
    expect(getStatusLabel(ValuationStatus.FAIR)).toBe('Neutre');
    expect(getStatusLabel(ValuationStatus.OVER)).toBe('Sur-evalue');
    expect(getStatusLabel(ValuationStatus.NA)).toBe('N/A');
  });
});

describe('getStatusEmoji', () => {
  it('retourne les emojis corrects', () => {
    expect(getStatusEmoji(ValuationStatus.UNDER)).toBe('');
    expect(getStatusEmoji(ValuationStatus.FAIR)).toBe('');
    expect(getStatusEmoji(ValuationStatus.OVER)).toBe('');
    expect(getStatusEmoji(ValuationStatus.NA)).toBe('');
  });
});

