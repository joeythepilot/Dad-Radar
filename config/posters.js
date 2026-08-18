(function initializeDadRadarPosters(root) {
  "use strict";

  const posterByAirport = Object.freeze({
    AVL: Object.freeze({
      source:
        "./assets/destinations/asheville-poster-7x8-baseline.png",
      title: "ASHEVILLE",
      location:
        "Asheville, North Carolina"
    }),
    CLT: Object.freeze({
      source:
        "./assets/destinations/clt-poster-7x8-candidate-v1.png",
      title: "CHARLOTTE",
      location:
        "Charlotte, North Carolina"
    }),
    CMH: Object.freeze({
      source:
        "./assets/destinations/cmh-poster-7x8-candidate-v1.png",
      title: "COLUMBUS",
      location: "Columbus, Ohio"
    }),
    DCA: Object.freeze({
      source:
        "./assets/destinations/dca-poster-7x8-candidate-v2.png",
      title: "WASHINGTON",
      location:
        "Washington, District of Columbia"
    }),
    DFW: Object.freeze({
      source:
        "./assets/destinations/dfw-poster-7x8-candidate-v2.png",
      title: "DALLAS–FORT WORTH",
      location:
        "Dallas–Fort Worth, Texas"
    }),
    HSV: Object.freeze({
      source:
        "./assets/destinations/hsv-poster-7x8-candidate-v1.png",
      title: "HUNTSVILLE",
      location: "Huntsville, Alabama"
    }),
    LSE: Object.freeze({
      source:
        "./assets/destinations/lse-poster-7x8-candidate-v1.png",
      title: "LA CROSSE",
      location:
        "La Crosse, Wisconsin"
    }),
    MIA: Object.freeze({
      source:
        "./assets/destinations/mia-poster-7x8-candidate-v1.png",
      title: "MIAMI",
      location: "Miami, Florida"
    }),
    ORD: Object.freeze({
      source:
        "./assets/destinations/ord-poster-7x8-candidate-v2.png",
      title: "CHICAGO",
      location: "Chicago, Illinois"
    }),
    PHX: Object.freeze({
      source:
        "./assets/destinations/phx-poster-7x8-candidate-v1.png",
      title: "PHOENIX",
      location: "Phoenix, Arizona"
    }),
    PIA: Object.freeze({
      source:
        "./assets/destinations/pia-poster-7x8-candidate-v1.png",
      title: "PEORIA",
      location: "Peoria, Illinois"
    }),
    ROC: Object.freeze({
      source:
        "./assets/destinations/roc-poster-7x8-candidate-v1.png",
      title: "ROCHESTER",
      location: "Rochester, New York"
    }),
    SYR: Object.freeze({
      source:
        "./assets/destinations/syr-poster-7x8-candidate-v1.png",
      title: "SYRACUSE",
      location: "Syracuse, New York"
    }),
    TVC: Object.freeze({
      source:
        "./assets/destinations/tvc-poster-7x8-candidate-v1.png",
      title: "TRAVERSE CITY",
      location: "Traverse City, Michigan"
    }),
    XNA: Object.freeze({
      source:
        "./assets/destinations/xna-poster-7x8-candidate-v1.png",
      title: "NORTHWEST ARKANSAS",
      location:
        "Northwest Arkansas, Arkansas"
    })
  });

  function normalizeCode(value) {
    const code = String(value ?? "")
      .trim()
      .toUpperCase();

    return /^[A-Z0-9]{3}$/.test(code)
      ? code
      : null;
  }

  function getPoster(value) {
    const code = normalizeCode(value);

    return code
      ? posterByAirport[code] ?? null
      : null;
  }

  root.dadRadarPosters = Object.freeze({
    getPoster,
    posterByAirport
  });

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = {
      getPoster,
      posterByAirport
    };
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this
);
