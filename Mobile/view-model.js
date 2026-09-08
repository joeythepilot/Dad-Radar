(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.dadRadarMobile = api;
})(globalThis, function() {
  'use strict';
  const STALE_MS = 3 * 60 * 1000;
  function validTime(value) {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  function sameLeg(event, snapshot) {
    return Boolean(event && snapshot && event.origin === snapshot.origin && event.destination === snapshot.destination);
  }
  function dutyWindow(entries, capacity) {
    // Flight rows take precedence over overlapping all-day HOME/layover entries.
    const flights = entries.filter(entry => entry.kind === 'flight' || /→/.test(entry.label || ''));
    const rows = flights.length ? flights : entries;
    const count = Math.max(1, Math.min(8, Math.floor(capacity) || 1));
    let focus = rows.findIndex(entry => entry.status === 'current');
    if (focus < 0) focus = rows.findIndex(entry => entry.status === 'upcoming');
    if (focus < 0) focus = Math.max(0, rows.length - count);
    const start = Math.min(focus, Math.max(0, rows.length - count));
    const visible = rows.slice(start, start + count);
    const later = Math.max(0, rows.length - start - visible.length);
    return {entries: visible, earlier: start, later,
      summary: [start ? `${start} earlier` : '', later ? `${later} later` : ''].filter(Boolean).join(' · ')};
  }
  function telemetry(flight, positionAt, fresh) {
    // Read the reconciled flight only, so a replacement leg cannot inherit a snapshot's instruments.
    const numeric = value => typeof value === 'number' && Number.isFinite(value);
    const speed = numeric(flight?.groundSpeed) && flight.groundSpeed >= 0 ? flight.groundSpeed : null;
    const altitude = numeric(flight?.altitude) ? flight.altitude : null;
    const available = speed !== null || altitude !== null;
    const format = value => value === null ? '—' : Math.round(value).toLocaleString('en-US');
    return {speed: format(speed), altitude: format(altitude), stale: available && !fresh,
      note: available && !fresh ? positionAt ? 'STALE' : 'AGE UNKNOWN' : ''};
  }
  function viewModel({ state = {}, mode = '', event = null, snapshot = null, calendarAt = null, failed = false, now = Date.now(), airports, homeAirport = 'AVL' }) {
    const flight = state.flight;
    const code = flight?.destination || state.locationAirport || '';
    const airport = airports.lookupAirport(code);
    const zone = airport?.timeZone || 'UTC';
    // Never re-label the desktop's Eastern-time string as destination-local.
    // Arrival display is formatted only from absolute timestamps.
    const matching = flight && sameLeg(event, snapshot) && event.origin === flight.origin && event.destination === flight.destination;
    const live = matching ? snapshot : null;
    const reported = validTime(live?.retrievedAt);
    const scheduled = validTime(event?.times?.endUtc || event?.endUtc);
    const gate = validTime(live?.arrival?.actualGate);
    const runway = validTime(live?.arrival?.actualRunway);
    const estimate = validTime(live?.arrival?.estimated);
    const providerSchedule = validTime(live?.arrival?.scheduled);
    const arrival = gate || runway || estimate || providerSchedule || scheduled;
    const liveArrival = Boolean(gate || runway || estimate);
    const stale = failed || (liveArrival && (!reported || now - reported > STALE_MS));
    let arrivalLabel = gate ? 'Arrived' : runway ? 'Landed' : estimate ? 'Expected arrival' : 'Scheduled arrival';
    if (stale && liveArrival) arrivalLabel = gate ? 'Reported arrival' : runway ? 'Reported landing' : 'Last reported arrival';
    const positionAt = validTime(flight?.lastPositionAt || live?.position?.recordedAt);
    const positionFresh = Boolean(positionAt && now - positionAt >= -5000 && now - positionAt <= STALE_MS && !failed && state.liveData);
    let updated = 'Waiting for schedule';
    const scheduleMs = validTime(calendarAt);
    if (reported) updated = `Flight updated ${age(reported, now)}`;
    else if (scheduleMs) updated = `Schedule updated ${age(scheduleMs, now)}${flight ? ' · awaiting live flight data' : ''}`;
    if (failed) updated = 'Connection interrupted · showing last received information';
    else if (reported && now - reported > STALE_MS) updated += ' · updates are behind';
    else if (scheduleMs && now - scheduleMs > 10 * 60 * 1000) updated += ' · schedule may be outdated';
    const pickup = Boolean(flight?.isCommute && code === homeAirport);
    const message = state.message || (flight ? `Daddy is ${flight.isCommute ? 'traveling' : 'flying'} to ${airport?.city || flight.destinationCity || code}` : 'Waiting for Daddy’s next adventure');
    return { pickup, hasFlight: Boolean(flight), code: code || '—', city: airport?.city || flight?.destinationCity || '', message,
      telemetry: telemetry(flight, positionAt, positionFresh),
      phase: state.status || mode || 'Connecting',
      flightNumber: flight?.number ? (/^\d+$/.test(String(flight.number)) && flight.carrierCode ? `${flight.carrierCode} ${flight.number}` : flight.number) : '—', route: flight ? `${flight.origin} → ${flight.destination}` : 'ON THE GROUND',
      arrivalLabel: flight ? arrivalLabel : 'NEXT ARRIVAL',
      time: flight && arrival ? new Intl.DateTimeFormat('en-US', { timeZone: zone, hour:'numeric', minute:'2-digit' }).format(arrival) : '—',
      timeZone: flight && arrival ? new Intl.DateTimeFormat('en-US', { timeZone:zone, weekday:'short', month:'short', day:'numeric', timeZoneName:'short' }).format(arrival) : '',
      freshness: updated, stale: stale || Boolean(reported && now - reported > STALE_MS),
      position: !flight && state.locationAirport ? 'Location from schedule' : positionFresh ? `Position ${age(positionAt, now)}` : positionAt ? `Last position ${age(positionAt, now)}` : 'Position not yet confirmed',
      entries: (state.dailySchedule?.entries || []).filter((entry, index, entries) => entry.time !== 'ALL DAY' || entries.findIndex(other => other.time === entry.time && other.label === entry.label && other.tag === entry.tag) === index), dayZone: state.dailySchedule?.timeZoneLabel || '' };
  }
  function age(at, now) {
    const seconds = Math.max(0, Math.floor((now - at)/1000));
    return seconds < 60 ? `${seconds}s ago` : seconds < 3600 ? `${Math.floor(seconds/60)} min ago` : `${Math.floor(seconds/3600)} hr ago`;
  }
  return { viewModel, dutyWindow, validTime, sameLeg, STALE_MS };
});
