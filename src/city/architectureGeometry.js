import * as THREE from 'three';

export const BUILDING_SHAPES = ['box', 'chamfer', 'taper', 'ellipse', 'rounded', 'wedge', 'cylinder', 'brace', 'braceBack'];

// Each shared mesh stays inside a unit bounding box. The same parcel bounds
// therefore remain valid for tapered, curved and sloping silhouettes.
export function buildingGeometry(shape = 'box') {
  if (shape === 'box') return new THREE.BoxGeometry(1, 1, 1);
  if (shape === 'cylinder') return new THREE.CylinderGeometry(.5, .5, 1, 12);
  const positions = [], uv = [];
  const tri = (a, b, c) => {
    for (const v of [a,b,c]) { positions.push(...v); uv.push(v[0]+.5,v[1]+.5); }
  };
  if (shape === 'brace' || shape === 'braceBack') {
    const sign = shape === 'brace' ? 1 : -1;
    const front = [[-.5,-.5],[-.42,-.5],[.5,.5],[.42,.5]].map(([x,y])=>[x*sign,y,-.5]);
    if (sign < 0) front.reverse();
    const back = front.map(([x,y])=>[x,y,.5]);
    tri(front[0],front[2],front[1]); tri(front[0],front[3],front[2]);
    tri(back[0],back[1],back[2]); tri(back[0],back[2],back[3]);
    for(let i=0;i<4;i++){const j=(i+1)%4;tri(front[i],front[j],back[j]);tri(front[i],back[j],back[i]);}
  } else {
    let outline;
    if (shape === 'ellipse') outline=Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8)*.5,Math.sin(i*Math.PI/8)*.5]);
    else if (shape === 'rounded') {
      outline=[];
      for(const [x,z,a] of [[.28,-.28,-Math.PI/2],[.28,.28,0],[-.28,.28,Math.PI/2],[-.28,-.28,Math.PI]])
        for(let i=0;i<4;i++)outline.push([x+.22*Math.cos(a+i*Math.PI/6),z+.22*Math.sin(a+i*Math.PI/6)]);
    } else if (shape === 'wedge') outline=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
    else if (shape === 'chamfer' || shape === 'taper') outline=[[-.32,-.5],[.32,-.5],[.5,-.32],[.5,.32],[.32,.5],[-.32,.5],[-.5,.32],[-.5,-.32]];
    else throw new Error('Unknown building shape: '+shape);
    const top = ([x,z]) => shape === 'wedge' ? [x,.39+x*.22,z]
      : [x*(shape==='taper'?.66:1),.5,z*(shape==='taper'?.66:1)];
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length];
      const v0=[a[0],-.5,a[1]],v1=[b[0],-.5,b[1]],v2=top(b),v3=top(a);
      tri(v0,v2,v1);tri(v0,v3,v2);
      tri(top([0,0]),v2,v3);tri([0,-.5,0],v0,v1);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.computeVertexNormals();
  return geometry;
}
