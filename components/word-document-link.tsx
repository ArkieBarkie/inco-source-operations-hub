'use client';

import {useEffect,useState} from 'react';

function documentUrl(fileName:string){
  const marker='/sops/';
  const markerIndex=window.location.pathname.indexOf(marker);
  const basePath=markerIndex>0?window.location.pathname.slice(0,markerIndex):'';
  return `${window.location.origin}${basePath}/api/sop-documents/${encodeURIComponent(fileName)}`;
}

export function WordDocumentLink({fileName,compact=false,showDownload=false}:{fileName:string;compact?:boolean;showDownload?:boolean}){
  const [url,setUrl]=useState('');
  useEffect(()=>setUrl(documentUrl(fileName)),[fileName]);
  const downloadForWord=()=>{window.location.href=url||documentUrl(fileName)};
  return <div className={`no-print flex ${compact?'flex-wrap items-center gap-2':'flex-col gap-2'}`}>
    <button type="button" onClick={downloadForWord} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-50 font-bold text-accent transition hover:bg-blue-100 ${compact?'px-3 py-2 text-xs':'w-full px-4 py-3 text-sm'}`}>
      <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded bg-blue-600 text-[11px] font-black text-white">W</span>
      Download voor Word
    </button>
    {showDownload&&url&&<a href={url} download className="text-center text-xs font-semibold text-slate-500 underline-offset-2 hover:text-accent hover:underline">Download .docx</a>}
  </div>
}
