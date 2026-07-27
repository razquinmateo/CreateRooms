// content.js
// Motor principal: panel inyectado, persistencia de grupos y automatización
// de las salas de grupos nativas de Meet.
//
// ENFOQUE (v2): el docente arma los equipos UNA VEZ arrastrando alumnos
// dentro del propio "Grupos de trabajo" nativo de Meet (drag & drop real de
// Google, mucho más confiable que cualquier cosa que podamos simular
// nosotros, y sin ambigüedad de nombres duplicados porque el docente agarra
// a la persona real, no un texto). La extensión sólo LEE esa composición y
// la guarda. En las próximas clases, el docente crea las salas vacías en
// Meet y la extensión tipea automáticamente a cada alumno guardado en su
// sala correspondiente.
//
// IMPORTANTE PARA MANTENIMIENTO:
// Google Meet es una SPA con clases CSS ofuscadas/hasheadas que cambian
// entre versiones. Los atributos usados acá (jsname, jscontroller,
// data-display-name, data-tooltip) fueron confirmados contra HTML real de
// Meet en julio 2026. Si algo deja de funcionar después de una
// actualización de Meet, lo primero es abrir DevTools, inspeccionar el
// elemento correspondiente y actualizar el selector acá.
(function () {
  "use strict";

  const STORAGE_KEY = "curso_actual";
  const BACKUP_KEY = "curso_actual_backup";
  const COURSES_KEY = "gpm_cursos";
  const ACTIVE_COURSE_KEY = "gpm_curso_activo";
  const POSITION_KEY = "gpm_panel_position";
  const COLLAPSED_KEY = "gpm_panel_colapsado";
  const COFFEE_LINK = "https://www.paypal.com/paypalme/MateoRazquin";
  // Desactivado temporalmente para la prueba con el profesor invitado a
  // testear — poné esto en `true` para reactivar la sección de donación.
  const SHOW_DONATE_SECTION = false;

  // Palabras clave (normalizadas, sin tildes) para ubicar botones/menuítems
  // por texto visible o aria-label, en vez de depender de un selector CSS
  // exacto que Meet puede cambiar de versión a versión.
  const KEYWORDS = {
    meetingTools: ["actividades", "activities", "herramientas de la reunion", "meeting tools"],
    breakoutRoomsMenuItem: ["grupos de trabajo", "breakout rooms", "salas de grupos"],
    createBreakoutRooms: ["crear grupos de trabajo", "create breakout rooms"],
  };

  const WAIT_TIMEOUT_MS = 6000;

  // Códigos de reunión de Meet: 3 bloques de letras separados por guiones,
  // ej. /abc-defg-hij. Cualquier otra ruta (landing, /_meet, configuración, etc.)
  // no es una llamada activa y no tiene sentido inyectar el panel ahí.
  const MEETING_CODE_REGEX = /^\/[a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4}$/i;

  function isInsideMeeting() {
    return MEETING_CODE_REGEX.test(window.location.pathname);
  }

  /** Detecta si el contexto de la extensión sigue vivo (no invalidado por un reload). */
  function isExtensionContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Internacionalización (i18n): español / inglés
  // ===========================================================================
  //
  // Todo lo que ve el docente pasa por t(clave, ...args). Los console.log /
  // console.warn de debug quedan en español nomás: son para quien mantiene
  // el código, no para el docente.

  const LANG_KEY = "gpm_idioma";

  // Banderas como SVG inline (no como archivos): a este tamaño no aportan
  // detalle extra y así evitamos sumar web_accessible_resources al manifest
  // o depender de que un archivo cargue bien. Simplificadas a propósito
  // (la bandera de EEUU no lleva estrellas, ilegibles a 20px de ancho).
  const FLAG_ES_SVG =
    '<svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="14" fill="#AA151B"/><rect y="3.5" width="20" height="7" fill="#F1BF00"/></svg>';
  const FLAG_US_SVG =
    '<svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="14" fill="#B22234"/><g fill="#fff"><rect y="2" width="20" height="1.1"/><rect y="4.2" width="20" height="1.1"/><rect y="6.4" width="20" height="1.1"/><rect y="8.6" width="20" height="1.1"/><rect y="10.8" width="20" height="1.1"/><rect y="13" width="20" height="1.1"/></g><rect width="9" height="7.5" fill="#3C3B6E"/></svg>';

  const STRINGS = {
    es: {
      panelTitle: "Grupos para Meet",
      courseAddTitle: "Nuevo curso",
      courseRenameTitle: "Renombrar curso",
      courseDeleteTitle: "Eliminar curso",
      savedTeamsTitle: "Equipos guardados",
      exportJsonBtn: "⬇️ Exportar JSON",
      importJsonBtn: "⬆️ Importar JSON",
      createUpdateTitle: "Crear / actualizar equipos",
      createHint:
        'Armá los grupos arrastrando alumnos dentro de "Grupos de trabajo" en Meet (nativo). Cuando termines, guardalos acá para reusarlos en la próxima clase.',
      saveFromMeetBtn: "💾 Guardar estos grupos",
      undoSaveBtn: "↩️ Deshacer última sobrescritura",
      actionTitle: "Acción",
      runBtn: "Configurar Grupos en Meet",
      donateQuestion: "¿Te sirvió esta herramienta?",
      donateBtn: "☕ Invitame un café",
      reopenBtn: "Grupos Meet",
      cancelBtn: "Cancelar",
      deleteBtnLabel: "Eliminar",
      saveBtnLabel: "Guardar",
      restoreBtnLabel: "Restaurar",
      importBtnLabel: "Importar",
      emptyTeamsHint: 'Todavía no hay equipos guardados. Armalos en Meet y usá "Guardar estos grupos" abajo.',
      deleteTeamTitle: "Eliminar equipo",
      confirmDeleteTeam: (nombre) => `¿Eliminar el equipo "${nombre}"? No se puede deshacer.`,
      cheatSheetNoRoom: (nombre) => `⚠️ ${nombre} — sin sala disponible`,
      cheatSheetAssignedTag: (n) => `✅ Asignados (${n})`,
      cheatSheetFailedTag: (n) => `❌ Fallaron (${n})`,
      cheatSheetDuplicateTag: (n) => `🟡 Nombre duplicado, asignar a mano (${n})`,
      cheatSheetAbsentTag: (n) => `⏳ No conectados (${n})`,
      cheatSheetNoRoomForTeam: "❌ No había sala libre para este equipo",
      cheatSheetNoNews: "Sin novedades.",
      cheatSheetSummary: (asignados, problemas) =>
        `📋 Detalle de la última distribución (${asignados} asignados${
          problemas > 0 ? `, ${problemas} a revisar` : ""
        })`,
      courseNamePromptMsg: 'Nombre del nuevo curso (ej. "Programación Avanzada"):',
      courseNameEmptyError: "El nombre del curso no puede estar vacío.",
      courseCreatedSuccess: (nombre) => `Curso "${nombre}" creado y activado.`,
      courseRenamePromptMsg: "Nuevo nombre para el curso:",
      courseRenamedSuccess: (nombre) => `Curso renombrado a "${nombre}".`,
      courseDeleteOnlyOneError: "No podés eliminar el único curso que tenés. Creá otro primero.",
      confirmDeleteCourse: (nombre) =>
        `¿Eliminar el curso "${nombre}" junto con todos sus equipos guardados? No se puede deshacer.`,
      courseDeletedSuccess: "Curso eliminado.",
      defaultCourseName: "Curso 1",
      defaultTeamName: "Equipo",
      noBackupError: "No hay una versión anterior guardada para restaurar.",
      confirmRestoreBackup: (n, total) =>
        `Esto va a reemplazar los equipos actuales por la versión guardada justo antes del último "Guardar estos grupos" (${n} equipo(s), ${total} alumnos). ¿Continuar?`,
      restoredSuccess: (n, total) => `Restaurado: ${n} equipo(s) con ${total} alumnos.`,
      exportNoTeamsError: "No hay equipos guardados para exportar.",
      exportedSuccess: (n) => `Exportados ${n} equipo(s) a un archivo JSON.`,
      importInvalidJsonError: "El archivo no es un JSON válido.",
      importBadShapeError:
        'El archivo no tiene el formato esperado (se esperaba una lista de equipos, o { "equipos": [...] }).',
      importNoValidTeamsError: "El archivo no tiene equipos con alumnos válidos para importar.",
      confirmImportReplace: (current, incoming, total) =>
        `Esto va a reemplazar los ${current} equipo(s) actuales por los ${incoming} del archivo (${total} alumnos en total). Se guarda una copia de la versión anterior por si querés deshacerlo. ¿Continuar?`,
      confirmImportFirst: (incoming, total) => `¿Importar ${incoming} equipo(s) con ${total} alumnos en total?`,
      importedSuccess: (n, total) => `Importé ${n} equipo(s) con ${total} alumnos.`,
      saveNoBreakoutPanelError:
        'Abrí primero "Herramientas de la reunión → Grupos de trabajo" en Meet y armá los equipos arrastrando a los alumnos.',
      saveNoRoomsError: "No encontré salas creadas. Creá las salas y arrastrá a los alumnos primero.",
      saveNoMembersError: "No encontré alumnos asignados en ninguna sala todavía. Arrastralos primero en Meet.",
      confirmSaveReplace: (current, incoming, total) =>
        `Esto va a reemplazar los ${current} equipo(s) guardados actualmente por los ${incoming} que armaste ahora en Meet (${total} alumnos en total). Se guarda una copia de la versión anterior por si querés deshacerlo. ¿Continuar?`,
      confirmSaveFirst: (incoming, total) => `¿Guardar estos ${incoming} equipo(s) con ${total} alumnos en total?`,
      savedSuccess: (n, total) => `Guardé ${n} equipo(s) con ${total} alumnos.`,
      toolsButtonNotFoundError:
        'No encontré el botón de "Herramientas de la reunión". Abrilo manualmente y volvé a presionar el botón.',
      breakoutItemNotFoundError:
        'No encontré la opción "Grupos de trabajo" dentro de Herramientas de la reunión. Abrila manualmente y volvé a presionar el botón.',
      breakoutPanelNotOpenError: 'El panel de "Grupos de trabajo" no terminó de abrir. Reintentá.',
      selectAtLeastOneTeamError: "Marcá al menos un equipo para distribuir.",
      openingBreakoutPanelInfo: "Abriendo panel de Grupos de trabajo…",
      noOneConnectedError:
        "Ningún alumno de los equipos seleccionados está en la Llamada principal ahora (puede que ya estén asignados, o no se hayan conectado).",
      createRoomsPromptInfo: (n) =>
        `Abrí el creador de salas. Elegí una cantidad de al menos ${n} sala(s) y confirmá en Meet. Después volvé a presionar "Configurar Grupos en Meet" para distribuir a los alumnos.`,
      noRoomsNoButtonError:
        'No encontré salas creadas ni el botón "Crear grupos de trabajo". Creá las salas manualmente en Meet y volvé a intentar.',
      progressReviewing: "Revisando equipos…",
      progressAssigning: (current, total) => `Asignando alumnos… ${current} / ${total}`,
      runSuccessAll: (total, salas) =>
        `Listo. Distribuí ${total} alumnos en ${salas} salas. Revisá y presioná "Abrir salas" en Meet cuando estés listo.`,
      partAutoAssigned: (n) => `${n} asignados automáticamente`,
      partBackupRooms: (n) => `${n} equipo(s) fueron a una sala de respaldo, revisá que sea la correcta`,
      partDuplicateNames: (n) => `${n} con nombre repetido entre los conectados (revisá el detalle abajo)`,
      partFailed: (n) => `${n} fallaron al asignar (revisá el detalle abajo)`,
      statusPartialPrefix: "Distribución parcial: ",
      statusWithWarningsPrefix: "Distribuido con avisos: ",
    },
    en: {
      panelTitle: "Groups for Meet",
      courseAddTitle: "New course",
      courseRenameTitle: "Rename course",
      courseDeleteTitle: "Delete course",
      savedTeamsTitle: "Saved teams",
      exportJsonBtn: "⬇️ Export JSON",
      importJsonBtn: "⬆️ Import JSON",
      createUpdateTitle: "Create / update teams",
      createHint:
        'Build the teams by dragging students inside Meet\'s native "Breakout rooms" panel. When you\'re done, save them here to reuse next class.',
      saveFromMeetBtn: "💾 Save these teams",
      undoSaveBtn: "↩️ Undo last overwrite",
      actionTitle: "Action",
      runBtn: "Set Up Groups in Meet",
      donateQuestion: "Did this tool help you?",
      donateBtn: "☕ Buy me a coffee",
      reopenBtn: "Meet Groups",
      cancelBtn: "Cancel",
      deleteBtnLabel: "Delete",
      saveBtnLabel: "Save",
      restoreBtnLabel: "Restore",
      importBtnLabel: "Import",
      emptyTeamsHint: 'No saved teams yet. Build them in Meet and use "Save these teams" below.',
      deleteTeamTitle: "Delete team",
      confirmDeleteTeam: (nombre) => `Delete the team "${nombre}"? This can't be undone.`,
      cheatSheetNoRoom: (nombre) => `⚠️ ${nombre} — no room available`,
      cheatSheetAssignedTag: (n) => `✅ Assigned (${n})`,
      cheatSheetFailedTag: (n) => `❌ Failed (${n})`,
      cheatSheetDuplicateTag: (n) => `🟡 Duplicate name, assign manually (${n})`,
      cheatSheetAbsentTag: (n) => `⏳ Not connected (${n})`,
      cheatSheetNoRoomForTeam: "❌ No free room was available for this team",
      cheatSheetNoNews: "Nothing to report.",
      cheatSheetSummary: (asignados, problemas) =>
        `📋 Latest distribution details (${asignados} assigned${problemas > 0 ? `, ${problemas} to review` : ""})`,
      courseNamePromptMsg: 'Name of the new course (e.g. "Advanced Programming"):',
      courseNameEmptyError: "The course name can't be empty.",
      courseCreatedSuccess: (nombre) => `Course "${nombre}" created and activated.`,
      courseRenamePromptMsg: "New name for the course:",
      courseRenamedSuccess: (nombre) => `Course renamed to "${nombre}".`,
      courseDeleteOnlyOneError: "You can't delete the only course you have. Create another one first.",
      confirmDeleteCourse: (nombre) =>
        `Delete the course "${nombre}" along with all its saved teams? This can't be undone.`,
      courseDeletedSuccess: "Course deleted.",
      defaultCourseName: "Course 1",
      defaultTeamName: "Team",
      noBackupError: "There's no previous version saved to restore.",
      confirmRestoreBackup: (n, total) =>
        `This will replace the current teams with the version saved right before the last "Save these teams" (${n} team(s), ${total} students). Continue?`,
      restoredSuccess: (n, total) => `Restored: ${n} team(s) with ${total} students.`,
      exportNoTeamsError: "There are no saved teams to export.",
      exportedSuccess: (n) => `Exported ${n} team(s) to a JSON file.`,
      importInvalidJsonError: "The file isn't valid JSON.",
      importBadShapeError:
        'The file doesn\'t have the expected format (expected a list of teams, or { "equipos": [...] }).',
      importNoValidTeamsError: "The file has no teams with valid students to import.",
      confirmImportReplace: (current, incoming, total) =>
        `This will replace the current ${current} team(s) with the ${incoming} from the file (${total} students in total). A copy of the previous version is saved in case you want to undo it. Continue?`,
      confirmImportFirst: (incoming, total) => `Import ${incoming} team(s) with ${total} students in total?`,
      importedSuccess: (n, total) => `Imported ${n} team(s) with ${total} students.`,
      saveNoBreakoutPanelError:
        'First open "Meeting tools → Breakout rooms" in Meet and build the teams by dragging students.',
      saveNoRoomsError: "I couldn't find any rooms created. Create the rooms and drag the students first.",
      saveNoMembersError: "I couldn't find any students assigned to a room yet. Drag them in Meet first.",
      confirmSaveReplace: (current, incoming, total) =>
        `This will replace the ${current} currently saved team(s) with the ${incoming} you just built in Meet (${total} students in total). A copy of the previous version is saved in case you want to undo it. Continue?`,
      confirmSaveFirst: (incoming, total) => `Save these ${incoming} team(s) with ${total} students in total?`,
      savedSuccess: (n, total) => `Saved ${n} team(s) with ${total} students.`,
      toolsButtonNotFoundError:
        'I couldn\'t find the "Meeting tools" button. Open it manually and press the button again.',
      breakoutItemNotFoundError:
        'I couldn\'t find "Breakout rooms" inside Meeting tools. Open it manually and press the button again.',
      breakoutPanelNotOpenError: 'The "Breakout rooms" panel didn\'t finish opening. Try again.',
      selectAtLeastOneTeamError: "Check at least one team to distribute.",
      openingBreakoutPanelInfo: "Opening Breakout rooms panel…",
      noOneConnectedError:
        "None of the students from the selected teams are in the main call right now (they might already be assigned, or not connected yet).",
      createRoomsPromptInfo: (n) =>
        `I opened the room creator. Choose at least ${n} room(s) and confirm in Meet. Then press "Set Up Groups in Meet" again to distribute the students.`,
      noRoomsNoButtonError:
        'I couldn\'t find any rooms or the "Create breakout rooms" button. Create the rooms manually in Meet and try again.',
      progressReviewing: "Reviewing teams…",
      progressAssigning: (current, total) => `Assigning students… ${current} / ${total}`,
      runSuccessAll: (total, salas) =>
        `Done. I distributed ${total} students into ${salas} rooms. Review and click "Open rooms" in Meet when you're ready.`,
      partAutoAssigned: (n) => `${n} assigned automatically`,
      partBackupRooms: (n) => `${n} team(s) went to a backup room, double-check it's the right one`,
      partDuplicateNames: (n) => `${n} with a repeated name among those connected (check the detail below)`,
      partFailed: (n) => `${n} failed to assign (check the detail below)`,
      statusPartialPrefix: "Partial distribution: ",
      statusWithWarningsPrefix: "Distributed with warnings: ",
    },
  };

  let currentLang = "es";

  function t(key, ...args) {
    const dict = STRINGS[currentLang] || STRINGS.es;
    const entry = key in dict ? dict[key] : STRINGS.es[key];
    if (typeof entry === "function") return entry(...args);
    return entry != null ? entry : key;
  }

  function detectDefaultLang() {
    const nav = ((navigator.language || navigator.userLanguage || "es") + "").toLowerCase();
    return nav.startsWith("en") ? "en" : "es";
  }

  function getStoredLang() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(null);
      try {
        chrome.storage.local.get([LANG_KEY], (result) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(result[LANG_KEY] || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function saveStoredLang(lang) {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(null);
      try {
        chrome.storage.local.set({ [LANG_KEY]: lang }, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  /** Carga el idioma guardado, o lo detecta a partir del idioma del
   *  navegador la primera vez (sin guardarlo todavía, para no "pisar" una
   *  eventual elección manual futura con algo que nunca se confirmó). */
  async function ensureLangLoaded() {
    const stored = await getStoredLang();
    currentLang = stored === "en" || stored === "es" ? stored : detectDefaultLang();
  }

  /** Cambia el idioma del panel (si ya es el idioma activo, no hace nada) y
   *  lo reconstruye de cero: todo el HTML del panel sale de panelHTML(),
   *  que usa t() en cada string, así que reinyectar es más simple y
   *  confiable que parchear nodo por nodo. */
  async function handleSetLang(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    await saveStoredLang(currentLang);

    // #gpm-panel, #gpm-reopen-btn y los overlays son hermanos dentro de un
    // <div> contenedor anónimo que injectPanel() crea; removerlo entero
    // evita dejar un div vacío huérfano en el body en cada cambio.
    document.getElementById("gpm-panel")?.parentElement?.remove();

    await injectPanel();
  }

  // ===========================================================================
  // Utilidades
  // ===========================================================================

  function simulateClick(el) {
    if (!el) return;
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
  }

  /** Escribe texto en un input disparando los eventos que React/Angular-style listeners esperan. */
  function typeIntoInput(input, text) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeInputValueSetter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function normalizeName(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // saca tildes para comparar mejor
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Busca un elemento clickeable cuyo aria-label o texto visible contenga
   *  alguna de las palabras clave (normalizadas, sin tildes). */
  function findByKeywords(keywords, roles = ['button', '[role="button"]', '[role="menuitem"]', '[role="listitem"]']) {
    const norm = keywords.map(normalizeName);
    const candidates = Array.from(document.querySelectorAll(roles.join(",")));
    return (
      candidates.find((el) => {
        const label = normalizeName(el.getAttribute("aria-label") || el.textContent || "");
        return norm.some((k) => label.includes(k));
      }) || null
    );
  }

  /** Como findByKeywords, pero reintenta con polling hasta encontrar algo o vencer el timeout. */
  async function waitForKeyword(keywords, roles, timeout = WAIT_TIMEOUT_MS) {
    const start = Date.now();
    let el = findByKeywords(keywords, roles);
    while (!el && Date.now() - start < timeout) {
      await sleep(200);
      el = findByKeywords(keywords, roles);
    }
    return el;
  }

  // ===========================================================================
  // Storage (chrome.storage.local)
  // ===========================================================================

  /** Acepta tanto el formato viejo ({nombre, apodo}) como un string plano,
   *  para no perder grupos guardados durante pruebas anteriores. */
  function normalizeMemberName(x) {
    if (typeof x === "string") return x.trim();
    return ((x && x.nombre) || "").trim();
  }

  // Claves por curso: cada curso tiene su propio juego de equipos y su
  // propio backup, para que dar clases a varios grupos (ej. "2do A" y
  // "2do B") no se pisen entre sí como pasaba cuando todo vivía bajo una
  // única clave global.
  function groupsKeyFor(courseId) {
    return `${STORAGE_KEY}::${courseId}`;
  }

  function backupKeyFor(courseId) {
    return `${BACKUP_KEY}::${courseId}`;
  }

  function getGroups() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid() || !activeCourseId) return resolve([]);
      const key = groupsKeyFor(activeCourseId);
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) return resolve([]);
          const raw = result[key] || [];
          const normalized = raw.map((t) => ({
            ...t,
            integrantes: (t.integrantes || []).map(normalizeMemberName).filter(Boolean),
          }));
          resolve(normalized);
        });
      } catch {
        resolve([]);
      }
    });
  }

  function saveGroups(groups) {
    return new Promise((resolve) => {
      if (!isExtensionContextValid() || !activeCourseId) return resolve(null);
      try {
        chrome.storage.local.set({ [groupsKeyFor(activeCourseId)]: groups }, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  /** Copia de respaldo de la última versión de equipos que "Guardar estos
   *  grupos" pisó, para el curso activo. Un solo slot por curso (no
   *  historial completo): alcanza para deshacer un guardado por error sin
   *  complicar el modelo de datos. */
  function getBackup() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid() || !activeCourseId) return resolve(null);
      const key = backupKeyFor(activeCourseId);
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(result[key] || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function saveBackup(groups) {
    return new Promise((resolve) => {
      if (!isExtensionContextValid() || !activeCourseId) return resolve(null);
      try {
        chrome.storage.local.set({ [backupKeyFor(activeCourseId)]: groups }, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  // ===========================================================================
  // Cursos: registro de cursos y curso activo
  // ===========================================================================

  function getCourses() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve({});
      try {
        chrome.storage.local.get([COURSES_KEY], (result) => {
          if (chrome.runtime.lastError) return resolve({});
          resolve(result[COURSES_KEY] || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  function saveCourses(courses) {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(null);
      try {
        chrome.storage.local.set({ [COURSES_KEY]: courses }, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  function getStoredActiveCourseId() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(null);
      try {
        chrome.storage.local.get([ACTIVE_COURSE_KEY], (result) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(result[ACTIVE_COURSE_KEY] || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function saveStoredActiveCourseId(id) {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(null);
      try {
        chrome.storage.local.set({ [ACTIVE_COURSE_KEY]: id }, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  // Lectura de las claves viejas (pre multi-curso), sólo para la migración.
  function getLegacyGroups() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve([]);
      try {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          if (chrome.runtime.lastError) return resolve([]);
          resolve(result[STORAGE_KEY] || []);
        });
      } catch {
        resolve([]);
      }
    });
  }

  function getLegacyBackup() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(null);
      try {
        chrome.storage.local.get([BACKUP_KEY], (result) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(result[BACKUP_KEY] || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  /** Corre una sola vez: si todavía no existe el registro de cursos, es que
   *  esta instalación viene de una versión anterior de la extensión (o es
   *  la primera vez que se usa). En ese caso migramos lo que hubiera bajo
   *  la clave vieja (un solo curso implícito) a un curso llamado "Curso 1",
   *  para no perder equipos ya guardados. Si el registro ya existe, sólo
   *  nos aseguramos de que el curso activo apunte a algo válido. */
  async function ensureCoursesMigrated() {
    let courses = await getCourses();

    if (Object.keys(courses).length === 0) {
      const legacyGroups = await getLegacyGroups();
      const legacyBackup = await getLegacyBackup();

      const nuevoId = uid();
      courses = { [nuevoId]: { nombre: t("defaultCourseName") } };

      await saveCourses(courses);
      await saveStoredActiveCourseId(nuevoId);

      activeCourseId = nuevoId; // saveGroups/saveBackup necesitan esto seteado
      await saveGroups(legacyGroups);
      if (legacyBackup) await saveBackup(legacyBackup);

      coursesCache = courses;
      return;
    }

    let storedActiveId = await getStoredActiveCourseId();
    if (!storedActiveId || !courses[storedActiveId]) {
      storedActiveId = Object.keys(courses)[0];
      await saveStoredActiveCourseId(storedActiveId);
    }

    coursesCache = courses;
    activeCourseId = storedActiveId;
  }

  function getPanelPosition() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(null);
      try {
        chrome.storage.local.get([POSITION_KEY], (result) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(result[POSITION_KEY] || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function savePanelPosition(left, top) {
    if (!isExtensionContextValid()) return;
    try {
      chrome.storage.local.set({ [POSITION_KEY]: { left, top } });
    } catch {
      /* contexto invalidado: se ignora, no rompe la UI */
    }
  }

  /** El panel arranca expandido la primera vez (para que el docente vea qué
   *  hay), pero si lo colapsa a mano esa preferencia se recuerda entre
   *  sesiones — la idea es usarlo activamente sólo al armar/reaplicar
   *  equipos, y dejarlo minimizado el resto del tiempo sin que vuelva a
   *  abrirse solo en cada clase. */
  function getPanelCollapsed() {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) return resolve(false);
      try {
        chrome.storage.local.get([COLLAPSED_KEY], (result) => {
          if (chrome.runtime.lastError) return resolve(false);
          resolve(!!result[COLLAPSED_KEY]);
        });
      } catch {
        resolve(false);
      }
    });
  }

  function savePanelCollapsed(collapsed) {
    if (!isExtensionContextValid()) return;
    try {
      chrome.storage.local.set({ [COLLAPSED_KEY]: collapsed });
    } catch {
      /* contexto invalidado: se ignora, no rompe la UI */
    }
  }

  function uid() {
    return "g_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  // ===========================================================================
  // Panel UI - estado
  // ===========================================================================

  let coursesCache = {}; // { [idCurso]: { nombre } }
  let activeCourseId = null;
  let groupsCache = [];
  let selectedIds = new Set();

  function panelHTML() {
    return `
      <div id="gpm-panel">
        <div class="gpm-header" id="gpm-header">
          <h2>${t("panelTitle")}</h2>
          <div class="gpm-header-actions">
            <div class="gpm-lang-switch">
              <button type="button" class="gpm-lang-flag${
                currentLang === "es" ? " gpm-lang-active" : ""
              }" id="gpm-lang-es" title="Español" aria-label="Español">${FLAG_ES_SVG}</button>
              <button type="button" class="gpm-lang-flag${
                currentLang === "en" ? " gpm-lang-active" : ""
              }" id="gpm-lang-en" title="English" aria-label="English">${FLAG_US_SVG}</button>
            </div>
            <span class="gpm-toggle">▾</span>
          </div>
        </div>
        <div class="gpm-body">
          <div class="gpm-course-row">
            <select class="gpm-course-select" id="gpm-course-select"></select>
            <button class="gpm-icon-btn" id="gpm-course-add" title="${t("courseAddTitle")}">➕</button>
            <button class="gpm-icon-btn" id="gpm-course-rename" title="${t("courseRenameTitle")}">✏️</button>
            <button class="gpm-icon-btn" id="gpm-course-delete" title="${t("courseDeleteTitle")}">🗑️</button>
          </div>

          <div class="gpm-section-title">${t("savedTeamsTitle")}</div>
          <div class="gpm-team-list" id="gpm-team-list"></div>

          <div class="gpm-section-row">
            <button class="gpm-link-btn" id="gpm-export-json">${t("exportJsonBtn")}</button>
            <button class="gpm-link-btn" id="gpm-import-json">${t("importJsonBtn")}</button>
          </div>
          <input type="file" id="gpm-import-file" accept="application/json,.json" class="gpm-hidden" />

          <div class="gpm-section-title">${t("createUpdateTitle")}</div>
          <div class="gpm-hint">${t("createHint")}</div>
          <button class="gpm-btn gpm-btn-secondary" id="gpm-save-from-meet">${t("saveFromMeetBtn")}</button>
          <button class="gpm-link-btn gpm-undo-btn gpm-hidden" id="gpm-undo-save">${t("undoSaveBtn")}</button>

          <div class="gpm-section-title">${t("actionTitle")}</div>
          <button class="gpm-btn gpm-btn-primary" id="gpm-run">${t("runBtn")}</button>
          <div class="gpm-status" id="gpm-status"></div>

          <div class="gpm-progress gpm-hidden" id="gpm-progress">
            <div class="gpm-progress-track">
              <div class="gpm-progress-fill" id="gpm-progress-fill"></div>
            </div>
            <div class="gpm-progress-text" id="gpm-progress-text"></div>
          </div>

          <div id="gpm-cheatsheet"></div>

          ${
            SHOW_DONATE_SECTION
              ? `<div class="gpm-donate">
            <p>${t("donateQuestion")}</p>
            <button class="gpm-coffee-btn" id="gpm-coffee">${t("donateBtn")}</button>
          </div>`
              : ""
          }
        </div>
      </div>
      <button id="gpm-reopen-btn">${t("reopenBtn")}</button>

      <div id="gpm-confirm-overlay" class="gpm-confirm-overlay gpm-hidden">
        <div class="gpm-confirm-box">
          <p id="gpm-confirm-message"></p>
          <div class="gpm-confirm-actions">
            <button class="gpm-btn gpm-btn-secondary" id="gpm-confirm-cancel">${t("cancelBtn")}</button>
            <button class="gpm-btn gpm-btn-danger" id="gpm-confirm-ok">${t("deleteBtnLabel")}</button>
          </div>
        </div>
      </div>

      <div id="gpm-prompt-overlay" class="gpm-confirm-overlay gpm-hidden">
        <div class="gpm-confirm-box">
          <p id="gpm-prompt-message"></p>
          <input type="text" id="gpm-prompt-input" class="gpm-prompt-input" />
          <div class="gpm-confirm-actions">
            <button class="gpm-btn gpm-btn-secondary" id="gpm-prompt-cancel">${t("cancelBtn")}</button>
            <button class="gpm-btn gpm-btn-primary" id="gpm-prompt-ok">${t("saveBtnLabel")}</button>
          </div>
        </div>
      </div>
    `;
  }

  // ===========================================================================
  // Render: lista de equipos guardados (selección para la sesión + borrado)
  // ===========================================================================

  function renderTeams() {
    const list = document.getElementById("gpm-team-list");
    if (!list) return;

    if (groupsCache.length === 0) {
      list.innerHTML = `<div class="gpm-empty-hint">${t("emptyTeamsHint")}</div>`;
      return;
    }

    list.innerHTML = groupsCache
      .map((g) => {
        const checked = selectedIds.has(g.idGrupo) ? "checked" : "";
        return `
          <div class="gpm-team-item">
            <input type="checkbox" data-id="${g.idGrupo}" class="gpm-team-check" ${checked} />
            <label>${escapeHtml(g.nombreGrupo)}</label>
            <span class="gpm-count">${g.integrantes.length}</span>
            <button class="gpm-delete" data-id="${g.idGrupo}" title="${t("deleteTeamTitle")}">✕</button>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll(".gpm-team-check").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.getAttribute("data-id");
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
      });
    });

    list.querySelectorAll(".gpm-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        const team = groupsCache.find((g) => g.idGrupo === id);
        if (!team) return;
        const ok = await showConfirm(t("confirmDeleteTeam", team.nombreGrupo));
        if (!ok) return;

        groupsCache = groupsCache.filter((g) => g.idGrupo !== id);
        selectedIds.delete(id);
        await saveGroups(groupsCache);
        renderTeams();
      });
    });
  }

  // ===========================================================================
  // Status helpers
  // ===========================================================================

  function setStatus(message, type = "info") {
    const el = document.getElementById("gpm-status");
    if (!el) return;
    el.textContent = message;
    el.className = `gpm-status gpm-visible gpm-${type}`;
  }

  function clearStatus() {
    const el = document.getElementById("gpm-status");
    if (!el) return;
    el.className = "gpm-status";
  }

  // ===========================================================================
  // Indicador de progreso durante la asignación
  // ===========================================================================

  function showProgress(current, total, label) {
    const wrap = document.getElementById("gpm-progress");
    const fill = document.getElementById("gpm-progress-fill");
    const text = document.getElementById("gpm-progress-text");
    if (!wrap || !fill || !text) return;

    wrap.classList.remove("gpm-hidden");
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    fill.style.width = pct + "%";
    text.textContent = label || `${current} / ${total}`;
  }

  function hideProgress() {
    const wrap = document.getElementById("gpm-progress");
    if (!wrap) return;
    wrap.classList.add("gpm-hidden");
  }

  // ===========================================================================
  // Cheat sheet en el panel (resumen de la última distribución)
  // ===========================================================================

  /**
   * Pinta en el panel el resultado de la última corrida de runAutomation, en
   * lugar de dejarlo únicamente en consola. `resumen` es un array de:
   *   { nombreGrupo, salaReal, notaRespaldo, asignados, fallidos, ambiguos, ausentes, sinSala }
   */
  function renderCheatSheet(resumen) {
    const container = document.getElementById("gpm-cheatsheet");
    if (!container) return;

    if (!resumen || resumen.length === 0) {
      container.innerHTML = "";
      return;
    }

    const totalAsignados = resumen.reduce((acc, r) => acc + r.asignados.length, 0);
    const totalProblemas = resumen.reduce(
      (acc, r) => acc + r.fallidos.length + r.ambiguos.length + r.ausentes.length + (r.sinSala ? 1 : 0),
      0
    );

    const filas = resumen
      .map((r) => {
        const titulo = r.sinSala
          ? t("cheatSheetNoRoom", escapeHtml(r.nombreGrupo))
          : `${escapeHtml(r.salaReal)} ${r.notaRespaldo ? "⚠️" : ""} <span class="gpm-cs-team-name">(${escapeHtml(
              r.nombreGrupo
            )})</span>`;

        const bloques = [];
        if (r.asignados.length) {
          bloques.push(
            `<div class="gpm-cs-row gpm-cs-ok"><span class="gpm-cs-tag">${t(
              "cheatSheetAssignedTag",
              r.asignados.length
            )}</span><span>${r.asignados.map(escapeHtml).join(", ")}</span></div>`
          );
        }
        if (r.fallidos.length) {
          bloques.push(
            `<div class="gpm-cs-row gpm-cs-fail"><span class="gpm-cs-tag">${t(
              "cheatSheetFailedTag",
              r.fallidos.length
            )}</span><span>${r.fallidos.map(escapeHtml).join(", ")}</span></div>`
          );
        }
        if (r.ambiguos.length) {
          bloques.push(
            `<div class="gpm-cs-row gpm-cs-warn"><span class="gpm-cs-tag">${t(
              "cheatSheetDuplicateTag",
              r.ambiguos.length
            )}</span><span>${r.ambiguos.map(escapeHtml).join(", ")}</span></div>`
          );
        }
        if (r.ausentes.length) {
          bloques.push(
            `<div class="gpm-cs-row gpm-cs-muted"><span class="gpm-cs-tag">${t(
              "cheatSheetAbsentTag",
              r.ausentes.length
            )}</span><span>${r.ausentes.map(escapeHtml).join(", ")}</span></div>`
          );
        }
        if (r.sinSala) {
          bloques.push(
            `<div class="gpm-cs-row gpm-cs-fail"><span class="gpm-cs-tag">${t("cheatSheetNoRoomForTeam")}</span></div>`
          );
        }

        return `
          <details class="gpm-cs-team">
            <summary>${titulo}</summary>
            ${bloques.join("") || `<div class="gpm-cs-row gpm-cs-muted">${t("cheatSheetNoNews")}</div>`}
          </details>
        `;
      })
      .join("");

    container.innerHTML = `
      <details class="gpm-cheatsheet-outer" open>
        <summary>${t("cheatSheetSummary", totalAsignados, totalProblemas)}</summary>
        <div class="gpm-cheatsheet-list">${filas}</div>
      </details>
    `;
  }

  /**
   * Reemplazo del confirm() nativo del navegador (que no se puede estilar)
   * por un modal propio, consistente con el resto del panel. Devuelve una
   * Promise<boolean> igual que si fuera confirm().
   */
  function showConfirm(message, confirmLabel = t("deleteBtnLabel"), danger = true) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("gpm-confirm-overlay");
      const msgEl = document.getElementById("gpm-confirm-message");
      const okBtn = document.getElementById("gpm-confirm-ok");
      const cancelBtn = document.getElementById("gpm-confirm-cancel");
      if (!overlay || !msgEl || !okBtn || !cancelBtn) return resolve(false);
      okBtn.textContent = confirmLabel;
      okBtn.classList.toggle("gpm-btn-danger", danger);
      okBtn.classList.toggle("gpm-btn-primary", !danger);

      msgEl.textContent = message;
      overlay.classList.remove("gpm-hidden");

      const cleanup = (result) => {
        overlay.classList.add("gpm-hidden");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        overlay.removeEventListener("click", onOverlayClick);
        resolve(result);
      };
      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);
      const onOverlayClick = (e) => {
        if (e.target === overlay) cleanup(false); // click afuera del cuadro = cancelar
      };

      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      overlay.addEventListener("click", onOverlayClick);
    });
  }

  /** Reemplazo de prompt() nativo, con el mismo estilo que showConfirm.
   *  Devuelve el texto ingresado, o null si se canceló. */
  function showPrompt(message, defaultValue = "") {
    return new Promise((resolve) => {
      const overlay = document.getElementById("gpm-prompt-overlay");
      const msgEl = document.getElementById("gpm-prompt-message");
      const input = document.getElementById("gpm-prompt-input");
      const okBtn = document.getElementById("gpm-prompt-ok");
      const cancelBtn = document.getElementById("gpm-prompt-cancel");
      if (!overlay || !msgEl || !input || !okBtn || !cancelBtn) return resolve(null);

      msgEl.textContent = message;
      input.value = defaultValue;
      overlay.classList.remove("gpm-hidden");
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);

      const cleanup = (result) => {
        overlay.classList.add("gpm-hidden");
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        overlay.removeEventListener("click", onOverlayClick);
        input.removeEventListener("keydown", onKeydown);
        resolve(result);
      };
      const onOk = () => cleanup(input.value);
      const onCancel = () => cleanup(null);
      const onOverlayClick = (e) => {
        if (e.target === overlay) cleanup(null);
      };
      const onKeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          cleanup(input.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cleanup(null);
        }
      };

      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      overlay.addEventListener("click", onOverlayClick);
      input.addEventListener("keydown", onKeydown);
    });
  }

  // ===========================================================================
  // Cursos: selector, alta, rename, borrado
  // ===========================================================================

  function renderCourseSelect() {
    const select = document.getElementById("gpm-course-select");
    if (!select) return;
    const ids = Object.keys(coursesCache);
    select.innerHTML = ids
      .map((id) => {
        const nombre = (coursesCache[id] && coursesCache[id].nombre) || "Curso";
        const selected = id === activeCourseId ? "selected" : "";
        return `<option value="${escapeHtml(id)}" ${selected}>${escapeHtml(nombre)}</option>`;
      })
      .join("");
  }

  async function handleCourseChange(e) {
    const id = e.target.value;
    if (!id || id === activeCourseId || !coursesCache[id]) return;

    activeCourseId = id;
    await saveStoredActiveCourseId(activeCourseId);

    groupsCache = await getGroups();
    selectedIds = new Set(groupsCache.map((g) => g.idGrupo));

    clearStatus();
    hideProgress();
    renderCheatSheet([]);
    renderTeams();
    await refreshUndoButton();
  }

  async function handleAddCourse() {
    const nombre = await showPrompt(t("courseNamePromptMsg"), "");
    if (nombre === null) return; // cancelado
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return setStatus(t("courseNameEmptyError"), "error");

    const nuevoId = uid();
    coursesCache[nuevoId] = { nombre: nombreLimpio };
    await saveCourses(coursesCache);

    activeCourseId = nuevoId;
    await saveStoredActiveCourseId(activeCourseId);
    groupsCache = [];
    selectedIds = new Set();

    renderCourseSelect();
    clearStatus();
    hideProgress();
    renderCheatSheet([]);
    renderTeams();
    await refreshUndoButton();
    setStatus(t("courseCreatedSuccess", nombreLimpio), "success");
  }

  async function handleRenameCourse() {
    const actual = coursesCache[activeCourseId];
    if (!actual) return;

    const nombre = await showPrompt(t("courseRenamePromptMsg"), actual.nombre);
    if (nombre === null) return;
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return setStatus(t("courseNameEmptyError"), "error");

    coursesCache[activeCourseId] = { ...actual, nombre: nombreLimpio };
    await saveCourses(coursesCache);
    renderCourseSelect();
    setStatus(t("courseRenamedSuccess", nombreLimpio), "success");
  }

  async function handleDeleteCourse() {
    const ids = Object.keys(coursesCache);
    if (ids.length <= 1) {
      return setStatus(t("courseDeleteOnlyOneError"), "error");
    }

    const actual = coursesCache[activeCourseId];
    const ok = await showConfirm(t("confirmDeleteCourse", actual.nombre));
    if (!ok) return;

    const idAEliminar = activeCourseId;
    delete coursesCache[idAEliminar];
    await saveCourses(coursesCache);
    try {
      chrome.storage.local.remove([groupsKeyFor(idAEliminar), backupKeyFor(idAEliminar)]);
    } catch {
      /* contexto invalidado: no rompe la UI, sólo quedan claves huérfanas */
    }

    activeCourseId = Object.keys(coursesCache)[0];
    await saveStoredActiveCourseId(activeCourseId);

    groupsCache = await getGroups();
    selectedIds = new Set(groupsCache.map((g) => g.idGrupo));

    renderCourseSelect();
    clearStatus();
    hideProgress();
    renderCheatSheet([]);
    renderTeams();
    await refreshUndoButton();
    setStatus(t("courseDeletedSuccess"), "success");
  }

  // ===========================================================================
  // Panel: inyección, drag del panel, wiring general
  // ===========================================================================

  function makeDraggable(panel, header) {
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener("pointerdown", (e) => {
      dragging = true;
      moved = false;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      panel.style.left = startLeft + "px";
      panel.style.top = startTop + "px";
      panel.style.right = "auto";

      header.setPointerCapture(e.pointerId);
      header.classList.add("gpm-dragging");
    });

    header.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;

      const maxLeft = window.innerWidth - panel.offsetWidth - 4;
      const maxTop = window.innerHeight - 40;
      const newLeft = Math.max(4, Math.min(maxLeft, startLeft + dx));
      const newTop = Math.max(4, Math.min(maxTop, startTop + dy));

      panel.style.left = newLeft + "px";
      panel.style.top = newTop + "px";
    });

    header.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      header.classList.remove("gpm-dragging");
      header.releasePointerCapture(e.pointerId);

      if (!moved) {
        panel.classList.toggle("gpm-collapsed");
        savePanelCollapsed(panel.classList.contains("gpm-collapsed"));
      } else {
        savePanelPosition(panel.style.left, panel.style.top);
      }
    });
  }

  async function injectPanel() {
    if (document.getElementById("gpm-panel")) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = panelHTML();
    document.body.appendChild(wrapper);

    const panel = document.getElementById("gpm-panel");
    const header = document.getElementById("gpm-header");

    const savedPos = await getPanelPosition();
    if (savedPos) {
      panel.style.left = savedPos.left;
      panel.style.top = savedPos.top;
      panel.style.right = "auto";
    }

    const savedCollapsed = await getPanelCollapsed();
    if (savedCollapsed) panel.classList.add("gpm-collapsed");

    makeDraggable(panel, header);

    const langEsBtn = document.getElementById("gpm-lang-es");
    const langEnBtn = document.getElementById("gpm-lang-en");
    [langEsBtn, langEnBtn].forEach((btn) => {
      if (!btn) return;
      // El header entero es la zona de arrastre (pointerdown la escucha
      // makeDraggable); sin esto, tocar una bandera movería el panel en
      // vez de cambiar el idioma.
      btn.addEventListener("pointerdown", (e) => e.stopPropagation());
    });
    langEsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleSetLang("es");
    });
    langEnBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleSetLang("en");
    });

    document.getElementById("gpm-course-select").addEventListener("change", handleCourseChange);
    document.getElementById("gpm-course-add").addEventListener("click", handleAddCourse);
    document.getElementById("gpm-course-rename").addEventListener("click", handleRenameCourse);
    document.getElementById("gpm-course-delete").addEventListener("click", handleDeleteCourse);
    document.getElementById("gpm-run").addEventListener("click", runAutomation);
    document.getElementById("gpm-save-from-meet").addEventListener("click", handleSaveFromMeet);
    document.getElementById("gpm-undo-save").addEventListener("click", handleUndoSave);
    document.getElementById("gpm-export-json").addEventListener("click", handleExportJson);
    document.getElementById("gpm-import-json").addEventListener("click", handleImportJsonClick);
    document.getElementById("gpm-import-file").addEventListener("change", handleImportJsonFile);
    if (SHOW_DONATE_SECTION) {
      document.getElementById("gpm-coffee")?.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL_LINK", url: COFFEE_LINK });
      });
    }

    renderCourseSelect();
    renderTeams();
    refreshUndoButton();
  }

  // ===========================================================================
  // Lectura / escritura de la composición de salas en Meet
  // ===========================================================================
  //
  // Atributos confirmados contra HTML real de Meet:
  //   - Cada sala es un <div jscontroller="Q4Uf1c" data-display-name="Sala de trabajo N">
  //   - El campo para escribir/soltar un nombre es <input jsname="nV0Ddb">
  //   - El campo de renombrar la sala es <input jsname="YPqjbf">
  //   - Cada persona (en la llamada principal o ya en una sala) es
  //     <div jsname="XPtOyb" data-display-name="Nombre" data-tooltip="...">
  //     con data-tooltip="Desconectado" para los que ya no están conectados
  //     (Meet los deja "fantasma" en el armado de salas de esa misma reunión).

  function findRoomBlocks() {
    const blocks = Array.from(document.querySelectorAll('div[jscontroller="Q4Uf1c"][data-display-name]')).filter(
      (el) => (el.getAttribute("data-display-name") || "").trim() !== ""
    );
    // Orden visual: de arriba hacia abajo según posición en pantalla
    return blocks.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  }

  function findMainCallContainer() {
    return (
      Array.from(document.querySelectorAll('div[jscontroller="Q4Uf1c"]')).find(
        (el) => !el.getAttribute("data-display-name")
      ) || null
    );
  }

  function getRoomActualName(roomBlock) {
    const nameInput = getRoomNameInput(roomBlock);
    return ((nameInput && nameInput.value) || roomBlock.getAttribute("data-display-name") || "").trim();
  }

  /** Busca, entre las salas ya creadas en Meet, la que tenga el mismo nombre
   *  (normalizado) que el equipo guardado. Matchear por nombre en vez de por
   *  posición es clave: si hoy sólo activás el Equipo 2 (porque el Equipo 1
   *  faltó), tiene que ir a la sala llamada "Equipo 2" exista donde exista,
   *  no a la primera sala que Meet nos muestre. */
  function findRoomBlockByName(roomBlocks, nombreGrupo) {
    const norm = normalizeName(nombreGrupo);
    return roomBlocks.find((room) => normalizeName(getRoomActualName(room)) === norm) || null;
  }

  function getRoomSearchInput(roomBlock) {
    return roomBlock.querySelector('input[jsname="nV0Ddb"]');
  }

  function getRoomNameInput(roomBlock) {
    return roomBlock.querySelector('input[jsname="YPqjbf"]');
  }

  /** Lee, con nombre limpio, los alumnos ya asignados dentro de una sala
   *  (ignorando fantasmas "Desconectado"). */
  function getRoomMemberNames(roomBlock) {
    const names = [];
    roomBlock.querySelectorAll('[jsname="XPtOyb"][data-display-name]').forEach((chip) => {
      const tooltip = normalizeName(chip.getAttribute("data-tooltip") || "");
      if (tooltip.includes("desconectado") || tooltip.includes("disconnected")) return;
      const nombre = (chip.getAttribute("data-display-name") || "").trim();
      if (nombre) names.push(nombre);
    });
    return names;
  }

  /** Lee, con nombre limpio, a quién ve Meet en la Llamada principal en este
   *  momento (ignorando a los "Desconectado"). Devuelve un Map
   *  nombre_normalizado -> cantidad, para poder detectar duplicados. */
  function getMainCallCounts() {
    const counts = new Map();
    const mainContainer = findMainCallContainer();
    if (!mainContainer) return counts;

    getRoomMemberNames(mainContainer).forEach((nombre) => {
      const norm = normalizeName(nombre);
      counts.set(norm, (counts.get(norm) || 0) + 1);
    });
    return counts;
  }

  function isBreakoutPanelOpen() {
    if (document.querySelector('div[jscontroller="Q4Uf1c"]')) return true;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'));
    return headings.some((h) => KEYWORDS.breakoutRoomsMenuItem.includes(normalizeName(h.textContent || "")));
  }

  async function openBreakoutRoomsPanel() {
    if (isBreakoutPanelOpen()) return;

    const toolsBtn = await waitForKeyword(KEYWORDS.meetingTools, ['button', '[role="button"]']);
    if (!toolsBtn) {
      throw new Error(t("toolsButtonNotFoundError"));
    }
    simulateClick(toolsBtn);

    const breakoutItem = await waitForKeyword(KEYWORDS.breakoutRoomsMenuItem, [
      'button',
      '[role="button"]',
      '[role="menuitem"]',
      '[role="listitem"]',
    ]);
    if (!breakoutItem) {
      throw new Error(t("breakoutItemNotFoundError"));
    }
    simulateClick(breakoutItem);

    const start = Date.now();
    while (!isBreakoutPanelOpen() && Date.now() - start < WAIT_TIMEOUT_MS) {
      await sleep(200);
    }
    if (!isBreakoutPanelOpen()) {
      throw new Error(t("breakoutPanelNotOpenError"));
    }
  }

  // ===========================================================================
  // Backup automático antes de sobrescribir
  // ===========================================================================

  /** Muestra u oculta el botón "Deshacer última sobrescritura" según si hay
   *  una copia de respaldo guardada (se crea automáticamente cada vez que
   *  "Guardar estos grupos" pisa una versión anterior). */
  async function refreshUndoButton() {
    const btn = document.getElementById("gpm-undo-save");
    if (!btn) return;
    const backup = await getBackup();
    btn.classList.toggle("gpm-hidden", !backup || backup.length === 0);
  }

  async function handleUndoSave() {
    clearStatus();
    const backup = await getBackup();
    if (!backup || backup.length === 0) {
      return setStatus(t("noBackupError"), "error");
    }

    const totalBackup = backup.reduce((acc, g) => acc + (g.integrantes || []).length, 0);
    const ok = await showConfirm(t("confirmRestoreBackup", backup.length, totalBackup), t("restoreBtnLabel"), false);
    if (!ok) return;

    groupsCache = backup;
    selectedIds = new Set(groupsCache.map((g) => g.idGrupo));
    await saveGroups(groupsCache);
    renderTeams();
    setStatus(t("restoredSuccess", backup.length, totalBackup), "success");
  }

  // ===========================================================================
  // Exportar / importar equipos como JSON
  // ===========================================================================

  /** Descarga los equipos guardados actuales como un archivo .json, para
   *  tener un respaldo fuera de chrome.storage.local (que se puede perder
   *  si se reinstala Chrome o se limpian datos del navegador) o para
   *  llevarlos a otra PC. */
  function handleExportJson() {
    clearStatus();
    if (groupsCache.length === 0) {
      return setStatus(t("exportNoTeamsError"), "error");
    }

    const payload = {
      formato: "grupos-meet-v1",
      exportadoEl: new Date().toISOString(),
      equipos: groupsCache.map((g) => ({ nombreGrupo: g.nombreGrupo, integrantes: g.integrantes })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `grupos-meet-${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus(t("exportedSuccess", groupsCache.length), "success");
  }

  function handleImportJsonClick() {
    const input = document.getElementById("gpm-import-file");
    if (input) input.click();
  }

  /** Acepta tanto un array plano de equipos como { equipos: [...] } (el
   *  formato que exporta handleExportJson), para no ser quisquillosos con
   *  archivos armados a mano o adaptados de otro lado. */
  async function handleImportJsonFile(e) {
    clearStatus();
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permite reimportar el mismo archivo si hace falta
    if (!file) return;

    let data;
    try {
      const text = await file.text();
      data = JSON.parse(text);
    } catch {
      return setStatus(t("importInvalidJsonError"), "error");
    }

    const equiposCrudos = Array.isArray(data) ? data : data && data.equipos;
    if (!Array.isArray(equiposCrudos)) {
      return setStatus(t("importBadShapeError"), "error");
    }

    const nuevosGrupos = equiposCrudos
      .map((g) => {
        const nombreGrupo = ((g && g.nombreGrupo) || "").toString().trim() || t("defaultTeamName");
        const integrantesRaw = (g && g.integrantes) || [];
        const integrantes = Array.isArray(integrantesRaw)
          ? integrantesRaw.map(normalizeMemberName).filter(Boolean)
          : [];
        return { idGrupo: uid(), nombreGrupo, integrantes };
      })
      .filter((g) => g.integrantes.length > 0);

    if (nuevosGrupos.length === 0) {
      return setStatus(t("importNoValidTeamsError"), "error");
    }

    const totalAlumnos = nuevosGrupos.reduce((acc, g) => acc + g.integrantes.length, 0);
    const mensaje =
      groupsCache.length > 0
        ? t("confirmImportReplace", groupsCache.length, nuevosGrupos.length, totalAlumnos)
        : t("confirmImportFirst", nuevosGrupos.length, totalAlumnos);

    const ok = await showConfirm(mensaje, t("importBtnLabel"), false);
    if (!ok) return;

    if (groupsCache.length > 0) {
      await saveBackup(groupsCache);
    }

    groupsCache = nuevosGrupos;
    selectedIds = new Set(groupsCache.map((g) => g.idGrupo));
    await saveGroups(groupsCache);
    renderTeams();
    await refreshUndoButton();
    setStatus(t("importedSuccess", nuevosGrupos.length, totalAlumnos), "success");
  }

  // ===========================================================================
  // Guardar los grupos armados a mano en Meet
  // ===========================================================================

  async function handleSaveFromMeet() {
    clearStatus();

    if (!isBreakoutPanelOpen()) {
      return setStatus(t("saveNoBreakoutPanelError"), "error");
    }

    const roomBlocks = findRoomBlocks();
    if (roomBlocks.length === 0) {
      return setStatus(t("saveNoRoomsError"), "error");
    }

    const nuevosGrupos = roomBlocks
      .map((room) => {
        const nameInput = getRoomNameInput(room);
        const nombreGrupo =
          (nameInput && nameInput.value.trim()) || room.getAttribute("data-display-name") || t("defaultTeamName");
        const integrantes = getRoomMemberNames(room);
        return { idGrupo: uid(), nombreGrupo, integrantes };
      })
      .filter((g) => g.integrantes.length > 0);

    if (nuevosGrupos.length === 0) {
      return setStatus(t("saveNoMembersError"), "error");
    }

    const totalAlumnos = nuevosGrupos.reduce((acc, g) => acc + g.integrantes.length, 0);
    const mensaje =
      groupsCache.length > 0
        ? t("confirmSaveReplace", groupsCache.length, nuevosGrupos.length, totalAlumnos)
        : t("confirmSaveFirst", nuevosGrupos.length, totalAlumnos);

    const ok = await showConfirm(mensaje, t("saveBtnLabel"), false);
    if (!ok) return;

    if (groupsCache.length > 0) {
      await saveBackup(groupsCache);
    }

    groupsCache = nuevosGrupos;
    selectedIds = new Set(groupsCache.map((g) => g.idGrupo)); // activados por defecto
    await saveGroups(groupsCache);
    renderTeams();
    await refreshUndoButton();
    setStatus(t("savedSuccess", nuevosGrupos.length, totalAlumnos), "success");
  }

  // ===========================================================================
  // Reaplicar los grupos guardados sobre salas vacías
  // ===========================================================================

  /**
   * Asigna a un alumno a una sala puntual usando su campo de asignación
   * (input[jsname="nV0Ddb"]).
   */
  async function assignParticipantToRoom(roomBlock, participantName) {
    const input = getRoomSearchInput(roomBlock);
    if (!input) {
      throw new Error(`No encontré el campo de asignación dentro de la sala para asignar a "${participantName}".`);
    }

    // Comparamos qué había ANTES de tipear vs. DESPUÉS, para priorizar los
    // elementos que aparecieron recién (la sugerencia real) y no confundirnos
    // con filas ya existentes en la página.
    const antes = new Set(document.querySelectorAll('[role="option"], [role="listitem"]'));

    simulateClick(input);
    typeIntoInput(input, participantName);
    await sleep(450);

    const despues = Array.from(document.querySelectorAll('[role="option"], [role="listitem"]'));
    const nuevos = despues.filter((el) => !antes.has(el));
    const candidatos = nuevos.length > 0 ? nuevos : despues;

    const suggestion = candidatos.find((el) => normalizeName(el.textContent || "").includes(normalizeName(participantName)));

    if (!suggestion) {
      throw new Error(`No apareció "${participantName}" en las sugerencias de la sala.`);
    }

    simulateClick(suggestion);
    await sleep(200);
  }

  async function runAutomation() {
    clearStatus();
    hideProgress();

    const activeTeams = groupsCache.filter((g) => selectedIds.has(g.idGrupo));
    if (activeTeams.length === 0) {
      return setStatus(t("selectAtLeastOneTeamError"), "error");
    }

    setStatus(t("openingBreakoutPanelInfo"), "info");
    try {
      await openBreakoutRoomsPanel();
    } catch (err) {
      return setStatus(err.message, "error");
    }

    await sleep(400);

    // Leemos presencia directamente desde la Llamada principal del propio
    // panel de Grupos de trabajo: nombre limpio y excluye "Desconectado".
    const connected = getMainCallCounts();

    // Por equipo: presentes sin ambigüedad (se asignan solos), presentes con
    // nombre duplicado entre los conectados (no se asignan automáticamente,
    // porque no hay forma confiable de saber cuál de los dos es cuál), y
    // ausentes (incluye a quienes ya estén asignados a una sala).
    const plan = activeTeams.map((team) => {
      const presentesSeguros = [];
      const presentesAmbiguos = [];
      const ausentes = [];

      team.integrantes.forEach((nombre) => {
        const norm = normalizeName(nombre);
        const cantidad = connected.get(norm) || 0;
        if (cantidad === 0) ausentes.push(nombre);
        else if (cantidad > 1) presentesAmbiguos.push(nombre);
        else presentesSeguros.push(nombre);
      });

      return { nombreGrupo: team.nombreGrupo, presentesSeguros, presentesAmbiguos, ausentes };
    });

    const totalSeguros = plan.reduce((acc, p) => acc + p.presentesSeguros.length, 0);
    const totalAmbiguos = plan.reduce((acc, p) => acc + p.presentesAmbiguos.length, 0);

    if (totalSeguros === 0 && totalAmbiguos === 0) {
      return setStatus(t("noOneConnectedError"), "error");
    }

    const roomBlocks = findRoomBlocks();

    if (roomBlocks.length === 0) {
      const createBtn = findByKeywords(KEYWORDS.createBreakoutRooms, ['button', '[role="button"]']);
      if (createBtn) {
        simulateClick(createBtn);
        setStatus(t("createRoomsPromptInfo", plan.length), "info");
      } else {
        setStatus(t("noRoomsNoButtonError"), "error");
      }
      return;
    }

    if (roomBlocks.length < plan.length) {
      // Esto es sólo una señal de alerta temprana (puede haber salas de
      // sobra sin usar); el chequeo real por equipo pasa dentro del loop,
      // matcheando por nombre.
      console.warn(
        `[Grupos para Meet] Hay ${plan.length} equipos activos pero solo ${roomBlocks.length} salas creadas.`
      );
    }

    // Primera pasada: matchear cada equipo activo con su sala por nombre exacto.
    const asignacion = new Map(); // team -> roomBlock | null
    const salasReclamadas = new Set();

    plan.forEach((team) => {
      const room = findRoomBlockByName(roomBlocks, team.nombreGrupo);
      asignacion.set(team, room);
      if (room) salasReclamadas.add(room);
    });

    // Segunda pasada: a los equipos que NO encontraron su sala de siempre,
    // les asignamos una sala que haya quedado libre (sin reclamar por nombre
    // exacto por ningún otro equipo activo). Cubre el caso típico: un equipo
    // faltó, el docente creó menos salas de las habituales, y otro equipo
    // presente termina ocupando el "hueco" que dejó el ausente.
    const salasLibres = roomBlocks.filter((r) => !salasReclamadas.has(r));
    let libreIdx = 0;
    const asignadoPorRespaldo = new Set();

    plan.forEach((team) => {
      if (asignacion.get(team) === null && libreIdx < salasLibres.length) {
        const room = salasLibres[libreIdx++];
        asignacion.set(team, room);
        asignadoPorRespaldo.add(team);
      }
    });

    const fallos = [];
    const cheatSheet = [];
    const resumen = [];

    // Progreso: contamos sobre los alumnos "seguros" (lo que realmente tarda:
    // cada uno implica tipear, esperar la sugerencia y clickearla).
    let procesados = 0;
    showProgress(
      0,
      totalSeguros,
      totalSeguros > 0 ? t("progressAssigning", 0, totalSeguros) : t("progressReviewing")
    );

    for (let i = 0; i < plan.length; i++) {
      const team = plan[i];
      const room = asignacion.get(team);

      if (!room) {
        fallos.push(
          `Equipo "${team.nombreGrupo}": no encontré su sala ni había ninguna libre para usar en su lugar. Creá una sala más en Meet y volvé a intentar.`
        );
        cheatSheet.push(`Equipo "${team.nombreGrupo}": SIN SALA DISPONIBLE`);
        resumen.push({
          nombreGrupo: team.nombreGrupo,
          salaReal: null,
          notaRespaldo: false,
          asignados: [],
          fallidos: [],
          ambiguos: team.presentesAmbiguos,
          ausentes: team.ausentes,
          sinSala: true,
        });
        continue;
      }

      const esRespaldo = asignadoPorRespaldo.has(team);
      const notaRespaldo = esRespaldo ? ` [sala de respaldo, no era la suya de siempre — revisar]` : "";

      cheatSheet.push(
        `${getRoomActualName(room)} (${team.nombreGrupo}${notaRespaldo}): ${team.presentesSeguros.join(", ") || "—"}` +
          (team.presentesAmbiguos.length
            ? ` | PENDIENTES DE ASIGNAR A MANO (nombre duplicado): ${team.presentesAmbiguos.join(", ")}`
            : "")
      );

      const asignadosOk = [];
      const fallidosEquipo = [];

      for (const alumno of team.presentesSeguros) {
        try {
          await assignParticipantToRoom(room, alumno);
          asignadosOk.push(alumno);
        } catch (err) {
          fallidosEquipo.push(alumno);
          fallos.push(`${alumno} (${team.nombreGrupo}): ${err.message}`);
        }
        procesados++;
        showProgress(procesados, totalSeguros, t("progressAssigning", procesados, totalSeguros));
      }

      resumen.push({
        nombreGrupo: team.nombreGrupo,
        salaReal: getRoomActualName(room),
        notaRespaldo: esRespaldo,
        asignados: asignadosOk,
        fallidos: fallidosEquipo,
        ambiguos: team.presentesAmbiguos,
        ausentes: team.ausentes,
        sinSala: false,
      });
    }

    hideProgress();
    renderCheatSheet(resumen);

    console.log("[Grupos para Meet] Distribución planeada:\n" + cheatSheet.join("\n"));

    if (asignadoPorRespaldo.size > 0) {
      console.warn(
        `[Grupos para Meet] ${asignadoPorRespaldo.size} equipo(s) usaron una sala de respaldo porque no encontré la suya: ` +
          Array.from(asignadoPorRespaldo)
            .map((t) => t.nombreGrupo)
            .join(", ")
      );
    }

    if (totalAmbiguos > 0) {
      const detalleAmbiguos = plan
        .filter((p) => p.presentesAmbiguos.length > 0)
        .map((p) => `${p.nombreGrupo}: ${p.presentesAmbiguos.join(", ")}`)
        .join(" — ");
      console.warn(
        `[Grupos para Meet] ${totalAmbiguos} alumno(s) con nombre duplicado entre los conectados, NO se asignaron solos: ${detalleAmbiguos}`
      );
    }

    if (fallos.length === 0 && totalAmbiguos === 0 && asignadoPorRespaldo.size === 0) {
      setStatus(t("runSuccessAll", totalSeguros, plan.length), "success");
    } else {
      const partes = [];
      if (totalSeguros > 0) partes.push(t("partAutoAssigned", totalSeguros));
      if (asignadoPorRespaldo.size > 0) partes.push(t("partBackupRooms", asignadoPorRespaldo.size));
      if (totalAmbiguos > 0) partes.push(t("partDuplicateNames", totalAmbiguos));
      if (fallos.length > 0) partes.push(t("partFailed", fallos.length));
      setStatus(
        (fallos.length > 0 ? t("statusPartialPrefix") : t("statusWithWarningsPrefix")) + partes.join(" · "),
        fallos.length > 0 ? "error" : "info"
      );
      if (fallos.length) console.warn("[Grupos para Meet] Fallos de asignación:\n" + fallos.join("\n"));
    }

    const ausentesTotal = plan.flatMap((p) => p.ausentes);
    if (ausentesTotal.length > 0) {
      console.log("[Grupos para Meet] No estaban conectados: " + ausentesTotal.join(", "));
    }
  }

  // ===========================================================================
  // Bootstrap
  // ===========================================================================

  async function init() {
    if (!isExtensionContextValid()) {
      console.warn(
        "[Grupos para Meet] Contexto de la extensión invalidado (probablemente se recargó la extensión). Refrescá esta pestaña de Meet."
      );
      return;
    }
    await ensureLangLoaded();
    await ensureCoursesMigrated();
    groupsCache = await getGroups();
    if (isInsideMeeting()) injectPanel();
  }

  // Meet es una SPA: se puede pasar del landing a una reunión (o al revés,
  // al colgar) sin que la página recargue. Por eso revisamos periódicamente
  // si corresponde mostrar u ocultar el panel, y lo reinyectamos si Meet
  // lo llegara a borrar por un re-render.
  init();
  setInterval(() => {
    if (!isExtensionContextValid()) return; // extensión recargada: esperar a que el usuario refresque la pestaña

    const dentroDeReunion = isInsideMeeting();
    const panelExiste = !!document.getElementById("gpm-panel");

    if (dentroDeReunion && !panelExiste) {
      injectPanel();
    } else if (!dentroDeReunion && panelExiste) {
      document.getElementById("gpm-panel")?.remove();
      document.getElementById("gpm-reopen-btn")?.remove();
    }
  }, 2000);
})();
