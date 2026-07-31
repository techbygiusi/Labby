import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Pane, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function getBodyTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
}

function MapBounds({ points }) {
  const map = useMap();

  React.useEffect(() => {
    if (!points.length) return;

    const bounds = L.latLngBounds(points.map(point => [point.lat, point.lon]));
    const center = bounds.getCenter();
    const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth());
    const lonSpan = Math.abs(bounds.getEast() - bounds.getWest());

    if (points.length === 1 || (latSpan < 8 && lonSpan < 12)) {
      map.setView([center.lat, center.lng], 4, { animate: false });
    } else {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 4, animate: false });
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [map, points]);

  return null;
}

export default function ClusterMapSection({ clusters = [], mappedCount = 0, onOpenClusters, labels }) {
  const [theme, setTheme] = useState(getBodyTheme);
  const [countryBorders, setCountryBorders] = useState(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const updateTheme = () => setTheme(getBodyTheme());
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    let cancelled = false;
    fetch('/country-borders.geojson')
      .then(response => {
        if (!response.ok) throw new Error('Country borders unavailable');
        return response.json();
      })
      .then(data => { if (!cancelled) setCountryBorders(data); })
      .catch(() => { if (!cancelled) setCountryBorders(null); });
    return () => { cancelled = true; };
  }, []);

  const isDark = theme === 'dark';
  const countryStyle = isDark
    ? { color: 'rgba(194, 206, 167, 0.28)', weight: 0.8, fillColor: '#11161d', fillOpacity: 1 }
    : { color: 'rgba(122, 135, 111, 0.34)', weight: 0.8, fillColor: '#f6f7f4', fillOpacity: 1 };
  const markerStyle = isDark
    ? { color: '#101419', weight: 2, fillColor: '#c2cea7', fillOpacity: 0.95 }
    : { color: '#ffffff', weight: 2, fillColor: '#7a876f', fillOpacity: 0.95 };

  const points = useMemo(() => (
    (Array.isArray(clusters) ? clusters : [])
      .map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        url: cluster.url,
        label: cluster.location_label || '',
        lat: Number(cluster.location_lat),
        lon: Number(cluster.location_lon),
        online: cluster.totals?.online || 0,
        nodes: cluster.totals?.nodes || (Array.isArray(cluster.nodes) ? cluster.nodes.length : 0),
        error: cluster.error || ''
      }))
      .filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon))
  ), [clusters]);

  return (
    <section className="panel-card cluster-map-card">
      <div className="panel-header cluster-map-header">
        <div>
          <h2>{labels?.title || 'Cluster locations'}</h2>
          <p>{labels?.count ? labels.count(mappedCount || points.length, clusters.length) : `${mappedCount || points.length} of ${clusters.length} clusters with map location`}</p>
        </div>
        {onOpenClusters && (
          <button type="button" className="btn-secondary btn-small" onClick={onOpenClusters}>
            {labels?.manage || 'Manage clusters'}
          </button>
        )}
      </div>

      {points.length === 0 ? (
        <div className="empty-state soft-box cluster-map-empty">
          <h2>{labels?.emptyTitle || 'No map locations configured'}</h2>
          <p>{labels?.emptyText || 'Open a Proxmox cluster, search for its address and select a location from the dropdown.'}</p>
        </div>
      ) : (
        <div className="cluster-map-layout">
          <div className="cluster-map-canvas">
            <MapContainer center={[51, 10]} zoom={4} minZoom={2} scrollWheelZoom={false} attributionControl={false} className="cluster-map-widget">
              <Pane name="country-borders-pane" style={{ zIndex: 200, pointerEvents: 'none' }}>
                {countryBorders && <GeoJSON key={theme} data={countryBorders} style={() => countryStyle} interactive={false} />}
              </Pane>
              <MapBounds points={points} />
              <Pane name="cluster-markers-pane" style={{ zIndex: 450 }}>
                {points.map(point => (
                  <React.Fragment key={point.id}>
                    <CircleMarker
                      center={[point.lat, point.lon]}
                      radius={14}
                      pathOptions={{ color: markerStyle.fillColor, weight: 0, fillColor: markerStyle.fillColor, fillOpacity: theme === "dark" ? 0.18 : 0.14 }}
                    />
                    <CircleMarker center={[point.lat, point.lon]} radius={8} pathOptions={markerStyle}>
                      <Popup>
                        <strong>{point.name}</strong>
                        <div>{point.label}</div>
                        <div>{point.online}/{point.nodes} {labels?.nodesOnline || 'Nodes online'}</div>
                        {point.url ? <div>{point.url}</div> : null}
                      </Popup>
                    </CircleMarker>
                  </React.Fragment>
                ))}
              </Pane>
            </MapContainer>
          </div>

          <div className="cluster-map-summary">
            {points.map(point => (
              <div key={point.id} className="cluster-map-summary-item">
                <div>
                  <strong>{point.name}</strong>
                  <span>{point.label}</span>
                </div>
                <span className={`status-badge ${point.error ? 'status-stopped' : 'status-running'}`}>
                  {point.error ? (labels?.problem || 'Problem') : `${point.online}/${point.nodes} ${labels?.nodes || 'Nodes'}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
