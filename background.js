// background.js
// Service worker mínimo. Su única responsabilidad hoy es abrir pestañas
// externas de forma segura (ej. el link de donación por PayPal.Me), ya que
// content.js corre en el contexto de la página y no debería manejar
// creación de pestañas directamente.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_EXTERNAL_LINK" && typeof message.url === "string") {
    // Validación simple: solo abrimos http/https, nunca javascript: ni data:
    if (/^https?:\/\//i.test(message.url)) {
      chrome.tabs.create({ url: message.url });
    }
    sendResponse({ ok: true });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Grupos para Meet] Extensión instalada correctamente.");
});
