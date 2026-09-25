/**
 * Smoke test of the Foundry wiring against a minimal mock of the Foundry API.
 * The WebGL renderer and thumbnails are mocked out.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const rolls = [];
vi.mock("../src/engine/dice-box.js", () => ({
  DiceBox: class {
    roll(spec) {
      rolls.push(spec);
      return { settled: Promise.resolve(), done: Promise.resolve() };
    }
  }
}));
vi.mock("../src/engine/thumbnail.js", () => ({ styleThumbnail: () => "thumb.png" }));

const MODULE = "sargas-dice-set";
const hooks = new Map();
const settings = new Map();
const registered = new Map();
const flags = new Map();
const makeUser = (id, isGM = false) => ({
  id,
  isGM,
  getFlag: (scope, key) => flags.get(`${id}.${scope}.${key}`),
  setFlag: async (scope, key, value) => flags.set(`${id}.${scope}.${key}`, value)
});
const me = makeUser("me", true);
const other = makeUser("other");
const moduleEntry = { active: true };

globalThis.Hooks = {
  on: (name, fn) => hooks.set(name, [...(hooks.get(name) ?? []), fn]),
  once: (name, fn) => hooks.set(name, [...(hooks.get(name) ?? []), fn]),
  callAll: (name, ...args) => (hooks.get(name) ?? []).forEach(fn => fn(...args))
};
globalThis.game = {
  user: me,
  users: new Map([["me", me], ["other", other]]),
  modules: new Map([[MODULE, moduleEntry]]),
  socket: { on: vi.fn(), emit: vi.fn() },
  i18n: { has: () => false, localize: k => k, format: k => k },
  settings: {
    register: (scope, key, data) => {
      registered.set(key, data);
      settings.set(key, data.default);
    },
    registerMenu: vi.fn(),
    get: (scope, key) => (scope === "core" ? 1 : settings.get(key)),
    set: async (scope, key, value) => {
      settings.set(key, value);
      registered.get(key)?.onChange?.(value);
    }
  }
};
class ApplicationV2 {}
globalThis.foundry = {
  applications: { api: { ApplicationV2, HandlebarsApplicationMixin: Base => class extends Base {} }, instances: new Map() },
  utils: { expandObject: o => o }
};
globalThis.ui = { notifications: { info: vi.fn(), warn: vi.fn() }, chat: {} };
globalThis.document = { querySelectorAll: () => [] };

const term = (faces, ...results) => ({ faces, results: results.map(result => ({ result })) });
function message({ id = "msg1", author = me, visible = true, dice = [term(20, 17)], sound = "sounds/dice.wav" } = {}) {
  return {
    id,
    author,
    isContentVisible: visible,
    rolls: [{ dice }],
    sound,
    getFlag: () => undefined,
    updateSource(data) {
      Object.assign(this, data);
    }
  };
}
const fire = async (name, ...args) => {
  for (const fn of hooks.get(name) ?? []) await fn(...args);
};

beforeAll(async () => {
  await import("../src/main.js");
  await fire("init");
  await fire("ready");
});

beforeEach(() => {
  rolls.length = 0;
  flags.clear();
  settings.set("enabledStyles", {});
  settings.set("showOthers", true);
  settings.set("hiddenRolls", "ghost");
  settings.set("enabled", true);
});

describe("Foundry integration", () => {
  it("registers settings, the menu, hooks and the API", () => {
    for (const key of ["enabledStyles", "enabled", "quality", "speed", "fadeDelay", "volume", "showOthers", "holdChat", "diceScale", "maxDice", "hiddenRolls"]) {
      expect(registered.has(key)).toBe(true);
    }
    expect(registered.get("enabledStyles").scope).toBe("world");
    expect(game.settings.registerMenu).toHaveBeenCalled();
    expect(hooks.has("createChatMessage")).toBe(true);
    expect(moduleEntry.api.getStyles()).toHaveLength(14);
    expect(game.socket.on).toHaveBeenCalledWith(`module.${MODULE}`, expect.any(Function));
  });

  it("throws the rolled dice in the author's style, seeded by the message id", async () => {
    await other.setFlag(MODULE, "style", "walnut");
    await fire("createChatMessage", message({ author: other, dice: [term(20, 17), term(100, 42)] }));
    expect(rolls).toHaveLength(1);
    expect(rolls[0].seed).toBe("msg1");
    expect(rolls[0].dice.map(d => [d.kind, d.value, d.style.id])).toEqual([
      [20, 17, "walnut"],
      [10, 4, "walnut"],
      [10, 2, "walnut"]
    ]);
  });

  it("falls back when the chosen style is turned off", async () => {
    await me.setFlag(MODULE, "style", "walnut");
    await game.settings.set(MODULE, "enabledStyles", { walnut: false, "vintage-bone": false });
    await fire("createChatMessage", message());
    expect(rolls[0].dice[0].style.id).toBe("obsidian-gold");
    expect(ui.notifications.info).toHaveBeenCalled();
  });

  it("shows nothing when every style is off", async () => {
    const all = Object.fromEntries(moduleEntry.api.getStyles().map(s => [s.id, false]));
    await game.settings.set(MODULE, "enabledStyles", all);
    await fire("createChatMessage", message());
    expect(rolls).toHaveLength(0);
  });

  it("hides results of rolls the viewer cannot see", async () => {
    await fire("createChatMessage", message({ visible: false }));
    expect(rolls[0].dice[0].value).toBeNull();
    settings.set("hiddenRolls", "none");
    await fire("createChatMessage", message({ id: "msg2", visible: false }));
    expect(rolls).toHaveLength(1);
  });

  it("respects the show-other-players setting", async () => {
    settings.set("showOthers", false);
    await fire("createChatMessage", message({ author: other }));
    expect(rolls).toHaveLength(0);
    await fire("createChatMessage", message({ author: me }));
    expect(rolls).toHaveLength(1);
  });

  it("ignores messages without supported dice and when disabled", async () => {
    await fire("createChatMessage", message({ dice: [term(3, 2)] }));
    settings.set("enabled", false);
    await fire("createChatMessage", message());
    expect(rolls).toHaveLength(0);
  });

  it("replaces Foundry's roll sound with ours", async () => {
    const m = message();
    await fire("preCreateChatMessage", m);
    expect(m.sound).toBeNull();
    settings.set("volume", 0);
    const quiet = message();
    await fire("preCreateChatMessage", quiet);
    expect(quiet.sound).toBe("sounds/dice.wav");
    settings.set("volume", 0.5);
  });
});
