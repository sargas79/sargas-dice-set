# Release test checklist (Foundry VTT v14)

Automated checks run with `npm test` in CI:

- Geometry: every die has the right faces, each value appears once, and opposite faces add up correctly.
- Symmetry remapping: every value can be put on top from every resting position, for every die kind.
- Physics: the same seed gives the same throw (sync and async); 1,000+ simulated dice show the rolled value; dice settle flat; a 30-dice roll stays inside the tray and settles.
- Roll parsing: d100 splits into tens and units, unsupported dice are skipped, the dice cap applies, hidden results are hidden, and inline roll data is decoded.
- Style flags: missing flags count as enabled, fallback to the first enabled style, and nothing is shown when every style is off.
- Foundry wiring (mocked): settings, menu, hooks, socket and API are registered; roll modes, show-others and sound replacement work.
- Translations: every language file has exactly the English keys, and the manifest lists every file.

Browser smoke test in CI (`npm run smoke`, headless Chrome with WebGL):

- Renders every style and every die kind (including dF, d3, coins and "?" faces) without page errors.
- Throws 15 dice of every kind through the real renderer and checks the value on top of every die matches the roll, with the tray fitted to the screen and with the fixed 16:9 tray.
- Drops the WebGL context on purpose and checks the next roll rebuilds the renderer and still shows the right values.
- With "reduce motion" emulated, no dice are drawn.
- Compares every Oracle d6 face texture with the design's SVG face, pixel by pixel (6 faces per finish; only resampling noise allowed), and checks the bundled Cormorant SC number font is loaded.
- Screenshots are uploaded as a CI artifact.

Manual checks before tagging a release, in a v14 world with the dnd5e system and one GM plus at least one player client:

- [ ] Core rolls animate and land on the result shown in chat: `/r 1d20`, `/r 4d6kh3`, `/r 1d100`, `/r 1d4+1d8+1d10+1d12`.
- [ ] Inline rolls in chat text (`Attack [[1d20+5]] for [[2d6]]`) animate, and don't when "Animate inline rolls" is off.
- [ ] `/gmr`: the player who rolled and the GM see dice; other players don't.
- [ ] `/br`: the GM sees the real result; the player sees dice without the real result (or nothing, with "Rolls you cannot see: Show nothing").
- [ ] `/sr`: only the player who rolled sees dice.
- [ ] Inline and sheet rolls in dnd5e animate: attack roll, damage roll, advantage (2d20kh), a critical.
- [ ] Two clients see the same throw, and each user's dice use that user's chosen style.
- [ ] Chat card is held until the dice stop, and shows immediately with "Hold chat" turned off.
- [ ] Style menu: thumbnails render grouped into Sargas and Classic, **Preview** throws dice, a player can only pick enabled styles.
- [ ] The dice button appears in the token controls and next to the chat controls, opens the style menu, and disappears when "Show dice style button" is off (after reload).
- [ ] Oracle finishes roll with their face artwork (brass frame, diamond linework, green bloom, steel panel, deco border, ward circle, Drowned Idol tentacles and eye pips) and glowing gem pips.
- [ ] Oracle d4–d100 show the design's numbers in Cormorant SC (not a fallback serif), metal bevel edges, and 6./9. dots on d10, d12 and d20.
- [ ] Classic sets roll as small rounded d6s; other dice kinds (d20 etc.) use the set's colour with white numbers.
- [ ] GM turns off a player's style → that player's next roll uses the first enabled style on every client, and the player gets a notification.
- [ ] GM turns off every style → no 3D dice, and chat cards are not held.
- [ ] 20 dice in one roll (`/r 20d6`) on the Low quality setting: no errors, smooth playback, and the page stays responsive while the throw is simulated.
- [ ] Switching to another browser tab during a roll doesn't leave the chat card hidden for more than a few seconds.
- [ ] Fate dice (`/r 4df`), `/r 1d3`, `/r 1d2` and coins (`/r 1dc`) animate and show the chat result.
- [ ] Unsupported dice (`/r 1d7`) roll in chat without errors and without 3D dice.
- [ ] Resize the window to portrait and to ultrawide: dice use the whole screen. With "Fit dice area to screen" off, they stay in a 16:9 area.
- [ ] With the OS "reduce motion" setting on, no dice are animated and chat cards appear at once.
- [ ] Switch the Foundry language to Deutsch, Français, Español, Italiano or Português (Brasil): settings and the style menu are translated.
- [ ] No console errors on world load, with the module enabled and disabled.
