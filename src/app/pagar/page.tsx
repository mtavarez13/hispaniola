"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Smartphone, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLogo } from "@/components/brand/app-logo";

function PaymentLink() {
  const params = useSearchParams();
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => String(params.get("to") || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30), [params]);
  const deepLink = `hispaniolapay://pay?to=${encodeURIComponent(code)}`;

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 px-5 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md border-white/20 shadow-2xl">
        <CardHeader className="items-center text-center">
          <AppLogo size="xl" showText={false} clickable={false} />
          <CardTitle className="text-2xl font-black">Recibir con HispaniolaPay</CardTitle>
          <CardDescription>Envío seguro entre clientes y subagentes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {code ? <>
            <div className="rounded-2xl border bg-blue-50 p-5 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-700">Código del destinatario</div>
              <div className="mt-2 break-all font-mono text-3xl font-black text-slate-950">{code}</div>
            </div>
            <Button className="h-12 w-full gap-2" asChild><a href={deepLink}><Smartphone className="h-5 w-5" /> Abrir en la aplicación</a></Button>
            <Button variant="outline" className="h-12 w-full gap-2" onClick={copy}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? "Código copiado" : "Copiar código"}</Button>
            <p className="text-center text-xs text-muted-foreground">Confirma el nombre del destinatario dentro de la aplicación antes de completar el pago.</p>
          </> : <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Este enlace no contiene un código de cliente válido.</div>}
          <Button variant="ghost" className="w-full gap-2" asChild><Link href="/login"><WalletCards className="h-5 w-5" /> Iniciar sesión en HispaniolaPay</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function PayPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-950" />}><PaymentLink /></Suspense>;
}
