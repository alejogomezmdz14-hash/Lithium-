import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Instrument Sans: set latino completo y ascendentes con aire para las tildes
// (vencía, Suárez, próximo). Descartados Inter (default) y Geist (lee a plantilla).
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// IBM Plex Mono: tabulares reales y cero SIN barrar — el cero barrado en una
// columna de plata lee "terminal", no "dinero".
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lithium",
  description: "La cartera de préstamos de Candela: a quién cobrarle y a quién prestarle.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  // Se cobra parada en la calle: que un doble tap no haga zoom sobre el botón.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-AR"
      className={`dark h-full ${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
