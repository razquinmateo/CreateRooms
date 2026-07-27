# Cómo instalar "Grupos para Meet" (versión de prueba)

Esta extensión todavía no está publicada en la Chrome Web Store, así que se
instala directo desde esta carpeta. Es un proceso normal para probar
extensiones antes de publicarlas — no hace falta nada raro ni instalar
programas extra.

## 1. Descomprimir la carpeta

Si te llegó como archivo `.zip`, descomprimila en algún lugar fijo de tu
computadora (por ejemplo, en el Escritorio o en Documentos). Con
"Extraer todo..." (clic derecho sobre el .zip) alcanza.

**Importante:** dejala en un lugar donde no la vayas a mover ni borrar
mientras la estés probando — Chrome necesita que la carpeta siga estando
en el mismo lugar.

## 2. Abrir la página de extensiones de Chrome

- Abrí Google Chrome.
- En la barra de direcciones (arriba, donde escribís las URLs) escribí:

  ```
  chrome://extensions
  ```

  y presioná Enter.

## 3. Activar el "Modo de desarrollador"

Arriba a la derecha de esa página hay un interruptor que dice **"Modo de
desarrollador"** (o *"Developer mode"* si Chrome está en inglés).
Activalo — sin esto, Chrome no te va a dejar cargar la extensión.

## 4. Cargar la extensión

Van a aparecer unos botones nuevos arriba de la página. Hacé clic en
**"Cargar descomprimida"** (o *"Load unpacked"*).

Se va a abrir un explorador de archivos: buscá y seleccioná la **carpeta**
que descomprimiste en el paso 1 (la carpeta en sí, no un archivo suelto de
adentro) y confirmá.

Si todo salió bien, "Grupos para Meet" ya debería aparecer en la lista de
extensiones, con su ícono.

## 5. Probarla

Entrá a cualquier reunión de Google Meet (`meet.google.com/...`). El panel
de la extensión va a aparecer solo, arriba a la derecha de la pantalla.

Un resumen rápido de uso:
1. Armá los grupos **una vez** arrastrando alumnos dentro del panel nativo
   de "Grupos de trabajo" de Meet.
2. Guardalos con el botón **"Guardar estos grupos"** del panel de la
   extensión.
3. En cualquier clase futura, creá las salas vacías en Meet y presioná
   **"Configurar Grupos en Meet"** — la extensión los ubica sola.

## Cómo actualizarla si te paso una versión nueva

Si te vuelvo a mandar la carpeta con cambios:

1. Reemplazá la carpeta vieja por la nueva (mismo nombre y mismo lugar, o
   avisame si cambia de ubicación).
2. Andá de nuevo a `chrome://extensions`.
3. Buscá "Grupos para Meet" en la lista y hacé clic en el ícono de
   recargar (una flechita circular) que aparece en su tarjeta.
4. Si tenías una pestaña de Meet abierta, refrescala.

## Si algo no funciona

- Fijate que la carpeta que elegiste en el paso 4 sea la que tiene adentro
  el archivo `manifest.json` directamente (no una carpeta que contenga a
  esa carpeta adentro).
- Si Chrome muestra un error al cargar la extensión, mandame una captura
  del mensaje y lo reviso.
- **Tus datos quedan guardados en tu propio Chrome, en tu computadora** —
  los equipos y cursos que vayas armando no se pierden al cerrar Meet ni al
  reiniciar la compu, pero sí se pierden si **desinstalás** la extensión.
  Si querés probarla varios días, no hace falta que la desinstales entre
  una clase y otra.
- Ningún dato (nombres de alumnos, equipos) sale de tu computadora en
  ningún momento — todo queda local.
