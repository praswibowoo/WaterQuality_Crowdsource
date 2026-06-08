import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { defaultIcon } from './MarkerIcon';

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  zoom?: number;
  initialPosition?: [number, number] | null;
}

interface ReverseGeocodeResult {
  address?: string;
}

// Simple reverse geocoding using Nominatim with AbortController support
async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WaterQualityCrowdsource/1.0',
        },
        signal,
      }
    );
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    return {
      address: data.display_name,
    };
  } catch (error) {
    // Don't log AbortErrors as they are expected
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {};
    }
    console.error('Reverse geocoding error:', error);
    return {};
  }
}

function LocationMarker({
  position,
  onLocationSelect,
}: {
  position: [number, number] | null;
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <Marker position={position} icon={defaultIcon}>
      <Popup>Selected location</Popup>
    </Marker>
  );
}

export default function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
  zoom = 15,
  initialPosition = null,
}: MapPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [address, setAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update selected position when props change and no position is selected yet
  useEffect(() => {
    if (!selectedPosition && initialPosition) {
      setSelectedPosition(initialPosition);
    }
  }, [initialPosition, selectedPosition]);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setIsLoadingAddress(true);
    setAddress('');

    // Cancel any in-flight geocoding request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce: wait 500ms before calling reverse geocoding
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const result = await reverseGeocode(lat, lng, controller.signal);
      const addr = result.address || '';

      setAddress(addr);
      setIsLoadingAddress(false);
      abortControllerRef.current = null;

      onLocationSelect(lat, lng, addr);
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="map-picker-container">
      <div className="map-container">
        <MapContainer
          center={selectedPosition || [0, 0]}
          zoom={selectedPosition ? zoom : 2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
          />
          <LocationMarker
            position={selectedPosition}
            onLocationSelect={handleLocationSelect}
          />
        </MapContainer>
      </div>

      {(selectedPosition || address) && (
        <div className="location-info">
          {isLoadingAddress ? (
            <span className="loading-text">📍 Getting address...</span>
          ) : selectedPosition ? (
            <>
              <span className="coords">
                📍 {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
              </span>
              {address && <span className="address">{address}</span>}
            </>
          ) : null}
        </div>
      )}

      <style>{`
        .map-picker-container {
          margin: var(--spacing-sm) 0;
        }

        .map-container {
          height: 250px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }

        @media (min-width: 768px) {
          .map-container {
            height: 300px;
          }
        }

        .location-info {
          margin-top: var(--spacing-sm);
          padding: var(--spacing-sm);
          background-color: var(--color-background);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .coords {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
        }

        .address {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .loading-text {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
