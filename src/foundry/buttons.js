import { StyleConfig } from "./style-config.js";
import { SETTINGS, get } from "./settings.js";

const TOOL_NAME = "sargasDiceStyles";
const ICON = "fa-solid fa-dice";

/**
 * Dice style button in the token controls (left toolbar).
 * v13+ passes controls as an object keyed by name with `tools` objects;
 * older versions pass an array with `tools` arrays. Both are handled.
 */
export function addSceneControlButton(controls) {
  if (!get(SETTINGS.showButton)) return;
  const title = "SARGAS.Controls.Button";
  if (Array.isArray(controls)) {
    const token = controls.find(c => c.name === "token" || c.name === "tokens");
    token?.tools.push({ name: TOOL_NAME, title, icon: ICON, button: true, visible: true, onClick: () => StyleConfig.open() });
    return;
  }
  const token = controls?.tokens ?? controls?.token;
  if (!token?.tools) return;
  const order = Object.keys(token.tools).length;
  token.tools[TOOL_NAME] = {
    name: TOOL_NAME,
    title,
    icon: ICON,
    order,
    button: true,
    visible: true,
    onChange: () => StyleConfig.open()
  };
}

/** A dice button next to the chat roll controls. */
export function addChatButton(app, html) {
  if (!get(SETTINGS.showButton)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const controls = root?.querySelector?.("#chat-controls, .chat-controls, .control-buttons");
  if (!controls || controls.querySelector(".sargas-dice-button")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `ui-control icon ${ICON} sargas-dice-button`;
  const label = game.i18n.localize("SARGAS.Controls.Button");
  button.dataset.tooltip = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", event => {
    event.preventDefault();
    StyleConfig.open();
  });
  controls.prepend(button);
}

export function registerButtons() {
  Hooks.on("getSceneControlButtons", addSceneControlButton);
  Hooks.on("renderChatLog", addChatButton);
  Hooks.on("renderChatInput", addChatButton);
}
