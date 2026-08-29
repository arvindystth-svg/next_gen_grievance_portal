"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { BENGALURU_CENTER } from "@/lib/seedData";

interface LocationData {
  lat: number;
  lng: number;
  ward?: string;
  zone?: string;
  locality?: string;
  source: "gps" | "exif" | "nlp" | "manual" | "preset";
}

interface LocationPickerProps {
  location: LocationData | null;
  onLocationChange: (loc: LocationData) => void;
  suggestedLocation?: { lat: number; lng: number; ward?: string; zone?: string; locality?: string } | null;
}

const WARD_BOUNDARIES: Array<{
  name: string;
  zone: string;
  lat: number;
  lng: number;
  radius: number;
  locality: string;
}> = [
  { name: "Ward 151 - Koramangala", zone: "South Zone", lat: 12.9344, lng: 77.6251, radius: 0.025, locality: "Koramangala" },
  { name: "Ward 150 - Bellandur", zone: "East Zone", lat: 12.9279, lng: 77.6801, radius: 0.03, locality: "Bellandur" },
  { name: "Ward 80 - Hoysala Nagar", zone: "East Zone", lat: 12.9784, lng: 77.6386, radius: 0.025, locality: "Indiranagar" },
  { name: "Ward 85 - Domlur", zone: "East Zone", lat: 12.9611, lng: 77.6387, radius: 0.02, locality: "Domlur" },
  { name: "Ward 103 - Jayanagar", zone: "South Zone", lat: 12.9308, lng: 77.5836, radius: 0.025, locality: "Jayanagar" },
  { name: "Ward 69 - Shivajinagar", zone: "Central Zone", lat: 12.9867, lng: 77.6044, radius: 0.02, locality: "Shivajinagar" },
  { name: "Ward 63 - Hebbal", zone: "North Zone", lat: 13.0358, lng: 77.5973, radius: 0.025, locality: "Hebbal" },
];

function getWardForCoordinates(lat: number, lng: number) {
  let closest = WARD_BOUNDARIES[0];
  let minDist = Infinity;
  for (const ward of WARD_BOUNDARIES) {
    const dist = Math.sqrt(Math.pow(lat - ward.lat, 2) + Math.pow(lng - ward.lng, 2));
    if (dist < minDist) {
      minDist = dist;
      closest = ward;
    }
  }
  return closest;
}

const SOURCE_LABELS: Record<LocationData["source"], string> = {
  gps: "📡 Browser GPS",
  exif: "📷 Photo EXIF",
  nlp: "🤖 AI Text Extraction",
  manual: "✏️ Manually placed",
  preset: "⚡ Demo preset",
};

export default function LocationPicker({
  location,
  onLocationChange,
  suggestedLocation,
}: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const currentLoc = location || { ...BENGALURU_CENTER, source: "manual" as const };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || leafletMapRef.current) return;
      leafletRef.current = L;

      // Fix default icon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [currentLoc.lat, currentLoc.lng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([currentLoc.lat, currentLoc.lng], { draggable: true })
        .addTo(map)
        .bindPopup("📍 Drag to set exact location")
        .openPopup();

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const ward = getWardForCoordinates(pos.lat, pos.lng);
        onLocationChange({
          lat: pos.lat,
          lng: pos.lng,
          ward: ward.name,
          zone: ward.zone,
          locality: ward.locality,
          source: "manual",
        });
      });

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        const ward = getWardForCoordinates(e.latlng.lat, e.latlng.lng);
        onLocationChange({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          ward: ward.name,
          zone: ward.zone,
          locality: ward.locality,
          source: "manual",
        });
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (leafletMapRef.current as any).remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when location changes externally
  useEffect(() => {
    if (!markerRef.current || !leafletMapRef.current || !location) return;
    const L = leafletRef.current;
    if (!L) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (markerRef.current as any).setLatLng([location.lat, location.lng]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (leafletMapRef.current as any).setView([location.lat, location.lng], 15, { animate: true });
  }, [location]);

  // Handle suggested location from parent
  useEffect(() => {
    if (!suggestedLocation || !markerRef.current || !leafletMapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (markerRef.current as any).setLatLng([suggestedLocation.lat, suggestedLocation.lng]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (leafletMapRef.current as any).setView([suggestedLocation.lat, suggestedLocation.lng], 15, { animate: true });
  }, [suggestedLocation]);

  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ward = getWardForCoordinates(pos.coords.latitude, pos.coords.longitude);
        onLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ward: ward.name,
          zone: ward.zone,
          locality: ward.locality,
          source: "gps",
        });
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        alert("Could not get your location. Using Bengaluru center as default.");
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ExifReader = (await import("exifreader")).default;
      const tags = await ExifReader.load(file);
      const latTag = tags["GPSLatitude"];
      const lngTag = tags["GPSLongitude"];
      const latRef = tags["GPSLatitudeRef"];
      const lngRef = tags["GPSLongitudeRef"];

      if (latTag && lngTag) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let lat = (latTag as any).description as number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let lng = (lngTag as any).description as number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((latRef as any)?.value?.[0] === "S") lat = -lat;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((lngRef as any)?.value?.[0] === "W") lng = -lng;

        const ward = getWardForCoordinates(lat, lng);
        onLocationChange({ lat, lng, ward: ward.name, zone: ward.zone, locality: ward.locality, source: "exif" });
      } else {
        alert("No GPS data found in this photo. Please place the pin manually.");
      }
    } catch {
      alert("Could not read photo metadata. Please place the pin manually.");
    }
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGPSLocate}
          disabled={isLocating}
          className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          {isLocating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Navigation size={14} />
          )}
          {isLocating ? "Locating..." : "Use My Location"}
        </button>
        <label className="flex items-center gap-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium border border-slate-200">
          <Camera size={14} />
          Extract from Photo
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
        </label>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm">
        <div ref={mapRef} style={{ height: "280px", width: "100%" }} />
        {!mapReady && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-blue-500 animate-spin" />
              <span className="text-sm text-slate-500">Loading map...</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-slate-600 shadow">
          Click map or drag pin to set location
        </div>
      </div>

      {/* Location badge */}
      {location ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-blue-800 text-sm">
                📍 {location.zone || "BBMP"} | {location.ward || "Ward identified"}
              </span>
            </div>
            {location.locality && (
              <p className="text-xs text-blue-600 mt-0.5">{location.locality}</p>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 font-mono">
                {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
              </span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                {SOURCE_LABELS[location.source]}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <MapPin size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Click &quot;Use My Location&quot; or click on the map to set the grievance location.
          </p>
        </div>
      )}
    </div>
  );
}
