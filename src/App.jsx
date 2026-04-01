import { useState, useEffect, useMemo, createContext, useContext, useCallback } from "react";
import { Package, Ship, Plane, Truck, ChevronRight, ChevronDown, Plus, Search, Bell, FileText, Upload, DollarSign, CheckCircle2, Circle, Clock, AlertTriangle, X, Anchor, BarChart3, LayoutDashboard, Columns3, FolderOpen, ChevronLeft, Eye, Sun, Moon, RefreshCw, Settings } from "lucide-react";
import { initDB, getProjects, getShipments, addShipment, addProject, updateShipment, toggleMilestone as dbToggleMilestone, getNextRef, deleteShipment, resetDB, getMode } from "./db/schema.js";
import NewShipmentModal from "./components/NewShipmentModal.jsx";
import DocumentsTab from "./components/DocumentsTab.jsx";
import CostsTab from "./components/CostsTab.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import { fetchRates, toEUR, formatEUR, FALLBACK_RATES } from "./utils/currency.js";

const DARK = {
  bg0:"#0A0E17",bg1:"#0F1421",bg2:"#161C2E",bg3:"#1C2438",bg4:"#232D45",
  border0:"#1A2236",border1:"#243049",border2:"#2E3D5C",
  text0:"#F1F5F9",text1:"#CBD5E1",text2:"#8494B0",text3:"#4F5E78",
  accent:"#3B82F6",accentGlow:"rgba(59,130,246,0.12)",
  green:"#10B981",greenBg:"rgba(16,185,129,0.12)",greenBorder:"rgba(16,185,129,0.25)",
  amber:"#F59E0B",amberBg:"rgba(245,158,11,0.12)",amberBorder:"rgba(245,158,11,0.25)",
  red:"#EF4444",redBg:"rgba(239,68,68,0.10)",redBorder:"rgba(239,68,68,0.25)",
  purple:"#A78BFA",purpleBg:"rgba(167,139,250,0.12)",purpleBorder:"rgba(167,139,250,0.25)",
  shadow:"rgba(0,0,0,0.3)",shadowHeavy:"rgba(0,0,0,0.5)",
  modeOcean:"#3B82F6",modeAir:"#A78BFA",modeTruck:"#F59E0B",
};
const LIGHT = {
  bg0:"#0B1120",bg1:"#F5F6F8",bg2:"#FFFFFF",bg3:"#F9FAFB",bg4:"#F3F4F6",
  border0:"#E5E7EB",border1:"#E5E7EB",border2:"#D1D5DB",
  text0:"#0F172A",text1:"#374151",text2:"#6B7280",text3:"#9CA3AF",
  accent:"#2563EB",accentGlow:"rgba(37,99,235,0.08)",
  green:"#059669",greenBg:"#D1FAE5",greenBorder:"#6EE7B7",
  amber:"#D97706",amberBg:"#FEF3C7",amberBorder:"#FDE68A",
  red:"#DC2626",redBg:"#FEE2E2",redBorder:"#FECACA",
  purple:"#7C3AED",purpleBg:"#EDE9FE",purpleBorder:"#C4B5FD",
  shadow:"rgba(0,0,0,0.06)",shadowHeavy:"rgba(0,0,0,0.15)",
  modeOcean:"#2563EB",modeAir:"#7C3AED",modeTruck:"#D97706",
};
const ThemeCtx = createContext(DARK);
const useT = () => useContext(ThemeCtx);

const fmtDate=d=>{if(!d||d==="—")return"—";return new Date(d).toLocaleDateString("fi-FI",{day:"numeric",month:"short",year:"numeric"});};
const daysUntil=d=>{if(!d||d==="—")return null;return Math.ceil((new Date(d)-new Date())/86400000);};
const statusCfg=T=>({
  planned:{label:"Planned",color:T.text2,bg:T.bg3,ring:T.border2},
  booked:{label:"Booked",color:T.amber,bg:T.amberBg,ring:T.amberBorder},
  in_transit:{label:"In Transit",color:T.accent,bg:T.accentGlow,ring:"rgba(59,130,246,0.3)"},
  arrived:{label:"Arrived",color:T.purple,bg:T.purpleBg,ring:T.purpleBorder},
  delivered:{label:"Delivered",color:T.green,bg:T.greenBg,ring:T.greenBorder},
  completed:{label:"Completed",color:T.text3,bg:T.bg3,ring:T.border1},
});
const MODE_ICON={ocean:Ship,air:Plane,truck:Truck};

function Badge({status}){const T=useT(),c=statusCfg(T)[status];if(!c)return null;
  return<span style={{background:c.bg,color:c.color,border:`1px solid ${c.ring}`,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{c.label}</span>;}
function MIcon({mode,size=15}){const T=useT(),I=MODE_ICON[mode]||Package;return<I size={size} color={{ocean:T.modeOcean,air:T.modeAir,truck:T.modeTruck}[mode]||T.text2}/>;}
function PBar({milestones}){const T=useT(),done=milestones.filter(m=>m.done).length,pct=milestones.length?(done/milestones.length)*100:0;
  return<div style={{display:"flex",alignItems:"center",gap:8,minWidth:100}}><div style={{height:4,flex:1,background:T.bg4,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct===100?T.green:T.accent,borderRadius:2,transition:"width 0.3s"}}/></div><span style={{fontSize:12,fontWeight:500,color:T.text2}}>{done}/{milestones.length}</span></div>;}
function ThemeToggle({isDark,onToggle}){
  return<button onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.12)"}`,background:isDark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",cursor:"pointer"}}>
    <div style={{width:40,height:22,borderRadius:11,background:isDark?"#1E3A5F":"#93C5FD",position:"relative",transition:"background 0.3s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:3,left:isDark?3:21,transition:"left 0.3s",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>{isDark?<Moon size={9} color="#1E3A5F"/>:<Sun size={9} color="#D97706"/>}</div></div>
    <span style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.5)"}}>{isDark?"Dark":"Light"}</span></button>;}

function generateNotifs(shipments){const notifs=[];
  shipments.forEach(s=>{(s.milestones||[]).filter(m=>!m.done&&m.date).forEach(m=>{const d=daysUntil(m.date);
    if(d!==null&&d>=-1&&d<=7){notifs.push({id:`${s.id}-${m.id}`,type:d<0?"warning":"deadline",message:`${m.label} for ${s.customerRef||s.ref}${d<0?` was ${Math.abs(d)}d ago`:d===0?" is today":` in ${d} days`}`,date:m.date,urgent:d<=2,shipmentId:s.id});}});});
  notifs.sort((a,b)=>(daysUntil(a.date)??99)-(daysUntil(b.date)??99));return notifs;}

function DeadlineSidebar({shipments,onSelect}){const T=useT();
  const upcoming=[];
  shipments.forEach(s=>{(s.milestones||[]).filter(m=>!m.done&&m.date).forEach(m=>{const d=daysUntil(m.date);if(d!==null&&d>=-1&&d<=14)upcoming.push({...m,shipmentRef:s.ref,customerRef:s.customerRef,shipmentId:s.id,days:d});});});
  upcoming.sort((a,b)=>a.days-b.days);
  return<div style={{width:300,minWidth:300,background:T.bg2,borderLeft:`1px solid ${T.border1}`,height:"100%",overflow:"auto"}}>
    <div style={{padding:16,borderBottom:`1px solid ${T.border1}`}}><h3 style={{fontSize:11,fontWeight:700,textTransform:"uppercase",color:T.text2,letterSpacing:"0.1em",margin:0}}>Upcoming Deadlines</h3></div>
    <div style={{padding:8}}>{upcoming.map((item,i)=>{const urg=item.days<=2,past=item.days<0;
      return<button key={i} onClick={()=>onSelect(item.shipmentId)} style={{width:"100%",textAlign:"left",padding:12,borderRadius:8,marginBottom:4,background:past?T.redBg:urg?T.amberBg:T.bg3,border:`1px solid ${past?T.redBorder:urg?T.amberBorder:T.border0}`,cursor:"pointer",display:"block",transition:"transform 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="translateX(2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,fontWeight:700,color:past?T.red:urg?T.amber:T.accent,fontFamily:"'JetBrains Mono',monospace"}}>{item.days<0?`${Math.abs(item.days)}d overdue`:item.days===0?"TODAY":`${item.days}d`}</span>{(past||urg)&&<AlertTriangle size={13} color={past?T.red:T.amber}/>}</div>
        <div style={{fontSize:14,fontWeight:600,color:T.text0}}>{item.label}</div>
        <div style={{fontSize:12,marginTop:2,color:T.text2}}>{item.customerRef||item.shipmentRef}</div></button>;})}
      {!upcoming.length&&<div style={{padding:16,textAlign:"center",fontSize:14,color:T.text3}}>No upcoming deadlines</div>}</div></div>;}

function NotifPanel({notifications,onClose}){const T=useT();
  return<div style={{position:"absolute",top:48,right:16,width:380,background:T.bg3,borderRadius:12,boxShadow:`0 20px 60px ${T.shadowHeavy}`,border:`1px solid ${T.border2}`,zIndex:100}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:16,borderBottom:`1px solid ${T.border1}`}}><h3 style={{fontWeight:700,fontSize:14,color:T.text0,margin:0}}>Notifications</h3><button onClick={onClose} style={{cursor:"pointer",background:"none",border:"none",color:T.text2,padding:4}}><X size={16}/></button></div>
    <div style={{maxHeight:400,overflow:"auto"}}>{notifications.length?notifications.map(n=>
      <div key={n.id} style={{padding:12,display:"flex",gap:12,alignItems:"flex-start",borderBottom:`1px solid ${T.border0}`}}>
        <div style={{marginTop:2}}>{n.type==="deadline"&&<Clock size={16} color={n.urgent?T.amber:T.text2}/>}{n.type==="warning"&&<AlertTriangle size={16} color={T.red}/>}{n.type==="info"&&<CheckCircle2 size={16} color={T.green}/>}</div>
        <div><div style={{fontSize:14,color:T.text1}}>{n.message}</div><div style={{fontSize:12,marginTop:4,color:T.text3}}>{fmtDate(n.date)}</div></div></div>)
      :<div style={{padding:24,textAlign:"center",fontSize:14,color:T.text3}}>No notifications</div>}</div></div>;}

function ShipmentDetail({shipment,project,onBack,onToggleMilestone,onUpdate,rates}){const T=useT();
  const[tab,setTab]=useState("overview");
  const milestones=shipment.milestones||[];
  const mono="'JetBrains Mono',monospace";
  const totalCost=(shipment.costs?.items||[]).reduce((s,c)=>s+toEUR(c.amount,c.currency,rates),0)+(shipment.costs?.running||[]).reduce((s,r)=>{
    const days=r.status==="running"?Math.max(1,Math.ceil((new Date()-new Date(r.startDate))/86400000)):(r.totalDays||0);
    return s+toEUR(r.dailyRate*days,r.currency,rates);},0);
  const quoted=shipment.costs?.quoted||0,margin=quoted-totalCost,marginPct=quoted>0?(margin/quoted*100):0;
  const tabs=[{id:"overview",label:"Overview",icon:Eye},{id:"costs",label:"Costs",icon:DollarSign},{id:"documents",label:"Documents",icon:FileText},{id:"milestones",label:"Milestones",icon:CheckCircle2}];

  return<div style={{height:"100%",overflow:"auto",background:T.bg1}}>
    <div style={{padding:24,borderBottom:`1px solid ${T.border1}`,background:`linear-gradient(180deg,${T.bg2} 0%,${T.bg1} 100%)`}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:4,fontSize:14,marginBottom:16,padding:"4px 8px",borderRadius:4,color:T.text2,background:"none",border:"none",cursor:"pointer"}}><ChevronLeft size={16}/> Back</button>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><MIcon mode={shipment.mode} size={22}/><h1 style={{fontSize:24,fontWeight:700,color:T.text0,fontFamily:mono,margin:0}}>{shipment.ref}</h1><Badge status={shipment.status}/></div>
          {project&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,marginBottom:4}}><FolderOpen size={14} color={T.text2}/><span style={{color:T.text2}}>Project: <strong style={{color:T.text0}}>{project.name}</strong></span>{shipment.customerRef&&<span style={{color:T.text3}}>• {shipment.customerRef}</span>}</div>}
          <div style={{fontSize:14,marginTop:8,color:T.text1}}><strong>{shipment.origin}</strong> → <strong>{shipment.destination}</strong><span style={{margin:"0 8px",color:T.border2}}>|</span>{shipment.carrier} • {shipment.containerType}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,color:T.text2}}>Margin</div>
          <div style={{fontSize:24,fontWeight:700,color:margin>=0?T.green:T.red,fontFamily:mono}}>{formatEUR(margin)}</div>
          <div style={{fontSize:12,color:margin>=0?T.green:T.red}}>{marginPct.toFixed(1)}%</div></div></div></div>
    <div style={{display:"flex",gap:0,paddingLeft:24,paddingRight:24,borderBottom:`1px solid ${T.border1}`,background:T.bg2}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",fontSize:14,fontWeight:500,color:tab===t.id?T.accent:T.text2,background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?T.accent:"transparent"}`,marginBottom:-1,cursor:"pointer"}}><t.icon size={15}/>{t.label}</button>)}</div>
    <div style={{padding:24}}>
      {tab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
        <div><h3 style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16,color:T.text2}}>Transport Details</h3>
          <div style={{background:T.bg2,borderRadius:10,border:`1px solid ${T.border1}`}}>
            {[["Vessel / Vehicle",shipment.vessel||"—"],["Voyage",shipment.voyage||"—"],["Carrier",shipment.carrier||"—"],["Routing",shipment.routing||"—"],["Container / Cargo",shipment.containerType||"—"],["ETD",fmtDate(shipment.etd)],["ETA",fmtDate(shipment.eta)]].map(([l,v],i)=>
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 16px",borderBottom:i<6?`1px solid ${T.border0}`:"none"}}><span style={{fontSize:14,color:T.text2}}>{l}</span><span style={{fontSize:14,fontWeight:500,color:T.text0}}>{v}</span></div>)}</div></div>
        <div><h3 style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16,color:T.text2}}>Milestone Progress</h3>
          {milestones.map((m,i)=>{const d=daysUntil(m.date),isNext=!m.done&&(i===0||milestones[i-1].done);
            return<div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:8,borderRadius:8,marginBottom:4,background:isNext?T.accentGlow:"transparent"}}>
              <button onClick={()=>onToggleMilestone(shipment.id,m.id)} style={{flexShrink:0,cursor:"pointer",color:m.done?T.green:T.text3,background:"none",border:"none",padding:0}}>{m.done?<CheckCircle2 size={20}/>:<Circle size={20}/>}</button>
              <div style={{flex:1}}><span style={{fontSize:14,color:m.done?T.text3:T.text0,textDecoration:m.done?"line-through":"none"}}>{m.label}</span></div>
              <span style={{fontSize:12,color:T.text3,fontFamily:mono}}>{m.date?fmtDate(m.date):"TBD"}</span>
              {d!==null&&!m.done&&d<=3&&d>=0&&<span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:4,background:d<=1?T.redBg:T.amberBg,color:d<=1?T.red:T.amber}}>{d===0?"TODAY":`${d}d`}</span>}</div>;})}</div></div>}
      {tab==="costs"&&<CostsTab T={T} shipment={shipment} rates={rates} onUpdate={onUpdate}/>}
      {tab==="documents"&&<DocumentsTab T={T} shipment={shipment} onDocumentAdded={onUpdate}/>}
      {tab==="milestones"&&<div style={{maxWidth:540}}>{milestones.map((m,i)=>{const d=daysUntil(m.date);
        return<div key={m.id} style={{display:"flex",gap:16}}><div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <button onClick={()=>onToggleMilestone(shipment.id,m.id)} style={{cursor:"pointer",color:m.done?T.green:T.text3,background:"none",border:"none",padding:0}}>{m.done?<CheckCircle2 size={24}/>:<Circle size={24}/>}</button>
          {i<milestones.length-1&&<div style={{width:2,flex:1,background:m.done?T.greenBorder:T.border1,minHeight:32}}/>}</div>
          <div style={{paddingBottom:24}}><div style={{fontSize:14,fontWeight:600,color:m.done?T.text3:T.text0}}>{m.label}</div>
            <div style={{fontSize:12,color:T.text3}}>{m.date?fmtDate(m.date):"TBD"}{d!==null&&!m.done&&d>=0&&d<=7&&<span style={{marginLeft:8,fontWeight:700,color:d<=2?T.red:T.amber}}>({d===0?"today":`in ${d} days`})</span>}</div></div></div>;})}</div>}
    </div></div>;}

function KanbanView({shipments,projects,onSelect}){const T=useT(),SC=statusCfg(T);
  return<div style={{display:"flex",gap:16,padding:24,height:"100%",overflow:"auto"}}>
    {["planned","booked","in_transit","arrived","delivered"].map(st=>{const items=shipments.filter(s=>s.status===st),cfg=SC[st];
      return<div key={st} style={{minWidth:260,width:260,flex:"0 0 260px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingLeft:4}}><div style={{width:10,height:10,borderRadius:"50%",background:cfg.color}}/><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:cfg.color}}>{cfg.label}</span><span style={{fontSize:11,fontWeight:700,padding:"1px 6px",borderRadius:10,background:cfg.bg,color:cfg.color}}>{items.length}</span></div>
        <div>{items.map(s=>{const proj=projects.find(p=>p.id===s.projectId),nm=(s.milestones||[]).find(m=>!m.done&&m.date),d=nm?daysUntil(nm.date):null;
          return<button key={s.id} onClick={()=>onSelect(s.id)} style={{width:"100%",textAlign:"left",padding:12,borderRadius:12,marginBottom:8,background:T.bg2,border:`1px solid ${T.border1}`,cursor:"pointer",display:"block",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 6px 20px ${T.shadow}`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border1;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:T.text1,fontFamily:"'JetBrains Mono',monospace"}}>{s.ref}</span><MIcon mode={s.mode} size={14}/></div>
            {proj&&<div style={{fontSize:12,marginBottom:6,color:T.text2}}><span style={{fontWeight:600,color:T.text1}}>{proj.name}</span> • {s.customerRef}</div>}
            <div style={{fontSize:12,marginBottom:8,color:T.text2}}>{s.origin} → {s.destination}</div><PBar milestones={s.milestones||[]}/>
            {nm&&d!==null&&d<=5&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:500,color:d<=2?T.red:T.amber}}><Clock size={12}/>{nm.label} {d===0?"today":d<0?`${Math.abs(d)}d ago`:`in ${d}d`}</div>}
          </button>;})}
          {!items.length&&<div style={{padding:16,textAlign:"center",fontSize:12,borderRadius:12,color:T.text3,background:T.bg2,border:`1px dashed ${T.border1}`}}>No shipments</div>}</div></div>;})}</div>;}

function FinView({shipments,projects,rates}){const T=useT(),[groupBy,setGroupBy]=useState("all");
  const calc=s=>{const c=(s.costs?.items||[]).reduce((a,i)=>a+toEUR(i.amount,i.currency,rates),0)+(s.costs?.running||[]).reduce((a,r)=>{
    const days=r.status==="running"?Math.max(1,Math.ceil((new Date()-new Date(r.startDate))/86400000)):(r.totalDays||0);
    return a+toEUR(r.dailyRate*days,r.currency,rates);},0);return{quoted:s.costs?.quoted||0,cost:c,margin:(s.costs?.quoted||0)-c};};
  const grouped=groupBy==="project"?[...projects.map(p=>({label:p.name,customer:p.customer,shipments:shipments.filter(s=>s.projectId===p.id)})),{label:"Loose Shipments",customer:"—",shipments:shipments.filter(s=>!s.projectId)}].filter(g=>g.shipments.length>0):[{label:"All Shipments",customer:"",shipments}];
  const gt=shipments.reduce((a,s)=>{const f=calc(s);return{quoted:a.quoted+f.quoted,cost:a.cost+f.cost,margin:a.margin+f.margin};},{quoted:0,cost:0,margin:0});
  const mono="'JetBrains Mono',monospace";
  return<div style={{padding:24,height:"100%",overflow:"auto"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text0,margin:0}}>Financial Overview</h2>
      <div style={{display:"flex",gap:4,background:T.bg2,borderRadius:8,padding:3,border:`1px solid ${T.border1}`}}>
        {["all","project"].map(g=><button key={g} onClick={()=>setGroupBy(g)} style={{padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:500,background:groupBy===g?T.accent:"transparent",color:groupBy===g?"white":T.text2,border:"none",cursor:"pointer"}}>{g==="all"?"All":"By Project"}</button>)}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>{[
      {l:"Total Quoted",v:formatEUR(gt.quoted),c:T.accent,bg:T.accentGlow,b:"rgba(59,130,246,0.2)"},
      {l:"Total Costs",v:formatEUR(gt.cost),c:T.text1,bg:T.bg2,b:T.border1},
      {l:"Total Margin",v:formatEUR(gt.margin),c:gt.margin>=0?T.green:T.red,bg:gt.margin>=0?T.greenBg:T.redBg,b:gt.margin>=0?T.greenBorder:T.redBorder}
    ].map((c,i)=><div key={i} style={{padding:20,borderRadius:12,background:c.bg,border:`1px solid ${c.b}`}}><div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,color:T.text2}}>{c.l}</div><div style={{fontSize:24,fontWeight:700,color:c.c,fontFamily:mono}}>{c.v}</div></div>)}</div>
    {grouped.map((group,gi)=>{const gf=group.shipments.reduce((a,s)=>{const f=calc(s);return{quoted:a.quoted+f.quoted,cost:a.cost+f.cost,margin:a.margin+f.margin};},{quoted:0,cost:0,margin:0});
      return<div key={gi} style={{marginBottom:24}}>
        {groupBy==="project"&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,paddingLeft:4}}>
          <div><span style={{fontWeight:700,fontSize:14,color:T.text0}}>{group.label}</span>{group.customer!=="—"&&<span style={{fontSize:12,marginLeft:8,color:T.text2}}>{group.customer}</span>}</div>
          <span style={{fontWeight:700,fontSize:14,color:gf.margin>=0?T.green:T.red,fontFamily:mono}}>Margin: {formatEUR(gf.margin)}</span></div>}
        <div style={{borderRadius:10,border:`1px solid ${T.border1}`,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:T.bg3}}>{["Reference","Route","Status","Quoted","Costs","Margin",""].map((h,i)=>
            <th key={i} style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",textAlign:"left",padding:"10px 16px",color:T.text3,borderBottom:`1px solid ${T.border1}`}}>{h}</th>)}</tr></thead>
            <tbody>{group.shipments.map((s,i)=>{const f=calc(s),pct=f.quoted>0?(f.margin/f.quoted*100):0;
              return<tr key={s.id} style={{borderBottom:i<group.shipments.length-1?`1px solid ${T.border0}`:"none",background:T.bg2}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background=T.bg2}>
                <td style={{padding:"12px 16px"}}><div style={{fontSize:14,fontWeight:700,fontFamily:mono,color:T.text0}}>{s.ref}</div>{s.customerRef&&<div style={{fontSize:12,color:T.text3}}>{s.customerRef}</div>}</td>
                <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:T.text1}}><MIcon mode={s.mode} size={13}/>{s.origin} → {s.destination}</div></td>
                <td style={{padding:"12px 16px"}}><Badge status={s.status}/></td>
                <td style={{padding:"12px 16px",fontSize:14,fontWeight:500,fontFamily:mono,color:T.text1}}>{formatEUR(f.quoted)}</td>
                <td style={{padding:"12px 16px",fontSize:14,fontWeight:500,fontFamily:mono,color:T.text1}}>{formatEUR(f.cost)}</td>
                <td style={{padding:"12px 16px"}}><span style={{fontSize:14,fontWeight:700,fontFamily:mono,color:f.margin>=0?T.green:T.red}}>{formatEUR(f.margin)}</span><span style={{fontSize:12,marginLeft:4,color:f.margin>=0?T.green:T.red}}>({pct.toFixed(1)}%)</span></td>
                <td style={{padding:"12px 16px"}}>{(s.costs?.running||[]).some(r=>r.status==="running")&&<span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:T.red}}>RUNNING</span>}</td>
              </tr>;})}</tbody></table></div></div>;})}</div>;}

function ShipRow({shipment:s,onClick}){const T=useT(),nm=(s.milestones||[]).find(m=>!m.done&&m.date),d=nm?daysUntil(nm.date):null;
  return<button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:16,padding:"12px 16px",borderRadius:12,marginBottom:4,textAlign:"left",background:T.bg2,border:`1px solid ${T.border0}`,cursor:"pointer",transition:"all 0.15s"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.background=T.bg3;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border0;e.currentTarget.style.background=T.bg2;}}>
    <div style={{width:34,height:34,borderRadius:9,background:T.bg4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><MIcon mode={s.mode} size={17}/></div>
    <div style={{width:140,flexShrink:0}}><div style={{fontSize:14,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:T.text0}}>{s.ref}</div>{s.customerRef&&<div style={{fontSize:12,color:T.text3}}>{s.customerRef}</div>}</div>
    <div style={{width:180,flexShrink:0}}><div style={{fontSize:14,color:T.text1}}>{s.origin} → {s.destination}</div><div style={{fontSize:12,color:T.text3}}>{s.carrier}</div></div>
    <div style={{width:120,flexShrink:0}}><div style={{fontSize:12,color:T.text2}}>{s.vessel&&s.vessel!=="TBD"&&s.vessel!=="—"?s.vessel.split(" ").slice(-1)[0]:"—"}</div><div style={{fontSize:12,color:T.text3}}>{s.routing&&s.routing.includes("→")?s.routing.split("→").length-1+" legs":"direct"}</div></div>
    <div style={{width:90,flexShrink:0}}><div style={{fontSize:12,fontWeight:500,color:T.text1}}>ETD {fmtDate(s.etd).replace(/\.\d{4}$/,"")}</div><div style={{fontSize:12,color:T.text3}}>ETA {fmtDate(s.eta).replace(/\.\d{4}$/,"")}</div></div>
    <div style={{width:90,flexShrink:0}}><Badge status={s.status}/></div>
    <div style={{width:120,flexShrink:0}}><PBar milestones={s.milestones||[]}/></div>
    <div style={{flex:1,textAlign:"right"}}>{nm&&d!==null&&d<=5&&<span style={{fontSize:12,fontWeight:600,padding:"4px 8px",borderRadius:6,background:d<=1?T.redBg:d<=3?T.amberBg:T.accentGlow,color:d<=1?T.red:d<=3?T.amber:T.accent,border:`1px solid ${d<=1?T.redBorder:d<=3?T.amberBorder:"rgba(59,130,246,0.2)"}`}}>{nm.label}: {d===0?"Today":d<0?`${Math.abs(d)}d ago`:`${d}d`}</span>}</div>
  </button>;}

export default function App(){
  const[isDark,setIsDark]=useState(true);
  const T=isDark?DARK:LIGHT;
  const[tab,setTab]=useState("dashboard");
  const[sel,setSel]=useState(null);
  const[notif,setNotif]=useState(false);
  const[q,setQ]=useState("");
  const[filt,setFilt]=useState("all");
  const[exp,setExp]=useState([]);
  const[showNewShipment,setShowNewShipment]=useState(false);
  const[showSettings,setShowSettings]=useState(false);
  const[nextRef,setNextRef]=useState("");
  const[shipments,setShipments]=useState([]);
  const[projects,setProjects]=useState([]);
  const[loading,setLoading]=useState(true);
  const[rates,setRates]=useState(FALLBACK_RATES);
  const[currentMode,setCurrentMode]=useState(getMode());

  const loadData=useCallback(async()=>{
    try{await initDB();const[s,p]=await Promise.all([getShipments(),getProjects()]);setShipments(s);setProjects(p);setExp(p.map(pr=>pr.id));}
    catch(err){console.error("Failed to load data:",err);}finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{fetchRates().then(setRates).catch(()=>{});},[]);

  const handleModeChange=(newMode)=>{setCurrentMode(newMode);setLoading(true);setSel(null);loadData();};

  const notifications=useMemo(()=>generateNotifs(shipments),[shipments]);
  const SC=statusCfg(T);
  const filtered=useMemo(()=>{let r=shipments;if(filt!=="all")r=r.filter(s=>s.status===filt);if(q){const lq=q.toLowerCase();r=r.filter(s=>s.ref.toLowerCase().includes(lq)||(s.customerRef||"").toLowerCase().includes(lq)||s.origin.toLowerCase().includes(lq)||s.destination.toLowerCase().includes(lq)||s.carrier.toLowerCase().includes(lq)||projects.find(p=>p.id===s.projectId)?.name.toLowerCase().includes(lq));}return r;},[filt,q,shipments,projects]);
  const active=shipments.find(s=>s.id===sel),proj=active?projects.find(p=>p.id===active.projectId):null;
  const urgCt=notifications.filter(n=>n.urgent).length;
  const navs=[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"kanban",label:"Board",icon:Columns3},{id:"financials",label:"Financials",icon:BarChart3}];

  const handleNewShipment=async()=>{const ref=await getNextRef();setNextRef(ref);setShowNewShipment(true);};
  const handleSaveShipment=async(shipment,newProject)=>{try{if(newProject)await addProject(newProject);await addShipment(shipment);setShowNewShipment(false);await loadData();setSel(shipment.id);}catch(err){console.error("Failed to save:",err);}};
  const handleToggleMilestone=async(sid,mid)=>{await dbToggleMilestone(sid,mid);await loadData();};

  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg1}}>
    <div style={{textAlign:"center"}}><RefreshCw size={24} color={T.accent} style={{animation:"spin 1s linear infinite"}}/><div style={{marginTop:12,fontSize:14,color:T.text2}}>Loading CargoDesk...</div></div>
    <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style></div>;

  const isTest = currentMode === 'test';

  return<ThemeCtx.Provider value={T}>
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",background:T.bg1,color:T.text1,transition:"background 0.3s,color 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {/* Sidebar */}
      <div style={{width:220,minWidth:220,background:"#0A0E17",display:"flex",flexDirection:"column",borderRight:"1px solid #1A2236"}}>
        <div style={{padding:"20px 20px 12px"}}><div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#2563EB,#60A5FA)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(59,130,246,0.3)"}}><Anchor size={18} color="white"/></div>
          <div><div style={{fontSize:14,fontWeight:700,color:"#F1F5F9"}}>CargoDesk</div><div style={{fontSize:12,color:"#4F5E78"}}>Logistics Manager</div></div></div></div>

        {/* Mode indicator */}
        <div style={{margin:"4px 12px 8px",padding:"6px 10px",borderRadius:6,display:"flex",alignItems:"center",gap:6,
          background:isTest?"rgba(245,158,11,0.1)":"rgba(16,185,129,0.1)",
          border:`1px solid ${isTest?"rgba(245,158,11,0.2)":"rgba(16,185,129,0.2)"}`}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:isTest?"#F59E0B":"#10B981"}}/>
          <span style={{fontSize:11,fontWeight:600,color:isTest?"#F59E0B":"#10B981",textTransform:"uppercase",letterSpacing:"0.05em"}}>{isTest?"Test Mode":"Production"}</span>
        </div>

        <nav style={{padding:"0 12px",marginTop:8,flex:1}}>{navs.map(n=><button key={n.id} onClick={()=>{setTab(n.id);setSel(null);}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,marginBottom:4,fontSize:14,fontWeight:500,background:tab===n.id?"rgba(59,130,246,0.12)":"transparent",color:tab===n.id?"#3B82F6":"#8494B0",border:"none",borderLeft:tab===n.id?"2px solid #3B82F6":"2px solid transparent",cursor:"pointer",textAlign:"left"}}>
          <n.icon size={18}/>{n.label}</button>)}</nav>

        <div style={{padding:16,margin:"0 12px 8px",borderRadius:12,background:"#161C2E",border:"1px solid #1A2236"}}>
          <div style={{fontSize:12,fontWeight:500,marginBottom:4,color:"#4F5E78"}}>Active Shipments</div>
          <div style={{fontSize:24,fontWeight:700,color:"#F1F5F9",fontFamily:"'JetBrains Mono',monospace"}}>{shipments.filter(s=>!["delivered","completed"].includes(s.status)).length}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,marginTop:4,color:"#3B82F6"}}><Ship size={12}/>{shipments.filter(s=>s.status==="in_transit").length} in transit</div></div>

        {/* Settings button */}
        <div style={{padding:"0 12px 4px"}}>
          <button onClick={()=>setShowSettings(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.04)",cursor:"pointer",color:"#8494B0",fontSize:13,fontWeight:500}}>
            <Settings size={16}/> Settings
          </button>
        </div>

        <div style={{padding:"4px 12px 16px"}}><ThemeToggle isDark={isDark} onToggle={()=>setIsDark(!isDark)}/></div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Test mode banner */}
        {isTest&&<div style={{padding:"6px 24px",background:"rgba(245,158,11,0.08)",borderBottom:"1px solid rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <AlertTriangle size={13} color="#F59E0B"/>
          <span style={{fontSize:12,fontWeight:500,color:"#F59E0B"}}>Test Mode — using sample data. Switch to Production in Settings when ready.</span>
        </div>}

        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",background:T.bg2,borderBottom:`1px solid ${T.border1}`,minHeight:56,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
            <div style={{position:"relative",maxWidth:360,flex:1}}><Search size={16} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.text3}}/>
              <input type="text" placeholder="Search shipments, projects, carriers…" value={q} onChange={e=>setQ(e.target.value)}
                style={{width:"100%",padding:"8px 16px 8px 40px",borderRadius:8,fontSize:14,border:`1px solid ${T.border1}`,outline:"none",background:T.bg3,color:T.text0}}/></div>
            {tab==="dashboard"&&<div style={{display:"flex",gap:4,marginLeft:8,background:T.bg3,borderRadius:8,padding:3,border:`1px solid ${T.border0}`}}>
              {["all","planned","booked","in_transit","delivered"].map(s=><button key={s} onClick={()=>setFilt(s)}
                style={{padding:"6px 10px",borderRadius:6,fontSize:12,fontWeight:500,background:filt===s?T.bg4:"transparent",color:filt===s?T.text0:T.text3,border:"none",cursor:"pointer"}}>{s==="all"?"All":SC[s]?.label||s}</button>)}</div>}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:16}}>
            <button onClick={()=>setNotif(!notif)} style={{position:"relative",padding:8,borderRadius:8,color:T.text2,background:"none",border:"none",cursor:"pointer"}}>
              <Bell size={20}/>{urgCt>0&&<span style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:T.red,color:"white",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{urgCt}</span>}</button>
            <button onClick={handleNewShipment} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,fontSize:14,fontWeight:500,color:T.accent,background:T.accentGlow,border:"1px solid rgba(59,130,246,0.2)",cursor:"pointer"}}><Plus size={16}/> New Shipment</button></div>
          {notif&&<NotifPanel notifications={notifications} onClose={()=>setNotif(false)}/>}</div>

        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {sel&&active?<div style={{flex:1,overflow:"hidden"}}><ShipmentDetail shipment={active} project={proj} onBack={()=>setSel(null)} onToggleMilestone={handleToggleMilestone} onUpdate={loadData} rates={rates}/></div>
            :tab==="kanban"?<KanbanView shipments={filtered} projects={projects} onSelect={setSel}/>
            :tab==="financials"?<FinView shipments={shipments} projects={projects} rates={rates}/>
            :<>
              <div style={{flex:1,overflow:"auto",padding:24}}>
                {projects.map(p=>{const ps=filtered.filter(s=>s.projectId===p.id);if(!ps.length)return null;const isExp=exp.includes(p.id);
                  return<div key={p.id} style={{marginBottom:16}}>
                    <button onClick={()=>setExp(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"8px 12px",borderRadius:8,color:T.text1,background:"none",border:"none",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {isExp?<ChevronDown size={16} color={T.text2}/>:<ChevronRight size={16} color={T.text2}/>}
                      <FolderOpen size={16} color={T.accent}/><span style={{fontWeight:700,fontSize:14,color:T.text0}}>{p.name}</span>
                      <span style={{fontSize:12,color:T.text2}}>{p.customer} • {ps.length} shipments</span></button>
                    {isExp&&<div style={{marginTop:4}}>{ps.map(s=><ShipRow key={s.id} shipment={s} onClick={()=>setSel(s.id)}/>)}</div>}</div>;})}
                {filtered.filter(s=>!s.projectId).length>0&&<div style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px"}}><Package size={16} color={T.text2}/><span style={{fontWeight:700,fontSize:14,color:T.text0}}>Loose Shipments</span></div>
                  {filtered.filter(s=>!s.projectId).map(s=><ShipRow key={s.id} shipment={s} onClick={()=>setSel(s.id)}/>)}</div>}</div>
              <DeadlineSidebar shipments={shipments} onSelect={setSel}/></>}</div></div>
      {showNewShipment&&<NewShipmentModal T={T} projects={projects} nextRef={nextRef} onSave={handleSaveShipment} onClose={()=>setShowNewShipment(false)}/>}
      {showSettings&&<SettingsPanel T={T} onClose={()=>setShowSettings(false)} onModeChange={handleModeChange} onDataChange={loadData}/>}
    </div></ThemeCtx.Provider>;}
