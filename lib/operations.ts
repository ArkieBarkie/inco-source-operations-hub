import type {ActivityStatus,ActionItem,PlannedActivity} from '@/types/operations';
export const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Amsterdam'});
export const formatDate=(v:string)=>new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Amsterdam'}).format(new Date(`${v}T12:00:00`));
export const statusClass=(s:ActivityStatus|string)=>s==='Afgerond'||s==='Opgelost'||s==='Gesloten'?'bg-emerald-100 text-emerald-800':s==='Vertraagd'||s==='Kritiek'?'bg-red-100 text-red-800':s==='Onderweg'||s==='Wordt verwerkt'||s==='In behandeling'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800';
export const openAction=(a:ActionItem)=>!['Opgelost','Gesloten'].includes(a.status);
export const activityWarnings=(activities:PlannedActivity[])=>{
  const warnings:string[]=[];
  for(const a of activities){
    if(!a.startTime||!a.endTime)warnings.push(`${a.reference}: volledig tijdvenster ontbreekt`);
    if(!a.slotConfirmed)warnings.push(`${a.reference}: bloktijd nog niet bevestigd`);
    if(!a.responsibleEmployee)warnings.push(`${a.reference}: geen verantwoordelijke`);
    if(a.status==='Verwacht')warnings.push(`${a.reference}: activiteit nog niet bevestigd`);
    if(a.actualArrivalTime&&a.endTime&&a.actualArrivalTime>a.endTime)warnings.push(`${a.reference}: buiten afgesproken bloktijd gearriveerd`);
  }
  const slots=new Map<string,number>();
  activities.forEach(a=>{if(a.expectedPallets>=4){const k=`${a.date}-${a.startTime}`;slots.set(k,(slots.get(k)||0)+1)}});
  slots.forEach((n,k)=>{if(n>1)warnings.push(`${k.slice(11)}: meerdere grote leveringen tegelijk`)});
  return [...new Set(warnings)];
};
