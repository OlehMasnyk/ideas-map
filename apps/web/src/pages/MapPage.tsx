import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { RADIUS_DEFAULT_METERS } from '@ideas-map/shared';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { RequestForm, type RequestDraft } from '../components/RequestForm';
import { useCategories } from '../hooks/useCategories';
import { DemandLayer, type ViewMode } from '../map/DemandLayer';
import { PointInsight } from '../map/PointInsight';

const DEFAULT_CENTER: [number, number] = [52.52, 13.405];
const DEFAULT_ZOOM = 13;

const emptyDraft = (category = ''): RequestDraft => ({
  lat: null,
  lng: null,
  category,
  radiusMeters: RADIUS_DEFAULT_METERS,
  comment: '',
});

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function LocateOnce({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], DEFAULT_ZOOM),
      () => undefined,
      { timeout: 5000, maximumAge: 600_000 },
    );
  }, [enabled, map]);
  return null;
}

function parseInitialView(params: URLSearchParams): { center: [number, number]; zoom: number } | null {
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (!params.has('lat') || !params.has('lng') || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const zoom = Number(params.get('zoom'));
  return { center: [lat, lng], zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 15 };
}

export function MapPage() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [params] = useSearchParams();
  const initialView = useMemo(() => parseInitialView(params), [params]);

  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('heat');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>(emptyDraft());
  const [insight, setInsight] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ total: 0, loading: true, error: false });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (adding) {
        setDraft((d) => ({ ...d, lat, lng }));
      } else {
        setInsight({ lat, lng });
      }
    },
    [adding],
  );

  const startAdding = () => {
    setInsight(null);
    setDraft(emptyDraft(filter || categories[0]?.slug || ''));
    setAdding(true);
  };

  const submitDraft = async () => {
    if (draft.lat === null || draft.lng === null) return;
    await api.createRequest({
      category: draft.category,
      lat: draft.lat,
      lng: draft.lng,
      radiusMeters: draft.radiusMeters,
      comment: draft.comment,
    });
    const name = categories.find((c) => c.slug === draft.category)?.name ?? 'request';
    setAdding(false);
    setDraft(emptyDraft());
    setRefreshKey((k) => k + 1);
    setNotice(`Thanks! Your ${name.toLowerCase()} request is on the map.`);
  };

  const filterCategory = filter || undefined;

  return (
    <div className="map-page">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by category">
          <button className={filter === '' ? 'chip active' : 'chip'} onClick={() => setFilter('')}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              className={filter === c.slug ? 'chip active' : 'chip'}
              onClick={() => setFilter(c.slug)}
            >
              <span aria-hidden>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="View mode">
          <button
            className={viewMode === 'heat' ? 'active' : ''}
            onClick={() => setViewMode('heat')}
          >
            Heatmap
          </button>
          <button
            className={viewMode === 'clusters' ? 'active' : ''}
            onClick={() => setViewMode('clusters')}
          >
            Clusters
          </button>
        </div>
      </div>

      <div className="map-wrap">
        <MapContainer
          center={initialView?.center ?? DEFAULT_CENTER}
          zoom={initialView?.zoom ?? DEFAULT_ZOOM}
          minZoom={3}
          worldCopyJump={false}
          className={adding ? 'map adding' : 'map'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocateOnce enabled={!initialView} />
          <ClickHandler onClick={handleMapClick} />
          <DemandLayer
            viewMode={viewMode}
            category={filterCategory}
            refreshKey={refreshKey}
            onSelect={handleMapClick}
            onStats={setStats}
          />
          {adding && draft.lat !== null && draft.lng !== null && (
            <>
              <Circle
                center={[draft.lat, draft.lng]}
                radius={draft.radiusMeters}
                pathOptions={{ color: '#4f46e5', fillOpacity: 0.12, weight: 2, dashArray: '6 6' }}
                interactive={false}
              />
              <CircleMarker
                center={[draft.lat, draft.lng]}
                radius={7}
                pathOptions={{ color: '#fff', fillColor: '#4f46e5', fillOpacity: 1, weight: 3 }}
                interactive={false}
              />
            </>
          )}
          {insight && !adding && (
            <PointInsight
              lat={insight.lat}
              lng={insight.lng}
              category={filterCategory}
              onClose={() => setInsight(null)}
            />
          )}
        </MapContainer>

        <div className="map-overlay top-left">
          <div className="panel stats" aria-live="polite">
            {stats.error ? (
              <span className="error">Could not load demand</span>
            ) : stats.loading ? (
              <span className="muted">Loading demand...</span>
            ) : (
              <span>
                <strong>{stats.total}</strong> request{stats.total === 1 ? '' : 's'} in view
              </span>
            )}
            {!adding && <span className="muted small">Click the map to see local demand</span>}
          </div>
        </div>

        <div className="map-overlay top-right">
          {adding ? (
            <RequestForm
              draft={draft}
              categories={categories}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              onSubmit={submitDraft}
              onCancel={() => setAdding(false)}
            />
          ) : user ? (
            <button className="btn btn-primary btn-lg" onClick={startAdding}>
              + I want something here
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-lg">
              Sign in to add a request
            </Link>
          )}
        </div>

        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
      </div>
    </div>
  );
}
