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
    ABQ: Object.freeze({
      source:
        "./assets/destinations/abq-poster-7x8-candidate-v1.png",
      title: "ALBUQUERQUE",
      location: "Albuquerque, New Mexico"
    }),
    ALB: Object.freeze({
      source:
        "./assets/destinations/alb-poster-7x8-candidate-v1.png",
      title: "ALBANY",
      location: "Albany, New York"
    }),
    AMA: Object.freeze({
      source:
        "./assets/destinations/ama-poster-7x8-candidate-v1.png",
      title: "AMARILLO",
      location: "Amarillo, Texas"
    }),
    ATL: Object.freeze({
      source:
        "./assets/destinations/atl-poster-7x8-candidate-v1.png",
      title: "ATLANTA",
      location: "Atlanta, Georgia"
    }),
    AUS: Object.freeze({
      source:
        "./assets/destinations/aus-poster-7x8-candidate-v1.png",
      title: "AUSTIN",
      location: "Austin, Texas"
    }),
    ATW: Object.freeze({
      source:
        "./assets/destinations/atw-poster-7x8-candidate-v1.png",
      title: "APPLETON",
      location: "Appleton, Wisconsin"
    }),
    AVL: Object.freeze({
      source:
        "./assets/destinations/asheville-poster-7x8-baseline.png",
      title: "ASHEVILLE",
      location:
        "Asheville, North Carolina"
    }),
    BHM: Object.freeze({
      source:
        "./assets/destinations/bhm-poster-7x8-candidate-v2.png",
      title: "BIRMINGHAM",
      location: "Birmingham, Alabama"
    }),
    BMI: Object.freeze({
      source:
        "./assets/destinations/bmi-poster-7x8-candidate-v1.png",
      title: "BLOOMINGTON–NORMAL",
      location:
        "Bloomington–Normal, Illinois"
    }),
    BOI: Object.freeze({
      source:
        "./assets/destinations/boi-poster-7x8-candidate-v1.png",
      title: "BOISE",
      location: "Boise, Idaho"
    }),
    BNA: Object.freeze({
      source:
        "./assets/destinations/bna-poster-7x8-candidate-v1.png",
      title: "NASHVILLE",
      location: "Nashville, Tennessee"
    }),
    BOS: Object.freeze({
      source:
        "./assets/destinations/bos-poster-7x8-candidate-v1.png",
      title: "BOSTON",
      location: "Boston, Massachusetts"
    }),
    BWI: Object.freeze({
      source:
        "./assets/destinations/bwi-poster-7x8-candidate-v1.png",
      title: "BALTIMORE",
      location: "Baltimore, Maryland"
    }),
    BRO: Object.freeze({
      source:
        "./assets/destinations/bro-poster-7x8-candidate-v1.png",
      title: "BROWNSVILLE",
      location: "Brownsville, Texas"
    }),
    BUF: Object.freeze({
      source:
        "./assets/destinations/buf-poster-7x8-candidate-v2.png",
      title: "BUFFALO",
      location: "Buffalo, New York"
    }),
    CHA: Object.freeze({
      source:
        "./assets/destinations/cha-poster-7x8-candidate-v1.png",
      title: "CHATTANOOGA",
      location: "Chattanooga, Tennessee"
    }),
    CHS: Object.freeze({
      source:
        "./assets/destinations/chs-poster-7x8-candidate-v1.png",
      title: "CHARLESTON",
      location: "Charleston, South Carolina"
    }),
    CLE: Object.freeze({
      source:
        "./assets/destinations/cle-poster-7x8-candidate-v1.png",
      title: "CLEVELAND",
      location: "Cleveland, Ohio"
    }),
    GPT: Object.freeze({
      source:
        "./assets/destinations/gpt-poster-7x8-candidate-v1.png",
      title: "GULFPORT",
      location: "Gulfport, Mississippi"
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
    COS: Object.freeze({
      source:
        "./assets/destinations/cos-poster-7x8-candidate-v2.png",
      title: "COLORADO SPRINGS",
      location: "Colorado Springs, Colorado"
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
    DAY: Object.freeze({
      source:
        "./assets/destinations/day-poster-7x8-candidate-v1.png",
      title: "DAYTON",
      location: "Dayton, Ohio"
    }),
    DSM: Object.freeze({
      source:
        "./assets/destinations/dsm-poster-7x8-candidate-v1.png",
      title: "DES MOINES",
      location: "Des Moines, Iowa"
    }),
    DTW: Object.freeze({
      source:
        "./assets/destinations/dtw-poster-7x8-candidate-v1.png",
      title: "DETROIT",
      location: "Detroit, Michigan"
    }),
    ELP: Object.freeze({
      source:
        "./assets/destinations/elp-poster-7x8-candidate-v1.png",
      title: "EL PASO",
      location: "El Paso, Texas"
    }),
    EVV: Object.freeze({
      source:
        "./assets/destinations/evv-poster-7x8-candidate-v1.png",
      title: "EVANSVILLE",
      location: "Evansville, Indiana"
    }),
    EYW: Object.freeze({
      source:
        "./assets/destinations/eyw-poster-7x8-candidate-v1.png",
      title: "KEY WEST",
      location: "Key West, Florida"
    }),
    FAR: Object.freeze({
      source:
        "./assets/destinations/far-poster-7x8-candidate-v1.png",
      title: "FARGO",
      location: "Fargo, North Dakota"
    }),
    GRB: Object.freeze({
      source:
        "./assets/destinations/grb-poster-7x8-candidate-v1.png",
      title: "GREEN BAY",
      location: "Green Bay, Wisconsin"
    }),
    GRR: Object.freeze({
      source:
        "./assets/destinations/grr-poster-7x8-candidate-v1.png",
      title: "GRAND RAPIDS",
      location: "Grand Rapids, Michigan"
    }),
    GSO: Object.freeze({
      source:
        "./assets/destinations/gso-poster-7x8-candidate-v1.png",
      title: "GREENSBORO",
      location: "Greensboro, North Carolina"
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
    IAH: Object.freeze({
      source:
        "./assets/destinations/iah-poster-7x8-candidate-v1.png",
      title: "HOUSTON",
      location: "Houston, Texas"
    }),
    IND: Object.freeze({
      source:
        "./assets/destinations/ind-poster-7x8-candidate-v1.png",
      title: "INDIANAPOLIS",
      location: "Indianapolis, Indiana"
    }),
    ICT: Object.freeze({
      source:
        "./assets/destinations/ict-poster-7x8-candidate-v1.png",
      title: "WICHITA",
      location: "Wichita, Kansas"
    }),
    JAX: Object.freeze({
      source:
        "./assets/destinations/jax-poster-7x8-candidate-v2.png",
      title: "JACKSONVILLE",
      location: "Jacksonville, Florida"
    }),
    LBB: Object.freeze({
      source:
        "./assets/destinations/lbb-poster-7x8-candidate-v1.png",
      title: "LUBBOCK",
      location: "Lubbock, Texas"
    }),
    LIT: Object.freeze({
      source:
        "./assets/destinations/lit-poster-7x8-candidate-v1.png",
      title: "LITTLE ROCK",
      location: "Little Rock, Arkansas"
    }),
    LSE: Object.freeze({
      source:
        "./assets/destinations/lse-poster-7x8-candidate-v1.png",
      title: "LA CROSSE",
      location:
        "La Crosse, Wisconsin"
    }),
    MCI: Object.freeze({
      source:
        "./assets/destinations/mci-poster-7x8-candidate-v1.png",
      title: "KANSAS CITY",
      location: "Kansas City, Missouri"
    }),
    MEM: Object.freeze({
      source:
        "./assets/destinations/mem-poster-7x8-candidate-v1.png",
      title: "MEMPHIS",
      location: "Memphis, Tennessee"
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
    MSP: Object.freeze({
      source:
        "./assets/destinations/msp-poster-7x8-candidate-v1.png",
      title: "MINNEAPOLIS",
      location: "Minneapolis, Minnesota"
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
    OMA: Object.freeze({
      source:
        "./assets/destinations/oma-poster-7x8-candidate-v1.png",
      title: "OMAHA",
      location: "Omaha, Nebraska"
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
    PIT: Object.freeze({
      source:
        "./assets/destinations/pit-poster-7x8-candidate-v1.png",
      title: "PITTSBURGH",
      location: "Pittsburgh, Pennsylvania"
    }),
    PNS: Object.freeze({
      source:
        "./assets/destinations/pns-poster-7x8-candidate-v1.png",
      title: "PENSACOLA",
      location: "Pensacola, Florida"
    }),
    RIC: Object.freeze({
      source:
        "./assets/destinations/ric-poster-7x8-candidate-v1.png",
      title: "RICHMOND",
      location: "Richmond, Virginia"
    }),
    ROC: Object.freeze({
      source:
        "./assets/destinations/roc-poster-7x8-candidate-v1.png",
      title: "ROCHESTER",
      location: "Rochester, New York"
    }),
    SAT: Object.freeze({
      source:
        "./assets/destinations/sat-poster-7x8-candidate-v1.png",
      title: "SAN ANTONIO",
      location: "San Antonio, Texas"
    }),
    SDF: Object.freeze({
      source:
        "./assets/destinations/sdf-poster-7x8-candidate-v2.png",
      title: "LOUISVILLE",
      location: "Louisville, Kentucky"
    }),
    SEA: Object.freeze({
      source:
        "./assets/destinations/sea-poster-7x8-candidate-v1.png",
      title: "SEATTLE",
      location: "Seattle, Washington"
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
    STL: Object.freeze({
      source:
        "./assets/destinations/stl-poster-7x8-candidate-v1.png",
      title: "ST. LOUIS",
      location: "St. Louis, Missouri"
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
    }),
    OKC: Object.freeze({
      source:
        "./assets/destinations/okc-poster-7x8-candidate-v1.png",
      title: "OKLAHOMA CITY",
      location: "Oklahoma City, Oklahoma"
    }),
    MYR: Object.freeze({
      source:
        "./assets/destinations/myr-poster-7x8-candidate-v1.png",
      title: "MYRTLE BEACH",
      location: "Myrtle Beach, South Carolina"
    }),
    ORF: Object.freeze({
      source:
        "./assets/destinations/orf-poster-7x8-candidate-v1.png",
      title: "NORFOLK",
      location: "Norfolk, Virginia"
    }),
    YQB: Object.freeze({
      source:
        "./assets/destinations/yqb-poster-7x8-candidate-v1.png",
      title: "QUÉBEC CITY",
      location: "Québec City, Québec"
    }),
    BTR: Object.freeze({
      source:
        "./assets/destinations/btr-poster-7x8-candidate-v1.png",
      title: "BATON ROUGE",
      location: "Baton Rouge, Louisiana"
    }),
    ACA: Object.freeze({
      source:
        "./assets/destinations/aca-poster-7x8-candidate-v1.png",
      title: "ACAPULCO",
      location: "Acapulco, Guerrero"
    }),
    BIL: Object.freeze({
      source:
        "./assets/destinations/bil-poster-7x8-candidate-v1.png",
      title: "BILLINGS",
      location: "Billings, Montana"
    }),
    CRP: Object.freeze({
      source:
        "./assets/destinations/crp-poster-7x8-candidate-v1.png",
      title: "CORPUS CHRISTI",
      location: "Corpus Christi, Texas"
    }),
    GJT: Object.freeze({
      source:
        "./assets/destinations/gjt-poster-7x8-candidate-v1.png",
      title: "GRAND JUNCTION",
      location: "Grand Junction, Colorado"
    }),
    ILM: Object.freeze({
      source:
        "./assets/destinations/ilm-poster-7x8-candidate-v1.png",
      title: "WILMINGTON",
      location: "Wilmington, North Carolina"
    }),
    ABI: Object.freeze({
      source:
        "./assets/destinations/abi-poster-7x8-candidate-v2.png",
      title: "ABILENE",
      location: "Abilene, Texas"
    }),
    ACT: Object.freeze({
      source:
        "./assets/destinations/act-poster-7x8-candidate-v2.png",
      title: "WACO",
      location: "Waco, Texas"
    }),
    AEX: Object.freeze({
      source:
        "./assets/destinations/aex-poster-7x8-candidate-v2.png",
      title: "ALEXANDRIA",
      location: "Alexandria, Louisiana"
    }),
    AGU: Object.freeze({
      source:
        "./assets/destinations/agu-poster-7x8-candidate-v2.png",
      title: "AGUASCALIENTES",
      location: "Aguascalientes, Mexico"
    }),
    AVP: Object.freeze({
      source:
        "./assets/destinations/avp-poster-7x8-candidate-v2.png",
      title: "SCRANTON",
      location: "Wilkes-Barre/Scranton, Pennsylvania"
    }),
    BDL: Object.freeze({
      source: "./assets/destinations/bdl-poster-7x8-candidate-v1.png",
      title: "HARTFORD",
      location: "Hartford, Connecticut"
    }),
    BIS: Object.freeze({
      source: "./assets/destinations/bis-poster-7x8-candidate-v1.png",
      title: "BISMARCK",
      location: "Bismarck, North Dakota"
    }),
    BPT: Object.freeze({
      source: "./assets/destinations/bpt-poster-7x8-candidate-v1.png",
      title: "PORT ARTHUR",
      location: "Beaumont/Port Arthur, Texas"
    }),
    BUR: Object.freeze({
      source: "./assets/destinations/bur-poster-7x8-candidate-v1.png",
      title: "BURBANK",
      location: "Burbank, California"
    }),
    CAE: Object.freeze({
      source: "./assets/destinations/cae-poster-7x8-candidate-v1.png",
      title: "COLUMBIA",
      location: "Columbia, South Carolina"
    }),
    CAK: Object.freeze({
      source: "./assets/destinations/cak-poster-7x8-candidate-v1.png",
      title: "AKRON",
      location: "Akron, Ohio"
    }),
    CCS: Object.freeze({
      source: "./assets/destinations/ccs-poster-7x8-candidate-v1.png",
      title: "CARACAS",
      location: "Caracas, Venezuela"
    }),
    CID: Object.freeze({
      source: "./assets/destinations/cid-poster-7x8-candidate-v2.png",
      title: "CEDAR RAPIDS",
      location: "Cedar Rapids, Iowa"
    }),
    CLL: Object.freeze({
      source: "./assets/destinations/cll-poster-7x8-candidate-v1.png",
      title: "COLLEGE STATION",
      location: "College Station, Texas"
    }),
    COU: Object.freeze({
      source: "./assets/destinations/cou-poster-7x8-candidate-v1.png",
      title: "COLUMBIA",
      location: "Columbia, Missouri"
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
