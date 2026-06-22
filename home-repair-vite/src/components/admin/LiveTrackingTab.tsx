import { useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import { realtime } from '../../lib/realtime';
import { api } from '../../lib/api/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface EmployeePos {
  username: string;
  name: string;
  lat: number;
  lng: number;
  timestamp: string;
}

const icon = L.divIcon({
  className: '',
  html: `<div style="background:#4f46e5;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function LiveTrackingTab() {
  const [employees, setEmployees] = useState<EmployeePos[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapInstance.current) return;
    mapInstance.current = L.map(map).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '\u00A9 OpenStreetMap' }).addTo(mapInstance.current);
    setTimeout(() => mapInstance.current?.invalidateSize(), 200);
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const data = await api.get<EmployeePos[]>('/users/locations');
        setEmployees(data);
      } catch {
        console.warn('[LiveTracking] Failed to fetch employee locations');
      }
    }
    fetchLocations();
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = realtime.subscribe((event) => {
      if (event.type === 'location:employee_update') {
        const { username, name, lat, lng, timestamp } = event.payload;
        setEmployees(prev => {
          const filtered = prev.filter(e => e.username !== username);
          return [...filtered, { username, name, lat, lng, timestamp }];
        });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const currentMarkers = markersRef.current;

    const seen = new Set<string>();
    for (const emp of employees) {
      seen.add(emp.username);
      if (currentMarkers.has(emp.username)) {
        currentMarkers.get(emp.username)!.setLatLng([emp.lat, emp.lng]);
      } else {
        const marker = L.marker([emp.lat, emp.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${emp.name}</b><br/>${emp.lat.toFixed(4)}, ${emp.lng.toFixed(4)}`);
        currentMarkers.set(emp.username, marker);
      }
    }

    for (const [username, marker] of currentMarkers.entries()) {
      if (!seen.has(username)) {
        marker.remove();
        currentMarkers.delete(username);
      }
    }

    if (employees.length > 0) {
      const bounds = L.latLngBounds(employees.map(e => [e.lat, e.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [employees]);

  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{t('tracking.title')}</h3>
        <div className="text-xs text-[#94a3b8] space-x-4">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: '#4f46e5', border: '2px solid #fff', display: 'inline-block' }} />
            {t('tracking.employee')}
          </span>
        </div>
      </div>
      <div ref={mapRef} className="h-[500px] rounded-lg mb-4" style={{ zIndex: 0 }} />
      {employees.length === 0 ? (
        <p className="text-[#94a3b8] text-center py-4 text-sm">{t('tracking.noEmployees')}</p>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.username} className="bg-white/5 rounded-lg px-4 py-2 flex items-center justify-between border border-white/10">
              <div>
                <span className="font-medium text-sm">{emp.name}</span>
                <span className="text-[#94a3b8] text-xs ml-2">@{emp.username}</span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 text-xs hover:underline"
              >
                {emp.lat.toFixed(4)}, {emp.lng.toFixed(4)}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}