import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';
import { getGeofence, setGeofence, isWithinGeofence, type GeofenceConfig } from '../../lib/geofence';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function AttendanceTab() {
  const attendance = useStore((s) => s.attendance);
  const [gf, setGf] = useState<GeofenceConfig>(getGeofence());
  const [editGf, setEditGf] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([gf.lat, gf.lng], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '\u00A9 OpenStreetMap' }).addTo(mapInstance.current);
      setTimeout(() => mapInstance.current?.invalidateSize(), 200);
    }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }

    const f = getGeofence();
    circleRef.current = L.circle([f.lat, f.lng], {
      radius: f.radius,
      color: '#818cf8',
      fillColor: '#818cf8',
      fillOpacity: 0.1,
    }).addTo(map);

    attendance.filter(a => a.lat && a.lng).forEach(a => {
      const { inside } = isWithinGeofence(a.lat!, a.lng!);
      const m = L.marker([a.lat!, a.lng!], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${inside ? '#22c55e' : '#ef4444'};border:2px solid white"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      }).addTo(map);
      m.bindPopup(`<b>${a.user_id}</b><br/>${a.type}<br/>${new Date(a.created_at).toLocaleString()}`);
      markersRef.current.push(m);
    });
  }, [attendance]);

  const handleSave = () => {
    setGeofence(gf);
    setEditGf(false);
    const map = mapInstance.current;
    if (map) {
      if (circleRef.current) circleRef.current.remove();
      circleRef.current = L.circle([gf.lat, gf.lng], {
        radius: gf.radius,
        color: '#818cf8',
        fillColor: '#818cf8',
        fillOpacity: 0.1,
      }).addTo(map);
      map.setView([gf.lat, gf.lng], 10);
    }
  };

  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{t('attendance.title')}</h3>
        <button onClick={() => setEditGf(!editGf)} className="btn btn-secondary text-xs">
          {editGf ? t('common.cancel') : 'Configure Geofence'}
        </button>
      </div>

      {editGf && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">Center Lat</label>
            <input type="number" step="any" value={gf.lat} onChange={e => setGf({ ...gf, lat: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">Center Lng</label>
            <input type="number" step="any" value={gf.lng} onChange={e => setGf({ ...gf, lng: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">Radius (meters)</label>
            <input type="number" value={gf.radius} onChange={e => setGf({ ...gf, radius: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="col-span-3 flex gap-2 justify-end">
            <button onClick={handleSave} className="btn btn-primary text-xs">Save Geofence</button>
          </div>
        </div>
      )}

      <div ref={mapRef} className="h-64 rounded-lg mb-4" style={{ zIndex: 0 }} />
      <p className="text-xs text-[#94a3b8] mb-3">
        Geofence: {gf.lat.toFixed(4)}, {gf.lng.toFixed(4)} &middot; {gf.radius}m radius &middot; Green markers are inside, red are outside
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-[#94a3b8] text-xs border-b border-white/10">
            <th className="text-left py-2">User</th><th className="text-left py-2">Type</th><th className="text-left py-2">Time</th><th className="text-left py-2">Geofence</th><th className="text-left py-2">Location</th>
          </tr></thead>
          <tbody>
            {attendance.filter(a => a.lat && a.lng).map(a => {
              const { inside, distance } = isWithinGeofence(a.lat!, a.lng!);
              return (
              <tr key={a.id} className="border-b border-white/5">
                <td className="py-2">{a.user_id}</td>
                <td className="py-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${a.type === 'check-in' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{a.type}</span></td>
                <td className="py-2">{new Date(a.created_at).toLocaleString()}</td>
                <td className="py-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${inside ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {inside ? 'Inside' : `${Math.round(distance)}m out`}
                  </span>
                </td>
                <td className="py-2"><a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" className="text-indigo-400 hover:underline" rel="noopener noreferrer">{a.lat?.toFixed(4)}, {a.lng?.toFixed(4)}</a></td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {attendance.filter(a => a.lat && a.lng).length === 0 && <p className="text-[#94a3b8] text-center py-4 text-xs">{t('attendance.noGps')}</p>}
      </div>
    </div>
  );
}
