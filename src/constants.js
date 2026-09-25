export const MODULE_ID = "sargas-dice-set";
export const SOCKET_NAME = `module.${MODULE_ID}`;

/** Fixed simulation tray (world units). A fixed size keeps the throw identical on every client. */
export const TRAY = { width: 22, depth: 12.4 };

/** Shorter side of the tray when it is fitted to the screen shape. */
export const TRAY_SHORT_SIDE = 12.4;

export const PHYSICS_HZ = 60;
