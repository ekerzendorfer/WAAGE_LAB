'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../science-model.js');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const science=fs.readFileSync(path.join(root,'science-model.js'),'utf8');

assert.match(html,/<script src="science-model\.js"><\/script>/);
for(const m of science.matchAll(/\$id\('([^']+)'\)/g)){
  assert(html.includes('id="'+m[1]+'"'),'Wissenschaftsmodell HTML-ID fehlt: '+m[1]);
}
const label=model.labelEstimate(4.10);
assert(Math.abs(label.nahco3MgUpper-1211)<4);
assert(Math.abs(label.co2MgUpper-634)<2);
assert(Math.abs(model.waterDensity(20)-0.9982)<0.001);
const input={tabletG:4.10,tempC:20,volumeMl:200,form:'ganz',
  retentionFraction:.88,pressureFraction:1,tauMultiplier:1,matrixEffect:.028};
const baseline=model.calculate(input);
assert(baseline.heldCapacityMg>0);
assert(baseline.heldCapacityMg<label.co2MgUpper);
assert.equal(baseline.point(0).escapedMg,0);
for(let t=0;t<=150;t+=.5){
  const p=baseline.point(t);
  assert(p.escapedMg>=0&&p.dissolvedMg>=0&&p.generatedMg>=0);
  assert(p.dissolvedMg<=baseline.heldCapacityMg+1e-8);
  assert(Math.abs(p.generatedMg-p.dissolvedMg-p.escapedMg)<1e-7);
  assert(p.generatedMg<=label.co2MgUpper+1e-8);
}
assert(baseline.point(100).escapedMg>=baseline.point(20).escapedMg);
const cold=model.calculate({...input,tempC:10});
const hot=model.calculate({...input,tempC:40});
assert(hot.tau<cold.tau,'Das Modell soll die Zeitkonstante verkürzen');
assert(hot.heldCapacityMg<cold.heldCapacityMg,'Henry-Kapazität bei warmem Wasser kleiner');
const saline=model.calculate({...input,saturatedNaCl:true});
assert(saline.heldCapacityMg<baseline.heldCapacityMg);
const zero=model.calculate({...input,retentionFraction:0});
assert.equal(zero.point(80).dissolvedMg,0);
const inversion=model.conditionalInversion(.4,150,baseline);
assert(inversion.nahco3EquivalentMg>0);
assert.throws(()=>model.calculate({...input,volumeMl:0}),/Modellvolumen/);
assert.throws(()=>model.calculate({...input,tabletG:0}),/Tablettenmasse/);
assert.throws(()=>model.calculate({...input,tempC:90}),/Modelltemperatur/);
console.log('WAAGE_LAB Forschungsmodell: Mathematik, Grenzfälle und DOM-IDs geprüft.');
