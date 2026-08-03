# Grupos para Meet

Extensión de Chrome (Manifest V3) para docentes que usan **Google Meet** con
**Salas de grupos de trabajo** (breakout rooms). Guarda la composición de
equipos de alumnos y la reaplica automáticamente en las próximas clases, sin
que el docente tenga que volver a arrastrar a cada alumno a mano cada vez.

## Qué problema resuelve

Google Meet no tiene forma de guardar una composición de salas de trabajo de
una clase a la otra: cada vez que el docente quiere dividir a los alumnos en
los mismos equipos de siempre, tiene que arrastrar a cada uno a mano, sala
por sala. Esta extensión guarda esa composición una vez y la reaplica con un
clic.

## Cómo funciona (flujo de uso)

### 1. Crear o actualizar los equipos (una vez, o cuando cambien)

1. El docente entra a la videollamada en Meet.
2. Abre **Herramientas de la reunión → Grupos de trabajo**, crea la cantidad
   de salas necesaria, y **arrastra a cada alumno a su sala correspondiente
   usando el drag & drop nativo de Meet** (no algo de la extensión).
   - Esto es intencional: el docente reconoce a cada alumno por voz/cámara y
     lo arrastra como persona real, no como texto. Así se evita cualquier
     ambigüedad si dos alumnos tienen el mismo nombre y apellido — Meet sabe
     exactamente quién es quién, cosa que un matching por texto no podría
     garantizar.
3. En el panel de la extensión (que aparece flotando en la pantalla), el
   docente toca **"💾 Guardar estos grupos"**.
4. La extensión lee la composición actual de las salas (nombre de cada sala +
   alumnos asignados) y la guarda en `chrome.storage.local`, pidiendo
   confirmación antes de sobrescribir equipos guardados previamente. Si
   había equipos guardados, antes de pisarlos guarda automáticamente una
   copia de respaldo — aparece un link **"↩️ Deshacer última
   sobrescritura"** en el panel por si el guardado fue un error.

### 2. Reaplicar los equipos guardados (cada clase)

1. El docente abre "Grupos de trabajo" en Meet y crea las salas **vacías**
   (misma cantidad que equipos activos, o más).
2. En el panel de la extensión, tilda qué equipos guardados quiere usar hoy
   (por si algún equipo completo faltó a clase).
3. Toca **"Configurar Grupos en Meet"**.
4. La extensión:
   - Abre el panel de Grupos de trabajo si no está abierto.
   - Lee quién está conectado ahora mismo en la Llamada principal.
   - Para cada equipo activo, busca la sala en Meet con el **mismo nombre
     exacto** que el equipo guardado (no por posición/orden). Si no la
     encuentra, le asigna una sala que haya quedado libre (sin nombre
     coincidente con ningún otro equipo activo) — esto cubre el caso típico
     de que un equipo falte un día y el docente cree menos salas de las
     habituales, dejando un "hueco" que otro equipo presente puede ocupar.
     Esa asignación de respaldo queda marcada explícitamente en el panel.
   - Mientras asigna, muestra una **barra de progreso** en el panel
     (`X / Y alumnos`) para que no parezca que se colgó con cursos grandes.
   - Para cada alumno de cada equipo activo, si está conectado y su nombre
     no es ambiguo, lo tipea en el campo de asignación de su sala
     correspondiente y selecciona la sugerencia que aparece.
   - Si dos alumnos conectados tienen el **mismo nombre exacto**, no asigna
     a ninguno de los dos automáticamente (no hay forma confiable de saber
     cuál es cuál por nombre) — los deja pendientes para que el docente los
     arrastre a mano.
   - Después de cada click sobre la sugerencia de un alumno, **relee la
     sala para confirmar que el alumno quedó realmente adentro** (no
     confirma con sólo haber podido hacer el click); si no lo encuentra,
     espera un instante más y vuelve a chequear una sola vez antes de
     darlo por fallido, para no confiar ciegamente en un click que pudo no
     haber "prendido" en la UI de Meet.
   - Al terminar, pinta un **detalle desplegable en el panel** ("📋 Detalle
     de la última distribución") con quién quedó asignado en cada sala,
     quién falló, quién quedó pendiente por nombre duplicado y quién no
     estaba conectado — ya no hace falta abrir la consola (F12) para ver
     esto, aunque también queda logueado ahí por si sirve para debug.
   - **Nunca** hace clic en "Abrir salas" — eso queda para que el docente
     revise todo y confirme.

### 3. Trabajar con varios cursos

Arriba del todo del panel hay un selector con los cursos del docente (ej.
"Programación", "Programación Avanzada"). Cada curso tiene sus propios
equipos guardados, completamente independientes de los demás — no hay
manera de que se pisen entre sí.

- **➕** crea un curso nuevo (pide el nombre con un modal propio) y lo activa.
- **✏️** renombra el curso activo.
- **🗑️** borra el curso activo junto con sus equipos guardados (pide
  confirmación, y no deja borrar el último curso que queda).

Cambiar el curso seleccionado recarga todo el panel (equipos, backup, cheat
sheet) para reflejar ese curso.

### 4. Exportar / importar equipos como JSON

Con los botones **"⬇️ Exportar JSON"** / **"⬆️ Importar JSON"** (arriba de
la lista de equipos) el docente puede:

- Descargar los equipos del curso activo a un archivo `.json`, como
  respaldo fuera de `chrome.storage.local` (que se puede perder si se
  reinstala Chrome o se limpian datos del navegador) o para llevarlos a
  otra PC.
- Importar un archivo `.json` (el exportado por la extensión, o uno armado
  a mano con la misma forma) para reemplazar los equipos del curso activo.
  Antes de reemplazar, pide confirmación y guarda un backup de lo anterior
  (mismo mecanismo que "Guardar estos grupos").

### 5. Cambiar el idioma del panel

Arriba a la derecha del header hay dos banderitas (🇪🇸 español / 🇺🇸 inglés,
dibujadas como SVG inline, sin archivos de imagen). La activa se ve resaltada;
tocando la otra se cambia el idioma. La primera vez que se abre el panel, el
idioma arranca detectado automáticamente a partir del idioma del navegador
(`navigator.language`); en cuanto el docente toca una bandera a mano, esa
elección queda guardada (clave `gpm_idioma`) y se respeta en adelante, sin
volver a autodetectar.

Todo lo que ve el docente (botones, mensajes de estado, el cheat sheet, los
modales de confirmación) pasa por este sistema. Los `console.log` /
`console.warn` de debug quedan siempre en español — son para quien mantiene
el código, no para el docente.

## Estructura de archivos

```
CreateRooms/
├── manifest.json    Configuración de la extensión (Manifest V3)
├── content.js        Toda la lógica: UI del panel, lectura/escritura del
│                      DOM de Meet, automatización
├── background.js     Service worker mínimo (sólo abre el link de donación)
├── styles.css         Estilos del panel inyectado
├── favicon.png        Ícono de la extensión (512×512, referenciado para los
│                      tres tamaños que pide el manifest: 16/48/128)
└── README.md          Este archivo
```

No hay build step ni dependencias externas — es JS/CSS plano.

## Instalación en modo desarrollador

1. Ir a `chrome://extensions`.
2. Activar "Modo de desarrollador" (arriba a la derecha).
3. "Cargar descomprimida" → seleccionar esta carpeta (`CreateRooms`).
4. Entrar a una reunión de Meet (con cuenta de Google Workspace que tenga
   salas de grupos de trabajo habilitadas — **no funciona en cuentas
   personales gratuitas**, esa función requiere un plan pago de Workspace o
   Education).

Cada vez que se edita el código y se recarga la extensión desde
`chrome://extensions`, hay que **refrescar también la pestaña de Meet**
abierta — si no, el content script queda con el contexto de la extensión
invalidado y deja de poder guardar/leer datos (el código ya maneja este caso
sin tirar errores feos, pero no vuelve a funcionar hasta refrescar).

## Modelo de datos (`chrome.storage.local`)

Desde que se agregó soporte multi-curso, cada curso tiene sus propias claves
de equipos y de backup, además de un registro global de cursos:

Clave `gpm_cursos` (registro de todos los cursos del docente):

```json
{
  "g_abc123": { "nombre": "Curso 1" },
  "g_def456": { "nombre": "Programación Avanzada" }
}
```

Clave `gpm_curso_activo`: el id del curso actualmente seleccionado en el
panel (ej. `"g_abc123"`).

Clave `curso_actual::<idCurso>` (equipos guardados de ESE curso):

```json
[
  {
    "idGrupo": "g_xyz789",
    "nombreGrupo": "Sala de trabajo 1",
    "integrantes": ["Mateo Razquin", "Ana Pérez"]
  }
]
```

Clave `curso_actual_backup::<idCurso>`: la última versión de equipos de ESE
curso que quedó pisada por "Guardar estos grupos" o por una importación,
mismo formato que arriba. Un solo slot (no historial completo) — alcanza
para el botón "↩️ Deshacer última sobrescritura".

Clave `gpm_panel_position`: recuerda dónde quedó posicionado el panel
(se puede arrastrar tomándolo del header) para no reacomodarlo cada reunión.

Clave `gpm_panel_colapsado`: recuerda si el docente dejó el panel colapsado
(tocando el header sin arrastrar, alterna entre colapsado/expandido) para
que no vuelva a abrirse solo en cada clase. El panel arranca expandido la
primera vez. Cuando está colapsado sigue existiendo un botón flotante
**"Grupos Meet"** (`#gpm-reopen-btn`) para volver a mostrarlo.

Clave `gpm_idioma`: `"es"` o `"en"`. Sólo existe después de que el docente
toca el botón 🌐 por primera vez — hasta entonces, el idioma se detecta desde
`navigator.language` en cada carga sin persistirlo, para no "pisar" con un
valor autodetectado una eventual elección manual futura.

### Migración desde versiones anteriores (sin multi-curso)

Versiones previas guardaban todo bajo una única clave `curso_actual` (sin
sufijo de curso). La primera vez que corre esta versión, si no encuentra el
registro `gpm_cursos`, migra automáticamente lo que hubiera en esa clave
vieja (y su backup en `curso_actual_backup`) a un curso nuevo llamado
**"Curso 1"**, que queda activado. Las claves viejas se dejan sin borrar
(no se leen ni se escriben más, pero quedan como red de seguridad extra por
si algo salió mal en la migración).

## Cómo interactúa con el DOM de Meet

Meet es una SPA con clases CSS ofuscadas que cambian entre versiones, así
que la extensión evita depender de ellas. Los atributos que sí usa fueron
**confirmados contra HTML real** (julio 2026) y son bastante más estables:

| Qué | Selector |
|---|---|
| Botón "Herramientas de la reunión" | búsqueda por texto/aria-label (`actividades`, `herramientas de la reunión`, `meeting tools`) |
| Ítem de menú "Grupos de trabajo" | búsqueda por texto/aria-label (`grupos de trabajo`, `breakout rooms`) |
| Contenedor de cada sala | `div[jscontroller="Q4Uf1c"][data-display-name]` |
| Contenedor de la Llamada principal | `div[jscontroller="Q4Uf1c"]` **sin** `data-display-name` |
| Campo para asignar un alumno a una sala | `input[jsname="nV0Ddb"]` |
| Campo de renombrar la sala | `input[jsname="YPqjbf"]` |
| Chip de cada persona (en una sala o en la llamada principal) | `[jsname="XPtOyb"][data-display-name]`, con `data-tooltip="Desconectado"` si ya no está conectado |
| Sugerencia del autocompletado al tipear un nombre | `<li role="option">` dentro de un `<ul role="listbox">` |

Si Meet cambia su interfaz y algo deja de andar, el primer paso es abrir
DevTools, inspeccionar el elemento correspondiente, y comparar contra esta
tabla para ver qué selector hay que actualizar. La búsqueda por
texto/aria-label (botón de herramientas y menú) es la parte menos estable,
porque no está atada a un atributo técnico sino a las palabras visibles.

### "Fantasmas" de sesiones anteriores

Meet ata la composición de salas al **código de la reunión**, no a la
conexión activa: si alguien se desconecta y otra persona vuelve a entrar con
esa cuenta, la entrada vieja queda listada como "Desconectado" dentro del
armado de salas. La extensión filtra explícitamente estas entradas
(`data-tooltip` conteniendo "Desconectado"/"Disconnected") tanto al guardar
equipos como al detectar quién está presente para reaplicarlos.

## Decisiones de diseño relevantes

- **La creación de equipos es 100% manual en Meet, no en la extensión.**
  Hubo una versión anterior con un editor drag & drop propio dentro del
  panel, pero se descartó: el drag & drop nativo de Meet es más confiable
  que cualquier cosa que se pueda simular, y al ser el docente quien arrastra
  a la persona real (no un texto), elimina de raíz la ambigüedad de nombres
  duplicados en el momento de la creación.
- **La sala de destino se busca por nombre exacto, no por posición/orden
  en el DOM.** La primera versión asignaba "equipo activo #1 → primera sala
  encontrada", lo cual fallaba si un equipo faltaba un día y el docente
  activaba solo algunos equipos: el orden dejaba de coincidir. Ahora cada
  equipo busca la sala con su mismo nombre; si no la encuentra, cae a una
  sala libre como respaldo (ver arriba), y sólo si no queda ninguna libre
  reporta error puntual para ese equipo.
- **La reasignación automática nunca adivina ante nombres duplicados.** Si
  hay ambigüedad, prefiere no asignar antes que asignar mal.
- **Cada asignación se verifica releyendo la sala, no sólo confiando en el
  click.** `assignParticipantToRoom` no da por buena una asignación con
  sólo haber podido clickear la sugerencia del autocompletado: después del
  click vuelve a llamar a `getRoomMemberNames` sobre esa sala y chequea que
  el alumno aparezca ahí. Si no aparece, espera un instante más y reintenta
  la lectura una única vez (sin volver a clickear) antes de tirar error —
  cubre el caso de que el click no haya "prendido" en la UI de Meet (lag,
  pérdida de foco) y evita que el cheat sheet reporte ✅ asignado cuando en
  realidad el alumno quedó sin sala.
- **Nunca hace clic en "Abrir salas" automáticamente.** El docente siempre
  tiene el control final.
- **Los diálogos de confirmación son un modal propio** (`showConfirm()` en
  `content.js`), no el `confirm()` nativo del navegador, para mantener
  estética consistente con el resto del panel. Acepta un texto y color de
  botón configurables (ej. "Eliminar" en rojo para borrar un equipo,
  "Guardar" en azul para confirmar el guardado desde Meet).
- **Nombrar cursos usa un modal propio** (`showPrompt()`), mismo criterio
  que `showConfirm()`, en vez de `prompt()` nativo.
- **Idioma del panel: diccionario propio (`STRINGS` + `t()`) en vez de
  `chrome.i18n`.** La API nativa de Chrome exige archivos
  `_locales/<idioma>/messages.json` separados del código y sigue el idioma
  configurado en el navegador sin dar lugar a un toggle manual fácil. Acá se
  prefirió un objeto `STRINGS = { es: {...}, en: {...} }` con una función
  `t(clave, ...args)` en el mismo `content.js`: permite las dos banderitas
  de cambio manual en el header además de la detección automática, y no
  fragmenta los textos en archivos aparte dado que el proyecto no tiene
  build step.
- **Las banderas son SVG inline, no archivos de imagen.** A 20px de ancho
  una imagen real no aporta detalle extra, y como SVG evitan tener que
  declarar `web_accessible_resources` en el manifest o depender de que un
  archivo cargue bien dentro del content script.
- **El progreso y el detalle de la última distribución viven en el panel**,
  no sólo en la consola (F12) — la mayoría de los docentes no abre
  DevTools. La consola sigue recibiendo los mismos logs, por si sirven para
  debug.
- **El backup antes de sobrescribir es de un solo slot** (no un historial
  completo de versiones) — alcanza para deshacer un guardado o una
  importación por error sin complicar el modelo de datos.
- **Multi-curso con claves de storage separadas por curso**, en vez de un
  único objeto grande con todos los cursos adentro — así cada `get`/`set`
  toca sólo los datos del curso activo, y un curso con muchos equipos no
  hace más lenta o más pesada la operación de otro curso.
- **El botón de donación** ("☕ Invitame un café") abre el link a través de
  `background.js` (no directo desde el content script) para validar que sea
  http/https antes de abrir la pestaña. Usa un link de **PayPal.Me**
  (`https://www.paypal.com/paypalme/MateoRazquin`) hardcodeado en la
  constante `COFFEE_LINK` al principio de `content.js` — ojo si se quiere
  cambiar: un link de `paypal.com/myaccount/...` (panel privado de la
  cuenta) NO sirve para esto, tiene que ser un link público de cobro tipo
  `paypal.me/usuario`.
  - **Actualmente desactivada**: la constante `SHOW_DONATE_SECTION` en
    `content.js` está en `false` (se apagó a propósito para la prueba con
    el profesor invitado a testear). Con `false`, ni la sección ni el botón
    se renderizan en el panel. Poner esa constante en `true` para
    reactivarla.

## Limitaciones conocidas

- Requiere cuenta de Google Workspace/Education con salas de grupos de
  trabajo habilitadas (no disponible en cuentas personales gratuitas).
- Depende de selectores internos de Meet que **no son una API pública** y
  pueden cambiar sin aviso en una actualización de Google.
- La detección del botón "Herramientas de la reunión" y del ítem "Grupos de
  trabajo" es por texto visible — si Meet cambia el copy (o el idioma de la
  cuenta no es español/inglés), hay que sumar esas palabras a `KEYWORDS` en
  `content.js`.

## Mejoras pendientes (roadmap)

Por ahora no hay mejoras evaluadas pendientes de implementar. La última
pendiente (verificar que la asignación se aplicó de verdad) ya se implementó
— ver "Decisiones de diseño relevantes" más arriba.

## Para retomar el desarrollo desde otro chat

Si volvés a este proyecto en una conversación nueva con Claude, alcanza con
decir algo como *"seguimos trabajando en la extensión de Meet, está en
`~/proyectos/CreateRooms`, hay un README ahí con el contexto"* — este
archivo tiene todo lo necesario para entender qué se decidió y por qué sin
tener que releer el historial completo del chat anterior.
