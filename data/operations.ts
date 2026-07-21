import type {OperationsData} from '@/types/operations';

export const seedOperations:OperationsData={
 activities:[], actions:[], articles:[], movements:[], partners:[],
 locations:[
  {id:'amstelveen',name:'Eigen magazijn Amstelveen',type:'Eigen magazijn',address:'Noorddammerweg 111-03, 1187 ZS Amstelveen',currentPalletUsage:0,contactDetails:'Jorn / Hidde'},
  {id:'extern',name:'Extern magazijn / 3PL',type:'Extern magazijn',address:'Externe locatie',currentPalletUsage:0,contactDetails:'Via logistieke partner'},
  {id:'transit',name:'Onderweg',type:'Onderweg',address:'In transport',currentPalletUsage:0,contactDetails:'Jorn / Hidde'}
 ]
};
