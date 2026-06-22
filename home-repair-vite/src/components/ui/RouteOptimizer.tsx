import { useMemo, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Navigation } from 'lucide-react';
import { t } from '../../lib/i18n';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function RouteOptimizer() {
  const dockets = useStore((s) => s.dockets);
  const currentUser = useStore((s) => s.currentUser);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const jobs = useMemo(() => {
    return dockets
      .filter((d) => d.assignedTo === currentUser?.username && d.status === 'assigned' && d.lat != null && d.lng != null)
      .map((d) => ({
        id: d.id,
        title: d.title,
        address: d.address,
        lat: d.lat!,
        lng: d.lng!,
        customer: d.customer,
      }));
  }, [dockets, currentUser]);

  function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const sorted = useMemo(() => {
    if (jobs.length < 2) return jobs;
    const ordered = [jobs[0]];
    const remaining = jobs.slice(1);
    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1];
      let nearestIdx = 0;
      let nearestDist = Infinity;
      remaining.forEach((j, i) => {
        const d = haversine(last.lat, last.lng, j.lat, j.lng);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      });
      ordered.push(remaining[nearestIdx]);
      remaining.splice(nearestIdx, 1);
    }
    return ordered;
  }, [jobs]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current).setView([20.5937, 78.9629], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00A9 OpenStreetMap contributors',
    }).addTo(mapInstance.current);
    setTimeout(() => mapInstance.current?.invalidateSize(), 100);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (sorted.length < 2) return;

    const latLngs = sorted.map(j => [j.lat, j.lng] as [number, number]);
    routeLayerRef.current = L.polyline(latLngs, {
      color: '#818cf8',
      weight: 4,
      opacity: 0.8,
    }).addTo(map);

    sorted.forEach((job, i) => {
      const marker = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#818cf8;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;">${i + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const markerObj = L.marker([job.lat, job.lng], { icon: marker }).addTo(map);
      markerObj.bindPopup(`<b>${job.title}</b><br/>${job.address}<br/>${job.customer}`);
      markersRef.current.push(markerObj);
    });

    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [sorted]);

  const markersRef = useRef<L.Marker[]>([]);

  if (jobs.length === 0) {
    return (
      <div className="glass p-4">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Navigation size={16} className="text-indigo-400" /> {t('route.optimizer')}
        </h3>
        <p className="text-xs text-[#94a3b8]">{t('route.noGps')}</p>
      </div>
    );
  }

  return (
    <div className="glass p-4">
      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
        <Navigation size={16} className="text-indigo-400" /> {t('route.optimizer')}
      </h3>
      <p className="text-xs text-[#94a3b8] mb-3">
        {t('route.jobsCount').replace('{count}', String(jobs.length))}
        &nbsp;&nbsp;•&nbsp;&nbsp;
        <a
          href={`https://www.google.com/maps/dir/${sorted.map(j => `${j.lat},${j.lng}`).join('/')} `}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline"
        >
          Open in Google Maps
        </a>
      </p>
      <div ref={mapRef} className="h-64 rounded-lg" style={{ zIndex: 0 }} />
      <div className="mt-3 text-xs text-[#94a3b8] space-y-1">
        {sorted.map((job, i) => (
          <div key={job.id} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-indigo-600 text-xs flex items-center justify-center font-medium">
              {i + 1}
            </div>
            <span className="flex-1 truncate">{job.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
