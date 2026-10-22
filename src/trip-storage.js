(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TravelTripStorage=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const KEY='travelV10Db',FORMAT='TAP2';
function pack(trips){
  const rows=Array.isArray(trips)?trips:[],keys=[...new Set(rows.flatMap(row=>row&&typeof row==='object'?Object.keys(row):[]))];
  return{format:FORMAT,keys,rows:rows.map(row=>keys.map(key=>Object.prototype.hasOwnProperty.call(row,key)?row[key]:null))};
}
function unpack(value){
  if(Array.isArray(value))return value;
  if(!value||value.format!==FORMAT||!Array.isArray(value.keys)||!Array.isArray(value.rows))return[];
  return value.rows.map(values=>{const row={};value.keys.forEach((key,index)=>{if(values[index]!==null&&values[index]!==undefined)row[key]=values[index]});return row});
}
function read(storage=globalThis.localStorage){try{return unpack(JSON.parse(storage.getItem(KEY)||'[]'))}catch(_){return[]}}
function write(trips,storage=globalThis.localStorage){const rows=Array.isArray(trips)?trips:[];storage.setItem(KEY,JSON.stringify(pack(rows)));return rows}
return{KEY,FORMAT,pack,unpack,read,write};
});
