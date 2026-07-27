let activeMode = initialMode;
let dadRadarState = dadRadarModes[activeMode];

function setDadRadarMode(modeName) {
  const nextState = dadRadarModes[modeName];

  if (!nextState) {
    console.warn(`Unknown Dad Radar mode: ${modeName}`);
    return dadRadarState;
  }

  activeMode = modeName;
  dadRadarState = nextState;

  window.dispatchEvent(
    new CustomEvent("dad-radar:state-change", {
      detail: {
        mode: activeMode,
        state: dadRadarState
      }
    })
  );

  return dadRadarState;
}