// Types pour remplacer les enums Prisma (SQLite ne supporte pas les enums)

export enum ValuationStatus {
  UNDER = 'UNDER',
  FAIR = 'FAIR',
  OVER = 'OVER',
  NA = 'NA',
}

export type ValuationStatusString = 'UNDER' | 'FAIR' | 'OVER' | 'NA';

