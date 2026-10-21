import { Prisma } from '@prisma/client';
import {
  RADIUS_MAX_METERS,
  type BBox,
  type DemandCell,
  type DemandCellsResponse,
  type PointDemandEntry,
  type PointDemandResponse,
} from '@ideas-map/shared';
import { prisma } from './db.js';

/** Zooming in past this level does not shrink cells further, so single requests stay blurred. */
export const MAX_AGGREGATION_ZOOM = 16;
export const MAX_CELLS = 2000;

/** Grid cell size in degrees: roughly a quarter of a 256px map tile at the given zoom. */
export function cellSizeForZoom(zoom: number): number {
  const z = Math.min(Math.max(Math.round(zoom), 0), MAX_AGGREGATION_ZOOM);
  return 360 / 2 ** z / 4;
}

const categoryFilter = (category?: string) =>
  category ? Prisma.sql`AND c.slug = ${category}` : Prisma.empty;

export async function getDemandCells(
  bbox: BBox,
  zoom: number,
  category?: string,
): Promise<DemandCellsResponse> {
  const cell = cellSizeForZoom(zoom);
  const cells = await prisma.$queryRaw<DemandCell[]>`
    WITH snapped AS (
      SELECT ST_SnapToGrid(d.location::geometry, ${cell}::float8) AS pt, d.radius_meters
      FROM demand_requests d
      JOIN categories c ON c.id = d.category_id
      WHERE d.location && ST_MakeEnvelope(
          ${bbox.minLng}::float8, ${bbox.minLat}::float8,
          ${bbox.maxLng}::float8, ${bbox.maxLat}::float8, 4326
        )::geography
        ${categoryFilter(category)}
    )
    SELECT
      ST_Y(pt) AS lat,
      ST_X(pt) AS lng,
      count(*)::int AS count,
      round(avg(radius_meters))::int AS "avgRadius"
    FROM snapped
    GROUP BY pt
    ORDER BY count DESC
    LIMIT ${MAX_CELLS}`;
  return { cellSizeDegrees: cell, cells };
}

export async function getPointDemand(
  lat: number,
  lng: number,
  category?: string,
): Promise<PointDemandResponse> {
  const rows = await prisma.$queryRaw<PointDemandEntry[]>`
    WITH p AS (
      SELECT ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography AS g
    )
    SELECT c.slug AS category, c.name, c.icon, count(*)::int AS count
    FROM demand_requests d
    JOIN categories c ON c.id = d.category_id
    CROSS JOIN p
    WHERE ST_DWithin(d.location, p.g, ${RADIUS_MAX_METERS}::float8)
      AND ST_DWithin(d.location, p.g, d.radius_meters)
      ${categoryFilter(category)}
    GROUP BY c.id
    ORDER BY count DESC, c.name`;
  return {
    lat,
    lng,
    total: rows.reduce((sum, r) => sum + r.count, 0),
    categories: rows,
  };
}
