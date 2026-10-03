import fs from 'node:fs';
import ts from 'typescript';
const code = fs.readFileSync('reference/production.js','utf8');
const ast = ts.createSourceFile('production.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const uil = JSON.parse(fs.readFileSync('reference/uil.json','utf8'));
fs.mkdirSync('reference/modules',{recursive:true});
fs.mkdirSync('src/data',{recursive:true});
const classes = {};
function walk(n, fn){ fn(n); ts.forEachChild(n,c=>walk(c,fn)); }
walk(ast,n=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='Class'){
  let f=n.arguments[0];while(f&&ts.isParenthesizedExpression(f))f=f.expression;
  if(f&&ts.isFunctionExpression(f)&&f.name)classes[f.name.text]=f;
}});
function value(n){
  if(!n)return undefined;
  if(ts.isParenthesizedExpression(n))return value(n.expression);
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return n.text;
  if(ts.isNumericLiteral(n))return Number(n.text);
  if(n.kind===ts.SyntaxKind.NullKeyword)return null;
  if(n.kind===ts.SyntaxKind.TrueKeyword)return true;
  if(n.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(ts.isPrefixUnaryExpression(n))return n.operator===ts.SyntaxKind.MinusToken?-value(n.operand):n.operator===ts.SyntaxKind.ExclamationToken?!value(n.operand):value(n.operand);
  if(ts.isArrayLiteralExpression(n))return n.elements.map(value);
  if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.text??p.name.getText(ast),value(p.initializer)]));
  if(ts.isNewExpression(n))return {kind:n.expression.getText(ast),args:(n.arguments??[]).map(value)};
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)){
    const prop=n.expression.name.text;
    if(prop==='normalize')return {...value(n.expression.expression),normalize:true};
    if(['getTexture','getRepeatTexture'].includes(prop))return {kind:'Texture',path:value(n.arguments[0]),repeat:prop==='getRepeatTexture'};
  }
  const text=n.getText(ast);
  if(text==='RenderManager.DPR'||text==='Tests.getDPR()')return 1;
  return undefined;
}
const defaults={}, ui={}, text={};
for(const [name,f] of Object.entries(classes)){
  if(f.pos<classes.AgeGate?.pos && !['MouseFluid','FluidLayer','DracoThread','Skin','SkinAnimation','GazeCamera','Config','TextBox'].includes(name))continue;
  fs.writeFileSync(`reference/modules/${name}.js`,f.getText(ast));
  walk(f,n=>{
    if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)){
      if(n.expression.name.text==='addUniforms'&&ts.isObjectLiteralExpression(n.arguments[0])){
        defaults[name]={...defaults[name],...value(n.arguments[0])};
      }
      if(n.expression.name.text==='initClass'&&n.arguments[0]?.getText(ast)==='FragUIHelper')ui[name]=value(n.arguments[1]);
    }
    if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&n.left.getText(ast).match(/_this\.state\.text\d?body/)){
      (text[name]??={})[n.left.getText(ast).split('.').at(-1)]=value(n.right);
    }
  });
}
const scenes={};
for(const [key,v] of Object.entries(uil)){
 const m=key.match(/^INPUT_Config_(\d+)_(\w+)_(\w+)$/); if(!m)continue;
 const [,id,scene,prop]=m; if(!scene.endsWith('Scene')&&!['Products'].includes(scene))continue;
 if(uil[`sl_${scene}_${id}_deleted`])continue;
 ((scenes[scene]??={})[id]??={id:Number(id),uniforms:{}})[prop]=v;
}
for(const [name,layers] of Object.entries(scenes))for(const [id,layer]of Object.entries(layers)){
 for(const prop of ['position','rotation','scale'])layer[prop]=uil[`MESH_Element_${id}_${name}${prop}`];
 for(const [k,v]of Object.entries(uil)){
   if(k.includes(`@Element_${id}_${name}@`))layer.uniforms[k.split('@').at(-1)]=v;
 }
 for(const [k,v]of Object.entries(uil)){
   if(k.startsWith(`${layer.shader}@${layer.shader}@Element_${id}_${name}@`))layer.uniforms[k.split('@').at(-1)]=v;
 }
}
fs.writeFileSync('src/data/scene-layouts.json',JSON.stringify(scenes,null,2));
fs.writeFileSync('src/data/shader-defaults.json',JSON.stringify(defaults,null,2));
fs.writeFileSync('src/data/ui-trees.json',JSON.stringify(ui,null,2));
fs.writeFileSync('src/data/narrative.json',JSON.stringify(text,null,2));
const html=fs.readFileSync('reference/index.html','utf8');
fs.mkdirSync('src/styles',{recursive:true});
fs.writeFileSync('src/styles/reference.css',html.match(/<style type="text\/css">([\s\S]*?)<\/style>/)[1].replaceAll('url(assets/','url(/assets/'));
console.log({classes:Object.keys(classes).length,scenes:Object.keys(scenes).length,defaults:Object.keys(defaults).length,ui:Object.keys(ui).length});
