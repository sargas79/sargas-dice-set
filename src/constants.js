export const MODULE_ID = "sargas-dice-set";
export const SOCKET_NAME = `module.${MODULE_ID}`;

/** Die kinds the engine can render, keyed by number of faces. */
export const SUPPORTED_FACES = [4, 6, 8, 10, 12, 20, 100];

/** Fixed simulation tray (world units). A fixed size keeps the throw identical on every client. */
export const TRAY = { width: 22, depth: 12.4 };

export const PHYSICS_HZ = 60;
