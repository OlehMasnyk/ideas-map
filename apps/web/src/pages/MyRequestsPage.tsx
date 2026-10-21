import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { DemandRequest } from '@ideas-map/shared';
import { api } from '../api';
import { formatRadius } from '../components/RequestForm';
import { useCategories } from '../hooks/useCategories';

export function MyRequestsPage() {
  const { categories } = useCategories();
  const [requests, setRequests] = useState<DemandRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .myRequests()
      .then(setRequests)
      .catch(() => setError('Could not load your requests'));
  }, []);

  async function remove(id: string) {
    if (!window.confirm('Delete this request?')) return;
    try {
      await api.deleteRequest(id);
      setRequests((list) => list?.filter((r) => r.id !== id) ?? null);
    } catch {
      setError('Could not delete the request');
    }
  }

  const byslug = new Map(categories.map((c) => [c.slug, c]));

  return (
    <div className="page">
      <div className="page-header">
        <h1>My requests</h1>
        <Link to="/" className="btn btn-primary">
          Add on map
        </Link>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {requests === null ? (
        !error && <p className="muted">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="card empty">
          <p>You haven't asked for anything yet.</p>
          <Link to="/">Open the map and drop your first pin</Link>
        </div>
      ) : (
        <ul className="request-list">
          {requests.map((r) => {
            const cat = byslug.get(r.category);
            return (
              <li key={r.id} className="card request-item">
                <span className="request-icon" aria-hidden>
                  {cat?.icon ?? '📍'}
                </span>
                <div className="request-body">
                  <strong>{cat?.name ?? r.category}</strong>
                  <span className="muted small">
                    within {formatRadius(r.radiusMeters)} of {r.lat.toFixed(4)}, {r.lng.toFixed(4)}{' '}
                    · {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  {r.comment && <p className="request-comment">{r.comment}</p>}
                </div>
                <div className="request-actions">
                  <Link className="btn btn-ghost" to={`/?lat=${r.lat}&lng=${r.lng}&zoom=15`}>
                    Show
                  </Link>
                  <button className="btn btn-danger" onClick={() => void remove(r.id)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
