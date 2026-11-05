import { seededRandom } from './architecture.js';
import { createSpatialIndex, footprint, overlaps } from './spatial.js';
import { landmarkKeepOuts } from './streetGrid.js';
import { sampleHeight } from './heightfield.js';
import { isLand } from '../geo/coastline.js';
import { worldToLonLat } from '../geo/projection.js';

export function roadFootprints(flat) {
  const roads=[];
  for(let i=0;i<flat.length;i+=12){
    const a=[flat[i+3]-flat[i],flat[i+5]-flat[i+2]],b=[flat[i+9]-flat[i],flat[i+11]-flat[i+2]];
    const la=Math.hypot(...a),lb=Math.hypot(...b),e=la>lb?a:b;
    roads.push({x:(flat[i]+flat[i+6])/2,z:(flat[i+2]+flat[i+8])/2,
      w:Math.min(la,lb),d:Math.max(la,lb),rotY:Math.atan2(e[0],e[1]),
      y:(flat[i+1]+flat[i+4]+flat[i+7]+flat[i+10])/4});
  }
  return roads;
}

// Furniture is placed on verified sidewalk pockets, never through a crossing,
// building parcel or landmark. Markings use the source road rectangle.
export function planStreetFurniture(city) {
  const index=createSpatialIndex(),roadIndex=createSpatialIndex(),placed=createSpatialIndex();
  for(const lot of [...city.lots,...city.parks,...landmarkKeepOuts()])index.insert(lot);
  const roads=roadFootprints(city.roads);
  roads.forEach(road=>roadIndex.insert(road));
  const parts=[],markings=[],placements=[],counts={shelters:0,benches:0,bins:0,railings:0,crosswalks:0};
  const r=seededRandom(98717),metal=[.17,.25,.25],wood=[.43,.29,.16];
  for(let i=0;i<roads.length;i++){
    const road=roads[i];if(road.d<21||road.w<10||road.w>25)continue;
    const c=Math.cos(road.rotY),s=Math.sin(road.rotY);
    if(i%137===0){
      for(let x=-road.w*.4;x<road.w*.4;x+=1.5)markings.push({
        x:road.x+c*x,z:road.z-s*x,y0:road.y+.08,w:.8,d:3.8,h:.035,rot:road.rotY,tint:[.76,.74,.59],shape:'box'});
      counts.crosswalks++;
    }
    if(i%23!==0)continue;
    const side=r()>.5?1:-1,offset=side*(road.w/2+2.5);
    const site={x:road.x+c*offset,z:road.z-s*offset,w:2.6,d:8,rotY:road.rotY};
    if(index.nearby(site).some(p=>overlaps(site,p,.6))||roadIndex.nearby(site).some(p=>overlaps(site,p,.4))||placed.nearby(site).some(p=>overlaps(site,p,3)))continue;
    const corners=footprint(site),heights=corners.map(p=>sampleHeight(p.x,p.z));
    if(corners.some(p=>{const ll=worldToLonLat(p.x,p.z);return !isLand(ll.lon,ll.lat);})||Math.max(...heights)-Math.min(...heights)>1.2)continue;
    const y=Math.max(...heights)+.12;
    const add=(x,z,h0,w,d,h,tint=metal,kind='furniture')=>parts.push({
      x:site.x+c*x+s*z,z:site.z-s*x+c*z,y0:y+h0,w,d,h,rot:road.rotY,tint,shape:'box',kind});
    const modern=index.nearby({...site,w:120,d:120}).some(p=>p.district==='central');
    const shelter=r()<(modern?.48:.25);
    site.kind=shelter?'shelter':'bench';placements.push(site);placed.insert(site);
    if(shelter){
      for(const z of [-3,3])add(.65,z,0,.12,.12,2.65);
      add(0,0,2.65,2.45,7,.18,modern?[.58,.66,.65]:[.23,.42,.32],'shelter-roof');
      add(.72,0,.7,.08,6.1,1.7,[.23,.38,.40]);
      add(.60,-2.25,1,.1,.68,1.35,[.76,.65,.43],'timetable');
      counts.shelters++;
    }
    add(.35,.3,.48,.6,3.6,.13,wood,'bench');
    add(.63,.3,.62,.12,3.6,.62,wood);
    for(const z of [-1.2,1.8])add(.35,z,0,.48,.17,.48);
    add(-.15,-3.1,0,.58,.60,.95,modern?metal:[.72,.36,.12],'litter-bin');
    add(-.15,-3.1,.95,.61,.63,.12,[.08,.13,.13]);
    counts.benches++;counts.bins++;
    if(!shelter){
      for(const z of [-3,-1.5,0,1.5,3])add(-1.12,z,0,.08,.08,.96);
      add(-1.12,0,.82,.08,6,.12,[.52,.56,.53],'railing');counts.railings++;
    }
  }
  return {parts,markings,placements,counts};
}

