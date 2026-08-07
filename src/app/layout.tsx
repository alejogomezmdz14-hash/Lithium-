import type { Metadata, Viewport } from "next";
import { Archivo, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// **Bricolage Grotesque** para los titulares y los números grandes. Es variable
// —se le puede apretar el ancho— y tiene rarezas de dibujo que se ven a 44px y
// desaparecen a 14: exactamente donde hace falta carácter y donde no. Es lo que
// hace que la pantalla no se lea como una plantilla.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// **Archivo** para toda la interfaz. Grotesca de verticales duras, dibujada para
// texto chico y con tildes y eñes bien resueltas — que en castellano no es un
// detalle. Descartadas Inter (el uniforme de todo dashboard generado) e IBM Plex
// Sans (la default de "app de banco", que es justo lo que no queremos parecer).
const archivo = Archivo({
  variable: "--font-archivo",
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
  // Son los dos `--base-alta`, el color de ARRIBA del degradé de fondo — que es
  // el que toca la barra de estado. Si no coinciden, el teléfono arranca con una
  // franja de un color que no es de ninguna pantalla.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E7EAF0" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1017" },
  ],
  // Sin `maximumScale: 1`. Ese atajo evitaba que el doble tap hiciera zoom sobre
  // un botón, pero de paso le sacaba el pinch-zoom a todo el mundo — incluida
  // quien necesita agrandar para leer (WCAG 1.4.4). Lo que apaga el doble tap y
  // nada más es `touch-action: manipulation`, que va sobre los controles en
  // `globals.css`.
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
      className={`h-full ${archivo.variable} ${bricolage.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
      </head>
      {/* Sin `antialiased`: el suavizado va por `-webkit-font-smoothing:
          var(--suavizado)` en `globals.css`, que es el mecanismo por el que el
          ajuste óptico depende del tema sin que exista una sola regla de CSS
          condicionada por tema. Una clase acá lo pisaría en los dos. */}
      <body className="min-h-full">{children}</body>
    </html>
  );
}
