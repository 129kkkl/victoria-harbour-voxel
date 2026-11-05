// District-specific massing and street frontages, in parcel-local coordinates.
export const MODERN_TYPES = ['tapered', 'lantern', 'blade', 'skybridge'];
export const HERITAGE_TYPES = ['shophouse', 'arcade', 'corner', 'walkup'];

export function planDistrictBuilding(lot, type, seed, r) {
  const heritage=HERITAGE_TYPES.includes(type), pick=a=>a[Math.floor(r()*a.length)];
  const W=lot.w-2.4,D=lot.d-2.4,H=lot.boxH;
  const floor=lot.floorH,ph=heritage?Math.min(H*.36,4.6+lot.spread*.3):Math.min(17,H*.16);
  const bodies=[],details=[],props=[],gardens=[];
  const tint=pick(heritage?[[1.30,1.07,.82],[.84,1.17,1.04],[1.27,.93,.81],[.89,1.08,1.24],[1.26,1.20,1.00]]
    :[[.64,.88,1.04],[.82,1.04,1.06],[1.08,.96,.73],[.65,.75,.86]]);
  const stone=heritage?[.69,.63,.49]:[.52,.57,.57],dark=[.075,.12,.14],metal=[.53,.64,.66];
  const awning=pick([[.08,.32,.26],[.54,.16,.095],[.61,.42,.15],[.13,.27,.38]]);
  const add=(list,x,z,y,w,d,h,color=stone,family,shape='box',kind='structure')=>{
    if(w<=0||d<=0||h<=0)return;
    list.push({dx:x,dz:z,y0:y,w,d,h,tint:color,family,shape,seed,facadeY:y,detail:list!==bodies,kind});
  };
  const mass=(x,z,y,w,d,h,family=heritage?lot.family:'curtain',shape='box')=>add(bodies,x,z,y,w,d,h,tint,family,shape);
  const piece=(x,z,y,w,d,h,color=stone,shape='box',kind='detail')=>add(details,x,z,y,w,d,h,color,undefined,shape,kind);
  const garden=(x,z,y,w,d)=>add(gardens,x,z,y,w,d,.5,[.14,.27,.13],undefined,'box','planter');
  const parapet=(x,z,y,w,d)=>{
    for(const s of [-1,1]){piece(x,z+s*(d/2-.14),y,w,.28,.6);piece(x+s*(w/2-.14),z,y,.28,d,.6);}
  };
  const bench=(x,z,y,w)=>{
    piece(x,z,y+.45,w,.55,.16,[.38,.25,.14],'box','bench');
    for(const s of [-1,1])piece(x+s*w*.34,z,y,.15,.45,.45,dark);
  };
  const sign=(x,z,y,w,d,h,wide=false)=>{
    add(props,x,z,y,w,d,h,[1,1,1],wide?'shopSign':'sign','box',wide?'shop-fascia':'blade-sign');
    props[props.length-1].seed=(seed+Math.floor(r()*1009))>>>0;
  };
  const fins=(x,z,y,w,d,h,n=5)=>{
    for(let i=0;i<n;i++)for(const s of [-1,1])piece(x+(i/(n-1)-.5)*(w-.8),z+s*(d/2+.13),y,.24,.36,h,metal,'box','vertical-fin');
  };
  if(!heritage){
    // Two offset retail wings leave a recessed, transparent arrival hall.
    mass(-W*.22,D*.05,0,W*.48,D*.76,ph,'granite','rounded');
    mass(W*.23,D*.08,0,W*.39,D*.72,ph*.72,'granite');
    mass(0,-D*.30,.8,W*.55,D*.12,ph*.62,'curtain');
    piece(0,-D*.39,ph*.63,W*.71,D*.13,.45,metal,'wedge','entrance-canopy');
    for(const s of [-1,1]){
      garden(s*W*.39,-D*.33,.5,W*.09,D*.24);
      bench(s*W*.26,-D*.44,.4,Math.min(4,W*.18));
      piece(s*W*.43,-D*.43,.2,.4,.4,1.05,metal,'cylinder','bollard');
    }
    if(type==='tapered'){
      const w=W*(.66+r()*.10),d=D*(.52+r()*.12),th=(H-ph)*.86;
      mass(0,D*.04,ph,w,d,th,'curtain','taper');
      mass(0,D*.04,ph+th,w*.66,d*.66,H-ph-th,'metal','taper');
      // Real diagonal frame members reinforce the faceted silhouette.
      for(const s of [-1,1])for(let k=0;k<3;k++){
        const y=ph+k*th/3,shrink=1-k*.34/3,depth=d*(1-(k+.5)*.34/3);
        piece(0,D*.04+s*depth/2,y,w*shrink*.62,.5,th/3,metal,k%2?'braceBack':'brace','diagrid');
      }
      piece(0,D*.04,H,.6,.6,4+r()*4,metal,'cylinder','mast');
    }else if(type==='lantern'){
      const w=W*.64,d=D*.58,levels=[ph,H*.43,H*.72,H*.93];
      for(let k=0;k<3;k++){
        const y=levels[k],top=levels[k+1],gap=k===0?0:2.2;
        mass(0,0,y,w*.84,d*.84,gap+1,'metal','ellipse');
        mass(0,0,y+gap,w,d,top-y-gap,'curtain','ellipse');
        if(k){garden(0,-d*.35,y,w*.43,2);garden(0,d*.35,y,w*.43,2);}
      }
      mass(0,0,H*.93,w*.82,d*.82,H*.07,'curtain','ellipse');
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;piece(Math.cos(a)*w*.4,Math.sin(a)*d*.4,H*.94,.35,.35,H*.09,metal,'cylinder','crown-fin');
      }
    }else if(type==='blade'){
      const w=W*.57,d=D*.62,z=D*.02;
      mass(-W*.1,z,ph,w,d,H-ph,'curtain','wedge');
      mass(W*.28,z+D*.10,ph,W*.14,d*.77,H*.75-ph,'granite');
      // The crown remains a diagonal roof, with a thin metal blade at one end.
      piece(W*.175,z,H*.83,W*.026,d*.95,H*.17+1,metal,'box','crown-blade');
      fins(-W*.13,z,ph,w*.65,d,H*.52,4);
    }else{
      const w=W*.28,d=D*.53,x=W*.265,low=H*(.74+r()*.09);
      mass(-x,-D*.05,ph,w,d,H-ph,'curtain','chamfer');
      mass(x,D*.08,ph,w,d,low-ph,'curtain','rounded');
      fins(-x,-D*.05,ph,w,d,H-ph,3);fins(x,D*.08,ph,w,d,low-ph,3);
      const bridgeY=low*.67;
      mass(0,0,bridgeY,W*.30,D*.27,5,'curtain');
      piece(0,0,bridgeY-.5,W*.34,D*.30,.5,metal,'box','skybridge');
      garden(0,0,bridgeY+5,W*.25,D*.23);
      mass(-x,-D*.05,H-5,w*.77,d*.77,8,'metal','taper');
      mass(x,D*.08,low-3,w*.76,d*.76,5,'metal','wedge');
    }
  }else{
    const w=W*(.84+r()*.10),d=D*(.64+r()*.12),z=D*.05;
    const front=z-d/2,back=z+d/2;
    const inset=type==='arcade'?2.0:1.0;
    mass(0,z+inset/2,0,w,d-inset,ph,'podium');
    const split=type==='walkup'?H-floor*1.8:H;
    mass(0,z,ph,w,d,split-ph,lot.family,type==='corner'?'rounded':'box');
    if(type==='walkup')mass(-w*.08,z+d*.07,split,w*.76,d*.75,H-split,lot.family);
    const bays=Math.max(2,Math.min(4,Math.floor(w/3.8))),bw=w/bays;
    // Independent shops: actual recessed glazing, piers, fascia signs and awnings.
    for(let b=0;b<bays;b++){
      const x=(b-(bays-1)/2)*bw;
      mass(x,front+inset+.15,.55,bw*.81,.35,ph-1.4,'podium');
      piece(x-bw*.47,front+.4,0,.38,.65,ph,tint,'box','arcade-column');
      sign(x,front-.32,ph-1.0,bw*.90,.35,.75,true);
      if(b%2===0||type!=='arcade'){
        piece(x,front-.70,ph-1.35,bw*.94,1.75,.5,awning,'wedge','awning');
        for(let j=0;j<3;j++)piece(x+(j-1)*bw*.25,front-.92,ph-1.04,bw*.10,1.25,.06,[.76,.70,.53],'box','awning-stripe');
      }
    }
    const balconyStyle=Math.floor(r()*3);
    for(let y=ph+floor;y<split-.7;y+=floor){
      const row=Math.round(y/floor);
      if(type==='arcade'||(row+balconyStyle)%3!==0){
        const wide=type==='arcade'?w*.96:w*.69;
        const x=type==='arcade'?0:(row%2?-.10:.10)*w;
        piece(x,front-.48,y,wide,1.3,.2,stone,'box','balcony-slab');
        piece(x,front-1.03,y+.32,wide,.12,.72,balconyStyle===1?awning:metal,'box','balcony-rail');
        for(const s of [-1,1])piece(x+s*wide*.46,front-.65,y+.2,.13,.8,.85,metal);
      }
      // Sparse geometric AC units and brackets break the repeating texture grid.
      const acX=(row%2?1:-1)*w*.26;
      piece(acX,front-.18,y+.95,1.0,.55,.67,[.52,.55,.51],'box','air-conditioner');
      piece(acX,front-.48,y+1.04,.73,.05,.42,dark);
      if(row%3===0)piece(-acX,front-.83,y+1.2,.75,.08,1.0,pick([[.64,.30,.23],[.57,.66,.62],[.29,.39,.53]]),'box','laundry');
      if(type==='corner'){
        mass(w*.36,z-d*.16,y-floor*.65,w*.20,d*.28,floor*.73,lot.family,'rounded');
      }
    }
    // Cornice, uneven rooftop sheds, cylindrical tanks and service pipes.
    parapet(0,z,split,w,d);
    if(type==='walkup')parapet(-w*.08,z+d*.07,H,w*.76,d*.75);
    const roof=H+.04,roofW=type==='walkup'?w*.76:w,roofD=type==='walkup'?d*.75:d;
    const roofX=type==='walkup'?-w*.08:0,roofZ=type==='walkup'?z+d*.07:z;
    const roofStyle=Math.floor(r()*4),serviceSide=roofStyle%2?1:-1;
    const shedW=roofW*(.22+r()*.14),shedD=roofD*(.20+r()*.17);
    piece(roofX+serviceSide*roofW*.22,roofZ+roofD*.17,roof,shedW,shedD,1.4+r()*1.8,
      roofStyle===2?awning:stone,roofStyle===1?'box':'wedge','roof-shed');
    const tankX=roofX-serviceSide*roofW*.24,tankZ=roofZ+roofD*(r()*.34-.17);
    const tankSize=Math.min(1.5+r()*1.0,roofW*.23),tankH=1.25+r()*1.35;
    add(props,tankX,tankZ,roof,tankSize,tankSize,tankH,[.32,.38,.37],undefined,'cylinder','water-tank');
    for(let i=0;i<3;i++)piece(tankX,tankZ,roof+tankH*(.16+i*.33),tankSize+.12,tankSize+.12,.08,metal,'cylinder','tank-band');
    if(roofStyle===2||roofStyle===3){
      garden(roofX,roofZ-roofD*.30,roof,roofW*.48,Math.min(1.2,roofD*.13));
      if(roofStyle===3)bench(roofX+roofW*.13,roofZ-roofD*.12,roof,Math.min(2.3,roofW*.32));
    }
    piece(-w*.46,front+.12,ph,.16,.22,H-ph,[.27,.31,.29],'box','drainpipe');
    const signX=(r()>.5?1:-1)*w*.36;
    sign(signX,front-.8,ph+1.1,.45,1.65,Math.min(8,H*.28));
    if(type==='corner')sign(-signX,front-.35,ph+floor*2.4,.42,1.7,4.0);
    // Lane equipment uses the open strip in front of the shop, inside its parcel.
    const streetZ=-D*.46;
    if(r()<.65){
      piece(w*.30,streetZ,.2,1.3,.75,1.1,awning,'box','market-stall');
      piece(w*.30,streetZ,2.2,1.65,1.2,.14,awning,'wedge','stall-roof');
      for(const s of [-1,1])piece(w*.30+s*.68,streetZ,.3,.08,.08,1.9,metal);
    }else bench(0,streetZ,.2,Math.min(2.4,w*.6));
    for(const s of [-1,1])piece(s*w*.43,streetZ,.15,.38,.38,.85,[.38,.37,.31],'cylinder','bollard');
    if(type==='walkup')for(let y=ph+floor;y<H-floor;y+=floor*2){
      piece(w*.42,back+.30,y,w*.13,.8,.22,metal,'box','fire-escape');
      piece(w*.42,back+.30,y,w*.13,.24,floor*2,metal,'brace','escape-stair');
    }
  }
  // Adjacent narrow plots can address either parallel street. Rotate the full
  // composition, including its canopy and service side, rather than its texture.
  const reverse=heritage&&(seed&1)===1;
  if(reverse)for(const p of [...bodies,...details,...props,...gardens]){
    p.dx=-p.dx;p.dz=-p.dz;p.turn=Math.PI;
  }
  return {type,character:heritage?'heritage-street':'commercial-skyline',bodies,details,props,gardens};
}
