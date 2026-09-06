(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let state = {}, mode = 'OFFLINE', event = null, snapshot = null, calendarAt = null;
  let calendarFailed = false, liveFailed = false, currentKey = null;
  const key = e => e ? [e.id, e.origin, e.destination, e.flightNumber, e.carrierCode, e.times?.startUtc || e.startUtc].join('|') : null;
  const text = (id, value) => { $(id).textContent = value; };
  function render() {
    const model = dadRadarMobile.viewModel({state,mode,event,snapshot,calendarAt,
      failed:calendarFailed || liveFailed || !navigator.onLine, airports:dadRadarAirports,homeAirport:dadRadarSettings.homeAirport});
    document.body.classList.toggle('pickup',model.pickup);
    document.body.classList.toggle('on-ground',!model.hasFlight);
    $('arrival').hidden=!model.hasFlight;
    document.body.classList.toggle('stale',model.stale);
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
  if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/Mobile/sw.js',{scope:'/mobile'}).catch(()=>{});
  startCalendarStateController();render();
})();
