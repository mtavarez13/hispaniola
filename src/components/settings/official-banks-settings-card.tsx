"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSystemSettings, DEFAULT_OFFICIAL_BANK_ACCOUNTS } from "@/lib/settings-context"
import { OfficialBankAccount } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { 
  Landmark, 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  Save, 
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from "lucide-react"

// Popular Dominican bank presets to accelerate admin entry
const DOMINICAN_BANK_PRESETS = [
  { name: "Banco de Reservas (Banreservas)", color: "#002F6C" },
  { name: "Banco BHD", color: "#008852" },
  { name: "Banco Popular Dominicano", color: "#003882" },
  { name: "Banco Santa Cruz", color: "#005596" },
  { name: "Scotiabank República Dominicana", color: "#EC111A" },
  { name: "Banco Promerica", color: "#006837" },
  { name: "Banco BDI", color: "#0A2540" },
  { name: "Banco Caribe", color: "#FF6A00" },
  { name: "Qik Banco Digital", color: "#7B2CBF" },
]

export function OfficialBanksSettingsCard() {
  const { settings, updateSettings } = useSystemSettings()
  const { toast } = useToast()

  const [accounts, setAccounts] = useState<OfficialBankAccount[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<OfficialBankAccount | null>(null)

  // Form State inside Dialog
  const [formBankName, setFormBankName] = useState("")
  const [formAccountNumber, setFormAccountNumber] = useState("")
  const [formAccountType, setFormAccountType] = useState<'corriente' | 'ahorros'>("corriente")
  const [formCurrency, setFormCurrency] = useState<'DOP' | 'USD'>("DOP")
  const [formHolderName, setFormHolderName] = useState("Hispaniola Pay SRL")
  const [formDocumentId, setFormDocumentId] = useState("RNC: 1-32-84910-2")
  const [formInstructions, setFormInstructions] = useState("")
  const [formActive, setFormActive] = useState(true)
  const [formLogoColor, setFormLogoColor] = useState("#002F6C")

  useEffect(() => {
    if (settings?.officialBankAccounts && settings.officialBankAccounts.length > 0) {
      setAccounts(settings.officialBankAccounts)
    } else {
      setAccounts(DEFAULT_OFFICIAL_BANK_ACCOUNTS)
    }
  }, [settings])

  const openCreateDialog = () => {
    setEditingAccount(null)
    setFormBankName("Banco de Reservas (Banreservas)")
    setFormAccountNumber("")
    setFormAccountType("corriente")
    setFormCurrency("DOP")
    setFormHolderName("Hispaniola Pay SRL")
    setFormDocumentId("RNC: 1-32-84910-2")
    setFormInstructions("Transferencia ACH / Pagos al Instante BCRD")
    setFormActive(true)
    setFormLogoColor("#002F6C")
    setIsDialogOpen(true)
  }

  const openEditDialog = (account: OfficialBankAccount) => {
    setEditingAccount(account)
    setFormBankName(account.bankName)
    setFormAccountNumber(account.accountNumber)
    setFormAccountType(account.accountType)
    setFormCurrency(account.currency)
    setFormHolderName(account.holderName)
    setFormDocumentId(account.documentId)
    setFormInstructions(account.instructions || "")
    setFormActive(account.active)
    setFormLogoColor(account.logoColor || "#002F6C")
    setIsDialogOpen(true)
  }

  const handlePresetSelect = (presetName: string) => {
    setFormBankName(presetName)
    const preset = DOMINICAN_BANK_PRESETS.find((p) => p.name === presetName)
    if (preset) {
      setFormLogoColor(preset.color)
    }
  }

  const handleSaveAccountForm = () => {
    if (!formBankName.trim() || !formAccountNumber.trim() || !formHolderName.trim()) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor completa el nombre del banco, número de cuenta y titular.",
      })
      return
    }

    if (editingAccount) {
      // Update existing
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === editingAccount.id
            ? {
                ...acc,
                bankName: formBankName.trim(),
                accountNumber: formAccountNumber.trim(),
                accountType: formAccountType,
                currency: formCurrency,
                holderName: formHolderName.trim(),
                documentId: formDocumentId.trim(),
                instructions: formInstructions.trim(),
                active: formActive,
                logoColor: formLogoColor,
              }
            : acc
        )
      )
    } else {
      // Add new
      const newAcc: OfficialBankAccount = {
        id: `bank-${Date.now()}`,
        bankName: formBankName.trim(),
        accountNumber: formAccountNumber.trim(),
        accountType: formAccountType,
        currency: formCurrency,
        holderName: formHolderName.trim(),
        documentId: formDocumentId.trim(),
        instructions: formInstructions.trim(),
        active: formActive,
        logoColor: formLogoColor,
      }
      setAccounts((prev) => [...prev, newAcc])
    }

    setIsDialogOpen(false)
    toast({
      title: editingAccount ? "Cuenta modificada" : "Cuenta agregada",
      description: "Recuerda presionar 'Guardar Cuentas Oficiales' para sincronizar con la base de datos.",
    })
  }

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    toast({
      title: "Cuenta eliminada",
      description: "La cuenta ha sido removida de la lista.",
    })
  }

  const handleToggleActive = (id: string, current: boolean) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !current } : a))
    )
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const ok = await updateSettings({
        officialBankAccounts: accounts,
      })

      if (ok) {
        setLastSaved(new Date().toLocaleTimeString())
        toast({
          title: "¡Cuentas Bancarias Guardadas!",
          description: "Las cuentas oficiales dominicanas están actualizadas y disponibles para los clientes y sub-agentes.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: "No se pudieron actualizar las cuentas bancarias.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al sincronizar con el servidor.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreDefaults = () => {
    setAccounts(DEFAULT_OFFICIAL_BANK_ACCOUNTS)
    toast({
      title: "Valores restaurados",
      description: "Se cargaron las cuentas bancarias predeterminadas (Banreservas, BHD, Popular). Guarda los cambios para aplicar.",
    })
  }

  const handleCopyTest = (acc: OfficialBankAccount) => {
    navigator.clipboard.writeText(acc.accountNumber)
    setCopiedId(acc.id)
    toast({
      title: "Número copiado",
      description: `${acc.accountNumber} copiado correctamente.`,
    })
    setTimeout(() => setCopiedId(null), 2000)
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
              <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/30 text-[10px] px-2 py-0.5">
                Cuentas de Depósito Oficiales
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-400" />
              Cuentas Oficiales de Bancos Dominicanos
            </CardTitle>
            <CardDescription className="text-slate-300 text-xs mt-1">
              Configura las cuentas bancarias de la República Dominicana donde los clientes y subagentes depositan dinero para las remesas. Estas cuentas son copiables con 1 clic para su facilidad.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={openCreateDialog}
              variant="outline"
              className="border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              Nueva Cuenta
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 text-xs shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Cuentas"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {lastSaved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                ¡Cuentas bancarias sincronizadas con éxito a las {lastSaved}!
              </span>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px]">Sincronizado</Badge>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800">{accounts.length}</span> cuentas configuradas (
            <span className="text-emerald-700 font-semibold">{accounts.filter(a => a.active).length} activas</span>)
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestoreDefaults}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 h-8 gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Valores por Defecto (Banreservas, BHD, Popular)
          </Button>
        </div>

        {/* Accounts List / Table */}
        <div className="space-y-3">
          {accounts.map((account) => {
            const isCopied = copiedId === account.id

            return (
              <div
                key={account.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  account.active
                    ? "bg-white border-slate-200 hover:border-blue-400 shadow-xs"
                    : "bg-slate-50/70 border-slate-200/60 opacity-60"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black shadow-xs shrink-0"
                    style={{ backgroundColor: account.logoColor || "#002F6C" }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{account.bankName}</h4>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase ${
                          account.currency === "USD"
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                            : "border-blue-500 text-blue-700 bg-blue-50"
                        }`}
                      >
                        {account.currency}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {account.accountType}
                      </Badge>
                      {!account.active && (
                        <Badge variant="destructive" className="text-[10px]">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        <span>No. {account.accountNumber}</span>
                        <button
                          onClick={() => handleCopyTest(account)}
                          className="hover:text-blue-600 ml-1"
                          title="Probar copiado de cuenta"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span>•</span>
                      <span>Titular: <strong>{account.holderName}</strong></span>
                      <span>•</span>
                      <span>{account.documentId}</span>
                    </div>
                    {account.instructions && (
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        Nota: {account.instructions}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <div className="flex items-center gap-2 mr-2">
                    <Label htmlFor={`active-${account.id}`} className="text-xs text-slate-500 cursor-pointer">
                      {account.active ? "Visible" : "Oculta"}
                    </Label>
                    <Switch
                      id={`active-${account.id}`}
                      checked={account.active}
                      onCheckedChange={() => handleToggleActive(account.id, account.active)}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(account)}
                    className="h-8 px-2.5 text-xs font-semibold gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          {accounts.length === 0 && (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-2xl">
              No hay cuentas agregadas. Haz clic en &ldquo;Nueva Cuenta&rdquo; para registrar una cuenta bancaria oficial.
            </div>
          )}
        </div>
      </CardContent>

      {/* DIALOG FOR CREATING / EDITING BANK ACCOUNT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] !bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              {editingAccount ? "Editar Cuenta Bancaria Oficial" : "Registrar Nueva Cuenta Bancaria Dominicana"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Esta cuenta se mostrará en la calculadora y en las terminales de envío para que los clientes depositen fondos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Quick Preset Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Seleccionar Banco Dominicano</Label>
              <Select value={formBankName} onValueChange={handlePresetSelect}>
                <SelectTrigger className="font-medium h-10">
                  <SelectValue placeholder="Seleccionar Banco" />
                </SelectTrigger>
                <SelectContent>
                  {DOMINICAN_BANK_PRESETS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Otro Banco">Otro Banco / Entidad Financiera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formBankName === "Otro Banco" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nombre Personalizado del Banco</Label>
                <Input
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                  placeholder="Ejemplo: Banco Ademi"
                  className="h-10"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Número de Cuenta (Copiable)</Label>
                <Input
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value)}
                  placeholder="Ej: 960-2481029-3"
                  className="font-mono font-bold text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tipo de Cuenta</Label>
                <Select
                  value={formAccountType}
                  onValueChange={(v: 'corriente' | 'ahorros') => setFormAccountType(v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corriente">Cuenta Corriente</SelectItem>
                    <SelectItem value="ahorros">Cuenta de Ahorros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Moneda</Label>
                <Select
                  value={formCurrency}
                  onValueChange={(v: 'DOP' | 'USD') => setFormCurrency(v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOP">DOP - Pesos Dominicanos (RD$)</SelectItem>
                    <SelectItem value="USD">USD - Dólares Estadounidenses ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Color del Logo</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formLogoColor}
                    onChange={(e) => setFormLogoColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                  />
                  <Input
                    value={formLogoColor}
                    onChange={(e) => setFormLogoColor(e.target.value)}
                    className="font-mono text-xs h-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nombre del Titular / Razón Social</Label>
              <Input
                value={formHolderName}
                onChange={(e) => setFormHolderName(e.target.value)}
                placeholder="Ejemplo: Hispaniola Pay SRL"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">RNC o Cédula de Identidad</Label>
              <Input
                value={formDocumentId}
                onChange={(e) => setFormDocumentId(e.target.value)}
                placeholder="Ej: RNC: 1-32-84910-2"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Instrucciones o Concepto para el Cliente (Opcional)</Label>
              <Input
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder="Ej: Colocar número de WhatsApp o ID de remesa en el detalle"
                className="h-10"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Cuenta Activa</span>
                <span className="text-[11px] text-slate-500">
                  Visible en la calculadora pública y terminales de envío
                </span>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveAccountForm} className="bg-primary text-white font-bold text-xs">
              {editingAccount ? "Guardar Cambios" : "Agregar Cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
