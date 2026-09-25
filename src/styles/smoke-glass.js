/** Image 1, top-right: smoky clear resin, white pips, a folded paper note sealed inside. */
export default {
  id: "smoke-glass",
  name: "Smoke Glass",
  label: "SARGAS.Style.SmokeGlass",
  body: {
    color: "#77726c",
    opacity: 0.36,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.4,
    ior: 1.5
  },
  pips: { kind: "paint", color: "#f6f6f3", roughness: 0.3, size: 0.17 },
  inclusion: "note",
  physics: { mass: 1.15, friction: 0.28, restitution: 0.4 },
  sound: "glass"
};
