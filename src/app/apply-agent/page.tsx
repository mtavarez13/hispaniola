"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building2, MapPin, User, Phone, Mail, CheckCircle2, Navigation } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function ApplyAgentPage() {
  const { t } = useI18n()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    businessName: "",
    businessType: "",
    yearsOp: "",
    country: "DO",
    state: "",
    address: "",
    gps: ""
  })

  // Mock list of states/provinces
  const locations: Record<string, string[]> = {
    "DO": [
      "Distrito Nacional", "Santo Domingo", "Santiago", "La Altagracia", "Puerto Plata", "La Romana", "San Pedro de Macorís", "Duarte", "La Vega"
    ],
    "HT": [
      "Ouest (Port-au-Prince)", "Nord", "Artibonite", "Nord-Ouest", "Sud", "Sud-Est", "Grand'Anse", "Nippes", "Centre", "Nord-Est"
    ]
  }

  const handleGetGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setFormData({ ...formData, gps: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
        toast({
          title: "Ubicación obtenida",
          description: "Tus coordenadas han sido registradas correctamente.",
        });
      }, (error) => {
        console.error("Geolocation error:", error);
        toast({
          variant: "destructive",
          title: "Error de ubicación",
          description: "No pudimos acceder a tu GPS. Por favor, ingrésalo manualmente.",
        });
      });
    } else {
      toast({
        variant: "destructive",
        title: "No soportado",
        description: "Tu navegador no soporta geolocalización.",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast({
        title: t('form_success_title'),
        description: t('form_success_desc'),
      });
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F2F5FB] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-none shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-primary">{t('form_success_title')}</h1>
            <p className="text-muted-foreground">{t('form_success_desc')}</p>
          </div>
          <Link href="/" className="block">
            <Button className="w-full bg-primary h-12 font-bold rounded-xl">Volver al Inicio</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F5FB] py-12 px-4">
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-border h-16 flex items-center px-4">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-sm">H</div>
            <span className="font-black text-primary text-xl hidden sm:block">Hispaniola Pay</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Volver
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto pt-16 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-primary tracking-tight">{t('apply_agent_title')}</h1>
          <p className="text-muted-foreground text-lg">{t('apply_agent_desc')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-secondary/50">
              <CardTitle className="flex items-center gap-2 text-primary">
                <User className="w-5 h-5 text-accent" />
                {t('form_personal_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="fullName">{t('form_full_name')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="fullName" 
                    placeholder="Juan Pérez" 
                    className="pl-10" 
                    required 
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="phone">{t('form_phone')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      placeholder="+1 (809) 000-0000" 
                      className="pl-10" 
                      required 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('form_email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="email@ejemplo.com" 
                      className="pl-10" 
                      required 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Info */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-secondary/50">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Building2 className="w-5 h-5 text-accent" />
                {t('form_business_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="businessName">{t('form_business_name')}</Label>
                <Input 
                  id="businessName" 
                  placeholder="Ej: Colmado El Sol" 
                  required 
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="businessType">{t('form_business_type')}</Label>
                  <Select value={formData.businessType} onValueChange={(v) => setFormData({...formData, businessType: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Comercio Detallista</SelectItem>
                      <SelectItem value="pharmacy">Farmacia</SelectItem>
                      <SelectItem value="grocery">Colmado / Bodega</SelectItem>
                      <SelectItem value="services">Servicios Generales</SelectItem>
                      <SelectItem value="other">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="yearsOp">{t('form_years_op')}</Label>
                  <Input 
                    id="yearsOp" 
                    type="number" 
                    placeholder="Ej: 5" 
                    required 
                    value={formData.yearsOp}
                    onChange={(e) => setFormData({...formData, yearsOp: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Info */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-secondary/50">
              <CardTitle className="flex items-center gap-2 text-primary">
                <MapPin className="w-5 h-5 text-accent" />
                {t('form_location_info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="country">{t('form_country')}</Label>
                  <Select value={formData.country} onValueChange={(v) => setFormData({...formData, country: v, state: ""})}>
                    <SelectTrigger>
                      <SelectValue placeholder="País" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DO">República Dominicana</SelectItem>
                      <SelectItem value="HT">Haití</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">{t('form_state')}</Label>
                  <Select value={formData.state} onValueChange={(v) => setFormData({...formData, state: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations[formData.country].map((loc) => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">{t('form_address')}</Label>
                <Input 
                  id="address" 
                  placeholder="Calle, número, sector..." 
                  required 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gps">{t('form_gps')}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Navigation className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="gps" 
                      placeholder="Lat, Long" 
                      className="pl-10" 
                      required 
                      value={formData.gps}
                      onChange={(e) => setFormData({...formData, gps: e.target.value})}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleGetGPS} className="gap-2 border-accent text-accent">
                    <Navigation className="w-4 h-4" /> {t('form_get_gps')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-16 bg-accent hover:bg-accent/90 text-white font-black text-xl rounded-2xl shadow-xl shadow-accent/20"
          >
            {loading ? "Enviando..." : t('form_submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
