const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_MANIFEST = path.join(PROJECT_ROOT, "data", "poster-batch-manifest.json");
const IMAGE_REQUIRED_STATUSES = new Set(["candidate", "approved"]);
const ALLOWED_STATUSES = new Set(["planned", "generating", "candidate", "approved", "rejected"]);

function parseArguments(argv) {
  const options = { batch: null, manifest: DEFAULT_MANIFEST };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--batch") {
      options.batch = argv[index + 1] || null;
      index += 1;
    } else if (argv[index] === "--manifest") {
      const requestedPath = argv[index + 1];
      if (!requestedPath) {
        throw new Error("--manifest requires a path");
      }
      options.manifest = path.resolve(process.cwd(), requestedPath);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }

  return options;
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || buffer.length < 24) {
    throw new Error("not a valid PNG file");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function validateManifest(manifest, options = {}) {
  const errors = [];
  const warnings = [];
  const selectedBatch = options.batch || null;
  const collection = manifest.collection || {};
  const reviewCanvas = collection.reviewCanvas || {};
  const batches = Array.isArray(manifest.batches) ? manifest.batches : [];
  const destinations = Array.isArray(manifest.destinations) ? manifest.destinations : [];

  if (manifest.schemaVersion !== 1) {
    errors.push("schemaVersion must equal 1");
  }

  for (const key of ["width", "height", "ratioWidth", "ratioHeight", "ratioTolerance"]) {
    if (!Number.isFinite(reviewCanvas[key]) || reviewCanvas[key] <= 0) {
      errors.push(`collection.reviewCanvas.${key} must be a positive number`);
    }
  }

  const batchById = new Map();
  for (const batch of batches) {
    if (!batch.id || batchById.has(batch.id)) {
      errors.push(`batch id is missing or duplicated: ${batch.id || "<missing>"}`);
      continue;
    }
    batchById.set(batch.id, batch);
  }

  if (selectedBatch && !batchById.has(selectedBatch)) {
    errors.push(`unknown batch: ${selectedBatch}`);
  }

  const selectedDestinations = selectedBatch
    ? destinations.filter((destination) => destination.batch === selectedBatch)
    : destinations;
  const codeSet = new Set();
  const outputSet = new Set();
  const visualProfileSet = new Set();
  const skySignatureSet = new Set();
  const aircraftPlacementSet = new Set();

  for (const destination of selectedDestinations) {
    const label = destination.code || "<missing code>";
    if (!/^[A-Z0-9]{3}$/.test(destination.code || "")) {
      errors.push(`${label}: code must be exactly three uppercase letters or digits`);
    }
    if (codeSet.has(destination.code)) {
      errors.push(`${label}: duplicate airport code`);
    }
    codeSet.add(destination.code);

    if (!/^[A-Z0-9]{4}$/.test(destination.icao || "")) {
      errors.push(`${label}: icao must be exactly four uppercase letters or digits`);
    }
    for (const field of ["city", "region", "title", "subtitle", "descriptor", "tagline", "batch", "status", "output", "visualProfileId"]) {
      if (typeof destination[field] !== "string" || !destination[field].trim()) {
        errors.push(`${label}: ${field} is required`);
      }
    }
    if (!ALLOWED_STATUSES.has(destination.status)) {
      errors.push(`${label}: unsupported status ${destination.status}`);
    }
    if (!batchById.has(destination.batch)) {
      errors.push(`${label}: unknown batch ${destination.batch}`);
    }
    if ((destination.descriptor || "").split(" • ").length !== 3) {
      errors.push(`${label}: descriptor must contain three phrases separated by \" • \"`);
    }
    if (!destination.tagline.endsWith(".")) {
      warnings.push(`${label}: tagline should end with a period`);
    }

    if (outputSet.has(destination.output)) {
      errors.push(`${label}: duplicate output path ${destination.output}`);
    }
    outputSet.add(destination.output);
    const expectedOutputPrefix = `assets/destinations/${destination.code.toLowerCase()}-poster-7x8-`;
    if (!destination.output.startsWith(expectedOutputPrefix) || !destination.output.endsWith(".png")) {
      errors.push(`${label}: output path must begin ${expectedOutputPrefix} and end in .png`);
    }

    const design = destination.design || {};
    if (!Array.isArray(design.landmarks) || design.landmarks.length < 2) {
      errors.push(`${label}: at least two factual landmarks are required`);
    }
    for (const field of ["skySignature", "seasonAndLight", "titleAlignment", "aircraftPlacement", "foreground"]) {
      if (typeof design[field] !== "string" || !design[field].trim()) {
        errors.push(`${label}: design.${field} is required`);
      }
    }
    if (!Array.isArray(design.avoid) || design.avoid.length < 2) {
      errors.push(`${label}: design.avoid requires at least two constraints`);
    }
    if (!Array.isArray(destination.referenceSources) || destination.referenceSources.length < 2) {
      errors.push(`${label}: at least two factual reference sources are required`);
    }

    for (const [set, value, field] of [
      [visualProfileSet, destination.visualProfileId, "visualProfileId"],
      [skySignatureSet, design.skySignature, "design.skySignature"],
      [aircraftPlacementSet, design.aircraftPlacement, "design.aircraftPlacement"],
    ]) {
      if (set.has(value)) {
        errors.push(`${label}: ${field} duplicates another destination in this batch`);
      }
      set.add(value);
    }

    const absoluteOutput = path.join(PROJECT_ROOT, destination.output || "");
    if (IMAGE_REQUIRED_STATUSES.has(destination.status)) {
      if (!fs.existsSync(absoluteOutput)) {
        errors.push(`${label}: ${destination.status} image is missing at ${destination.output}`);
      } else {
        try {
          const dimensions = readPngDimensions(absoluteOutput);
          if (dimensions.width !== reviewCanvas.width || dimensions.height !== reviewCanvas.height) {
            errors.push(
              `${label}: image is ${dimensions.width}x${dimensions.height}; expected ${reviewCanvas.width}x${reviewCanvas.height}`
            );
          }
          const actualRatio = dimensions.width / dimensions.height;
          const expectedRatio = reviewCanvas.ratioWidth / reviewCanvas.ratioHeight;
          if (Math.abs(actualRatio - expectedRatio) > reviewCanvas.ratioTolerance) {
            errors.push(`${label}: image aspect ratio falls outside the allowed 7:8 tolerance`);
          }
        } catch (error) {
          errors.push(`${label}: ${error.message}`);
        }
      }
    } else if (fs.existsSync(absoluteOutput)) {
      warnings.push(`${label}: output exists while status is ${destination.status}`);
    }
  }

  if (selectedBatch) {
    const batch = batchById.get(selectedBatch);
    if (batch) {
      const expectedCodes = new Set(batch.airportCodes || []);
      const actualCodes = new Set(selectedDestinations.map((destination) => destination.code));
      for (const code of expectedCodes) {
        if (!actualCodes.has(code)) {
          errors.push(`${selectedBatch}: batch lists ${code}, but no destination record exists`);
        }
      }
      for (const code of actualCodes) {
        if (!expectedCodes.has(code)) {
          errors.push(`${selectedBatch}: destination ${code} is missing from batch.airportCodes`);
        }
      }
    }
  }

  return { errors, warnings, destinations: selectedDestinations };
}

function run() {
  const options = parseArguments(process.argv.slice(2));
  const manifest = JSON.parse(fs.readFileSync(options.manifest, "utf8"));
  const result = validateManifest(manifest, options);

  for (const warning of result.warnings) {
    console.warn(`WARNING: ${warning}`);
  }
  if (result.errors.length) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const counts = result.destinations.reduce((summary, destination) => {
    summary[destination.status] = (summary[destination.status] || 0) + 1;
    return summary;
  }, {});
  const scope = options.batch ? `batch ${options.batch}` : "poster manifest";
  console.log(`Poster validation passed for ${scope}.`);
  console.log(
    Object.entries(counts)
      .map(([status, count]) => `${status}: ${count}`)
      .join(" | ")
  );
}

if (require.main === module) {
  run();
}

module.exports = {
  parseArguments,
  readPngDimensions,
  validateManifest,
};
