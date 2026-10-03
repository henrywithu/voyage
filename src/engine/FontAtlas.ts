import * as THREE from 'three';
import {texture} from './assets';
export type TimedWord={text:string;start:number;end:number;type:string};
export interface FontData {chars:{char:string;id:number;width:number;height:number;xoffset:number;yoffset:number;xadvance:number;x:number;y:number}[];info:{size:number};common:{scaleW:number;scaleH:number};kernings:{first:number;second:number;amount:number}[]}
/** BMFont layout follows the recovered GLTextThread: advances, word wrapping, baseline and line metrics. */
export class FontAtlas {
 readonly map:THREE.Texture;readonly glyphs:Map<string,FontData['chars'][number]>;
 constructor(readonly data:FontData,readonly name:string){this.glyphs=new Map(data.chars.map(g=>[g.char,g]));this.map=texture(`assets/fonts/${name}.png`,false);this.map.generateMipmaps=false;this.map.minFilter=THREE.LinearFilter;}
 static async load(name='PPNikkeiMaru-Regular'){return new FontAtlas(await fetch(`/assets/fonts/${name}.json`).then(r=>r.json()),name);}
 layout(text:string,size:number,width:number,lineHeight=1.7,timings:TimedWord[]=[],align:'left'|'center'|'right'='left'){
  const scale=size/this.data.info.size;const whitespace=/[^\S\u00a0]/;
  type Placed={glyph:FontData['chars'][number];x:number;charIndex:number};type Line={width:number;glyphs:Placed[]};
  const lines:Line[]=[];let cursor=0,wordCursor=0,wordWidth=0;
  const newLine=()=>{const line={width:0,glyphs:[]};lines.push(line);wordCursor=cursor;wordWidth=0;return line;};let line:Line=newLine();
  while(cursor<text.length){const char=text[cursor];if(!line.glyphs.length&&whitespace.test(char)){cursor++;wordCursor=cursor;wordWidth=0;continue;}if(char==='\n'){cursor++;line=newLine();continue;}
   const glyph=this.glyphs.get(char)??this.glyphs.get('?')!;
   const previous=line.glyphs.at(-1)?.glyph;if(previous){const kern=this.data.kernings.find(k=>k.first===glyph.id&&k.second===previous.id)?.amount??0;line.width+=kern*scale;wordWidth+=kern*scale;}
   line.glyphs.push({glyph,x:line.width,charIndex:cursor});if(whitespace.test(char)){wordCursor=cursor;wordWidth=0;}
   const advance=glyph.xadvance*scale;line.width+=advance;wordWidth+=advance;
   if(line.width>width&&wordWidth!==line.width){const count=cursor-wordCursor+1;line.glyphs.splice(-count,count);cursor=wordCursor;line.width-=wordWidth;line=newLine();continue;}cursor++;
  }
  if(!line.glyphs.length)lines.pop();
  const position:number[]=[],uv:number[]=[],index:number[]=[],animation:number[]=[],karaoke:number[]=[];let glyphIndex=0,wordIndex=-1;
  const charTimes:{start:number;end:number}[]=[];for(const word of timings)for(const char of word.text.toUpperCase())charTimes.push({start:word.start,end:word.end});
  let y=-size*(lineHeight-1)/2;
  lines.forEach((line,lineIndex)=>{wordIndex++;for(const entry of line.glyphs){const g=entry.glyph;if(whitespace.test(g.char)){wordIndex++;continue;}const offset=align==='center'?-line.width/2:align==='right'?-line.width:0;const x=entry.x+g.xoffset*scale+offset,top=y-g.yoffset*scale,w=g.width*scale,h=g.height*scale;position.push(x,top-h,0,x,top,0,x+w,top-h,0,x+w,top,0);
    const u=g.x/this.data.common.scaleW,v=1-g.y/this.data.common.scaleH,uw=g.width/this.data.common.scaleW,vh=g.height/this.data.common.scaleH;
    uv.push(u,v-vh,u,v,u+uw,v-vh,u+uw,v);const j=glyphIndex*4;index.push(j,j+2,j+1,j+1,j+2,j+3);const timing=charTimes[entry.charIndex]??{start:0,end:0};for(let k=0;k<4;k++){animation.push(glyphIndex,wordIndex,lineIndex);karaoke.push(timing.start,timing.end,0);}glyphIndex++;}y-=size*lineHeight;});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('animation',new THREE.Float32BufferAttribute(animation,3));geometry.setAttribute('karaoke',new THREE.Float32BufferAttribute(karaoke,3));geometry.setIndex(index);geometry.computeBoundingBox();
  return {geometry,width:geometry.boundingBox!.max.x-geometry.boundingBox!.min.x,height:geometry.boundingBox!.max.y-geometry.boundingBox!.min.y,advanceHeight:lines.length*size*lineHeight,lines:lines.length,letters:glyphIndex,words:wordIndex};
 }
}
