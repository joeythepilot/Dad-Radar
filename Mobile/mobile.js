(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let state = {}, mode = 'OFFLINE', event = null, snapshot = null, calendarAt = null;
  let calendarFailed = false, liveFailed = false, currentKey = null;
  const key = e => e ? [e.id, e.origin, e.destination, e.flightNumber, e.carrierCode, e.times?.startUtc || e.startUtc].join('|') : null;
  const text = (id, value) => { $(id).textContent = value; };
  let dutySignature = '';
  function renderDuty(model) {
    const list = $('duty-entries');
    const rowHeight = parseFloat(getComputedStyle(list).getPropertyValue('--duty-row-height')) || 23;
    const capacity = Math.max(1, Math.floor(list.clientHeight / rowHeight));
    const visibleDuty = dadRadarMobile.dutyWindow(model.entries, capacity);
    const signature = JSON.stringify([visibleDuty, model.dayZone, calendarAt]);
    if (signature === dutySignature) return;
    dutySignature = signature;
    text('duty-zone', model.dayZone === 'EASTERN TIME' ? 'ET' : model.dayZone);
    $('duty-zone').title = model.dayZone;
    text('duty-overflow', visibleDuty.summary);
    $('duty-overflow').style.visibility = visibleDuty.summary ? 'visible' : 'hidden';
    list.replaceChildren(...visibleDuty.entries.map(entry => {
      const row = document.createElement('li');
      row.className = `duty-entry ${entry.status || ''}`;
      if (entry.status === 'current') row.setAttribute('aria-current', 'step');
      row.title = [entry.time, entry.label, entry.tag, entry.status].filter(Boolean).join(' · ');
      row.setAttribute('aria-label', row.title);
      const time = document.createElement('span');time.className='duty-time';time.textContent=entry.time;
      const route = document.createElement('span');route.className='duty-route';route.textContent=(entry.label || '').replace(/\s*→\s*/g,'→');
      row.append(time,route);return row;
    }));
    if (!visibleDuty.entries.length) {
      const empty = document.createElement('li');empty.className='duty-empty';
      empty.textContent = calendarAt ? 'No flying scheduled today' : 'Awaiting schedule';list.appendChild(empty);
    }
  }
  function render() {
    const model = dadRadarMobile.viewModel({state,mode,event,snapshot,calendarAt,
      failed:calendarFailed || liveFailed || !navigator.onLine, airports:dadRadarAirports,homeAirport:dadRadarSettings.homeAirport});
    document.body.classList.toggle('pickup',model.pickup);
    document.body.classList.toggle('on-ground',!model.hasFlight);
    $('arrival').hidden=!model.hasFlight;
    document.body.classList.toggle('stale',model.stale);
    $('telemetry').hidden=!model.hasFlight;
    $('telemetry').classList.toggle('telemetry-stale',model.telemetry.stale);
    text('ground-speed',model.telemetry.speed);text('altitude',model.telemetry.altitude);
    text('telemetry-note',model.telemetry.note);$('telemetry-note').hidden=!model.telemetry.note;
    // One quiet position-age line during normal tracking; retain connection warnings.
    $('freshness').hidden=model.hasFlight && !model.stale;
    $('freshness').title=model.freshness;
    $('map-position').hidden=!model.hasFlight;
    for (const [id,value] of Object.entries({'story':model.message,'phase':model.phase,'flight-number':model.hasFlight ? model.flightNumber : '',
      'flight-origin':model.hasFlight ? state.flight.origin : '',
      'flight-destination':model.hasFlight ? state.flight.destination : (model.code==='—' ? '' : model.code),
      'arrival-label':model.arrivalLabel,'arrival-time':model.time,'arrival-zone':model.timeZone,
      'airport-city':model.city,'freshness':model.freshness,'map-position':model.position})) text(id,value);
    for (const id of ['flight-number','flight-origin','flight-destination','phase']) {
      const node=$(id), value=node.textContent;
      node.setAttribute('aria-label',value);
      node.replaceChildren(...Array.from(value || '   ',character=>{const tile=document.createElement('span');tile.className='flap-tile';tile.setAttribute('aria-hidden','true');tile.textContent=character;return tile;}));
    }
    renderDuty(model);
  }
  function resolved(detail) {
    if(!detail.resolved) return;
    const next=detail.resolved.event;
    if(key(next)!==currentKey) {snapshot=null;currentKey=key(next);liveFailed=false;}
    event=next;state=detail.resolved.state;mode=detail.resolved.mode;
  }
  window.addEventListener('dad-radar:state-change',e=> {
    state=e.detail.state;mode=e.detail.mode;render();
    window.dispatchEvent(new CustomEvent('dad-radar:visual-state-change',{detail:e.detail}));
  });
  window.addEventListener('dad-radar:calendar-sync',e=> {
    calendarFailed=!e.detail.ok;
    if(e.detail.ok) {calendarAt=e.detail.retrievedAt;resolved(e.detail);}
    render();
  });
  window.addEventListener('dad-radar:live-flight-sync',e=> {
    liveFailed=!e.detail.ok;resolved(e.detail);
    if(e.detail.ok && e.detail.liveFlight) snapshot=e.detail.liveFlight;
    render();
  });
  let refreshing=false;
  async function refresh() {
    if(refreshing) return;
    refreshing=true;$('refresh').disabled=true;$('refresh').textContent='Updating…';
    try {await refreshCalendarState();} finally {refreshing=false;$('refresh').disabled=false;$('refresh').textContent='Refresh';render();}
  }
  $('refresh').addEventListener('click',refresh);
  window.addEventListener('offline',render);
  window.addEventListener('online',refresh);
  document.addEventListener('visibilitychange',()=> {
    if(document.hidden) stopCalendarStateController();
    else {startCalendarStateController();render();}
  });
  window.setInterval(()=>{if(!document.hidden) render();},15000);
  // Recompute how many duty rows fit when Safari's chrome or orientation changes.
  if ('ResizeObserver' in window) new ResizeObserver(render).observe($('duty-entries'));
  else window.addEventListener('resize',render);
  if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/Mobile/sw.js',{scope:'/mobile'}).catch(()=>{});
  startCalendarStateController();render();
})();
