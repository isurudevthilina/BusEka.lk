// src/web/components/Map.tsx
// Leaflet map with canvas renderer — 780+ markers without fps drops

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapVehicle {
  id: string;
  lat: number;
  lng: number;
  stale: boolean;
  label: string;
  routeNo?: string;
  speedKmh: number;
  ts: number;
}

interface MapProps {
  vehicles: MapVehicle[];
  center?: [number, number];
  zoom?: number;
  onSelect?: (v: MapVehicle) => void;
}

const LIVE_COLOR = '#00C853';
const STALE_COLOR = '#6B7280';

function makeCircle(color: string) {
  return L.circleMarker([0, 0], {
    radius: 7,
    fillColor: color,
    color: '#fff',
    weight: 2,
    fillOpacity: 0.9,
  });
}

export default function MapView({ vehicles, center = [6.9271, 79.8612], zoom = 9, onSelect }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      preferCanvas: true,
      center,
      zoom,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update markers when vehicles change
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.clearLayers();

    vehicles.forEach((v) => {
      if (!v.lat || !v.lng) return;
      const marker = L.circleMarker([v.lat, v.lng], {
        radius: 7,
        fillColor: v.stale ? STALE_COLOR : LIVE_COLOR,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      });

      if (onSelect) {
        marker.on('click', () => onSelect(v));
      }

      marker.bindTooltip(`${v.label}${v.routeNo ? ` · ${v.routeNo}` : ''}`, {
        direction: 'top',
        offset: [0, -8],
        className: 'leaflet-tooltip-buseka',
      });

      marker.addTo(layer);
    });
  }, [vehicles, onSelect]);

  return <div ref={containerRef} className="h-full w-full" />;
}
