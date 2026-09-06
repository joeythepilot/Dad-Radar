(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let state = {}, mode = 'OFFLINE', event = null, snapshot = null, calendarAt = null;
  let calendarFailed = false, liveFailed = false, currentKey = null, posterSource = null;
  const key = e => e ? [e.id, e.origin, e.destination, e.flightNumber, e.carrierCode, e.times?.startUtc || e.startUtc].join('|') : null;
  const text = (id, value) => { $(id).textContent = value; };
  function render() {
    const model = dadRadarMobile.viewModel({state,mode,event,snapshot,calendarAt,
      failed:calendarFailed || liveFailed || !navigator.onLine, airports:dadRadarAirports,homeAirport:dadRadarSettings.homeAirport});
    document.body.classList.toggle('pickup',model.pickup);
    document.body.classList.toggle('stale',model.stale);
    text('journey',model.pickup ? 'ON THE WAY HOME' : 'TODAY’S ADVENTURE');
    for (const [id,value] of Object.entries({'story':model.message,'phase':model.phase,'flight-number':model.flightNumber,
      'route':model.route,'arrival-label':model.arrivalLabel,'arrival-time':model.time,'arrival-zone':model.timeZone,
      'airport-code':model.code,'airport-city':model.city,'freshness':model.freshness,'map-position':model.position,'day-zone':model.dayZone})) text(id,value);
    const rows=model.entries.map(entry=> {
      const li=document.createElement('li');li.className=entry.status;
      const time=document.createElement('strong');time.textContent=entry.time;
      const label=document.createElement('span');label.textContent=entry.label;
      const tag=document.createElement('small');tag.textContent=entry.tag;label.append(tag);li.append(time,label);return li;
    });
    if (!rows.length) { const li=document.createElement('li');li.textContent=calendarAt?'No flying on today’s schedule.':'Waiting for the schedule…';rows.push(li); }
    $('itinerary').replaceChildren(...rows);
    const poster=dadRadarPosters.getPoster(model.code);
    const source=poster?.source || null;
    text('poster-city',model.city || 'The next adventure awaits');
    if (source !== posterSource) {
      posterSource=source;$('poster').hidden=true;$('poster-empty').hidden=false;
      if(source) { $('poster').alt=`${poster.location || model.city} destination poster`;$('poster').src=new URL(source,document.baseURI).href; }
      else $('poster').removeAttribute('src');
    }
  }
  $('poster').addEventListener('load',()=>{$('poster').hidden=false;$('poster-empty').hidden=true;});
  $('poster').addEventListener('error',()=>{$('poster').hidden=true;$('poster-empty').hidden=false;});
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
    // Retry an unavailable poster on an explicit or foreground refresh.
    if($('poster').hidden) posterSource=null;
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
  if(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('install-tip').hidden=true;
  if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/Mobile/sw.js',{scope:'/mobile'}).catch(()=>{});
  startCalendarStateController();render();
})();
