import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clampToPanRect } from '../geo/bounds.js';
import { VIEWS, viewCoordinates } from './views.js';

export function createOrbitCamera(camera, dom) {
  const controls=new OrbitControls(camera,dom);
  controls.enableDamping=true; controls.dampingFactor=.065;
  controls.minDistance=35; controls.maxDistance=8500; controls.maxPolarAngle=1.51;
  controls.autoRotateSpeed=.32;
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
  const keys=new Set(), listeners=new Set();
  let flight=null, activeView='harbour', touring=false, tourTime=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const notify=()=>listeners.forEach(fn=>fn({activeView,touring}));
  function setView(id, immediate=false) {
    const v=VIEWS.find(v=>v.id===id); if(!v)return;
    const coords=viewCoordinates(v), toCamera=new THREE.Vector3(...coords.camera),toTarget=new THREE.Vector3(...coords.target);
    activeView=id; tourTime=0;
    if(immediate||reduced.matches){camera.position.copy(toCamera);controls.target.copy(toTarget);flight=null;}
    else flight={elapsed:0,fromCamera:camera.position.clone(),fromTarget:controls.target.clone(),toCamera,toTarget};
    controls.autoRotate=false; notify(); controls.update();
  }
  function setTour(value) {touring=value;tourTime=0;controls.autoRotate=value&&!flight&&!reduced.matches;notify();}
  function cancel() {flight=null;if(touring)setTour(false);}
  controls.addEventListener('start',cancel);
  window.addEventListener('keydown',e=>{
    if(e.target?.closest('input,textarea,select,button,[contenteditable=true]'))return;
    if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)){cancel();keys.add(e.code);e.preventDefault();}
    if(e.code==='KeyF')setView('harbour');
    if(/^Digit[1-6]$/.test(e.code))setView(VIEWS[Number(e.code.slice(-1))-1].id);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>keys.clear());
  const fwd=new THREE.Vector3(),right=new THREE.Vector3(),move=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function update(dt) {
    if(flight){
      flight.elapsed+=dt;
      const u=Math.min(1,flight.elapsed/2.6),t=u*u*(3-2*u);
      camera.position.lerpVectors(flight.fromCamera,flight.toCamera,t);
      const span=flight.fromCamera.distanceTo(flight.toCamera);
      camera.position.y+=Math.sin(Math.PI*t)*Math.min(650,span*.14);
      controls.target.lerpVectors(flight.fromTarget,flight.toTarget,t);
      if(u===1){flight=null;controls.autoRotate=touring&&!reduced.matches;}
    }
    if(touring){tourTime+=dt;if(tourTime>16)setView(VIEWS[(VIEWS.findIndex(v=>v.id===activeView)+1)%VIEWS.length].id);}
    const speed=Math.max(20,camera.position.distanceTo(controls.target)*.6);
    move.set(0,0,0);camera.getWorldDirection(fwd);fwd.y=0;fwd.normalize();right.crossVectors(fwd,up);
    if(keys.has('KeyW'))move.add(fwd);if(keys.has('KeyS'))move.sub(fwd);
    if(keys.has('KeyA'))move.sub(right);if(keys.has('KeyD'))move.add(right);
    if(keys.has('KeyQ'))move.y-=.5;if(keys.has('KeyE'))move.y+=.5;
    if(move.lengthSq()){move.normalize().multiplyScalar(speed*dt);camera.position.add(move);controls.target.add(move);}
    clampToPanRect(controls.target);camera.position.y=Math.max(camera.position.y,5);controls.target.y=Math.max(controls.target.y,0);
    controls.update();
  }
  setView('harbour',true);
  return {controls,update,setView,setTour,resetHome:()=>setView('harbour'),onChange(fn){listeners.add(fn);},get activeView(){return activeView;},get touring(){return touring;}};
}

