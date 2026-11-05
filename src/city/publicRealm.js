import * as THREE from 'three';
import { makeInstancedBoxes } from './buildings.js';
import { makeTintedPlainMaterial } from './facades.js';
import { sampleHeight } from './heightfield.js';
import { worldToLonLat } from '../geo/projection.js';
import { isLand } from '../geo/coastline.js';
import { seededRandom } from './architecture.js';
import { planStreetFurniture } from './streetFurniture.js';

export function buildPublicRealm(city) {
  const group = new THREE.Group(); group.name = 'public-realm';
  const trees = [], beds = [], markings = [], occupied = new Set();
  const r = seededRandom(74639);
  const street=planStreetFurniture(city),detailChunks=[];
  markings.push(...street.markings);
  const tree = (x, z, size = 1) => {
    const key = Math.round(x / 7) + ',' + Math.round(z / 7);
    if (occupied.has(key)) return;
    const ll = worldToLonLat(x, z), y = sampleHeight(x, z);
    if (!isLand(ll.lon, ll.lat) || y < 1.3 || y > 210) return;
    occupied.add(key); trees.push({ x, z, y, size: size * (.85 + r() * .3) });
  };
  for (const park of city.parks || []) {
    beds.push({x:park.x,z:park.z,y0:sampleHeight(park.x,park.z)+.12,w:park.w*.9,d:park.d*.9,h:.24,rot:park.rotY,tint:[.18,.28,.18]});
    const c = Math.cos(park.rotY), s = Math.sin(park.rotY);
    for (let u = -park.w * .32; u <= park.w * .35; u += 9) {
      for (let v = -park.d * .32; v <= park.d * .35; v += 11) {
        if (Math.abs(u) < 4) continue; // central walking path
        tree(park.x + u*c + v*s, park.z - u*s + v*c, 1.25);
      }
    }
  }
  const a = city.roads;
  for (let i = 0; i < a.length; i += 12) {
    const p0 = [a[i],a[i+2]], p1 = [a[i+3],a[i+5]], p3 = [a[i+9],a[i+11]];
    const e0 = [p1[0]-p0[0],p1[1]-p0[1]], e1 = [p3[0]-p0[0],p3[1]-p0[1]];
    const l0 = Math.hypot(...e0), l1 = Math.hypot(...e1);
    const len = Math.max(l0,l1), width = Math.min(l0,l1), e = l0 > l1 ? e0 : e1;
    if (len < width * 1.35) continue;
    const dx = e[0]/len, dz = e[1]/len;
    const x = (a[i]+a[i+6])/2, z = (a[i+2]+a[i+8])/2;
    for (const f of [-.25,.25]) {
      const xx=x+dx*len*f, zz=z+dz*len*f;
      markings.push({x:xx,z:zz,y0:sampleHeight(xx,zz)+.31,w:.25,d:4.2,h:.035,rot:Math.atan2(dx,dz),tint:[.62,.61,.49]});
    }
    if ((i/12)%4 === 0) {
      const side = (i/12)%8 === 0 ? 1 : -1;
      tree(x-dz*(width/2+2.7)*side,z+dx*(width/2+2.7)*side,.8);
    }
  }
  for (const [name,list,mat] of [
    ['pocket-gardens',beds,makeTintedPlainMaterial(0xffffff,1,0)],
    ['road-markings',markings,makeTintedPlainMaterial(0xffffff,.95,0)]
  ]) {
    const mesh=makeInstancedBoxes(list,mat); mesh.name=name; mesh.castShadow=false;
    group.add(mesh);
  }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.4,.65,1,5), new THREE.MeshStandardMaterial({color:0x514d38,roughness:1}),trees.length);
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),trees.length*2);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  trees.forEach((p,i)=>{
    dummy.position.set(p.x,p.y+2.7*p.size,p.z); dummy.scale.set(p.size,5.4*p.size,p.size);
    dummy.rotation.set(0,0,0); dummy.updateMatrix(); trunks.setMatrixAt(i,dummy.matrix);
    for(let k=0;k<2;k++){
      dummy.position.set(p.x+(k?1.4:-.7)*p.size,p.y+(k?5.6:7.3)*p.size,p.z+(k?1:-.5)*p.size);
      dummy.scale.set(3.3*p.size,(k?2.9:3.7)*p.size,3.1*p.size); dummy.rotation.y=r()*6.28;
      dummy.updateMatrix(); leaves.setMatrixAt(i*2+k,dummy.matrix);
      color.setHSL(.24+r()*.075,.18+r()*.17,.18+r()*.095); leaves.setColorAt(i*2+k,color);
    }
  });
  trunks.castShadow=true; leaves.castShadow=true; leaves.receiveShadow=true;
  trunks.computeBoundingSphere(); leaves.computeBoundingSphere();
  group.add(trunks,leaves);
  const batches=new Map(),furnitureMat=makeTintedPlainMaterial(0xffffff,.78,.15);
  for(const p of street.parts){
    const key=Math.floor(p.x/512)+','+Math.floor(p.z/512);
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(p);
  }
  for(const [key,list] of batches){
    const mesh=makeInstancedBoxes(list,furnitureMat);mesh.name='street-furniture';
    const [x,z]=key.split(',').map(Number);mesh.userData.center=new THREE.Vector3(x*512+256,0,z*512+256);
    group.add(mesh);detailChunks.push(mesh);
  }
  return {group,detailChunks,stats:{trees:trees.length,parks:city.parks.length,streetFurniture:street.counts,
    publicRealmTriangles:trees.length*60+(markings.length+beds.length+street.parts.length)*12}};
}
