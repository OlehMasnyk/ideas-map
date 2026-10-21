import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { DemandCell } from '@ideas-map/shared';
import { api } from '../api';
import { ClusterLayer } from './ClusterLayer';
import { HeatLayer } from './HeatLayer';

export type ViewMode = 'heat' | 'clusters';

interface Props {
  viewMode: ViewMode;
  category?: string;
  refreshKey: number;
  onSelect: (lat: number, lng: number) => void;
  onStats: (stats: { total: number; loading: boolean; error: boolean }) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function DemandLayer({ viewMode, category, refreshKey, onSelect, onStats }: Props) {
  const map = useMap();
  const [cells, setCells] = useState<DemandCell[]>([]);
  const [viewKey, setViewKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const bumpView = useCallback(() => setViewKey((k) => k + 1), []);
  useMapEvents({ moveend: bumpView });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const b = map.getBounds();
      const bbox: [number, number, number, number] = [
        clamp(b.getWest(), -180, 179.999),
        clamp(b.getSouth(), -90, 89.999),
        clamp(b.getEast(), -179.999, 180),
        clamp(b.getNorth(), -89.999, 90),
      ];
      onStats({ total: 0, loading: true, error: false });
      api
        .demand({ bbox, zoom: Math.round(map.getZoom()), category }, controller.signal)
        .then((res) => {
          setCells(res.cells);
          onStats({
            total: res.cells.reduce((sum, c) => sum + c.count, 0),
            loading: false,
            error: false,
          });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          onStats({ total: 0, loading: false, error: true });
        });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [map, category, refreshKey, viewKey, onStats]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return viewMode === 'heat' ? (
    <HeatLayer cells={cells} />
  ) : (
    <ClusterLayer cells={cells} onSelect={onSelect} />
  );
}
