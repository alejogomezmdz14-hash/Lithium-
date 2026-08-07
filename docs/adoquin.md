# Lithium — **Adoquín**. Spec de interfaz, definitiva

> Dirección ganadora: Adoquín, con los injertos que el jurado pidió robar de El Extracto y de Renglón. Esto no es un menú de opciones: es lo que hay que construir. Donde hubo desacuerdo entre las tres direcciones, acá ya está zanjado y está el motivo al lado.

**El POV, en una línea:** la pantalla es una calle empedrada — bloques macizos soldados entre sí por juntas de 2px, y lo único que se despega del piso es lo que hay que tocar ahora.

---

## 0. Antes de tocar una línea de token: la prueba de la vereda

Las tres direcciones apostaron su decisión más riesgosa sin verificarla, nombraron el test de 90 segundos que la resolvía, y lo agendaron **después** de reescribir quince archivos. Ese es el error que comparten y acá se corrige primero.

**Paso 0 (media hora, descartable).** Crear `src/app/prueba/page.tsx` — ruta sin auth, sin shell, que se borra el mismo día. Renderiza **el mismo grupo de VENCIDOS con datos reales** (tres personas, una con nota, montos de verdad), tres veces, con las tres variantes que están en duda:

| Variante | Qué se prueba | Fallback ya escrito si falla |
|---|---|---|
| **A** — junta de 2px vs junta de 4px | ¿Se ve dónde termina Marta y empieza Jorge, al sol? | `--junta: 4px`. No cambia nada más del sistema. |
| **B** — piedra de tinta vs piedra blanca, en tema **claro** | ¿Lee "la app se rompió"? | `--piedra: #FFFFFF` en claro. El escalón, la soldadura y la escala siguen igual. |
| **C** — píldora fantasma vs link de texto vs barra llena en todas | ¿Sabe cuál tocar? ¿Sabe que la fantasma se toca? | Si duda de la fantasma: los rellenos se reparten **por grupo** (uno en VENCIDOS, uno en HOY) en vez de uno por pantalla. |

Se abre **en el teléfono de ella, afuera, entre las 13 y las 15, brillo al máximo**. Tres preguntas, en este orden y sin ayudarla: *¿a quién tenés que ir a ver primero? ¿la línea entre Marta y Jorge la ves? ¿el bloque oscuro te parece que la app cargó mal?*

Los números de contraste de esta spec están calculados sobre un monitor. Candela cobra en la vereda de Orán con un teléfono lleno de huellas. Ninguna cifra de acá vale más que esos 90 segundos.

**Paso 1 — el orden de trabajo, que tampoco es parejo.** Su trabajo son dos pantallas: `Por pagar` y el sheet de cobro. El resto lo mira una vez por semana sentada. Se construyen en este orden y las ocho restantes salen del molde:

1. `globals.css` + los primitivos de §3 (§3 entero, de una).
2. `/por-pagar` y `/cobrar/[id]`. **Se cierran bien, se prueban afuera, y recién ahí se sigue.**
3. `/prestamo/[id]` (usa el escalón otra vez) → `/` Resumen → `/clientes` → ficha de cliente.
4. Los formularios (`/nuevo-prestamo`, `/nuevo-cliente`), `/login`, `/usuarios`.
5. Los estados de error (§4.11). No al final "si queda tiempo": es el momento en que ella más necesita creerle a la pantalla.

---

## 1. `src/app/globals.css` — el archivo completo

**Regla nueva, lintable, que mata el bug 1 en su mecanismo y no en su síntoma:**

> En `globals.css`, `:root` **solo declara custom properties**. Nunca una regla de estilo. Toda diferencia entre temas es un **valor de variable**, jamás un selector.

Hoy hay dos violaciones y las dos son bugs: `:root .bg-card { border: 1px }` y `:root body { font-weight: 450 }` se aplican en **los dos** temas, porque `:root` siempre matchea `<html>`. Si alguna vez hiciera falta una regla solo-claro, el selector correcto es `html:not(.dark)` — pero en este sistema no hay ninguna, y el único ajuste que sí depende del tema (`-webkit-font-smoothing`) se resuelve con una variable, no con un selector. Cero excepciones = cero superficie donde el bug vuelva.

Los nombres de las variables cambian a los materiales. Es a propósito: `bg-card` deja de compilar, así que la costumbre del dedo se rompe **ruidosamente** el primer día en vez de silenciosamente en el commit 40.

```css
@import "tailwindcss";

/* ---------------------------------------------------------------------------
   Lithium — Adoquín. Cuatro materiales, nombrados, un significado cada uno.

   LA REGLA QUE LOS ORDENA: el peso de un bloque es su DISTANCIA DE LUMINANCIA
   al canvas (ΔL* de CIELAB). Sirve en los dos temas porque la distancia es
   absoluta: en oscuro los bloques suben, en claro bajan. El blanco es el techo;
   en un stack de filas blancas la que salta es la gris.

   Ese es el arreglo del bug de hoy, donde --fondo y --elevado eran los dos
   #f4f4f6 (ΔL* 0.00) y el único mecanismo de la app para decir "actuá acá" no
   existía en claro.

   :root SOLO declara custom properties. Nunca una regla de estilo.
   Nunca un hex suelto en un componente: siempre un token de acá.
--------------------------------------------------------------------------- */

:root {
  color-scheme: light;
  --suavizado: auto;

  /* --- materiales (claro) --------------------------------------------------
     L*: calle 93.15 · adoquín 100 · piedra 6.05 · escalón 85.86
     ΔL*: calle→adoquín +6.85 · adoquín→ESCALÓN −14.14 · calle→piedra −87.10 */
  --calle:   #EBEBEF;  /* canvas */
  --adoquin: #FFFFFF;  /* toda fila y todo bloque de contenido */
  --piedra:  #131318;  /* TINTA. El bloque héroe, uno por pantalla. 15.57:1 */
  --escalon: #D6D6DF;  /* la fila accionable, una por pantalla. BAJA, no sube */

  /* --- texto --------------------- s/calle · s/adoquín · s/escalón --------- */
  --texto:       #0C0C10;  /* 16.42 · 19.52 · 13.52 */
  --texto-suave: #57575F;  /*  6.02 ·  7.16 ·  4.96 */
  --texto-tenue: #68686F;  /*  4.65 ·  5.53 ·  3.83 → PROHIBIDO sobre escalón */

  /* --- marca --------------------------------------------------------------- */
  --marca:        #1D63D2;  /* relleno. Blanco encima: 5.57:1. Igual en los dos temas */
  --sobre-marca:  #FFFFFF;
  --marca-texto:  #1550B4;  /*  6.22 ·  7.40 ·  5.12 */
  --marca-linea:  #7FA6E4;  /* borde 1px de la píldora fantasma: 2.48 s/adoquín */
  --foco:         #1D63D2;  /* ring 2px: 4.69 s/calle · 5.57 s/adoquín · 3.86 s/escalón */

  /* --- señales ------------------------------------------------------------- */
  --peligro:      #B01818;  /*  5.91 ·  7.02 ·  4.86  (urgencia + Mal pagador) */
  --destructivo:  #A31410;  /*  6.63 ·  7.88 ·  5.46  (borrar. Blanco encima 7.88) */
  --sobre-destructivo: #FFFFFF;
  --atencion:     #874A00;  /*  5.87 ·  6.98 ·  4.83  (Ojo, "llegó tarde") */
  --exito:        #0B6640;  /*  5.91 ·  7.03 ·  4.87  (Confiable, ✓ cobrada) */
  --scrim: rgb(0 0 0 / 0.55);
}

.dark {
  color-scheme: dark;
  --suavizado: antialiased;

  /* L*: calle 2.23 · adoquín 7.44 · piedra 13.50 · escalón 21.15
     ΔL*: calle→adoquín +5.21 · adoquín→ESCALÓN +13.71 · calle→piedra +11.26

     La piedra NO se invierte a blanco: un bloque casi blanco de 148px de noche
     es una linterna en la cara. En oscuro gana peso por tamaño y radio y se
     conforma con ΔL* 11.26. Es la única asimetría del sistema y tiene motivo
     físico, no capricho. */
  --calle:   #08080A;
  --adoquin: #16161B;
  --piedra:  #222229;
  --escalon: #32323C;

  --texto:       #FAFAFA;  /* 19.17 · 17.27 · 12.14 */
  --texto-suave: #ADADB6;  /*  8.99 ·  8.10 ·  5.69 */
  --texto-tenue: #8A8A96;  /*  5.87 ·  5.29 ·  3.72 → PROHIBIDO sobre escalón */

  --marca:        #1D63D2;
  --sobre-marca:  #FFFFFF;
  --marca-texto:  #35C4D4;  /*  9.53 ·  8.58 ·  6.03 */
  --marca-linea:  #2A6BA0;  /* 3.18 s/adoquín */
  --foco:         #35C4D4;  /* el cian sobre el escalón CLARO da 1.45: por eso el foco es por tema */

  --peligro:      #FCA5A5;  /* 10.54 ·  9.50 ·  6.68 */
  --destructivo:  #F87171;  /*  7.23 ·  6.52 ·  4.58 */
  --sobre-destructivo: #08080A;
  --atencion:     #F59E0B;  /*  9.32 ·  8.40 ·  5.90 */
  --exito:        #34D399;  /* 10.41 ·  9.38 ·  6.59 */
  --scrim: rgb(0 0 0 / 0.6);
}

/* ---------------------------------------------------------------------------
   LA PIEDRA TIENE SU PROPIA PALETA INTERNA Y ES INCONDICIONAL.

   Injerto de El Extracto, corregido: se declara UNA vez, sin `.dark` ni
   `html:not(.dark)` adelante. El bloque héroe es oscuro en los dos temas
   (#131318 en claro, #222229 en oscuro) así que su texto puede ser el mismo
   siempre. Un solo componente, una sola paleta adentro, y "levantado" deja de
   depender de que dos tokens no colisionen: no puede volver a desaparecer.

   Funciona porque `@theme inline` compila `text-texto` a `color: var(--texto)`:
   redeclarar la variable acá voltea todos los hijos sin tocar un componente.

   Contrastes medidos ADENTRO de la piedra (claro / oscuro):
     texto 17.74 / 15.14 · suave 8.32 / 7.10 · peligro 9.76 / 8.33
     cian  8.82 / 7.52 · éxito 9.63 / 8.22 · atención 8.62 / 7.36
--------------------------------------------------------------------------- */
.piedra {
  --texto:       #FAFAFA;
  --texto-suave: #ADADB6;
  --texto-tenue: #8A8A96;  /* prohibido igual: adentro de la piedra no vive nada ornamental */
  --marca-texto: #35C4D4;
  --peligro:     #FCA5A5;
  --atencion:    #F59E0B;
  --exito:       #34D399;
  --destructivo: #F87171;
  --foco:        #35C4D4;
}

@theme inline {
  --color-calle:   var(--calle);
  --color-adoquin: var(--adoquin);
  --color-piedra:  var(--piedra);
  --color-escalon: var(--escalon);

  --color-texto:       var(--texto);
  --color-texto-suave: var(--texto-suave);
  --color-texto-tenue: var(--texto-tenue);

  --color-marca:       var(--marca);
  --color-sobre-marca: var(--sobre-marca);
  --color-marca-texto: var(--marca-texto);
  --color-marca-linea: var(--marca-linea);

  --color-peligro:     var(--peligro);
  --color-destructivo: var(--destructivo);
  --color-sobre-destructivo: var(--sobre-destructivo);
  --color-atencion:    var(--atencion);
  --color-exito:       var(--exito);
  --color-scrim:       var(--scrim);

  /* --- radios: el radio es un RANGO, no una decoración ---------------------
     El default es 0. Cualquier radio hay que pedirlo por nombre, así un
     `rounded-*` accidental se ve mal a la primera. `rounded-sm|lg|xl` ya no
     existen: el `rounded-xl` de 21px que hoy está en 40 lugares deja de
     compilar y hay que decidir a qué clase de objeto pertenece cada uso. */
  --radius: 0px;
  --radius-piedra: 1.75rem;   /* 28px — el bloque héroe. UNA vez por pantalla */
  --radius-losa:   1.125rem;  /* 18px — SOLO las esquinas exteriores de un grupo soldado */
  --radius-campo:  0.75rem;   /* 12px — inputs, selects, celdas de segmentado */
  --radius-tira:   0.25rem;   /* 4px  — segmentos de la tira y skeletons */
  --radius-pill:   9999px;    /* SOLO los 4 botones que registran plata */

  /* --- geometría compartida entre rutas (injerto de Renglón) --------------- */
  --spacing-monto: 6.75rem;   /* 108px: el ancho de la columna de plata.
                                 El borde derecho de todo monto cae en la MISMA x
                                 en Resumen, Por pagar, Clientes y Detalle. */
  --spacing-riel: 1.25rem;    /* 20px: la canaleta de glifos y de la barra de peligro */
  --spacing-junta: 2px;       /* la junta entre filas soldadas */

  /* --- movimiento (§5): nunca un ms ni una curva sueltos en un componente -- */
  --ease-adoquin: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-press:   cubic-bezier(0.2, 0, 0, 1);
  --ease-salida:  cubic-bezier(0.4, 0, 1, 1);

  --font-sans: var(--font-instrument-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-ibm-plex-mono), ui-monospace, monospace;
}

@layer base {
  body {
    background-color: var(--calle);
    color: var(--texto);
    font-family: var(--font-sans);
    /* 500 en LOS DOS temas. El ajuste óptico se hace donde nace —el
       antialiasing— y no adelgazando la fuente con un peso que ya no coincide
       con la escala. Y va por variable, no por selector: así no queda ni una
       regla de CSS condicionada por tema. */
    font-weight: 500;
    -webkit-font-smoothing: var(--suavizado);
    /* La app es una planilla: no hay número que quiera ser proporcional.
       Montos, fechas (12/8), contadores (3/6), porcentajes, teléfonos. */
    font-variant-numeric: tabular-nums;
  }

  :focus-visible {
    outline: 2px solid var(--foco);
    outline-offset: 2px;
  }

  button, [role="button"], a, label, summary {
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  /* CERO bordes en todo el sistema, en los dos temas. Lo que separa es el
     escalón de material y la junta de 2px. No hay `border` que se filtre a
     oscuro porque no hay `border`.
     Excepción única y declarada: el 1px de la píldora fantasma (--marca-linea),
     que es el contorno de un control ya identificado por su label. */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
    /* Los crossfades de opacidad quedan en 100ms: un corte seco de opacidad se
       lee como parpadeo, que es peor que la animación. */
    [data-motion="fade"] { transition-duration: 100ms !important; }
  }
}
```

**`layout.tsx`:** actualizar `themeColor` a `#EBEBEF` (claro) y `#08080A` (oscuro). Si no, la barra de estado del teléfono queda del color viejo y la app arranca con una franja que no es de ninguna pantalla.

---

## 2. Escala tipográfica

**Cinco tamaños.** Hoy hay nueve, y 13/14/15px están a 1px uno del otro: una escala sin huecos no tiene ritmo, y eso es la firma de lo generado. **Se borran el 13px y el 15px de toda la app.** El nombre de fila y la segunda línea **suben**, no bajan — es para el sol y para el brazo estirado; la fila crece de 76 a 80px como consecuencia y está bien que crezca.

| Rol | Clases, listas para pegar |
|---|---|
| **Héroe** (el número de la piedra) | `text-[2.75rem] font-semibold leading-[1.0] tracking-[-0.035em]` |
| **Título de bloque / nombre en ficha** | `text-[1.375rem] font-semibold tracking-[-0.02em]` |
| **Nombre en fila** | `text-[1rem] font-semibold tracking-[-0.011em]` |
| **Monto de fila** (mono) | `font-mono text-[0.95rem] font-medium tracking-[-0.01em]` |
| **Monto de lectura / preview** (mono) | `font-mono text-[0.95rem] font-normal tracking-[-0.01em]` |
| **Cuerpo · 2ª línea de fila · label · botón** | `text-[0.875rem] font-medium tracking-[-0.006em]` |
| **Rótulo de grupo / caption** | `text-[0.75rem] font-semibold uppercase tracking-[0.09em]` |
| **Input de texto** | `text-[1rem]` (piso anti-zoom de iOS; abajo de 16px Safari hace zoom al enfocar) |
| **Input de plata (sheet de cobro)** | `font-mono text-[1.625rem] font-normal tracking-[-0.02em]` |
| **Input de plata (capital, nuevo préstamo)** | `font-mono text-[1.75rem] font-normal tracking-[-0.02em]` |

**El héroe va en SANS, no en mono.** Renglón proponía darlo vuelta con un eslogan ("si es un número, es mono"); a 44px el mono lee como un log de build, y la constitución ya lo había rechazado por nombre. Se mantiene el rechazo.

**El mono va SOLO donde hay columnas comparables:** montos de fila, plan de cuotas, preview del préstamo, inputs de plata. El mono se especifica a **0.95rem contra un sans vecino de 1rem** — a igual `font-size` pesa más ancho y desbalancea la fila. El único peso 400 de la app es el mono de lectura.

`tabular-nums` ya está en `body`: no hace falta ponerlo clase por clase, y no hace falta acordarse.

---

## 3. Los primitivos — `src/components/`

Las diez pantallas hablan con una sola voz porque **no escriben materiales, escriben primitivos**. Estos ocho archivos son el sistema; todo lo demás los compone.

### 3.1 `superficie.tsx` — el único archivo que puede escribir un material

Regla lintable: `bg-adoquin`, `bg-piedra`, `bg-escalon` y `bg-calle` **solo pueden aparecer acá**.

```tsx
// <Piedra> — el bloque héroe. UNA por pantalla, arriba, con el número grande
// adentro. Si hay dos piedras, ninguna es la importante.
// Lleva la clase `.piedra`, que redeclara los tokens de texto: adentro el texto
// es el mismo en los dos temas y no puede desaparecer nunca.
<section className="piedra rounded-[--radius-piedra] bg-piedra p-6 min-h-[148px] text-texto">

// <Losa> — un GRUPO de filas. No son N tarjetas: es un bloque cortado.
// El radius va solo en las cuatro esquinas EXTERIORES; adentro es 0.
// `overflow-hidden` para que la barra de peligro quede dentro del radio.
// `gap-[--spacing-junta]` con fondo `bg-calle`: la junta es canvas asomando.
<div className="flex flex-col gap-[--spacing-junta] overflow-hidden rounded-[--radius-losa] bg-calle">
  {/* cada hijo lleva bg-adoquin y radius 0 */}
</div>

// <Fila> — la unidad. `navegable` (80px) o `accionable` (104px).
// pl-[--spacing-riel] deja la canaleta de 20px libre para el glifo o la barra.
// `active:scale-[0.985]` es la única confirmación de toque de un bloque macizo.
<div className="relative flex items-start gap-3 bg-adoquin py-[18px] pl-[--spacing-riel] pr-4
                min-h-[80px] transition-transform duration-[90ms] ease-[--ease-press]
                active:scale-[0.985] active:duration-[90ms]">

// <Escalon> — la fila accionable. UNA por pantalla.
// Cuatro cosas cambian a la vez, no un 4% de luminancia: material (ΔL* 13.71 en
// oscuro / −14.14 en claro), altura (80→88), despegue (rompe la soldadura con
// my-2), y la barra azul de ancho completo adentro.
<div className="relative my-2 flex flex-col gap-3 rounded-[--radius-losa] bg-escalon
                py-[22px] pl-[--spacing-riel] pr-4 min-h-[88px]
                transition-[background-color,margin,padding,border-radius]
                duration-[220ms] ease-[--ease-adoquin]">

// <FilaLectura> — label a la izquierda, valor sobre el riel de la plata. 56px.
// Es una tabla, no una lista de cosas para tocar: sin active:scale.
<div className="flex items-center justify-between gap-3 bg-adoquin px-4 min-h-[56px]">

// <Riel estado="vencida" | "cobrada" | "futura" | null>
// vencida: <span className="absolute inset-y-0 left-0 w-[3px] bg-peligro" aria-hidden />
//   → sobre filas soldadas la barra corre CONTINUA: dos vencidos seguidos son
//     UNA sola barra que abarca los dos. Una lista con gaps no puede decir eso.
// cobrada: ✓ 14px stroke 2, text-exito, centrado en la canaleta de 20px
// futura:  ○ 12px stroke 1.5, text-texto-suave (NO tenue: a 1px de trazo,
//          3.8:1 desaparece al sol)
```

**Nunca `tenue` sobre el escalón** (3.83 claro / 3.72 oscuro). En la fila donde se registra plata no vive nada ornamental.

### 3.2 `monto.tsx` — `<Monto>`

Injerto de El Extracto, corregido en la implementación. `formatARS()` **sigue devolviendo string y no se toca**: la propuesta original le cambiaba el tipo de retorno a `[símbolo, dígitos]`, y hay 63 llamadas, siete de ellas en `src/lib/whatsapp.ts` donde una tupla no sirve para nada, más los tests que §6.1 protege por nombre. El componente envuelve, no reemplaza.

```tsx
export function Monto({ valor, className = "" }: { valor: number; className?: string }) {
  const texto = formatARS(valor);              // "$45.000" o "-$45.000"
  const i = texto.indexOf("$");
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="text-[0.62em] font-medium text-texto-suave mr-[0.08em]">
        {texto.slice(0, i + 1)}
      </span>
      {texto.slice(i + 1)}
    </span>
  );
}
```

El `$` a 0.62em, peso 500, en suave, con 0.08em de aire: el ojo cae en los dígitos y la columna alinea sobre el riel derecho tenga el monto cinco o siete cifras. Es tipografía de imprenta financiera, no `toLocaleString`.

**La columna:** `<span className="w-[--spacing-monto] shrink-0 text-right">`. Ese ancho es el que clava el borde derecho de todo monto en la misma x en las cuatro pantallas de lista. Parada, con una mano, el pulgar aprende una sola coordenada.

### 3.3 `boton.tsx` — `<Boton>` y el presupuesto de acento

```tsx
peso: "lleno" | "fantasma" | "texto"
como: "button" | "link"
```

| peso | className | Dónde |
|---|---|---|
| `lleno` | `h-[52px] w-full rounded-[--radius-pill] bg-marca text-sobre-marca text-[0.875rem] font-semibold transition-transform duration-[90ms] ease-[--ease-press] active:scale-[0.97]` | **Una sola vez por pantalla.** Adentro del escalón va a ancho completo. |
| `fantasma` | `h-12 w-[--spacing-monto] rounded-[--radius-pill] border border-marca-linea bg-transparent text-marca-texto text-[0.875rem] font-semibold active:scale-[0.97]` | Toda otra acción del mismo tipo: las demás cuotas impagas, las demás personas de Por pagar. |
| `texto` | `inline-flex h-12 items-center text-[0.875rem] font-semibold text-marca-texto` | Navegación y acciones secundarias (`Cambiar fecha`, `Ver los 18 vencidos`). |

**Por qué el lleno es una BARRA de ancho completo y no una píldora lateral de 120px.** Se midió: `#1D63D2` contra el escalón oscuro `#32323C` da **2.27:1** — falla el 3:1 de borde no-textual. No existe un azul que dé blanco ≥4.5:1 *y* borde ≥3:1 contra ese escalón al mismo tiempo; el pill era matemáticamente insostenible ahí. Con un campo azul de 300×52 y texto blanco a 5.57:1, el contraste de borde deja de ser el identificador. Y de paso el target táctil pasa de ~120×48 a ~300×52, que es lo que ella necesita parada con la plata en la otra mano. En claro el pill sí pasaría (3.86) pero se usa la misma barra: un componente, un camino de código.

**La píldora fantasma es el injerto más importante de todos.** Adoquín le borraba el botón a todas las cuotas impagas menos una, y eso revierte una decisión deliberada que está defendida por escrito en `src/app/(app)/prestamo/[id]/page.tsx:184-186` — *"pasa que te pagan la 2 antes que la 1, y obligarla a ir en orden la manda de vuelta al cuaderno"*. La fantasma resuelve las dos cosas: sigue habiendo **un solo relleno por pantalla**, y sigue habiendo **cobro de un solo tap en toda fila**. Misma forma, mismo tamaño, mismas palabras; la diferencia es peso, no presencia. Es estrictamente mejor que el link de texto de El Extracto, que pierde caja táctil y no se lee como botón.

**La píldora (`--radius-pill`) queda reservada a los CUATRO botones que registran plata:** `Ya me pagó`, `Listo, la cobré`, `Crear el préstamo`, `Entrar` — y su variante fantasma. Nada más en la app es una píldora. Hoy hay 34 `rounded-full` en el repo: el chip de "30%", la celda "Ayer", el botón "Monotributista" y el botón que registra un cobro tienen todos exactamente la misma cara. **Lo que se LEE nunca puede tener la forma de lo que REGISTRA PLATA.**

**No existe `disabled`.** Se borra `disabled:opacity-60` de los cinco botones y de los inputs — son **20 ocurrencias en 12 archivos**, ocho de ellas en botones primarios azules. Se midió: `#1D63D2` al 60% sobre el escalón claro deja el texto blanco en **1.62:1**. El estado deshabilitado de hoy es literalmente ilegible. El botón conserva contraste completo y **su etiqueta dice qué falta**: `Falta elegir a quién` · `Falta el nombre` · `Escribí cuánto le prestás` · `Entrando…`. Al tocarlo cuando falta algo, no hace nada y el campo que falta recibe el foco.

### 3.4 `semaforo.tsx` — reescrito, y sin `Avatar`

```tsx
<Semaforo estado esManual soloPunto />
// punto 8px + PALABRA, siempre los dos. Sin píldora, sin fondo, sin borde.
<span className="inline-block size-2 shrink-0 translate-y-[0.5px] rounded-[--radius-pill]" />
```

| Estado | Palabra | Claro | Oscuro |
|---|---|---|---|
| `verde` | **Confiable** | `text-exito` / `bg-exito` | idem |
| `naranja` | **Ojo** | `text-atencion` | idem |
| `rojo` | **Mal pagador** | `text-destructivo` | idem |
| `nuevo` | **Nuevo** | `text-texto-suave`, **sin hue** | idem |

`nuevo` sin hue no es un descuido: mostrarle un color a alguien de quien no hay historial es mentirle, y esa es la mentira más cara de la app.

**`<Motivo>`** — el semáforo nunca va solo, siempre lleva su motivo abajo, en palabras, de uno a tres hechos: `Ojo — pagó tarde 3 de 5 cuotas, 8 días promedio`. Un chip de color sin motivo es decoración, y decoración acá se lee como magia hecha con IA.

**Se borra `Avatar`, del repo entero.** Cuesta 40px + 12px de gap en un viewport de 360 —el 16% del ancho— para mostrar dos letras que ya están escritas al lado, y ese ancho es el que hoy hace que los nombres largos se corten. **Consecuencia dura, y es lo que las tres direcciones dejaron sin cerrar:** el avatar es el único ancla de color con la que hoy se encuentra un nombre por forma. Borrarlo sin instalar el buscador deja una sola manera de encontrar a alguien: scrollear leyendo. Por eso el §3.5 no es opcional.

### 3.5 `buscador.tsx` — el injerto que las tres omitieron

§9.11 dice, literal: *"sticky arriba, en los TRES tabs, siempre visible, con label, nunca una lupa sola"*. Hoy **no existe en ninguno**: el único buscador del repo vive adentro del paso 1 de `/nuevo-prestamo`. La escena que §9.11 describe —alguien golpea la puerta, le da plata, y **no está en "Por pagar"** porque paga adelantado o su cuota es de septiembre— es exactamente la que la manda de vuelta al cuaderno.

```tsx
"use client";  // el único fetch cliente real de los tres tabs
// sticky top-0 z-20 bg-calle pb-2 pt-1
// label escrito arriba, 12px caption: "Buscá a alguien por nombre"
// input: h-12 w-full rounded-[--radius-campo] bg-adoquin px-4 text-[1rem]
```

Usa `buscar()` de `src/lib/buscar.ts`, que ya está escrito y testeado (acento-insensible, prefijo de cualquier palabra). Cada resultado es una `<Fila accionable>`: nombre + palabra del semáforo + cuánto debe en total, y la píldora fantasma `Ya me pagó` si tiene alguna cuota impaga. **Tres letras y cobra.**

Sin resultados: `No hay nadie con "mar".` + `Cliente nuevo` como `Boton peso="texto"`.

Skeleton **solo acá**, e isomorfo: misma altura (104px), mismo radius, mismos anchos que la fila real, `animate-pulse` a 1.4s. En ningún otro lado hay skeleton: los tres tabs son RSC server-rendered y no tienen primer loading.

### 3.6 `rotulo.tsx`

```tsx
<Rotulo>        // text-[0.75rem] font-semibold uppercase tracking-[0.09em] text-texto-suave
<Bajada>        // text-[0.875rem] font-medium text-texto-tenue — la explicación del grupo
<HeaderDeGrupo> // sticky top-0 z-10 bg-calle py-2 — cuenta PERSONAS + subtotal
```

El header sticky pierde el `bg-background` con blur y queda como texto sobre el canvas opaco. Cuenta personas, no créditos: ella cuenta gente.

### 3.7 `campo.tsx`

```tsx
<Campo label ayuda />   // rótulo 12px caption + ayuda 14px suave + input
// input:    h-14 w-full rounded-[--radius-campo] bg-adoquin px-4 text-[1rem] — SIN borde
// textarea: rounded-[--radius-campo] bg-adoquin px-4 py-3 — el único campo con caja alta

<Segmentado opciones valor onChange />
// Un BLOQUE SOLDADO de celdas, no N píldoras sueltas.
// contenedor: grid gap-[--spacing-junta] overflow-hidden rounded-[--radius-campo] bg-calle
// celda:      h-12 bg-adoquin text-[0.875rem] font-medium text-texto-suave
// celda activa: bg-escalon text-marca-texto font-semibold
```

El `Segmentado` reemplaza a los chips de %, a los de cuotas, a `Hoy / Ayer / Otro día` y a los de tipo de cliente. **La celda activa es el ESCALÓN**: el mismo mecanismo que dice "actuá acá" en una lista dice "esto es lo elegido" en un control. Un concepto, seis usos.

### 3.8 `aviso.tsx` — lo que ninguna dirección diseñó

Hoy hay `error.tsx`, `global-error.tsx`, `not-found.tsx` y **tres bloques inline** (`No se pudo traer el resumen:`, `No se pudieron traer los cobros:`, `No se pudieron traer los clientes:`) renderizados todos como `rounded-xl bg-card p-5 text-danger`. Las tres direcciones borran `bg-card` como concepto y ninguna dice en qué se convierte ese bloque. El día que Supabase tosa, la app dibuja un huérfano hecho con una clase que el sistema ya no tiene — y ese es justo el momento en que ella más necesita creerle a la pantalla.

```tsx
<Aviso tono="error" | "atencion" | "calma" titulo>{hijos}</Aviso>
// Es una <Piedra>: si la pantalla es un error, el error ES el héroe.
// El título va en el tamaño del héroe de bloque (22px), no en 13px de caption.
// tono="error": la primera línea en text-peligro; el resto en texto y suave.
```

Los tres estados de error de datos, el 404, el error de render y el "no tenés permiso" de `/usuarios` usan **este** componente. Lo primero que dice el error de render sigue siendo lo único que ella quiere saber: *"Lo que ya cobraste está guardado. Esto es solo la pantalla, no tus datos."*

### 3.9 `tira.tsx` — `<TiraDeCuotas>`

Vive **siempre adentro de la piedra**. Exactamente `cantidad_cuotas` segmentos: honesta y auto-explicativa, nunca necesita leyenda. **Nunca un porcentaje**: "50%" no significa nada, "3 de 6" es instantáneo.

```
h-[5px] flex-1 rounded-[--radius-tira] gap-[3px]
llena:  bg-texto
vacía:  bg-[color-mix(in_srgb,var(--texto)_22%,transparent)]
```

**Cero color de estado en los segmentos.** Una muesca o un tercer color sería un código a aprender.

### 3.10 `aviso-de-cobro.tsx` — el toast tiene que tener casa

Las tres direcciones especifican el toast de `Deshacer` a 8 segundos y ninguna dice **dónde vive**. El cobro sale de `/cobrar/[id]`, corre la server action, revalida y navega de vuelta: el componente se desmonta en la navegación y el toast no llega nunca, o dura 200ms.

Resolución: la server action redirige con `?cobre=<nombre>&cuota=<n>&deshacer=<cuotaId>`. El toast es un client component montado en `src/app/(app)/layout.tsx` dentro de un `<Suspense>` (los layouts no reciben `searchParams`, pero un client component adentro sí puede usar `useSearchParams()`), y al montar hace `router.replace` sin los params para que un refresh no lo repita.

```
fixed inset-x-4 bottom-[80px] z-30 rounded-[--radius-losa] bg-escalon px-4 py-3
Cobraste la cuota 4 de Sofía        [ Deshacer ]
```

**8 segundos, no 4.** Está parada en la calle mirando a alguien a los ojos.

---

## 4. Las diez pantallas

Geometría común, para no repetirla: página `px-4 pt-3 pb-28` · `mx-auto w-full max-w-[520px]` · entre bloques del mismo tema **10px** · entre grupos **32px** · junta **2px**. Desktop: la misma columna apoyada contra un rail de navegación fijo de 200px a la izquierda. **Cero layout alternativo.**

### 4.1 `/` — Resumen

**Piedra:** `Me deben` + héroe + `9 personas · $180.000 vencido`. Reemplaza al número suelto **y** al 2-up asimétrico: `Me deben` y `Vencido` no son dos tiles, son el número y su subtítulo.

Debajo, **una losa soldada de tres celdas** de acciones: `Nueva deuda` a ancho completo arriba (64px), y abajo `Ya me pagó` y `Cliente nuevo` en dos columnas con junta vertical. Se borran los cuatro círculos de iconos, el rótulo `Atajos` y el atajo `Papeles` — es un destino disfrazado de acción, linkea a `/clientes` que ya es un tab.

`Quién me debe` **sube**: es lo segundo que se lee, no lo último. Losa soldada, lista completa con scroll (nada de top 5: cortar en cinco es cortar justo donde empieza a servir), `<Fila navegable>` de 80px con semáforo punto+palabra en la segunda línea. **Las que tienen vencido van arriba**, para que el riel de peligro salga entero — un riel entrecortado se lee peor que tres rieles separados.

Los cuatro números del negocio: losa soldada de cuatro `<FilaLectura>`, sin `border-t` interno. `Cobrás esta semana` es la última y linkea a `/por-pagar`.

**Buscador sticky arriba de todo.** Esta pantalla **no tiene escalón**: acá no se registra plata.

### 4.2 `/por-pagar` — la más importante, y la primera que se construye

Tres grupos, cada uno **una losa soldada**: `VENCIDOS` · `HOY` · `ESTA SEMANA`, más `MORA VIEJA` colapsado por default. Los grupos vacíos no se renderizan.

- La **primera persona del grupo más urgente es el ESCALÓN**: rompe la soldadura, se despega 8px, crece a 88px+, y se lleva **la única barra azul llena de la pantalla**.
- **Todas las demás filas llevan la píldora fantasma**, mismo tamaño, mismas palabras, en la columna de la plata. Cobrar sigue siendo un tap en cualquier fila.
- El **riel de peligro corre continuo** sobre las filas soldadas de `VENCIDOS`: dos personas seguidas comparten una sola barra de 3px que dice *"este bloque entero es el problema"*. Dentro de `VENCIDOS` todas las filas están vencidas por definición, así que el riel es continuo por construcción.
- **Una fila por PERSONA**, no por cuota. La línea de meta tiene **máximo tres segmentos**, en este orden: `[cuántas cuotas] · [estado temporal] · [semáforo si ≠ Confiable]`. Hay un test que falla en el cuarto.
- El monto de la vencida sigue en `texto`. `#F87171` da 7.2:1 y `#FAFAFA` da 19:1: el número que ella tiene que ver primero se renderizaría 2.6× más apagado que uno que no le importa, y alternar 19:1 con 7:1 en una columna alineada a la derecha los convierte en manchas.
- Tope de 5 filas visibles en `VENCIDOS` + `Ver los 18 vencidos` como `Boton peso="texto"`.
- **La nota del cliente va marcada como CITA** (§7.4), no como una tercera línea gris.
- **Empty state:** una `<Piedra>` con `Estás al día.` + `El próximo cobro es el viernes 12/8 — Juan Pérez, $12.000.` y el átomo (§7.5).

**Sin piedra en esta pantalla.** Adoquín le ponía una de 148px con `Tenés que correr hoy $275.000` arriba, y eso son 244px antes del primer nombre en la pantalla donde el primer nombre **es** la pantalla, por un número que no cambia ninguna decisión. §9.6 lo prohíbe con esas palabras. Arriba va el buscador sticky y el primer header de grupo.

### 4.3 `/cobrar/[id]` — el sheet

Pantalla de tarea única, fuera del shell.

**Piedra arriba:** `Cobrarle a` (14px suave) · **Sofía Ramírez** (22px) · el monto de la cuota como héroe de 44px · `Cuota 4 de 6 · vencía el 10/7` con "vencía" en `peligro`. Hoy el nombre está en el título de la página y el monto solo aparece precargado dentro de un input: lo primero que ve no es a quién le está cobrando. Si tocó la fila equivocada, lo ve en el primer renglón y cierra.

- `¿Cuánto te dio?` — input mono 26px sobre `adoquin`, `rounded-[--radius-campo]`, 64px, **sin borde**. `type="text"` + `inputMode="numeric"`, nunca `type="number"`.
- `¿Cuándo te pagó?` — `<Segmentado>` de tres celdas soldadas, 52px, activa = escalón. Default `Hoy`. De este campo depende la diferencia entre "a tiempo" y "3 días tarde", y de eso depende el semáforo.
- **Cobro parcial:** el bloque `¿Para cuándo el resto?` crece con `grid-template-rows: 0fr → 1fr`, 240ms. Fecha **obligatoria**. Al confirmar se aplica §2 vía `registrar_pago()`. El paso extra no es fricción: es lo que impide que se pierda plata.
- Si tiene 2+ cuotas impagas, se listan con checkbox, todas marcadas, y el botón dice `Cobrar las 2`.
- `Listo, la cobré` — píldora llena, 56px, ancho completo. **Cero diálogo de confirmación: el sheet ya es el paso de confirmación.**
- Al confirmar: redirect con los params del toast (§3.10).

### 4.4 `/prestamo/[id]` — detalle y plan de cuotas

**Piedra:** `Te deben` + héroe + `de $520.000 · le prestaste $400.000 al 30%` + **la tira adentro** + `3 de 6 cobradas · 2 llegaron tarde`. Con `cantidad_cuotas = 1`: sin tira, sin caption, sin "Las N cuotas" — la piedra dice `Un solo pago`. Mismo código, otra cara.

**Las cuotas: una sola losa soldada, en orden numérico.** Riel de glifos a la izquierda: `✓` cobrada · `○` futura · barra de 3px la vencida.

- La **impaga de menor número es el ESCALÓN**, con la barra azul llena y `Cambiar la fecha` como `Boton peso="texto"` debajo.
- **Todas las demás impagas llevan la píldora fantasma.** No se les saca la acción.
- Cobradas: fila al **55% de opacidad**, `cobrada el 10/4`. Si son más de 4, colapsan: `⌄ Ya cobraste 7 cuotas · $606.000 · 2 llegaron tarde`, para que la accionable nunca caiga bajo el fold.
- **Pagada tarde es texto, nunca un badge**, y el color va solo en `6 días tarde`, en `atencion` — el mismo naranja de `Ojo`, porque es literalmente la causa de que esté en Ojo. No es un color nuevo: es el color de la consecuencia.
- **La cabecera nunca lleva botón.** Se cobra *una cuota*, no *un préstamo*.
- `EditarPrestamo` y `Reprogramar` salen del medio de la pantalla y bajan al final, como dos `<FilaLectura>` de una losa de acciones.

**Estado derivado en render, nunca leído de `cuotas.estado`.** El cron escribe esa columna a las 9:00 y las alertas dependen de ella; la UI no la lee para pintar, porque entre las 00:00 y las 9:00, o si el cron falla, la pantalla miente. Se usan `estadoCuotaUI()` y `laQueSigue()`, que ya están escritos.

### 4.5 `/clientes`

Buscador sticky. Debajo, una `<FilaLectura>` con `24 clientes · $2.140.000 en la calle`.

Cada sección de semáforo es **una losa soldada**, con el rótulo y la bajada afuera, sobre el canvas: `MAL PAGADOR · 3` / `Te deben plata vencida`. Orden: `Mal pagador → Ojo → Nuevo → Confiable`. Posición, no vocabulario nuevo.

**Una fila de 80px por persona, un destino.** Hoy son **tres Links apilados** con `mt-px` y `rounded-b-xl` a mano (fila + Papeles + Préstamo, cada uno con su propio fondo): tres tarjetas y tres destinos por persona en una lista que se lee de un barrido, o sea 3× el ruido. Ahora: nombre + monto arriba, y en la segunda línea el punto del semáforo (solo el punto — la palabra ya la dice el header, salvo que el color lo haya puesto ella a mano, que sí es información nueva) + el estado de papeles **solo cuando falta algo**, en `atencion`. El préstamo se abre desde la ficha.

`Cliente nuevo` es la última celda de la última losa, como `Boton peso="texto"` a 64px. **Sin escalón: acá no se registra plata, se decide a quién prestarle.**

### 4.6 `/clientes/[id]` — ficha

**Piedra de identidad:** nombre 22px · semáforo punto + palabra + **motivo en una línea** · teléfono como link · `Te debe` + héroe 44px · `Monotributista · 2 préstamos abiertos`. Se va el grid 3+2 de tiles: eran dos tiles de tamaños distintos por el bien de no ser iguales.

Esto corrige el incumplimiento de §9.7 que existe hoy: el número principal medía 2.75rem en el Resumen, 2.125rem en el préstamo y 1.375rem en la ficha. **Ahora es 2.75rem, en el mismo lugar, en las tres.**

`SUS PRÉSTAMOS` — losa soldada, riel de peligro en los que tienen atraso.

`DOCUMENTACIÓN` — **una losa**, una fila de 80px por requisito con `2 de 3` en mono sobre el riel de la plata y el estado en palabras abajo cuando algo está viejo. Hoy cada requisito es un `article rounded-xl bg-card p-5` con adentro un `li rounded-lg bg-surface-raised`: **card dentro de card**, prohibido por §9.7 y presente en tres pantallas. Los documentos cargados son filas de la misma losa con sangría de 16px, texto plano, **sin miniaturas** — una lista con fotos de DNI es la filtración servida a cualquiera que mire la pantalla de costado.

El **escalón es el primer requisito incompleto**, con `Sacar foto` como único relleno de la pantalla.

`OBSERVACIONES` — como cita (§7.4). `GARANTE` — dos `<FilaLectura>`.

### 4.7 `/nuevo-prestamo`

Se borran las cinco `section rounded-xl bg-card p-5` apiladas: cinco cajas idénticas es exactamente el dashboard generado que ella ya rechazó. Cada pregunta es un `<Rotulo>` sobre el canvas y debajo los controles.

1. `1 · ¿A QUIÉN LE PRESTÁS?` — buscador + losa de resultados + `Es alguien nuevo`.
2. `2 · PAPELES` — losa soldada de una fila por requisito. Se borra el bloque anidado. `Podés crear el préstamo igual.`
3. `3 · ¿CUÁNTO LE PRESTÁS?` — input mono 28px, 68px de alto, `rounded-[--radius-campo]`, sin borde.
4. `4 · ¿CUÁNTO TE TIENE QUE DEVOLVER?` — `<Segmentado>` de porcentajes (los chips resuelven el 90% de los casos sin tipear nada) + el par vinculado asimétrico: `Tengo que cobrar` a `flex-[2]` en mono 22px, `Interés` a `flex-[1]` en 14px con el `%` fijo adentro. `Ganás $120.000 de interés.` abajo, en castellano: es el chequeo de sentido que no depende de entender qué campo es cuál.
5. `5 · ¿EN CUÁNTAS CUOTAS?` — `<Segmentado>`; `Un solo pago` vive en la misma escalera que 2 · 3 · 6 · 12, no es un switch aparte. Primera fecha + frecuencia.

**`ASÍ TE QUEDA` es la piedra, y va STICKY al pie**, siempre visible mientras se tipea: total 44px, el plan en mono, y `Crear el préstamo` adentro. Hoy hay que scrollear para verlo, y un preview que hay que buscar no se busca.

**El campo derivado NO tweenea su número.** Adoquín proponía interpolar el valor; eso obliga a un `rAF` contando sobre el `value` de un input controlado, y durante 180ms el campo muestra un monto que **no es** `monto_total`. Si toca el campo o manda el form a los 90ms, lo que está en la caja no es el estado — que es el eco que §9.14 fue escrita para prevenir. Va la solución de El Extracto: **el campo derivado destella su `background-color` a `escalon` durante 180ms y vuelve**. El destello ES la explicación de cuál campo es el derivado: no hace falta candado, ni flechita, ni etiqueta "calculado". **El campo con foco nunca se reescribe.**

**Descartado (no reproponer):** editar el monto de cuotas individuales inline. N inputs de plata editables en una lista, en un teléfono, con reconciliación viva, es la pantalla más fácil de romper de toda la app.

### 4.8 `/nuevo-cliente`

Rótulo 12px + input de 56px con `--radius-campo` sobre `adoquin`, sin borde: el escalón de material lo define (en claro el input es `#FFFFFF` sobre canvas `#EBEBEF`, ΔL* 6.85; en oscuro `#16161B` sobre `#08080A`, ΔL* 5.21).

Tipo de cliente: `<Segmentado>` de 2×2 soldado, el elegido = escalón. La lista de papeles aparece al elegir tipo, con entrada de 200ms — el único movimiento de la pantalla. Se borran el fieldset encajonado del garante y la card de requisitos.

Etiquetas en **registro neutro y profesional**: `Nombre y apellido`, `Teléfono`, `Tipo de cliente`, `Garante`, `Observaciones`. Los campos de un formulario **se nombran, no se preguntan** — `¿De qué vive?` sonaba a interrogatorio. Los botones y los avisos siguen en voseo.

Solo el `<textarea>` conserva caja alta, porque necesita mostrar su alto. `Guardar el cliente` es la única píldora llena.

### 4.9 `/login`

La única pantalla con composición en vez de lista, y la única sin escalón. **Piedra a media pantalla** con el lockup completo (isotipo 72px + LITHIUM + CREDIT COMPANY), esquinas de arriba a 0 y las de abajo a 28px, a sangre lateral. En claro es la tinta: es la pantalla más parecida al material de marca que va a existir, y la que fija el gesto de que la app abre con un bloque macizo. Es también donde se prueba que los materiales se ven: si la piedra no se distingue del canvas al sol, hay que subir el ΔL* antes de seguir.

Dos campos en una losa soldada con junta entre ellos, no dos controles sueltos con label gris. `Entrar` como píldora llena de 56px. Se borra el `transition-opacity` + `disabled:opacity-60` (hoy la única animación de toda la app, y encima la incorrecta): entrando, el botón mantiene contraste y dice `Entrando…` con el átomo girando (§7.5) y no acepta otro tap.

Error: `Ese mail y esa contraseña no coinciden.` en `peligro`, con `aria-live`, sin mover el foco.

### 4.10 `/usuarios`

La pantalla más callada de la app a propósito: se entra una vez cada seis meses. Piedra con la cuenta, una losa soldada con las usuarias (mail arriba, permiso abajo, `· sos vos` en `marca-texto`), y el alta como **la última fila de esa misma losa** en vez de un formulario suelto arriba — hoy lo primero que ve es un form vacío. Al tocarla, el cajón se abre 240ms y el form es el escalón.

Se borra el avatar sobre el mail: las iniciales de una dirección de correo no son una cara, son ruido.

Sin permiso, la **piedra** dice el no: `Esta parte no es tuya` · `Pedísela a quien te dio el acceso.` Si la pantalla es un no, el no es el héroe.

### 4.11 Los estados de error (`error.tsx`, `global-error.tsx`, `not-found.tsx` y los tres inline)

Todos con `<Aviso>` (§3.8). `global-error.tsx` no puede usar los tokens porque reemplaza el `<html>`: lleva los hexes de la rama oscura inline y **es el único lugar de la app donde hay hexes sueltos**, con un comentario que lo explique.

---

## 5. Movimiento

Hoy la app tiene exactamente **una** transición en toda la interfaz (el botón de login), y encima es la que hay que borrar. **Nada se mueve al cargar la página.** Resumen, Por pagar, Clientes y los detalles son RSC server-rendered: no hay primer loading, no hay fade-in, no hay stagger, no hay `animate-pulse` fuera del skeleton del buscador.

Ocho transiciones, todas por cambio de estado, todas enumerables:

| # | Qué | Cuándo | ms · easing |
|---|---|---|---|
| 1 | **Press.** `transform: scale(0.985)` en fila / celda de segmentado; `0.97` en botones y chips | `:active`, siempre | entra **90ms** `--ease-press` · sale **180ms** `--ease-adoquin` |
| 2 | **El escalón se levanta.** `background-color` + `margin-block` 0→8px + `padding-block` 18→22 + radius interior 0→18 | solo cuando cambia cuál es la cuota accionable, en el `router.refresh` | **220ms** `--ease-adoquin`; la barra azul entra después con **60ms de delay**, fade + `translateY(4px)` en 160ms |
| 3 | **La fila cobrada se apaga en su lugar.** `opacity 1→0.55`, después el grupo se recompone (`margin` 8→0) | al volver del cobro | **160ms** `linear`, después **200ms** `--ease-adoquin`. Nunca al mismo tiempo: primero la confirmación, después el reacomodo |
| 4 | **El glifo del riel cruza** `▌ → ✓` | idem | crossfade **140ms**, `data-motion="fade"` |
| 5 | **El campo derivado destella** su `background-color` a `escalon` y vuelve | al editar el otro campo del par | **180ms** `ease-out`. El número **no** se tweenea |
| 6 | **El cajón del cobro parcial** `grid-template-rows: 0fr→1fr`, contenido en opacidad con 80ms de delay | al ingresar un monto menor | **240ms** `--ease-adoquin` |
| 7 | **El toast** entra `translateY(24px)` + opacity, sale | al registrar un cobro | entra **220ms** `--ease-adoquin`, vive **8000ms**, sale **160ms** `--ease-salida` |
| 8 | **La tira de cuotas**: el segmento recién llenado pasa de vacío a `texto` | al volver del cobro | **180ms** `ease-out` con **120ms de delay**, para que se vea después del apagado de la fila |

**Tab activo:** solo `color` y `font-weight`, crossfade 120ms `linear`. Sin indicador deslizante: no hay librería de layout animation y un indicador que salta mal es peor que ninguno.

`prefers-reduced-motion` ya está resuelto en `globals.css` con una sola regla, arriba de todo: todo a 0.01ms salvo los `data-motion="fade"`, que quedan en 100ms.

**El press no es opcional.** Es lo único que hace que un bloque macizo se sienta macizo al tocarlo, y con juntas de 2px es también la confirmación de *cuál* fila se tocó antes de soltar.

---

## 6. Lo que se BORRA

- **El BORDE, entero, de los dos temas.** Se van la regla `:root .bg-card { border: 1px solid var(--borde) }` de `globals.css:170` y el token `--borde`. Bug 1 muerto por construcción: no hay `border` que se filtre a oscuro porque no hay `border` en el sistema. Sobrevive una sola excepción declarada: el 1px de la píldora fantasma.
- **`:root body { font-weight: 450 }`** (`globals.css:134`). Es el bug 1b. Peso 500 en los dos temas; el ajuste óptico va por `-webkit-font-smoothing: var(--suavizado)`.
- **`bg-card`, `surface-raised`, `--marca-tinte` y `--elevado` como nombres.** No se renombran: dejan de existir. Los 54 usos de `bg-card` y los 40 de `rounded-xl` **tienen que dejar de compilar**, para que la costumbre se rompa el primer día.
- **El gap uniforme de 8px entre filas.** `gap-2` sale de todas las listas. Un grupo pasa a ser un solo bloque con junta de 2px y radius solo en las esquinas exteriores. Es lo que hace que la app deje de leerse como N tarjetas flotando, que es la firma exacta del dashboard generado y es literalmente lo que hay hoy en `por-pagar/page.tsx:49`.
- **El `<Avatar>` de iniciales**, en las cinco pantallas. El componente se elimina del repo. Con el buscador (§3.5) instalado en el mismo commit, no antes.
- **Los cuatro círculos de iconos del Resumen y el rótulo `Atajos`**, más el atajo `Papeles`. Cuatro SVG que igual necesitaban su label abajo: el label ya hacía todo el trabajo y el icono se comía 56px de alto.
- **`disabled:opacity-60`** — 20 ocurrencias en 12 archivos, en botones e inputs. Reemplazado por un botón a contraste pleno cuya etiqueta dice qué falta.
- **Las tres filas apiladas por cliente** en `/clientes` (fila + Papeles + Préstamo, unidas con `mt-px` y `rounded-b-xl` a mano).
- **Todos los `›` metidos adentro de strings:** `{persona.nombre} ›`, `{formatARS(monto)} ›`, `Ver ›`, `Subir documentos ›`, `Poner el interés ›`, `Definirlo ahora ›`. Rompen el `truncate`, se cuelan en el nombre accesible y son el tell más barato de UI generada. La fila entera es el target y la columna de la plata está siempre en la misma x: la flecha no informa nada.
- **Los `✓` y `○` tipeados como caracteres dentro de un `<p>`** en el detalle del préstamo. Pasan a glifos SVG en la canaleta del riel.
- **El `backdrop-blur` de la barra inferior y su `border-t`.** La barra es opaca, material `adoquin`, esquinas superiores a 18px, 72px de alto. Al sol, una barra semitransparente con texto encima es lo primero que se pierde, y el blur cuesta una capa de composición en el teléfono con el que cobra.
- **El 2-up asimétrico**, en el Resumen y en la ficha.
- **Las cards anidadas en cards** — `article rounded-xl bg-card p-5` con `li rounded-lg bg-surface-raised` adentro — presentes hoy en la ficha, en nuevo préstamo y en el sheet de cobro.
- **Los tamaños 13px y 15px**, de toda la app. La escala baja de nueve a cinco.
- **`rounded-sm`, `rounded-lg`, `rounded-xl`** como tokens. El default es 0.
- **El header sticky con `bg-background`** de Por pagar: el material lo reemplaza.
- **El tercer rojo.** `danger` y el rojo de `Mal pagador` se funden en `--peligro`, porque §9.2 ya garantiza que la urgencia se cuelga de la fila de una cuota y el semáforo del bloque identidad, así que nunca coinciden. `--destructivo` sobrevive solo para lo irreversible.

---

## 7. Los cinco detalles de artesanía

**1. El `$` se compone aparte.** 0.62em, peso 500, en `texto-suave`, con 0.08em de aire, y los dígitos a tamaño pleno. El ojo cae en los dígitos y la columna alinea sobre el riel derecho tenga el monto cinco o siete cifras. Y ese riel derecho —`--spacing-monto`, 108px— está en la **misma x en Resumen, Por pagar, Clientes y Detalle de préstamo**. Ningún generador comparte una medida entre rutas, y es de las pocas cosas que hacen que dos pantallas se sientan del mismo producto.

**2. La losa soldada.** Un grupo de filas no son N tarjetas: es un bloque cortado. Solo la primera fila lleva las esquinas de arriba y la última las de abajo; adentro el radius es **0** y las filas se separan por una junta de 2px donde asoma el canvas. Todo generador escupe `gap-2 rounded-xl` en cada fila; esto es lo contrario y se nota al primer barrido. Y el radio se vuelve jerarquía porque es un **rango**: 28 aparece exactamente una vez por pantalla, 18 en los exteriores de un grupo, 0 adentro.

**3. El riel de peligro corre continuo.** Dos vencidos seguidos comparten **una sola** barra de 3px que abarca los dos y dice *"este bloque es el problema"*. Una lista con gaps es físicamente incapaz de decir eso. Es información, no decoración — y es forma, no hue: se ve al sol y se ve con deuteranopia.

**4. La nota del cliente va marcada como CITA.** `border-left: 2px solid` + 10px de sangría, 14px en `texto-suave`, sin itálica y sin color nuevo. Es lo **único de la pantalla que escribió ella**; separarla de lo que calculó la app cuesta 2px, y §9.5 ya dice que es el campo más valioso que va a tener la app. Dejarla como una tercera línea gris, indistinguible de la metadata, es tirar el dato más caro que hay.

**5. El átomo vive adentro del producto, en los dos momentos que importan — y solo ahí.** Hoy la marca existe únicamente en la puerta: el isotipo a 26px en el header y el lockup en el login. El resultado es una app que podría ser de cualquier prestamista del país. Sin violar §9.7 (no es gradiente, ni sombra, ni emoji, ni acento decorativo), el átomo aparece en exactamente dos lugares más:

- **Cuando no hay nada que cobrar.** El empty state de `Por pagar` (`Estás al día.`) y el de un préstamo terminado (`Terminado. Te pagó todo.`) llevan el isotipo a 48px, en `marca-texto`, adentro de la piedra. El momento en que no hay nada que correr es el único que la app se puede permitir para mostrar la marca, y es el momento en que ella está más contenta.
- **Mientras se está guardando un cobro.** El botón `Listo, la cobré` cambia a `Guardando…` con el átomo de 18px girando su órbita, 1.6s `linear`, hasta que la server action vuelve. Es el instante exacto en que se está registrando plata, es el único spinner de la app, y es la marca haciendo un trabajo. Bajo `prefers-reduced-motion` queda estático.

*(Y los que no entran en cinco pero no se negocian: el punto del semáforo con `translate-y-[0.5px]` para caer en la altura-x del nombre; `tabular-nums` global en `body` en vez de clase por clase; `text-[1rem]` como piso de todo input para que iOS no haga zoom al enfocar; y el `focus-visible` de 2px que cambia de cian a azul según el tema porque el cian sobre el escalón claro da 1.45:1.)*

---

## 8. Las guardas — para que el sistema sobreviva a la tercera feature

Un sistema de diseño no se muere en el lanzamiento: se muere cuando alguien agrega una pantalla y escribe `rounded-xl bg-card` de memoria.

1. **`src/lib/tema.test.ts`** — parsea `globals.css` y falla si los cuatro materiales de un tema no son cuatro hexes distintos, o si `|ΔL*|` entre niveles consecutivos es menor a 3.0, **en cualquiera de los dos temas**. Hoy en claro `--fondo` y `--elevado` son los dos `#f4f4f6`, ΔL* 0.00, y nada en el repo lo grita. Con este test, el bug 2 no puede volver.
2. **El mismo test** falla si aparece **cualquier selector de estilo** (algo que no sea una declaración de custom property) colgando de `:root`. Es la versión ejecutable de la regla de §1.
3. **`src/lib/acento.test.ts`** — recorre los archivos de `src/app/**/page.tsx` y `*-form.tsx` y falla si el literal `"lleno"` aparece más de una vez por archivo. **Un solo relleno de marca por pantalla, verificado por el build.**
   *Por qué así y no con el `<AccionPrimaria>` en un contexto de React que proponía Renglón:* ese contexto convertiría cada `Ya me pagó` de las tres tabs en client component —hoy son `<Link>` en salida de server, y el repo tiene 17 archivos `"use client"` y ninguno en las tabs— para un chequeo que solo corre en dev y que además da falso positivo con el doble mount de StrictMode. Un test estático hace lo mismo, corre en CI, y no le cuesta un byte al bundle.
4. **`src/lib/gramatica.test.ts`** — `lineaMeta()` nunca devuelve más de **3 segmentos**. La fila del escalón ya arrastra semáforo + cuotas + atraso + nota y va camino al sprawl.
5. **ESLint** — `no-restricted-syntax` sobre className: prohibido `bg-adoquin|bg-piedra|bg-escalon|bg-calle` fuera de `src/components/superficie.tsx`; prohibido `rounded-full` fuera de `src/components/boton.tsx`; prohibido cualquier hex literal en JSX salvo en `global-error.tsx`.
6. **Palancas ya escritas, para no rediseñar nada el día que algo falle al sol:** `--spacing-junta` de 2px a 4px · `--piedra` en claro a `#FFFFFF` · `--marca-linea` en claro a `#5E90DC` (3.23 s/adoquín). Las tres son un valor, no un rediseño.

---

## 9. Lo que hay que escribir en `CLAUDE.md` **en el mismo turno**

Tres reversiones explícitas, con el motivo, para que no se repropongan en la próxima sesión:

- **§9.4 — "cards separadas por gaps, nunca líneas divisorias" queda revertido.** La regla prohibía el divisor para evitar ruido de 1px, pero el efecto real fueron 12 objetos sueltos flotando. Una losa acotada con juntas de 2px es **un** objeto con 12 renglones, que es como lee un instrumento. El divisor sigue prohibido; lo que separa es canvas asomando, no una línea.
- **§9.1 — el ramp de radius cambia** de `sm/lg/xl` a `piedra 28 / losa 18 / interior 0 / campo 12 / pill 999 / tira 4`, con **default 0** y el 28 apareciendo una vez por pantalla.
- **§9.2 — el presupuesto de acento pasa a ser un número, no una intención:** un relleno `--marca` por pantalla, verificado por `acento.test.ts`. Y `danger` + el rojo de `Mal pagador` quedan fundidos en `--peligro`.

Y tres agregados: la regla de `:root` (§1), el buscador como **requisito** de la dirección y no como extra (§3.5), y el hogar del toast (§3.10).