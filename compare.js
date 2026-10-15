'use strict';

// WAAGE_LAB v0.2: rein lokale CSV-Vergleiche; alle Kennwerte deterministisch.
const comparisonRuns=[];
const comparisonColors=['#245d83','#bf6334','#38906f','#80549e','#b18c19','#b44368','#417e95','#616b77'];
const formOptions=['ganz','halbiert','geviertelt','grob zerkleinert','fein zerkleinert','zerkleinert'];
const comparisonFields={
  temperature:{label:'Starttemperatur',tol:0.5,unit:'°C'},
  waterMass:{label:'Wassermasse',tol:2,unit:'g'},
  tabletMass:{label:'Tablettenmasse',tol:0.10,unit:'g'},
  tabletForm:{label:'Tablettenform',tol:0,unit:''}
};
const num=v=>{
  if(v===undefined||v===null||String(v).trim()==='')return NaN;
  const n=Number(String(v).trim().replace(',','.'));return Number.isFinite(n)?n:NaN;
};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[ch]);
const displayNum=(v,d=2)=>Number.isFinite(v)?fmt(v,d):'–';
const valueFor=(meta,key)=>meta[key];

function importCsvRun(text,name){
  const meta={};
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  const dataLines=[];
  for(const l of lines){
    const trimmed=l.trim();
    if(!trimmed)continue;
    if(trimmed.startsWith('#')){
      const hit=trimmed.slice(1).trim().match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
      if(hit)meta[hit[1]]=hit[2].trim();
    }else dataLines.push(trimmed);
  }
  if(dataLines.length<6)throw Error('CSV enthält zu wenige Messwerte.');
  const sep=dataLines[0].includes(';')?';':',';
  const header=dataLines[0].split(sep).map(x=>x.trim().toLowerCase());
  const ti=header.indexOf('t_s'),mi=header.indexOf('m_g'),di=header.indexOf('dm_g');
  if(ti<0||(mi<0&&di<0))throw Error('Erwartet werden t_s und m_g bzw. dm_g.');
  const m0=num(meta.m0_g),points=[];
  for(const l of dataLines.slice(1)){
    const cols=l.split(sep),t=num(cols[ti]),mass=mi>=0?num(cols[mi]):NaN;
    const dm=di>=0?num(cols[di]):Number.isFinite(m0)&&Number.isFinite(mass)?m0-mass:NaN;
    if(Number.isFinite(t)&&Number.isFinite(dm))points.push({t,mass,dm});
  }
  points.sort((a,b)=>a.t-b.t);
  if(points.length<5)throw Error('Weniger als fünf numerische Messwerte.');
  if(points.at(-1).t-points[0].t<1)throw Error('Zeitachse zu kurz oder ungültig.');
  return buildComparisonRun(name,points,{
    temperature:num(meta.temperature_C),waterMass:num(meta.water_g),tabletMass:num(meta.tablet_g),
    beakerMass:num(meta.beaker_mass_g),tabletForm:meta.tablet_form||'',
    note:meta.note||'',eventMode:meta.event_mode||'nicht dokumentiert',
    analysisFrom:Number.isFinite(num(meta.analysis_from_s))?num(meta.analysis_from_s):0,
    sourceVersion:lines.some(l=>l.includes('v0.2.0'))?'0.2':'0.1/ohne Version',
    corrected:false
  });
}
function buildComparisonRun(name,points,meta){
  const a=metricsForRun(points,meta.analysisFrom);
  return {name,points,meta,metrics:a,id:Date.now()+Math.random()};
}
function currentRunForComparison(){
  const c=state.runMeta||readConditions();
  const from=Number.isFinite(c.analysisFrom)?c.analysisFrom:state.analysisFrom;
  return buildComparisonRun('Aktueller Messlauf',state.run.map(p=>({t:p.t,dm:p.dm,mass:p.mass})),{
    temperature:c.temperature,waterMass:c.waterMass,tabletMass:c.tabletMass,
    beakerMass:c.beakerMass,tabletForm:c.tabletForm,note:c.note,
    eventMode:state.eventMode||'nicht dokumentiert',analysisFrom:from,
    sourceVersion:'0.2',corrected:false
  });
}
function compareChanged(){
  const result={changed:[],unchanged:[],unknown:[]};
  for(const [key,def] of Object.entries(comparisonFields)){
    const vals=comparisonRuns.map(r=>valueFor(r.meta,key));
    if(vals.some(v=>key==='tabletForm'?!v:!Number.isFinite(v))){
      result.unknown.push(key);continue;
    }
    const changed=key==='tabletForm'?new Set(vals).size>1:
      Math.max(...vals)-Math.min(...vals)>def.tol;
    result[changed?'changed':'unchanged'].push(key);
  }
  return result;
}
function variableStatus(){
  if(comparisonRuns.length<2)return 'Mindestens zwei echte Messläufe laden. Ein Vergleich einzelner Messungen erlaubt keine reproduzierbare Aussage.';
  const result=compareChanged(),chosen=$('targetVariable').value;
  const target=chosen==='auto'?(result.changed.length===1?result.changed[0]:null):chosen;
  const show=arr=>arr.map(k=>comparisonFields[k].label).join(', ');
  const parts=[];
  if(chosen==='auto'){
    parts.push(target?'Vermutete Untersuchungsvariable: '+comparisonFields[target].label+'.':
      result.changed.length===0?'Keine deutlich variierte Variable erkannt.':
      'Mehrere Variablen verändert: keine eindeutige Untersuchungsvariable. Bitte explizit auswählen.');
  }else parts.push('Vorgegebene Untersuchungsvariable: '+comparisonFields[chosen].label+'.');
  if(result.changed.length)parts.push('Oberhalb der Prüftoleranz verändert: '+show(result.changed)+'.');
  if(result.unchanged.length)parts.push('Innerhalb der Prüftoleranz konstant: '+show(result.unchanged)+'.');
  if(result.unknown.length)parts.push('Mangels Metadaten nicht prüfbar: '+show(result.unknown)+'.');
  if(target){
    const confound=result.changed.filter(k=>k!==target);
    if(!result.changed.includes(target))parts.push('WARNUNG: Zielvariable unterscheidet sich im Datensatz nicht ausreichend.');
    if(confound.length)parts.push('WARNUNG: Weitere veränderte Einflussgrößen: '+show(confound)+'. Kein isolierter Effekt belegbar.');
    else if(result.unknown.length)parts.push('WARNUNG: Nicht dokumentierte Größen können die Vergleichbarkeit beeinträchtigen.');
    else parts.push('Die dokumentierten Kontrollgrößen stimmen innerhalb der Prüftoleranzen überein.');
  }
  if(comparisonRuns.some(r=>!r.metrics.plateau))parts.push('Mindestens ein Endwert ist mangels stabiler Endphase vorläufig (5-s-Median, Differenzgrenze 0,02 g).');
  if(comparisonRuns.some(r=>r.meta.eventMode.includes('geschätzt')||r.meta.eventMode.includes('unbekannt')||
                                r.meta.eventMode.includes('nicht dokumentiert')))parts.push('Startmarker teils nur geschätzt oder unbekannt; Zeitvergleiche kritisch prüfen.');
  parts.push('Bechergeometrie, Rühren, Spritzverluste, Messanordnung und Tablettencharge sind aus CSV-Metadaten nicht vollständig kontrollierbar.');
  return parts.join(' ');
}
function renderComparison(){
  const table=$('comparisonTable'),legend=$('compareLegend'),mode=$('compareMode').value;
  table.innerHTML=comparisonRuns.map((r,i)=>{
    const a=r.metrics,c=r.meta,color=comparisonColors[i%comparisonColors.length];
    const select='<select class="form-edit" data-i="'+i+'" aria-label="Tablettenform korrigieren">'+
      [''].concat(formOptions).map(form=>'<option value="'+escapeHtml(form)+'"'+
        (form===c.tabletForm?' selected':'')+'>'+escapeHtml(form||'nicht angegeben')+'</option>').join('')+'</select>';
    return '<tr><td><span class="key-dot" style="background:'+color+'"></span>'+escapeHtml(r.name)+
      (c.corrected?' <small title="Manuell im Vergleich korrigierte Metadaten">†</small>':'')+'</td>'+
      '<td>'+displayNum(c.temperature,1)+'</td><td>'+displayNum(c.waterMass,2)+'</td>'+
      '<td>'+displayNum(c.tabletMass,2)+'</td><td>'+select+'</td>'+
      '<td>'+displayNum(a.final,3)+(a.plateau?'':'*')+'</td>'+
      '<td>'+displayNum(a.t50,1)+'</td><td>'+displayNum(a.t90,1)+'</td>'+
      '<td>'+displayNum(a.t95,1)+'</td><td>'+displayNum(c.analysisFrom,1)+'</td>'+
      '<td><button class="secondary remove-run" data-i="'+i+'" title="Messlauf entfernen">Entfernen</button></td></tr>';
  }).join('');
  legend.innerHTML=comparisonRuns.map((r,i)=>'<span><i class="key-dot" style="background:'+
    comparisonColors[i%comparisonColors.length]+'"></i>'+escapeHtml(r.name)+'</span>').join('');
  $('variableCheck').textContent=variableStatus();
  $('comparisonStatus').textContent=comparisonRuns.length+
    ' reale(r) Messlauf/-läufe geladen. * = Δm∞ vorläufig, † = Metadaten im Vergleich korrigiert.';
  $('compareAi').disabled=comparisonRuns.length<2;
  $('compareLimits').disabled=comparisonRuns.length<2;
  drawCompareChart(mode);
}
function drawCompareChart(mode){
  const canvas=$('compareCanvas'),rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const w=Math.max(330,rect.width||400),h=Math.max(280,rect.height||390);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const pad={l:61,r:18,t:25,b:47},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  const series=comparisonRuns.map(r=>({
    points:r.points.filter(p=>p.t>=0&&Number.isFinite(p.dm)).map(p=>({
      t:p.t,y:mode==='normalized'?p.dm/r.metrics.final:p.dm
    })).filter(p=>Number.isFinite(p.y)),
    valid:mode!=='normalized'||r.metrics.final>0
  }));
  const maxT=Math.max(90,...series.flatMap(s=>s.points.map(p=>p.t)));
  const ymax=Math.max(mode==='normalized'?1.1:0.25,
    ...series.flatMap(s=>s.points.map(p=>p.y>0?p.y:0)))*1.1;
  c.strokeStyle='#dae1e9';c.lineWidth=1;c.font='12px system-ui';c.fillStyle='#5e6b79';
  for(let i=0;i<=5;i++){
    const y=pad.t+i*ph/5;c.beginPath();c.moveTo(pad.l,y);c.lineTo(pad.l+pw,y);c.stroke();
    c.fillText((ymax*(1-i/5)).toFixed(2).replace('.',','),7,y+4);
  }
  for(let i=0;i<=6;i++){
    const x=pad.l+i*pw/6;c.beginPath();c.moveTo(x,pad.t);c.lineTo(x,pad.t+ph);c.stroke();
    c.fillText((maxT*i/6).toFixed(0),x-10,h-22);
  }
  c.fillStyle='#172033';c.font='13px system-ui';c.fillText('t / s',w/2-10,h-5);
  c.save();c.translate(15,h/2+45);c.rotate(-Math.PI/2);
  c.fillText(mode==='normalized'?'X = Δm / Δm∞':'Δm / g',0,0);c.restore();
  const X=t=>pad.l+t/maxT*pw,Y=y=>pad.t+ph-y/ymax*ph;
  series.forEach((s,i)=>{
    if(!s.valid||!s.points.length)return;
    const step=Math.max(1,Math.ceil(s.points.length/2500));
    const data=s.points.filter((_,idx)=>idx%step===0);
    if(data.at(-1)!==s.points.at(-1))data.push(s.points.at(-1));
    c.beginPath();c.strokeStyle=comparisonColors[i%comparisonColors.length];c.lineWidth=2.3;
    data.forEach((p,j)=>j?c.lineTo(X(p.t),Y(p.y)):c.moveTo(X(p.t),Y(p.y)));c.stroke();
  });
  if(!comparisonRuns.length){c.fillStyle='#697786';c.fillText('CSV-Dateien laden oder aktuellen Messlauf hinzufügen.',pad.l+15,pad.t+50);}
}
function drawTransient(){
  const canvas=$('transientCanvas'),rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const w=Math.max(325,rect.width||500),h=Math.max(180,rect.height||215);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const pad={l:65,r:18,t:18,b:35},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  const pts=state.run.filter(p=>Number.isFinite(p.mass)&&p.t>=-5&&p.t<=15);
  c.font='11px system-ui';c.fillStyle='#667482';
  if(!pts.length){c.fillText('Nach dem Einwurfmarker erscheint hier das ungeglättete Rohsignal.',pad.l+10,pad.t+30);return;}
  const minT=-5,maxT=15;
  const masses=pts.map(p=>p.mass),low=Math.min(...masses),high=Math.max(...masses),span=Math.max(.1,high-low);
  const minY=low-span*.08,maxY=high+span*.08;
  const X=t=>pad.l+(t-minT)/(maxT-minT)*pw;
  const Y=v=>pad.t+ph-(v-minY)/(maxY-minY)*ph;
  c.fillStyle='rgba(230,165,73,.15)';
  c.fillRect(X(0),pad.t,X(Math.min(15,state.analysisFrom))-X(0),ph);
  c.strokeStyle='#dae1e9';
  for(let i=0;i<=4;i++){
    const y=pad.t+ph*i/4;
    c.beginPath();c.moveTo(pad.l,y);c.lineTo(pad.l+pw,y);c.stroke();
    c.fillStyle='#667482';c.fillText((maxY-(maxY-minY)*i/4).toFixed(2),5,y+3);
  }
  for(let i=0;i<=4;i++){
    const t=-5+i*5,x=X(t);c.fillStyle='#667482';c.fillText(String(t),x-6,h-15);
  }
  c.strokeStyle='#b16b23';c.setLineDash([5,4]);c.beginPath();
  c.moveTo(X(0),pad.t);c.lineTo(X(0),pad.t+ph);c.stroke();c.setLineDash([]);
  c.strokeStyle='#245d83';c.lineWidth=1.8;c.beginPath();
  pts.forEach((p,i)=>i?c.lineTo(X(p.t),Y(p.mass)):c.moveTo(X(p.t),Y(p.mass)));c.stroke();
  c.fillStyle='#172033';c.fillText('t / s',w/2,h-2);c.fillText('m / g',5,12);
}
$('compareFiles').addEventListener('change',async e=>{
  const files=[...(e.target.files||[])];
  let errors=[];
  for(const file of files){
    if(comparisonRuns.length>=24){errors.push('Maximal 24 Läufe möglich.');break;}
    if(file.size>8_000_000){errors.push(file.name+': Datei größer als 8 MB.');continue;}
    try{const parsed=importCsvRun(await file.text(),file.name);comparisonRuns.push(parsed);}
    catch(err){errors.push(file.name+': '+err.message);}
  }
  renderComparison();
  if(errors.length)$('comparisonStatus').textContent+=' Fehler: '+errors.join(' | ');
  e.target.value='';
});
$('addCurrentRun').addEventListener('click',()=>{
  if(state.running||state.run.length<5){
    $('comparisonStatus').textContent='Zuerst einen realen Messlauf beenden oder importieren.';return;
  }
  if(comparisonRuns.length>=24)return;
  comparisonRuns.push(currentRunForComparison());renderComparison();
});
$('clearComparison').addEventListener('click',()=>{
  comparisonRuns.length=0;$('comparisonPrompt').value='';
  $('copyComparison').disabled=true;renderComparison();
});
$('targetVariable').addEventListener('change',renderComparison);
$('compareMode').addEventListener('change',renderComparison);
$('comparisonTable').addEventListener('click',e=>{
  const button=e.target.closest('button.remove-run');
  if(!button)return;comparisonRuns.splice(Number(button.dataset.i),1);
  renderComparison();
});
$('comparisonTable').addEventListener('change',e=>{
  const select=e.target.closest('select.form-edit');
  if(!select)return;
  const run=comparisonRuns[Number(select.dataset.i)];if(!run)return;
  run.meta.tabletForm=select.value;run.meta.corrected=true;renderComparison();
});
function comparisonPrompt(limitsOnly=false){
  if(comparisonRuns.length<2)return;
  const rows=comparisonRuns.map((r,i)=>{
    const a=r.metrics,m=r.meta;
    const n=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'fehlt';
    const stride=Math.max(1,Math.ceil(r.points.length/25));
    const selected=r.points.filter((_,j)=>j%stride===0).slice(0,26);
    const pairs=selected.map(p=>'('+n(p.t,1)+'s; '+n(p.dm,3)+'g)').join(', ');
    return (i+1)+'. '+r.name+
      '\n   Temperatur '+n(m.temperature,1)+' °C; Wasser '+n(m.waterMass)+' g; Tablette '+
      n(m.tabletMass)+' g; Form '+(m.tabletForm||'fehlt')+
      (m.corrected?' (Form im Vergleich manuell korrigiert)':'')+
      '; Auswertung ab '+n(m.analysisFrom,1)+' s; Marker: '+m.eventMode+
      '\n   Δm∞ '+n(a.final,3)+' g; t50 '+n(a.t50,1)+' s; t90 '+n(a.t90,1)+
      ' s; t95 '+n(a.t95,1)+' s; stabile Endphase: '+(a.plateau?'ja':'nicht eindeutig')+
      '\n   Gemessene Stützpunkte (t; Δm): '+pairs;
  }).join('\n\n');
  const prefix=limitsOnly?'PRÜFFRAGE: WELCHE AUSSAGE DÜRFEN DIE DATEN NICHT BEWEISEN?':
    'WAAGE_LAB: Wissenschaftlicher KI-Coach für den Vergleich realer Messläufe';
  const prompt=prefix+'\n\nDETERMINISTISCHE VARIABLENPRÜFUNG\n'+variableStatus()+
    '\n\nECHTE MESSWERTE UND APP-KENNWERTE\n'+rows+
    '\n\nAUFTRAG\n'+
    '1. Erfinde keine Messwerte, keine unbeobachteten Bedingungen und keine signifikanten Unterschiede ohne Wiederholungen.\n'+
    '2. Trenne Beobachtung, Massenmesswert und Interpretation. Gemessen wird entweichende Masse, nicht unmittelbar die chemische CO₂-Bildungsrate.\n'+
    '3. Formuliere eine durch die Daten gestützte Aussage und mindestens eine zu weitgehende Aussage. '+
    'Unterschiede bei t90 sind kein Beweis einer veränderten CO₂-Gesamtbildung.\n'+
    '4. Beachte unkontrollierte Größen, Einschwingphase, geschätzte Marker und möglicherweise fehlendes Plateau.\n'+
    '5. Stelle zunächst zwei kurze Rückfragen; danach eine knappe, kritische Auswertung.\n'+
    '6. Schlage eine experimentelle Folgeuntersuchung zur Trennung konkurrierender Erklärungen vor.\n'+
    '7. Ende mit einer Transferfrage, die ohne KI beantwortet wird.';
  $('comparisonPrompt').value=prompt;$('copyComparison').disabled=false;
}
$('compareAi').addEventListener('click',()=>comparisonPrompt(false));
$('compareLimits').addEventListener('click',()=>comparisonPrompt(true));
$('copyComparison').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('comparisonPrompt').value);}
  catch(err){$('comparisonPrompt').focus();$('comparisonPrompt').select();return;}
  $('copyComparison').textContent='Kopiert';
  setTimeout(()=>$('copyComparison').textContent='KI-Auftrag kopieren',1200);
});
renderComparison();
requestAnimationFrame(drawAll);
