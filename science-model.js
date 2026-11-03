'use strict';

/**
 * WAAGE_LAB Mivolis Forschungsmodell (explorativ, NICHT kalibriert).
 *
 * Gesichert: deklarierte Salzäquivalente und Zutaten auf dm.at.
 * Annahmen: gesamtes Natrium aus NaHCO3; Säure nicht limitierend;
 * Henry-Potential bei CO2-reichen Blasen; empirische Matrix-, Retentions-
 * und Weibull-Parameter nach der Gemini-Arbeitshypothese (nicht validiert).
 * Keine exakte Bestimmung des CO2-Gehalts oder der chemischen Reaktionsrate!
 */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.WAAGE_SCIENCE = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  const M_NA = 22.9897693, M_NAHCO3 = 84.0066, M_CO2 = 44.0095;
  const profiles = {
    'ganz': {tau:46, b:1.65, eta:0.88},
    'halbiert': {tau:38, b:1.48, eta:0.90},
    'geviertelt': {tau:28, b:1.30, eta:0.91},
    'grob zerkleinert': {tau:17, b:1.10, eta:0.93},
    'fein zerkleinert': {tau:11, b:0.90, eta:0.95},
    'zerkleinert': {tau:11, b:0.90, eta:0.95}
  };
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  function labelEstimate(tabletG) {
    if (!(Number.isFinite(tabletG) && tabletG>0)) throw Error('Tablettenmasse muss positiv sein.');
    const sodiumMg = tabletG * 1000 * .202 / 2.5;
    const nNaMmol = sodiumMg / M_NA;
    return {tabletG, sodiumMg, nNaMmol,
      nahco3MgUpper:nNaMmol*M_NAHCO3,
      co2MgUpper:nNaMmol*M_CO2,
      basis:'LMIV Salzäquivalent 20,2 g/100 g; alles Natrium hypothetisch als NaHCO3'};
  }
  // Dichte von reinem Wasser in g/mL (ungefähr gültig für 0–100 °C).
  function waterDensity(T) {
    if(!Number.isFinite(T) || T<0 || T>100) throw Error('Temperatur außerhalb des Wasser-Dichtebereichs.');
    return 1 - ((T+288.9414)/(508929.2*(T+68.12963))) * Math.pow(T-3.9863,2);
  }
  function calculate(input) {
    const tabletG=Number(input.tabletG), tempC=Number(input.tempC), volumeMl=Number(input.volumeMl);
    const form=profiles[input.form]?input.form:'ganz';
    if(!Number.isFinite(tempC)||tempC<10||tempC>60) throw Error('Modelltemperatur: 10 bis 60 °C.');
    if(!Number.isFinite(volumeMl)||volumeMl<20||volumeMl>250) throw Error('Modellvolumen: 20 bis 250 mL.');
    const ret=Number(input.retentionFraction ?? profiles[form].eta);
    const pressureFraction=Number(input.pressureFraction ?? 1);
    const tauMultiplier=Number(input.tauMultiplier ?? 1);
    const matrixEffect=Number(input.matrixEffect ?? 0.028);
    if(!Number.isFinite(ret)||ret<0||ret>1) throw Error('Retentionsfaktor 0 bis 1.');
    if(!Number.isFinite(pressureFraction)||pressureFraction<0.1||pressureFraction>1) throw Error('Partialdruckfaktor 0,1 bis 1.');
    if(!Number.isFinite(tauMultiplier)||tauMultiplier<.2||tauMultiplier>5) throw Error('Zeitfaktor 0,2 bis 5.');
    if(!Number.isFinite(matrixEffect)||matrixEffect<0||matrixEffect>.2) throw Error('Matrixparameter 0 bis 0,2.');
    const theory=labelEstimate(tabletG);
    const TK=tempC+273.15;
    const kH=0.034 * Math.exp(2400*(1/TK-1/298.15)); // mol/(L*bar)
    const pH2O=0.00611*Math.exp(17.27*tempC/(tempC+237.3));
    const pCO2=Math.max(0,0.98-pH2O)*pressureFraction;
    const salt=!!input.saturatedNaCl;
    const matrixFactor=salt?0.22:Math.pow(10,-matrixEffect*(200/volumeMl)*(tabletG/4.10));
    const henryPotentialMg=volumeMl/1000*kH*pCO2*(M_CO2*1000)*matrixFactor;
    const heldCapacityMg=Math.min(theory.co2MgUpper,henryPotentialMg*ret);
    const profile=profiles[form];
    const fT=Math.exp(0.035*(tempC-20));
    const tau=profile.tau*tauMultiplier/fT;
    function point(t) {
      const ts=Math.max(0,Number(t));
      const a=1-Math.exp(-Math.pow(ts/tau,profile.b));
      const generatedMg=theory.co2MgUpper*a;
      const dissolvedMg=heldCapacityMg>0
        ? Math.min(generatedMg,heldCapacityMg*(1-Math.exp(-generatedMg/(0.65*heldCapacityMg+1))))
        : 0;
      return {t:ts,generatedMg,dissolvedMg,escapedMg:Math.max(0,generatedMg-dissolvedMg)};
    }
    return {theory,form,tempC,volumeMl,retentionFraction:ret,pressureFraction,
      tauMultiplier,matrixEffect,saturatedNaCl:salt,kH,pCO2,henryPotentialMg,
      heldCapacityMg,profile,tau,point,
      points:function(duration=150,step=1) {
        const out=[];for(let t=0;t<=duration;t+=step)out.push(point(t));return out;
      }};
  }
  function conditionalInversion(measuredLossG,atSeconds,model) {
    if(!Number.isFinite(measuredLossG)||measuredLossG<0) return null;
    const assumedDissMg=model.point(atSeconds).dissolvedMg;
    const conditionalTotalMg=measuredLossG*1000+assumedDissMg;
    return {conditionalTotalMg,assumedDissMg,
      nahco3EquivalentMg:conditionalTotalMg * M_NAHCO3/M_CO2,
      warning:'Nur Szenariorechnung: Rückhalt, sonstige Natriumquellen und Aerosole sind nicht unabhängig bestimmt.'};
  }
  return {labelEstimate,waterDensity,calculate,conditionalInversion,profiles};
});

(function(){
  if(typeof document==='undefined')return;
  const $id=id=>document.getElementById(id);
  const f=(n,d=3)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'–';
  let model=null;
  let lastTabletsForm='';
  function numeric(id, fallback){
    const el=$id(id); if(!el)return fallback;
    const s=el.value.trim().replace(',','.');
    if(s==='')return fallback;
    const v=Number(s);return Number.isFinite(v)?v:fallback;
  }
  function updateModel(){
    const product=$id('tabletProduct').value, panel=$id('researchBody');
    panel.hidden=product!=='mivolis-c';
    $id('researchInactive').hidden=product==='mivolis-c';
    if(product!=='mivolis-c'){model=null;return;}
    try {
      const form=$id('tabletForm').value;
      if(lastTabletsForm!==form){
        $id('researchRetention').value=Math.round((WAAGE_SCIENCE.profiles[form]||WAAGE_SCIENCE.profiles.ganz).eta*100);
        lastTabletsForm=form;
      }
      const tabletG=numeric('tabletMass',4.1);
      const tempC=numeric('temperature',20);
      const waterG=numeric('waterMass',NaN);
      const measuredWaterVol=Number.isFinite(waterG)&&waterG>0 ? waterG/WAAGE_SCIENCE.waterDensity(Math.max(0,Math.min(100,tempC))):NaN;
      const inputVolume=numeric('researchVolume',NaN);
      const volumeMl=Number.isFinite(inputVolume)?inputVolume:measuredWaterVol;
      model=WAAGE_SCIENCE.calculate({
        tabletG,tempC,volumeMl:Number.isFinite(volumeMl)?volumeMl:200,form,
        saturatedNaCl:$id('researchNaCl').checked,
        retentionFraction:numeric('researchRetention',88)/100,
        pressureFraction:numeric('researchPressure',100)/100,
        tauMultiplier:numeric('researchTau',1),
        matrixEffect:numeric('researchMatrix',0.028)
      });
      const final=model.point(150);
      $id('researchStatus').textContent='Szenario: '+f(tabletG,2)+' g Tablette · '+
        f(model.volumeMl,1)+' mL · '+f(tempC,1)+' °C · '+form+
        ' · τ='+f(model.tau,1)+' s. Nicht durch Messdaten kalibriert.';
      $id('researchTheor').textContent=f(model.theory.co2MgUpper/1000,3)+' g';
      $id('researchDiss').textContent=f(model.heldCapacityMg/1000,3)+' g';
      $id('researchEscape').textContent=f(final.escapedMg/1000,3)+' g';
      $id('researchBaseline').textContent='Modell: NaHCO₃ ≤ '+f(model.theory.nahco3MgUpper/1000,3)+
        ' g (nur wenn alles Natrium aus NaHCO₃ stammt). CO₂-Potential ≤ '+f(model.theory.co2MgUpper/1000,3)+' g. '+
        'Henry-Potential ist eine hypothetische Kapazität, keine Messung des gelösten CO₂.';
      const exp=state.run.filter(p=>Number.isFinite(p.t)&&p.t>=0&&Number.isFinite(p.dm));
      const analysis=exp.length>=5?metricsForRun(exp, state.analysisFrom):null;
      const inversion=analysis&&Number.isFinite(analysis.final)?
        WAAGE_SCIENCE.conditionalInversion(analysis.final,exp.at(-1).t,model):null;
      $id('researchInversion').textContent=inversion
        ? 'Hypothetische Rückrechnung: '+f(inversion.conditionalTotalMg/1000,3)+' g CO₂-Äquivalent, '+
          f(inversion.nahco3EquivalentMg/1000,3)+' g NaHCO₃-Äquivalent. '+
          'Keine tatsächliche Stoffbestimmung: gelöstes CO₂, Spritzer und andere Natriumquellen sind unbekannt.'
        : 'Nach Import oder Abschluss einer realen Messung erscheint eine ausdrücklich bedingte Rückrechnung.';
      drawModelChart(model, exp);
    } catch(err) {
      model=null;$id('researchStatus').textContent='Modell nicht berechenbar: '+err.message;
      $id('researchTheor').textContent='–';$id('researchDiss').textContent='–';$id('researchEscape').textContent='–';
      $id('researchInversion').textContent='Keine Rückrechnung möglich.';
    }
  }
  function drawModelChart(m, measured){
    const canvas=$id('researchCanvas'), rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const dpr=window.devicePixelRatio||1,w=Math.max(320,rect.width),h=Math.max(300,rect.height);
    canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const pad={l:64,r:18,t:30,b:46},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
    const valid=measured.filter(p=>p.dm>=-.03&&p.dm<=2&&p.t<=180);
    const curves=m.points(150,0.5);
    const yMax=Math.max(.08,m.theory.co2MgUpper/1000,...valid.map(p=>p.dm))*1.14;
    const xMax=Math.max(150,...valid.map(p=>p.t));
    const x=t=>pad.l+pw*t/xMax,y=grams=>pad.t+ph-(grams/yMax)*ph;
    c.font='12px system-ui';c.strokeStyle='#d6dfe8';c.fillStyle='#536574';c.lineWidth=1;
    for(let i=0;i<=5;i++){
      const yy=pad.t+ph*i/5;c.beginPath();c.moveTo(pad.l,yy);c.lineTo(w-pad.r,yy);c.stroke();
      c.fillText(f(yMax*(1-i/5),2),10,yy+4);
    }
    for(let i=0;i<=6;i++){
      const xx=pad.l+pw*i/6;c.beginPath();c.moveTo(xx,pad.t);c.lineTo(xx,h-pad.b);c.stroke();
      c.fillText(String(Math.round(xMax*i/6)),xx-12,h-22);
    }
    c.fillStyle='#172033';c.fillText('t / s',w/2-10,h-6);
    c.save();c.translate(14,h/2+25);c.rotate(-Math.PI/2);c.fillText('m / g',0,0);c.restore();
    const paths=[
      {label:'CO₂ modelliert gebildet',key:'generatedMg',color:'#7a8a95',dash:[8,4]},
      {label:'CO₂ modelliert gelöst',key:'dissolvedMg',color:'#267f73',dash:[3,5]},
      {label:'Waagenverlust modelliert',key:'escapedMg',color:'#bf6334',dash:[]}
    ];
    let lx=pad.l+8;
    for(const p of paths){
      c.lineWidth=2.3;c.strokeStyle=p.color;c.setLineDash(p.dash);c.beginPath();
      curves.forEach((r,i)=>i?c.lineTo(x(r.t),y(r[p.key]/1000)):c.moveTo(x(r.t),y(r[p.key]/1000)));c.stroke();
      c.setLineDash([]);c.fillStyle=p.color;c.fillRect(lx,pad.t-16,12,3);
      c.font='11px system-ui';c.fillText(p.label,lx+16,pad.t-10);lx+=c.measureText(p.label).width+36;
    }
    if(valid.length) {
      c.strokeStyle='#225d92';c.lineWidth=2.5;c.beginPath();
      valid.forEach((r,i)=>i?c.lineTo(x(r.t),y(r.dm)):c.moveTo(x(r.t),y(r.dm)));c.stroke();
      c.fillStyle='#225d92';c.fillText('Blaue Kurve: reale Messung',pad.l+8,pad.t+14);
    }
  }
  async function copyHub(){
    if(!model)return;
    const exp=state.run.filter(p=>Number.isFinite(p.t)&&p.t>=0&&Number.isFinite(p.dm));
    const analysis=exp.length>=5?metricsForRun(exp,state.analysisFrom):null;
    const inversion=analysis&&Number.isFinite(analysis.final)?
      WAAGE_SCIENCE.conditionalInversion(analysis.final,exp.at(-1).t,model):null;
    const payload={
      schema:'WAAGE_LAB_TABLETTEN_V1',source:'WAAGE_LAB v0.2.1 research preview',
      product:'Mivolis Vitamin C, dm AT Artikel 3104290',
      assumption:'All declared sodium from sodium bicarbonate; citric acid assumed nonlimiting',
      experiment:{tabletMassG:model.theory.tabletG,waterVolumeMl:model.volumeMl,
        temperatureC:model.tempC,form:model.form,
        measuredMassLossG:analysis&&Number.isFinite(analysis.final)?analysis.final:null,
        t90Seconds:analysis&&Number.isFinite(analysis.t90)?analysis.t90:null,
        startMarker:state.eventMode||null},
      model:{CO2MaxMgConditional:model.theory.co2MgUpper,
        henryCapacityMg:model.henryPotentialMg,
        retainedCapacityMg:model.heldCapacityMg,
        timeConstantS:model.tau,shapeB:model.profile.b,
        retentionFactor:model.retentionFraction,
        pressureFraction:model.pressureFraction,saturatedNaClScenario:model.saturatedNaCl,
        matrixEffect:model.matrixEffect,tauMultiplier:model.tauMultiplier},
      conditionalInversion:inversion,
      epistemicStatus:'unvalidated exploratory model; not an assay or chemical truth'
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload,null,2));
      $id('researchExportStatus').textContent='JSON in die Zwischenablage kopiert (kein automatischer Hub-Upload).';
    } catch(e) {$id('researchExportStatus').textContent='Kopieren nicht möglich: '+e.message;}
  }
  $id('researchHubExport').addEventListener('click',copyHub);
  [
    'tabletProduct','tabletMass','waterMass','temperature','tabletForm',
    'researchVolume','researchRetention','researchPressure','researchTau','researchMatrix','researchNaCl'
  ].forEach(id=>$id(id).addEventListener('input',updateModel));
  window.WAAGE_SCIENCE.render=updateModel;
  updateModel();
})();