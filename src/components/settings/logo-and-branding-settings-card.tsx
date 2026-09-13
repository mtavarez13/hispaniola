"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useSystemSettings } from "@/lib/settings-context"
import { useToast } from "@/hooks/use-toast"
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  Palette,
  ExternalLink
} from "lucide-react"

// Preset logo suggestions for quick styling
const PRESET_LOGOS = [
  {
    name: "Emblema Oficial RD-Haití",
    url: "", // Default dual-color vector
    description: "Emblema binacional nativo con siglas HP y gradiente azul y rojo.",
  },
  {
    name: "Fintech Shield Gold",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    description: "Escudo minimalista dorado para banca de inversión y remesas.",
  },
  {
    name: "Caribe Monedero Digital",
    url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80",
    description: "Diseño moderno con tonos caribeños.",
  }
]

export function LogoAndBrandingSettingsCard() {
  const { settings, updateSettings } = useSystemSettings()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState("")
  const [logoText, setLogoText] = useState("HispaniolaPay")
  const [saving, setSaving] = useState(false)
  const [imagePreviewError, setImagePreviewError] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.appLogoUrl || "")
      setLogoText(settings.appLogoText || "HispaniolaPay")
    }
  }, [settings])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: "Por favor selecciona una imagen válida (PNG, JPG, SVG, WebP).",
      })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo muy pesado",
        description: "El tamaño máximo recomendado para el logo es de 2 MB.",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setLogoUrl(result)
      setImagePreviewError(false)
      toast({
        title: "Imagen cargada",
        description: "Logo cargado localmente. Haz clic en 'Guardar Cambios' para aplicarlo.",
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const ok = await updateSettings({
        appLogoUrl: logoUrl.trim(),
        appLogoText: logoText.trim() || "HispaniolaPay",
      })

      if (ok) {
        setLastSaved(new Date().toLocaleTimeString())
        toast({
          title: "¡Logo y Marca Actualizados!",
          description: "Los cambios se han guardado exitosamente y se reflejarán en toda la plataforma.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: "No se pudieron actualizar los ajustes del logo.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: err.message || "Error al actualizar la configuración.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = () => {
    setLogoUrl("")
    setLogoText("HispaniolaPay")
    setImagePreviewError(false)
    toast({
      title: "Valores restablecidos",
      description: "Se restableció el logo y texto a la identidad por defecto. Guarda los cambios para aplicar.",
    })
  }

  return (
    <Card className="border-none shadow-md bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                EXCLUSIVO ADMINISTRADOR
              </Badge>
              <Badge className="bg-blue-500/30 text-blue-300 border-blue-400/30 text-[10px] px-2 py-0.5">
                Identidad Visual
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              Personalización del Logo y Marca
            </CardTitle>
            <CardDescription className="text-slate-300 text-xs mt-1">
              Sube una imagen o ingresa una URL para actualizar el logo oficial que se visualiza en la página pública, barra lateral, comprobantes y login.
            </CardDescription>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 text-xs shadow-md shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {lastSaved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                ¡Logo y nombre de marca guardados exitosamente a las {lastSaved}!
              </span>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px]">Activo</Badge>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Nombre Comercial de la Plataforma
              </Label>
              <Input
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                placeholder="Ejemplo: HispaniolaPay"
                className="font-medium focus-visible:ring-primary h-11"
              />
              <p className="text-[11px] text-slate-500">
                Texto que acompaña al logo en el encabezado y en los recibos de remesa.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> URL de Imagen del Logo
              </Label>
              <div className="flex gap-2">
                <Input
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value)
                    setImagePreviewError(false)
                  }}
                  placeholder="https://ejemplo.com/logo.png o subir imagen"
                  className="font-mono text-xs focus-visible:ring-primary h-11"
                />
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setLogoUrl("")
                      setImagePreviewError(false)
                    }}
                    title="Limpiar imagen"
                    className="h-11 w-11 shrink-0 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* File Upload Box */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">O subir imagen desde tu dispositivo</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 transition-colors p-5 rounded-2xl cursor-pointer flex flex-col items-center justify-center text-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-500 group-hover:text-blue-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Haz clic para cargar tu imagen
                  </span>
                  <span className="text-[11px] text-slate-500">
                    PNG, JPG, SVG o WebP (Recomendado: fondo transparente, hasta 2MB)
                  </span>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
                className="text-xs font-bold gap-1.5 text-slate-600 border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer a Logo Predeterminado
              </Button>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="space-y-4">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" /> Vista Previa en Vivo
            </Label>

            {/* Preview 1: Light Background */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fondo Claro (Navbar, Recibos)
              </span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 border border-slate-200 shadow-xs shrink-0">
                  {logoUrl && !imagePreviewError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="Preview"
                      className="w-full h-full object-contain p-1"
                      onError={() => setImagePreviewError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-700 via-slate-900 to-red-700 text-white flex items-center justify-center font-black text-base">
                      H<span className="w-1 h-3.5 bg-amber-400 rounded-full mx-0.5" />P
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    {logoText.toLowerCase() === "hispaniolapay" ? (
                      <>Hispaniola<span className="text-red-600">Pay</span></>
                    ) : (
                      logoText
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Corredor Financiero Binacional RD ⇄ Haití</span>
                </div>
              </div>
            </div>

            {/* Preview 2: Dark Background */}
            <div className="p-6 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fondo Oscuro (Barra Lateral, Encabezados)
              </span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-slate-900 border border-slate-800 shadow-xs shrink-0">
                  {logoUrl && !imagePreviewError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="Preview"
                      className="w-full h-full object-contain p-1"
                      onError={() => setImagePreviewError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-700 via-slate-900 to-red-700 text-white flex items-center justify-center font-black text-base">
                      H<span className="w-1 h-3.5 bg-amber-400 rounded-full mx-0.5" />P
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xl font-black text-white tracking-tight">
                    {logoText.toLowerCase() === "hispaniolapay" ? (
                      <>Hispaniola<span className="text-red-500">Pay</span></>
                    ) : (
                      logoText
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Terminal Central de Operaciones</span>
                </div>
              </div>
            </div>

            {imagePreviewError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                ⚠️ La URL de imagen proporcionada no pudo cargarse o está bloqueada por CORS. Mostrando emblema vectorial seguro.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
