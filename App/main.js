/* =========================================================
   DAD RADAR
   Main display controller
   ========================================================= */


/* ---------------------------------------------------------
   DOM references
   --------------------------------------------------------- */

const startupScreen =
  document.getElementById("startup-screen");

const dashboard =
  document.getElementById("dashboard");

const statusMessage =
  document.querySelector(".status-message");

const unitLabel =
  document.getElementById("unit-label");

const startupAppName =
  document.getElementById("startup-app-name");

const dashboardAppName =
  document.getElementById("dashboard-app-name");

const flightBoardFlight =
  document.getElementById("flight-board-flight");

const flightBoardText =
  document.getElementById("flight-board-text");

const flightStripModule =
  document.querySelector(
    ".flight-strip-module"
  );

const flightBoard =
  document.querySelector(
    ".flight-board"
  );

const flightNumber =
  document.getElementById("flight-number");

const flightOrigin =
  document.getElementById("flight-origin");

const flightDestination =
  document.getElementById("flight-destination");

const statusValue =
  document.getElementById("status-value");

const destinationCity =
  document.getElementById("destination-city");

const destinationAirport =
  document.getElementById("destination-airport");

const mapOrigin =
  document.getElementById("map-origin");

const mapDestination =
  document.getElementById("map-destination");

const aircraftMarker =
  document.querySelector(".aircraft-marker");

const etaValue =
  document.getElementById("eta-value");

const etaZone =
  document.getElementById("eta-zone");

const clockValue =
  document.getElementById("clock-value");

const airspeedValue =
  document.getElementById("airspeed-value");

const speedLabel =
  document.getElementById("speed-label");

const headingValue =
  document.getElementById("heading-value");

const altitudeValue =
  document.getElementById("altitude-value");

const airspeedNeedle =
  document.getElementById("airspeed-needle");

const headingCard =
  document.getElementById("heading-card");

const altitudeNeedle =
  document.getElementById("altitude-needle");

const altitudeTenThousandsNeedle =
  document.getElementById(
    "altitude-ten-thousands-needle"
  );

const altitudeThousandsNeedle =
  document.getElementById(
    "altitude-thousands-needle"
  );

const mapPanel =
  document.querySelector(".map-panel");

const destinationPanel =
  document.querySelector(".destination-panel");

const dailyScheduleDate =
  document.getElementById(
    "daily-schedule-date"
  );

const dailyScheduleContext =
  document.getElementById(
    "daily-schedule-context"
  );

const dailyScheduleList =
  document.getElementById(
    "daily-schedule-list"
  );

const instrumentPanel =
  document.querySelector(".instrument-panel");


/* ---------------------------------------------------------
   Split-flap settings
   --------------------------------------------------------- */

const FLAP_CHARACTER_SET =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./";

const FLAP_STAGGER_DELAY = 45;

const FLAP_INTERMEDIATE_CHARACTERS = 2;

const STATUS_FLAP_COUNT = 8;

const FLAP_ANIMATION_TIMEOUT = 500;

let flightBoardBalanceFrame = null;

const splitFlapAudioSettings =
  dadRadarSettings.audio
    ?.splitFlap ?? {};

const splitFlapAudioController =
  splitFlapAudioSettings.enabled !==
    false &&
  globalThis.dadRadarSplitFlapAudio
    ? globalThis
        .dadRadarSplitFlapAudio
        .createSplitFlapAudioController({
          source:
            splitFlapAudioSettings
              .source,
          cueSeconds:
            splitFlapAudioSettings
              .cueSeconds,
          fadeOutMs:
            splitFlapAudioSettings
              .fadeOutMs,
          volume:
            splitFlapAudioSettings
              .volume
        })
    : null;

const activeSplitFlapCells =
  new Set();


/* ---------------------------------------------------------
   Split-flap display helpers
   --------------------------------------------------------- */

function displayFlapCharacter(character) {
  return character === " "
    ? "\u00A0"
    : character;
}


function balanceFlightBoard() {
  flightBoardBalanceFrame = null;

  if (
    !flightStripModule ||
    !flightBoard ||
    !flightBoardFlight ||
    flightBoardFlight.hidden
  ) {
    return;
  }

  flightStripModule.style.setProperty(
    "--flap-balance-offset",
    "0px"
  );

  const flapCharacters =
    flightBoardFlight.querySelectorAll(
      ".flap-character"
    );

  if (!flapCharacters.length) {
    return;
  }

  const boardRectangle =
    flightBoard.getBoundingClientRect();

  const rowRectangle =
    flightBoardFlight
      .getBoundingClientRect();

  const firstRectangle =
    flapCharacters[0]
      .getBoundingClientRect();

  const lastRectangle =
    flapCharacters[
      flapCharacters.length - 1
    ].getBoundingClientRect();

  if (
    boardRectangle.width <= 0 ||
    rowRectangle.width <= 0 ||
    firstRectangle.width <= 0 ||
    lastRectangle.width <= 0
  ) {
    return;
  }

  const leftGap =
    firstRectangle.left -
    boardRectangle.left;

  const rightGap =
    boardRectangle.right -
    lastRectangle.right;

  const renderedScale =
    flightBoardFlight.offsetWidth > 0
      ? rowRectangle.width /
        flightBoardFlight.offsetWidth
      : 1;

  const balanceOffset =
    (rightGap - leftGap) /
    (2 * renderedScale);

  if (!Number.isFinite(balanceOffset)) {
    return;
  }

  flightStripModule.style.setProperty(
    "--flap-balance-offset",
    `${balanceOffset.toFixed(2)}px`
  );
}


function scheduleFlightBoardBalance() {
  if (flightBoardBalanceFrame !== null) {
    window.cancelAnimationFrame(
      flightBoardBalanceFrame
    );
  }

  flightBoardBalanceFrame =
    window.requestAnimationFrame(
      balanceFlightBoard
    );
}


function createFlapHalf(
  position,
  character,
  extraClasses = ""
) {
  const half =
    document.createElement("span");

  half.className = [
    "flap-half",
    `flap-${position}`,
    extraClasses
  ]
    .filter(Boolean)
    .join(" ");

  const glyph =
    document.createElement("span");

  glyph.className = "flap-glyph";

  glyph.textContent =
    displayFlapCharacter(character);

  half.appendChild(glyph);

  return half;
}


function setFlapHalfCharacter(
  half,
  character
) {
  if (!half) {
    return;
  }

  const glyph =
    half.querySelector(".flap-glyph");

  if (glyph) {
    glyph.textContent =
      displayFlapCharacter(character);
  }
}


function createFlapCharacter(
  character = " "
) {
  const cell =
    document.createElement("span");

  cell.className =
    "flap-character";

  cell.dataset.value =
    character;

  cell.setAttribute(
    "aria-hidden",
    "true"
  );

  const staticTop =
    createFlapHalf(
      "top",
      character,
      "flap-static-top"
    );

  const staticBottom =
    createFlapHalf(
      "bottom",
      character,
      "flap-static-bottom"
    );

  cell.append(
    staticTop,
    staticBottom
  );

  return cell;
}


function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(
      resolve,
      milliseconds
    );
  });
}


function beginSplitFlapAudio(cell) {
  const shouldStartAudio =
    activeSplitFlapCells.size === 0;

  activeSplitFlapCells.add(cell);

  if (shouldStartAudio) {
    splitFlapAudioController
      ?.start();
  }
}


function finishSplitFlapAudio(cell) {
  activeSplitFlapCells.delete(cell);

  if (
    activeSplitFlapCells.size === 0
  ) {
    splitFlapAudioController
      ?.stop();
  }
}


function buildFlapSequence(
  currentCharacter,
  nextCharacter
) {
  if (
    currentCharacter === nextCharacter
  ) {
    return [];
  }

  const currentIndex =
    FLAP_CHARACTER_SET.indexOf(
      currentCharacter
    );

  const nextIndex =
    FLAP_CHARACTER_SET.indexOf(
      nextCharacter
    );

  if (
    currentIndex === -1 ||
    nextIndex === -1
  ) {
    return [nextCharacter];
  }

  const characterCount =
    FLAP_CHARACTER_SET.length;

  const forwardDistance =
    (
      nextIndex -
      currentIndex +
      characterCount
    ) % characterCount;

  if (forwardDistance <= 1) {
    return [nextCharacter];
  }

  const sequence = [];

  const intermediateCount =
    Math.min(
      FLAP_INTERMEDIATE_CHARACTERS,
      forwardDistance - 1
    );

  for (
    let step = 1;
    step <= intermediateCount;
    step += 1
  ) {
    const intermediateIndex =
      (
        currentIndex + step
      ) % characterCount;

    sequence.push(
      FLAP_CHARACTER_SET[
        intermediateIndex
      ]
    );
  }

  sequence.push(nextCharacter);

  return sequence;
}


function flipFlapOnce(
  cell,
  nextCharacter
) {
  return new Promise((resolve) => {
    const currentCharacter =
      cell.dataset.value ?? " ";

    if (
      currentCharacter ===
      nextCharacter
    ) {
      resolve();
      return;
    }

    cell.classList.remove(
      "is-flipping"
    );

    cell
      .querySelectorAll(
        ".flap-moving"
      )
      .forEach((layer) => {
        layer.remove();
      });

    const staticTop =
      cell.querySelector(
        ".flap-static-top"
      );

    const staticBottom =
      cell.querySelector(
        ".flap-static-bottom"
      );

    setFlapHalfCharacter(
      staticTop,
      currentCharacter
    );

    setFlapHalfCharacter(
      staticBottom,
      nextCharacter
    );

    const movingTop =
      createFlapHalf(
        "top",
        currentCharacter,
        "flap-moving flap-flip-top"
      );

    const movingBottom =
      createFlapHalf(
        "bottom",
        nextCharacter,
        "flap-moving flap-flip-bottom"
      );

    cell.append(
      movingTop,
      movingBottom
    );

    void cell.offsetWidth;

    cell.classList.add(
      "is-flipping"
    );

    let animationFinished = false;

    function finishAnimation() {
      if (animationFinished) {
        return;
      }

      animationFinished = true;

      setFlapHalfCharacter(
        staticTop,
        nextCharacter
      );

      setFlapHalfCharacter(
        staticBottom,
        nextCharacter
      );

      cell.dataset.value =
        nextCharacter;

      cell.classList.remove(
        "is-flipping"
      );

      movingTop.remove();
      movingBottom.remove();

      resolve();
    }

    movingBottom.addEventListener(
      "animationend",
      finishAnimation,
      { once: true }
    );

    window.setTimeout(
      finishAnimation,
      FLAP_ANIMATION_TIMEOUT
    );
  });
}


function queueFlapAnimation(
  cell,
  nextCharacter,
  delay = 0
) {
  cell._targetValue =
    nextCharacter;

  if (
    !cell._animationRunning &&
    (cell.dataset.value ?? " ") ===
      nextCharacter
  ) {
    return;
  }

  if (cell._animationRunning) {
    return;
  }

  cell._animationRunning = true;
  beginSplitFlapAudio(cell);

  async function runAnimationQueue() {
    if (delay > 0) {
      await wait(delay);
    }

    while (
      (cell.dataset.value ?? " ") !==
      cell._targetValue
    ) {
      const currentCharacter =
        cell.dataset.value ?? " ";

      const targetCharacter =
        cell._targetValue ?? " ";

      const sequence =
        buildFlapSequence(
          currentCharacter,
          targetCharacter
        );

      for (
        const character of sequence
      ) {
        if (
          targetCharacter !==
          cell._targetValue
        ) {
          break;
        }

        await flipFlapOnce(
          cell,
          character
        );
      }
    }

    cell._animationRunning = false;

    if (
      (cell.dataset.value ?? " ") !==
      cell._targetValue
    ) {
      queueFlapAnimation(
        cell,
        cell._targetValue,
        0
      );
    } else {
      finishSplitFlapAudio(cell);
    }
  }

  runAnimationQueue();
}


function prepareFlapContainer(
  container,
  cellCount
) {
  if (!container) {
    return;
  }

  if (
    container.dataset
      .animatedFlaps !== "true"
  ) {
    container.replaceChildren();

    container.dataset
      .animatedFlaps = "true";
  }

  while (
    container.children.length <
    cellCount
  ) {
    container.appendChild(
      createFlapCharacter(" ")
    );
  }

  while (
    container.children.length >
    cellCount
  ) {
    container.lastElementChild.remove();
  }
}


function renderFlapText(
  container,
  text,
  cellCount
) {
  if (!container) {
    return;
  }

  const normalizedText =
    String(text ?? "")
      .toUpperCase()
      .slice(0, cellCount)
      .padEnd(cellCount, " ");

  prepareFlapContainer(
    container,
    cellCount
  );

  container.setAttribute(
    "aria-label",
    normalizedText.trim() ||
      "Blank"
  );

  Array
    .from(container.children)
    .forEach((cell, index) => {
      queueFlapAnimation(
        cell,
        normalizedText[index],
        index *
          FLAP_STAGGER_DELAY
      );
    });

  scheduleFlightBoardBalance();
}


/* ---------------------------------------------------------
   Flight-board formatting
   --------------------------------------------------------- */

function formatFlightNumber(
  rawFlightNumber
) {
  const flightText =
    String(rawFlightNumber ?? "")
      .toUpperCase()
      .trim();

  const numberMatch =
    flightText.match(/(\d{1,4})$/);

  if (numberMatch) {
    return numberMatch[1]
      .padStart(4, "0");
  }

  return flightText
    .replace(/\s+/g, "")
    .slice(-4)
    .padStart(4, " ");
}


function formatBoardStatus(status) {
  const statusLabels = {
    HOME: "HOME",
    "LOCATION UNKNOWN": "LOC UNKN",
    "COMMUTING TO BASE": "TO BASE",
    "PRE-FLIGHT": "PRE FLT",
    "PRE FLIGHT": "PRE FLT",
    BOARDING: "BOARDING",
    "TAXI OUT": "TAXI OUT",
    "EN ROUTE": "EN ROUTE",
    APPROACH: "APPROACH",
    DIVERTED: "DIVERTED",
    LANDED: "LANDED",
    CANCELLED: "CANCELED",
    ARRIVED: "ARRIVED",
    LAYOVER: "LAYOVER",
    "COMMUTING HOME": "TO HOME",
    OFFLINE: "OFFLINE"
  };

  const normalizedStatus =
    String(status ?? "OFFLINE")
      .toUpperCase()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const boardLabel =
    statusLabels[normalizedStatus] ??
    normalizedStatus;

  return boardLabel
    .slice(0, STATUS_FLAP_COUNT)
    .padEnd(STATUS_FLAP_COUNT, " ");
}


/* ---------------------------------------------------------
   Gauge helpers
   --------------------------------------------------------- */

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(value, minimum),
    maximum
  );
}


function mapRange(
  value,
  inputMinimum,
  inputMaximum,
  outputMinimum,
  outputMaximum
) {
  const normalizedValue =
    (
      value - inputMinimum
    ) /
    (
      inputMaximum -
      inputMinimum
    );

  return (
    outputMinimum +
    normalizedValue *
      (
        outputMaximum -
        outputMinimum
      )
  );
}


/* ---------------------------------------------------------
   Mechanical heading indicator
   --------------------------------------------------------- */

let previousHeading = null;
let accumulatedHeading = 0;


function normalizeHeading(rawHeading) {
  return (
    (
      Number(rawHeading) || 0
    ) % 360 + 360
  ) % 360;
}


function updateHeadingIndicator(
  rawHeading
) {
  const heading =
    normalizeHeading(rawHeading);

  if (previousHeading === null) {
    accumulatedHeading =
      heading;
  } else {
    const headingChange =
      (
        heading -
        previousHeading +
        540
      ) % 360 - 180;

    accumulatedHeading +=
      headingChange;
  }

  if (headingCard) {
    headingCard.style.transform =
      `rotate(${-accumulatedHeading}deg)`;
  }

  if (headingValue) {
    headingValue.textContent =
      String(
        Math.round(heading) % 360
      ).padStart(3, "0");
  }

  previousHeading =
    heading;
}


function resetHeadingIndicator() {
  previousHeading = null;
  accumulatedHeading = 0;

  if (headingCard) {
    headingCard.style.transform =
      "rotate(0deg)";
  }

  if (headingValue) {
    headingValue.textContent =
      "---";
  }
}


/* ---------------------------------------------------------
   Instrument needles
   --------------------------------------------------------- */

function updateInstrumentNeedles(
  flight,
  displayedSpeed = null
) {
  if (!flight) {
    if (airspeedNeedle) {
      airspeedNeedle.style.transform =
        "rotate(0deg)";
    }

    if (altitudeNeedle) {
      altitudeNeedle.style.transform =
        "rotate(0deg)";
    }

    if (altitudeTenThousandsNeedle) {
      altitudeTenThousandsNeedle
        .style
        .transform =
        "rotate(0deg)";
    }

    if (altitudeThousandsNeedle) {
      altitudeThousandsNeedle
        .style
        .transform =
        "rotate(0deg)";
    }

    resetHeadingIndicator();

    return;
  }

  const speed =
    clamp(
      Number(displayedSpeed) || 0,
      0,
      700
    );

  const altitude =
    Math.max(
      Number(flight.altitude) || 0,
      0
    );

  const speedAngle =
    mapRange(
      speed,
      0,
      700,
      0,
      315
    );

  /*
    Long hand:
    one revolution every 1,000 feet.
  */
  const {
    hundredsAngle:
      altitudeHundredsAngle,
    thousandsAngle:
      altitudeThousandsAngle,
    tenThousandsAngle:
      altitudeTenThousandsAngle
  } = globalThis
    .dadRadarInstrumentMath
    .altimeterNeedleAngles(
      altitude
    );

  if (airspeedNeedle) {
    airspeedNeedle.style.transform =
      `rotate(${speedAngle}deg)`;
  }

  if (altitudeNeedle) {
    altitudeNeedle.style.transform =
      `rotate(${altitudeHundredsAngle}deg)`;
  }

  if (altitudeTenThousandsNeedle) {
    altitudeTenThousandsNeedle
      .style
      .transform =
      `rotate(${altitudeTenThousandsAngle}deg)`;
  }

  if (altitudeThousandsNeedle) {
    altitudeThousandsNeedle
      .style
      .transform =
      `rotate(${altitudeThousandsAngle}deg)`;
  }

  updateHeadingIndicator(
    flight.heading
  );
}


/* ---------------------------------------------------------
   Main dashboard rendering
   --------------------------------------------------------- */

function updateDashboardTelemetry(state) {
  const flight =
    state?.flight ?? null;

  const hasAirspeed =
    flight?.airspeed !== null &&
    flight?.airspeed !== undefined &&
    Number.isFinite(
      Number(flight.airspeed)
    );

  const hasGroundSpeed =
    flight?.groundSpeed !== null &&
    flight?.groundSpeed !== undefined &&
    Number.isFinite(
      Number(flight.groundSpeed)
    );

  const displayedSpeed =
    hasAirspeed
      ? Number(flight.airspeed)
      : hasGroundSpeed
        ? Number(flight.groundSpeed)
        : null;

  const hasHeading =
    flight?.heading !== null &&
    flight?.heading !== undefined &&
    Number.isFinite(
      Number(flight.heading)
    );

  const hasAltitude =
    flight?.altitude !== null &&
    flight?.altitude !== undefined &&
    Number.isFinite(
      Number(flight.altitude)
    );

  if (airspeedValue) {
    airspeedValue.textContent =
      displayedSpeed !== null
        ? String(
            Math.round(displayedSpeed)
          )
        : "---";
  }

  if (speedLabel) {
    speedLabel.textContent =
      hasAirspeed
        ? "AIRSPEED"
        : "GROUND SPEED";
  }

  if (headingValue) {
    headingValue.textContent =
      hasHeading
        ? String(
            Math.round(
              Number(flight.heading)
            ) % 360
          ).padStart(3, "0")
        : "---";
  }

  if (altitudeValue) {
    altitudeValue.textContent =
      hasAltitude
        ? Math.round(
            Number(flight.altitude)
          ).toLocaleString("en-US")
        : "-----";
  }

  updateInstrumentNeedles(
    flight &&
    (
      displayedSpeed !== null ||
      hasHeading ||
      hasAltitude
    )
      ? flight
      : null,
    displayedSpeed
  );
}

function renderDailySchedule(
  dailySchedule
) {
  if (
    !dailyScheduleDate ||
    !dailyScheduleContext ||
    !dailyScheduleList
  ) {
    return;
  }

  dailyScheduleDate.textContent =
    dailySchedule?.dateLabel ??
    "TODAY";

  dailyScheduleDate.title =
    dailySchedule?.timeZoneLabel ??
    dadRadarSettings
      .displayTimeZoneLabel;

  dailyScheduleContext.textContent =
    dailySchedule?.context ??
    "UPDATING TODAY'S SCHEDULE";

  dailyScheduleList.replaceChildren();

  const entries =
    Array.isArray(
      dailySchedule?.entries
    )
      ? dailySchedule.entries
      : [];

  if (entries.length === 0) {
    const emptyEntry =
      document.createElement("li");

    emptyEntry.className =
      "daily-schedule-empty";

    emptyEntry.textContent =
      dailySchedule
        ? "NO DUTY ITEMS TODAY"
        : "AWAITING CALENDAR";

    dailyScheduleList.appendChild(
      emptyEntry
    );

    return;
  }

  entries.forEach((entry) => {
    const listItem =
      document.createElement("li");

    const status =
      [
        "completed",
        "current",
        "upcoming"
      ].includes(entry.status)
        ? entry.status
        : "upcoming";

    listItem.className =
      `daily-schedule-entry is-${status}`;

    if (status === "current") {
      listItem.setAttribute(
        "aria-current",
        "true"
      );
    }

    const time =
      document.createElement("time");

    time.className =
      "daily-schedule-time";

    time.textContent =
      entry.time ?? "--:--";

    const label =
      document.createElement("span");

    label.className =
      "daily-schedule-label";

    label.textContent =
      entry.label ??
      "SCHEDULED ACTIVITY";

    const tag =
      document.createElement("span");

    tag.className =
      "daily-schedule-tag";

    tag.textContent =
      entry.tag ?? "";

    listItem.append(
      time,
      label,
      tag
    );

    dailyScheduleList.appendChild(
      listItem
    );
  });
}

function updateDashboard(state) {
  if (!state) {
    return;
  }

  renderDailySchedule(
    state.dailySchedule
  );

  const flight =
    state.flight ?? null;

  const hasAirspeed =
    flight?.airspeed !== null &&
    flight?.airspeed !== undefined &&
    Number.isFinite(
      Number(flight.airspeed)
    );

  const hasGroundSpeed =
    flight?.groundSpeed !== null &&
    flight?.groundSpeed !== undefined &&
    Number.isFinite(
      Number(flight.groundSpeed)
    );

  const displayedSpeed =
    hasAirspeed
      ? Number(flight.airspeed)
      : hasGroundSpeed
        ? Number(flight.groundSpeed)
        : null;

  const hasDisplayedSpeed =
    displayedSpeed !== null;

  const hasHeading =
    flight?.heading !== null &&
    flight?.heading !== undefined &&
    Number.isFinite(
      Number(flight.heading)
    );

  const hasAltitude =
    flight?.altitude !== null &&
    flight?.altitude !== undefined &&
    Number.isFinite(
      Number(flight.altitude)
    );

  if (flight) {
    if (flightBoardFlight) {
      flightBoardFlight.hidden =
        false;
    }

    if (flightBoardText) {
      flightBoardText.hidden =
        true;
    }

    renderFlapText(
      flightNumber,
      formatFlightNumber(
        flight.number
      ),
      4
    );

    renderFlapText(
      flightOrigin,
      flight.origin,
      3
    );

    renderFlapText(
      flightDestination,
      flight.destination,
      3
    );

    renderFlapText(
      statusValue,
      formatBoardStatus(
        state.status
      ),
      STATUS_FLAP_COUNT
    );

    if (destinationCity) {
      destinationCity.textContent =
        flight.destinationCity ??
        flight.destination ??
        "---";
    }

    if (destinationAirport) {
      destinationAirport.textContent =
        flight.destination ?? "---";
    }

    if (mapOrigin) {
      mapOrigin.textContent =
        flight.origin ?? "---";
    }

    if (mapDestination) {
      mapDestination.textContent =
        flight.destination ?? "---";
    }

    if (etaValue) {
      etaValue.textContent =
        flight.eta ?? "--:--";
    }

    if (airspeedValue) {
      airspeedValue.textContent =
        hasDisplayedSpeed
          ? String(
              Math.round(
                displayedSpeed
              )
            )
          : "---";
    }

    if (speedLabel) {
      speedLabel.textContent =
        hasAirspeed
          ? "AIRSPEED"
          : "GROUND SPEED";
    }

    if (headingValue) {
      headingValue.textContent =
        hasHeading
          ? String(
              Math.round(
                Number(
                  flight.heading
                )
              )
            ).padStart(3, "0")
          : "---";
    }

    if (altitudeValue) {
      altitudeValue.textContent =
        hasAltitude
          ? Math.round(
              Number(
                flight.altitude
              )
            ).toLocaleString(
              "en-US"
            )
          : "-----";
    }

    const progress =
      clamp(
        Number(flight.progress) || 0,
        0,
        100
      );

    if (aircraftMarker) {
      const markerPosition =
        mapRange(
          progress,
          0,
          100,
          5,
          95
        );

      aircraftMarker.style.left =
        `${markerPosition}%`;
    }

    if (mapPanel) {
      mapPanel.hidden =
        false;
    }

    if (destinationPanel) {
      destinationPanel.hidden =
        false;
    }

    if (instrumentPanel) {
      instrumentPanel.hidden =
        false;
    }

    updateInstrumentNeedles(
      hasDisplayedSpeed ||
      hasHeading ||
      hasAltitude
        ? flight
        : null,
      displayedSpeed
    );
  } else {
    if (flightBoardFlight) {
      flightBoardFlight.hidden =
        true;
    }

    if (flightBoardText) {
      flightBoardText.hidden =
        false;

      flightBoardText.textContent =
        state.message ??
        "NO ACTIVE FLIGHT";
    }

    if (mapPanel) {
      mapPanel.hidden =
        true;
    }

    if (destinationPanel) {
      destinationPanel.hidden =
        true;
    }

    if (instrumentPanel) {
      instrumentPanel.hidden =
        true;
    }

    if (airspeedValue) {
      airspeedValue.textContent =
        "---";
    }

    if (speedLabel) {
      speedLabel.textContent =
        "GROUND SPEED";
    }

    if (headingValue) {
      headingValue.textContent =
        "---";
    }

    if (altitudeValue) {
      altitudeValue.textContent =
        "-----";
    }

    if (etaValue) {
      etaValue.textContent =
        "--:--";
    }

    updateInstrumentNeedles(null);
  }
}


/* ---------------------------------------------------------
   Eastern Time clock
   --------------------------------------------------------- */

const easternTimeFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        dadRadarSettings
          .displayTimeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }
  );


function updateClock() {
  if (!clockValue) {
    return;
  }

  clockValue.textContent =
    easternTimeFormatter.format(
      new Date()
    );
}


/* ---------------------------------------------------------
   Keyboard development controls
   --------------------------------------------------------- */

const modeShortcuts = {
  "1": "HOME",
  "2": "COMMUTING_TO_BASE",
  "3": "PRE_FLIGHT",
  "4": "BOARDING",
  "5": "TAXI_OUT",
  "6": "EN_ROUTE",
  "7": "APPROACH",
  "8": "DIVERTED",
  "9": "ARRIVED",
  "0": "LAYOVER",
  "-": "COMMUTING_HOME",
  "=": "OFFLINE"
};


function handleKeyboardShortcut(event) {
  const modeName =
    modeShortcuts[event.key];

  if (!modeName) {
    return;
  }

  if (
    typeof stopMockFlightService ===
    "function"
  ) {
    stopMockFlightService();
  }

  if (
    typeof stopCalendarStateController ===
    "function"
  ) {
    stopCalendarStateController();
  }

  setDadRadarMode(modeName);
}


/* ---------------------------------------------------------
   Startup sequence
   --------------------------------------------------------- */

function startDashboardSequence() {
  if (unitLabel) {
    unitLabel.textContent =
      dadRadarSettings.unitLabel;
  }

  if (startupAppName) {
    startupAppName.textContent =
      dadRadarSettings.appName;
  }

  if (dashboardAppName) {
    dashboardAppName.textContent =
      dadRadarSettings.appName;
  }

  if (etaZone) {
    etaZone.textContent =
      dadRadarSettings
        .displayTimeZoneLabel;
  }

  updateDashboard(
    typeof dadRadarVisualState !==
      "undefined"
      ? dadRadarVisualState
      : dadRadarState
  );

  updateClock();

  window.setInterval(
    updateClock,
    1000
  );

  window.setTimeout(() => {
    if (statusMessage) {
      statusMessage.textContent =
        "SYSTEMS ONLINE";
    }
  }, dadRadarSettings
    .startup
    .systemsOnlineDelayMs);

  window.setTimeout(() => {
    if (startupScreen) {
      startupScreen.hidden =
        true;
    }

    if (dashboard) {
      dashboard.hidden =
        false;
    }

    scheduleFlightBoardBalance();
  }, dadRadarSettings
    .startup
    .dashboardDelayMs);

  if (
    dadRadarSettings.schedule
      .dataSource === "calendar" &&
    typeof startCalendarStateController ===
      "function"
  ) {
    startCalendarStateController();
  } else if (
    dadRadarSettings.schedule
      .dataSource === "mock" &&
    dadRadarSettings.developerMode &&
    typeof startMockFlightService ===
      "function"
  ) {
    startMockFlightService();
  } else {
    setDadRadarMode("OFFLINE");
  }
}


/* ---------------------------------------------------------
   Event listeners
   --------------------------------------------------------- */

window.addEventListener(
  "dad-radar:visual-state-change",
  (event) => {
    if (event.detail.telemetryOnly) {
      updateDashboardTelemetry(
        event.detail.state
      );
    } else {
      updateDashboard(
        event.detail.state
      );
    }
  }
);

window.addEventListener(
  "keydown",
  handleKeyboardShortcut
);

window.addEventListener(
  "pointerdown",
  () => {
    splitFlapAudioController
      ?.unlock();
  },
  { once: true }
);

window.addEventListener(
  "resize",
  scheduleFlightBoardBalance
);


/* ---------------------------------------------------------
   Launch Dad Radar
   --------------------------------------------------------- */

startDashboardSequence();
