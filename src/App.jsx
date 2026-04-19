import { useState, useEffect, useMemo, createContext, useContext, useCallback } from "react";
import { Package, Ship, Plane, Truck, ChevronRight, ChevronDown, Plus, Search, Bell, FileText, DollarSign, CheckCircle2, Circle, Clock, AlertTriangle, X, Anchor, BarChart3, LayoutDashboard, Columns3, FolderOpen, ChevronLeft, Eye, Sun, Moon, RefreshCw, Settings, Check, Download, Calendar, List, Bot, LogOut } from "lucide-react";
import { initDB, getProjects, getShipments, addShipment, addProject, updateShipment, toggleMilestone as dbToggleMilestone, getNextRef, deleteShipment, getMode, addDocument, addActivity, getActivities, getTemplates, getDbSource, getQuotes } from "./db/schema.js";
import { getCurrentUser, logout } from "./db/auth.js";
import { hasLocalPassword, hasActiveLocalSession, clearLocalSession } from "./utils/localAuth.js";
import LoginScreen from "./components/LoginScreen.jsx";
import NewShipmentModal from "./components/NewShipmentModal.jsx";
import ShipmentDetail from "./components/ShipmentDetail.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import SortFilterBar, { sortShipments } from "./components/SortFilterBar.jsx";
import ShipmentContextMenu from "./components/ShipmentContextMenu.jsx";
import StatusSummary from "./components/StatusSummary.jsx";
import ProjectSummary from "./components/ProjectSummary.jsx";
import ExportDialog from "./components/ExportDialog.jsx";
import ActivityFeed from "./components/ActivityFeed.jsx";
import MorningBrief from "./components/MorningBrief.jsx";
import MonthlyReportModal from "./components/MonthlyReportModal.jsx";
import WeeklySnapshotReport from "./components/WeeklySnapshotReport.jsx";
import AssistantPanel from "./components/AssistantPanel.jsx";
import { extractTextFromPDF, fileToBase64 } from "./parsers/pdfParser.js";
import { parseDocumentText } from "./parsers/carrierParsers.js";
import { fetchRates, toEUR, formatEUR, FALLBACK_RATES } from "./utils/currency.js";
import { getProjectColor } from "./utils/projectColors.js";
import { timeAgo } from "./utils/activityLog.js";
import { shouldShowBrief } from "./utils/dailyBrief.js";

const DARK={bg0:"#0A0E17",bg1:"#0F1421",bg2:"#161C2E",bg3:"#1C2438",bg4:"#232D45",border0:"#1A2236",border1:"#243049",border2:"#2E3D5C",text0:"#F1F5F9",text1:"#CBD5E1",text2:"#8494B0",text3:"#4F5E78",accent:"#3B82F6",accentGlow:"rgba(59,130,246,0.12)",green:"#10B981",greenBg:"rgba(16,185,129,0.12)",greenBorder:"rgba(16,185,129,0.25)",amber:"#F59E0B",amberBg:"rgba(245,158,11,0.12)",amberBorder:"rgba(245,158,11,0.25)",red:"#EF4444",redBg:"rgba(239,68,68,0.10)",redBorder:"rgba(239,68,68,0.25)",purple:"#A78BFA",purpleBg:"rgba(167,139,250,0.12)",purpleBorder:"rgba(167,139,250,0.25)",shadow:"rgba(0,0,0,0.3)",shadowHeavy:"rgba(0,0,0,0.5)",modeOcean:"#3B82F6",modeAir:"#A78BFA",modeTruck:"#F59E0B"};
const LIGHT={bg0:"#0B1120",bg1:"#F5F6F8",bg2:"#FFFFFF",bg3:"#F9FAFB",bg4:"#F3F4F6",border0:"#E5E7EB",border1:"#E5E7EB",border2:"#D1D5DB",text0:"#0F172A",text1:"#374151",text2:"#6B7280",text3:"#9CA3AF",accent:"#2563EB",accentGlow:"rgba(37,99,235,0.08)",green:"#059669",greenBg:"#D1FAE5",greenBorder:"#6EE7B7",amber:"#D97706",amberBg:"#FEF3C7",amberBorder:"#FDE68A",red:"#DC2626",redBg:"#FEE2E2",redBorder:"#FECACA",purple:"#7C3AED",purpleBg:"#EDE9FE",purpleBorder:"#C4B5FD",shadow:"rgba(0,0,0,0.06)",shadowHeavy:"rgba(0,0,0,0.15)",modeOcean:"#2563EB",modeAir:"#7C3AED",modeTruck:"#D97706"};
const ThemeCtx=createContext(DARK);const useT=()=>useContext(ThemeCtx);

const fmtDate=d=>{if(!d||d==="—")return"—";return new Date(d).toLocaleDateString("fi-FI",{day:"numeric",month:"short",year:"numeric"});};
const daysUntil=d=>{if(!d||d==="—")return null;return Math.ceil((new Date(d)-new Date())/86400000);};
const statusCfg=T=>({planned:{label:"Planned",color:T.text2,bg:T.bg3,ring:T.border2},booked:{label:"Booked",color:T.amber,bg:T.amberBg,ring:T.amberBorder},in_transit:{label:"In Transit",color:T.accent,bg:T.accentGlow,ring:"rgba(59,130,246,0.3)"},arrived:{label:"Arrived",color:T.purple,bg:T.purpleBg,ring:T.purpleBorder},delivered:{label:"Delivered",color:T.green,bg:T.greenBg,ring:T.greenBorder},completed:{label:"Completed",color:T.text3,bg:T.bg3,ring:T.border1}});
const MODE_ICON={ocean:Ship,air:Plane,truck:Truck};

function Badge({status}){const T=useT(),c=statusCfg(T)[status];if(!c)return null;return<span style={{background:c.bg,color:c.color,border:`1px solid ${c.ring}`,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{c.label}</span>;}
function MIcon({mode,size=15}){const T=useT(),I=MODE_ICON[mode]||Package;return<I size={size} color={{ocean:T.modeOcean,air:T.modeAir,truck:T.modeTruck}[mode]||T.text2}/>;}
function PBar({milestones}){const T=useT(),done=milestones.filter(m=>m.done).length,pct=milestones.length?(done/milestones.length)*100:0;return<div style={{display:"flex",alignItems:"center",gap:8,minWidth:100}}><div style={{height:4,flex:1,background:T.bg4,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct===100?T.green:T.accent,borderRadius:2,transition:"width 0.3s"}}/></div><span style={{fontSize:12,fontWeight:500,color:T.text2}}>{done}/{milestones.length}</span></div>;}
function ThemeToggle({isDark,onToggle}){return<div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.12)"}`,background:isDark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",cursor:"pointer"}}><div style={{width:40,height:22,borderRadius:11,background:isDark?"#1E3A5F":"#93C5FD",position:"relative",transition:"background 0.3s",flexShrink:0}}><div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:3,left:isDark?3:21,transition:"left 0.3s",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>{isDark?<Moon size={9} color="#1E3A5F"/>:<Sun size={9} color="#D97706"/>}</div></div><span style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.5)"}}>{isDark?"Dark":"Light"}</span></div>;}

const DISMISSED_KEY="cargodesk_dismissed_notifs";
function getDismissed(){try{return JSON.parse(localStorage.getItem(DISMISSED_KEY)||"[]");}catch{return[];}}
function setDismissed(ids){try{localStorage.setItem(DISMISSED_KEY,JSON.stringify(ids));}catch{}}
function generateNotifs(shipments){const notifs=[];shipments.forEach(s=>{(s.milestones||[]).filter(m=>!m.done&&m.date).forEach(m=>{const d=daysUntil(m.date);if(d!==null&&d>=-1&&d<=7)notifs.push({id:`${s.id}-${m.id}`,type:d<0?"warning":"deadline",message:`${m.label} for ${s.customerRef||s.ref||"pending"}${d<0?` was ${Math.abs(d)}d ago`:d===0?" is today":` in ${d} days`}`,date:m.date,urgent:d<=2,shipmentId:s.id});});});notifs.sort((a,b)=>(daysUntil(a.date)??99)-(daysUntil(b.date)??99));return notifs;}

function DeadlineSidebar({shipments,onSelect,activities,onActivityClick}){const T=useT();
  const[sideTab,setSideTab]=useState("deadlines");
  const upcoming=[];shipments.forEach(s=>{(s.milestones||[]).filter(m=>!m.done&&m.date).forEach(m=>{const d=daysUntil(m.date);if(d!==null&&d>=-1&&d<=14)upcoming.push({...m,shipmentRef:s.ref,customerRef:s.customerRef,shipmentId:s.id,days:d});});});upcoming.sort((a,b)=>a.days-b.days);
  return<div style={{width:300,minWidth:300,background:T.bg2,borderLeft:`1px solid ${T.border1}`,height:"100%",overflow:"auto",display:"flex",flexDirection:"column"}}>
    <div style={{display:"flex",borderBottom:`1px solid ${T.border1}`}}>
      {["deadlines","activity"].map(t=><div key={t} onClick={()=>setSideTab(t)} style={{flex:1,padding:"12px 8px",textAlign:"center",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer",color:sideTab===t?T.accent:T.text3,borderBottom:`2px solid ${sideTab===t?T.accent:"transparent"}`}}>{t==="deadlines"?"Deadlines":"Activity"}</div>)}
    </div>
    <div style={{flex:1,overflow:"auto"}}>
      {sideTab==="deadlines"&&<div style={{padding:8}}>{upcoming.map((item,i)=>{const urg=item.days<=2,past=item.days<0;
        return<div key={i} onClick={()=>onSelect(item.shipmentId)} style={{padding:12,borderRadius:8,marginBottom:4,background:past?T.redBg:urg?T.amberBg:T.bg3,border:`1px solid ${past?T.redBorder:urg?T.amberBorder:T.border0}`,cursor:"pointer",transition:"transform 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateX(2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,fontWeight:700,color:past?T.red:urg?T.amber:T.accent,fontFamily:"'JetBrains Mono',monospace"}}>{item.days<0?`${Math.abs(item.days)}d overdue`:item.days===0?"TODAY":`${item.days}d`}</span>{(past||urg)&&<AlertTriangle size={13} color={past?T.red:T.amber}/>}</div>
          <div style={{fontSize:14,fontWeight:600,color:T.text0}}>{item.label}</div>
          <div style={{fontSize:12,marginTop:2,color:T.text2}}>{item.customerRef||item.shipmentRef||"Pending"}</div></div>;})}
        {!upcoming.length&&<div style={{padding:16,textAlign:"center",fontSize:14,color:T.text3}}>No upcoming deadlines</div>}</div>}
      {sideTab==="activity"&&<ActivityFeed T={T} activities={activities} onClickActivity={onActivityClick}/>}
    </div></div>;}

function NotifPanel({notifications,dismissed,onDismiss,onDismissAll,onClose,onClickNotif}){const T=useT();const active=notifications.filter(n=>!dismissed.includes(n.id));const dc=notifications.filter(n=>dismissed.includes(n.id)).length;
  return<div style={{position:"absolute",top:48,right:16,width:400,background:T.bg3,borderRadius:12,boxShadow:`0 20px 60px ${T.shadowHeavy}`,border:`1px solid ${T.border2}`,zIndex:100}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:16,borderBottom:`1px solid ${T.border1}`}}>
      <h3 style={{fontWeight:700,fontSize:14,color:T.text0,margin:0}}>Notifications {active.length>0&&<span style={{fontSize:12,color:T.accent}}>({active.length})</span>}</h3>
      <div style={{display:"flex",gap:8}}>{active.length>0&&<div onClick={onDismissAll} style={{fontSize:11,color:T.text3,cursor:"pointer",textDecoration:"underline"}}>Dismiss all</div>}<div onClick={onClose} style={{cursor:"pointer",color:T.text2}}><X size={16}/></div></div></div>
    <div style={{maxHeight:400,overflow:"auto"}}>{active.length?active.map(n=>
      <div key={n.id} style={{padding:12,display:"flex",gap:12,alignItems:"flex-start",borderBottom:`1px solid ${T.border0}`}}>
        <div style={{marginTop:2}}>{n.type==="deadline"?<Clock size={16} color={n.urgent?T.amber:T.text2}/>:<AlertTriangle size={16} color={T.red}/>}</div>
        <div onClick={()=>onClickNotif(n)} style={{flex:1,cursor:"pointer"}}><div style={{fontSize:14,color:T.text1}}>{n.message}</div><div style={{fontSize:12,marginTop:4,color:T.text3}}>{fmtDate(n.date)}</div></div>
        <div onClick={()=>onDismiss(n.id)} style={{cursor:"pointer",color:T.text3,padding:4}}><Check size={16}/></div></div>)
      :<div style={{padding:24,textAlign:"center",fontSize:14,color:T.text3}}>All caught up!</div>}{dc>0&&<div style={{padding:"8px 16px",fontSize:11,color:T.text3,background:T.bg4,textAlign:"center"}}>{dc} dismissed</div>}</div></div>;}

function KanbanView({shipments,projects,onSelect}){const T=useT(),SC=statusCfg(T);
  return<div style={{display:"flex",gap:16,padding:24,height:"100%",overflow:"auto"}}>{["planned","booked","in_transit","arrived","delivered"].map(st=>{const items=shipments.filter(s=>s.status===st),cfg=SC[st];
    return<div key={st} style={{minWidth:260,width:260,flex:"0 0 260px"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingLeft:4}}><div style={{width:10,height:10,borderRadius:"50%",background:cfg.color}}/><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:cfg.color}}>{cfg.label}</span><span style={{fontSize:11,fontWeight:700,padding:"1px 6px",borderRadius:10,background:cfg.bg,color:cfg.color}}>{items.length}</span></div>
      <div>{items.map(s=>{const proj=projects.find(p=>p.id===s.projectId),nm=(s.milestones||[]).find(m=>!m.done&&m.date),d=nm?daysUntil(nm.date):null;
        return<div key={s.id} onClick={()=>onSelect(s.id)} style={{padding:12,borderRadius:12,marginBottom:8,background:T.bg2,border:`1px solid ${T.border1}`,cursor:"pointer",transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border1;e.currentTarget.style.transform="translateY(0)";}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:T.text1,fontFamily:"'JetBrains Mono',monospace"}}>{s.ref||"Pending"}</span><MIcon mode={s.mode} size={14}/></div>
          {proj&&<div style={{fontSize:12,marginBottom:6,color:T.text2}}><span style={{fontWeight:600,color:T.text1}}>{proj.name}</span> • {s.customerRef}</div>}
          <div style={{fontSize:12,marginBottom:8,color:T.text2}}>{s.origin} → {s.destination}</div><PBar milestones={s.milestones||[]}/>
          {nm&&d!==null&&d<=5&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:500,color:d<=2?T.red:T.amber}}><Clock size={12}/>{nm.label} {d===0?"today":d<0?`${Math.abs(d)}d ago`:`in ${d}d`}</div>}
        </div>;})}
        {!items.length&&<div style={{padding:16,textAlign:"center",fontSize:12,borderRadius:12,color:T.text3,background:T.bg2,border:`1px dashed ${T.border1}`}}>No shipments</div>}</div></div>;})}</div>;}

function FinView({shipments,projects,rates,onExport,onMonthlyReport}){const T=useT(),[groupBy,setGroupBy]=useState("all");
  const calc=s=>{const c=(s.costs?.items||[]).reduce((a,i)=>a+toEUR(i.amount,i.currency,rates),0)+(s.costs?.running||[]).reduce((a,r)=>{const d=r.status==="running"?Math.max(1,Math.ceil((new Date()-new Date(r.startDate))/86400000)):(r.totalDays||0);return a+toEUR(r.dailyRate*d,r.currency,rates);},0);return{quoted:s.costs?.quoted||0,cost:c,margin:(s.costs?.quoted||0)-c};};
  const grouped=groupBy==="project"?[...projects.map(p=>({label:p.name,customer:p.customer,shipments:shipments.filter(s=>s.projectId===p.id)})),{label:"Loose",customer:"—",shipments:shipments.filter(s=>!s.projectId)}].filter(g=>g.shipments.length>0):[{label:"All",customer:"",shipments}];
  const gt=shipments.reduce((a,s)=>{const f=calc(s);return{q:a.q+f.quoted,c:a.c+f.cost,m:a.m+f.margin};},{q:0,c:0,m:0});const mono="'JetBrains Mono',monospace";
  return<div style={{padding:24,height:"100%",overflow:"auto"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
      <h2 style={{fontSize:18,fontWeight:700,color:T.text0,margin:0}}>Financial Overview</h2>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {/* Phase C: Monthly Report button */}
        <div onClick={onMonthlyReport} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:500,color:T.accent,background:T.accentGlow,border:`1px solid rgba(59,130,246,0.2)`,cursor:"pointer"}}><BarChart3 size={13}/> Monthly Report</div>
        <div onClick={onExport} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:500,color:T.green,background:T.greenBg,border:`1px solid ${T.greenBorder}`,cursor:"pointer"}}><Download size={13}/> Export Excel</div>
        <div style={{display:"flex",gap:4,background:T.bg2,borderRadius:8,padding:3,border:`1px solid ${T.border1}`}}>
          {["all","project"].map(g=><div key={g} onClick={()=>setGroupBy(g)} style={{padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:500,background:groupBy===g?T.accent:"transparent",color:groupBy===g?"white":T.text2,cursor:"pointer"}}>{g==="all"?"All":"By Project"}</div>)}</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>{[{l:"Total Quoted",v:formatEUR(gt.q),c:T.accent,bg:T.accentGlow,b:"rgba(59,130,246,0.2)"},{l:"Total Costs",v:formatEUR(gt.c),c:T.text1,bg:T.bg2,b:T.border1},{l:"Total Margin",v:formatEUR(gt.m),c:gt.m>=0?T.green:T.red,bg:gt.m>=0?T.greenBg:T.redBg,b:gt.m>=0?T.greenBorder:T.redBorder}].map((c,i)=><div key={i} style={{padding:20,borderRadius:12,background:c.bg,border:`1px solid ${c.b}`}}><div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,color:T.text2}}>{c.l}</div><div style={{fontSize:24,fontWeight:700,color:c.c,fontFamily:mono}}>{c.v}</div></div>)}</div>
    {grouped.map((group,gi)=>{const gf=group.shipments.reduce((a,s)=>{const f=calc(s);return{q:a.q+f.quoted,c:a.c+f.cost,m:a.m+f.margin};},{q:0,c:0,m:0});
      return<div key={gi} style={{marginBottom:24}}>
        {groupBy==="project"&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,paddingLeft:4}}><div><span style={{fontWeight:700,fontSize:14,color:T.text0}}>{group.label}</span>{group.customer!=="—"&&<span style={{fontSize:12,marginLeft:8,color:T.text2}}>{group.customer}</span>}</div><span style={{fontWeight:700,fontSize:14,color:gf.m>=0?T.green:T.red,fontFamily:mono}}>Margin: {formatEUR(gf.m)}</span></div>}
        <div style={{borderRadius:10,border:`1px solid ${T.border1}`,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:T.bg3}}>{["Reference","Route","Status","Quoted","Costs","Margin",""].map((h,i)=><th key={i} style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",textAlign:"left",padding:"10px 16px",color:T.text3,borderBottom:`1px solid ${T.border1}`}}>{h}</th>)}</tr></thead>
          <tbody>{group.shipments.map((s,i)=>{const f=calc(s),pct=f.quoted>0?(f.margin/f.quoted*100):0;
            return<tr key={s.id} style={{borderBottom:i<group.shipments.length-1?`1px solid ${T.border0}`:"none",background:T.bg2}} onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background=T.bg2}>
              <td style={{padding:"12px 16px"}}><div style={{fontSize:14,fontWeight:700,fontFamily:mono,color:T.text0}}>{s.ref||<span style={{color:T.text3}}>Pending</span>}</div>{s.customerRef&&<div style={{fontSize:12,color:T.text3}}>{s.customerRef}</div>}</td>
              <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:6,fontSize:14,color:T.text1}}><MIcon mode={s.mode} size={13}/>{s.origin} → {s.destination}</div></td>
              <td style={{padding:"12px 16px"}}><Badge status={s.status}/></td>
              <td style={{padding:"12px 16px",fontSize:14,fontWeight:500,fontFamily:mono,color:T.text1}}>{formatEUR(f.quoted)}</td>
              <td style={{padding:"12px 16px",fontSize:14,fontWeight:500,fontFamily:mono,color:T.text1}}>{formatEUR(f.cost)}</td>
              <td style={{padding:"12px 16px"}}><span style={{fontSize:14,fontWeight:700,fontFamily:mono,color:f.margin>=0?T.green:T.red}}>{formatEUR(f.margin)}</span><span style={{fontSize:12,marginLeft:4,color:f.margin>=0?T.green:T.red}}>({pct.toFixed(1)}%)</span></td>
              <td style={{padding:"12px 16px"}}>{(s.costs?.running||[]).some(r=>r.status==="running")&&<span style={{fontSize:11,fontWeight:700,color:T.red}}>RUNNING</span>}</td></tr>;})}</tbody></table></div></div>;})}</div>;}

function ShipRow({shipment:s,onClick,onContextMenu,onDrop,projectColor}){const T=useT(),nm=(s.milestones||[]).find(m=>!m.done&&m.date),d=nm?daysUntil(nm.date):null;
  const[dragOver,setDragOver]=useState(false);const updated=s.updatedAt?timeAgo(s.updatedAt):"";
  return<div onClick={onClick} onContextMenu={e=>{if(onContextMenu)onContextMenu(e,s);}}
    onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
    onDrop={e=>{e.preventDefault();e.stopPropagation();setDragOver(false);const files=Array.from(e.dataTransfer.files);if(files.length&&onDrop)onDrop(s.id,files);}}
    style={{display:"flex",alignItems:"center",gap:16,padding:"12px 16px",borderRadius:12,marginBottom:4,background:dragOver?T.accentGlow:T.bg2,border:`1px solid ${dragOver?T.accent:T.border0}`,cursor:"pointer",transition:"all 0.15s"}}
    onMouseEnter={e=>{if(!dragOver){e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.background=T.bg3;}}} onMouseLeave={e=>{if(!dragOver){e.currentTarget.style.borderColor=T.border0;e.currentTarget.style.background=T.bg2;}}}>
    <div style={{width:34,height:34,borderRadius:9,background:T.bg4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><MIcon mode={s.mode} size={17}/></div>
    <div style={{width:140,flexShrink:0}}><div style={{fontSize:14,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:T.text0}}>{s.ref||<span style={{color:T.text3,fontWeight:400,fontStyle:"italic"}}>Pending</span>}</div>
      {s.customerRef&&<div style={{fontSize:12,color:T.text3}}>{projectColor?<span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:projectColor.color,marginRight:4}}/>:null}{s.customerRef}</div>}</div>
    <div style={{width:180,flexShrink:0}}><div style={{fontSize:14,color:T.text1}}>{s.origin} → {s.destination}</div><div style={{fontSize:12,color:T.text3}}>{s.carrier}</div></div>
    <div style={{width:90,flexShrink:0}}><div style={{fontSize:12,fontWeight:500,color:T.text1}}>ETD {fmtDate(s.etd).replace(/\.\d{4}$/,"")}</div><div style={{fontSize:12,color:T.text3}}>ETA {fmtDate(s.eta).replace(/\.\d{4}$/,"")}</div></div>
    <div style={{width:90,flexShrink:0}}><Badge status={s.status}/></div>
    <div style={{width:100,flexShrink:0}}><PBar milestones={s.milestones||[]}/></div>
    <div style={{width:60,flexShrink:0,textAlign:"right"}}>{updated&&<span style={{fontSize:10,color:T.text3}}>{updated}</span>}</div>
    <div style={{flex:1,textAlign:"right"}}>{dragOver?<span style={{fontSize:12,fontWeight:600,color:T.accent}}>Drop PDF</span>:nm&&d!==null&&d<=5&&<span style={{fontSize:11,fontWeight:600,padding:"3px 7px",borderRadius:5,background:d<=1?T.redBg:d<=3?T.amberBg:T.accentGlow,color:d<=1?T.red:d<=3?T.amber:T.accent,border:`1px solid ${d<=1?T.redBorder:d<=3?T.amberBorder:"rgba(59,130,246,0.2)"}`}}>{nm.label}: {d===0?"Today":d<0?`${Math.abs(d)}d ago`:`${d}d`}</span>}</div>
  </div>;}

export default function App(){
  const[isDark,setIsDark]=useState(true);const T=isDark?DARK:LIGHT;
  const[tab,setTab]=useState("dashboard");const[sel,setSel]=useState(null);const[projectView,setProjectView]=useState(null);
  const[notif,setNotif]=useState(false);const[q,setQ]=useState("");const[filt,setFilt]=useState("all");const[sortBy,setSortBy]=useState(null);
  const[exp,setExp]=useState([]);const[showNewShipment,setShowNewShipment]=useState(false);const[showSettings,setShowSettings]=useState(false);
  const[showExport,setShowExport]=useState(false);const[nextRef,setNextRef]=useState("");
  const[shipments,setShipments]=useState([]);const[projects,setProjects]=useState([]);const[loading,setLoading]=useState(true);
  const[rates,setRates]=useState(FALLBACK_RATES);const[currentMode,setCurrentMode]=useState(getMode());
  const[dismissed,setDismissedState]=useState(getDismissed());const[contextMenu,setContextMenu]=useState(null);
  const[activities,setActivities]=useState([]);const[templates,setTemplates]=useState([]);const[quotes,setQuotes]=useState([]);
  // Auth state
  const[user,setUser]=useState(null);const[authChecked,setAuthChecked]=useState(false);
  const[localUnlocked,setLocalUnlocked]=useState(false);
  // Phase C state
  const[showMorningBrief,setShowMorningBrief]=useState(false);
  const[showMonthlyReport,setShowMonthlyReport]=useState(false);
  const[showWeeklyReport,setShowWeeklyReport]=useState(false);
  // Phase D state
  const[showAssistant,setShowAssistant]=useState(false);

  // Check existing session on mount
  useEffect(()=>{
    async function checkAuth(){
      const source=getDbSource();
      if(source==='cloud'){
        const u=await getCurrentUser();
        setUser(u);
      } else {
        setLocalUnlocked(hasActiveLocalSession());
      }
      setAuthChecked(true);
    }
    checkAuth();
  },[]);

  const loadData=useCallback(async()=>{
    try{
      await initDB();
      const[s,p,a,t,q]=await Promise.all([getShipments(),getProjects(),getActivities(50),getTemplates(),getQuotes()]);
      setShipments(s);setProjects(p);setActivities(a);setTemplates(t);setQuotes(q);
      setExp(p.map(pr=>pr.id));
      if(shouldShowBrief())setShowMorningBrief(true);
    }
    catch(err){console.error("Load failed:",err);}finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{fetchRates().then(setRates).catch(()=>{});},[]);

  // Keyboard shortcuts
  useEffect(()=>{
    const handler=(e)=>{
      if(e.ctrlKey&&e.key==="n"){e.preventDefault();handleNewShipment();}
      if(e.key==="Escape"){
        if(showNewShipment)setShowNewShipment(false);
        else if(showSettings)setShowSettings(false);
        else if(showExport)setShowExport(false);
        else if(showMorningBrief)setShowMorningBrief(false);
        else if(showMonthlyReport)setShowMonthlyReport(false);
        else if(showWeeklyReport)setShowWeeklyReport(false);
        else if(showAssistant)setShowAssistant(false);
        else if(sel){setSel(null);}
        else if(projectView){setProjectView(null);}
      }
    };
    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  },[showNewShipment,showSettings,showExport,showMorningBrief,showMonthlyReport,showWeeklyReport,showAssistant,sel,projectView]);

  const logActivity=async(type,message,shipmentId=null)=>{try{await addActivity({id:crypto.randomUUID(),type,message,shipmentId,timestamp:new Date().toISOString()});const a=await getActivities(50);setActivities(a);}catch{}};

  const handleModeChange=(m)=>{setCurrentMode(m);setLoading(true);setSel(null);setProjectView(null);loadData();};
  const handleDismiss=(id)=>{const next=[...dismissed,id];setDismissedState(next);setDismissed(next);};
  const handleDismissAll=()=>{const ids=notifications.map(n=>n.id);const next=[...new Set([...dismissed,...ids])];setDismissedState(next);setDismissed(next);};
  const handleClickNotif=(n)=>{handleDismiss(n.id);setSel(n.shipmentId);setProjectView(null);setNotif(false);};

  const notifications=useMemo(()=>generateNotifs(shipments),[shipments]);
  const activeNotifCount=notifications.filter(n=>!dismissed.includes(n.id)&&n.urgent).length;
  const SC=statusCfg(T);
  const filtered=useMemo(()=>{let r=shipments;if(filt!=="all")r=r.filter(s=>s.status===filt);if(q){const lq=q.toLowerCase();r=r.filter(s=>(s.ref||"").toLowerCase().includes(lq)||(s.customerRef||"").toLowerCase().includes(lq)||s.origin.toLowerCase().includes(lq)||s.destination.toLowerCase().includes(lq)||s.carrier.toLowerCase().includes(lq)||projects.find(p=>p.id===s.projectId)?.name.toLowerCase().includes(lq));}if(sortBy)r=sortShipments(r,sortBy);return r;},[filt,q,shipments,projects,sortBy]);
  const active=shipments.find(s=>s.id===sel),proj=active?projects.find(p=>p.id===active.projectId):null;
  const navs=[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"kanban",label:"Board",icon:Columns3},{id:"financials",label:"Financials",icon:BarChart3}];

  const handleNewShipment=async()=>{const ref=await getNextRef();setNextRef(ref);setShowNewShipment(true);};

  // Phase C: strip internal _parsedQuote before saving, then optionally save it to quotes table
  const handleSaveShipment=async(shipment,newProject)=>{
    try{
      if(newProject){await addProject(newProject);await logActivity("project",`Project "${newProject.name}" created`);}
      const{_parsedQuote,...shipmentToSave}=shipment;
      await addShipment(shipmentToSave);
      await logActivity("shipment",`Shipment created: ${shipment.origin} → ${shipment.destination}`,shipment.id);
      setShowNewShipment(false);
      await loadData();
      setSel(shipment.id);
    }catch(err){console.error("Save failed:",err);}
  };

  const handleToggleMilestone=async(sid,mid)=>{const s=shipments.find(x=>x.id===sid);const m=s?.milestones?.find(x=>x.id===mid);await dbToggleMilestone(sid,mid);if(m)await logActivity("milestone",`${m.done?"Unchecked":"Completed"}: ${m.label} (${s?.ref||s?.customerRef||"shipment"})`,sid);await loadData();};
  const handleStatusChange=async(sid,newStatus)=>{const s=shipments.find(x=>x.id===sid);await updateShipment(sid,{status:newStatus});await logActivity("status",`${s?.ref||s?.customerRef||"Shipment"} → ${newStatus.replace("_"," ")}`,sid);await loadData();};
  const handleDeleteShipment=async(sid)=>{const s=shipments.find(x=>x.id===sid);await deleteShipment(sid);await logActivity("shipment",`Deleted: ${s?.ref||s?.origin+" → "+s?.destination}`);if(sel===sid)setSel(null);await loadData();};
  const handleDuplicate=async(s)=>{const dup={...s,id:crypto.randomUUID(),ref:"",refPending:true,status:"planned",milestones:(s.milestones||[]).map(m=>({...m,id:`m${Date.now()}${Math.random()}`,done:false})),costs:{...s.costs,items:[...(s.costs?.items||[]).map(c=>({...c,id:crypto.randomUUID()}))],running:[]},notes:[],updatedAt:new Date().toISOString()};await addShipment(dup);await logActivity("shipment",`Duplicated from ${s.ref||"shipment"}: ${dup.origin} → ${dup.destination}`,dup.id);await loadData();setSel(dup.id);};
  const handleDropOnRow=async(shipmentId,files)=>{for(const file of files){if(!file.type.includes("pdf")&&!file.name.endsWith(".pdf"))continue;try{const extracted=await extractTextFromPDF(file);const parsed=parseDocumentText(extracted.text,file.name);const base64=await fileToBase64(file);const doc={id:crypto.randomUUID(),shipmentId,name:file.name,type:parsed.documentType,date:new Date().toISOString().split("T")[0],size:file.size,base64Data:base64,parsedData:parsed,quoteNumber:parsed.quoteNumber||null,bookingNumber:parsed.bookingNumber||null,rawText:extracted.text.slice(0,5000)};await addDocument(doc);
    const cs=await import("./db/schema.js").then(m=>m.getShipment(shipmentId));if(cs){const upd={};if(parsed.carrierLabel&&parsed.carrier&&(!cs.carrier||cs.carrier===""))upd.carrier=parsed.carrierLabel;if(parsed.vessel&&(!cs.vessel||cs.vessel==="TBD"))upd.vessel=parsed.vessel;if(parsed.documentType==="booking"&&parsed.bookingNumber&&(!cs.ref||cs.refPending)){upd.ref=parsed.bookingNumber;upd.refPending=false;}if(parsed.documentType==="booking"&&cs.status==="planned")upd.status="booked";if(Object.keys(upd).length>0)await updateShipment(shipmentId,upd);}
    await logActivity("document",`${file.name} added to ${cs?.ref||cs?.customerRef||"shipment"}`,shipmentId);}catch(err){console.error("Drop failed:",err);}}await loadData();};
  const handleContextMenu=(e,s)=>{e.preventDefault();setContextMenu({x:e.clientX,y:e.clientY,shipment:s});};

  if(!authChecked)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:DARK.bg0}}><RefreshCw size={24} color={DARK.accent} style={{animation:"spin 1s linear infinite"}}/><style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style></div>;

  // Cloud mode — require Appwrite login
  if(getDbSource()==='cloud'&&!user){
    return<LoginScreen isDark={isDark} mode="cloud" onLogin={u=>{setUser(u);loadData();}}/>;
  }

  // Local mode — require local password
  if(getDbSource()==='local'&&!localUnlocked){
    return<LoginScreen isDark={isDark} mode="local" hasPassword={hasLocalPassword()} onLogin={()=>{setLocalUnlocked(true);loadData();}}/>;
  }

  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg1}}><div style={{textAlign:"center"}}><RefreshCw size={24} color={T.accent} style={{animation:"spin 1s linear infinite"}}/><div style={{marginTop:12,fontSize:14,color:T.text2}}>Loading CargoDesk...</div></div><style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style></div>;

  const isTest=currentMode==="test";
  const pv=projectView?projects.find(p=>p.id===projectView):null;
  const pvShips=projectView?shipments.filter(s=>s.projectId===projectView):[];

  return<ThemeCtx.Provider value={T}><div style={{display:"flex",height:"100vh",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",background:T.bg1,color:T.text1}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    {/* Sidebar */}
    <div style={{width:220,minWidth:220,background:"#0A0E17",display:"flex",flexDirection:"column",borderRight:"1px solid #1A2236"}}>
      <div style={{padding:"20px 20px 12px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#2563EB,#60A5FA)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(59,130,246,0.3)"}}><Anchor size={18} color="white"/></div><div><div style={{fontSize:14,fontWeight:700,color:"#F1F5F9"}}>CargoDesk</div><div style={{fontSize:12,color:"#4F5E78"}}>Logistics Manager</div></div></div></div>
      <div style={{margin:"4px 12px 8px",padding:"6px 10px",borderRadius:6,display:"flex",alignItems:"center",gap:6,background:isTest?"rgba(245,158,11,0.1)":"rgba(16,185,129,0.1)",border:`1px solid ${isTest?"rgba(245,158,11,0.2)":"rgba(16,185,129,0.2)"}`}}><div style={{width:7,height:7,borderRadius:"50%",background:isTest?"#F59E0B":"#10B981"}}/><span style={{fontSize:11,fontWeight:600,color:isTest?"#F59E0B":"#10B981",textTransform:"uppercase",letterSpacing:"0.05em"}}>{isTest?"Test Mode":"Production"}</span></div>
      <nav style={{padding:"0 12px",marginTop:8,flex:1}}>{navs.map(n=><div key={n.id} onClick={()=>{setTab(n.id);setSel(null);setProjectView(null);}} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,marginBottom:4,fontSize:14,fontWeight:500,background:tab===n.id?"rgba(59,130,246,0.12)":"transparent",color:tab===n.id?"#3B82F6":"#8494B0",borderLeft:tab===n.id?"2px solid #3B82F6":"2px solid transparent",cursor:"pointer"}}><n.icon size={18}/>{n.label}</div>)}
        {/* Phase C: Reports section in sidebar */}
        <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #1A2236"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#4F5E78",padding:"4px 12px 6px"}}>Reports</div>
          <div onClick={()=>setShowMorningBrief(true)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,marginBottom:4,fontSize:14,fontWeight:500,color:"#8494B0",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Calendar size={18}/> Morning Brief</div>
          <div onClick={()=>setShowWeeklyReport(true)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,marginBottom:4,fontSize:14,fontWeight:500,color:"#8494B0",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><List size={18}/> Weekly Report</div>
          <div onClick={()=>setShowMonthlyReport(true)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,marginBottom:4,fontSize:14,fontWeight:500,color:"#8494B0",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><BarChart3 size={18}/> Monthly Report</div>
        </div>
        {/* Phase D: AI Assistant button */}
        <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #1A2236"}}>
          <div onClick={()=>setShowAssistant(true)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,marginBottom:4,fontSize:14,fontWeight:500,color:showAssistant?"#3B82F6":"#8494B0",background:showAssistant?"rgba(59,130,246,0.12)":"transparent",borderLeft:showAssistant?"2px solid #3B82F6":"2px solid transparent",cursor:"pointer"}} onMouseEnter={e=>{if(!showAssistant)e.currentTarget.style.background="rgba(59,130,246,0.08)";}} onMouseLeave={e=>{if(!showAssistant)e.currentTarget.style.background="transparent";}}><Bot size={18}/> AI Assistant</div>
        </div>
      </nav>
      <div style={{padding:"0 12px",marginBottom:16}}><div style={{padding:16,borderRadius:12,background:"#161C2E",border:"1px solid #1A2236"}}><div style={{fontSize:12,fontWeight:500,marginBottom:4,color:"#4F5E78"}}>Active</div><div style={{fontSize:24,fontWeight:700,color:"#F1F5F9",fontFamily:"'JetBrains Mono',monospace"}}>{shipments.filter(s=>!["delivered","completed"].includes(s.status)).length}</div><div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,marginTop:4,color:"#3B82F6"}}><Ship size={12}/>{shipments.filter(s=>s.status==="in_transit").length} in transit</div></div></div>
      <div style={{padding:"0 12px 4px"}}><div onClick={()=>setShowSettings(true)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.04)",cursor:"pointer",color:"#8494B0",fontSize:13,fontWeight:500}}><Settings size={16}/> Settings</div></div>
      {/* User / logout */}
      {(user||localUnlocked)&&<div style={{padding:"0 12px 4px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8}}>
          <div style={{fontSize:11,color:"#4F5E78",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{user?user.email:"Local mode"}</div>
          <button onClick={async()=>{
            if(getDbSource()==='cloud'){await logout();setUser(null);}
            else{clearLocalSession();setLocalUnlocked(false);}
          }} title="Lock / Sign out" style={{background:"none",border:"none",color:"#4F5E78",cursor:"pointer",padding:4,flexShrink:0,display:"flex",alignItems:"center"}}><LogOut size={14}/></button>
        </div>
      </div>}
      <div style={{padding:"4px 12px 4px",fontSize:10,color:"#4F5E78",textAlign:"center"}}>Ctrl+N new • Esc back</div>
      <div style={{padding:"4px 12px 16px"}}><ThemeToggle isDark={isDark} onToggle={()=>setIsDark(!isDark)}/></div></div>
    {/* Main */}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {isTest&&<div style={{padding:"6px 24px",background:"rgba(245,158,11,0.08)",borderBottom:"1px solid rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><AlertTriangle size={13} color="#F59E0B"/><span style={{fontSize:12,fontWeight:500,color:"#F59E0B"}}>Test Mode — switch to Production in Settings.</span></div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",background:T.bg2,borderBottom:`1px solid ${T.border1}`,minHeight:56,position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
          <div style={{position:"relative",maxWidth:360,flex:1}}><Search size={16} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.text3}}/><input type="text" placeholder="Search shipments, projects, carriers…" value={q} onChange={e=>setQ(e.target.value)} style={{width:"100%",padding:"8px 16px 8px 40px",borderRadius:8,fontSize:14,border:`1px solid ${T.border1}`,outline:"none",background:T.bg3,color:T.text0}}/></div>
          {tab==="dashboard"&&!projectView&&!sel&&<><SortFilterBar T={T} sortBy={sortBy} onSortChange={setSortBy}/></>}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:16}}>
          <div onClick={()=>setNotif(!notif)} style={{position:"relative",padding:8,borderRadius:8,color:T.text2,cursor:"pointer"}}><Bell size={20}/>{activeNotifCount>0&&<span style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:T.red,color:"white",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeNotifCount}</span>}</div>
          <div onClick={handleNewShipment} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,fontSize:14,fontWeight:500,color:T.accent,background:T.accentGlow,border:"1px solid rgba(59,130,246,0.2)",cursor:"pointer"}}><Plus size={16}/> New Shipment</div></div>
        {notif&&<NotifPanel notifications={notifications} dismissed={dismissed} onDismiss={handleDismiss} onDismissAll={handleDismissAll} onClose={()=>setNotif(false)} onClickNotif={handleClickNotif}/>}</div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {sel&&active?<div style={{flex:1,overflow:"hidden"}}><ShipmentDetail T={T} shipment={active} project={proj} statusCfg={SC} onBack={()=>setSel(null)} onToggleMilestone={handleToggleMilestone} onUpdate={loadData} rates={rates}/></div>
        :projectView&&pv?<div style={{flex:1,overflow:"hidden"}}><ProjectSummary T={T} project={pv} shipments={pvShips} rates={rates} onBack={()=>setProjectView(null)} onSelectShipment={id=>{setSel(id);setProjectView(null);}}/></div>
        :tab==="kanban"?<KanbanView shipments={filtered} projects={projects} onSelect={setSel}/>
        :tab==="financials"?<FinView shipments={shipments} projects={projects} rates={rates} onExport={()=>setShowExport(true)} onMonthlyReport={()=>setShowMonthlyReport(true)}/>
        :<>
          <div style={{flex:1,overflow:"auto",padding:24}}>
            <StatusSummary T={T} shipments={shipments} statusCfg={SC} onFilterClick={setFilt} activeFilter={filt}/>
            {projects.map((p,pi)=>{const ps=filtered.filter(s=>s.projectId===p.id);if(!ps.length)return null;const isExp=exp.includes(p.id);const pc=getProjectColor(p,pi);
              return<div key={p.id} style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div onClick={()=>setExp(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                    {isExp?<ChevronDown size={16} color={T.text2}/>:<ChevronRight size={16} color={T.text2}/>}
                    <div style={{width:8,height:8,borderRadius:"50%",background:pc.color}}/>
                    <span style={{fontWeight:700,fontSize:14,color:pc.color}}>{p.name}</span>
                    <span style={{fontSize:12,color:T.text2}}>{p.customer} • {ps.length}</span></div>
                  <div onClick={e=>{e.stopPropagation();setProjectView(p.id);}} style={{fontSize:11,padding:"3px 8px",borderRadius:4,color:T.accent,background:T.accentGlow,border:"1px solid rgba(59,130,246,0.2)",cursor:"pointer",fontWeight:500}}>Overview</div></div>
                {isExp&&<div style={{marginTop:4}}>{ps.map(s=><ShipRow key={s.id} shipment={s} onClick={()=>setSel(s.id)} onContextMenu={handleContextMenu} onDrop={handleDropOnRow} projectColor={pc}/>)}</div>}</div>;})}
            {filtered.filter(s=>!s.projectId).length>0&&<div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px"}}><Package size={16} color={T.text2}/><span style={{fontWeight:700,fontSize:14,color:T.text0}}>Loose Shipments</span></div>
              {filtered.filter(s=>!s.projectId).map(s=><ShipRow key={s.id} shipment={s} onClick={()=>setSel(s.id)} onContextMenu={handleContextMenu} onDrop={handleDropOnRow}/>)}</div>}</div>
          <DeadlineSidebar shipments={shipments} onSelect={setSel} activities={activities} onActivityClick={id=>{setSel(id);setProjectView(null);}}/></>}</div></div>
    {/* Existing modals */}
    {showNewShipment&&<NewShipmentModal T={T} projects={projects} nextRef={nextRef} onSave={handleSaveShipment} onClose={()=>setShowNewShipment(false)} templates={templates} shipments={shipments}/>}
    {showSettings&&<SettingsPanel T={T} onClose={()=>setShowSettings(false)} onModeChange={handleModeChange} onDataChange={loadData} onCloudSwitch={()=>{setUser(null);setLocalUnlocked(false);setAuthChecked(false);setTimeout(()=>setAuthChecked(true),100);}}/>}
    {showExport&&<ExportDialog T={T} shipments={shipments} projects={projects} rates={rates} onClose={()=>setShowExport(false)}/>}
    {contextMenu&&<ShipmentContextMenu T={T} x={contextMenu.x} y={contextMenu.y} shipment={contextMenu.shipment} onClose={()=>setContextMenu(null)} onStatusChange={handleStatusChange} onDelete={handleDeleteShipment} onDuplicate={handleDuplicate}/>}
    {/* Phase C modals */}
    {showMorningBrief&&<MorningBrief shipments={shipments} quotes={quotes} isDark={isDark} onClose={()=>setShowMorningBrief(false)} onNavigate={id=>{setSel(id);setProjectView(null);setShowMorningBrief(false);}}/>}
    {showMonthlyReport&&<MonthlyReportModal shipments={shipments} projects={projects} rates={rates} isDark={isDark} onClose={()=>setShowMonthlyReport(false)}/>}
    {showWeeklyReport&&<WeeklySnapshotReport shipments={shipments} projects={projects} rates={rates} isDark={isDark} onClose={()=>setShowWeeklyReport(false)} onNavigate={id=>{setSel(id);setProjectView(null);}}/>}
    {/* Phase D: AI Assistant */}
    {showAssistant&&<AssistantPanel shipments={shipments} projects={projects} quotes={quotes} rates={rates} isDark={isDark} onClose={()=>setShowAssistant(false)} onNavigate={id=>{setSel(id);setProjectView(null);setTab("dashboard");}} onDataChange={loadData} selectedShipment={sel ? shipments.find(s=>s.id===sel) : null}/>}
  </div></ThemeCtx.Provider>;}
