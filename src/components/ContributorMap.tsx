import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Graticule } from 'react-simple-maps';
import { useAppMode } from '../context/AppModeContext';
import { LeaderboardEntry } from '../hooks/useLeaderboard';
import { geocodeLocation } from '../utils/geocoder';

const GEO_URL = '/countries-110m.json';
const W = 800;
const H = 520;
const DEFAULT_ROTATION: [number, number, number] = [-10, -20, 0];
const DEFAULT_SCALE = 235;
const MIN_SCALE = 70;   // ~30% zoom-out
const MAX_SCALE = 900;

// FNV-1a seeded pseudo-random (deterministic per username — stable positions)
function seededRand(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967296;
}

interface MappedEntry extends LeaderboardEntry {
  lng: number;
  lat: number;
  locationKey: string;
  isMuseum: boolean;
}

interface LocationGroup {
  key: string;
  displayName: string;
  members: MappedEntry[];
}

interface ContributorMapProps {
  rankings: LeaderboardEntry[];
}

const ContributorMap: React.FC<ContributorMapProps> = ({ rankings }) => {
  const { isDarkMode } = useAppMode();
  const [rotation, setRotation] = useState<[number, number, number]>(DEFAULT_ROTATION);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [selectedGroup, setSelectedGroup] = useState<LocationGroup | null>(null);

  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; rot: [number, number, number] }>({
    x: 0, y: 0, rot: DEFAULT_ROTATION,
  });
  const lastPinchDist = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Non-passive wheel listener (required to call preventDefault on scroll zoom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev - e.deltaY * 0.5)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Build location groups + scattered dots ──────────────────────────────
  const { locationGroups, mapPoints } = useMemo(() => {
    // Geocode each entry
    const geocoded = rankings.flatMap(entry => {
      if (!entry.location) return [];
      const coords = geocodeLocation(entry.location);
      if (!coords) return [];
      return [{
        entry,
        key: entry.location.trim().toLowerCase(),
        baseLng: coords[0],
        baseLat: coords[1],
        isMuseum: entry.username.toLowerCase().includes('museum'),
      }];
    });

    // Group by normalized location key
    const byKey: Record<string, typeof geocoded> = {};
    for (const item of geocoded) {
      (byKey[item.key] ??= []).push(item);
    }

    const locationGroups: LocationGroup[] = [];
    const mapPoints: MappedEntry[] = [];

    for (const [key, items] of Object.entries(byKey)) {
      const n = items.length;
      // Scatter radius grows sub-linearly with group size (cap 5°)
      const radius = n <= 1 ? 0 : Math.min(0.5 + Math.sqrt(n - 1) * 0.7, 5);

      const members: MappedEntry[] = items.map(({ entry, baseLng, baseLat, isMuseum }) => {
        let lng = baseLng;
        let lat = baseLat;
        if (n > 1) {
          const angle = seededRand(entry.username + '_a') * Math.PI * 2;
          const dist = (0.3 + seededRand(entry.username + '_d') * 0.7) * radius;
          lng = baseLng + Math.cos(angle) * dist;
          lat = Math.max(-85, Math.min(85, baseLat + Math.sin(angle) * dist));
        }
        return { ...entry, lng, lat, locationKey: key, isMuseum };
      });

      members.forEach(m => mapPoints.push(m));
      locationGroups.push({
        key,
        displayName: items[0].entry.location || key,
        members,
      });
    }

    return { locationGroups, mapPoints };
  }, [rankings]);

  // ── Mouse drag ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, rot: rotation };
    e.preventDefault();
  }, [rotation]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const [pLng, pLat, tilt] = dragStart.current.rot;
    setRotation([
      pLng - dx * 0.45,
      Math.max(-80, Math.min(80, pLat + dy * 0.45)),
      tilt,
    ]);
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    lastPinchDist.current = null;
  }, []);

  // ── Touch drag + pinch zoom ─────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, rot: rotation };
    } else if (e.touches.length === 2) {
      lastPinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  }, [rotation]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastPinchDist.current !== null) {
        setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + (d - lastPinchDist.current!) * 0.8)));
      }
      lastPinchDist.current = d;
    } else if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      const [pLng, pLat, tilt] = dragStart.current.rot;
      setRotation([
        pLng - dx * 0.45,
        Math.max(-80, Math.min(80, pLat + dy * 0.45)),
        tilt,
      ]);
    }
    e.preventDefault();
  }, []);

  // ── Dot click → show location group panel ──────────────────────────────
  const onDotClick = useCallback((e: React.MouseEvent, locationKey: string) => {
    e.stopPropagation();
    isDragging.current = false;
    const group = locationGroups.find(g => g.key === locationKey) ?? null;
    setSelectedGroup(prev => prev?.key === locationKey ? null : group);
  }, [locationGroups]);

  // ── Reset ───────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setRotation(DEFAULT_ROTATION);
    setScale(DEFAULT_SCALE);
  }, []);

  // ── Theme ───────────────────────────────────────────────────────────────
  const oceanFill   = isDarkMode ? '#0f172a' : '#dbeafe';
  const countryFill = isDarkMode ? '#1e293b' : '#e2e8f0';
  const countryLine = isDarkMode ? '#334155' : '#94a3b8';
  const gratLine    = isDarkMode ? '#1e293b' : '#cbd5e1';
  const globeRim    = isDarkMode ? '#334155' : '#93c5fd';

  const getDotFill   = (p: MappedEntry) => p.isMuseum ? '#a855f7' : p.rank <= 3 ? '#fbbf24' : '#10b981';
  const getDotStroke = (p: MappedEntry) => p.isMuseum ? '#9333ea' : p.rank <= 3 ? '#f59e0b' : '#059669';

  return (
    <div className="relative">
      {/* Hint */}
      <p className={`text-center text-[10px] font-bold uppercase tracking-widest mb-1 ${
        isDarkMode ? 'text-slate-500' : 'text-slate-400'
      }`}>
        Drag · Scroll/pinch to zoom · Tap dot for details
      </p>

      {/* Globe + side panel wrapper */}
      <div className="relative" ref={containerRef}>
        {/* Drag layer */}
        <div
          className="cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={stopDrag}
          onClick={() => setSelectedGroup(null)}
          style={{ touchAction: 'none' }}
        >
          <ComposableMap
            width={W}
            height={H}
            projection="geoOrthographic"
            projectionConfig={{ rotate: rotation, scale }}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {/* Ocean */}
            <circle cx={W / 2} cy={H / 2} r={scale} fill={oceanFill} />
            {/* Globe rim */}
            <circle cx={W / 2} cy={H / 2} r={scale} fill="none" stroke={globeRim} strokeWidth={1.5} />
            {/* Grid */}
            <Graticule stroke={gratLine} strokeWidth={0.4} />
            {/* Countries */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: countryFill, stroke: countryLine, strokeWidth: 0.4, outline: 'none' },
                      hover:   { fill: countryFill, stroke: countryLine, strokeWidth: 0.4, outline: 'none' },
                      pressed: { fill: countryFill, stroke: countryLine, strokeWidth: 0.4, outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Contributor dots */}
            {mapPoints.map(point => {
              const fill   = getDotFill(point);
              const stroke = getDotStroke(point);
              const special = point.isMuseum || point.rank <= 3;
              const inSelected = selectedGroup?.key === point.locationKey;

              return (
                <Marker key={point.username} coordinates={[point.lng, point.lat]}>
                  <g
                    onClick={e => onDotClick(e as unknown as React.MouseEvent, point.locationKey)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulse ring for top-3 and museums */}
                    {special && (
                      <circle r={10} fill={fill} opacity={0.25}>
                        <animate attributeName="r" from="5" to="13"
                          dur={point.isMuseum ? '2s' : '1.4s'} repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0"
                          dur={point.isMuseum ? '2s' : '1.4s'} repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Selection halo */}
                    {inSelected && (
                      <circle r={8} fill="none" stroke={fill} strokeWidth={2} opacity={0.9} />
                    )}
                    {/* Main dot */}
                    <circle
                      r={special ? 5.5 : 4}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1.2}
                    />
                  </g>
                </Marker>
              );
            })}
          </ComposableMap>
        </div>

        {/* ── Location group side panel ─────────────────────────────────── */}
        {selectedGroup && (
          <div
            className={`absolute top-2 right-2 w-48 max-h-60 rounded-2xl shadow-2xl border overflow-hidden flex flex-col z-20 ${
              isDarkMode
                ? 'bg-slate-800/95 border-slate-600 text-slate-100'
                : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b flex-shrink-0 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
            }`}>
              <span className="text-[10px] font-black uppercase tracking-widest truncate pr-1 leading-tight">
                {selectedGroup.displayName}
              </span>
              <button
                onClick={() => setSelectedGroup(null)}
                className={`text-xs font-black flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                ✕
              </button>
            </div>

            {/* User list */}
            <div className="overflow-y-auto px-3 py-2 space-y-1.5">
              {[...selectedGroup.members]
                .sort((a, b) => a.rank - b.rank)
                .map(m => (
                  <div key={m.username} className="flex items-center justify-between gap-1">
                    {/* Rank + name */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-[9px] font-black flex-shrink-0 ${
                        m.isMuseum ? 'text-purple-400'
                        : m.rank <= 3 ? 'text-amber-400'
                        : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        {m.rank <= 3 ? ['', '🥇', '🥈', '🥉'][m.rank] : `#${m.rank}`}
                      </span>
                      <span className={`text-xs font-bold truncate ${
                        m.isMuseum ? 'text-purple-400'
                        : m.rank <= 3 ? 'text-amber-400'
                        : isDarkMode ? 'text-slate-200' : 'text-slate-700'
                      }`}>
                        {m.username}
                      </span>
                      {m.isMuseum && (
                        <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded flex-shrink-0 font-black">
                          MUS
                        </span>
                      )}
                    </div>
                    {/* Count */}
                    <span className={`text-[10px] font-bold flex-shrink-0 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {m.count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Controls row ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-3 px-1 flex-wrap gap-2">
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { fill: '#fbbf24', stroke: '#f59e0b', r: 5, label: 'Top 3' },
            { fill: '#10b981', stroke: '#059669', r: 4, label: 'Contributor' },
            { fill: '#a855f7', stroke: '#9333ea', r: 5, label: 'Museum' },
          ].map(({ fill, stroke, r, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r={r} fill={fill} stroke={stroke} strokeWidth="1" />
              </svg>
              <span className={`text-[9px] font-black uppercase tracking-wider ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {label}
              </span>
            </div>
          ))}
          <span className={`text-[9px] font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            {mapPoints.length}/{rankings.length} located
          </span>
        </div>

        {/* Reset rotation + zoom */}
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex-shrink-0 ${
            isDarkMode
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          ↺ Reset View
        </button>
      </div>

      {/* Empty state */}
      {mapPoints.length === 0 && rankings.length > 0 && (
        <p className={`text-center text-xs font-bold mt-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          No location data yet — contributors appear once location info is available.
        </p>
      )}
    </div>
  );
};

export default ContributorMap;
