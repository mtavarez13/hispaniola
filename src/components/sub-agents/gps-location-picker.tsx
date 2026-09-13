"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Crosshair, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface GpsLocationPickerProps {
  lat: number;
  lng: number;
  addressResolved?: string;
  onChange: (coords: { lat: number; lng: number; addressResolved?: string }) => void;
  province?: string;
  municipality?: string;
}

export function GpsLocationPicker({
  lat,
  lng,
  addressResolved,
  onChange,
  province,
  municipality,
}: GpsLocationPickerProps) {
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("La geolocalización no está soportada en este navegador.");
      return;
    }

    setDetecting(true);
    setGeoError(null);
    setGeoSuccess(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = Number(position.coords.latitude.toFixed(6));
        const newLng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);

        onChange({
          lat: newLat,
          lng: newLng,
          addressResolved: `Detectado por GPS (precisión ±${accuracy}m)`,
        });

        setDetecting(false);
        setGeoSuccess(true);
        setTimeout(() => setGeoSuccess(false), 4000);
      },
      (error) => {
        setDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Permiso de ubicación denegado por el navegador.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError("La señal GPS no está disponible.");
        } else {
          setGeoError("Tiempo de espera agotado al consultar GPS.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange({ lat: val, lng, addressResolved });
    }
  };

  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange({ lat, lng: val, addressResolved });
    }
  };

  // Static preview using OpenStreetMap static tiles or stylized SVG visualizer
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Coordenadas GPS de la Sucursal</h4>
            <p className="text-[11px] text-muted-foreground">
              Ubicación exacta para validación en campo, auditorías y mapas de subagentes.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleGetCurrentLocation}
          disabled={detecting}
          className="h-8 text-xs font-semibold gap-1.5 bg-background hover:bg-muted shrink-0"
        >
          {detecting ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Crosshair className="h-3.5 w-3.5 text-primary" />
          )}
          <span>{detecting ? "Localizando..." : "Detectar GPS Actual"}</span>
        </Button>
      </div>

      {geoError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {geoSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>¡Coordenadas GPS obtenidas con éxito desde el dispositivo!</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            Latitud (Norte/Sur)
          </Label>
          <div className="relative">
            <Input
              type="number"
              step="any"
              value={lat || ""}
              onChange={handleLatChange}
              placeholder="Ej: 18.486100"
              className="h-9 text-xs font-mono pr-8"
            />
            <span className="absolute right-2.5 top-2.5 text-[10px] text-muted-foreground font-mono">°N</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            Longitud (Este/Oeste)
          </Label>
          <div className="relative">
            <Input
              type="number"
              step="any"
              value={lng || ""}
              onChange={handleLngChange}
              placeholder="Ej: -69.931200"
              className="h-9 text-xs font-mono pr-8"
            />
            <span className="absolute right-2.5 top-2.5 text-[10px] text-muted-foreground font-mono">°W</span>
          </div>
        </div>
      </div>

      {/* Visual Map Frame / Satellite Preview */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/40 h-44">
        {lat && lng ? (
          <>
            <iframe
              title="Mini Mapa Subagente"
              src={osmEmbedUrl}
              className="w-full h-full border-0 pointer-events-none opacity-90"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-md border border-border text-[11px] text-foreground shadow-sm">
                <Navigation className="h-3 w-3 text-accent" />
                <span className="font-mono font-medium">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                {province && (
                  <Badge variant="secondary" className="text-[10px] h-4 ml-1 px-1.5">
                    {province}
                  </Badge>
                )}
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-sm transition-colors"
              >
                <span>Abrir en Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs p-4 text-center">
            <MapPin className="h-8 w-8 mb-1.5 text-muted-foreground/40" />
            <span>Seleccione una provincia o detecte su ubicación para ver el mapa</span>
          </div>
        )}
      </div>
    </div>
  );
}
