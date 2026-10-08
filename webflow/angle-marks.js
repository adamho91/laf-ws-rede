/* Angle Marks — Webflow adapter, adapted from the supplied angle-marks.js.
 * No dependencies. Auto-mounts #angle-mark and [data-angle-marks] after DOM ready.
 * Optional attributes: data-angle-scale="2", data-angle-count="8".
 * Desktop (>=1440px) lines use 92% length with unchanged 80px strokes.
 * Tablets/small laptops (768–1439px): 60px strokes, 20% shorter lines; phones (<=767px): half-length lines, 50px strokes, and a tighter angle spread. Header silhouettes are chosen without repeats.
 */
(function(global){
'use strict';
if(global.AngleMarks)return;
const drawStyles = `.am-draw-stroke{stroke-dasharray:1 1;animation:am-draw-line 650ms cubic-bezier(.22,.61,.36,1) var(--draw-delay,0ms) both}@keyframes am-draw-line{0%{stroke-dashoffset:1;opacity:0}1%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}.am-fan-stroke{transform-box:view-box;animation:am-fan-open 800ms cubic-bezier(.22,.61,.36,1) var(--fan-delay,0ms) both}@keyframes am-fan-open{from{transform:rotate(var(--fan-start,0deg))}to{transform:rotate(0deg)}}.am-joint-cap{animation:am-joint-appear 1ms steps(1,end) var(--joint-delay,0ms) both}@keyframes am-joint-appear{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){.am-draw-stroke,.am-fan-stroke,.am-joint-cap{animation:none;stroke-dashoffset:0}}`;
const colors=['#99EDFF','#FFFFFF','#3FB5FE','#EC0648','#115EF3','#403700','#ADFF00','#D5BBFF','#F57EC3'];
function randomSeed(){return global.crypto&&global.crypto.getRandomValues?global.crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)}
function seeded(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const maxDragAngle=7,doubleFanMaxOpening=60;
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
 const angles=Array.from({length:n},(_,j)=>sample(start+(end-start)*j/(n-1)));
 if(n===2){
  // Reserve room for both strokes' drag rotation so the opening never exceeds 60deg.
  const middle=(angles[0]+angles[1])/2,half=Math.min((angles[1]-angles[0])/2,(doubleFanMaxOpening-2*maxDragAngle)/2);
  return [middle-half,middle+half];
 }
 return angles;
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

const defaults={count:8,width:80,length:269.61648,min:0,max:45,negative:true,segments:'mixed',silhouette:'mixed',mode:'tonal',colors,seed:null,interactive:true,scale:1,mobileScale:.5,mobileStrokeAdd:10,mobileAngleScale:2/3,mobileFit:false,mobile:false,compact:false,avoidBackground:true,backgroundColor:null};
// Explicit visual types: mirrored/rotated versions still count as the same silhouette.
const silhouettes=Object.freeze({
 single:Object.freeze({family:'fan',segments:1}),
 double:Object.freeze({family:'fan',segments:2}),
 triple:Object.freeze({family:'fan',segments:3}),
 'crossed-dash':Object.freeze({family:'crossed-dash',segments:3})
});
const silhouetteTypes=Object.keys(silhouettes);
const instances=new WeakMap(),headerGroups=new WeakMap();
function silhouettePool(o){
 if(silhouetteTypes.includes(o.silhouette))return [o.silhouette];
 if(o.segments!=='mixed')return [silhouetteTypes[o.segments-1]];
 return o.silhouette==='fan'?silhouetteTypes.slice(0,3):silhouetteTypes;
}
function chooseSilhouette(o,rng,used=[]){
 const preferred=silhouettePool(o);
 let pool=preferred.filter(type=>!used.includes(type));
 // Header uniqueness takes priority if two containers request the same type.
 if(!pool.length)pool=silhouetteTypes.filter(type=>!used.includes(type));
 // More than four marks exhaust the catalog; start a fresh selection cycle.
 if(!pool.length)pool=preferred;
 return pool[Math.floor(rng()*pool.length)];
}
function headerGroup(host){
 if(!host.matches('#angle-mark-header-shapes, #angle-mark-header-block, .header-shapes, .header-block'))return null;
 const scope=host.closest('header, section, .section')||document;
 if(!headerGroups.has(scope))headerGroups.set(scope,new Map());
 return headerGroups.get(scope);
}
function number(v,fallback,lo,hi){v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback}
function normalize(input){
 const o={...defaults,...input};
 o.scale=number(o.scale,1,.1,2);o.mobileScale=number(o.mobileScale,.5,.1,1);
 o.mobileStrokeAdd=number(o.mobileStrokeAdd,10,0,100);o.mobileAngleScale=number(o.mobileAngleScale,2/3,.1,1);
 o.count=Math.round(number(o.count,8,1,100));o.width=number(o.width,80,1,200);o.length=number(o.length,269.61648,1,1000);
 o.min=number(o.min,0,-90,90);o.max=number(o.max,45,o.min,90);
 o.segments=['1','2','3'].includes(String(o.segments))?Number(o.segments):'mixed';
 o.silhouette=['mixed','fan',...silhouetteTypes].includes(o.silhouette)?o.silhouette:'mixed';
 o.mode=['free','tonal','white','near'].includes(o.mode)?o.mode:'tonal';
 // Explicit page palettes may include brand colors outside the default palette.
 o.colors=Array.isArray(o.colors)?o.colors.map(c=>String(c).trim().toUpperCase()).filter(c=>/^#[0-9A-F]{6}$/.test(c)):colors;
 if(!o.colors.length)o.colors=[...colors];
 const background=o.avoidBackground?o.backgroundColor:null;
 o.colors=o.colors.filter(c=>!matchesBackground(c,background));
 if(!o.colors.length)o.colors=colors.filter(c=>!matchesBackground(c,background));
 o.seed=o.seed==null?randomSeed():number(o.seed,1,0,4294967295);
 return o;
}
function layout(W,H,input={}){
 const o=normalize(input),scale=o.scale*(o.mobile?o.mobileScale:o.compact?.8:.92);
 const strokeScale=o.scale*(o.mobile?o.mobileScale+o.mobileStrokeAdd/o.width:o.compact?.75:1);
 const diameter=2*(o.length*scale+o.width*strokeScale/2)+48;
 const cols=Math.min(o.count,Math.max(1,Math.floor(W/diameter))),rows=Math.ceil(o.count/cols);
 return {width:Math.max(W,cols*diameter),height:Math.max(H,rows*diameter),cols,rows,scale,strokeScale};
}
function markup(W,H,input){
 W=Number(W);H=Number(H);if(!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0)return "";
 const o=normalize(input),rng=seeded(o.seed);
 // Dimensions affect placement only. Stroke width and length never auto-fit.
 const board=layout(W,H,o),cols=board.cols,rows=board.rows,cw=board.width/cols,ch=board.height/rows;
 const scale=board.scale,width=o.width*board.strokeScale,len=o.length*scale;
 const edge=8,dragLimit=16;
 let result='';
 for(let i=0;i<o.count;i++){
  const type=o.assignedSilhouettes?.[i]||chooseSilhouette(o,rng);
  const shape=silhouettes[type],crossed=shape.family==='crossed-dash',n=shape.segments;
  const flip=rng()>.5?-1:1,angleScale=o.mobile?o.mobileAngleScale:1,angles=fanAngles(n,o.min*angleScale,o.max*angleScale,o.negative,rng),center=(angles[0]+angles[n-1])/2;
  rng(); // Preserve the seeded color/orientation sequence; lengths no longer vary.
  const length=len;
  const ends=angles.map(a=>[Math.cos(a*Math.PI/180)*length*flip,Math.sin(a*Math.PI/180)*length]);
  const envelope=length+width/2+dragLimit+edge;
  const slackX=Math.max(0,cw-2*envelope),slackY=Math.max(0,ch-2*envelope);
  const x=(i%cols)*cw+envelope+slackX*rng(),y=Math.floor(i/cols)*ch+envelope+slackY*rng();
  const pair=o.mode==='free'?null:tonalPair(o.mode,o.colors,seeded(o.seed+i*7919),o.avoidBackground?o.backgroundColor:null);let previous='';
  result+=`<g data-am-mark="${i}" data-am-silhouette="${type}" data-x="${x.toFixed(3)}" data-y="${y.toFixed(3)}" style="pointer-events:var(--am-pointer,visiblePainted);cursor:var(--am-cursor,grab)">`;
  if(crossed){
   // A bent, same-color base with an independent contrasting dash over it.
   // All endpoints stay within the reserved circular motion envelope.
   const tilt=(center*.35)*Math.PI/180,c=Math.cos(tilt),s=Math.sin(tilt);
   const point=(px,py)=>[x+(px*c-py*s)*flip,y+(px*s+py*c)];
   const base=pair?pair[0]:o.colors[Math.floor(rng()*o.colors.length)];
   const accents=o.colors.filter(color=>color!==base);
   const accent=pair?pair[1]:(accents.length?accents[Math.floor(rng()*accents.length)]:base);
   const segments=[[-.8,.5,.1,-.5],[-.8,.5,.85,.15],[-.65,-.65,.65,.55]];
   const reference=Math.hypot(1.3,1.2);
   segments.forEach((coords,j)=>{
    const dx=coords[2]-coords[0],dy=coords[3]-coords[1],distance=Math.hypot(dx,dy);
    let ax=coords[0]*length/reference,ay=coords[1]*length/reference;
    // Base strokes retain their shared joint; the crossing dash retains its midpoint.
    if(j===2){
     ax=(coords[0]+coords[2])*length/(2*reference)-dx/distance*length/2;
     ay=(coords[1]+coords[3])*length/(2*reference)-dy/distance*length/2;
    }
    const a=point(ax,ay),b=point(ax+dx/distance*length,ay+dy/distance*length);
    result+=`<line data-am-part="${j===2?'dash':'base'}" x1="${a[0].toFixed(3)}" y1="${a[1].toFixed(3)}" x2="${b[0].toFixed(3)}" y2="${b[1].toFixed(3)}" stroke="${j===2?accent:base}" stroke-width="${width.toFixed(3)}" stroke-linecap="round" pathLength="1" class="am-draw-stroke" style="--draw-delay:${i*65+j*100}ms"/>`;
   });
  }else for(let j=0;j<n;j++){
   let choices=o.colors.filter(c=>c!==previous);if(!choices.length)choices=o.colors;
   const freeColor=choices[Math.floor(rng()*choices.length)],color=pair?pair[j%2]:freeColor;previous=color;
   result+=`<g class="am-fan-stroke" style="transform-origin:${x.toFixed(3)}px ${y.toFixed(3)}px;--fan-start:${((center-angles[j])*flip).toFixed(3)}deg;--fan-delay:${i*65}ms"><line x1="${x.toFixed(3)}" y1="${y.toFixed(3)}" x2="${(x+ends[j][0]).toFixed(3)}" y2="${(y+ends[j][1]).toFixed(3)}" stroke="${color}" stroke-width="${width.toFixed(3)}" stroke-linecap="round" pathLength="1" class="am-draw-stroke" style="--draw-delay:${i*65+j*70}ms"/></g>`;
  }
  if(!crossed&&n>1){
   // Coincident round caps rasterize differently at different stroke angles.
   // Seal their shared pivot with the top stroke's color and a subpixel bleed
   // so the lower colors cannot fringe through, including during angle drags.
   const bleed=Math.min(.75,width*.025),radius=width/2+bleed;
   result+=`<circle data-am-joint-cap="true" cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${radius.toFixed(3)}" fill="${previous}" class="am-joint-cap" style="--joint-delay:${i*65+(n-1)*70+8}ms"/>`;
  }
  result+='</g>';
 }
 return result;
}
// A shared fitting envelope preserves equal primitive lengths across silhouettes.
// Convert the stroke to viewBox units instead of relying on SVG vector-effect,
// which can differ when WebKit also transforms the animated stroke groups.
function fitMobile(svg,w,h){
 const strokes=[...svg.querySelectorAll('line')];
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,length=0;
 for(const line of strokes){
  const x1=+line.getAttribute('x1'),y1=+line.getAttribute('y1'),x2=+line.getAttribute('x2'),y2=+line.getAttribute('y2');
  minX=Math.min(minX,x1,x2);maxX=Math.max(maxX,x1,x2);
  minY=Math.min(minY,y1,y2);maxY=Math.max(maxY,y1,y2);
  length=Math.max(length,Math.hypot(x2-x1,y2-y1));
 }
 const stroke=40,inset=12;
 const scale=Math.min(.8,(w-stroke-inset*2)/(length*1.3),(h-stroke-inset*2)/(length*1.3));
 if(!Number.isFinite(scale)||scale<=0||!length)return;
 const width=w/scale,height=h/scale;
 svg.setAttribute('viewBox',[(minX+maxX-width)/2,(minY+maxY-height)/2,width,height].join(' '));
 svg.style.width=w+'px';svg.style.height=h+'px';svg.style.left='0px';svg.style.top='0px';
 strokes.forEach(line=>line.setAttribute('stroke-width',String(stroke/scale)));
 svg.querySelectorAll('[data-am-joint-cap]').forEach(cap=>cap.setAttribute('r',String((stroke/2+.5)/scale)));
 svg.setAttribute('data-am-mobile-fit','true');
}
function mount(target,input={}){
 const host=typeof target==='string'?document.querySelector(target):target;
 if(!host)return null;
 if(instances.has(host)){const api=instances.get(host);api.update(input);return api}
 const group=headerGroup(host);
 let assignedSilhouettes=null;
 function assignSilhouettes(){
  if(!group)return;
  const used=[...group.entries()].filter(([other])=>other!==host&&other.isConnected).flatMap(([,types])=>types);
  const rng=seeded(options.seed);
  assignedSilhouettes=Array.from({length:options.count},()=>{const type=chooseSilhouette(options,rng,used);used.push(type);return type});
  group.set(host,assignedSilhouettes);
 }
 let options=normalize({mobileFit:host.hasAttribute('data-angle-mobile-fit'),...input}),destroyed=false,painted=false,lastWidth=0,lastHeight=0,lastViewportWidth=0,resizeFrame=0,backgroundFrame=0,lastBackground=null;
 assignSilhouettes();
 const oldPosition=host.style.position;
 if(getComputedStyle(host).position==='static')host.style.position='relative';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 svg.style.cssText='position:absolute;left:0;top:0;display:block;overflow:visible;z-index:0;';
 host.prepend(svg);
 let drag=null,frame=0,lines=[];
 const mobile=global.matchMedia('(max-width: 767px)');
 const compact=global.matchMedia('(max-width: 1439px)');
 const reduced=global.matchMedia('(prefers-reduced-motion: reduce)');
 function reset(){const pointerId=drag?.id;drag=null;if(pointerId!=null&&svg.hasPointerCapture(pointerId))svg.releasePointerCapture(pointerId);cancelAnimationFrame(frame);frame=0;lines.forEach(l=>l.el.removeAttribute('transform'));lines=[];svg.style.setProperty('--am-cursor','grab')}
 function draw(animate=false){
  if(destroyed)return;
  const w=host.clientWidth,h=host.clientHeight;
  if(!w)return;
  reset();lastWidth=w;lastHeight=h;lastViewportWidth=document.documentElement.clientWidth;
  const sizing={mobile:mobile.matches,compact:!mobile.matches&&compact.matches};
  const board=layout(w,h,{...options,...sizing});
  // Keep the visual anchor tied to the crossing-dash footprint, rather than
  // shifting marks when the full rotational safety canvas grows for long fans.
  const anchor=layout(w,h,{...options,length:options.length/Math.hypot(1.3,1.2),...sizing});
  const rect=host.getBoundingClientRect(),section=host.closest('section, .section');
  const bounds=section?section.getBoundingClientRect():null;
  const minX=Math.max(0,bounds?bounds.left:0),maxX=Math.max(minX,Math.min(document.documentElement.clientWidth,bounds?bounds.right:document.documentElement.clientWidth)-anchor.width);
  const desiredX=rect.left+(w-anchor.width)/2;
  const minY=bounds?bounds.top:rect.top,maxY=bounds?Math.max(minY,bounds.bottom-anchor.height):rect.top;
  const desiredY=rect.top+(h-anchor.height)/2;
  svg.style.width=board.width+'px';svg.style.height=board.height+'px';
  svg.style.left=(Math.max(minX,Math.min(maxX,desiredX))-(board.width-anchor.width)/2-rect.left-host.clientLeft)+'px';
  svg.style.top=(Math.max(minY,Math.min(maxY,desiredY))-(board.height-anchor.height)/2-rect.top-host.clientTop)+'px';
  svg.setAttribute('viewBox',`0 0 ${board.width} ${board.height}`);
  lastBackground=options.backgroundColor||backdrop(host);
  svg.setAttribute("data-am-background",lastBackground);
  svg.innerHTML=(animate||!painted?`<style>${drawStyles}</style>`:'')+markup(w,h,{...options,assignedSilhouettes,...sizing,backgroundColor:lastBackground});
  svg.removeAttribute('data-am-mobile-fit');
  // Fit synchronously, before the browser can paint an oversized intermediate frame.
  if(sizing.mobile&&options.mobileFit&&options.count===1)fitMobile(svg,w,h);
  svg.style.pointerEvents='none';svg.style.setProperty('--am-pointer',options.interactive?'visiblePainted':'none');svg.style.touchAction='pan-y';painted=true;
 }
 function point(e){const m=svg.getScreenCTM();return new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse())}
 function tick(){
  let unsettled=false;
  for(const l of lines){
   // Drag perpendicular to each stroke to open/close its angle independently.
   // Rotate about the mark's original pivot; never translate or exceed +/-7deg.
   const ta=drag?Math.max(-maxDragAngle,Math.min(maxDragAngle,(drag.dx*l.nx+drag.dy*l.ny)*maxDragAngle/120)):0;
   const ease=reduced.matches?1:drag?.18:.12;
   l.a+=(ta-l.a)*ease;
   if(Math.abs(ta-l.a)>.02)unsettled=true;
   l.el.setAttribute('transform',`rotate(${l.a} ${l.cx} ${l.cy})`);
  }
  if(unsettled)frame=requestAnimationFrame(tick);else{frame=0;if(!drag){lines.forEach(l=>l.el.removeAttribute('transform'));lines=[]}}
 }
 function start(){if(!frame)frame=requestAnimationFrame(tick)}
 function release(e){if(!drag||drag.id!==e.pointerId)return;drag=null;svg.style.setProperty('--am-cursor','grab');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);start()}
 svg.addEventListener('pointerdown',e=>{
  if(!options.interactive||drag||e.button!==0)return;
  const mark=e.target.closest('[data-am-mark]');if(!mark||!svg.contains(mark))return;
  reset();const p=point(e);drag={id:e.pointerId,p,dx:0,dy:0};
  const cx=+mark.getAttribute('data-x'),cy=+mark.getAttribute('data-y');
  lines=[...mark.querySelectorAll('line')].map(el=>{
   const dx=+el.getAttribute('x2')-el.getAttribute('x1'),dy=+el.getAttribute('y2')-el.getAttribute('y1'),length=Math.hypot(dx,dy)||1;
   return {el,cx,cy,a:0,nx:-dy/length,ny:dx/length};
  });
  svg.setPointerCapture(e.pointerId);svg.style.setProperty('--am-cursor','grabbing');
 });
 svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);drag.dx=p.x-drag.p.x;drag.dy=p.y-drag.p.y;start()});
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
 const onMobileChange=()=>draw(false);mobile.addEventListener("change",onMobileChange);compact.addEventListener("change",onMobileChange);
 const onViewportResize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
  // Mobile browser chrome changes viewport height during scrolling. Leave the
  // current drawing/drag untouched unless its width or native slot changed.
  if(lastViewportWidth!==document.documentElement.clientWidth||lastWidth!==host.clientWidth||lastHeight!==host.clientHeight)draw(false);
 })};global.addEventListener("resize",onViewportResize,{passive:true});
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(lastWidth!==host.clientWidth||lastHeight!==host.clientHeight)draw(false)})});
 observer.observe(host);
 const api={regenerate(){options.seed=randomSeed();assignSilhouettes();draw(true)},update(next){options=normalize({...options,...next});if(['seed','count','silhouette','segments'].some(key=>Object.prototype.hasOwnProperty.call(next,key)))assignSilhouettes();draw(false)},destroy(){destroyed=true;if(group)group.delete(host);observer.disconnect();backgroundObserver.disconnect();cancelAnimationFrame(backgroundFrame);ancestors.forEach(el=>el.removeEventListener('transitionend',refreshBackground));cancelAnimationFrame(resizeFrame);reset();global.removeEventListener('blur',blur);global.removeEventListener('resize',onViewportResize);mobile.removeEventListener('change',onMobileChange);compact.removeEventListener('change',onMobileChange);svg.remove();if(host.style.position==='relative')host.style.position=oldPosition;instances.delete(host)}};
 instances.set(host,api);draw(true);return api;
}
global.AngleMarks={mount,markup,layout,silhouettes,styles:drawStyles};
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
