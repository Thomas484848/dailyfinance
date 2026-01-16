import { ValuationStatus } from './types';

export interface ValuationInput {
  peCurrent: number | null;
  peAvg: number | null;
}

export interface ValuationResult {
  peCurrent: number | null;
  peAvg: number | null;
  status: ValuationStatus;
}

/**
 * Calcule le statut de valorisation base sur le PER actuel vs moyenne
 * - UNDER: peCurrent < peAvg * 0.9 (sous-evalue)
 * - FAIR: peCurrent entre peAvg * 0.9 et peAvg * 1.1 (neutre)
 * - OVER: peCurrent > peAvg * 1.1 (sur-evalue)
 * - NA: donnees insuffisantes
 */
export function calculateValuationStatus(
  peCurrent: number | null,
  peAvg: number | null
): ValuationStatus {
  if (peCurrent === null || peAvg === null || peAvg <= 0) {
    return ValuationStatus.NA;
  }

  const lowerBound = peAvg * 0.9;
  const upperBound = peAvg * 1.1;

  if (peCurrent < lowerBound) {
    return ValuationStatus.UNDER;
  }

  if (peCurrent > upperBound) {
    return ValuationStatus.OVER;
  }

  return ValuationStatus.FAIR;
}

/**
 * Genere un PER moyen placeholder base sur le secteur ou le PER actuel
 * Utilise une formule deterministe pour la stabilite
 */
export function generatePlaceholderPeAvg(
  peCurrent: number | null,
  sector: string | null
): number | null {
  if (peCurrent === null) {
    return null;
  }

  // Moyennes sectorielles simulees (placeholder)
  const sectorAverages: Record<string, number> = {
    Technology: 25,
    Healthcare: 22,
    'Financial Services': 15,
    'Consumer Cyclical': 18,
    'Consumer Defensive': 20,
    Industrials: 17,
    Energy: 12,
    Utilities: 16,
    'Real Estate': 35,
    'Basic Materials': 14,
    'Communication Services': 20,
  };

  if (sector && sectorAverages[sector]) {
    return sectorAverages[sector];
  }

  // Fallback: utilise peCurrent * facteur deterministe
  // Hash simple base sur la valeur pour stabilite
  const factor = 0.95 + (Math.abs(peCurrent * 100) % 20) / 100;
  return Math.round(peCurrent * factor * 100) / 100;
}

/**
 * Calcule la valorisation complete
 */
export function computeValuation(
  peCurrent: number | null,
  sector: string | null
): ValuationResult {
  const peAvg = generatePlaceholderPeAvg(peCurrent, sector);
  const status = calculateValuationStatus(peCurrent, peAvg);

  return {
    peCurrent,
    peAvg,
    status,
  };
}

/**
 * Retourne le label francais du statut
 */
export function getStatusLabel(status: ValuationStatus): string {
  const labels: Record<ValuationStatus, string> = {
    UNDER: 'Sous-evalue',
    FAIR: 'Neutre',
    OVER: 'Sur-evalue',
    NA: 'N/A',
  };
  return labels[status];
}

/**
 * Retourne l'emoji du statut
 */
export function getStatusEmoji(status: ValuationStatus): string {
  const emojis: Record<ValuationStatus, string> = {
    UNDER: '',
    FAIR: '',
    OVER: '',
    NA: '',
  };
  return emojis[status];
}

