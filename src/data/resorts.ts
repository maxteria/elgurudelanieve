// Resort configuration for multi-resort support

export interface Resort {
  id: string;
  name: string;
  location: string; // e.g., "Neuquén", "Mendoza"
  coords: {
    lat: number;
    lon: number;
  };
  // Zone altitudes specific to this resort
  zones: {
    base: number;
    mid: number;
    top: number;
  };
}

export const RESORTS: Record<string, Resort> = {
  caviahue: {
    id: 'caviahue',
    name: 'Caviahue',
    location: 'Neuquén',
    coords: { lat: -37.86, lon: -71.08 },
    zones: { base: 1647, mid: 1846, top: 2045 },
  },
  cerrobayo: {
    id: 'cerrobayo',
    name: 'Cerro Bayo',
    location: 'Villa La Angostura',
    coords: { lat: -40.82, lon: -71.35 },
    zones: { base: 1230, mid: 1450, top: 1720 },
  },
  chapelco: {
    id: 'chapelco',
    name: 'Chapelco',
    location: 'San Martín de los Andes',
    coords: { lat: -40.53, lon: -71.31 },
    zones: { base: 1250, mid: 1540, top: 1980 },
  },
  castor: {
    id: 'castor',
    name: 'Castor',
    location: 'Bariloche',
    coords: { lat: -41.08, lon: -71.47 },
    zones: { base: 1400, mid: 1650, top: 2150 },
  },
  laslenas: {
    id: 'laslenas',
    name: 'Las Leñas',
    location: 'Mendoza',
    coords: { lat: -35.11, lon: -70.03 },
    zones: { base: 2250, mid: 2600, top: 3430 },
  },
};

export function getResortFromParams(params: URLSearchParams): Resort {
  const resortId = params.get('resort');
  if (resortId && RESORTS[resortId]) {
    return RESORTS[resortId];
  }
  return RESORTS.caviahue; // Default
}