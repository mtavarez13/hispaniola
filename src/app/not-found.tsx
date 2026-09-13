"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F2F5FB] flex flex-col items-center justify-center p-4 text-center">
      <div className="space-y-4 max-w-md">
        <h1 className="text-6xl font-black text-primary">404</h1>
        <h2 className="text-2xl font-bold text-foreground">Página no encontrada</h2>
        <p className="text-muted-foreground">
          La página que estás buscando no existe o ha sido movida.
        </p>
        <Link href="/" className="inline-block pt-4">
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-6">
            Volver al Inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
