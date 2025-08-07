
export type Region = { x:number;y:number;w:number;h:number; start:number; end:number; };
export function buildFilter(regions:Region[], width:number, height:number){
  let filter = `[0:v]scale=${width}:${height},format=yuv420p[base];`;
  let last="base"; let i=0;
  for(const r of regions){
    const b=`b${i}`, o=`o${i}`;
    filter += `[${last}]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=20:1,format=rgba[${b}];`;
    filter += `[${last}][${b}]overlay=${r.x}:${r.y}:enable='between(t,${r.start},${r.end})'[${o}];`;
    last=o; i++;
  }
  filter += `[${last}]copy[outv]`;
  return filter;
}
