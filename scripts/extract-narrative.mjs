import fs from 'node:fs';
import ts from 'typescript';
const outputs=[];
const walk=(n,f)=>{f(n);ts.forEachChild(n,c=>walk(c,f));};
for(const name of fs.readdirSync('reference/modules').filter(x=>x.endsWith('Scene.js'))){
 const code=fs.readFileSync('reference/modules/'+name,'utf8');const ast=ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const initial=[],responsive=[],params=[];
 const replace=s=>s.replaceAll('_this.state.','state.').replaceAll('Stage.width','width').replaceAll('Stage.height','height').replaceAll('Math.range','range').replace(/copy_(orange|mint|marshmallow)/g,"''");
 walk(ast,n=>{
  if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&/^_this\.state\.text\d/i.test(n.left.getText(ast))){
   let parent=n.parent,fn;while(parent){if(ts.isFunctionLike(parent)){fn=parent;break;}parent=parent.parent;}
   const isResize=fn?.name?.getText(ast)==='handleResize'||fn?.parent?.getText(ast).startsWith('_this.handleResize');
   const statement=replace(n.getText(ast))+';';
   if(isResize)responsive.push(statement);else if(!/_this\.|isMobile/.test(n.right.getText(ast)))initial.push(statement);
  }
  if(ts.isCallExpression(n)&&n.expression.getText(ast)==='AppState.createLocal'&&n.arguments[0]?.getText(ast).includes('body:'))params.push(replace(n.arguments[0].getText(ast)));
 });
 if(!params.length)continue;
 const extra=name==='AntiGravityScene.js'?`state.body1='';state.body2='';state.body3='';`:'';
 outputs.push(`${JSON.stringify(name.replace('.js',''))}:(width:number,height:number):NarrativeParams[]=>{const state:Record<string,any>={};const isMobile=width/height<1${name==='ProfileScene.js'?'||width<1200':''};${extra}\n${initial.join('\n')}\n${responsive.join('\n')}\nreturn [${params.join(',')}];}`);
}
fs.writeFileSync('src/data/narrative-layouts.ts',`// Source-derived TextBox parameters and responsive assignments. Regenerate with scripts/extract-narrative.mjs.\nimport {range} from './sections';\nexport interface NarrativeParams {id:number|string;body:string;padx?:number;pady?:number;offsetZ?:number;fontSize?:number;padding?:number;width?:number;lineHeight?:number;horizontalAlign?:string;verticalAlign?:string;color?:string;ontop?:boolean}\nexport const narrativeLayouts:Record<string,(width:number,height:number)=>NarrativeParams[]>={${outputs.join(',\n')}};\n`);
