import { useEffect, useState } from 'react';
import { Popup } from 'react-leaflet';
import type { PointDemandResponse } from '@ideas-map/shared';
import { api } from '../api';

interface Props {
  lat: number;
  lng: number;
  category?: string;
  onClose: () => void;
}

export function PointInsight({ lat, lng, category, onClose }: Props) {
  const [data, setData] = useState<PointDemandResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    api
      .pointDemand(lat, lng, category)
      .then((d) => active && setData(d))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [lat, lng, category]);

  return (
    <Popup position={[lat, lng]} eventHandlers={{ remove: onClose }} autoPan>
      <div className="insight">
        {error ? (
          <p className="error">Could not load demand here.</p>
        ) : !data ? (
          <p className="muted">Loading...</p>
        ) : data.total === 0 ? (
          <p className="muted">Nobody has asked for anything that covers this spot yet.</p>
        ) : (
          <>
            <p className="insight-title">
              <strong>{data.total}</strong> {data.total === 1 ? 'person wants' : 'people want'}{' '}
              something here
            </p>
            <ul>
              {data.categories.map((c) => (
                <li key={c.category}>
                  <span aria-hidden>{c.icon}</span> {c.name}
                  <span className="insight-count">{c.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Popup>
  );
}
