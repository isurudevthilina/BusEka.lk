import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapProps = {
  vehicles: Vehicle[];
  onSelect?: (v: Vehicle) => void;
  selectedId?: string;
  center?: [number, number];
  zoom?: number;
  className?: string;
};

// preferCanvas + one layerGroup, cleared and refilled each poll. 780+ SVG
// markers drop a projector to single-digit fps; canvas circleMarkers don't
// (PLAN.md lane B).
export function Map({ vehicles, onSelect, selectedId, center = [6.9271, 79.8612], zoom = 9, className }: MapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { preferCanvas: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const v of vehicles) {
      const isSelected = v.id === selectedId;
      const marker = L.circleMarker([v.lat, v.lng], {
        radius: isSelected ? 7 : 5,
        color: "#ffffff",
        weight: isSelected ? 2.5 : 1.5,
        fillColor: v.stale ? "#6B7280" : "#16A34A",
        fillOpacity: 1,
      });
      if (onSelectRef.current) marker.on("click", () => onSelectRef.current?.(v));
      marker.addTo(layer);
    }
  }, [vehicles, selectedId]);

  return <div ref={elRef} className={className ?? "h-full w-full"} />;
}
