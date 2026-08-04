let activeMode = initialMode;
let dadRadarState = dadRadarModes[activeMode];

function broadcastDadRadarState() {
  window.dispatchEvent(
    new CustomEvent("dad-radar:state-change", {
      detail: {
        mode: activeMode,
        state: dadRadarState
      }
    })
  );
}

function setDadRadarState(
  nextState,
  modeName = "CUSTOM"
) {
  if (
    !nextState ||
    typeof nextState !== "object"
  ) {
    console.warn(
      "Dad Radar ignored an invalid state.",
      nextState
    );

    return dadRadarState;
  }

  activeMode = modeName;
  dadRadarState = nextState;

  broadcastDadRadarState();

  return dadRadarState;
}

function setDadRadarMode(modeName) {
  const nextState = dadRadarModes[modeName];

  if (!nextState) {
    console.warn(`Unknown Dad Radar mode: ${modeName}`);
    return dadRadarState;
  }

  return setDadRadarState(
    nextState,
    modeName
  );
}
