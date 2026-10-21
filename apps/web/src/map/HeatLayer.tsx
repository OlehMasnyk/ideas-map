import './leafletGlobal';
import 'leaflet.heat';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { DemandCell } from '@ideas-map/shared';

const GRADIENT = { 0.2: '#3b82f6', 0.4: '#22c55e', 0.6: '#facc15', 0.8: '#f97316', 1: '#dc2626' };

export function HeatLayer({ cells }: { cells: DemandCell[] }) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    const layer = L.heatLayer([], { radius: 35, blur: 25, minOpacity: 0.35, gradient: GRADIENT });
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const max = Math.max(1, ...cells.map((c) => c.count));
    layerRef.current
      ?.setOptions({ max, maxZoom: map.getZoom() })
      .setLatLngs(cells.map((c) => [c.lat, c.lng, c.count]));
  }, [cells, map]);

  return null;
}
