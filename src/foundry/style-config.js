import { MODULE_ID } from "../constants.js";
import { getStyles, getStyle } from "../styles/registry.js";
import { COLLECTIONS } from "../styles/index.js";
import { isStyleEnabled, resolveStyle } from "./style-selection.js";
import { styleThumbnail } from "../engine/thumbnail.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export function styleName(style) {
  return game.i18n.has(style.label) ? game.i18n.localize(style.label) : style.name;
}

/**
 * Dice style menu. GMs turn each style on or off for the world; every user
 * picks their own style from the enabled ones.
 */
export class StyleConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "sargas-dice-style-config",
    tag: "form",
    classes: ["sargas-dice-config"],
    window: { title: "SARGAS.Config.Title", icon: "fa-solid fa-dice", resizable: true },
    position: { width: 760, height: 640 },
    form: { handler: StyleConfig.#onSubmit, closeOnSubmit: true },
    actions: {
      enableAll: StyleConfig.#enableAll,
      disableAll: StyleConfig.#disableAll,
      preview: StyleConfig.#preview
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/style-config.hbs`, scrollable: [".sargas-style-scroll"] },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  /** Open the menu, or bring it to the front if it is already open. */
  static open() {
    const existing = [...openInstances()].find(app => app instanceof StyleConfig);
    if (existing) return existing.render({ force: true }).then(() => existing.bringToFront?.());
    return new StyleConfig().render({ force: true });
  }

  /** Re-render any open instance (e.g. after the GM changes the flags). */
  static refreshOpen() {
    for (const app of openInstances()) if (app instanceof StyleConfig && app.rendered) app.render();
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const enabledMap = game.settings.get(MODULE_ID, "enabledStyles");
    const isGM = game.user.isGM;
    const current = resolveStyle(game.user.getFlag(MODULE_ID, "style"), getStyles(), enabledMap).style?.id;
    const styles = getStyles()
      .map(s => ({
        id: s.id,
        name: styleName(s),
        thumbnail: safeThumbnail(s),
        enabled: isStyleEnabled(enabledMap, s.id),
        selected: s.id === current
      }))
      .filter(s => isGM || s.enabled);
    // Group by collection (Sargas, Classic, ...); styles from other modules go under "Other".
    const byId = new Map(getStyles().map(s => [s.id, s]));
    const known = COLLECTIONS.map(c => c.id);
    const collections = [...COLLECTIONS, { id: "other", label: "SARGAS.Collection.other" }]
      .map(c => ({
        label: c.label,
        styles: styles.filter(s => {
          const col = byId.get(s.id).collection;
          return c.id === "other" ? !known.includes(col) : col === c.id;
        })
      }))
      .filter(c => c.styles.length);
    return Object.assign(context, {
      isGM,
      styles,
      collections,
      noneEnabled: !styles.some(s => s.enabled),
      buttons: [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" }]
    });
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    if (game.user.isGM && data.enabled) {
      const map = {};
      for (const s of getStyles()) map[s.id] = !!data.enabled[s.id];
      await game.settings.set(MODULE_ID, "enabledStyles", map);
    }
    if (data.style && getStyle(data.style)) await game.user.setFlag(MODULE_ID, "style", data.style);
  }

  /** Action handlers run with `this` bound to the application instance. */
  static #enableAll() {
    this.element.querySelectorAll('input[name^="enabled."]').forEach(input => (input.checked = true));
  }

  static #disableAll() {
    this.element.querySelectorAll('input[name^="enabled."]').forEach(input => (input.checked = false));
  }

  static #preview(event, target) {
    const style = getStyle(target.dataset.styleId);
    if (style) game.modules.get(MODULE_ID).api.preview(style);
  }
}

/** v14 exposes ApplicationV2.instances(); v13 keeps a Map at foundry.applications.instances. */
function openInstances() {
  return typeof ApplicationV2.instances === "function" ? ApplicationV2.instances() : foundry.applications.instances?.values?.() ?? [];
}

function safeThumbnail(style) {
  try {
    return styleThumbnail(style, 128);
  } catch (err) {
    console.warn(`${MODULE_ID} | thumbnail failed for ${style.id}`, err);
    return "icons/svg/d6-grey.svg";
  }
}
