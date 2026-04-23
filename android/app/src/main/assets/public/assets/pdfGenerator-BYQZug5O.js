const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./purify.es-DGFjIGUH.js","./chunk-jRWAZmH_.js","./html2canvas-BGN659ay.js","./jspdf.es.min-GYX4HNGC.js","./defineProperty-Df_FyI5P.js","./preload-helper-CM5_IGEG.js","./typeof-Bigvdwr0.js","./pako.esm-BA9XaIFP.js","./report-branding-CIu_YvA7.js","./useQuery-CyMCfgRr.js","./classPrivateFieldSet2-BQyv2n4V.js","./classPrivateMethodInitSpec-BX_tB9Cq.js","./query-W3qlpLLa.js","./QueryClientProvider-IwncI6kI.js","./jsx-runtime-CR1pcHoO.js","./react-DDzTVtu_.js"])))=>i.map(i=>d[i]);
import{o as e}from"./chunk-jRWAZmH_.js";import{t}from"./preload-helper-CM5_IGEG.js";import{i as n,r}from"./report-branding-CIu_YvA7.js";import{n as i}from"./webview-download-CqGuwggW.js";import{t as a}from"./format-D_Nm7tzA.js";import{t as o}from"./ar-SA-7H4HexIP.js";import{t as s}from"./purify.es-DGFjIGUH.js";function c(e){let t=n(),r=(t.companyName||`A`).charAt(0),i=t.logoUrl?`<img src="${t.logoUrl}" alt="logo" style="width:48px;height:48px;object-fit:contain;border-radius:8px;background:#fff;border:1px solid #e2e8f0;padding:2px;"/>`:`<div style="width:48px;height:48px;border-radius:8px;background:${t.primaryColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">${r}</div>`,a=[];t.email&&a.push(`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${t.accentColor};color:#fff;font-size:10px;">✉</span>${t.email}</div>`),t.website&&a.push(`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${t.accentColor};color:#fff;font-size:10px;">🌐</span>${t.website}</div>`);let o=e?`<div style="background:${t.secondaryColor};color:#fff;text-align:center;padding:8px 12px;margin:12px 0 8px 0;font-size:13px;font-weight:800;border-radius:4px;">${e}</div>`:``;return`
  <div style="display:flex;background:${t.primaryColor};color:#fff;min-height:86px;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;">
    <div style="flex:1;padding:14px 20px;display:flex;flex-direction:column;justify-content:center;font-size:11px;color:#fff;">
      ${a.join(``)||`<div style="opacity:.5;">&nbsp;</div>`}
    </div>
    <div style="flex:1.2;background:#fff;color:${t.primaryColor};display:flex;align-items:center;gap:12px;padding:10px 22px 10px 40px;border-bottom-right-radius:60px;">
      ${i}
      <div style="line-height:1.2;">
        <div style="font-size:18px;font-weight:800;color:${t.primaryColor};">${t.companyName}</div>
        ${t.companyNameEn?`<div style="font-size:11px;color:${t.secondaryColor};font-weight:500;">${t.companyNameEn}</div>`:``}
      </div>
    </div>
  </div>
  <div style="height:6px;background:${t.accentColor};"></div>
  ${o}`}function l(){let e=n(),t=e.phone?`<div style="flex:1;display:flex;align-items:center;gap:10px;"><div style="width:28px;height:28px;border-radius:50%;background:${e.accentColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;">☎</div><div><div style="font-size:9px;opacity:.75;">Phone</div><div style="font-size:11px;font-weight:700;" dir="ltr">${e.phone}</div></div></div>`:`<div style="flex:1;"></div>`,r=e.address?`<div style="flex:1;display:flex;align-items:center;gap:10px;"><div style="width:28px;height:28px;border-radius:50%;background:${e.accentColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;">📍</div><div><div style="font-size:9px;opacity:.75;">Address</div><div style="font-size:11px;font-weight:700;">${e.address}</div></div></div>`:`<div style="flex:1;"></div>`;return`
  <div style="height:6px;background:${e.accentColor};margin-top:16px;"></div>
  <div style="display:flex;background:${e.primaryColor};color:#fff;min-height:60px;padding:12px 24px;gap:24px;align-items:center;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;">
    ${t}
    ${r}
  </div>`}function u(e,t){let r=n(),i=r.primaryColor,s=r.secondaryColor,u=`#CBD5E1`,d=`#F8FAFC`,f=t?.name||`عامل`,p=t?.type||`عامل`,m=t?.dailyWage?`${parseFloat(t.dailyWage).toLocaleString(`en-US`)} ر.ي`:`-`,h=a(new Date,`dd/MM/yyyy`),g=parseFloat(e?.summary?.totalEarned||0),_=parseFloat(e?.summary?.totalPaid||0),v=parseFloat(e?.summary?.finalBalance||0),y=(e?.statement||[]).map((e,t)=>{let n=parseFloat(e.amount||0),r=parseFloat(e.paid||0),i=n-r;return`<tr>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;white-space:nowrap;">${t+1}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;white-space:nowrap;">${e.date?a(new Date(e.date),`dd/MM/yyyy`):`-`}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;white-space:nowrap;">${e.date?a(new Date(e.date),`EEEE`,{locale:o}):`-`}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;">${e.projectName||e.project_name||`-`}</td>
      <td style="text-align:right;padding:3px 6px;border:1px solid ${u};font-size:9px;line-height:1.3;">${e.description||(e.type===`حوالة`?`حوالة لـ ${e.recipientName||`-`}`:`تنفيذ مهام العمل`)}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;white-space:nowrap;">${e.type===`عمل`?e.workDays===void 0?`1.00`:parseFloat(e.workDays).toFixed(2):`-`}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;white-space:nowrap;">${e.type===`عمل`?e.hours||`07:00-15:00`:`-`}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;background:#EFF6FF;font-weight:700;white-space:nowrap;">${n.toLocaleString(`en-US`)}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;background:#FEE2E2;font-weight:700;white-space:nowrap;">${r.toLocaleString(`en-US`)}</td>
      <td style="text-align:center;padding:3px 4px;border:1px solid ${u};font-size:9px;background:${d};font-weight:700;white-space:nowrap;">${i.toLocaleString(`en-US`)}</td>
    </tr>`}).join(``),b=(e?.statement||[]).reduce((e,t)=>{let n=t.projectName||t.project_name||`غير محدد`;e[n]||(e[n]={earned:0,paid:0,days:0});let r=parseFloat(t.amount||0),i=parseFloat(t.paid||0),a=t.type===`عمل`?parseFloat(t.workDays||0):0;return e[n].earned+=r,e[n].paid+=i,e[n].days+=a,e},{}),x=Object.entries(b).map(([e,t])=>`
    <tr>
      <td style="padding:3px 4px;border:1px solid ${u};font-size:9px;">${e}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${u};font-size:9px;">${t.days.toFixed(2)}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${u};font-size:9px;">${t.earned.toLocaleString(`en-US`)}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${u};font-size:9px;">${t.paid.toLocaleString(`en-US`)}</td>
      <td style="text-align:center;padding:3px;border:1px solid ${u};font-size:9px;font-weight:700;">${(t.earned-t.paid).toLocaleString(`en-US`)}</td>
    </tr>
  `).join(``),S=(e?.statement||[]).length>0&&Object.keys(b).length>1?`
    <div style="margin-top:10px;">
      <div style="background:${s};color:#fff;padding:4px 8px;font-size:10px;font-weight:800;border:1px solid ${s};">ملخص المشاريع التفصيلي</div>
      <table style="width:100%;border-collapse:collapse;margin-top:1px;">
        <thead>
          <tr style="background:${d};">
            <th style="padding:3px 4px;border:1px solid ${u};font-size:9px;text-align:right;">المشروع</th>
            <th style="padding:3px;border:1px solid ${u};font-size:9px;text-align:center;">إجمالي الأيام</th>
            <th style="padding:3px;border:1px solid ${u};font-size:9px;text-align:center;">إجمالي المستحق</th>
            <th style="padding:3px;border:1px solid ${u};font-size:9px;text-align:center;">إجمالي المدفوع</th>
            <th style="padding:3px;border:1px solid ${u};font-size:9px;text-align:center;">المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${x}
        </tbody>
      </table>
    </div>
  `:``;return`<div style="direction:rtl;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;padding:0;margin:0;width:794px;">
    ${c(`كشف حساب العامل التفصيلي والشامل`)}
    <div style="display:flex;justify-content:space-between;margin:0 8px 8px 8px;font-size:10px;padding:0 12px;">
      <div>
        <div style="margin-bottom:2px;"><b style="display:inline-block;width:80px;">اسم العامل:</b> ${f}</div>
        <div style="margin-bottom:2px;"><b style="display:inline-block;width:80px;">نوع العامل:</b> ${p}</div>
        <div><b style="display:inline-block;width:80px;">الأجر اليومي:</b> ${m}</div>
      </div>
      <div>
        <div style="margin-bottom:2px;"><b style="display:inline-block;width:80px;">المشروع:</b> ${e?.projectName||`تعدد مشاريع`}</div>
        <div><b style="display:inline-block;width:80px;">تاريخ الإصدار:</b> ${h}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;table-layout:auto;">
      <thead>
        <tr>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">م</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">التاريخ</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">اليوم</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المشروع</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">وصف العمل</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">الأيام</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">الساعات</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المستحق</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المدفوع</th>
          <th style="background:${s};color:#fff;border:1px solid ${i};padding:4px 6px;font-size:9px;font-weight:800;text-align:center;white-space:nowrap;">المتبقي</th>
        </tr>
      </thead>
      <tbody>
        ${y}
        <tr>
          <td colspan="5" style="background:${i};color:#fff;font-weight:800;font-size:10px;text-align:center;padding:4px;border:1px solid ${s};">الإجماليــــــات</td>
          <td style="background:${i};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${s};">${parseFloat(e?.summary?.totalWorkDays||0).toLocaleString(`en-US`)}</td>
          <td style="background:${i};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${s};">-</td>
          <td style="background:${i};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${s};">${g.toLocaleString(`en-US`)}</td>
          <td style="background:${i};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${s};">${_.toLocaleString(`en-US`)}</td>
          <td style="background:${i};color:#fff;font-weight:800;font-size:9px;text-align:center;padding:4px;border:1px solid ${s};">${v.toLocaleString(`en-US`)}</td>
        </tr>
      </tbody>
    </table>
    ${S}
    <div style="margin-top:10px;">
      <table style="width:280px;border:1px solid ${s};border-collapse:collapse;">
        <tr><td colspan="2" style="background:${s};color:#fff;text-align:center;font-weight:800;padding:4px;font-size:11px;border:1px solid ${s};">الملخص المالي</td></tr>
        <tr><td style="padding:3px 6px;font-weight:700;border:1px solid ${u};font-size:10px;">إجمالي المكتسب:</td><td style="padding:3px 6px;text-align:left;border:1px solid ${u};font-size:10px;">${g.toLocaleString(`en-US`)}</td></tr>
        <tr><td style="padding:3px 6px;font-weight:700;border:1px solid ${u};font-size:10px;">إجمالي المدفوع:</td><td style="padding:3px 6px;text-align:left;border:1px solid ${u};font-size:10px;">${_.toLocaleString(`en-US`)}</td></tr>
        <tr><td style="padding:3px 6px;font-weight:700;border:1px solid ${u};font-size:10px;background:${d};">الرصيد النهائي:</td><td style="padding:3px 6px;text-align:left;border:1px solid ${u};font-size:10px;font-weight:800;background:${d};">${v.toLocaleString(`en-US`)}</td></tr>
      </table>
    </div>
    ${l()}
    <div style="text-align:center;font-size:8px;color:#7F7F7F;margin-top:6px;padding:4px;">
      تاريخ الإنشاء: ${a(new Date,`dd/MM/yyyy HH:mm`)}
    </div>
  </div>`}var d=async(n,o)=>{await r();try{if(!n||!n.statement)return console.error(`No data provided for PDF generation`),!1;let r=(await t(async()=>{let{default:e}=await import(`./purify.es-DGFjIGUH.js`).then(e=>e.n);return{default:e}},__vite__mapDeps([0,1]),import.meta.url)).default,s=u(n,o),c=document.createElement(`div`);c.style.position=`fixed`,c.style.left=`-9999px`,c.style.top=`0`,c.style.width=`794px`,c.style.background=`#fff`,c.style.zIndex=`-1`,c.innerHTML=r.sanitize(s,{ADD_TAGS:[`style`],ADD_ATTR:[`dir`,`lang`]}),document.body.appendChild(c),await new Promise(e=>setTimeout(e,300));let l=(await t(async()=>{let{default:t}=await import(`./html2canvas-BGN659ay.js`).then(t=>e(t.default,1));return{default:t}},__vite__mapDeps([2,1]),import.meta.url)).default,{jsPDF:d}=await t(async()=>{let{jsPDF:e}=await import(`./jspdf.es.min-GYX4HNGC.js`);return{jsPDF:e}},__vite__mapDeps([3,4,1,5,6,7]),import.meta.url),f=await l(c,{scale:2,useCORS:!0,allowTaint:!0,backgroundColor:`#ffffff`,width:794,windowWidth:794});document.body.removeChild(c);let p=f.height*210/f.width,m=new d(`p`,`mm`,`a4`),h=p,g=0,_=f.toDataURL(`image/jpeg`,.92);for(m.addImage(_,`JPEG`,0,g,210,p),h-=297;h>0;)g=-(p-h),m.addPage(),m.addImage(_,`JPEG`,0,g,210,p),h-=297;return await i(m.output(`blob`),`كشف_حساب_${o?.name||`عامل`}_${a(new Date,`yyyy-MM-dd`)}.pdf`,`application/pdf`)}catch(e){return console.error(`PDF generation error:`,e),!1}};async function f(n){try{let r=document.createElement(`div`);r.style.position=`fixed`,r.style.left=`-9999px`,r.style.top=`0`,r.style.width=n.orientation===`landscape`?`1122px`:`794px`,r.style.background=`#fff`,r.style.zIndex=`-1`,r.innerHTML=s.sanitize(n.html,{ADD_TAGS:[`style`],ADD_ATTR:[`dir`,`lang`]}),document.body.appendChild(r),await new Promise(e=>setTimeout(e,300));let a=(await t(async()=>{let{default:t}=await import(`./html2canvas-BGN659ay.js`).then(t=>e(t.default,1));return{default:t}},__vite__mapDeps([2,1]),import.meta.url)).default,{jsPDF:o}=await t(async()=>{let{jsPDF:e}=await import(`./jspdf.es.min-GYX4HNGC.js`);return{jsPDF:e}},__vite__mapDeps([3,4,1,5,6,7]),import.meta.url),c=n.orientation===`landscape`?1122:794,l=await a(r,{scale:2,useCORS:!0,allowTaint:!0,backgroundColor:`#ffffff`,width:c,windowWidth:c});document.body.removeChild(r);let u=n.orientation===`landscape`,d=u?297:210,f=u?210:297,p=l.height*d/l.width,m=l.toDataURL(`image/jpeg`,.92),h=new o(u?`l`:`p`,`mm`,n.format===`Letter`?`letter`:`a4`);if(p<=f)h.addImage(m,`JPEG`,0,0,d,p);else{let e=p,t=0;for(h.addImage(m,`JPEG`,0,t,d,p),e-=f;e>0;)t=-(p-e),h.addPage(),h.addImage(m,`JPEG`,0,t,d,p),e-=f}return await i(h.output(`blob`),`${n.filename}.pdf`,`application/pdf`)}catch{return!1}}function p(e){return e&&(e.replace(/تاريخ\s*(الإصدار|الاستخراج|التقرير|الإنشاء)\s*[:：]?\s*[^|•·\-—\n]+/g,``).replace(/^[\s|•·\-—]+|[\s|•·\-—]+$/g,``).replace(/[\s]*[|•·]+[\s]*[|•·]+[\s]*/g,` • `).trim()||void 0)}function m(e){if(e!==void 0)return e;try{return typeof window<`u`&&window.localStorage?window.localStorage.getItem(`construction-app-selected-project-name`):null}catch{return null}}function h(e,t){let n=(e||``).trim(),r=(t||``).trim();return r?r===`جميع المشاريع`||r===`all`?`${n} — جميع المشاريع`:`${n} — مشروع ${r}`:n}async function g(e){let{ensureBrandingLoaded:n,getBranding:r}=await t(async()=>{let{ensureBrandingLoaded:e,getBranding:t}=await import(`./report-branding-CIu_YvA7.js`).then(e=>e.o);return{ensureBrandingLoaded:e,getBranding:t}},__vite__mapDeps([8,1,5,9,10,11,12,13,14,15]),import.meta.url);await n();let i=m(e.projectName);e={...e,reportTitle:h(e.reportTitle,i),subtitle:p(e.subtitle)};let a=r(),o=e.orientation===`landscape`?1122:794,s=e.columns.length,u=e.columns.reduce((e,t)=>e+(t.width||10),0);e.headerColor||a.primaryColor;let d=e.accentColor||a.secondaryColor||`#334155`,g=s>14?8:s>10?9:10,_=`#475569`,v=e=>`${((e||10)/u*100).toFixed(2)}%`,y=e=>`width:${v(e.width)};padding:8px 6px;border:1.2px solid ${_};font-size:${g}px;font-weight:800;text-align:center;vertical-align:middle;color:#fff;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;`,b=e=>`padding:7px 6px;border:1px solid ${_};text-align:center;vertical-align:middle;font-size:${g}px;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;line-height:1.4;${e?`background:#F8FAFC;`:`background:#fff;`}`,x=e.columns.map(e=>`<th style="${y(e)}">${e.header}</th>`).join(``),S=e.data.map((t,n)=>`<tr>${e.columns.map(e=>{let r=t[e.key]??`-`,i=e.color?e.color(r,t):void 0,a=i?`color:${i};font-weight:700;`:``;return`<td style="${b(n%2!=0)}${a}">${r}</td>`}).join(``)}</tr>`).join(``),C=``;if(e.totals){let t=`padding:10px 6px;border:1.2px solid ${_};font-size:${g}px;font-weight:800;color:#fff;text-align:center;vertical-align:middle;`,n=v((e.columns[0]?.width||0)+(e.columns[1]?.width||0)),r=e.totals.values[e.columns[1]?.key];C=`<tr style="background:${d};">${`<td colspan="2" style="${t}width:${n};">${r!==void 0&&r!==``&&r!==null?`${e.totals.label} — ${r}`:e.totals.label}</td>`}${e.columns.slice(2).map(n=>{let r=e.totals.values[n.key];return r===void 0?`<td style="${t}width:${v(n.width)};"></td>`:`<td style="${t}width:${v(n.width)};">${typeof r==`number`?r.toLocaleString():r}</td>`}).join(``)}</tr>`}let w=e.infoItems?.length?`
    <div style="display:flex;justify-content:center;gap:20px;padding:8px 16px;font-size:11px;background:#F8FAFC;margin:0 16px;border-radius:6px;flex-wrap:wrap;border:1px solid #E2E8F0;">
      ${e.infoItems.map(e=>`<span>${e.label}: <b${e.color?` style="color:${e.color};"`:``}>${e.value}</b></span>`).join(``)}
    </div>
  `:``;return f({html:`
    <div dir="rtl" lang="ar" style="font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;padding:0;margin:0;width:${o}px;">
      ${c(e.reportTitle)}
      ${e.subtitle?`<div style="text-align:center;padding:6px 16px 2px;font-size:11px;color:#6B7280;">${e.subtitle}</div>`:``}
      ${w}
      <table style="width:auto;max-width:calc(100% - 32px);border-collapse:collapse;margin:12px auto;table-layout:auto;border:1.5px solid ${_};">
        <thead>
          <tr style="background:${d};color:#fff;">${x}</tr>
        </thead>
        <tbody>
          ${S}
          ${C}
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-around;padding:20px 40px;margin-top:10px;">
        <div style="text-align:center;font-size:10px;"><b>توقيع المهندس</b><br/>.................................</div>
        <div style="text-align:center;font-size:10px;"><b>توقيع مدير المشروع</b><br/>.................................</div>
        <div style="text-align:center;font-size:10px;"><b>توقيع المدير العام</b><br/>.................................</div>
      </div>
      ${l()}
      <div style="text-align:center;padding:8px 0;font-size:9px;color:#9CA3AF;margin:4px 16px 0;">
        تم إنشاء هذا التقرير آلياً - ${new Date().toLocaleDateString(`en-GB`)} ${new Date().toLocaleTimeString(`en-GB`)}
      </div>
    </div>
  `,filename:e.filename,orientation:e.orientation||`landscape`,format:`A4`})}export{g as generateTablePDF,d as t};