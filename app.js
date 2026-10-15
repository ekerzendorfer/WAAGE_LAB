'use strict';

const $ = (id) => document.getElementById(id);
const state = {
  port: null,
  reader: null,
  reading: false,
  serialBuffer: '',
  liveBuffer: [],
  run: [],
  running: false,
  runStartMs: null,
  source: null,
  prediction: null,
  m0: null,
  tabletMass: 6.13,
  baseline: null,
  sampleStartEpoch: null,
  waitingForSample: false,
  eventEpoch: null,
  eventMode: null,
  analysisFrom: 5,
  runMeta: null
};

const fmt = (v, d=2) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '–';
const median = (arr) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a,b)=>a-b); const i=Math.floor(s.length/2);
  return s.length%2 ? s[i] : (s[i-1]+s[i])/2;
};

function switchView(id){
  document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==id);
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
  requestAnimationFrame(drawAll);
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));

function asNumber(id){
  const raw=$(id).value.trim();
  return raw==='' ? NaN : Number(raw.replace(',','.'));
}
function readConditions(){
  return {
    preset:$('preset').value, tabletMass:asNumber('tabletMass'), waterMass:asNumber('waterMass'),
    beakerMass:asNumber('beakerMass'), temperature:asNumber('temperature'),
    tabletForm:$('tabletForm').value, note:$('note').value.trim(),
    m0:state.m0, analysisFrom:state.analysisFrom,
    eventMode:state.eventMode
  };
}
function updateConditionsSummary(){
  const c=readConditions(), val=(n,suffix='g')=>Number.isFinite(n)?fmt(n,2)+' '+suffix:'nicht angegeben';
  $('conditionsSummary').textContent='Versuchsbedingungen: '+c.tabletForm+' · Tablette '+val(c.tabletMass)+
    ' · Wasser '+val(c.waterMass)+' · Starttemperatur '+val(c.temperature,'°C')+
    ' · Becher leer '+val(c.beakerMass)+' · Beginn der Kennwertauswertung '+fmt(state.analysisFrom,1)+' s.';
}
function updateM0(){
  state.tabletMass=asNumber('tabletMass');
  state.baseline=asNumber('baselineMass');
  const dry=asNumber('beakerMass');
  const derived=Number.isFinite(state.baseline)&&Number.isFinite(dry)&&state.baseline>dry ? state.baseline-dry : NaN;
  const auto=Number.isFinite(derived);
  $('waterMass').readOnly=auto;
  if(auto) $('waterMass').value=derived.toFixed(2);
  $('waterMassHint').textContent=auto?'Gravimetrisch berechnet: Basis − trockener Becher.':'Ohne beide Wägungen ist eine manuelle Wassermasseneingabe möglich.';
  state.m0=Number.isFinite(state.baseline)&&state.baseline>0&&state.tabletMass>0?state.baseline+state.tabletMass:null;
  $('m0Value').textContent=state.m0!==null ? fmt(state.m0)+' g':'–';
  updateConditionsSummary();
}
['tabletMass','baselineMass','beakerMass'].forEach(id=>$(id).addEventListener('input',updateM0));
['waterMass','temperature','tabletForm','preset','note'].forEach(id=>$(id).addEventListener('input',updateConditionsSummary));
$('analysisFrom').addEventListener('input',()=>{
  const n=asNumber('analysisFrom');state.analysisFrom=Number.isFinite(n)?Math.min(30,Math.max(0,n)):5;
  if(state.run.length)analyze();updateConditionsSummary();drawAll();
});

function savePrediction(){
  const final = Number($('predFinal').value), t90 = Number($('predT90').value);
  if (!(final>0) || !(t90>0)) { $('predictionStatus').textContent='Bitte Massenverlust und t₉₀ eingeben.'; return; }
  const k = -Math.log(0.1)/t90;
  state.prediction = {final,t90,k,reason:$('predictionReason').value.trim()};
  $('predictionStatus').textContent=`Gespeichert: Δm∞ ≈ ${fmt(final)} g, t₉₀ ≈ ${fmt(t90,0)} s.`;
  drawAll();
}
$('savePrediction').addEventListener('click',savePrediction);
$('clearPrediction').addEventListener('click',()=>{state.prediction=null;$('predictionStatus').textContent='Noch keine Prognose gespeichert.';$('predFinal').value='';$('predT90').value='';$('predictionReason').value='';drawAll();});

function predictionPoints(maxT=120){
  if(!state.prediction) return [];
  const a=[]; for(let t=0;t<=maxT;t+=1) a.push({t,dm:state.prediction.final*(1-Math.exp(-state.prediction.k*t))}); return a;
}

function parseMass(text){
  const m=text.match(/([+-])\s*(\d+(?:[.,]\d+)?)\s*g/i);
  if(!m) return null;
  return (m[1]==='-'?-1:1)*Number(m[2].replace(',','.'));
}

function acceptMass(mass, epochMs=Date.now()){
  if(!Number.isFinite(mass))return;
  $('liveMass').textContent=fmt(mass)+' g';
  state.liveBuffer.push({epochMs,mass});
  if(state.liveBuffer.length>800)state.liveBuffer.splice(0,state.liveBuffer.length-800);
  // Der Vorlauf wird fortlaufend gepuffert. Kein Rohwert wird für den Einwurf erkannt oder gelöscht.
  if(state.running && state.eventEpoch!==null){
    state.run.push({t:(epochMs-state.eventEpoch)/1000,mass,dm:state.m0-mass,epochMs});
    if(state.run.length%4===0)updateRunUI();
  }
}

async function connectSerial(){
  if(!('serial' in navigator)){ $('serialSupport').textContent='Web Serial wird in diesem Browser nicht unterstützt. Bitte Chrome/Edge oder Log-Import verwenden.'; return; }
  try{
    state.port=await navigator.serial.requestPort();
    await state.port.open({baudRate:9600,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});
    $('connectSerial').disabled=true; $('disconnectSerial').disabled=false;
    $('serialMeta').textContent='9600 · 8N1 · verbunden'; $('serialSupport').textContent='Serielle Daten werden live eingelesen.';
    state.reading=true; state.source='serial'; readSerialLoop();
  }catch(err){ $('serialSupport').textContent=`Verbindung nicht hergestellt: ${err.message}`; }
}

async function readSerialLoop(){
  const decoder=new TextDecoder();
  try{
    while(state.port?.readable && state.reading){
      state.reader=state.port.readable.getReader();
      try{
        while(state.reading){
          const {value,done}=await state.reader.read(); if(done) break;
          state.serialBuffer+=decoder.decode(value,{stream:true});
          const lines=state.serialBuffer.split(/\r?\n/); state.serialBuffer=lines.pop()||'';
          for(const line of lines){ const m=parseMass(line); if(m!==null) acceptMass(m); }
        }
      } finally { state.reader.releaseLock(); state.reader=null; }
    }
  }catch(err){ $('serialSupport').textContent=`Lesefehler: ${err.message}`; }
}

async function disconnectSerial(){
  state.reading=false;
  try{ if(state.reader) await state.reader.cancel(); }catch{}
  try{ if(state.port) await state.port.close(); }catch{}
  state.port=null; $('connectSerial').disabled=false; $('disconnectSerial').disabled=true; $('serialMeta').textContent='nicht verbunden';
}
$('connectSerial').addEventListener('click',connectSerial); $('disconnectSerial').addEventListener('click',disconnectSerial);

$('captureBaseline').addEventListener('click',()=>{
  const cutoff=Date.now()-3000;
  const vals=state.liveBuffer.filter(x=>x.epochMs>=cutoff).map(x=>x.mass);
  if(vals.length<3){$('runStatus').textContent='Noch zu wenige Live-Werte für eine 3-s-Basislinie.';return;}
  $('baselineMass').value=median(vals).toFixed(2); updateM0(); $('runStatus').textContent=`Basis aus ${vals.length} Messwerten bestimmt.`;
});

function startRun(){
  updateM0();
  if(!state.m0){$('runStatus').textContent='Zuerst Basis-Masse und Tablettenmasse festlegen.';return;}
  const newest=state.liveBuffer.at(-1);
  if(!state.reading||!newest||Date.now()-newest.epochMs>2500){
    $('runStatus').textContent='Für einen neuen Lauf zuerst die serielle Waage verbinden und stabile Livewerte abwarten.';return;
  }
  state.run=[];state.running=true;state.source='serial';state.eventEpoch=null;state.eventMode=null;
  state.runMeta=null;state.waitingForSample=true;state.runStartMs=null;
  $('startRun').disabled=true;$('markThrow').disabled=false;$('stopRun').disabled=false;
  $('exportCsv').disabled=true;$('makeAiPackage').disabled=true;
  $('runStatus').textContent='Vorlauf wird gepuffert. Beim Einwurf „Einwurf markieren“ drücken; der Marker definiert t = 0.';
  updateRunUI();
}
function markThrow(){
  if(!state.running||state.eventEpoch!==null)return;
  const epoch=Date.now();state.eventEpoch=epoch;state.runStartMs=epoch;
  state.eventMode='manueller Marker';state.waitingForSample=false;
  // Rohwerte der fünf Sekunden VOR dem Einwurf als t<0 erhalten.
  const pre=state.liveBuffer.filter(x=>x.epochMs>=epoch-5000 && x.epochMs<=epoch);
  state.run=pre.map(x=>({t:(x.epochMs-epoch)/1000,mass:x.mass,dm:state.m0-x.mass,epochMs:x.epochMs}));
  state.runMeta=readConditions();state.runMeta.eventMode=state.eventMode;
  $('markThrow').disabled=true;
  $('runStatus').textContent='Einwurfmarker gesetzt. Ungeglättete Rohdaten einschließlich Vorlauf bleiben gespeichert.';
  updateRunUI();
}
function stopRun(){
  if(!state.running)return;
  state.running=false;state.waitingForSample=false;
  $('startRun').disabled=false;$('markThrow').disabled=true;$('stopRun').disabled=true;
  const good=state.eventEpoch!==null && state.run.filter(r=>r.t>=0).length>=5;
  $('runStatus').textContent=good?'Messlauf beendet; Auswertung verfügbar.':'Messlauf ohne genügend Daten nach dem Einwurf; kein CSV-Export.';
  $('exportCsv').disabled=!good;$('makeAiPackage').disabled=!good;
  analyze();updateRunUI();
}
function resetRun(){
  state.running=false;state.waitingForSample=false;state.run=[];state.runStartMs=null;
  state.source=null;state.eventEpoch=null;state.eventMode=null;state.runMeta=null;
  $('startRun').disabled=false;$('markThrow').disabled=true;$('stopRun').disabled=true;
  $('exportCsv').disabled=true;$('makeAiPackage').disabled=true;
  $('runStatus').textContent='Bereit.';$('sourceBadge').textContent='keine Daten';
  $('rawTable').innerHTML='';$('aiPackage').value='';$('copyAiPackage').disabled=true;$('openChatGPT').disabled=true;
  updateRunUI();analyze();
}
$('startRun').addEventListener('click',startRun);
$('markThrow').addEventListener('click',markThrow);
$('stopRun').addEventListener('click',stopRun);
$('resetRun').addEventListener('click',resetRun);

function estimateHz(){
  if(state.run.length<3) return NaN;
  const times=state.run.slice(-150).map(x=>x.epochMs).filter(Number.isFinite); if(times.length<3)return NaN;
  const dt=(times.at(-1)-times[0])/1000; return dt>0?(times.length-1)/dt:NaN;
}
function currentDm(){return state.run.length?state.run.at(-1).dm:NaN;}

function updateRunUI(){
  const last=state.run.at(-1); $('metricTime').textContent=last?`${fmt(last.t,1)} s`:'–'; $('metricDm').textContent=last&&Number.isFinite(last.dm)?`${fmt(last.dm)} g`:'–';
  $('metricPoints').textContent=state.run.length; const hz=estimateHz(); $('metricHz').textContent=Number.isFinite(hz)?`${fmt(hz,1)} Hz`:'–';
  $('sourceBadge').textContent=state.run.length?(state.source==='demo'?'Realversuch 03 · Demo':state.source==='log'?'importierter Log':'Live · seriell'):'keine Daten';
  updateRawTable(); drawAll();
}
function updateRawTable(){
  const rows=state.run; if(!rows.length){$('rawTable').innerHTML='';return;}
  const step=Math.max(1,Math.ceil(rows.length/120));
  $('rawTable').innerHTML=rows.filter((_,i)=>i%step===0 || i===rows.length-1).map(r=>`<tr><td>${fmt(r.t,2)}</td><td>${fmt(r.mass,2)}</td><td>${fmt(r.dm,3)}</td></tr>`).join('');
}

function metricsForRun(points, from=0){
  const eligible=points.filter(r=>Number.isFinite(r.t)&&r.t>=Math.max(0,from)&&Number.isFinite(r.dm))
                       .sort((a,b)=>a.t-b.t);
  if(eligible.length<5)return {final:NaN,t50:NaN,t90:NaN,t95:NaN,plateau:false};
  const end=eligible.at(-1).t;
  const tail=eligible.filter(r=>r.t>=end-5).map(r=>r.dm);
  const final=tail.length>=3?median(tail):NaN;
  if(!(final>0))return {final:NaN,t50:NaN,t90:NaN,t95:NaN,plateau:false};
  // Lineare Schwelleninterpolation. Die Einschwingphase wird NICHT gelöscht,
  // sondern nur von der Kennwertberechnung ausgenommen.
  const cross=fraction=>{
    const threshold=final*fraction;
    for(let i=0;i<eligible.length;i++){
      const p=eligible[i],prev=eligible[i-1];
      if(p.dm>=threshold){
        if(!prev || prev.dm>=threshold)return p.t;
        const span=p.dm-prev.dm;
        return span>0?prev.t+(p.t-prev.t)*(threshold-prev.dm)/span:p.t;
      }
    }
    return NaN;
  };
  const first=tail.slice(0,Math.ceil(tail.length/2)),last=tail.slice(Math.ceil(tail.length/2));
  const plateau=first.length>0&&last.length>0&&Math.abs(median(first)-median(last))<=0.02;
  return {final,t50:cross(.5),t90:cross(.9),t95:cross(.95),plateau};
}
function analyze(){
  const a=metricsForRun(state.run,state.analysisFrom);
  $('aFinal').textContent=Number.isFinite(a.final)?fmt(a.final)+' g'+(!a.plateau?'*':''):'–';
  $('aT50').textContent=Number.isFinite(a.t50)?fmt(a.t50,1)+' s':'–';
  $('aT90').textContent=Number.isFinite(a.t90)?fmt(a.t90,1)+' s':'–';
  $('aT95').textContent=Number.isFinite(a.t95)?fmt(a.t95,1)+' s':'–';
  return a;
}

async function loadDemo(){
  try{
    const txt=await fetch('data/brause_run03.csv').then(r=>{if(!r.ok)throw new Error('Demo-Datei nicht gefunden');return r.text();});
    $('baselineMass').value='195.42';$('tabletMass').value='6.13';updateM0();
    state.run=txt.trim().split(/\r?\n/).slice(1).map(line=>{const [t,m,dm]=line.split(';').map(Number);return{t,mass:m,dm,epochMs:null};});
    state.source='demo';state.eventMode='Demodaten – Einwurfmarker unbekannt';state.eventEpoch=null;state.running=false;state.runMeta=readConditions();$('runStatus').textContent='Realer Probelauf 03 geladen (14.10.2026).';$('exportCsv').disabled=false;$('makeAiPackage').disabled=false;updateRunUI();analyze();switchView('measure');
  }catch(err){$('runStatus').textContent=err.message;}
}
$('loadDemo').addEventListener('click',loadDemo);

$('logFile').addEventListener('change',async(e)=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const text=await file.text(),parsed=[];
    const re=/\\[(.*?)\\]\\s*([+-])\\s*(\\d+(?:[.,]\\d+)?)\\s*g/i;
    for(const line of text.split(/\\r?\\n/)){
      const m=line.match(re);if(!m)continue;
      const epoch=Date.parse(m[1]),mass=(m[2]==='-'?-1:1)*Number(m[3].replace(',','.'));
      if(Number.isFinite(epoch)&&Number.isFinite(mass))parsed.push({epochMs:epoch,mass});
    }
    if(parsed.length<5){$('runStatus').textContent='Keine verwertbaren Tera-Term-Zeilen gefunden.';return;}
    updateM0();if(!state.m0){$('runStatus').textContent='Vor dem Import Basis-Masse und Tablettenmasse erfassen.';return;}
    const offset=asNumber('logEventOffset');
    let eventTime,mode;
    if(Number.isFinite(offset)&&offset>=0){
      eventTime=parsed[0].epochMs+offset*1000;mode='manuell gesetzter Log-Marker';
    }else{
      const tol=Math.max(.25,state.tabletMass*.06);
      const found=parsed.find(x=>Math.abs(x.mass-state.m0)<=tol);
      if(!found){$('runStatus').textContent='Einwurf nicht gefunden. Bitte Einwurfzeit ab Logbeginn im entsprechenden Feld angeben.';return;}
      eventTime=found.epochMs;mode='geschätzter Marker (Masseschwelle)';
    }
    const window=parsed.filter(x=>x.epochMs>=eventTime-5000);
    state.run=window.map(x=>({t:(x.epochMs-eventTime)/1000,mass:x.mass,dm:state.m0-x.mass,epochMs:x.epochMs}));
    state.source='log';state.running=false;state.eventEpoch=eventTime;state.eventMode=mode;
    state.runMeta=readConditions();$('startRun').disabled=false;$('markThrow').disabled=true;$('stopRun').disabled=true;
    $('runStatus').textContent=window.length+' Log-Werte importiert; '+mode+'. Vorlauf bis 5 s erhalten. Einwurfzeit bitte kritisch prüfen.';
    $('exportCsv').disabled=window.length<5;$('makeAiPackage').disabled=window.length<5;
    updateRunUI();analyze();
  }catch(err){$('runStatus').textContent='Log-Import fehlgeschlagen: '+err.message;}
  e.target.value='';
});

function exportCsv(){
  if(state.run.length<5)return;
  const m=state.runMeta||readConditions();
  const safe=v=>v===undefined||v===null||!Number.isFinite(v)?'':v;
  const str=v=>String(v??'').replace(/[\\r\\n;]+/g,' ').trim();
  const meta=[
    '# WAAGE_LAB v0.2.0',
    '# m0_g='+safe(m.m0),
    '# tablet_g='+safe(m.tabletMass),
    '# water_g='+safe(m.waterMass),
    '# beaker_mass_g='+safe(m.beakerMass),
    '# temperature_C='+safe(m.temperature),
    '# tablet_form='+str(m.tabletForm),
    '# preset='+str(m.preset),
    '# note='+str(m.note),
    '# event_mode='+str(state.eventMode||m.eventMode),
    '# analysis_from_s='+safe(m.analysisFrom),
    '# prebuffer_s=5'
  ].join('\\n')+'\\n';
  const body='t_s;m_g;dm_g\\n'+state.run.map(r=>r.t.toFixed(3)+';'+r.mass.toFixed(2)+';'+(Number.isFinite(r.dm)?r.dm.toFixed(3):'')).join('\\n');
  const blob=new Blob([meta+body],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='waage_lab_'+new Date().toISOString().slice(0,19).replaceAll(':','-')+'.csv';
  a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}

$('exportCsv').addEventListener('click',exportCsv);

function makeAiPackage(){
  const a=analyze(); if(!Number.isFinite(a.final))return;
  const pred=state.prediction?`\nEIGENE PROGNOSE VOR DEM VERSUCH\n- erwartetes Δm∞: ${state.prediction.final.toFixed(2)} g\n- erwartetes t90: ${state.prediction.t90.toFixed(0)} s\n- Begründung: ${state.prediction.reason||'(keine)'}`:'\nEIGENE PROGNOSE VOR DEM VERSUCH\n- keine gespeichert';
  const prompt=`WAAGE_LAB – DATENBASIERTES KI-ANALYSEPAKET\n\nVERSUCH\n- Preset: ${$('preset').selectedOptions[0].textContent}\n- Tablettenmasse: ${$('tabletMass').value||'nicht angegeben'} g\n- Wassermasse: ${$('waterMass').value||'nicht angegeben'} g\n- Starttemperatur: ${$('temperature').value||'nicht angegeben'} °C\n- Tablettenform: ${$('tabletForm').value}\n- Notiz: ${$('note').value||'(keine)'}\n- m0: ${state.m0?.toFixed(2)||'nicht angegeben'} g${pred}\n\nKLASSISCHE AUSWERTUNG DER APP\n- Δm∞ (Median der letzten 5 s): ${a.final.toFixed(3)} g\n- t50: ${Number.isFinite(a.t50)?a.t50.toFixed(1):'n.v.'} s\n- t90: ${Number.isFinite(a.t90)?a.t90.toFixed(1):'n.v.'} s\n- t95: ${Number.isFinite(a.t95)?a.t95.toFixed(1):'n.v.'} s\n- Anzahl Rohmesswerte: ${state.run.length}\n- Einwurfmarker: ${state.eventMode||'nicht dokumentiert'}\n- Kennwerte ausgewertet ab: ${state.analysisFrom.toFixed(1)} s; Frühphase bleibt in den Rohdaten.\n- Endphase ausreichend stabil (Medianvergleich): ${a.plateau?'ja, nach einfacher 0,02-g-Regel':'nicht eindeutig – vorläufiges Δm∞'}\n\nDEIN AUFTRAG ALS WISSENSCHAFTLICHER COACH\n1. Verwende ausschließlich die oben angegebenen Messdaten und Versuchsbedingungen; erfinde keine fehlenden Werte.\n2. Trenne ausdrücklich: Beobachtung – Messwert – Interpretation.\n3. Prüfe, welche Aussage die Massenmessung tatsächlich erlaubt. Sie misst Masse, die das offene System verlässt; sie misst nicht direkt die chemische CO₂-Bildungsrate.\n4. Vergleiche Prognose und Messung, falls eine Prognose vorhanden ist.\n5. Suche mindestens zwei mögliche Störgrößen oder alternative Erklärungen.\n6. Verwechsle eine schnellere Freisetzung nicht mit einer größeren Gesamtmenge.\n7. Stelle zuerst zwei kurze Rückfragen, die zum eigenen Nachdenken zwingen. Gib danach eine knappe, fachlich saubere Interpretation.\n8. Schließe mit einer Transferfrage, die ohne KI beantwortet werden soll.`;
  $('aiPackage').value=prompt;$('copyAiPackage').disabled=false;$('openChatGPT').disabled=false;
}
$('makeAiPackage').addEventListener('click',makeAiPackage);
$('copyAiPackage').addEventListener('click',async()=>{await navigator.clipboard.writeText($('aiPackage').value);$('copyAiPackage').textContent='Kopiert';setTimeout(()=>$('copyAiPackage').textContent='Analysepaket kopieren',1200);});
$('openChatGPT').addEventListener('click',()=>window.open('https://chatgpt.com/','_blank','noopener'));

function chart(canvas, actual=[], prediction=[], opts={}){
  const rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1; const w=Math.max(320,rect.width), h=Math.max(260,rect.height);canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const pad={l:58,r:18,t:24,b:48};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  const maxT=Math.max(90,...actual.map(p=>p.t||0),...prediction.map(p=>p.t||0)); const yMax=Math.max(.2, ...actual.map(p=>Number.isFinite(p.dm)?p.dm:0), ...prediction.map(p=>p.dm||0))*1.15;
  c.strokeStyle='#cbd6e2';c.lineWidth=1;c.fillStyle='#5e6b79';c.font='12px system-ui';
  for(let i=0;i<=5;i++){const y=pad.t+ph*i/5;c.beginPath();c.moveTo(pad.l,y);c.lineTo(w-pad.r,y);c.stroke();const val=yMax*(1-i/5);c.fillText(val.toFixed(2).replace('.',','),8,y+4);}
  for(let i=0;i<=6;i++){const x=pad.l+pw*i/6;c.beginPath();c.moveTo(x,pad.t);c.lineTo(x,h-pad.b);c.stroke();const val=maxT*i/6;c.fillText(val.toFixed(0),x-8,h-20);}
  c.fillStyle='#172033';c.font='13px system-ui';c.fillText('t / s',w/2-10,h-5);c.save();c.translate(14,h/2+25);c.rotate(-Math.PI/2);c.fillText('Δm / g',0,0);c.restore();
  const X=t=>pad.l+(t/maxT)*pw, Y=v=>pad.t+ph-(v/yMax)*ph;
  if(Number.isFinite(opts.shadeUntil)&&opts.shadeUntil>0){
    c.fillStyle='rgba(230,165,73,.15)';c.fillRect(pad.l,pad.t,X(Math.min(maxT,opts.shadeUntil))-pad.l,ph);
    c.fillStyle='#876028';c.font='11px system-ui';c.fillText('Einwurf / Einschwingen',pad.l+5,pad.t+ph-8);
    c.strokeStyle='#ad7622';c.setLineDash([4,4]);c.beginPath();c.moveTo(X(Math.min(maxT,opts.shadeUntil)),pad.t);c.lineTo(X(Math.min(maxT,opts.shadeUntil)),pad.t+ph);c.stroke();c.setLineDash([]);
  }
  if(prediction.length){c.setLineDash([8,6]);c.strokeStyle='#6d3d7f';c.lineWidth=2;c.beginPath();prediction.forEach((p,i)=>i?c.lineTo(X(p.t),Y(p.dm)):c.moveTo(X(p.t),Y(p.dm)));c.stroke();c.setLineDash([]);c.fillStyle='#6d3d7f';c.fillText('Prognose',pad.l+8,pad.t+16);}
  const clean=actual.filter(p=>Number.isFinite(p.t)&&p.t>=0&&Number.isFinite(p.dm)&&p.dm>=-0.05&&p.dm<=yMax*1.3);
  if(clean.length){c.strokeStyle='#345a7d';c.lineWidth=2.5;c.beginPath();clean.forEach((p,i)=>i?c.lineTo(X(p.t),Y(p.dm)):c.moveTo(X(p.t),Y(p.dm)));c.stroke();c.fillStyle='#345a7d';c.fillText('Real',pad.l+82,pad.t+16);}
  if(!clean.length&&!prediction.length){c.fillStyle='#5e6b79';c.font='14px system-ui';c.fillText(opts.empty||'Noch keine Daten.',pad.l+20,pad.t+50);}
}
function drawAll(){
  chart($('predictionCanvas'),[],predictionPoints(120),{empty:'Prognose eingeben.'});
  chart($('liveCanvas'),state.run,predictionPoints(Math.max(120,state.run.at(-1)?.t||0)),{shadeUntil:state.analysisFrom});
  if(typeof drawTransient==='function')drawTransient();
  if(typeof renderComparison==='function'&&!$('compare').hidden)renderComparison();
}
window.addEventListener('resize',()=>requestAnimationFrame(drawAll));

if('serial' in navigator){$('serialSupport').textContent='Web Serial verfügbar. Chrome/Edge: Verbindung erfolgt erst nach deiner Freigabe.';}else{$('serialSupport').textContent='Web Serial nicht verfügbar. Demo oder Log-Import funktionieren trotzdem.';}
updateM0();analyze();drawAll();
