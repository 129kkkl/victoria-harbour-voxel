import assert from 'node:assert/strict';
import { generateCity, landmarkKeepOuts } from '../src/city/streetGrid.js';
import { planBuilding, ARCHETYPES } from '../src/city/architecture.js';
import { createSpatialIndex, overlaps, footprint } from '../src/city/spatial.js';
import { isLand } from '../src/geo/coastline.js';
import { worldToLonLat } from '../src/geo/projection.js';
import { harbourRoutes } from '../src/water/ferries.js';
import { DISTRICTS } from '../src/geo/districts.js';
import { MODERN_TYPES, HERITAGE_TYPES } from '../src/city/districtArchitecture.js';
import { buildingGeometry, BUILDING_SHAPES } from '../src/city/architectureGeometry.js';
import { planStreetFurniture, roadFootprints } from '../src/city/streetFurniture.js';

let checks = 0;
const check = (label, fn) => { fn(); checks++; console.log('PASS ' + label); };
for (const seed of [20240622, 91, 20261011]) {
  const city = generateCity(seed), types = {}, index = createSpatialIndex();
  check(`${seed}: parcels do not overlap, including gardens`, () => {
    for (const lot of [...city.lots,...city.parks]) {
      assert.ok(!index.nearby(lot).some(other => overlaps(lot,other,2.9)), `${lot.district} overlap`);
      assert.ok(!landmarkKeepOuts().some(other => overlaps(lot,other,3.9)), 'landmark footprint overlap');
      index.insert(lot);
    }
  });
  check(`${seed}: land boundaries and height caps`, () => {
    for (const lot of city.lots) {
      const district=DISTRICTS.find(d=>d.id===lot.district);
      assert.ok(lot.h <= district.cap + .001, `${lot.district} exceeded height cap`);
      for(const p of footprint(lot)) {const ll=worldToLonLat(p.x,p.z);assert.ok(isLand(ll.lon,ll.lat));}
    }
    for(let i=0;i<city.roads.length;i+=3){const ll=worldToLonLat(city.roads[i],city.roads[i+2]);assert.ok(isLand(ll.lon,ll.lat),'road in harbour');}
  });
  check(`${seed}: all architectural parts fit their actual parcel`, () => {
    for (const lot of city.lots) {
      const plan=planBuilding(lot);types[plan.type]=(types[plan.type]||0)+1;
      for(const p of [...plan.bodies,...plan.details,...plan.props,...plan.gardens]){
        assert.ok([p.dx,p.dz,p.y0,p.w,p.d,p.h].every(Number.isFinite));
        assert.ok(p.w>0&&p.d>0&&p.h>0);
        assert.ok(Math.abs(p.dx)+p.w/2<=lot.w/2+.001,`${plan.type}: width`);
        assert.ok(Math.abs(p.dz)+p.d/2<=lot.d/2+.001,`${plan.type}: depth`);
      }
    }
  });
  check(`${seed}: all ${Object.keys(ARCHETYPES).length} silhouettes and all districts are represented`, () => {
    assert.deepEqual(Object.keys(types).sort(),Object.keys(ARCHETYPES).sort());
    assert.ok(DISTRICTS.every(d=>city.lots.some(l=>l.district===d.id)));
  });
  check(`${seed}: stable plans, independent of generation order`, () => {
    const originals=city.lots.slice(0,60).map(planBuilding);
    city.lots.slice(0,60).reverse().map(planBuilding).reverse().forEach((p,i)=>assert.deepEqual(p,originals[i]));
    assert.deepEqual(generateCity(seed).lots,city.lots);
  });
  check(`${seed}: Central has distinct contemporary silhouettes`,()=>{
    const plans=city.lots.filter(l=>l.district==='central').map(planBuilding);
    assert.ok(plans.filter(p=>MODERN_TYPES.includes(p.type)).length/plans.length>.70);
    assert.ok(MODERN_TYPES.every(type=>plans.some(p=>p.type===type)));
    for(const p of plans.filter(p=>MODERN_TYPES.includes(p.type))){
      assert.ok(p.bodies.some(b=>b.shape!=='box'));
      assert.ok(p.details.some(d=>d.kind==='entrance-canopy'));
    }
  });
  check(`${seed}: old streets retain shop bays, balconies and service details`,()=>{
    const plans=city.lots.filter(l=>['jordan','yau-ma-tei','mong-kok','sham-shui-po'].includes(l.district)).map(planBuilding);
    assert.ok(HERITAGE_TYPES.every(type=>plans.some(p=>p.type===type)));
    for(const p of plans.filter(p=>HERITAGE_TYPES.includes(p.type))){
      assert.ok(p.props.filter(d=>d.kind==='shop-fascia').length>=2);
      const tank=p.props.find(d=>d.kind==='water-tank'&&d.shape==='cylinder');
      assert.ok(tank);
      assert.ok(p.bodies.some(b=>Math.abs(tank.y0-b.y0-b.h)<.1
        &&Math.abs(tank.dx-b.dx)+tank.w/2<=b.w/2
        &&Math.abs(tank.dz-b.dz)+tank.d/2<=b.d/2),'water tank overhangs its supporting roof');
      assert.ok(p.details.some(d=>d.kind==='arcade-column'));
    }
  });
  check(`${seed}: sidewalk furniture clears traffic, buildings and landmarks`,()=>{
    const street=planStreetFurniture(city),roads=createSpatialIndex();
    roadFootprints(city.roads).forEach(p=>roads.insert(p));
    assert.ok(street.counts.shelters>0&&street.counts.benches>0&&street.counts.crosswalks>0);
    for(const site of street.placements){
      assert.ok(!index.nearby(site).some(p=>overlaps(site,p)));
      assert.ok(!roads.nearby(site).some(p=>overlaps(site,p)));
      assert.ok(!landmarkKeepOuts().some(p=>overlaps(site,p)));
    }
    for(const part of street.parts)assert.ok([part.x,part.z,part.y0,part.w,part.d,part.h].every(Number.isFinite));
  });
  console.log(JSON.stringify({seed,lots:city.lots.length,parks:city.parks.length,types}));
}
check('all custom geometry is finite, closed, outward-facing and bounded',()=>{
  for(const shape of BUILDING_SHAPES){
    const g=buildingGeometry(shape),p=g.attributes.position,n=g.attributes.normal;
    for(let i=0;i<p.count;i++){
      for(let k=0;k<3;k++)assert.ok(Number.isFinite(p.array[i*3+k])&&Math.abs(p.array[i*3+k])<=.50001,shape);
      assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.001,shape+' normal');
    }
    let volume=0;const edges=new Map();
    const key=v=>v.map(x=>Math.round(x*1e6)).join(',');
    const at=i=>{const j=g.index?g.index.getX(i):i;return [p.getX(j),p.getY(j),p.getZ(j)];};
    for(let i=0;i<(g.index?.count??p.count);i+=3){
      const [a,b,c]=[at(i),at(i+1),at(i+2)];
      for(const [u,v] of [[a,b],[b,c],[c,a]]){
        const edge=[key(u),key(v)].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);
      }
      volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    }
    assert.ok(volume>0,shape+' winding');
    assert.ok([...edges.values()].every(count=>count===2),shape+' open edges');g.dispose();
  }
});
check('both complete ferry routes stay offshore at dense sampling',()=>{
  for(const route of harbourRoutes())for(const p of route.getPoints(1000)){
    const ll=worldToLonLat(p.x,p.z);assert.ok(!isLand(ll.lon,ll.lat),'ferry crosses land');
  }
});
console.log(`${checks} architecture checks passed`);
