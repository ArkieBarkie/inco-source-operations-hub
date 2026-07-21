import sops from '@/data/sops.json'; import type {Sop} from '@/types/sop';
export const allSops=sops as Sop[];
export const categories=[...new Set(allSops.map(s=>s.category))].sort();
export const processes=[...new Set(allSops.map(s=>s.process))].sort();
export const findSop=(slug:string)=>allSops.find(s=>s.slug===slug);
export const display=(v?:string)=>v&&v.trim()?v:'—';
