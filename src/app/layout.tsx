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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
  // Se cobra parada en la calle: que un doble tap no haga zoom sobre el botón.
  maximumScale: 1,
};

/**
 * Aplica el tema ANTES de que el navegador pinte.
 *
 * Sin esto la pantalla arranca en un tema y salta al otro apenas hidrata: el
 * flash blanco al abrir la app de noche. Va como script bloqueante a propósito
 * — son tres líneas y corren en microsegundos.
 */
const TEMA_INICIAL = `
try {
  var t = localStorage.getItem('lithium-tema');
  var oscuro = t ? t === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', oscuro);
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-AR"
      // `suppressHydrationWarning`: el script de arriba toca la clase de <html>
      // antes de que React hidrate, así que el server y el cliente difieren a
      // propósito en ese atributo.
      suppressHydrationWarning
      className={`h-full ${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
