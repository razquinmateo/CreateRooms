# Política de Privacidad — Grupos para Meet

**Última actualización:** 26 de julio de 2026

## ¿Qué es "Grupos para Meet"?

"Grupos para Meet" es una extensión de Chrome que ayuda a docentes a guardar la composición de sus salas de grupos de trabajo (breakout rooms) de Google Meet y reaplicarla automáticamente en clases futuras, para no tener que rearmar los mismos equipos a mano en cada sesión.

## Qué datos maneja la extensión

Para funcionar, la extensión lee información que ya es visible para el docente dentro de la propia interfaz de Google Meet:

- Nombres de los participantes conectados a la reunión.
- Nombres de las salas de grupos de trabajo y qué participantes están asignados a cada una.

Estos son exactamente los mismos datos que Meet ya le muestra al docente en pantalla. La extensión no accede a ninguna información que el docente no pueda ver por sí mismo durante la reunión, y no interactúa de ninguna forma con los estudiantes ni con sus dispositivos.

## Cómo se almacenan estos datos

Toda la información (equipos guardados, nombres de los cursos, posición y preferencias del panel) se guarda **exclusivamente en el almacenamiento local del navegador** (`chrome.storage.local`), en el propio dispositivo del docente.

- **Nunca se envía a ningún servidor.** La extensión no tiene backend propio, no realiza llamadas de red con estos datos, y no los transmite a Google, a los desarrolladores de la extensión, ni a ningún tercero.
- **Nunca se vende ni se comparte** con anunciantes, servicios de analítica, ni ningún otro servicio externo.
- **No hay seguimiento (tracking) ni analíticas** de ningún tipo dentro de la extensión.
- Los datos permanecen guardados en el navegador del docente hasta que él mismo los borre (eliminando un equipo o un curso desde el propio panel de la extensión), hasta que desinstale la extensión, o hasta que limpie manualmente los datos de extensiones de Chrome.

## Por qué se solicitan los permisos que se solicitan

- **`storage`**: para guardar los equipos, cursos y preferencias del panel localmente en el navegador, evitando así tener que rearmarlos en cada clase.
- **`activeTab`** y acceso de host a **`https://meet.google.com/*`**: para poder leer la composición de las salas de grupos de trabajo dentro de la pestaña de Meet activa, y para escribir/asignar automáticamente a los alumnos guardados en su sala correspondiente.

La extensión no solicita ningún permiso adicional a los mencionados, y no se ejecuta ni tiene efecto en ningún sitio que no sea `meet.google.com`.

## Uso en contextos educativos y con menores de edad

Es habitual que esta extensión se use en clases con estudiantes menores de edad. Por eso es importante aclarar:

- La extensión **no recolecta datos directamente de los estudiantes** ni interactúa con ellos de ninguna forma — únicamente lee, desde el propio navegador del docente, información que Google Meet ya muestra en pantalla durante la reunión.
- No existe ningún servidor, base de datos externa, ni servicio en la nube asociado a la extensión: todo permanece en el dispositivo del docente.
- Es responsabilidad del docente o de la institución educativa asegurarse de que el uso de esta herramienta cumpla con las políticas de protección de datos de su propia institución o jurisdicción.

## Declaración de Uso Limitado (Limited Use)

El uso y la transferencia de información que esta extensión obtiene desde Google Meet cumplen con la [Política de Datos de Usuario de Chrome Web Store](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), incluyendo los requisitos de Uso Limitado ("Limited Use").

## Cambios a esta política

Si en el futuro se agregan funciones que cambien la forma en que se manejan los datos (por ejemplo, sincronización en la nube), esta política se actualizará antes de publicar esa actualización, y se reflejará en la fecha de "Última actualización" de arriba.

## Contacto

Ante cualquier consulta sobre esta política o sobre el manejo de datos de la extensión, podés escribir a: **razquinm@gmail.com**

---

# Privacy Policy — Groups for Meet (English)

**Last updated:** July 26, 2026

## What is "Groups for Meet"?

"Groups for Meet" is a Chrome extension that helps teachers save the composition of their Google Meet breakout rooms and automatically reapply it in future classes, so they don't have to rebuild the same teams by hand every session.

## What data the extension handles

To work, the extension reads information that is already visible to the teacher within Google Meet's own interface:

- Names of participants connected to the meeting.
- Breakout room names and which participants are assigned to each one.

This is exactly the same data Meet already displays to the teacher on screen. The extension does not access any information the teacher couldn't already see themselves during the meeting, and it does not interact with students or their devices in any way.

## How this data is stored

All information (saved teams, course names, panel position and preferences) is stored **exclusively in the browser's local storage** (`chrome.storage.local`), on the teacher's own device.

- **It is never sent to any server.** The extension has no backend, makes no network calls with this data, and does not transmit it to Google, to the extension's developer, or to any third party.
- **It is never sold or shared** with advertisers, analytics services, or any other external service.
- **There is no tracking or analytics** of any kind within the extension.
- Data stays in the teacher's browser until they delete it themselves (by removing a team or a course from the extension's own panel), until they uninstall the extension, or until they manually clear Chrome extension data.

## Why the requested permissions are needed

- **`storage`**: to save teams, courses, and panel preferences locally in the browser, so they don't need to be rebuilt every class.
- **`activeTab`** and host access to **`https://meet.google.com/*`**: to read the breakout room composition within the active Meet tab, and to automatically type/assign saved students into their corresponding room.

The extension requests no permissions beyond those listed above, and has no effect on any site other than `meet.google.com`.

## Use in educational contexts and with minors

This extension is commonly used in classes with underage students. It's important to clarify:

- The extension **does not collect data directly from students** nor interact with them in any way — it only reads, from the teacher's own browser, information Google Meet already displays on screen during the meeting.
- There is no server, external database, or cloud service associated with the extension: everything stays on the teacher's device.
- It is the responsibility of the teacher or educational institution to ensure use of this tool complies with their own institution's or jurisdiction's data protection policies.

## Limited Use Disclosure

This extension's use and transfer of information received from Google Meet adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Changes to this policy

If features are added in the future that change how data is handled (for example, cloud sync), this policy will be updated before that update is published, and the "Last updated" date above will be revised accordingly.

## Contact

For any questions about this policy or how the extension handles data, contact: **[fill in with your contact email]**
