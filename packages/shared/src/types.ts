export interface PublicUser {
  id: string;
  email: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
}

export interface DemandRequest {
  id: string;
  category: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  comment: string | null;
  createdAt: string;
}

export interface DemandCell {
  lat: number;
  lng: number;
  count: number;
  avgRadius: number;
}

export interface DemandCellsResponse {
  cellSizeDegrees: number;
  cells: DemandCell[];
}

export interface PointDemandEntry {
  category: string;
  name: string;
  icon: string;
  count: number;
}

export interface PointDemandResponse {
  lat: number;
  lng: number;
  total: number;
  categories: PointDemandEntry[];
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}
