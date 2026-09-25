import { MODULE_ID } from "./constants.js";
import { registerBuiltinStyles, registerStyle, getStyles, getStyle } from "./styles/index.js";
import { registerSettings, warnIfFallback } from "./foundry/settings.js";
import { registerRollHooks, registerSocket, show, preview, getBox } from "./foundry/roll-hooks.js";
import { StyleConfig } from "./foundry/style-config.js";

Hooks.once("init", () => {
  registerBuiltinStyles();
  registerSettings();
  registerRollHooks();

  const api = {
    show,
    preview,
    registerStyle,
    getStyles,
    getStyle,
    openConfig: () => new StyleConfig().render({ force: true }),
    get box() {
      return getBox();
    }
  };
  game.modules.get(MODULE_ID).api = api;
  // Other modules can add styles here: Hooks.once("sargasDiceInit", api => api.registerStyle({...}))
  Hooks.callAll("sargasDiceInit", api);
});

Hooks.once("ready", () => {
  registerSocket();
  warnIfFallback();
  if (game.modules.get("dice-so-nice")?.active && game.user.isGM) {
    ui.notifications.warn("SARGAS.Notify.DiceSoNice", { localize: true });
  }
});
