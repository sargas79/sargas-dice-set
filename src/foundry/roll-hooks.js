import { MODULE_ID, SOCKET_NAME } from "../constants.js";
import { DiceBox } from "../engine/dice-box.js";
import { randomSeed } from "../engine/rng.js";
import { getStyle } from "../styles/registry.js";
import { expandDice, termsFromRolls, inlineRollData } from "./roll-parser.js";
import { SETTINGS, get, styleForUser } from "./settings.js";

/** Chat messages waiting for their dice to stop before being shown. */
const pending = new Set();
/** Safety net: never hide a chat card for longer than this. */
const MAX_HOLD_MS = 12000;

let box = null;
export function getBox() {
  box ??= new DiceBox({
    settings: () => ({
      quality: get(SETTINGS.quality),
      speed: get(SETTINGS.speed),
      fadeDelay: get(SETTINGS.fadeDelay),
      volume: get(SETTINGS.volume) * (game.settings.get("core", "globalInterfaceVolume") ?? 1),
      scale: get(SETTINGS.diceScale)
    })
  });
  return box;
}

/**
 * Throw the dice for some rolls on this client.
 * @param {Roll[]} rolls
 * @param {object} opts
 * @param {User} [opts.user]      Whose style to use.
 * @param {object} [opts.style]   Force a style.
 * @param {boolean} [opts.hidden] Show dice without their real results.
 * @param {number|string} [opts.seed]
 * @returns {Promise<boolean>} Resolves when the dice stop; false if nothing was thrown.
 */
export async function throwRolls(rolls, { user = game.user, style, hidden = false, seed = randomSeed() } = {}) {
  if (!get(SETTINGS.enabled)) return false;
  style ??= styleForUser(user);
  if (!style) return false;
  const dice = expandDice(termsFromRolls(rolls), { maxDice: get(SETTINGS.maxDice), hidden });
  if (!dice.length) return false;
  Hooks.callAll("sargasDiceRollStart", { rolls, user, style, dice });
  try {
    await getBox().roll({ dice: dice.map(d => ({ ...d, style })), seed }).settled;
  } catch (err) {
    console.error(`${MODULE_ID} | dice animation failed`, err);
  }
  Hooks.callAll("sargasDiceRollComplete", { rolls, user, style });
  return true;
}

function setHidden(messageId, hidden) {
  for (const el of document.querySelectorAll(`[data-message-id="${messageId}"]`)) el.classList.toggle("sargas-dice-hidden", hidden);
}

function reveal(messageId) {
  if (!pending.delete(messageId)) return;
  setHidden(messageId, false);
  try {
    ui.chat?.scrollBottom?.({ waitImages: true });
  } catch {
    /* scrolling is cosmetic */
  }
}

/** Rolls attached to a message, plus inline [[rolls]] from its text when enabled. */
export function messageRolls(message) {
  const rolls = [...(message?.rolls ?? [])];
  if (get(SETTINGS.inlineRolls)) {
    // Private inline rolls ([[/gmr 1d20]]) are only thrown for their author and the GM.
    const includePrivate = game.user.isGM || message?.author?.id === game.user.id;
    for (const data of inlineRollData(message?.content, { includePrivate })) {
      try {
        rolls.push(Roll.fromData(data));
      } catch (err) {
        console.warn(`${MODULE_ID} | could not read an inline roll`, err);
      }
    }
  }
  return rolls;
}

/** Should this client animate this chat message? */
export function shouldAnimate(message) {
  if (!get(SETTINGS.enabled)) return false;
  const rolls = messageRolls(message);
  if (!rolls.length) return false;
  if (message.getFlag?.(MODULE_ID, "skip")) return false;
  const author = message.author;
  if (author && author.id !== game.user.id && !get(SETTINGS.showOthers)) return false;
  if (!contentVisible(message) && get(SETTINGS.hiddenRolls) === "none") return false;
  return expandDice(termsFromRolls(rolls)).length > 0;
}

/** Whether the viewer may see this message's results (v14 visibility modes are covered by isContentVisible). */
function contentVisible(message) {
  return message.isContentVisible ?? message.visible ?? true;
}

async function onCreateChatMessage(message) {
  if (!shouldAnimate(message)) return;
  const author = message.author ?? game.user;
  if (!styleForUser(author)) return;
  const hold = get(SETTINGS.holdChat);
  if (hold) {
    pending.add(message.id);
    setHidden(message.id, true);
    setTimeout(() => reveal(message.id), MAX_HOLD_MS);
  }
  // The message id is the seed, so every client plays the same throw.
  await throwRolls(messageRolls(message), { user: author, hidden: !contentVisible(message), seed: message.id });
  if (hold) reveal(message.id);
}

function onRenderChatMessage(message, html) {
  if (pending.has(message.id)) (html instanceof HTMLElement ? html : html[0])?.classList.add("sargas-dice-hidden");
}

/** Our synthesised dice sounds replace Foundry's default roll sound. */
function onPreCreateChatMessage(message) {
  if (!message.rolls?.length || !get(SETTINGS.enabled) || get(SETTINGS.volume) <= 0) return;
  if (message.sound && expandDice(termsFromRolls(message.rolls)).length) message.updateSource({ sound: null });
}

function onSocket(payload) {
  if (payload?.action !== "show") return;
  const rolls = payload.rolls.map(r => Roll.fromData(r));
  const user = game.users.get(payload.userId);
  if (user && user.id !== game.user.id && !get(SETTINGS.showOthers)) return;
  throwRolls(rolls, { user, style: getStyle(payload.styleId) ?? undefined, seed: payload.seed });
}

export function registerRollHooks() {
  Hooks.on("preCreateChatMessage", onPreCreateChatMessage);
  Hooks.on("createChatMessage", onCreateChatMessage);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
}

export function registerSocket() {
  game.socket.on(SOCKET_NAME, onSocket);
}

/**
 * Public API: show dice for a roll that isn't posted to chat.
 * @param {Roll|Roll[]} roll
 * @param {{user?:User, style?:string, synchronize?:boolean}} [opts]  synchronize: also show on other clients.
 */
export async function show(roll, { user = game.user, style, synchronize = false } = {}) {
  const rolls = Array.isArray(roll) ? roll : [roll];
  for (const r of rolls) if (!r._evaluated) await r.evaluate();
  const seed = randomSeed();
  const styleObj = style ? getStyle(style) : undefined;
  if (synchronize) {
    game.socket.emit(SOCKET_NAME, { action: "show", rolls: rolls.map(r => r.toJSON()), userId: user.id, styleId: styleObj?.id, seed });
  }
  return throwRolls(rolls, { user, style: styleObj, seed });
}

/** Local-only preview of a style (used by the settings menu). */
export async function preview(style) {
  const roll = await new Roll("2d6 + 1d20").evaluate();
  const wasEnabled = get(SETTINGS.enabled);
  if (!wasEnabled) return getBox().roll({ dice: expandDice(roll.dice).map(d => ({ ...d, style })), seed: randomSeed() }).settled;
  return throwRolls([roll], { style });
}
