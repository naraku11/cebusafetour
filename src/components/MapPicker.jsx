import { useEffect, useRef, useState } from 'react';

const CEBU_CENTER = { lat: 10.3157, lng: 123.8854 };

// Singleton loader — script only injected once per session
let _loadPromise = null;
function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve();
  if (_loadPromise) return _loadPromise;
  _loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { _loadPromise = null; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(script);
  });
  return _loadPromise;
}

/**
 * MapPicker — click or drag a pin to select coordinates.
 * Props:
 *   lat, lng   — current values (number | string | '')
 *   onChange   — called with { lat: number, lng: number }
 */
export default function MapPicker({ lat, lng, onChange }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const [mapsReady, setMapsReady] = useState(!!window.google?.maps);
  const [loadError, setLoadError] = useState(false);

  // Load the Maps JS API
  useEffect(() => {
    if (!apiKey || mapsReady) return;
    loadGoogleMaps(apiKey)
      .then(() => setMapsReady(true))
      .catch(() => setLoadError(true));
  }, [apiKey]);

  // Initialise map once API is ready and container is mounted
  useEffect(() => {
    if (!mapsReady || !containerRef.current) return;

    const hasPin = lat !== '' && lng !== '' && lat != null && lng != null;
    const center = hasPin
      ? { lat: parseFloat(lat), lng: parseFloat(lng) }
      : CEBU_CENTER;

    const map = new window.google.maps.Map(containerRef.current, {
      center,
      zoom: hasPin ? 14 : 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    mapRef.current = map;

    // Place initial marker if we already have coords
    if (hasPin) {
      const marker = new window.google.maps.Marker({ position: center, map, draggable: true });
      marker.addListener('dragend', (e) => {
        onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      markerRef.current = marker;
    }

    // Click to place / move pin
    map.addListener('click', (e) => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };

      if (markerRef.current) {
        markerRef.current.setPosition(e.latLng);
      } else {
        const marker = new window.google.maps.Marker({ position: e.latLng, map, draggable: true });
        marker.addListener('dragend', (ev) => {
          onChange({ lat: ev.latLng.lat(), lng: ev.latLng.lng() });
        });
        markerRef.current = marker;
      }

      onChange(pos);
    });

    return () => {
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
      mapRef.current = null;
    };
  }, [mapsReady]);

  // Sync marker when lat/lng change from outside (e.g. editing loads coords)
  useEffect(() => {
    if (!mapRef.current || lat === '' || lng === '' || lat == null || lng == null) return;
    const pos = new window.google.maps.LatLng(parseFloat(lat), parseFloat(lng));
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      const marker = new window.google.maps.Marker({ position: pos, map: mapRef.current, draggable: true });
      marker.addListener('dragend', (e) => {
        onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      markerRef.current = marker;
    }
    mapRef.current.panTo(pos);
  }, [lat, lng]);

  if (!apiKey) {
    return (
      <div className="h-56 bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
        Set <code className="mx-1 font-mono bg-gray-200 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> in admin/.env
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-56 bg-red-50 rounded-xl flex items-center justify-center text-sm text-red-500">
        Failed to load Google Maps
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-56 rounded-xl border border-gray-200 overflow-hidden bg-gray-100"
      >
        {!mapsReady && (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            Loading map…
          </div>
        )}
      </div>

      {/* Coordinate readout */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-gray-500">
          Lat: <strong className="text-gray-800">{lat !== '' && lat != null ? Number(lat).toFixed(6) : '—'}</strong>
        </span>
        <span className="text-gray-500">
          Lng: <strong className="text-gray-800">{lng !== '' && lng != null ? Number(lng).toFixed(6) : '—'}</strong>
        </span>
        <span className="ml-auto text-gray-400">Click map to place pin · Drag to adjust</span>
      </div>
    </div>
  );
}
