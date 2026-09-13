import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n/context";
import { AuthProvider } from "@/lib/auth-context";
import { SettingsProvider } from "@/lib/settings-context";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'HispaniolaPay | Remesas RD ⇄ Haití: Banreservas, BHD, Popular a MonCash y Natcash',
  description: 'Envía desde Banreservas, Banco BHD y Banco Popular con recepción instantánea en Haití por MonCash y Natcash. Conexión binacional segura y comprobantes térmicos Qik.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} font-body antialiased selection:bg-accent/30 selection:text-primary`}>
        <AuthProvider>
          <SettingsProvider>
            <I18nProvider>
              {children}
              <Toaster />
            </I18nProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
