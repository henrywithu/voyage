import fs from 'node:fs';
const uil=JSON.parse(fs.readFileSync('reference/uil.json','utf8'));
const template=fs.readFileSync('src/shaders/original/ProtonAntimatterLifecycle.fs','utf8');
const output={};fs.mkdirSync('src/shaders/particles',{recursive:true});
for(const [name,id] of Object.entries({DrinkBlobParticles:'Element_0',LeafParticles:'Element_2',DrawnParticles:'Element_0'})){
 const prefix=`P_${id}_${name}`,input=`INPUT_${prefix}`,active=JSON.parse(uil[input+'_behavior_data']);
 const uniformsText=[uil[input+'_behavior_uniforms'],...active.map(code=>uil[input+code+'_uniforms']??'')].join('\n');
 const values={},declarations=['uniform float HZ;'];
 for(const line of uniformsText.split('\n')){
  const pair=line.trim().match(/^(\w+):\s*(.+)$/);if(!pair)continue;const [,key,raw]=pair;let type,value;
  if(raw==='T'){type='sampler2D';value=null;}else if(raw.startsWith('C')){type=raw.slice(1);value=null;}else{value=JSON.parse(raw);type=Array.isArray(value)?`vec${value.length}`:'float';}
  declarations.push(`uniform ${type} ${key};`);values[key]=uil[`am_ProtonAntimatterLifecycle_${prefix}${key}`]??value;
 }
 const requires=new Set();
 const code=active.map(key=>uil[input+key+'_code'].replace(/#require\([^)]+\)/g,m=>{requires.add(m);return '';})).join('\n');
 const compiled=template.replace('//uniforms',declarations.join('\n')).replace('//requires',[...requires].join('\n')).replace('//code',code);
 fs.writeFileSync(`src/shaders/particles/${name}.frag.glsl`,compiled+'\n');
 output[name]={sourcePrefix:input,active,count:uil[input+'_config_particleCount'],decay:uil[`am_AntimatterSpawn_${id}_${name}decay`],decayRandom:uil[`am_AntimatterSpawn_${id}_${name}decayRandom`],uniforms:values};
}
fs.writeFileSync('src/data/particle-settings.json',JSON.stringify(output,null,2)+'\n');
console.log('Extracted 3 lifecycle shaders from the active UIL code lists.');
