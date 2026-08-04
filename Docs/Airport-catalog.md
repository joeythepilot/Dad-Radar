# Airport Catalog

Dad Radar bundles one shared, offline airport catalog for family-facing location names, airport-local time conversion, map coordinates, and destination placards.

## Coverage

The generated catalog includes every current three-letter IATA airport record in `mborsetti/airportsdata`. Each entry can provide:

- IATA and ICAO identifiers
- airport name
- city and state, province, or other subdivision
- country code
- latitude and longitude
- field elevation
- IANA time zone

The catalog is informational display data and is never suitable for navigation or operational flight planning.

## Family-facing wording

Schedule context uses the catalog's full location label. For example, BIL becomes `Billings, Montana`, so the current flight reads `DADDY IS FLYING TO BILLINGS, MONTANA`. Map placards retain the shorter city name.

## Runtime behavior

The generated `data/airport-catalog.js` file is loaded locally before the state models. The browser and backend therefore use identical airport metadata without another API key or runtime network request. Unknown codes continue to fall back to their three-letter identifier.

## Updating

Run:

```powershell
npm.cmd run update:airports
```

The generator downloads the current source CSV and replaces the bundled catalog. Run the full test suite after any update.

For an audited or offline update, provide a downloaded source file:

```powershell
node scripts/generate-airport-catalog.js --source C:\path\to\airports.csv
```

Source: `https://github.com/mborsetti/airportsdata`  
License: MIT; retained in `data/airport-data-LICENSE.txt`
