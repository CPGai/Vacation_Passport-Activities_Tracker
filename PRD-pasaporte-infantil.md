# PRD — Pasaporte infantil imprimible

**Versión:** 2.3 — Especificación funcional y técnica completa (Spec-Driven Development)  
**Estado:** Activo e Implementado en rama `pasaporte-experimental.html`  
**Producto:** Generador/editor de pasaportes infantiles interactivo para visitas y viajes familiares

---

## 1. Resumen Ejecutivo

El producto permite diseñar, personalizar, organizar e imprimir un pasaporte infantil para un viaje o serie de actividades. El niño recibe un cuadernillo físico con una página por actividad en la que, al completarla, estampa su sello de visita.

El sistema unifica dos representaciones complementarias:
1. **Vista Lógica:** Secuencia de lectura humana continua (Portada, Datos del Viajero, Actividad 1, Actividad 2, etc.).
2. **Vista de Impresión (Imposición Dúplex 4-Up):** Distribución matemática y personalizada de 4 paneles por cara de hoja tamaño Letter (frente y reverso) para doblar, cortar y grapar el pasaporte en el orden correcto.

---

## 2. Objetivos Principales

* **Independencia de contenido y numeración física:** Reordenar, mover o eliminar actividades sin alterar la coherencia de la paginación ni las páginas especiales protegidas.
* **Imposición automática y personalizable:** Generar automáticamente el esquema de cuadernillo dúplex con opción de organizar manualmente cada cuadrante de cada hoja.
* **Calibración dúplex de impresión:** Compensar márgenes, distancias al lomo/corte central y desalineaciones mecánicas del reverso en impresoras domésticas.
* **Edición ágil y masiva:** Edición directa en tarjeta, lista secuencial continua para copiar/pegar e importación masiva de actividades desde archivos CSV con plantilla descargable.
* **Fidelidad y paridad visual:** Sincronización instantánea (0ms de latencia) y relación de aspecto proporcional idéntica (4.25in × 5.5in) entre pantalla e impresión.
* **Separación de materiales:** Aislamiento de la portada para imprimir en cartoncillo y las páginas interiores en papel estándar.
* **Persistencia local completa:** Guardar y cargar proyectos en formato JSON local y `localStorage` sin depender de servicios en la nube ni módulos ES externos.

---

## 3. Arquitectura y Conceptos del Modelo de Datos

### 3.1 Documento del Pasaporte (`ExperimentalDocument`)
```typescript
interface ExperimentalDocument {
  version: 2;
  pageCount: number;
  childName: string;
  pages: PassportPage[];
  customImposition: CustomImposition | null;
  printCalibration: PrintCalibration;
}
```

### 3.2 Página (`PassportPage`)
```typescript
interface PassportPage {
  number: number;                   // Número físico (1, 2, 3...)
  kind: 'cover' | 'identity' | 'activity' | 'blank';
  template: string;                 // 'cover' | 'identity' | 'activity' | 'blank' | 'blank-frame' | 'blank-image'
  material: 'cover' | 'activity';   // 'cover' (cartoncillo) vs 'activity' (papel normal)
  backgroundColor: string;          // Hex color (ej. '#fff8ea', '#edf8fa')
  frameColor: string;               // Hex color del borde
  showNumber: boolean;              // Visibilidad del número
  numberPosition: 'top-center' | 'top-left' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right';
  fontSize: { title: number; description: number };
  textOpacity: { title: number; description: number };
  textPosition: { titleX: number; titleY: number; descriptionX: number; descriptionY: number }; // En mm
  activity: { title: string; description: string } | null;
  image: { src: string; file: string; rule: string; scale: number; x: number; y: number; opacity: number };
  stamp: { imageSrc: string; label: string; subtitle: string; scale: number; x: number; y: number; opacity: number };
}
```

### 3.3 Calibración de Impresión (`PrintCalibration`)
```typescript
interface PrintCalibration {
  centerShiftX: number;    // Desplazamiento simétrico hacia el centro vertical / lomo (-10mm a +25mm)
  centerShiftY: number;    // Desplazamiento simétrico hacia el centro horizontal / corte (-10mm a +25mm)
  outerMargin: number;     // Margen perimetral exterior de panel (0mm a 15mm, estándar 4mm)
  backShiftX: number;      // Compensación horizontal exclusiva de reverso (-10mm a +10mm)
  showCutGuides: boolean;  // Mostrar guías punteadas centrales al 50%
}
```

---

## 4. Plantillas y Comportamiento Visual

1. **Portada (`cover`):** Título principal, subtítulo, marca de agua decorativa y marco especial.
2. **Datos del Viajero (`identity`):** Campos para nombre del niño, país, fecha y datos de viaje.
3. **Actividad (`activity`):** Título de actividad, descripción, imagen de fondo y distintivo de sello de visita.
4. **Plantillas en blanco (`blank`, `blank-frame`, `blank-image`):**
   * Supresión total de cajas de texto vacías mediante CSS `:empty` para evitar rectángulos o fondos blancos fantasma.

---

## 5. Menú de Opciones y Organización de la Interfaz

La barra lateral está estructurada en secciones colapsables nativas (`<details>` / `<summary>`):

1. **`📑 Páginas y Miniaturas` (`#secPages`):**
   * Grilla interactiva de miniaturas.
   * Agregar página con selección de plantilla.
   * Quitar página con confirmación de seguridad (páginas 1 y 2 protegidas).

2. **`📋 Todas las Actividades (Edición y CSV)` (`#secActivitiesList`):**
   * **📥 Descargar plantilla CSV:** Genera `plantilla_actividades_pasaporte.csv` en UTF-8 con BOM.
   * **📤 Importar CSV:** Carga masiva de actividades con creación dinámica de páginas e imágenes centradas.
   * Lista continua de tarjetas con campos editables en tiempo real y tirador `☰` para reordenar por arrastre.
   * Botón para restaurar orden original.

3. **`📐 Organización de Paneles en Hoja` (`#secImposition`):**
   * Vista de cada cara de hoja dividida en cuadrícula 2×2:
     - `[1] Sup. Izq`, `[2] Sup. Der`, `[3] Inf. Izq`, `[4] Inf. Der`.
   * Selectores desplegables para reasignar cualquier página a cualquier cuadrante.
   * Arrastre y soltado entre cuadrantes para intercambiar posiciones directamente.
   * Botón para restaurar la imposición matemática estándar de cuadernillo.

4. **`🎯 Centrado y Calibración en Hoja` (`#secCalibration`):**
   * Controles de ajuste en milímetros para acercar las páginas al cruce central de la hoja.
   * Control de compensación de reverso para corregir desfases de volteo dúplex en impresoras.
   * Conmutador de guías punteadas de corte y doblez.
   * Botón de restauración de calibración predeterminada.

5. **`✏️ Página Seleccionada (Estilo y Número)` (`#secSelected`):**
   * Tipo de plantilla y material de hoja (Normal vs Cartoncillo).
   * Color de marco y color de fondo (`backgroundColor`).
   * Visibilidad y selector de 6 posiciones para el número de página (`numberPosition`).

6. **`✍️ Contenido y Posición de Textos` (`#secContent`):**
   * Título y descripción con tamaños de fuente y opacidad independientes.
   * Controles de desplazamiento X e Y en milímetros (`textPosition`) para ajustar alturas y evitar solapamientos.
   * Botón para centrar posiciones de texto.
   * Texto editable del sello de visita.

7. **`🖼️ Imagen y Ajustes Visuales` (`#secImage`):**
   * Selector de archivo de imagen local.
   * Escala (40% a 140%), posición X/Y (-50% a +50%), opacidad (0% a 100%) y botón de centrado.

---

## 6. Especificación de Importación Masiva (CSV)

### 6.1 Formato del Archivo CSV
* **Codificación:** UTF-8 con BOM (`\uFEFF`) para compatibilidad directa con Microsoft Excel y hojas de cálculo.
* **Columnas:**
  1. `numero_pagina`: Número de página física de destino (entero `>= 3`). Opcional; si se omite, se asigna secuencialmente.
  2. `titulo`: Título de la actividad.
  3. `descripcion`: Texto descriptivo (admite comillas escapadas y saltos de línea).
  4. `imagen`: Ruta relativa local (ej. `Versiones/Picture1.png`), nombre de archivo o enlace web.

### 6.2 Reglas de Procesamiento
* Si el CSV referencia una página superior a la cantidad actual de páginas, el motor ejecuta `addPage` automáticamente hasta alcanzar el número requerido.
* Las imágenes importadas se inicializan centradas (`x: 0, y: 0`), con escala del 90%, regla `'manual'` y opacidad del 23%.
* Las rutas locales de Windows y comillas de exportación de Excel se normalizan automáticamente a rutas relativas válidas servibles por web (`background images/...`).
* Las páginas 1 y 2 permanecen protegidas e inalteradas.

### 6.3 Ámbito de Aplicación de Cambios (*Scope Selector*)
El panel de edición dispone de un selector global de ámbito que permite propagar cualquier cambio de configuración a diferentes conjuntos de páginas:
* `single`: Solo a la página activa seleccionada (comportamiento individual predeterminado).
* `all`: A todas las páginas del documento (1 a N).
* `activities`: A todas las páginas de actividades (3 a N), preservando portada y datos personales.
* `custom`: A una selección múltiple manual de páginas elegidas con casillas interactivas o atajos `Ctrl + clic` en miniaturas.

**Propiedades propagadas:**
* Color del marco y color de fondo.
* Visibilidad y posición del número de página (en las 6 ubicaciones perimetrales).
* Tamaños de fuente, opacidades y traslación X/Y de títulos y descripciones.
* Escala, desplazamiento X/Y, centrado, opacidad e imagen de fondo.
* Texto y escala de sellos de actividad.
* Plantilla y material de página.

---

## 7. Motor de Imposición y Geometría de Impresión

### 7.1 Aislamiento Estricto de Materiales
* **Hojas de Portada (`.cover-sheet`):** Contienen exclusivamente páginas con `material === 'cover'` (Páginas 1, 2, $N-1$ y $N$). Las páginas de actividades de papel normal nunca se mezclan en hojas de cartoncillo.
* **Hojas de Actividades (`.activity-sheet`):** Contienen exclusivamente páginas de actividad con `material === 'activity'`.

### 7.2 Regla Matemática de Imposición por Pares de Cuadernillo (*Signature Booklet*)
Para $M$ actividades $[a_0, a_1, \dots, a_{M-1}]$ (ej. páginas 3 a 12 para 10 actividades):
El número de hojas plegadas (*leaves*) es $L = \lceil M / 4 \rceil$. Para cada hoja de cuadernillo $i$ ($0 \le i < L$):
* **Frente:** Izquierda = $a_{M - 1 - 2i}$, Derecha = $a_{2i}$ (ej. Par 1: $12 \leftrightarrow 3$, Par 2: $10 \leftrightarrow 5$, Par 3: $8 \leftrightarrow 7$).
* **Reverso:** Izquierda = $a_{2i + 1}$, Derecha = $a_{M - 1 - (2i + 1)}$ (ej. Par 1 reverso: $4 \leftrightarrow 11$, Par 2 reverso: $6 \leftrightarrow 9$).

### 7.3 Modos de Orientación del Lomo (*Spine Orientation Mode*)
* **Horizontal (`horizontal` - Predeterminado):** Los pares de cuadernillo se distribuyen en filas horizontales de la hoja 4-up (Fila superior = Hoja de cuadernillo A, Fila inferior = Hoja de cuadernillo B).
* **Vertical (`vertical`):** Los pares de cuadernillo se distribuyen en columnas verticales (Columna izquierda = Hoja de cuadernillo A, Columna derecha = Hoja de cuadernillo B).

### 7.4 Paridad Geométrica
* **Relación de aspecto fija:** Exactamente `4.25 / 5.5 = 0.7727` tanto en `.logical .page` como en `.print-panel .page`.
* **Coordenadas relativas porcentuales:** Rellenos (`8% 6% 22% 6%`), márgenes de texto (`3% auto`) y distintivo de sello (`bottom: 3.5%; left: 7%; right: 7%; height: 15.5%`) calculados en `%` para que la vista en pantalla coincida pixel por pixel con la hoja física de 8.5in × 11in.

---

## 8. Persistencia y Compatibilidad

* **Formato de Archivo:** JSON local que serializa el árbol completo del documento (`pages`, `customImposition`, `printCalibration`, `projectName`).
* **Autoguardado en Navegador:** `localStorage` bajo la clave `pasaporte-experimental-v1`.
* **Identidad Gráfica y Favicon:** Icono vectorial SVG (`favicon.svg`) con diseño de cuadernillo de pasaporte, globo terráqueo y avión dorado, optimizado para pestañas claras y oscuras.
* **Sin Dependencias Externas:** Funciona localmente en cualquier navegador moderno mediante scripts tradicionales sin requerir servidor HTTP ni bundlers.

---

## 9. Criterios de Aceptación y Suite de Pruebas (TDD)

Toda modificación debe satisfacer el 100% de las pruebas automatizadas ejecutadas con `node --test tests/*.test.mjs`:

1. **Creación y Protección de Páginas Especiales:** Páginas 1 y 2 protegidas contra reordenamiento y eliminación.
2. **Imposición de Cuadernillo y Separación de Materiales:** Cálculo correcto de frentes y reversos para cartoncillo y papel normal con modos horizontal y vertical.
3. **Reorganización Personalizada de Paneles:** Asignación y swapping de cuadrantes en `customImposition`.
4. **Calibración y Desplazamientos Dúplex:** Definición y aplicación de variables CSS de calibración y traslación de cuadrantes.
5. **Ajuste de Posición X/Y y Número de Página:** Desplazamientos de textos en milímetros y posicionamiento en 6 puntos del número.
6. **Supresión de Cajas Fantasma en Blanco:** Verificación de reglas `:empty` en hojas sin texto.
7. **Plantilla y Analizador CSV:** Descarga de plantilla oficial e importación masiva con creación de páginas y centrado de imágenes.
8. **Contratos HTML/CSS y Cero Regresiones:** Estructura completa de menús, selectores, botones y estilos libres de duplicación.
9. **Sincronización Tipográfica Universal:** Propagación dinámica de tamaños de fuente (`fontSize.title` y `fontSize.description`) tanto en vista lógica como en vista de imposición e impresión sin bloqueos por `!important`.
10. **Selector de Alcance Multipágina:** Aplicación granular de propiedades a página única, todas, actividades o selección múltiple interactiva.
