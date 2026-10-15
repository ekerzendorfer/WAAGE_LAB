'use strict';
/* Regressions-Smoketests: node tests/waage_v02.test.js
   Keine externen Pakete und keine echten seriellen Geräte erforderlich. */
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const compare=fs.readFileSync(path.join(root,'compare.js'),'utf8');
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const m of [...app.matchAll(/\$\('([^']+)'\)/g),...compare.matchAll(/\$\('([^']+)'\)/g)])
  assert(ids.has(m[1]),'HTML-ID fehlt: '+m[1]);
const nodes={};
const context2d=new Proxy({}, {get(){return ()=>{}},set(){return true}});
const domNode=id=>nodes[id]||(nodes[id]={
  id,value:'',textContent:'',innerHTML:'',hidden:id==='compare',disabled:false,readOnly:false,
  addEventListener(name,handler){this.handlers??={};this.handlers[name]=handler;},
  getBoundingClientRect(){return {width:720,height:380};},
  getContext(){return context2d;},
  classList:{toggle(){}},click(){},focus(){},select(){}
});
const document={
  getElementById:domNode,querySelectorAll(){return []},
  createElement(){return domNode('download-link')}
};
const mock={
  document,window:{devicePixelRatio:1,addEventListener(){}},
  navigator:{},console,Date,Math,Number,String,Set,Blob,
  requestAnimationFrame(fn){fn()}
};
domNode('tabletMass').value='6.13';
domNode('baselineMass').value='195.42';
domNode('beakerMass').value='45.42';
domNode('analysisFrom').value='5';
domNode('targetVariable').value='auto';
domNode('compareMode').value='absolute';
vm.createContext(mock);
vm.runInContext(app,mock,{filename:'app.js'});
vm.runInContext(compare,mock,{filename:'compare.js'});
function evalIn(src){return vm.runInContext(src,mock);}
assert.equal(domNode('waterMass').value,'150.00');
assert.equal(domNode('waterMass').readOnly,true);
const test=evalIn('(()=>{const pts=[];for(let t=0;t<=100;t++)pts.push({t,dm:t<5?0:.7*(1-Math.exp(-(t-5)/20))});return metricsForRun(pts,5);})()');
assert(test.final>0.65&&test.final<0.71);
assert(test.t50>10&&test.t50<30);
assert(test.t90>35&&test.t90<70);
const invalidEarly=evalIn('metricsForRun(Array.from({length:101},(_,t)=>({t,dm:.7*(1-Math.exp(-t/1.2))})),5)');
assert(Number.isNaN(invalidEarly.t50),'Früh überschrittene Schwelle muss n.v. sein');
assert(Number.isNaN(invalidEarly.t90),'Früh überschrittene Schwelle muss n.v. sein');
const csv='# WAAGE_LAB v0.2.0\n# m0_g=200\n# temperature_C=22.4\n'+
  '# water_g=200.0\n# tablet_g=6.13\n# tablet_form=ganz\n# analysis_from_s=5\n'+
  't_s;m_g;dm_g\n'+Array.from({length:80},(_,t)=>{
    const dm=t<5?0:.7*(1-Math.exp(-(t-5)/15));
    return t+';'+(200-dm).toFixed(3)+';'+dm.toFixed(3);
  }).join('\n');
const meta=evalIn('importCsvRun')(csv,'CSV1');
assert.equal(meta.points.length,80);
assert.equal(meta.meta.tabletForm,'ganz');
assert(Number.isFinite(meta.metrics.t90));
const meta2=evalIn('importCsvRun')(csv.replace('temperature_C=22.4','temperature_C=28.0'),'CSV2');
mock.sample1=meta;mock.sample2=meta2;
const detected=evalIn('(()=>{comparisonRuns.push(sample1,sample2);return compareChanged();})()');
assert.equal(detected.changed.join(','),'temperature');
assert.equal(detected.unknown.length,0);
domNode('compareMode').value='normalized';
evalIn('renderComparison()');
assert(domNode('comparisonTable').innerHTML.includes('CSV2'));
evalIn('comparisonPrompt(true)');
assert(domNode('comparisonPrompt').value.includes('NICHT BEWEISEN'));
assert(domNode('comparisonPrompt').value.includes('Starttemperatur'));
console.log('WAAGE_LAB v0.2: alle Smoke- und Regressionsprüfungen bestanden.');
