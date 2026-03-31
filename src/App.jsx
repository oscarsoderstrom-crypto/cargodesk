import { useState, useMemo, createContext, useContext } from "react";
import { Package, Ship, Plane, Truck, ChevronRight, ChevronDown, Plus, Search, Bell, FileText, Upload, DollarSign, CheckCircle2, Circle, Clock, AlertTriangle, X, Anchor, BarChart3, LayoutDashboard, Columns3, FolderOpen, ChevronLeft, Eye, Sun, Moon } from "lucide-react";

// --- THEME DEFINITIONS ---
const DARK = {
  bg0: "#0A0E17", bg1: "#0F1421", bg2: "#161C2E", bg3: "#1C2438", bg4: "#232D45",
  border0: "#1A2236", border1: "#243049", border2: "#2E3D5C",
  text0: "#F1F5F9", text1: "#CBD5E1", text2: "#8494B0", text3: "#4F5E78",
  accent: "#3B82F6", accentGlow: "rgba(59,130,246,0.12)",
  green: "#10B981", greenBg: "rgba(16,185,129,0.12)", greenBorder: "rgba(16,185,129,0.25)",
  amber: "#F59E0B", amberBg: "rgba(245,158,11,0.12)", amberBorder: "rgba(245,158,11,0.25)",
  red: "#EF4444", redBg: "rgba(239,68,68,0.10)", redBorder: "rgba(239,68,68,0.25)",
  purple: "#A78BFA", purpleBg: "rgba(167,139,250,0.12)", purpleBorder: "rgba(167,139,250,0.25)",
  shadow: "rgba(0,0,0,0.3)", shadowHeavy: "rgba(0,0,0,0.5)",
  modeOcean: "#3B82F6", modeAir: "#A78BFA", modeTruck: "#F59E0B",
};
const LIGHT = {
  bg0: "#0B1120", bg1: "#F5F6F8", bg2: "#FFFFFF", bg3: "#F9FAFB", bg4: "#F3F4F6",
  border0: "#E5E7EB", border1: "#E5E7EB", border2: "#D1D5DB",
  text0: "#0F172A", text1: "#374151", text2: "#6B7280", text3: "#9CA3AF",
  accent: "#2563EB", accentGlow: "rgba(37,99,235,0.08)",
  green: "#059669", greenBg: "#D1FAE5", greenBorder: "#6EE7B7",
  amber: "#D97706", amberBg: "#FEF3C7", amberBorder: "#FDE68A",
  red: "#DC2626", redBg: "#FEE2E2", redBorder: "#FECACA",
  purple: "#7C3AED", purpleBg: "#EDE9FE", purpleBorder: "#C4B5FD",
  shadow: "rgba(0,0,0,0.06)", shadowHeavy: "rgba(0,0,0,0.15)",
  modeOcean: "#2563EB", modeAir: "#7C3AED", modeTruck: "#D97706",
};

const ThemeCtx = createContext(DARK);
const useT = () => useContext(ThemeCtx);

// --- SAMPLE DATA ---
const PROJECTS = [
  { id: "p1", name: "USGOLD", customer: "US Gold Mining Corp" },
  { id: "p2", name: "NORDPULP", customer: "Nordic Pulp & Paper" },
];
const SHIPMENTS = [
  { id: "s1", ref: "S2600000123", projectId: "p1", customerRef: "USGOLD 1", mode: "ocean", status: "in_transit", origin: "Helsinki", destination: "Houston", vessel: "MSC Irina", voyage: "AE325W", carrier: "MSC", routing: "Helsinki → Rotterdam → Houston", etd: "2026-03-15", eta: "2026-04-18", containerType: "2 x 40'HC",
    milestones: [{ id:"m1",label:"Cargo Ready",date:"2026-03-10",done:true },{ id:"m2",label:"S/I Cut-off",date:"2026-03-12",done:true },{ id:"m3",label:"VGM Cut-off",date:"2026-03-13",done:true },{ id:"m4",label:"ETD Helsinki",date:"2026-03-15",done:true },{ id:"m5",label:"Transhipment Rotterdam",date:"2026-03-22",done:true },{ id:"m6",label:"ETA Houston",date:"2026-04-18",done:false },{ id:"m7",label:"Customs Clearance",date:"2026-04-20",done:false },{ id:"m8",label:"Delivered",date:"2026-04-22",done:false }],
    costs: { quoted:14200, items:[{ id:"c1",category:"origin",desc:"Pickup + stuffing",amount:1800,currency:"EUR" },{ id:"c2",category:"transport",desc:"Ocean freight (MSC)",amount:9200,currency:"EUR" },{ id:"c3",category:"origin",desc:"THC Helsinki",amount:450,currency:"EUR" },{ id:"c4",category:"destination",desc:"THC Houston",amount:680,currency:"USD" },{ id:"c5",category:"destination",desc:"Customs brokerage",amount:350,currency:"USD" }], running:[] },
    documents: [{ id:"d1",name:"MSC Quote QT-MSC-2026-0445.pdf",type:"quote",date:"2026-02-28" },{ id:"d2",name:"Booking Confirmation BK-9912834.pdf",type:"booking",date:"2026-03-05" },{ id:"d3",name:"Bill of Lading MSCU2634521.pdf",type:"bl",date:"2026-03-16" }] },
  { id: "s2", ref: "S2600000124", projectId: "p1", customerRef: "USGOLD 2", mode: "air", status: "delivered", origin: "Helsinki", destination: "Houston", vessel: "—", voyage: "—", carrier: "Finnair Cargo", routing: "Helsinki → New York (JFK) → Houston", etd: "2026-03-01", eta: "2026-03-04", containerType: "Air cargo, 2 pallets",
    milestones: [{ id:"m1",label:"Cargo Ready",date:"2026-02-27",done:true },{ id:"m2",label:"Booked",date:"2026-02-28",done:true },{ id:"m3",label:"ETD Helsinki",date:"2026-03-01",done:true },{ id:"m4",label:"ETA Houston",date:"2026-03-04",done:true },{ id:"m5",label:"Customs Clearance",date:"2026-03-05",done:true },{ id:"m6",label:"Delivered",date:"2026-03-06",done:true }],
    costs: { quoted:4800, items:[{ id:"c1",category:"transport",desc:"Air freight (Finnair)",amount:3600,currency:"EUR" },{ id:"c2",category:"origin",desc:"Handling + documentation",amount:280,currency:"EUR" },{ id:"c3",category:"destination",desc:"Handling Houston",amount:420,currency:"USD" }], running:[] },
    documents: [{ id:"d1",name:"Finnair Quote AQ-2026-112.pdf",type:"quote",date:"2026-02-20" },{ id:"d2",name:"AWB 105-23456789.pdf",type:"bl",date:"2026-03-01" }] },
  { id: "s3", ref: "S2600000125", projectId: "p1", customerRef: "USGOLD 3", mode: "ocean", status: "booked", origin: "Helsinki", destination: "Houston", vessel: "Hapag-Lloyd Berlin Express", voyage: "045W", carrier: "Hapag-Lloyd", routing: "Helsinki → Hamburg → Houston", etd: "2026-04-05", eta: "2026-05-02", containerType: "1 x 40'HC",
    milestones: [{ id:"m1",label:"Cargo Ready",date:"2026-03-30",done:false },{ id:"m2",label:"S/I Cut-off",date:"2026-04-02",done:false },{ id:"m3",label:"VGM Cut-off",date:"2026-04-03",done:false },{ id:"m4",label:"ETD Helsinki",date:"2026-04-05",done:false },{ id:"m5",label:"Transhipment Hamburg",date:"2026-04-10",done:false },{ id:"m6",label:"ETA Houston",date:"2026-05-02",done:false }],
    costs: { quoted:7800, items:[{ id:"c1",category:"origin",desc:"Pickup + stuffing",amount:900,currency:"EUR" },{ id:"c2",category:"transport",desc:"Ocean freight (Hapag-Lloyd)",amount:5400,currency:"EUR" },{ id:"c3",category:"origin",desc:"THC Helsinki",amount:380,currency:"EUR" }], running:[] },
    documents: [{ id:"d1",name:"HL Quote QT-HL-2026-8834.pdf",type:"quote",date:"2026-03-10" },{ id:"d2",name:"Booking Conf BKG-HL-443312.pdf",type:"booking",date:"2026-03-20" }] },
  { id: "s4", ref: "S2600000126", projectId: "p2", customerRef: "NORDPULP 1", mode: "ocean", status: "in_transit", origin: "Kotka", destination: "Shanghai", vessel: "COSCO Shipping Universe", voyage: "012E", carrier: "COSCO", routing: "Kotka → Bremerhaven → Port Klang → Shanghai", etd: "2026-03-20", eta: "2026-04-28", containerType: "4 x 40'HC",
    milestones: [{ id:"m1",label:"Cargo Ready",date:"2026-03-14",done:true },{ id:"m2",label:"S/I Cut-off",date:"2026-03-17",done:true },{ id:"m3",label:"VGM Cut-off",date:"2026-03-18",done:true },{ id:"m4",label:"ETD Kotka",date:"2026-03-20",done:true },{ id:"m5",label:"Transhipment Bremerhaven",date:"2026-03-26",done:false },{ id:"m6",label:"Transhipment Port Klang",date:"2026-04-14",done:false },{ id:"m7",label:"ETA Shanghai",date:"2026-04-28",done:false }],
    costs: { quoted:28400, items:[{ id:"c1",category:"origin",desc:"Pickup Kotka",amount:1200,currency:"EUR" },{ id:"c2",category:"transport",desc:"Ocean freight COSCO (4x40HC)",amount:21600,currency:"EUR" },{ id:"c3",category:"origin",desc:"THC Kotka",amount:1600,currency:"EUR" },{ id:"c4",category:"destination",desc:"THC Shanghai",amount:2200,currency:"USD" }], running:[] },
    documents: [{ id:"d1",name:"COSCO Quote COS-Q-2026-1145.pdf",type:"quote",date:"2026-03-01" }] },
  { id: "s5", ref: "S2600000127", projectId: null, customerRef: null, mode: "ocean", status: "planned", origin: "Helsinki", destination: "Dalian", vessel: "TBD", voyage: "TBD", carrier: "Hapag-Lloyd", routing: "Helsinki → Dalian (direct service)", etd: "2026-04-15", eta: "2026-05-27", containerType: "1 x 40'HC",
    milestones: [{ id:"m1",label:"Cargo Ready",date:"2026-04-10",done:false },{ id:"m2",label:"Booking Confirmed",date:null,done:false },{ id:"m3",label:"S/I Cut-off",date:null,done:false },{ id:"m4",label:"ETD Helsinki",date:"2026-04-15",done:false },{ id:"m5",label:"ETA Dalian",date:"2026-05-27",done:false }],
    costs: { quoted:7200, items:[{ id:"c1",category:"transport",desc:"Ocean freight (Hapag-Lloyd quote)",amount:5800,currency:"EUR" },{ id:"c2",category:"origin",desc:"Pickup + stuffing + THC",amount:1100,currency:"EUR" }], running:[] },
    documents: [] },
  { id: "s6", ref: "S2600000128", projectId: "p2", customerRef: "NORDPULP 2", mode: "truck", status: "in_transit", origin: "Kotka", destination: "Stockholm", vessel: "—", voyage: "—", carrier: "DSV Road", routing: "Kotka → Turku (ferry) → Stockholm", etd: "2026-03-29", eta: "2026-03-31", containerType: "Full truck load",
    milestones: [{ id:"m1",label:"Cargo Ready",date:"2026-03-28",done:true },{ id:"m2",label:"Pickup",date:"2026-03-29",done:true },{ id:"m3",label:"Ferry Turku-Stockholm",date:"2026-03-30",done:false },{ id:"m4",label:"Delivered Stockholm",date:"2026-03-31",done:false }],
    costs: { quoted:2800, items:[{ id:"c1",category:"transport",desc:"FTL Kotka-Stockholm via DSV",amount:2200,currency:"EUR" },{ id:"c2",category:"transport",desc:"Ferry crossing",amount:380,currency:"EUR" }],
      running:[{ id:"r1",desc:"Waiting time at origin",dailyRate:450,currency:"EUR",startDate:"2026-03-28",status:"stopped",endDate:"2026-03-29",totalDays:1 }] },
    documents: [{ id:"d1",name:"DSV Quote TR-DSV-2026-556.pdf",type:"quote",date:"2026-03-15" }] },
];
const NOTIFS = [
  { id:"n1",type:"deadline",message:"S/I Cut-off for USGOLD 3 in 2 days",date:"2026-03-31",urgent:true },
  { id:"n2",type:"deadline",message:"VGM Cut-off for USGOLD 3 in 3 days",date:"2026-03-31",urgent:true },
  { id:"n3",type:"info",message:"NORDPULP 2 truck dispatched from Kotka",date:"2026-03-29",urgent:false },
  { id:"n4",type:"deadline",message:"Cargo ready date for S2600000127 in 10 days",date:"2026-03-31",urgent:false },
  { id:"n5",type:"warning",message:"No booking confirmation for S2600000127",date:"2026-03-31",urgent:true },
];

const FX = { EUR:1, USD:1.08, SEK:11.42 };
const toEUR = (a,c) => a/(FX[c]||1);
const fmtEUR = v => new Intl.NumberFormat("fi-FI",{style:"currency",currency:"EUR"}).format(v);
const daysUntil = d => { if(!d||d==="—") return null; return Math.ceil((new Date(d)-new Date("2026-03-31"))/86400000); };
const fmtDate = d => { if(!d||d==="—") return "—"; return new Date(d).toLocaleDateString("fi-FI",{day:"numeric",month:"short",year:"numeric"}); };

function statusCfg(T) { return {
  planned:{label:"Planned",color:T.text2,bg:T.bg3,ring:T.border2},
  booked:{label:"Booked",color:T.amber,bg:T.amberBg,ring:T.amberBorder},
  in_transit:{label:"In Transit",color:T.accent,bg:T.accentGlow,ring:"rgba(59,130,246,0.3)"},
  arrived:{label:"Arrived",color:T.purple,bg:T.purpleBg,ring:T.purpleBorder},
  delivered:{label:"Delivered",color:T.green,bg:T.greenBg,ring:T.greenBorder},
  completed:{label:"Completed",color:T.text3,bg:T.bg3,ring:T.border1},
};}

const MODE_ICON = { ocean:Ship, air:Plane, truck:Truck };

// --- SHARED COMPONENTS ---
function Badge({status}){ const T=useT(), c=statusCfg(T)[status]; return <span style={{background:c.bg,color:c.color,border:`1px solid ${c.ring}`}} className="px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase whitespace-nowrap">{c.label}</span>; }
function MIcon({mode,size=15}){ const T=useT(), I=MODE_ICON[mode]||Package, colors={ocean:T.modeOcean,air:T.modeAir,truck:T.modeTruck}; return <I size={size} color={colors[mode]||T.text2}/>; }
function PBar({milestones}){ const T=useT(), done=milestones.filter(m=>m.done).length, pct=(done/milestones.length)*100;
  return <div className="flex items-center gap-2" style={{minWidth:100}}><div style={{height:4,flex:1,background:T.bg4,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct===100?T.green:T.accent,borderRadius:2,transition:"width 0.3s"}}/></div><span className="text-xs font-medium" style={{color:T.text2}}>{done}/{milestones.length}</span></div>; }

function ThemeToggle({isDark,onToggle}){
  const T=useT();
  return (
    <button onClick={onToggle} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-all" title={isDark?"Switch to Light Mode":"Switch to Dark Mode"}
      style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",border:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.12)"}`}}
      onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.14)"}
      onMouseLeave={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)"}>
      {/* Track */}
      <div style={{width:40,height:22,borderRadius:11,background:isDark?"#1E3A5F":"#93C5FD",position:"relative",transition:"background 0.3s",flexShrink:0}}>
        <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:3,left:isDark?3:21,transition:"left 0.3s",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>
          {isDark?<Moon size={9} color="#1E3A5F"/>:<Sun size={9} color="#D97706"/>}
        </div>
      </div>
      <span className="text-xs font-medium" style={{color:"rgba(255,255,255,0.5)"}}>{isDark?"Dark":"Light"}</span>
    </button>
  );
}

function DeadlineSidebar({shipments,onSelect}){
  const T=useT(), upcoming=[];
  shipments.forEach(s=>{s.milestones.filter(m=>!m.done&&m.date).forEach(m=>{const d=daysUntil(m.date);if(d!==null&&d>=-1&&d<=14) upcoming.push({...m,shipmentRef:s.ref,customerRef:s.customerRef,shipmentId:s.id,days:d});});});
  upcoming.sort((a,b)=>a.days-b.days);
  return (
    <div style={{width:300,minWidth:300,background:T.bg2,borderLeft:`1px solid ${T.border1}`,height:"100%",overflow:"auto"}}>
      <div className="p-4" style={{borderBottom:`1px solid ${T.border1}`}}><h3 className="text-xs font-bold uppercase" style={{color:T.text2,letterSpacing:"0.1em"}}>Upcoming Deadlines</h3></div>
      <div className="p-2">{upcoming.map((item,i)=>{
        const urg=item.days<=2,past=item.days<0;
        return <button key={i} onClick={()=>onSelect(item.shipmentId)} className="w-full text-left p-3 rounded-lg mb-1 transition-all"
          style={{background:past?T.redBg:urg?T.amberBg:T.bg3,border:`1px solid ${past?T.redBorder:urg?T.amberBorder:T.border0}`,cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateX(2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
          <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold" style={{color:past?T.red:urg?T.amber:T.accent,fontFamily:"'JetBrains Mono',monospace"}}>{item.days<0?`${Math.abs(item.days)}d overdue`:item.days===0?"TODAY":`${item.days}d`}</span>
            {(past||urg)&&<AlertTriangle size={13} color={past?T.red:T.amber}/>}</div>
          <div className="text-sm font-semibold" style={{color:T.text0}}>{item.label}</div>
          <div className="text-xs mt-0.5" style={{color:T.text2}}>{item.customerRef||item.shipmentRef}</div></button>;
      })}{!upcoming.length&&<div className="p-4 text-center text-sm" style={{color:T.text3}}>No upcoming deadlines</div>}</div></div>);
}

function NotifPanel({notifications,onClose}){
  const T=useT();
  return <div style={{position:"absolute",top:48,right:16,width:380,background:T.bg3,borderRadius:12,boxShadow:`0 20px 60px ${T.shadowHeavy}`,border:`1px solid ${T.border2}`,zIndex:100}}>
    <div className="flex items-center justify-between p-4" style={{borderBottom:`1px solid ${T.border1}`}}><h3 className="font-bold text-sm" style={{color:T.text0}}>Notifications</h3><button onClick={onClose} style={{color:T.text2}}><X size={16}/></button></div>
    <div style={{maxHeight:400,overflow:"auto"}}>{notifications.map(n=><div key={n.id} className="p-3 flex gap-3 items-start" style={{borderBottom:`1px solid ${T.border0}`}}>
      <div className="mt-0.5">{n.type==="deadline"&&<Clock size={16} color={n.urgent?T.amber:T.text2}/>}{n.type==="warning"&&<AlertTriangle size={16} color={T.red}/>}{n.type==="info"&&<CheckCircle2 size={16} color={T.green}/>}</div>
      <div><div className="text-sm" style={{color:T.text1}}>{n.message}</div><div className="text-xs mt-1" style={{color:T.text3}}>{fmtDate(n.date)}</div></div></div>)}</div></div>;
}

function ShipmentDetail({shipment,project,onBack}){
  const T=useT();
  const [tab,setTab]=useState("overview");
  const [milestones,setMilestones]=useState(shipment.milestones);
  const [isDrag,setIsDrag]=useState(false);
  const totalCost=shipment.costs.items.reduce((s,c)=>s+toEUR(c.amount,c.currency),0)+shipment.costs.running.reduce((s,r)=>s+toEUR(r.dailyRate*(r.totalDays||0),r.currency),0);
  const quoted=shipment.costs.quoted,margin=quoted-totalCost,marginPct=quoted>0?(margin/quoted*100):0;
  const toggle=id=>setMilestones(p=>p.map(m=>m.id===id?{...m,done:!m.done}:m));
  const tabs=[{id:"overview",label:"Overview",icon:Eye},{id:"costs",label:"Costs",icon:DollarSign},{id:"documents",label:"Documents",icon:FileText},{id:"milestones",label:"Milestones",icon:CheckCircle2}];

  return <div style={{height:"100%",overflow:"auto",background:T.bg1}}>
    <div className="p-6" style={{borderBottom:`1px solid ${T.border1}`,background:`linear-gradient(180deg, ${T.bg2} 0%, ${T.bg1} 100%)`}}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4 px-2 py-1 rounded" style={{color:T.text2}}
        onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><ChevronLeft size={16}/> Back to Dashboard</button>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2"><MIcon mode={shipment.mode} size={22}/><h1 className="text-2xl font-bold" style={{color:T.text0,fontFamily:"'JetBrains Mono',monospace"}}>{shipment.ref}</h1><Badge status={shipment.status}/></div>
          {project&&<div className="flex items-center gap-2 text-sm mb-1"><FolderOpen size={14} color={T.text2}/><span style={{color:T.text2}}>Project: <strong style={{color:T.text0}}>{project.name}</strong></span>{shipment.customerRef&&<span style={{color:T.text3}}>• {shipment.customerRef}</span>}</div>}
          <div className="text-sm mt-2" style={{color:T.text1}}><strong>{shipment.origin}</strong> → <strong>{shipment.destination}</strong><span className="mx-2" style={{color:T.border2}}>|</span>{shipment.carrier} • {shipment.containerType}</div>
        </div>
        <div className="text-right"><div className="text-xs uppercase tracking-wider mb-1" style={{color:T.text2}}>Margin</div>
          <div className="text-2xl font-bold" style={{color:margin>=0?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{fmtEUR(margin)}</div>
          <div className="text-xs" style={{color:margin>=0?T.green:T.red}}>{marginPct.toFixed(1)}%</div></div></div></div>
    <div className="flex gap-0 px-6" style={{borderBottom:`1px solid ${T.border1}`,background:T.bg2}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
        style={{color:tab===t.id?T.accent:T.text2,borderBottom:tab===t.id?`2px solid ${T.accent}`:"2px solid transparent",marginBottom:-1}}><t.icon size={15}/> {t.label}</button>)}</div>
    <div className="p-6">
      {tab==="overview"&&<div className="grid grid-cols-2 gap-6">
        <div><h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{color:T.text2,letterSpacing:"0.1em"}}>Transport Details</h3>
          <div style={{background:T.bg2,borderRadius:10,border:`1px solid ${T.border1}`}}>
            {[["Vessel / Vehicle",shipment.vessel],["Voyage",shipment.voyage],["Carrier",shipment.carrier],["Routing",shipment.routing],["Container / Cargo",shipment.containerType],["ETD",fmtDate(shipment.etd)],["ETA",fmtDate(shipment.eta)]].map(([l,v],i)=>
              <div key={i} className="flex justify-between px-4 py-2.5" style={{borderBottom:i<6?`1px solid ${T.border0}`:"none"}}><span className="text-sm" style={{color:T.text2}}>{l}</span><span className="text-sm font-medium" style={{color:T.text0}}>{v}</span></div>)}</div></div>
        <div><h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{color:T.text2,letterSpacing:"0.1em"}}>Milestone Progress</h3>
          <div className="space-y-1">{milestones.map((m,i)=>{const d=daysUntil(m.date),isNext=!m.done&&(i===0||milestones[i-1].done);
            return <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg" style={{background:isNext?T.accentGlow:"transparent"}}>
              <button onClick={()=>toggle(m.id)} className="flex-shrink-0 hover:scale-110 transition-transform" style={{cursor:"pointer",color:m.done?T.green:T.text3}}>{m.done?<CheckCircle2 size={20}/>:<Circle size={20}/>}</button>
              <div className="flex-1"><span className="text-sm" style={{color:m.done?T.text3:T.text0,textDecoration:m.done?"line-through":"none"}}>{m.label}</span></div>
              <span className="text-xs" style={{color:T.text3,fontFamily:"'JetBrains Mono',monospace"}}>{m.date?fmtDate(m.date):"TBD"}</span>
              {d!==null&&!m.done&&d<=3&&d>=0&&<span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{background:d<=1?T.redBg:T.amberBg,color:d<=1?T.red:T.amber}}>{d===0?"TODAY":`${d}d`}</span>}
            </div>;})}</div></div></div>}
      {tab==="costs"&&<div>
        <div className="grid grid-cols-3 gap-4 mb-6">{[{l:"Quoted to Customer",v:fmtEUR(quoted),c:T.accent},{l:"Total Costs",v:fmtEUR(totalCost),c:T.text1},{l:"Margin",v:fmtEUR(margin),c:margin>=0?T.green:T.red}].map((card,i)=>
          <div key={i} className="p-4 rounded-xl" style={{background:T.bg2,border:`1px solid ${T.border1}`}}><div className="text-xs uppercase tracking-wider mb-1" style={{color:T.text2}}>{card.l}</div><div className="text-xl font-bold" style={{color:card.c,fontFamily:"'JetBrains Mono',monospace"}}>{card.v}</div></div>)}</div>
        {["origin","transport","transhipment","destination"].map(cat=>{const items=shipment.costs.items.filter(c=>c.category===cat);if(!items.length)return null;
          return <div key={cat} className="mb-4"><h4 className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{color:T.text3}}>{cat}</h4>
            <div style={{borderRadius:10,border:`1px solid ${T.border1}`,overflow:"hidden"}}>{items.map((c,i)=>
              <div key={c.id} className="flex justify-between items-center px-4 py-3" style={{borderBottom:i<items.length-1?`1px solid ${T.border0}`:"none",background:T.bg2}}>
                <span className="text-sm" style={{color:T.text1}}>{c.desc}</span>
                <div className="text-right"><span className="text-sm font-semibold" style={{color:T.text0,fontFamily:"'JetBrains Mono',monospace"}}>{c.currency} {c.amount.toLocaleString("fi-FI")}</span>
                  {c.currency!=="EUR"&&<div className="text-xs" style={{color:T.text3}}>≈ {fmtEUR(toEUR(c.amount,c.currency))}</div>}</div></div>)}</div></div>;})}
        {shipment.costs.running.length>0&&<div className="mb-4"><h4 className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{color:T.red}}>Running Costs</h4>
          <div style={{borderRadius:10,border:`1px solid ${T.redBorder}`,overflow:"hidden"}}>{shipment.costs.running.map(r=>
            <div key={r.id} className="flex justify-between items-center px-4 py-3" style={{background:T.redBg}}>
              <div><span className="text-sm font-medium" style={{color:T.text1}}>{r.desc}</span><div className="text-xs mt-0.5" style={{color:T.text2}}>{fmtDate(r.startDate)} → {r.status==="running"?"ongoing":fmtDate(r.endDate)} • {r.totalDays||"?"} days × {r.currency} {r.dailyRate}</div></div>
              <div className="flex items-center gap-3"><span className="text-sm font-bold" style={{color:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{r.currency} {((r.totalDays||0)*r.dailyRate).toLocaleString("fi-FI")}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:r.status==="running"?T.redBg:T.greenBg,color:r.status==="running"?T.red:T.green,border:`1px solid ${r.status==="running"?T.redBorder:T.greenBorder}`}}>{r.status==="running"?"RUNNING":"STOPPED"}</span></div></div>)}</div></div>}
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium mt-2" style={{color:T.accent,border:`1px dashed ${T.border2}`}}
          onMouseEnter={e=>e.currentTarget.style.background=T.accentGlow} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Plus size={16}/> Add Cost Item</button></div>}
      {tab==="documents"&&<div>
        <div onDragOver={e=>{e.preventDefault();setIsDrag(true);}} onDragLeave={()=>setIsDrag(false)} onDrop={e=>{e.preventDefault();setIsDrag(false);}}
          className="flex flex-col items-center justify-center p-8 rounded-xl mb-6 transition-all" style={{border:`2px dashed ${isDrag?T.accent:T.border2}`,background:isDrag?T.accentGlow:T.bg2}}>
          <Upload size={32} color={isDrag?T.accent:T.text3} className="mb-3"/><div className="text-sm font-medium" style={{color:isDrag?T.accent:T.text2}}>Drop PDF files here</div>
          <div className="text-xs mt-1" style={{color:T.text3}}>Quotes, bookings, BLs, invoices — auto-parsed</div></div>
        <div style={{borderRadius:10,border:`1px solid ${T.border1}`,overflow:"hidden"}}>
          {shipment.documents.map((doc,i)=>{const tc={quote:T.amber,booking:T.accent,bl:T.purple,invoice:T.green},tb={quote:T.amberBg,booking:T.accentGlow,bl:T.purpleBg,invoice:T.greenBg},tl={quote:"Quote",booking:"Booking",bl:"B/L",invoice:"Invoice"};
            return <div key={doc.id} className="flex items-center gap-3 px-4 py-3" style={{borderBottom:i<shipment.documents.length-1?`1px solid ${T.border0}`:"none",background:T.bg2}}>
              <FileText size={18} color={tc[doc.type]||T.text2}/><div className="flex-1"><div className="text-sm font-medium" style={{color:T.text0}}>{doc.name}</div><div className="text-xs" style={{color:T.text3}}>{fmtDate(doc.date)}</div></div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{background:tb[doc.type],color:tc[doc.type]}}>{tl[doc.type]||doc.type}</span></div>;})}{!shipment.documents.length&&<div className="p-8 text-center text-sm" style={{color:T.text3,background:T.bg2}}>No documents yet — drop files above</div>}</div></div>}
      {tab==="milestones"&&<div className="max-w-xl">{milestones.map((m,i)=>{const d=daysUntil(m.date);
        return <div key={m.id} className="flex gap-4"><div className="flex flex-col items-center">
          <button onClick={()=>toggle(m.id)} className="hover:scale-110 transition-transform" style={{cursor:"pointer",color:m.done?T.green:T.text3}}>{m.done?<CheckCircle2 size={24}/>:<Circle size={24}/>}</button>
          {i<milestones.length-1&&<div style={{width:2,flex:1,background:m.done?T.greenBorder:T.border1,minHeight:32}}/>}</div>
          <div className="pb-6"><div className="text-sm font-semibold" style={{color:m.done?T.text3:T.text0}}>{m.label}</div>
            <div className="text-xs" style={{color:T.text3}}>{m.date?fmtDate(m.date):"TBD"}{d!==null&&!m.done&&d>=0&&d<=7&&<span className="ml-2 font-bold" style={{color:d<=2?T.red:T.amber}}>({d===0?"today":`in ${d} days`})</span>}</div></div></div>;})}</div>}
    </div></div>;
}

function KanbanView({shipments,projects,onSelect}){
  const T=useT(),statuses=["planned","booked","in_transit","arrived","delivered"],SC=statusCfg(T);
  return <div className="flex gap-4 p-6" style={{height:"100%",overflow:"auto"}}>
    {statuses.map(st=>{const items=shipments.filter(s=>s.status===st),cfg=SC[st];
      return <div key={st} style={{minWidth:260,width:260,flex:"0 0 260px"}}>
        <div className="flex items-center gap-2 mb-3 px-1"><div style={{width:10,height:10,borderRadius:"50%",background:cfg.color}}/><span className="text-xs font-bold uppercase tracking-wider" style={{color:cfg.color}}>{cfg.label}</span><span className="text-xs font-bold px-1.5 rounded-full" style={{background:cfg.bg,color:cfg.color}}>{items.length}</span></div>
        <div className="space-y-2">{items.map(s=>{const proj=projects.find(p=>p.id===s.projectId),nm=s.milestones.find(m=>!m.done&&m.date),d=nm?daysUntil(nm.date):null;
          return <button key={s.id} onClick={()=>onSelect(s.id)} className="w-full text-left p-3 rounded-xl transition-all"
            style={{background:T.bg2,border:`1px solid ${T.border1}`,cursor:"pointer"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 6px 20px ${T.shadow}`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border1;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
            <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold" style={{color:T.text1,fontFamily:"'JetBrains Mono',monospace"}}>{s.ref}</span><MIcon mode={s.mode} size={14}/></div>
            {proj&&<div className="text-xs mb-1.5" style={{color:T.text2}}><span className="font-semibold" style={{color:T.text1}}>{proj.name}</span> • {s.customerRef}</div>}
            <div className="text-xs mb-2" style={{color:T.text2}}>{s.origin} → {s.destination}</div><PBar milestones={s.milestones}/>
            {nm&&d!==null&&d<=5&&<div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{color:d<=2?T.red:T.amber}}><Clock size={12}/>{nm.label} {d===0?"today":d<0?`${Math.abs(d)}d ago`:`in ${d}d`}</div>}
          </button>;})}{!items.length&&<div className="p-4 text-center text-xs rounded-xl" style={{color:T.text3,background:T.bg2,border:`1px dashed ${T.border1}`}}>No shipments</div>}</div></div>;})}</div>;
}

function FinView({shipments,projects}){
  const T=useT(),[groupBy,setGroupBy]=useState("all");
  const calc=s=>{const c=s.costs.items.reduce((a,i)=>a+toEUR(i.amount,i.currency),0)+s.costs.running.reduce((a,r)=>a+toEUR(r.dailyRate*(r.totalDays||0),r.currency),0);return{quoted:s.costs.quoted,cost:c,margin:s.costs.quoted-c};};
  const grouped=groupBy==="project"?[...projects.map(p=>({label:p.name,customer:p.customer,shipments:shipments.filter(s=>s.projectId===p.id)})),{label:"Loose Shipments",customer:"—",shipments:shipments.filter(s=>!s.projectId)}].filter(g=>g.shipments.length>0):[{label:"All Shipments",customer:"",shipments}];
  const gt=shipments.reduce((a,s)=>{const f=calc(s);return{quoted:a.quoted+f.quoted,cost:a.cost+f.cost,margin:a.margin+f.margin};},{quoted:0,cost:0,margin:0});
  return <div className="p-6" style={{height:"100%",overflow:"auto"}}>
    <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold" style={{color:T.text0}}>Financial Overview</h2>
      <div className="flex gap-1" style={{background:T.bg2,borderRadius:8,padding:3,border:`1px solid ${T.border1}`}}>
        {["all","project"].map(g=><button key={g} onClick={()=>setGroupBy(g)} className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{background:groupBy===g?T.accent:"transparent",color:groupBy===g?"white":T.text2}}>{g==="all"?"All":"By Project"}</button>)}</div></div>
    <div className="grid grid-cols-3 gap-4 mb-6">{[
      {l:"Total Quoted",v:fmtEUR(gt.quoted),c:T.accent,bg:T.accentGlow,b:"rgba(59,130,246,0.2)"},
      {l:"Total Costs",v:fmtEUR(gt.cost),c:T.text1,bg:T.bg2,b:T.border1},
      {l:"Total Margin",v:fmtEUR(gt.margin),c:gt.margin>=0?T.green:T.red,bg:gt.margin>=0?T.greenBg:T.redBg,b:gt.margin>=0?T.greenBorder:T.redBorder},
    ].map((c,i)=><div key={i} className="p-5 rounded-xl" style={{background:c.bg,border:`1px solid ${c.b}`}}><div className="text-xs uppercase tracking-wider mb-1" style={{color:T.text2}}>{c.l}</div><div className="text-2xl font-bold" style={{color:c.c,fontFamily:"'JetBrains Mono',monospace"}}>{c.v}</div></div>)}</div>
    {grouped.map((group,gi)=>{const gf=group.shipments.reduce((a,s)=>{const f=calc(s);return{quoted:a.quoted+f.quoted,cost:a.cost+f.cost,margin:a.margin+f.margin};},{quoted:0,cost:0,margin:0});
      return <div key={gi} className="mb-6">
        {groupBy==="project"&&<div className="flex items-center justify-between mb-3 px-1"><div><span className="font-bold text-sm" style={{color:T.text0}}>{group.label}</span>{group.customer!=="—"&&<span className="text-xs ml-2" style={{color:T.text2}}>{group.customer}</span>}</div>
          <span className="font-bold text-sm" style={{color:gf.margin>=0?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>Margin: {fmtEUR(gf.margin)}</span></div>}
        <div style={{borderRadius:10,border:`1px solid ${T.border1}`,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:T.bg3}}>{["Reference","Route","Status","Quoted","Costs","Margin",""].map((h,i)=>
            <th key={i} className="text-xs font-bold uppercase tracking-wider text-left px-4 py-2.5" style={{color:T.text3,borderBottom:`1px solid ${T.border1}`}}>{h}</th>)}</tr></thead>
            <tbody>{group.shipments.map((s,i)=>{const f=calc(s),pct=f.quoted>0?(f.margin/f.quoted*100):0;
              return <tr key={s.id} style={{borderBottom:i<group.shipments.length-1?`1px solid ${T.border0}`:"none",background:T.bg2}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background=T.bg2}>
                <td className="px-4 py-3"><div className="text-sm font-bold" style={{fontFamily:"'JetBrains Mono',monospace",color:T.text0}}>{s.ref}</div>{s.customerRef&&<div className="text-xs" style={{color:T.text3}}>{s.customerRef}</div>}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-sm" style={{color:T.text1}}><MIcon mode={s.mode} size={13}/> {s.origin} → {s.destination}</div></td>
                <td className="px-4 py-3"><Badge status={s.status}/></td>
                <td className="px-4 py-3 text-sm font-medium" style={{fontFamily:"'JetBrains Mono',monospace",color:T.text1}}>{fmtEUR(f.quoted)}</td>
                <td className="px-4 py-3 text-sm font-medium" style={{fontFamily:"'JetBrains Mono',monospace",color:T.text1}}>{fmtEUR(f.cost)}</td>
                <td className="px-4 py-3"><span className="text-sm font-bold" style={{fontFamily:"'JetBrains Mono',monospace",color:f.margin>=0?T.green:T.red}}>{fmtEUR(f.margin)}</span><span className="text-xs ml-1" style={{color:f.margin>=0?T.green:T.red}}>({pct.toFixed(1)}%)</span></td>
                <td className="px-4 py-3">{s.costs.running.some(r=>r.status==="running")&&<span className="flex items-center gap-1 text-xs font-bold" style={{color:T.red}}><span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{background:T.red}}/>RUNNING</span>}</td>
              </tr>;})}</tbody></table></div></div>;})}</div>;
}

function ShipRow({shipment:s,project,onClick}){
  const T=useT(),nm=s.milestones.find(m=>!m.done&&m.date),d=nm?daysUntil(nm.date):null;
  return <button onClick={onClick} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-1 text-left transition-all"
    style={{background:T.bg2,border:`1px solid ${T.border0}`,cursor:"pointer"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.background=T.bg3;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border0;e.currentTarget.style.background=T.bg2;}}>
    <div style={{width:34,height:34,borderRadius:9,background:T.bg4,display:"flex",alignItems:"center",justifyContent:"center"}}><MIcon mode={s.mode} size={17}/></div>
    <div style={{flex:"0 0 140px"}}><div className="text-sm font-bold" style={{fontFamily:"'JetBrains Mono',monospace",color:T.text0}}>{s.ref}</div>{s.customerRef&&<div className="text-xs" style={{color:T.text3}}>{s.customerRef}</div>}</div>
    <div style={{flex:"0 0 180px"}}><div className="text-sm" style={{color:T.text1}}>{s.origin} → {s.destination}</div><div className="text-xs" style={{color:T.text3}}>{s.carrier}</div></div>
    <div style={{flex:"0 0 120px"}}><div className="text-xs" style={{color:T.text2}}>{s.vessel!=="TBD"&&s.vessel!=="—"?s.vessel.split(" ").slice(-1)[0]:"—"}</div><div className="text-xs" style={{color:T.text3}}>{s.routing.includes("→")?s.routing.split("→").length-1+" legs":"direct"}</div></div>
    <div style={{flex:"0 0 90px"}}><div className="text-xs font-medium" style={{color:T.text1}}>ETD {fmtDate(s.etd).replace(/\.\d{4}$/,"")}</div><div className="text-xs" style={{color:T.text3}}>ETA {fmtDate(s.eta).replace(/\.\d{4}$/,"")}</div></div>
    <div style={{flex:"0 0 90px"}}><Badge status={s.status}/></div>
    <div style={{flex:"0 0 120px"}}><PBar milestones={s.milestones}/></div>
    <div style={{flex:1,textAlign:"right"}}>{nm&&d!==null&&d<=5&&<span className="text-xs font-semibold px-2 py-1 rounded-md" style={{background:d<=1?T.redBg:d<=3?T.amberBg:T.accentGlow,color:d<=1?T.red:d<=3?T.amber:T.accent,border:`1px solid ${d<=1?T.redBorder:d<=3?T.amberBorder:"rgba(59,130,246,0.2)"}`}}>{nm.label}: {d===0?"Today":d<0?`${Math.abs(d)}d ago`:`${d}d`}</span>}</div>
  </button>;
}

export default function LogisticsApp(){
  const [isDark,setIsDark]=useState(true);
  const T=isDark?DARK:LIGHT;
  const [tab,setTab]=useState("dashboard");
  const [sel,setSel]=useState(null);
  const [notif,setNotif]=useState(false);
  const [q,setQ]=useState("");
  const [filt,setFilt]=useState("all");
  const [exp,setExp]=useState(["p1","p2"]);
  const SC=statusCfg(T);
  const filtered=useMemo(()=>{let r=SHIPMENTS;if(filt!=="all")r=r.filter(s=>s.status===filt);if(q){const lq=q.toLowerCase();r=r.filter(s=>s.ref.toLowerCase().includes(lq)||(s.customerRef||"").toLowerCase().includes(lq)||s.origin.toLowerCase().includes(lq)||s.destination.toLowerCase().includes(lq)||s.carrier.toLowerCase().includes(lq)||PROJECTS.find(p=>p.id===s.projectId)?.name.toLowerCase().includes(lq));}return r;},[filt,q]);
  const active=SHIPMENTS.find(s=>s.id===sel),proj=active?PROJECTS.find(p=>p.id===active.projectId):null;
  const urgCt=NOTIFS.filter(n=>n.urgent).length;
  const navs=[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"kanban",label:"Board",icon:Columns3},{id:"financials",label:"Financials",icon:BarChart3}];

  // Light mode sidebar stays dark for brand consistency
  const sidebarBg = isDark ? T.bg0 : "#0B1120";
  const sidebarBorder = isDark ? T.border0 : "#1A2236";

  return <ThemeCtx.Provider value={T}>
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',-apple-system,sans-serif",background:T.bg1,color:T.text1,transition:"background 0.3s, color 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {/* Sidebar — always dark for brand */}
      <div style={{width:220,minWidth:220,background:sidebarBg,display:"flex",flexDirection:"column",borderRight:`1px solid ${sidebarBorder}`}}>
        <div className="p-5 pb-3"><div className="flex items-center gap-2.5"><div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#2563EB,#60A5FA)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(59,130,246,0.3)"}}><Anchor size={18} color="white"/></div>
          <div><div className="text-sm font-bold" style={{color:"#F1F5F9"}}>CargoDesk</div><div className="text-xs" style={{color:"#4F5E78"}}>Logistics Manager</div></div></div></div>
        <nav className="px-3 mt-4 flex-1">{navs.map(n=><button key={n.id} onClick={()=>{setTab(n.id);setSel(null);}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all"
          style={{background:tab===n.id?"rgba(59,130,246,0.12)":"transparent",color:tab===n.id?"#3B82F6":"#8494B0",borderLeft:tab===n.id?"2px solid #3B82F6":"2px solid transparent"}}>
          <n.icon size={18}/> {n.label}</button>)}</nav>
        <div className="p-4 mx-3 mb-2 rounded-xl" style={{background:"#161C2E",border:"1px solid #1A2236"}}>
          <div className="text-xs font-medium mb-1" style={{color:"#4F5E78"}}>Active Shipments</div>
          <div className="text-2xl font-bold" style={{color:"#F1F5F9",fontFamily:"'JetBrains Mono',monospace"}}>{SHIPMENTS.filter(s=>!["delivered","completed"].includes(s.status)).length}</div>
          <div className="flex items-center gap-1.5 text-xs mt-1" style={{color:"#3B82F6"}}><Ship size={12}/>{SHIPMENTS.filter(s=>s.status==="in_transit").length} in transit</div></div>
        {/* Theme toggle */}
        <div className="px-3 mb-4"><ThemeToggle isDark={isDark} onToggle={()=>setIsDark(!isDark)}/></div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",transition:"background 0.3s"}}>
        <div className="flex items-center justify-between px-6 py-3" style={{background:T.bg2,borderBottom:`1px solid ${T.border1}`,minHeight:56,position:"relative",transition:"background 0.3s"}}>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative" style={{maxWidth:360,flex:1}}><Search size={16} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.text3}}/>
              <input type="text" placeholder="Search shipments, projects, carriers…" value={q} onChange={e=>setQ(e.target.value)} className="w-full py-2 pl-10 pr-4 rounded-lg text-sm"
                style={{border:`1px solid ${T.border1}`,outline:"none",background:T.bg3,color:T.text0,caretColor:T.accent,transition:"background 0.3s, border-color 0.3s"}}/></div>
            {tab==="dashboard"&&<div className="flex gap-1 ml-2" style={{background:T.bg3,borderRadius:8,padding:3,border:`1px solid ${T.border0}`,transition:"background 0.3s"}}>
              {["all","planned","booked","in_transit","delivered"].map(s=><button key={s} onClick={()=>setFilt(s)} className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{background:filt===s?T.bg4:"transparent",color:filt===s?T.text0:T.text3}}>{s==="all"?"All":SC[s]?.label||s}</button>)}</div>}</div>
          <div className="flex items-center gap-2 ml-4">
            <button onClick={()=>setNotif(!notif)} className="relative p-2 rounded-lg transition-colors" style={{color:T.text2}}
              onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <Bell size={20}/>{urgCt>0&&<span style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:T.red,color:"white",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 8px ${T.redBg}`}}>{urgCt}</span>}</button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{color:T.accent,background:T.accentGlow,border:"1px solid rgba(59,130,246,0.2)"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.2)"} onMouseLeave={e=>e.currentTarget.style.background=T.accentGlow}>
              <Plus size={16}/> New Shipment</button></div>
          {notif&&<NotifPanel notifications={NOTIFS} onClose={()=>setNotif(false)}/>}</div>

        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {sel&&active?<div style={{flex:1,overflow:"hidden"}}><ShipmentDetail shipment={active} project={proj} onBack={()=>setSel(null)}/></div>
            :tab==="kanban"?<KanbanView shipments={filtered} projects={PROJECTS} onSelect={setSel}/>
            :tab==="financials"?<FinView shipments={SHIPMENTS} projects={PROJECTS}/>
            :<>
              <div style={{flex:1,overflow:"auto",padding:24}}>
                {PROJECTS.map(p=>{const ps=filtered.filter(s=>s.projectId===p.id);if(!ps.length)return null;const isExp=exp.includes(p.id);
                  return <div key={p.id} className="mb-4">
                    <button onClick={()=>setExp(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg transition-colors"
                      style={{color:T.text1}} onMouseEnter={e=>e.currentTarget.style.background=T.bg3} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {isExp?<ChevronDown size={16} color={T.text2}/>:<ChevronRight size={16} color={T.text2}/>}
                      <FolderOpen size={16} color={T.accent}/><span className="font-bold text-sm" style={{color:T.text0}}>{p.name}</span>
                      <span className="text-xs" style={{color:T.text2}}>{p.customer} • {ps.length} shipments</span></button>
                    {isExp&&<div className="mt-1">{ps.map(s=><ShipRow key={s.id} shipment={s} project={p} onClick={()=>setSel(s.id)}/>)}</div>}</div>;})}
                {filtered.filter(s=>!s.projectId).length>0&&<div className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2"><Package size={16} color={T.text2}/><span className="font-bold text-sm" style={{color:T.text0}}>Loose Shipments</span></div>
                  {filtered.filter(s=>!s.projectId).map(s=><ShipRow key={s.id} shipment={s} project={null} onClick={()=>setSel(s.id)}/>)}</div>}</div>
              <DeadlineSidebar shipments={SHIPMENTS} onSelect={setSel}/></>}
        </div></div></div>
  </ThemeCtx.Provider>;
}
