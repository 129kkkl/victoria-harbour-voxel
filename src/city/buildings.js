// City rendering: shared body batches, spatially chunked architectural details.
import * as THREE from 'three';
import { makeFacadeMaterial, makeTintedPlainMaterial, makeStreetSignMaterial } from './facades.js';
import { asphaltTexture, pavementTexture } from '../materials/proceduralTextures.js';
import { planBuilding, toWorldPart } from './architecture.js';
import { buildingGeometry } from './architectureGeometry.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

export function setTintAttribute(geometry, count, tintFn) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = tintFn ? tintFn(i) : 1;
    arr.set(Array.isArray(t) ? t : [t, t, t], i * 3);
  }
  geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(arr, 3));
  return geometry;
}

export function makeInstancedBoxes(list, material, shape = 'box') {
  const geo = buildingGeometry(shape);
  const mesh = new THREE.InstancedMesh(geo, material, list.length);
  const tints = new Float32Array(list.length * 3), styles = new Float32Array(list.length * 4);
  for (let i=0;i<list.length;i++) {
    const b=list[i];
    _q.setFromAxisAngle(Y_AXIS,b.rot || 0);
    _p.set(b.x,b.y0+b.h/2,b.z); _s.set(b.w,b.h,b.d);
    mesh.setMatrixAt(i,_m.compose(_p,_q,_s));
    const t=b.tint ?? 1;
    tints.set(Array.isArray(t) ? t : [t,t,t],i*3);
    styles.set([b.facadeY || 0, (b.seed ?? i) % 997, 0.87 + ((b.seed ?? i) % 31) / 100, b.family === 'podium' ? 1 : 0],i*4);
  }
  geo.setAttribute('aTint',new THREE.InstancedBufferAttribute(tints,3));
  geo.setAttribute('aStyle',new THREE.InstancedBufferAttribute(styles,4));
  mesh.instanceMatrix.needsUpdate=true;
  mesh.castShadow=true; mesh.receiveShadow=true;
  mesh.computeBoundingSphere();
  return mesh;
}

function quadsToGeometry(flat,uvScale) {
  const pos=[],uv=[],nor=[];
  for (let q=0;q<flat.length;q+=12) {
    for (const k of [0,2,1,0,3,2]) {
      const o=q+k*3;
      pos.push(flat[o],flat[o+1],flat[o+2]); nor.push(0,1,0);
      uv.push(flat[o]/uvScale,flat[o+2]/uvScale);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return g;
}

export function buildCityMesh(city) {
  const group=new THREE.Group(); group.name='city';
  const buckets=new Map(), chunks=new Map(), meshes=[], detailChunks=[], signs=[], shopSigns=[];
  const byArchetype={}, byFeature={};
  let boxCount=0, roofCount=0, triangles=0;
  const push=(map,key,part)=> { if(!map.has(key)) map.set(key,[]); map.get(key).push(part); };
  for (const lot of city.lots) {
    const plan=planBuilding(lot);
    lot.archetype=plan.type;
    byArchetype[plan.type]=(byArchetype[plan.type]||0)+1;
    for (const p of plan.bodies) push(buckets,p.family+':'+p.shape,toWorldPart(lot,p));
    const ck=Math.floor(lot.x/512)+','+Math.floor(lot.z/512);
    for (const p of [...plan.details,...plan.props,...plan.gardens]) {
      if(p.kind)byFeature[p.kind]=(byFeature[p.kind]||0)+1;
      if(p.family==='sign') signs.push(toWorldPart(lot,p));
      else if(p.family==='shopSign') shopSigns.push(toWorldPart(lot,p));
      else push(chunks,ck+'|'+p.shape,toWorldPart(lot,p));
    }
    boxCount+=plan.bodies.length+plan.details.length;
    roofCount+=plan.props.length;
  }
  const facadeMaterials=new Map();
  for (const [key,list] of buckets) {
    const [family,shape]=key.split(':');
    if (!facadeMaterials.has(family)) facadeMaterials.set(family,makeFacadeMaterial(family));
    const mesh=makeInstancedBoxes(list,facadeMaterials.get(family),shape);
    mesh.name='city-'+family;
    group.add(mesh); meshes.push(mesh);
    triangles+=list.length*(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
  }
  const detailMat=makeTintedPlainMaterial(0xffffff,0.76,0.12);
  for(const [list,wide] of [[signs,false],[shopSigns,true]])if(list.length){
    const mesh=makeInstancedBoxes(list,makeStreetSignMaterial(wide));mesh.name=wide?'shop-fascias':'street-signs';
    group.add(mesh);meshes.push(mesh);triangles+=list.length*12;
  }
  for (const [key,list] of chunks) {
    const [cell,shape]=key.split('|');
    const mesh=makeInstancedBoxes(list,detailMat,shape);
    mesh.name='city-details';
    const [x,z]=cell.split(',').map(Number);
    mesh.userData.center=new THREE.Vector3(x*512+256,0,z*512+256);
    group.add(mesh); meshes.push(mesh); detailChunks.push(mesh);
    triangles+=list.length*(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
  }
  for (const [name,flat,scale,texture,color] of [
    ['roads',city.roads,14,asphaltTexture,0xb2babe],
    ['pavements',city.pavements,7,pavementTexture,0xc1c0b6]
  ]) {
    if (!flat?.length) continue;
    const mat=new THREE.MeshStandardMaterial({map:texture(),color,roughness:.9,metalness:.02,
      polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    const mesh=new THREE.Mesh(quadsToGeometry(flat,scale),mat);
    mesh.name='city-'+name; mesh.receiveShadow=true; mesh.renderOrder=name==='roads'?1:0;
    group.add(mesh); meshes.push(mesh); triangles+=flat.length/6;
  }
  return {group,meshes,detailChunks,stats:{boxes:boxCount,roofProps:roofCount,meshes:meshes.length,triangles,byArchetype,byFeature}};
}

