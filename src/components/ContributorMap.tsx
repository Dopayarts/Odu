import React, { useState, useCallback, useRef, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Graticule } from 'react-simple-maps';
import { useAppMode } from '../context/AppModeContext';
import { LeaderboardEntry } from '../hooks/useLeaderboard';
import { geocodeLocation } from '../utils/geocoder';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Globe SVG dimensions
const W = 800;
const H = 520;
const SCALE = 235;
const CX = W / 2;  // 400
const CY = H / 2;  // 260

interface MappedContributor extends LeaderboardEntry {
  lng: number;
  lat: number;
}

interface ContributorMapProps {
  rankings: LeaderboardEntry[];
}

const ContributorMap: React.FC<ContributorMapProps> = ({ rankings }) => {
  const { isDarkMode } = useAppMode();

  // Globe rotation state: [longitudeRotation, latitudeRotation, tilt]
  const [rotation, setRotation] = useState<[number, number, number]>([-10, -20, 0]);
  const [selectedDot, setSelectedDot] = useState<MappedContributor | null>(null);

  // Drag tracking via refs (no re-renders during drag)
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; rot: [number, number, number] }>({
    x: 0, y: 0, rot: [-10, -20, 0],
  });

  // Geocode all rankings with a known location
  const mapPoints = useMemo<MappedContributor[]>(() => {
    return rankings.flatMap(entry => {
      if (!entry.location) return [];
      const coords = geocodeLocation(entry.location);
      if (!coords) return [];
      return [{ ...entry, lng: coords[0], lat: coords[1] }];
    });
  }, [rankings]);

  // ── Mouse drag handlers ──────────────────────────────────────────────────
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

  const stopDrag = useCallback(() => { isDragging.current = false; }, []);

  // ── Touch drag handlers ──────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, rot: rotation };
  }, [rotation]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    const [pLng, pLat, tilt] = dragStart.current.rot;
    setRotation([
      pLng - dx * 0.45,
      Math.max(-80, Math.min(80, pLat + dy * 0.45)),
      tilt,
    ]);
    e.preventDefault();
  }, []);

  // ── Dot click ────────────────────────────────────────────────────────────
  const handleDotClick = useCallback((e: React.MouseEvent, point: MappedContributor) => {
    e.stopPropagation();
    setSelectedDot(prev => (prev?.username === point.username ? null : point));
    // Freeze dragging to prevent accidental globe spin on click
    isDragging.current = false;
  }, []);

  // ── Theme colours ────────────────────────────────────────────────────────
  const oceanFill   = isDarkMode ? '#0f172a' : '#dbeafe';
  const countryFill = isDarkMode ? '#1e293b' : '#e2e8f0';
  const countryLine = isDarkMode ? '#334155' : '#94a3b8';
  const gratLine    = isDarkMode ? '#1e293b' : '#cbd5e1';
  const globeRim    = isDarkMode ? '#334155' : '#93c5fd';

  const mappedCount = mapPoints.length;
  const totalCount  = rankings.length;

  return (
    <div className="relative">
      {/* Hint row */}
      <p className={`text-center text-[10px] font-bold uppercase tracking-widest mb-1 ${
        isDarkMode ? 'text-slate-500' : 'text-slate-400'
      }`}>
        Drag to rotate · Tap a dot for details
      </p>

      {/* Globe container */}
      <div
        className="cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={stopDrag}
        onClick={() => setSelectedDot(null)}
        style={{ touchAction: 'none' }}
      >
        <ComposableMap
          width={W}
          height={H}
          projection="geoOrthographic"
          projectionConfig={{ rotate: rotation, scale: SCALE }}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {/* Ocean fill circle */}
          <circle cx={CX} cy={CY} r={SCALE} fill={oceanFill} />

          {/* Globe rim */}
          <circle cx={CX} cy={CY} r={SCALE} fill="none" stroke={globeRim} strokeWidth={1.5} />

          {/* Graticule (lat/lng grid) */}
          <Graticule stroke={gratLine} strokeWidth={0.4} />

          {/* Country polygons */}
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
            const isTop3      = point.rank <= 3;
            const isSelected  = selectedDot?.username === point.username;
            const dotColor    = isTop3 ? '#fbbf24' : '#10b981';
            const ringColor   = isTop3 ? '#f59e0b' : '#059669';

            return (
              <Marker
                key={point.username}
                coordinates={[point.lng, point.lat]}
              >
                <g
                  onClick={e => handleDotClick(e as unknown as React.MouseEvent, point)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Pulsing ring for top-3 */}
                  {isTop3 && (
                    <circle r={11} fill={dotColor} opacity={0.25}>
                      <animate
                        attributeName="r"
                        from="6"
                        to="14"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.4"
                        to="0"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Selection halo */}
                  {isSelected && (
                    <circle
                      r={isTop3 ? 9 : 8}
                      fill="none"
                      stroke={isTop3 ? '#fef08a' : '#6ee7b7'}
                      strokeWidth={2}
                      opacity={0.9}
                    />
                  )}

                  {/* Main dot */}
                  <circle
                    r={isTop3 ? 5.5 : 4}
                    fill={dotColor}
                    stroke={ringColor}
                    strokeWidth={1.2}
                  />
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {/* Tooltip card */}
      {selectedDot && (
        <div
          className={`absolute bottom-14 left-1/2 -translate-x-1/2 z-20 px-5 py-3 rounded-2xl shadow-2xl border text-center whitespace-nowrap pointer-events-auto ${
            isDarkMode
              ? 'bg-slate-800 border-slate-600 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Rank badge + name */}
          <div className={`font-black text-base tracking-tight ${
            selectedDot.rank <= 3 ? 'text-amber-400' : isDarkMode ? 'text-slate-100' : 'text-slate-800'
          }`}>
            {selectedDot.rank <= 3
              ? ['', '🥇', '🥈', '🥉'][selectedDot.rank] + ' '
              : `#${selectedDot.rank} `}
            {selectedDot.username}
          </div>

          {/* Count */}
          <div className={`text-sm font-bold mt-0.5 ${
            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
          }`}>
            {selectedDot.count.toLocaleString()} contribution{selectedDot.count !== 1 ? 's' : ''}
          </div>

          {/* Location */}
          {selectedDot.location && (
            <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedDot.location}
            </div>
          )}

          {/* Dismiss hint */}
          <div className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest ${
            isDarkMode ? 'text-slate-600' : 'text-slate-300'
          }`}>
            tap globe to dismiss
          </div>
        </div>
      )}

      {/* Legend + stat row */}
      <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
        {/* Top-3 legend */}
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.2" />
          </svg>
          <span className={`text-[10px] font-black uppercase tracking-wider ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Top 3
          </span>
        </div>

        {/* Regular legend */}
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="4" fill="#10b981" stroke="#059669" strokeWidth="1.2" />
          </svg>
          <span className={`text-[10px] font-black uppercase tracking-wider ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Contributor
          </span>
        </div>

        {/* Mapped count */}
        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          {mappedCount}/{totalCount} located
        </span>
      </div>

      {/* Empty state */}
      {mapPoints.length === 0 && rankings.length > 0 && (
        <p className={`text-center text-xs font-bold mt-4 ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          No location data yet — contributors will appear once location info is available.
        </p>
      )}
    </div>
  );
};

export default ContributorMap;
