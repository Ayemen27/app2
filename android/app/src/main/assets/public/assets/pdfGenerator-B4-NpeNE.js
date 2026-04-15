const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./jspdf.es.min-DbfPIa1R.js","./index-BG05E7zY.js","./index-Cqt_Q8GC.css","./pako.esm-DCGaeOFe.js"])))=>i.map(i=>d[i]);
import{_ as $}from"./index-BG05E7zY.js";import{downloadFile as _}from"./webview-download-2vdhcLJH.js";import D from"./purify.es-BgtpMKW3.js";async function z(t){try{const a=document.createElement("div");a.style.position="fixed",a.style.left="-9999px",a.style.top="0",a.style.width=t.orientation==="landscape"?"1122px":"794px",a.style.background="#fff",a.style.zIndex="-1",a.innerHTML=D.sanitize(t.html,{ADD_TAGS:["style"],ADD_ATTR:["dir","lang"]}),document.body.appendChild(a),await new Promise(i=>setTimeout(i,300));const d=(await $(async()=>{const{default:i}=await import("./html2canvas.esm-B0tyYwQk.js");return{default:i}},[],import.meta.url)).default,{jsPDF:h}=await $(async()=>{const{jsPDF:i}=await import("./jspdf.es.min-DbfPIa1R.js").then(n=>n.j);return{jsPDF:i}},__vite__mapDeps([0,1,2,3]),import.meta.url),f=t.orientation==="landscape"?1122:794,o=await d(a,{scale:2,useCORS:!0,allowTaint:!0,backgroundColor:"#ffffff",width:f,windowWidth:f});document.body.removeChild(a);const g=t.orientation==="landscape",x=g?297:210,c=g?210:297,s=o.height*x/o.width,p=new h(g?"l":"p","mm",t.format==="Letter"?"letter":"a4");let r=s,u=0;const m=o.toDataURL("image/jpeg",.92);for(p.addImage(m,"JPEG",0,u,x,s),r-=c;r>0;)u=-(s-r),p.addPage(),p.addImage(m,"JPEG",0,u,x,s),r-=c;const e=p.output("blob"),l=`${t.filename}.pdf`;return await _(e,l,"application/pdf")}catch{return!1}}async function E(t){const a=t.orientation==="landscape"?1122:794,d=t.columns.length,h=t.columns.reduce((e,l)=>e+(l.width||10),0),f=t.headerColor||"#2E5090",o=t.accentColor||"#1B2A4A",g=`padding:5px 3px;border:1px solid ${f};font-size:${d>14?"7":d>10?"8":"9"}px;font-weight:800;text-align:center;white-space:nowrap;`,x=e=>`padding:4px 3px;border:1px solid #CBD5E1;text-align:center;font-size:${d>14?"7":d>10?"8":"9"}px;${e?"background:#F8FAFC;":""}`,c=t.columns.map(e=>`${((e.width||10)/h*100).toFixed(1)}%`),s=t.columns.map((e,l)=>`<th style="${g}width:${c[l]};">${e.header}</th>`).join(""),p=t.data.map((e,l)=>`<tr>${t.columns.map((n,w)=>{const y=e[n.key]??"-",b=n.color?n.color(y,e):void 0,v=b?`color:${b};font-weight:700;`:"";return`<td style="${x(l%2!==0)}${v}width:${c[w]};">${y}</td>`}).join("")}</tr>`).join("");let r="";if(t.totals){const e=t.columns.map((l,i)=>{const n=t.totals.values[l.key];return i===0?`<td style="padding:5px 3px;border:1px solid ${o};font-size:9px;font-weight:800;color:#fff;text-align:center;" colspan="1">${t.totals.label}</td>`:n!==void 0?`<td style="padding:5px 3px;border:1px solid ${o};font-size:9px;font-weight:800;color:#fff;text-align:center;">${typeof n=="number"?n.toLocaleString():n}</td>`:`<td style="padding:5px 3px;border:1px solid ${o};font-size:9px;color:#fff;"></td>`}).join("");r=`<tr style="background:${o};">${e}</tr>`}const u=t.infoItems?.length?`
    <div style="display:flex;justify-content:center;gap:20px;padding:8px 16px;font-size:11px;background:#F8FAFC;margin:0 16px;border-radius:6px;flex-wrap:wrap;border:1px solid #E2E8F0;">
      ${t.infoItems.map(e=>`<span>${e.label}: <b${e.color?` style="color:${e.color};"`:""}>${e.value}</b></span>`).join("")}
    </div>
  `:"",m=`
    <div dir="rtl" lang="ar" style="font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;padding:0;margin:0;width:${a}px;">
      <div style="background:#1B2A4A;color:#fff;text-align:center;padding:10px 0;font-size:16px;font-weight:800;">الفتيني للمقاولات العامة والاستشارات الهندسية</div>
      <div style="background:${f};color:#fff;text-align:center;padding:8px 0;font-size:14px;font-weight:700;">${t.reportTitle}</div>
      ${t.subtitle?`<div style="text-align:center;padding:5px 0;font-size:11px;color:#6B7280;">${t.subtitle}</div>`:""}
      ${u}
      <table style="width:calc(100% - 32px);border-collapse:collapse;margin:10px 16px;table-layout:fixed;">
        <colgroup>${c.map(e=>`<col style="width:${e}">`).join("")}</colgroup>
        <thead>
          <tr style="background:${o};color:#fff;">${s}</tr>
        </thead>
        <tbody>
          ${p}
          ${r}
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-around;padding:20px 40px;margin-top:10px;">
        <div style="text-align:center;font-size:10px;"><b>توقيع المهندس</b><br/>.................................</div>
        <div style="text-align:center;font-size:10px;"><b>توقيع مدير المشروع</b><br/>.................................</div>
        <div style="text-align:center;font-size:10px;"><b>توقيع المدير العام</b><br/>.................................</div>
      </div>
      <div style="text-align:center;padding:8px 0;font-size:9px;color:#9CA3AF;border-top:1px solid #E5E7EB;margin:4px 16px 0;">
        تم إنشاء هذا التقرير آلياً بواسطة نظام إدارة مشاريع البناء - ${new Date().toLocaleDateString("en-GB")} - ${new Date().toLocaleTimeString("en-GB")}
      </div>
    </div>
  `;return z({html:m,filename:t.filename,orientation:t.orientation||"landscape",format:"A4"})}export{z as default,z as generatePDF,E as generateTablePDF};
