import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface OpenMapPolyline {
  id: string;
  coordinates: [number, number][];
  color: string;
  weight?: number;
  dashArray?: string;
  opacity?: number;
  label?: string;
  sublabel?: string;
  onClick?: () => void;
}

export interface OpenMapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  badgeText?: string;
  color: string;
  radius?: number;
  kind?: 'city' | 'station' | 'live-metro' | 'live-bus' | 'alert' | 'hotel' | 'user' | 'coming-soon' | 'poi';
  popupHtml?: string;
  onClick?: () => void;
}

interface OpenSourceMapProps {
  center: [number, number];
  zoom: number;
  polylines?: OpenMapPolyline[];
  markers?: OpenMapMarker[];
  heightClass?: string;
  fitBoundsPoints?: [number, number][];
  showTileSwitcher?: boolean;
  defaultTileStyle?: TileStyleId;
  onUserLocate?: (coords: [number, number]) => void;
}

export type TileStyleId = 'osm-standard' | 'carto-light' | 'osm-hot' | 'open-topo';

const TILE_LAYERS: Record<
  TileStyleId,
  { label: string; url: string; attribution: string; maxZoom: number }
> = {
  'osm-standard': {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors (ODbL)',
    maxZoom: 19,
  },
  'carto-light': {
    label: 'Atlas Clean',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  },
  'osm-hot': {
    label: 'Transit Relief',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, HOT',
    maxZoom: 19,
  },
  'open-topo': {
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM &copy; OpenTopoMap',
    maxZoom: 17,
  },
};

export const OpenSourceMap: React.FC<OpenSourceMapProps> = ({
  center,
  zoom,
  polylines = [],
  markers = [],
  heightClass = 'h-[420px]',
  fitBoundsPoints,
  showTileSwitcher = true,
  defaultTileStyle = 'osm-standard',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const railOverlayRef = useRef<L.TileLayer | null>(null);
  const vectorGroupRef = useRef<L.LayerGroup | null>(null);

  const [tileStyle, setTileStyle] = useState<TileStyleId>(defaultTileStyle);
  const [showRailTracks, setShowRailTracks] = useState<boolean>(false);

  // Initialize Leaflet map once + ResizeObserver to avoid blank edge tiles
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const layerConf = TILE_LAYERS[tileStyle];
    const tile = L.tileLayer(layerConf.url, {
      attribution: layerConf.attribution,
      maxZoom: layerConf.maxZoom,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tile;
    vectorGroupRef.current = group;

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    observer.observe(el);

    const rafId = window.requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      railOverlayRef.current = null;
      vectorGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch open-source base tile provider cleanly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const conf = TILE_LAYERS[tileStyle];
    tileLayerRef.current = L.tileLayer(conf.url, {
      attribution: conf.attribution,
      maxZoom: conf.maxZoom,
    }).addTo(map);
    if (railOverlayRef.current) {
      railOverlayRef.current.bringToFront();
    }
  }, [tileStyle]);

  // Toggle open-source OpenRailwayMap infrastructure track overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (railOverlayRef.current) {
      map.removeLayer(railOverlayRef.current);
      railOverlayRef.current = null;
    }
    if (showRailTracks) {
      railOverlayRef.current = L.tileLayer(
        'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenRailwayMap contributors',
          maxZoom: 19,
          opacity: 0.72,
        }
      ).addTo(map);
    }
  }, [showRailTracks]);

  // Update camera center/zoom smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (fitBoundsPoints && fitBoundsPoints.length >= 2) {
      const bounds = L.latLngBounds(fitBoundsPoints);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [center[0], center[1], zoom, fitBoundsPoints]);

  // Render polylines & markers
  useEffect(() => {
    const group = vectorGroupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const line of polylines) {
      if (line.coordinates.length < 2) continue;
      L.polyline(line.coordinates, {
        color: '#FFFFFF',
        weight: (line.weight ?? 4) + 3,
        opacity: 0.75,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      const poly = L.polyline(line.coordinates, {
        color: line.color,
        weight: line.weight ?? 4,
        opacity: line.opacity ?? 0.92,
        dashArray: line.dashArray,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      if (line.label) {
        poly.bindPopup(
          `<div style="min-width:160px;font-family:Plus Jakarta Sans,sans-serif;">
            <div style="font-weight:700;font-size:13px;color:#141821;">${line.label}</div>
            ${line.sublabel ? `<div style="font-size:11px;color:#525866;margin-top:2px;">${line.sublabel}</div>` : ''}
          </div>`
        );
      }

      if (line.onClick) {
        poly.on('click', line.onClick);
      }
    }

    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;

      let layer: L.Layer;
      if (m.kind === 'live-metro' || m.kind === 'live-bus') {
        const iconText = m.kind === 'live-metro' ? 'M' : 'B';
        const divIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${m.color};color:#fff;font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-family:IBM Plex Mono,monospace;">${iconText}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        layer = L.marker([m.lat, m.lng], { icon: divIcon });
      } else if (m.kind === 'user') {
        const divIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:#1D4ED8;border:3px solid #fff;box-shadow:0 0 0 4px rgba(29,78,216,0.28);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        layer = L.marker([m.lat, m.lng], { icon: divIcon });
      } else if (m.kind === 'hotel' || m.kind === 'poi') {
        const badge = m.kind === 'hotel' ? 'H' : '★';
        const divIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${m.color};color:#fff;font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${badge}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        layer = L.marker([m.lat, m.lng], { icon: divIcon });
      } else {
        layer = L.circleMarker([m.lat, m.lng], {
          radius: m.radius ?? (m.kind === 'city' ? 9 : 6),
          fillColor: m.color,
          color: m.kind === 'coming-soon' ? '#78350F' : '#FFFFFF',
          weight: 2,
          dashArray: m.kind === 'coming-soon' ? '3 2' : undefined,
          opacity: 1,
          fillOpacity: 0.92,
        });
      }

      const defaultPopup = `<div style="min-width:170px;font-family:Plus Jakarta Sans,sans-serif;">
        <div style="font-weight:700;font-size:13px;color:#141821;">${m.title}</div>
        ${m.subtitle ? `<div style="font-size:11px;color:#525866;margin-top:3px;line-height:1.4;">${m.subtitle}</div>` : ''}
      </div>`;

      layer.bindPopup(m.popupHtml || defaultPopup);

      if (m.onClick) {
        layer.on('click', m.onClick);
      }

      layer.addTo(group);
    }
  }, [polylines, markers]);

  const osmUrl = `https://www.openstreetmap.org/#map=${zoom}/${center[0].toFixed(4)}/${center[1].toFixed(4)}`;

  return (
    <div className={`relative w-full ${heightClass} bg-[#EBE8E1]`}>
      <div ref={containerRef} className="w-full h-full" />

      {showTileSwitcher && (
        <div className="absolute top-2.5 right-2.5 z-[30] flex flex-wrap items-center justify-end gap-1 bg-white/95 backdrop-blur-xs border border-[#E2E0DA] rounded-md p-1 shadow-xs max-w-[calc(100%-56px)]">
          {(Object.keys(TILE_LAYERS) as TileStyleId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTileStyle(id)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                tileStyle === id
                  ? 'bg-[#141821] text-white'
                  : 'text-[#525866] hover:text-[#141821]'
              }`}
            >
              {TILE_LAYERS[id].label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowRailTracks((prev) => !prev)}
            className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
              showRailTracks
                ? 'bg-[#B45309] text-white border-[#B45309]'
                : 'bg-[#F8F7F4] text-[#525866] border-[#E2E0DA] hover:text-[#141821]'
            }`}
            title="Toggle OpenRailwayMap track & metro rail infrastructure layer"
          >
            Rail Overlay
          </button>
        </div>
      )}

      <a
        href={osmUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2.5 left-2.5 z-[30] px-2 py-1 text-[10px] font-mono text-[#141821] bg-white/90 hover:bg-white border border-[#E2E0DA] rounded shadow-xs transition-colors"
      >
        Open in OpenStreetMap ↗
      </a>
    </div>
  );
};
