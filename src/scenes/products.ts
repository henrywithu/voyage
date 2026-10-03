import {SceneSection} from '../engine/SceneSection';
import {worldHeight} from '../data/sections';
import {setupProductShowcase} from './ProductShowcase';
import {setupCollectionGlass} from './CollectionGlass';
import {setupRetailEditorial} from './RetailEditorial';
import {setupTasteEditorial} from './TasteEditorial';
export {products} from './ProductShowcase';
export async function setupProducts(section:SceneSection){
 await setupProductShowcase(section);setupCollectionGlass(section);setupTasteEditorial(section);setupRetailEditorial(section);
 if(section.name==='FooterScene')section.onResize=(w,h)=>section.mesh('bg').scale.set(worldHeight*w/h*3,section.height,1);
}
