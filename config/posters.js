(function initializeDadRadarPosters(root) {
  "use strict";

  const posterByAirport = Object.freeze({
    ABE: Object.freeze({
      source:
        "./assets/destinations/abe-poster-7x8-candidate-v1.png",
      title: "LEHIGH VALLEY",
      location:
        "Lehigh Valley, Pennsylvania"
    }),
    AVL: Object.freeze({
      source:
        "./assets/destinations/asheville-poster-7x8-baseline.png",
      title: "ASHEVILLE",
      location:
        "Asheville, North Carolina"
    }),
    BMI: Object.freeze({
      source:
        "./assets/destinations/bmi-poster-7x8-candidate-v1.png",
      title: "BLOOMINGTON–NORMAL",
      location:
        "Bloomington–Normal, Illinois"
    }),
    BNA: Object.freeze({
      source:
        "./assets/destinations/bna-poster-7x8-candidate-v1.png",
      title: "NASHVILLE",
      location: "Nashville, Tennessee"
    }),
    BWI: Object.freeze({
      source:
        "./assets/destinations/bwi-poster-7x8-candidate-v1.png",
      title: "BALTIMORE",
      location: "Baltimore, Maryland"
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
    CLD: Object.freeze({
      source:
        "./assets/destinations/cld-poster-7x8-candidate-v1.png",
      title: "CARLSBAD",
      location: "Carlsbad, California"
    }),
    CMI: Object.freeze({
      source:
        "./assets/destinations/cmi-poster-7x8-candidate-v1.png",
      title: "CHAMPAIGN–URBANA",
      location:
        "Champaign–Urbana, Illinois"
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
    GRB: Object.freeze({
      source:
        "./assets/destinations/grb-poster-7x8-candidate-v1.png",
      title: "GREEN BAY",
      location: "Green Bay, Wisconsin"
    }),
    GSP: Object.freeze({
      source:
        "./assets/destinations/gsp-poster-7x8-candidate-v1.png",
      title: "GREENVILLE–SPARTANBURG",
      location: "Greer, South Carolina"
    }),
    HSV: Object.freeze({
      source:
        "./assets/destinations/hsv-poster-7x8-candidate-v1.png",
      title: "HUNTSVILLE",
      location: "Huntsville, Alabama"
    }),
    IND: Object.freeze({
      source:
        "./assets/destinations/ind-poster-7x8-candidate-v1.png",
      title: "INDIANAPOLIS",
      location: "Indianapolis, Indiana"
    }),
    LBB: Object.freeze({
      source:
        "./assets/destinations/lbb-poster-7x8-candidate-v1.png",
      title: "LUBBOCK",
      location: "Lubbock, Texas"
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
    MSN: Object.freeze({
      source:
        "./assets/destinations/msn-poster-7x8-candidate-v1.png",
      title: "MADISON",
      location: "Madison, Wisconsin"
    }),
    MSY: Object.freeze({
      source:
        "./assets/destinations/msy-poster-7x8-candidate-v1.png",
      title: "NEW ORLEANS",
      location: "New Orleans, Louisiana"
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
    SGF: Object.freeze({
      source:
        "./assets/destinations/sgf-poster-7x8-candidate-v1.png",
      title: "SPRINGFIELD",
      location: "Springfield, Missouri"
    }),
    SPI: Object.freeze({
      source:
        "./assets/destinations/spi-poster-7x8-candidate-v1.png",
      title: "SPRINGFIELD",
      location: "Springfield, Illinois"
    }),
    SYR: Object.freeze({
      source:
        "./assets/destinations/syr-poster-7x8-candidate-v1.png",
      title: "SYRACUSE",
      location: "Syracuse, New York"
    }),
    TPA: Object.freeze({
      source:
        "./assets/destinations/tpa-poster-7x8-candidate-v1.png",
      title: "TAMPA",
      location: "Tampa, Florida"
    }),
    TUL: Object.freeze({
      source:
        "./assets/destinations/tul-poster-7x8-candidate-v1.png",
      title: "TULSA",
      location: "Tulsa, Oklahoma"
    }),
    TVC: Object.freeze({
      source:
        "./assets/destinations/tvc-poster-7x8-candidate-v1.png",
      title: "TRAVERSE CITY",
      location: "Traverse City, Michigan"
    }),
    TYS: Object.freeze({
      source:
        "./assets/destinations/tys-poster-7x8-candidate-v1.png",
      title: "KNOXVILLE",
      location: "Knoxville, Tennessee"
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
