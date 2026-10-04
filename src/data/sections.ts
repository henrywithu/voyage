export const sections=[
 {name:'WanderScene',height:3},{name:'ProfileScene',height:1.25},
 {name:'ApproachScene',height:2,mobileHeight:1.25},{name:'NearScene',height:3,mobileHeight:1.25},
 {name:'HandScene',height:1.5},{name:'TargetScene',height:1,auto:true},
 {name:'TransitionScene',height:2,mobileHeight:1.5,marginTop:-.1},
 {name:'CathedralScene',height:4,marginTop:-.5},{name:'DrinkSelectionScene',height:2.5},
 {name:'DrinkPourScene',height:4},{name:'AntiGravityScene',height:2,mobileHeight:1.8},
 {name:'PillarCrumbleScene',height:1.25},{name:'ColosseumScene',height:3.25},
 {name:'TasteScene',height:1,auto:true},{name:'CollectionScene',height:1,auto:true},
 {name:'ProductsScene',height:1,auto:true},{name:'RetailScene',height:1,auto:true},
 {name:'FooterScene',height:1,auto:true}
] as const;
export type SectionName=typeof sections[number]['name'];
export const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const range=(v:number,a:number,b:number,c:number,d:number,clamped=true)=>c+(d-c)*(clamped?clamp((v-a)/(b-a)):(v-a)/(b-a));
export const worldHeight=2*Math.tan(35*Math.PI/360)*5;
