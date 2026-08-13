const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_SOURCE_URL =
  "https://raw.githubusercontent.com/mborsetti/airportsdata/main/airportsdata/airports.csv";

const DEFAULT_OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "data",
  "airport-catalog.js"
);

function commandLineOption(
  name,
  fallback
) {
  const optionIndex =
    process.argv.indexOf(name);

  if (optionIndex < 0) {
    return fallback;
  }

  const value =
    process.argv[optionIndex + 1];

  if (!value || value.startsWith("--")) {
    throw new TypeError(
      `${name} requires a value.`
    );
  }

  return value;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (
      character === "\n" ||
      character === "\r"
    ) {
      if (
        character === "\r" &&
        text[index + 1] === "\n"
      ) {
        index += 1;
      }

      row.push(field);
      field = "";

      if (
        row.length > 1 ||
        row[0] !== ""
      ) {
        rows.push(row);
      }

      row = [];
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new SyntaxError(
      "Airport CSV contains an unclosed quoted field."
    );
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function finiteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function createAirportRecords(csvText) {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    throw new Error(
      "Airport CSV did not contain data rows."
    );
  }

  const header = rows[0];
  const column = Object.fromEntries(
    header.map(
      (name, index) => [name, index]
    )
  );

  const requiredColumns = [
    "icao",
    "iata",
    "name",
    "city",
    "subd",
    "country",
    "elevation",
    "lat",
    "lon",
    "tz"
  ];

  for (const name of requiredColumns) {
    if (column[name] === undefined) {
      throw new Error(
        `Airport CSV is missing the ${name} column.`
      );
    }
  }

  const records = new Map();

  for (const row of rows.slice(1)) {
    const iata = String(
      row[column.iata] ?? ""
    )
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(iata)) {
      continue;
    }

    const record = [
      String(row[column.icao] ?? "")
        .trim()
        .toUpperCase(),
      String(row[column.name] ?? "")
        .trim(),
      String(row[column.city] ?? "")
        .trim(),
      String(row[column.subd] ?? "")
        .trim(),
      String(row[column.country] ?? "")
        .trim()
        .toUpperCase(),
      finiteNumber(row[column.elevation]),
      finiteNumber(row[column.lat]),
      finiteNumber(row[column.lon]),
      String(row[column.tz] ?? "")
        .trim()
    ];

    const existing = records.get(iata);

    if (
      !existing ||
      (
        !existing[8] &&
        record[8]
      )
    ) {
      records.set(iata, record);
    }
  }

  return records;
}

async function readSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, {
      headers: {
        Accept: "text/csv"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Airport source returned HTTP ${response.status}.`
      );
    }

    return response.text();
  }

  return fs.readFile(
    path.resolve(source),
    "utf8"
  );
}

function generatedCatalogSource(
  records,
  sourceReference
) {
  const entries = Array.from(
    records.entries()
  ).sort(
    ([left], [right]) =>
      left.localeCompare(right)
  );

  const recordLines = entries.map(
    ([code, record]) =>
      `    ${JSON.stringify(code)}: ${JSON.stringify(record)}`
  );

  return `/*
 * Generated Dad Radar airport catalog.
 * Source: mborsetti/airportsdata (${sourceReference})
 * License: MIT; see data/airport-data-LICENSE.txt.
 * Informational display data only. Not for navigation.
 */
(function initializeAirportCatalog(root, factory) {
  const api = factory({
${recordLines.join(",\n")}
  });

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  if (root) {
    root.dadRadarAirports =
      Object.freeze(api);
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function createAirportCatalog(records) {
    "use strict";

    const airportCache =
      Object.create(null);

    const countryNames =
      typeof Intl !== "undefined" &&
      typeof Intl.DisplayNames ===
        "function"
        ? new Intl.DisplayNames(
            ["en"],
            { type: "region" }
          )
        : null;

    function normalizeIataCode(value) {
      const code = String(value ?? "")
        .trim()
        .toUpperCase();

      return /^[A-Z]{3}$/.test(code)
        ? code
        : null;
    }

    function lookupAirport(value) {
      const code =
        normalizeIataCode(value);

      if (!code || !records[code]) {
        return null;
      }

      if (airportCache[code]) {
        return airportCache[code];
      }

      const record = records[code];

      const airport = Object.freeze({
        code,
        icao: record[0] || null,
        name: record[1] || code,
        city: record[2] || code,
        subdivision: record[3] || null,
        countryCode: record[4] || null,
        elevationFeet:
          Number.isFinite(record[5])
            ? record[5]
            : null,
        latitude:
          Number.isFinite(record[6])
            ? record[6]
            : null,
        longitude:
          Number.isFinite(record[7])
            ? record[7]
            : null,
        timeZone: record[8] || null
      });

      airportCache[code] = airport;

      return airport;
    }

    function countryName(countryCode) {
      if (!countryCode) {
        return null;
      }

      try {
        return countryNames?.of(
          countryCode
        ) ?? countryCode;
      } catch (error) {
        return countryCode;
      }
    }

    function formatLocation(value) {
      const airport =
        lookupAirport(value);

      if (!airport) {
        return normalizeIataCode(value) ??
          String(value ?? "").trim();
      }

      if (
        airport.subdivision &&
        airport.subdivision !==
          airport.city
      ) {
        return [
          airport.city,
          airport.subdivision
        ].join(", ");
      }

      if (
        airport.countryCode &&
        airport.countryCode !== "US"
      ) {
        return [
          airport.city,
          countryName(
            airport.countryCode
          )
        ].filter(Boolean).join(", ");
      }

      return airport.city;
    }

    function getAirportTimeZone(value) {
      return lookupAirport(value)
        ?.timeZone ?? null;
    }

    function getAirportCoordinates(value) {
      const airport =
        lookupAirport(value);

      if (
        !Number.isFinite(
          airport?.latitude
        ) ||
        !Number.isFinite(
          airport?.longitude
        )
      ) {
        return null;
      }

      return Object.freeze({
        latitude: airport.latitude,
        longitude: airport.longitude
      });
    }

    return {
      count: ${entries.length},
      source:
        "mborsetti/airportsdata",
      formatLocation,
      getAirportCoordinates,
      getAirportTimeZone,
      lookupAirport
    };
  }
);
`;
}

async function main() {
  const source = commandLineOption(
    "--source",
    DEFAULT_SOURCE_URL
  );

  const output = path.resolve(
    commandLineOption(
      "--output",
      DEFAULT_OUTPUT_PATH
    )
  );

  const csvText = await readSource(source);
  const records =
    createAirportRecords(csvText);

  if (records.size < 7000) {
    throw new Error(
      `Airport catalog is unexpectedly small (${records.size} records).`
    );
  }

  await fs.mkdir(
    path.dirname(output),
    { recursive: true }
  );

  await fs.writeFile(
    output,
    generatedCatalogSource(
      records,
      /^https?:\/\//i.test(source)
        ? source
        : DEFAULT_SOURCE_URL
    ),
    "utf8"
  );

  console.log(
    `Generated ${records.size} IATA airport records at ${output}.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
