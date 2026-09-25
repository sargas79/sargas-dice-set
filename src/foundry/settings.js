import { MODULE_ID } from "../constants.js";
import { getStyles } from "../styles/registry.js";
import { resolveStyle } from "./style-selection.js";
import { StyleConfig } from "./style-config.js";

export const SETTINGS = {
  enabledStyles: "enabledStyles",
  enabled: "enabled",
  quality: "quality",
  speed: "speed",
  fadeDelay: "fadeDelay",
  volume: "volume",
  showOthers: "showOthers",
  holdChat: "holdChat",
  diceScale: "diceScale",
  maxDice: "maxDice",
  hiddenRolls: "hiddenRolls"
};

export const get = key => game.settings.get(MODULE_ID, key);

export function registerSettings() {
  const reg = (key, data) => game.settings.register(MODULE_ID, key, { name: `SARGAS.Settings.${key}.Name`, hint: `SARGAS.Settings.${key}.Hint`, ...data });

  game.settings.registerMenu(MODULE_ID, "styleConfig", {
    name: "SARGAS.Settings.styleConfig.Name",
    label: "SARGAS.Settings.styleConfig.Label",
    hint: "SARGAS.Settings.styleConfig.Hint",
    icon: "fa-solid fa-dice",
    type: StyleConfig,
    restricted: false
  });

  // GM-only on/off flag per style. Missing keys mean "enabled".
  reg(SETTINGS.enabledStyles, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: () => {
      StyleConfig.refreshOpen();
      warnIfFallback();
    }
  });

  reg(SETTINGS.enabled, { scope: "client", config: true, type: Boolean, default: true });
  reg(SETTINGS.quality, {
    scope: "client",
    config: true,
    type: String,
    default: "medium",
    choices: { low: "SARGAS.Quality.low", medium: "SARGAS.Quality.medium", high: "SARGAS.Quality.high" },
    requiresReload: true
  });
  reg(SETTINGS.speed, { scope: "client", config: true, type: Number, default: 1, range: { min: 0.5, max: 2, step: 0.1 } });
  reg(SETTINGS.fadeDelay, { scope: "client", config: true, type: Number, default: 2, range: { min: 0, max: 10, step: 0.5 } });
  reg(SETTINGS.volume, { scope: "client", config: true, type: Number, default: 0.5, range: { min: 0, max: 1, step: 0.05 } });
  reg(SETTINGS.showOthers, { scope: "client", config: true, type: Boolean, default: true });
  reg(SETTINGS.holdChat, { scope: "world", config: true, type: Boolean, default: true });
  reg(SETTINGS.diceScale, { scope: "world", config: true, type: Number, default: 1, range: { min: 0.6, max: 1.6, step: 0.1 } });
  reg(SETTINGS.maxDice, { scope: "world", config: true, type: Number, default: 20, range: { min: 1, max: 50, step: 1 } });
  reg(SETTINGS.hiddenRolls, {
    scope: "world",
    config: true,
    type: String,
    default: "ghost",
    choices: { ghost: "SARGAS.HiddenRolls.ghost", none: "SARGAS.HiddenRolls.none" }
  });
}

/** The style a user has picked (stored as a user flag so every client sees it). */
export function userStyleId(user) {
  return user?.getFlag?.(MODULE_ID, "style") ?? null;
}

export function styleForUser(user) {
  return resolveStyle(userStyleId(user), getStyles(), get(SETTINGS.enabledStyles)).style;
}

let warned = false;
/** Tell the local player once if the GM turned off the style they picked. */
export function warnIfFallback() {
  const { style, fallback } = resolveStyle(userStyleId(game.user), getStyles(), get(SETTINGS.enabledStyles));
  if (fallback && style && !warned) {
    warned = true;
    ui.notifications?.info(game.i18n.format("SARGAS.Notify.Fallback", { style: game.i18n.localize(style.label) }));
  }
}
