import L from 'leaflet';
import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import type { DemandCell } from '@ideas-map/shared';

function clusterIcon(count: number, max: number): L.DivIcon {
  const ratio = count / max;
  const size = Math.round(28 + 28 * Math.sqrt(ratio));
  const level = ratio > 0.66 ? 'high' : ratio > 0.33 ? 'mid' : 'low';
  return L.divIcon({
    className: `cluster-icon cluster-${level}`,
    html: `<span>${count}</span>`,
    iconSize: [size, size],
  });
}

interface Props {
  cells: DemandCell[];
  onSelect: (lat: number, lng: number) => void;
}

export function ClusterLayer({ cells, onSelect }: Props) {
  const max = useMemo(() => Math.max(1, ...cells.map((c) => c.count)), [cells]);
  return (
    <>
      {cells.map((c) => (
        <Marker
          key={`${c.lat},${c.lng}`}
          position={[c.lat, c.lng]}
          icon={clusterIcon(c.count, max)}
          eventHandlers={{ click: () => onSelect(c.lat, c.lng) }}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            {c.count} request{c.count === 1 ? '' : 's'} in this area, avg radius {c.avgRadius} m
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
