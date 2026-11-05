import * as THREE from 'three';
import { lonLatToWorld, worldToLonLat } from '../geo/projection.js';
import { isLand } from '../geo/coastline.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Smooth closed harbour routes, sampled and checked against the same coastline.
export function harbourRoutes() {
  return [
    [[114.155,22.294],[114.164,22.293],[114.174,22.290],[114.167,22.289]],
    [[114.169,22.292],[114.184,22.293],[114.191,22.297],[114.180,22.295]]
  ].map(points => new THREE.CatmullRomCurve3(points.map(([lon,lat])=>{
    const {x,z}=lonLatToWorld(lon,lat);return new THREE.Vector3(x,0,z);
  }),true,'centripetal'));
}

export function createFerries() {
  const group=new THREE.Group(); group.name='harbour-ferries';
  const boats=[];
  const white=new THREE.MeshStandardMaterial({color:0xe1e2cf,roughness:.55});
  const green=new THREE.MeshStandardMaterial({color:0x1e5d53,roughness:.62});
  const glass=new THREE.MeshStandardMaterial({color:0x263c42,roughness:.18,metalness:.25});
  const wood=new THREE.MeshStandardMaterial({color:0x7e5b36,roughness:.8});
  const geo=new THREE.BoxGeometry(1,1,1);
  const routes=harbourRoutes();
  for(let i=0;i<4;i++){
    const route=routes[i%2];
    // Reject an unsafe route rather than letting a vessel sail across land.
    if(route.getPoints(160).some(p=>{const ll=worldToLonLat(p.x,p.z);return isLand(ll.lon,ll.lat)})) continue;
    const boat=new THREE.Group();
    const box=(x,y,z,w,h,d,mat)=>{
      const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;boat.add(m);
    };
    box(0,1,0,10,2,29,green);
    box(0,2.6,0,11.5,.6,32,white);
    box(0,4.2,0,9.1,2.6,24,glass);
    box(0,5.7,0,11,.5,29,white);
    box(0,6.5,2,8,1.2,19,green);
    box(0,7.4,2,9,.6,23,white);
    box(0,8.8,3,1.6,2.8,1.8,wood);
    for(const s of [-1,1]) for(let z=-10;z<=10;z+=4) box(s*4.7,4.3,z,.35,2.7,.35,white);
    const bow=new THREE.Mesh(new THREE.CylinderGeometry(5,4.2,2,8),green);
    bow.position.set(0,1,14);boat.add(bow);
    // One mesh per material per ferry, instead of a draw call per window mullion.
    const batches=new Map();
    for(const child of [...boat.children]){
      child.updateMatrix();
      let part=child.geometry.clone().applyMatrix4(child.matrix);
      if(part.index){const expanded=part.toNonIndexed();part.dispose();part=expanded;}
      if(!batches.has(child.material))batches.set(child.material,[]);
      batches.get(child.material).push(part);boat.remove(child);
    }
    bow.geometry.dispose();
    for(const [mat,parts] of batches){
      const mesh=new THREE.Mesh(mergeGeometries(parts),mat);mesh.castShadow=true;boat.add(mesh);
      parts.forEach(p=>p.dispose());
    }
    const wake=new THREE.Mesh(new THREE.PlaneGeometry(16,100),new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,uniforms:{uNight:{value:0}},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:/* glsl */`
        varying vec2 vUv;
        uniform float uNight;
        void main() {
          // MSAA can evaluate edge fragments outside a subpixel wake triangle.
          // An extrapolated negative vUv.y makes pow(y, 1.2) NaN; transparent
          // blending and the bloom pyramid then spread it across the frame.
          vec2 wakeUv = clamp(vUv, vec2(0.0), vec2(1.0));
          float edge = abs(wakeUv.x - 0.5);
          float trail = (1.0 - smoothstep(0.12, 0.5, edge)) * pow(wakeUv.y, 1.2);
          float foam = 0.5 + 0.5 * sin(wakeUv.y * 90.0 + edge * 34.0);
          gl_FragColor = vec4(mix(vec3(0.43, 0.67, 0.64), vec3(0.06, 0.13, 0.19), uNight),
            clamp(trail * (0.16 + foam * 0.18), 0.0, 1.0));
        }
      `
    }));
    wake.rotation.x=-Math.PI/2;wake.position.set(0,.1,-61);boat.add(wake);
    group.add(boat);boats.push({boat,route,wake,phase:i*.27});
  }
  return {group,count:boats.length,update(t,nightF){
    for(const {boat,route,wake,phase} of boats){
      const u=(t*.0016+phase)%1,p=route.getPointAt(u),dir=route.getTangentAt(u);
      boat.position.copy(p);boat.position.y=Math.sin(t*1.1+phase*8)*.18;
      boat.rotation.y=Math.atan2(dir.x,dir.z);boat.rotation.z=Math.sin(t*.8+phase*8)*.012;
      wake.material.uniforms.uNight.value=nightF;
    }
  }};
}
