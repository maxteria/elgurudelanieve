import type { ResortStatus } from './types';
import resortStatusJson from '../data/resort-status.json';

/**
 * Load the manual/local resort status fixture.
 * This is intended as a placeholder until an official scraper or API is available.
 */
export function loadResortStatus(): ResortStatus {
  return { ...safeDefaultResortStatus(), ...(resortStatusJson as Partial<ResortStatus>) } as ResortStatus;
}

function safeDefaultResortStatus(): ResortStatus {
  return {
    seasonStatus: 'unknown',
    resortOperationalStatus: 'unknown',
    officialSnowReportAvailable: false,
    baseDepthCm: null,
    liftsOpen: 0,
    slopesOpen: 0,
    lastUpdatedAt: new Date().toISOString(),
    updatedBy: 'manual',
    resortStatusSource:
      'Estado operativo no confirmado. Información local manual pendiente de actualización.',
    operationalWarnings: [
      'No hay estado operativo confirmado para el centro de esquí.',
      'No se dispone de parte oficial de nieve.',
    ],
  };
}
