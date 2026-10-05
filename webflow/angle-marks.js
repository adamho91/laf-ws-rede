/* Angle Marks — Webflow adapter, adapted from the supplied angle-marks.js.
 * No dependencies. Auto-mounts #angle-mark and [data-angle-marks] after DOM ready.
 * Optional attributes: data-angle-scale="2", data-angle-count="8".
 * Container must have a height/min-height. Below desktop (<=991px) uses half size.
 */
(function(global){
'use strict';
if(global.AngleMarks)return;
const drawStyles = `.am-draw-stroke{stroke-dasharray:1 1;animation:am-draw-line 650ms cubic-bezier(.22,.61,.36,1) var(--draw-delay,0ms) both}@keyframes am-draw-line{0%{stroke-dashoffset:1;opacity:0}1%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}.am-fan-stroke{transform-box:view-box;animation:am-fan-open 800ms cubic-bezier(.22,.61,.36,1) var(--fan-delay,0ms) both}@keyframes am-fan-open{from{transform:rotate(var(--fan-start,0deg))}to{transform:rotate(0deg)}}@media(prefers-reduced-motion:reduce){.am-draw-stroke,.am-fan-stroke{animation:none;stroke-dashoffset:0}}`;
const colors=['#99EDFF','#FFFFFF','#3FB5FE','#EC0648','#115EF3','#403700','#ADFF00','#D5BBFF','#F57EC3'];
function randomSeed(){return global.crypto&&global.crypto.getRandomValues?global.crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)}
function seeded(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function fanAngles(n,min,max,negative,rng){
 let ranges=[[min,max]];
 if(negative){
  ranges.push([-max,-min]);ranges.sort((a,b)=>a[0]-b[0]);
  if(ranges[0][1]>=ranges[1][0])ranges=[[ranges[0][0],Math.max(ranges[0][1],ranges[1][1])]];
 }
 const total=ranges.reduce((sum,[a,b])=>sum+b-a,0);
 const sample=t=>{let offset=t*total;for(const [a,b] of ranges){if(offset<=b-a)return a+offset;offset-=b-a}return ranges.at(-1)[1]};
 if(n===1)return[sample(rng())];
 // Spread strokes across the allowed angles instead of independent, overlapping picks.
 const start=rng()*.08,end=1-rng()*.08;
 return Array.from({length:n},(_,j)=>sample(start+(end-start)*j/(n-1)));
}
// Curated neighbors keep every pairing inside the supplied reference palette.
const nearColors={
 '#99EDFF':['#3FB5FE','#115EF3'], '#3FB5FE':['#99EDFF','#115EF3'],
 '#115EF3':['#3FB5FE','#99EDFF'], '#EC0648':['#F57EC3'],
 '#F57EC3':['#EC0648','#D5BBFF'], '#D5BBFF':['#F57EC3'],
 '#ADFF00':['#403700'], '#403700':['#ADFF00'], '#FFFFFF':['#99EDFF','#D5BBFF']
};
function rgba(value){
 if(!value||value==='transparent')return [0,0,0,0];
 const hex=String(value).trim().match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i);
 if(hex){const h=hex[1].length===3?[...hex[1]].map(c=>c+c).join(''):hex[1];return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),1]}
 const match=String(value).match(/^rgba?\(([^)]+)\)$/i);
 if(!match)return null;
 const channels=match[1].split(/[,\s/]+/).filter(Boolean);
 return channels.map((v,i)=>v.endsWith('%')?parseFloat(v)*(i<3?2.55:.01):parseFloat(v)).concat(channels.length===3?[1]:[]);
}
function matchesBackground(color,background){
 const a=rgba(color),b=rgba(background);
 return !!(a&&b&&b[3]>0&&Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<=24);
}
function backdrop(host){
 const layers=[];
 for(let el=host;el;el=el.parentElement){
  const color=rgba(getComputedStyle(el).backgroundColor);
  if(color&&color[3]>0)layers.push(color);
  if(color&&color[3]>=1)break;
 }
 let result=[255,255,255];
 for(let i=layers.length-1;i>=0;i--){const c=layers[i];result=result.map((v,j)=>Math.round(c[j]*c[3]+v*(1-c[3])))}
 return '#'+result.map(v=>v.toString(16).padStart(2,'0')).join('');
}
function tonalPair(mode,enabled,rng,background){
 const bases=enabled.filter(c=>c!=='#FFFFFF');
 const pool=bases.length?bases:enabled;
 const base=pool[Math.floor(rng()*pool.length)];
 const safe=colors.filter(c=>c!==base&&!matchesBackground(c,background));
 const useWhite=mode==='white'||(mode==='tonal'&&rng()<.5);
 const neighbors=(nearColors[base]||[]).filter(c=>safe.includes(c));
 const accents=useWhite&&safe.includes('#FFFFFF')?['#FFFFFF']:neighbors.length?neighbors:safe;
 return [base,accents[Math.floor(rng()*accents.length)]||base];
}

const defaults={count:8,width:80,length:170,min:0,max:45,negative:true,segments:'mixed',silhouette:'mixed',mode:'tonal',colors,seed:null,interactive:true,scale:1,mobileScale:.5,mobile:false,avoidBackground:true,backgroundColor:null};
const instances=new WeakMap();
function number(v,fallback,lo,hi){v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback}
function normalize(input){
 const o={...defaults,...input};
 o.scale=number(o.scale,1,.1,2);o.mobileScale=number(o.mobileScale,.5,.1,1);
 o.count=Math.round(number(o.count,8,1,100));o.width=number(o.width,80,1,200);o.length=number(o.length,170,1,1000);
 o.min=number(o.min,0,-90,90);o.max=number(o.max,45,o.min,90);
 o.segments=['1','2','3'].includes(String(o.segments))?Number(o.segments):'mixed';
 o.silhouette=['mixed','fan','crossed-dash'].includes(o.silhouette)?o.silhouette:'mixed';
 o.mode=['free','tonal','white','near'].includes(o.mode)?o.mode:'tonal';
 o.colors=Array.isArray(o.colors)?o.colors.map(c=>String(c).toUpperCase()).filter(c=>colors.includes(c)):colors;
 if(!o.colors.length)o.colors=[...colors];
 const background=o.avoidBackground?o.backgroundColor:null;
 o.colors=o.colors.filter(c=>!matchesBackground(c,background));
 if(!o.colors.length)o.colors=colors.filter(c=>!matchesBackground(c,background));
 o.seed=o.seed==null?randomSeed():number(o.seed,1,0,4294967295);
 return o;
}
function layout(W,H,input={}){
 const o=normalize(input),scale=o.scale*(o.mobile?o.mobileScale:1);
 const diameter=2*(o.length+o.width/2)*scale+48;
 const cols=Math.min(o.count,Math.max(1,Math.floor(W/diameter))),rows=Math.ceil(o.count/cols);
 return {width:Math.max(W,cols*diameter),height:Math.max(H,rows*diameter),cols,rows,scale};
}
function markup(W,H,input){
 W=Number(W);H=Number(H);if(!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0)return "";
 const o=normalize(input),rng=seeded(o.seed);
 // Dimensions affect placement only. Stroke width and length never auto-fit.
 const board=layout(W,H,o),cols=board.cols,rows=board.rows,cw=board.width/cols,ch=board.height/rows;
 const scale=board.scale,width=o.width*scale,len=o.length*scale;
 const edge=8,dragLimit=16;
 let result='';
 for(let i=0;i<o.count;i++){
  const crossed=o.silhouette==='crossed-dash'||(o.silhouette==='mixed'&&o.segments==='mixed'&&rng()<.25);
  const n=o.segments==='mixed'?1+Math.floor(rng()*3):o.segments;
  const flip=rng()>.5?-1:1,angles=fanAngles(n,o.min,o.max,o.negative,rng),center=(angles[0]+angles[n-1])/2;
  const length=len*(.9+rng()*.1);
  const ends=angles.map(a=>[Math.cos(a*Math.PI/180)*length*flip,Math.sin(a*Math.PI/180)*length]);
  const envelope=length+width/2+dragLimit+edge;
  const slackX=Math.max(0,cw-2*envelope),slackY=Math.max(0,ch-2*envelope);
  const x=(i%cols)*cw+envelope+slackX*rng(),y=Math.floor(i/cols)*ch+envelope+slackY*rng();
  const pair=o.mode==='free'?null:tonalPair(o.mode,o.colors,seeded(o.seed+i*7919),o.avoidBackground?o.backgroundColor:null);let previous='';
  result+=`<g data-am-mark="${i}" data-am-silhouette="${crossed?'crossed-dash':'fan'}" data-x="${x.toFixed(3)}" data-y="${y.toFixed(3)}" style="pointer-events:var(--am-pointer,visiblePainted);cursor:var(--am-cursor,grab)">`;
  if(crossed){
   // A bent, same-color base with an independent contrasting dash over it.
   // All endpoints stay within the reserved circular motion envelope.
   const tilt=(center*.35)*Math.PI/180,c=Math.cos(tilt),s=Math.sin(tilt);
   const point=(px,py)=>[x+(px*c-py*s)*length*flip,y+(px*s+py*c)*length];
   const base=pair?pair[0]:o.colors[Math.floor(rng()*o.colors.length)];
   const accents=o.colors.filter(color=>color!==base);
   const accent=pair?pair[1]:(accents.length?accents[Math.floor(rng()*accents.length)]:base);
   const segments=[[-.8,.5,.1,-.5],[-.8,.5,.85,.15],[-.65,-.65,.65,.55]];
   segments.forEach((coords,j)=>{
    const a=point(coords[0],coords[1]),b=point(coords[2],coords[3]);
    result+=`<line data-am-part="${j===2?'dash':'base'}" x1="${a[0].toFixed(3)}" y1="${a[1].toFixed(3)}" x2="${b[0].toFixed(3)}" y2="${b[1].toFixed(3)}" stroke="${j===2?accent:base}" stroke-width="${width.toFixed(3)}" stroke-linecap="round" pathLength="1" class="am-draw-stroke" style="--draw-delay:${i*65+j*100}ms"/>`;
   });
  }else for(let j=0;j<n;j++){
   let choices=o.colors.filter(c=>c!==previous);if(!choices.length)choices=o.colors;
   const freeColor=choices[Math.floor(rng()*choices.length)],color=pair?pair[j%2]:freeColor;previous=color;
   result+=`<g class="am-fan-stroke" style="transform-origin:${x.toFixed(3)}px ${y.toFixed(3)}px;--fan-start:${((center-angles[j])*flip).toFixed(3)}deg;--fan-delay:${i*65}ms"><line x1="${x.toFixed(3)}" y1="${y.toFixed(3)}" x2="${(x+ends[j][0]).toFixed(3)}" y2="${(y+ends[j][1]).toFixed(3)}" stroke="${color}" stroke-width="${width.toFixed(3)}" stroke-linecap="round" pathLength="1" class="am-draw-stroke" style="--draw-delay:${i*65+j*70}ms"/></g>`;
  }
  result+='</g>';
 }
 return result;
}
function mount(target,input={}){
 const host=typeof target==='string'?document.querySelector(target):target;
 if(!host)return null;
 if(instances.has(host)){const api=instances.get(host);api.update(input);return api}
 let options=normalize(input),destroyed=false,painted=false,lastWidth=0,lastHeight=0,resizeFrame=0,backgroundFrame=0,lastBackground=null;
 const oldPosition=host.style.position;
 if(getComputedStyle(host).position==='static')host.style.position='relative';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 svg.style.cssText='position:absolute;left:0;top:0;display:block;overflow:visible;z-index:0;';
 host.prepend(svg);
 let drag=null,frame=0,lines=[];
 const mobile=global.matchMedia('(max-width: 991px)');
 const reduced=global.matchMedia('(prefers-reduced-motion: reduce)');
 function reset(){drag=null;cancelAnimationFrame(frame);frame=0;lines.forEach(l=>l.el.removeAttribute('transform'));lines=[];svg.style.setProperty('--am-cursor','grab')}
 function draw(animate=false){
  if(destroyed)return;
  const w=host.clientWidth,h=host.clientHeight;
  if(!w)return;
  reset();lastWidth=w;lastHeight=h;
  const board=layout(w,h,{...options,mobile:mobile.matches});
  const rect=host.getBoundingClientRect(),section=host.closest('section, .section');
  const bounds=section?section.getBoundingClientRect():null;
  const minX=Math.max(0,bounds?bounds.left:0),maxX=Math.max(minX,Math.min(document.documentElement.clientWidth,bounds?bounds.right:document.documentElement.clientWidth)-board.width);
  const desiredX=rect.left+(w-board.width)/2;
  const minY=bounds?bounds.top:rect.top,maxY=bounds?Math.max(minY,bounds.bottom-board.height):rect.top;
  const desiredY=rect.top+(h-board.height)/2;
  svg.style.width=board.width+'px';svg.style.height=board.height+'px';
  svg.style.left=(Math.max(minX,Math.min(maxX,desiredX))-rect.left-host.clientLeft)+'px';
  svg.style.top=(Math.max(minY,Math.min(maxY,desiredY))-rect.top-host.clientTop)+'px';
  svg.setAttribute('viewBox',`0 0 ${board.width} ${board.height}`);
  lastBackground=options.backgroundColor||backdrop(host);
  svg.setAttribute("data-am-background",lastBackground);
  svg.innerHTML=(animate||!painted?`<style>${drawStyles}</style>`:'')+markup(w,h,{...options,mobile:mobile.matches,backgroundColor:lastBackground});
  svg.style.pointerEvents='none';svg.style.setProperty('--am-pointer',options.interactive?'visiblePainted':'none');svg.style.touchAction='pan-y';painted=true;
 }
 function point(e){const m=svg.getScreenCTM();return new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse())}
 function tick(){
  let unsettled=false;
  for(const l of lines){
   const tx=drag?drag.dx*l.weight:0,ty=drag?drag.dy*l.weight:0,ta=drag?(drag.dx-drag.dy)*l.twist:0,ease=reduced.matches?1:drag?.18:.12;
   l.x+=(tx-l.x)*ease;l.y+=(ty-l.y)*ease;l.a+=(ta-l.a)*ease;
   if(Math.abs(tx-l.x)+Math.abs(ty-l.y)+Math.abs(ta-l.a)>.02)unsettled=true;
   l.el.setAttribute('transform',`translate(${l.x} ${l.y}) rotate(${l.a} ${l.cx} ${l.cy})`);
  }
  if(unsettled)frame=requestAnimationFrame(tick);else{frame=0;if(!drag){lines.forEach(l=>l.el.removeAttribute('transform'));lines=[]}}
 }
 function start(){if(!frame)frame=requestAnimationFrame(tick)}
 function release(e){if(!drag||drag.id!==e.pointerId)return;drag=null;svg.style.setProperty('--am-cursor','grab');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);start()}
 svg.addEventListener('pointerdown',e=>{
  if(!options.interactive||drag||e.button!==0)return;
  const mark=e.target.closest('[data-am-mark]');if(!mark||!svg.contains(mark))return;
  reset();const p=point(e);drag={id:e.pointerId,p,dx:0,dy:0};
  lines=[{el:mark,cx:+mark.getAttribute('data-x'),cy:+mark.getAttribute('data-y'),x:0,y:0,a:0,weight:1,twist:.045}];
  svg.setPointerCapture(e.pointerId);svg.style.setProperty('--am-cursor','grabbing');
 });
 svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e),dx=p.x-drag.p.x,dy=p.y-drag.p.y,d=Math.hypot(dx,dy),scale=d?16*Math.tanh(d/180)/d:0;drag.dx=dx*scale;drag.dy=dy*scale;start()});
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,release));
 const blur=()=>{if(drag)release({pointerId:drag.id})};global.addEventListener('blur',blur);
 function refreshBackground(){
  cancelAnimationFrame(backgroundFrame);
  backgroundFrame=requestAnimationFrame(()=>{
   if(!destroyed&&(options.backgroundColor||backdrop(host))!==lastBackground)draw(false);
  });
 }
 const backgroundObserver=new MutationObserver(refreshBackground);
 const ancestors=[];
 for(let el=host;el;el=el.parentElement){
  ancestors.push(el);backgroundObserver.observe(el,{attributes:true,attributeFilter:['class','style']});
  el.addEventListener('transitionend',refreshBackground);
 }
 const onMobileChange=()=>draw(false);mobile.addEventListener("change",onMobileChange);
 const onViewportResize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>draw(false))};global.addEventListener("resize",onViewportResize,{passive:true});
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(lastWidth!==host.clientWidth||lastHeight!==host.clientHeight)draw(false)})});
 observer.observe(host);
 const api={regenerate(){options.seed=randomSeed();draw(true)},update(next){options=normalize({...options,...next});draw(false)},destroy(){destroyed=true;observer.disconnect();backgroundObserver.disconnect();cancelAnimationFrame(backgroundFrame);ancestors.forEach(el=>el.removeEventListener('transitionend',refreshBackground));cancelAnimationFrame(resizeFrame);reset();global.removeEventListener('blur',blur);global.removeEventListener('resize',onViewportResize);mobile.removeEventListener('change',onMobileChange);svg.remove();if(host.style.position==='relative')host.style.position=oldPosition;instances.delete(host)}};
 instances.set(host,api);draw(true);return api;
}
global.AngleMarks={mount,markup,layout,styles:drawStyles};
function autoMount(){
 document.querySelectorAll('#angle-mark, [data-angle-marks]').forEach(host=>{
  if(instances.has(host))return;
  const options={};
  if(host.dataset.angleBackground)options.backgroundColor=host.dataset.angleBackground;
  if(host.dataset.angleSilhouette)options.silhouette=host.dataset.angleSilhouette;
  if(host.dataset.angleScale)options.scale=host.dataset.angleScale;
  if(host.dataset.angleCount)options.count=host.dataset.angleCount;
  if(host.dataset.angleWidth)options.width=host.dataset.angleWidth;
  if(host.dataset.angleLength)options.length=host.dataset.angleLength;
  if(host.dataset.angleInteractive==='false')options.interactive=false;
  mount(host,options);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoMount,{once:true});
else autoMount();
})(window);
