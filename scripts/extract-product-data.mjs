import fs from 'node:fs';
const uil=JSON.parse(fs.readFileSync('reference/uil.json','utf8')),text={},config={};
for(const [key,value]of Object.entries(uil)){
 if(key.endsWith('_text3d_data')){const prefix=key.slice(0,-5);text[prefix.replace('INPUT_','').replace('_text3d','')]={...JSON.parse(value),text:uil[prefix+'_text'],anchor2D:uil[prefix+'_anchor2D']??false};}
 const match=key.match(/^INPUT_(Products|Collection) Scene Config_(.+)$/);if(match){config[match[1]]??={};config[match[1]][match[2]]=typeof value==='string'&&!isNaN(Number(value))?Number(value):value;}
}
fs.writeFileSync('src/data/text3d.json',JSON.stringify(text,null,2)+'\n');fs.writeFileSync('src/data/product-settings.json',JSON.stringify(config,null,2)+'\n');
console.log('Recovered Text3D settings and product/glass interaction uniforms.');
