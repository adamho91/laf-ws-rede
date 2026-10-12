const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('webflow/angle-marks.js', 'utf8').replace('function mount(target,input={}){', 'global.testFitMobile=fitMobile;function mount(target,input={}){');
const context = {document:{readyState:'loading',addEventListener(){}}};context.window=context;vm.runInNewContext(source,context);
let checks=0;
for(const viewport of [320,390,479,767])for(const [w,h] of [[viewport*.48,viewport*.4],[viewport*.52,144],[viewport*.52,176],[viewport*.52,196],[500,500]])for(const silhouette of ['single','double','triple','crossed-dash'])for(let seed=1;seed<=12;seed++){
 const html=context.AngleMarks.markup(w,h,{count:1,mobile:true,silhouette,seed});
 const lines=[...html.matchAll(/<line\s([^>]+)>/g)].map(m=>{const a=Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]+)"/g)].map(x=>[x[1],x[2]]));return{getAttribute:k=>a[k],setAttribute:(k,v)=>a[k]=v};});
 const attrs={};const svg={style:{},setAttribute:(k,v)=>attrs[k]=v,querySelectorAll:q=>q==='line'?lines:[]};
 context.testFitMobile(svg,w,h);
 const view=attrs.viewBox.split(' ').map(Number);assert.equal(view[2],w);assert.equal(view[3],h);
 for(const line of lines){assert.equal(+line.getAttribute('stroke-width'),40);assert.ok(Math.abs(Math.hypot(line.getAttribute('x2')-line.getAttribute('x1'),line.getAttribute('y2')-line.getAttribute('y1'))-89.87216)<.002);checks++;}
 context.testFitMobile(svg,w,h);assert.equal(attrs.viewBox.split(' ')[2],String(w));
}
console.log(`PASS: ${checks} strokes retain identical mobile size across pages, silhouettes, widths, seeds, and repeated positioning.`);
