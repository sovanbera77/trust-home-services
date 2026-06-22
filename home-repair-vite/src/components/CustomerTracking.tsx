import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { realtime } from '../lib/realtime';
import type { RealtimeEvent } from '../lib/realtime';
import { MapPin, Navigation } from 'lucide-react';

interface CustomerTrackingProps {
  technicianUsername?: string;
  technicianName?: string;
}

interface LocationData {
  lat: number;
  lng: number;
  timestamp: string;
}

export default function CustomerTracking({ technicianUsername, technicianName }: CustomerTrackingProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [status, setStatus] = useState<'waiting' | 'tracking'>('waiting');

  useEffect(() => {
    if (!mapRef.current) return;

    // Fix for default marker icons in leaflet with webpack/vite
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    leafletMap.current = L.map(mapRef.current).setView([22.5726, 88.3639], 12); // Default Kolkata
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap.current);

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    const handleLocationUpdate = (event: RealtimeEvent) => {
      if (event.type === 'location:employee_update') {
        const payload = event.payload;
        // If specific tech provided, filter by it. Otherwise show any update.
        if (technicianUsername && payload.username !== technicianUsername) return;

        const newLoc = { lat: payload.lat, lng: payload.lng, timestamp: payload.timestamp };
        setLastLocation(newLoc);
        setStatus('tracking');

        if (leafletMap.current) {
          if (!marker.current) {
            marker.current = L.marker([newLoc.lat, newLoc.lng]).addTo(leafletMap.current)
              .bindPopup(`<b>${payload.name}</b><br/>Current Location`).openPopup();
            leafletMap.current.setView([newLoc.lat, newLoc.lng], 15);
          } else {
            marker.current.setLatLng([newLoc.lat, newLoc.lng]);
            leafletMap.current.panTo([newLoc.lat, newLoc.lng]);
          }
        }
      }
    };

    const unsubscribe = realtime.subscribe(handleLocationUpdate);
    return () => unsubscribe();
  }, [technicianUsername]);

  return (
    <div className="flex flex-col h-full bg-[#111b21] rounded-xl overflow-hidden border border-white/10 shadow-lg">
      <div className="p-4 bg-[#202c33] flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00a884]/20 text-[#00a884] rounded-lg">
            <Navigation size={20} />
          </div>
          <div>
            <h3 className="text-white font-semibold">{technicianName ? `Tracking: ${technicianName}` : 'Live Tracking'}</h3>
            <p className="text-xs text-[#8696a0]">
              {status === 'waiting' ? 'Waiting for location update...' : `Last updated: ${new Date(lastLocation?.timestamp || '').toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        {status === 'tracking' && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        )}
      </div>
      <div className="flex-1 relative min-h-[300px]">
        <div ref={mapRef} className="absolute inset-0 z-0" />
        {status === 'waiting' && (
          <div className="absolute inset-0 z-10 bg-[#111b21]/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <MapPin size={48} className="text-[#8696a0] mb-4 animate-bounce" />
            <p className="text-white font-medium">Locating Technician...</p>
            <p className="text-sm text-[#8696a0] mt-2 text-center max-w-xs">
              Make sure the technician has the app open and tracking enabled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
