import { lonLatToWorld } from '../geo/projection.js';

export const VIEWS = [
  { id:'harbour',name:'维港全景',en:'THE HARBOUR',tag:'01 / 两岸之间',
    description:'越过翡翠色的海面，沿着层叠的天际线，发现这座向上生长的城市。',
    target:[114.1630,22.2818,135],distance:2050,az:164,el:8 },
  { id:'central',name:'中环天际线',en:'CENTRAL',tag:'02 / 玻璃与光',
    description:'收分晶体、椭圆塔身与斜切塔冠，连廊和空中花园织入中环的玻璃天际线。',
    target:[114.1602,22.2818,150],distance:900,az:161,el:17 },
  { id:'kowloon',name:'西九龙海岸',en:'WEST KOWLOON',tag:'03 / 海岸的另一面',
    description:'从文化海岸向北望，低矮的公共建筑与高耸的城市地标交织在一起。',
    target:[114.1580,22.3032,155],distance:1250,az:14,el:15 },
  { id:'oldtown',name:'九龙街巷',en:'KOWLOON STREETS',tag:'04 / 城市的颗粒',
    description:'走近油麻地。骑楼下的茶餐厅、条纹雨棚、晾衣阳台与圆筒水箱，留下老街的生活痕迹。',
    target:[114.1818,22.3009,16],distance:210,az:168,el:17 },
  { id:'wanchai',name:'湾仔海滨',en:'WAN CHAI',tag:'05 / 海风与屋顶',
    description:'沿会展的海鸥形屋顶，观看山、城与海在湾仔层层展开。',
    target:[114.1730,22.2820,100],distance:1200,az:158,el:15 },
  { id:'aerial',name:'城市鸟瞰',en:'ABOVE THE CITY',tag:'06 / 岛屿的轮廓',
    description:'拉远视野。街网、庭院、绿地和航迹，共同织成维多利亚港。',
    target:[114.1680,22.2940,75],distance:4200,az:170,el:47 }
];

export function viewCoordinates(view) {
  const {x,z}=lonLatToWorld(view.target[0],view.target[1]);
  const az=view.az*Math.PI/180,el=view.el*Math.PI/180,d=view.distance;
  return {target:[x,view.target[2],z],camera:[x+Math.sin(az)*Math.cos(el)*d,view.target[2]+Math.sin(el)*d,z+Math.cos(az)*Math.cos(el)*d]};
}
