import { useState, useCallback } from "react";

// ── CONSTANTS ────────────────────────────────────────────────────────
const KEY_ODIN   = "odin-v6";
const KEY_FLIP7  = "flip7-v2";
const KEY_SKYJO  = "skyjo-v1";
const KEY_GROUPS = "scorekeeper-groups-v1";
const COLORS  = ["#ff6e6c","#67d5b5","#f7c59f","#c3aed6","#5eb8ff","#ffd166"];
const MEDALS  = ["🥇","🥈","🥉","4e","5e","6e"];
const genId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

const GAMES = {
  odin: {
    key: KEY_ODIN,
    label: "Odin",
    emoji: "⚔️",
    color: "#c9933a",
    colorDim: "rgba(201,147,58,.12)",
    border: "#3a342c",
    surface: "#1d1a16",
    surface2: "#272320",
    bg: "#12100e",
    text: "#f5ead8",
    sub: "#8a7d6a",
    accent: "#f0c060",
    btnBg: "#c9933a",
    btnColor: "#12100e",
    desc: "Le plus de points gagne\nObjectif : atteindre la limite",
    defaultLimit: 15,
    limitLabel: "Éliminé à partir de",
    limitMin: 5, limitMax: 50, limitStep: 1,
    goalKey: "limit",
    winMode: "lowest",
  },
  flip7: {
    key: KEY_FLIP7,
    label: "Flip 7",
    emoji: "🃏",
    color: "#1f6feb",
    colorDim: "rgba(99,179,237,.12)",
    border: "#21262d",
    surface: "#161b22",
    surface2: "#21262d",
    bg: "#0d1117",
    text: "#e8f4fd",
    sub: "#8b949e",
    accent: "#63b3ed",
    btnBg: "#1f6feb",
    btnColor: "#fff",
    desc: "Le plus de points gagne\nPremier à atteindre l'objectif",
    defaultLimit: 200,
    limitLabel: "Objectif de points",
    limitMin: 50, limitMax: 500, limitStep: 50,
    goalKey: "goal",
    winMode: "highest",
  },
  skyjo: {
    key: KEY_SKYJO,
    label: "Skyjo",
    emoji: "🎴",
    color: "#7c3aed",
    colorDim: "rgba(124,58,237,.12)",
    border: "#2d1f4a",
    surface: "#1a1030",
    surface2: "#221540",
    bg: "#110c22",
    text: "#ede9f8",
    sub: "#8b7eaa",
    accent: "#c084fc",
    btnBg: "#7c3aed",
    btnColor: "#fff",
    desc: "Le moins de points gagne\nFin quand un joueur atteint 100 pts",
    defaultLimit: 100,
    limitLabel: "Fin de partie à",
    limitMin: 50, limitMax: 200, limitStep: 10,
    goalKey: "limit",
    winMode: "lowest",
    hasDouble: true,
  },
};

// ── STORAGE ──────────────────────────────────────────────────────────
const DEFAULT_LIMITS = { odin: 15, flip7: 200, skyjo: 100 };

function defaultGroups() {
  return [{
    id: genId(),
    name: "Weekend",
    players: ["Véronique","Johan","Maxime","Florine","Amélie","Julien"],
    limits: { ...DEFAULT_LIMITS },
    pastGames: [],
  }];
}

function loadGroups() {
  try { const r = localStorage.getItem(KEY_GROUPS); if (r) return JSON.parse(r); } catch(e) {}
  return defaultGroups();
}

function saveGroups(groups) {
  try { localStorage.setItem(KEY_GROUPS, JSON.stringify(groups)); } catch(e) {}
}

function loadActiveGame(gameId) {
  try {
    const r = localStorage.getItem(GAMES[gameId].key);
    if (r) { const d = JSON.parse(r); return d.activeGame || null; }
  } catch(e) {}
  return null;
}

function saveActiveGame(gameId, activeGame) {
  try { localStorage.setItem(GAMES[gameId].key, JSON.stringify({ activeGame })); } catch(e) {}
}

function loadData(gameId) {
  return { groups: loadGroups(), activeGame: loadActiveGame(gameId) };
}

// ── SHARED UI ────────────────────────────────────────────────────────
function Btn({ primary, ghost, full, sm, G, style, ...props }) {
  const base = { border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
    fontSize: sm?".75rem":".85rem", padding: sm?"6px 14px":"11px 18px", width: full?"100%":"auto",
    transition:"opacity .15s, transform .1s" };
  const v = primary
    ? { background: G?.btnBg||"#c9933a", color: G?.btnColor||"#12100e" }
    : { background: G?.surface2||"#272320", border:`1px solid ${G?.border||"#3a342c"}`, color: G?.sub||"#8a7d6a" };
  return <button style={{...base,...v,...style}} {...props}/>;
}

function LimitCtrl({ value, onChange, G, min, max, step, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      background:G.surface2, border:`1px solid ${G.border}`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
      <span style={{ fontSize:".8rem", color:G.sub }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div onClick={()=>onChange(Math.max(min,value-step))}
          style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, width:28, height:28,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }}>−</div>
        <span style={{ fontFamily:"'Cinzel',serif", fontSize:"1.1rem", color:G.accent, minWidth:"3.5ch", textAlign:"center" }}>{value}</span>
        <div onClick={()=>onChange(Math.min(max,value+step))}
          style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, width:28, height:28,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }}>＋</div>
      </div>
    </div>
  );
}

function PlayerEditRow({ name, index, onChange, onRemove, canRemove }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.04)",
      border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"8px 10px", marginBottom:6 }}>
      <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[index%COLORS.length], flexShrink:0 }}/>
      <input type="text" placeholder={`Joueur ${index+1}`} maxLength={16} value={name}
        onChange={e=>onChange(e.target.value)}
        style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"inherit", fontFamily:"inherit", fontSize:".9rem" }}/>
      {canRemove && <button onClick={onRemove} style={{ background:"none", border:"none", color:"rgba(255,255,255,.3)", fontSize:"1.1rem", cursor:"pointer", padding:2 }}>✕</button>}
    </div>
  );
}

// ── GAME ENGINE ──────────────────────────────────────────────────────
function GameApp({ gameId, onBack }) {
  const G = GAMES[gameId];
  const [data, setData] = useState(()=>loadData(gameId));
  const [screen, setScreen] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const [toast, setToast] = useState(false);
  const [editState, setEditState] = useState(null);
  const [quickState, setQuickState] = useState(null);
  const [pastGroupId, setPastGroupId] = useState(null);

  const persist = useCallback((next) => {
    saveGroups(next.groups);
    saveActiveGame(gameId, next.activeGame);
    setToast(true); setTimeout(()=>setToast(false), 1600);
  }, [gameId]);

  const update = useCallback((fn) => {
    setData(prev => { const next=fn(JSON.parse(JSON.stringify(prev))); persist(next); return next; });
  }, [persist]);

  const g = data.activeGame;
  const gameGroupName = g?.groupId ? (data.groups.find(x=>x.id===g.groupId)?.name||G.label) : "Partie rapide";

  const S = {
    root: { fontFamily:"'DM Sans',sans-serif", background:G.bg, color:G.text, width:"100%", minHeight:"100vh",
      display:"flex", flexDirection:"column", position:"relative",
      backgroundImage:`radial-gradient(ellipse at 50% 0%,${G.colorDim} 0%,transparent 55%)` },
    topBar: { display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"8px 14px 7px", borderBottom:`1px solid ${G.border}`, gap:10, flexShrink:0 },
    topTitle: { fontFamily:"'Cinzel',serif", fontSize:"1.05rem", fontWeight:900, color:G.accent, letterSpacing:".06em", flex:1 },
    backBtn: { background:G.surface2, border:`1px solid ${G.border}`, borderRadius:8, padding:"5px 12px",
      fontSize:".75rem", color:G.sub, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
    scroll: { flex:1, overflowY:"auto", padding:"10px 12px" },
    sLabel: { fontSize:".6rem", letterSpacing:".18em", textTransform:"uppercase", color:G.sub, marginBottom:8, marginTop:4 },
    footer: { flexShrink:0, padding:"8px 12px", borderTop:`1px solid ${G.border}`, display:"flex", gap:8 },
    iconBtn: { background:G.surface2, border:`1px solid ${G.border}`, borderRadius:8, width:34, height:34,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:".9rem", cursor:"pointer", flexShrink:0 },
  };

  function getGroupLimit(grp) {
    return grp.limits?.[gameId] ?? G.defaultLimit;
  }

  function startGroupGame(groupId) {
    if (data.activeGame?.groupId===groupId) {
      if (window.confirm("Une partie est en cours. La reprendre ?")) { setScreen("game"); return; }
    }
    const grp = data.groups.find(x=>x.id===groupId);
    const limit = getGroupLimit(grp);
    update(a => {
      a.activeGame = { groupId, players:[...grp.players], limit,
        tour:1, manche:1, totals:grp.players.map(()=>0),
        current:grp.players.map(()=>0),
        ...(gameId==="flip7" ? {flip7:grp.players.map(()=>false)} : {}),
        ...(gameId==="skyjo" ? {doubled:grp.players.map(()=>false)} : {}),
        history:[], startedAt:new Date().toISOString() };
      return a;
    });
    setScreen("game");
  }

  function openEditGroup(id) {
    const grp = id ? data.groups.find(x=>x.id===id) : null;
    setEditState({
      id,
      name: grp?.name||"",
      players: grp ? [...grp.players] : ["",""],
      limits: grp?.limits ? {...grp.limits} : {...DEFAULT_LIMITS},
    });
    setScreen("editGroup");
  }
  function saveGroup() {
    const {id,name,players,limits}=editState;
    const n=name.trim(); if(!n){alert("Donne un nom au groupe !");return;}
    const pl=players.map(p=>p.trim()).filter(p=>p.length>0); if(pl.length<2){alert("Il faut au moins 2 joueurs !");return;}
    update(a=>{
      if(id){
        const grp=a.groups.find(x=>x.id===id);
        grp.name=n; grp.players=pl; grp.limits=limits;
      } else {
        a.groups.push({id:genId(),name:n,players:pl,limits:{...limits},pastGames:[]});
      }
      return a;
    });
    setScreen("home");
  }
  function deleteGroup() {
    if(!window.confirm("Supprimer ce groupe ?"))return;
    update(a=>{a.groups=a.groups.filter(g=>g.id!==editState.id);return a;});
    setScreen("home");
  }

  function openQuickSetup(){setQuickState({players:["",""],limit:G.defaultLimit});setScreen("quickSetup");}
  function startQuickGame(){
    const players=quickState.players.map(p=>p.trim()).filter(p=>p.length>0);
    if(players.length<2){alert("Il faut au moins 2 joueurs !");return;}
    update(a=>{
      a.activeGame={groupId:null,players,limit:quickState.limit,
        tour:1,manche:1,totals:players.map(()=>0),current:players.map(()=>0),
        ...(gameId==="flip7"?{flip7:players.map(()=>false)}:{}),
        ...(gameId==="skyjo"?{doubled:players.map(()=>false)}:{}),
        history:[],startedAt:new Date().toISOString()};
      return a;
    });
    setScreen("game");
  }

  function adjustScore(i,d){
    update(a=>{
      const minVal = gameId==="skyjo" ? -99 : 0;
      a.activeGame.current[i]=Math.max(minVal,a.activeGame.current[i]+d);
      return a;
    });
  }
  function toggleFlip7(i){ update(a=>{a.activeGame.flip7[i]=!a.activeGame.flip7[i];return a;}); }
  function toggleDouble(i){ update(a=>{a.activeGame.doubled[i]=!a.activeGame.doubled[i];return a;}); }

  function getRankIcon(idx){
    if(!g) return "";
    const sorted=[...g.totals].sort((a,b)=>G.winMode==="lowest"?a-b:b-a);
    return["🥇","🥈","🥉","","",""][sorted.indexOf(g.totals[idx])]||"";
  }

  function validerRound(){
    update(a=>{
      const g=a.activeGame;
      let tourScores;
      if(gameId==="flip7"){
        tourScores=g.current.map((pts,i)=>pts+(g.flip7[i]?15:0));
        g.history.push({scores:[...tourScores],flip7:[...g.flip7]});
      } else if(gameId==="skyjo"){
        tourScores=g.current.map((pts,i)=>g.doubled[i]&&pts>0?pts*2:pts);
        g.history.push({scores:[...tourScores],doubled:[...g.doubled]});
      } else {
        tourScores=[...g.current];
        g.history.push([...g.current]);
      }
      tourScores.forEach((pts,i)=>{g.totals[i]+=pts;});

      const won = Math.max(...g.totals)>=g.limit;

      if(won){
        if(g.groupId){
          const grp=a.groups.find(x=>x.id===g.groupId);
          if(grp){
            if(!grp.pastGames)grp.pastGames=[];
            const winnerIdx = G.winMode==="lowest"
              ? g.totals.indexOf(Math.min(...g.totals))
              : g.totals.indexOf(Math.max(...g.totals));
            grp.pastGames.unshift({
              gameId,
              date:g.startedAt, rounds:g.tour||g.manche,
              winner:g.players[winnerIdx],
              scores:g.players.map((name,i)=>({name,score:g.totals[i]}))
            });
            if(grp.pastGames.length>20)grp.pastGames=grp.pastGames.slice(0,20);
          }
        }
        setShowWin(true);
      } else {
        g.tour=(g.tour||1)+1; g.manche=(g.manche||1)+1;
        g.current=g.players.map(()=>0);
        if(gameId==="flip7")g.flip7=g.players.map(()=>false);
        if(gameId==="skyjo")g.doubled=g.players.map(()=>false);
      }
      return a;
    });
  }

  function rejouer(){
    if(!g)return;
    const{groupId,players,limit}=g;
    setShowWin(false);
    update(a=>{
      a.activeGame={groupId,players:[...players],limit,tour:1,manche:1,
        totals:players.map(()=>0),current:players.map(()=>0),
        ...(gameId==="flip7"?{flip7:players.map(()=>false)}:{}),
        ...(gameId==="skyjo"?{doubled:players.map(()=>false)}:{}),
        history:[],startedAt:new Date().toISOString()};
      return a;
    });
    setScreen("game");
  }

  function goHome(){setShowWin(false);setSheet(null);setScreen("home");}

  const roundNum = g ? (g.tour||g.manche||1) : 1;
  const roundLabel = gameId==="flip7" ? "Tour" : "Manche";

  return (
    <div style={S.root}>
      {toast && <div style={{position:"fixed",top:8,left:"50%",transform:"translateX(-50%)",
        background:G.btnBg,color:G.btnColor,fontSize:".68rem",letterSpacing:".08em",
        padding:"5px 16px",borderRadius:20,zIndex:99,whiteSpace:"nowrap",pointerEvents:"none",opacity:.92}}>✓ Sauvegardé</div>}

      {/* ── HOME ── */}
      {screen==="home" && <>
        <div style={{textAlign:"center",padding:"16px 16px 10px",flexShrink:0}}>
          <div onClick={onBack} style={{display:"inline-block",background:G.surface2,border:`1px solid ${G.border}`,
            borderRadius:8,padding:"4px 12px",fontSize:".7rem",color:G.sub,cursor:"pointer",marginBottom:10}}>← Changer de jeu</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"2rem",fontWeight:900,color:G.accent,letterSpacing:".1em"}}>{G.emoji} {G.label.toUpperCase()}</div>
          <div style={{color:G.sub,fontSize:".62rem",letterSpacing:".2em",textTransform:"uppercase",marginTop:2}}>Score Keeper</div>
        </div>
        <div style={S.scroll}>
          <div style={S.sLabel}>Mes groupes</div>
          {data.groups.length===0 && <div style={{color:G.sub,fontSize:".8rem",textAlign:"center",padding:"14px 0"}}>Aucun groupe — crée-en un !</div>}
          {data.groups.map((grp,gi)=>(
            <div key={grp.id} onClick={()=>startGroupGame(grp.id)}
              style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"12px 14px",
              display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:8}}>
              <div style={{width:3,borderRadius:3,alignSelf:"stretch",flexShrink:0,background:COLORS[gi%COLORS.length]}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{grp.name}</div>
                <div style={{fontSize:".68rem",color:G.sub,marginTop:2}}>
                  {grp.players.length} joueurs · {G.limitLabel.toLowerCase()} {getGroupLimit(grp)} pts
                  {grp.pastGames?.length?` · ${grp.pastGames.length} partie${grp.pastGames.length>1?"s":""} jouée${grp.pastGames.length>1?"s":""}`:""}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {grp.pastGames?.length>0 && <div style={S.iconBtn} onClick={()=>{setPastGroupId(grp.id);setSheet("past");}}>🏆</div>}
                <div style={S.iconBtn} onClick={()=>openEditGroup(grp.id)}>✏️</div>
              </div>
            </div>
          ))}
          <Btn ghost full G={G} onClick={()=>openEditGroup(null)}>＋ Nouveau groupe</Btn>
          <div style={{...S.sLabel,marginTop:18}}>Partie rapide</div>
          <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"12px 14px",marginBottom:10,cursor:"pointer"}} onClick={openQuickSetup}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:"1.4rem"}}>⚡</span>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700}}>Partie rapide</div>
                <div style={{fontSize:".68rem",color:G.sub,marginTop:2}}>Noms à la volée, sans sauvegarder</div>
              </div>
            </div>
          </div>
        </div>
      </>}

      {/* ── EDIT GROUP ── */}
      {screen==="editGroup" && editState && <>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={()=>setScreen("home")}>← Retour</button>
          <div style={S.topTitle}>{editState.id?"Modifier":"Nouveau groupe"}</div>
          <div style={{width:60}}/>
        </div>
        <div style={S.scroll}>
          <div style={S.sLabel}>Nom du groupe</div>
          <input placeholder="Ex: Weekend, Boulot…" maxLength={24} value={editState.name}
            onChange={e=>setEditState(s=>({...s,name:e.target.value}))}
            style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:10,padding:"10px 14px",
            width:"100%",color:G.text,fontFamily:"'Cinzel',serif",fontSize:"1rem",outline:"none",marginBottom:14}}/>

          <div style={S.sLabel}>Limites par jeu</div>
          {Object.entries(GAMES).map(([gid, Gx])=>(
            <div key={gid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              background:G.surface2,border:`1px solid ${G.border}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
              <span style={{fontSize:".85rem",color:G.text}}>{Gx.emoji} {Gx.label} <span style={{fontSize:".7rem",color:G.sub}}>— {Gx.limitLabel}</span></span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div onClick={()=>setEditState(s=>({...s,limits:{...s.limits,[gid]:Math.max(Gx.limitMin,(s.limits[gid]??Gx.defaultLimit)-Gx.limitStep)}}))}
                  style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,width:28,height:28,
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>−</div>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",color:Gx.accent,minWidth:"3.5ch",textAlign:"center"}}>
                  {editState.limits[gid]??Gx.defaultLimit}
                </span>
                <div onClick={()=>setEditState(s=>({...s,limits:{...s.limits,[gid]:Math.min(Gx.limitMax,(s.limits[gid]??Gx.defaultLimit)+Gx.limitStep)}}))}
                  style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,width:28,height:28,
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>＋</div>
              </div>
            </div>
          ))}

          <div style={{...S.sLabel,marginTop:10}}>Joueurs <span style={{color:G.sub}}>(2 à 6)</span></div>
          {editState.players.map((name,i)=>(
            <PlayerEditRow key={i} name={name} index={i}
              onChange={v=>setEditState(s=>{const p=[...s.players];p[i]=v;return{...s,players:p};})}
              onRemove={()=>setEditState(s=>({...s,players:s.players.filter((_,j)=>j!==i)}))}
              canRemove={editState.players.length>2}/>
          ))}
          {editState.players.length<6 && <Btn ghost full G={G} onClick={()=>setEditState(s=>({...s,players:[...s.players,""]}))}>＋ Ajouter un joueur</Btn>}
        </div>
        <div style={S.footer}>
          {editState.id && <Btn ghost G={G} onClick={deleteGroup}>🗑</Btn>}
          <Btn primary G={G} style={{flex:1}} onClick={saveGroup}>Enregistrer</Btn>
        </div>
      </>}

      {/* ── QUICK SETUP ── */}
      {screen==="quickSetup" && quickState && <>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={()=>setScreen("home")}>← Retour</button>
          <div style={S.topTitle}>Partie rapide</div>
          <div style={{width:60}}/>
        </div>
        <div style={S.scroll}>
          <div style={S.sLabel}>{G.limitLabel}</div>
          <LimitCtrl G={G} value={quickState.limit} label={G.limitLabel}
            onChange={v=>setQuickState(s=>({...s,limit:v}))}
            min={G.limitMin} max={G.limitMax} step={G.limitStep}/>
          <div style={S.sLabel}>Joueurs <span style={{color:G.sub}}>(2 à 6)</span></div>
          {quickState.players.map((name,i)=>(
            <PlayerEditRow key={i} name={name} index={i}
              onChange={v=>setQuickState(s=>{const p=[...s.players];p[i]=v;return{...s,players:p};})}
              onRemove={()=>setQuickState(s=>({...s,players:s.players.filter((_,j)=>j!==i)}))}
              canRemove={quickState.players.length>2}/>
          ))}
          {quickState.players.length<6 && <Btn ghost full G={G} onClick={()=>setQuickState(s=>({...s,players:[...s.players,""]}))}>＋ Ajouter un joueur</Btn>}
        </div>
        <div style={S.footer}>
          <Btn primary full G={G} onClick={startQuickGame}>{G.emoji} Commencer</Btn>
        </div>
      </>}

      {/* ── GAME ── */}
      {screen==="game" && g && <>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={()=>{if(window.confirm("Quitter la partie ?"))goHome();}}>← Quitter</button>
          <div style={S.topTitle}>{G.emoji} {gameGroupName}</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"4px 10px",
              textAlign:"center",fontSize:".58rem",letterSpacing:".12em",textTransform:"uppercase",color:G.sub}}>
              {roundLabel}<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{roundNum}</strong>
            </div>
            <div style={S.iconBtn} onClick={()=>setSheet("history")}>📜</div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:5,flex:1,padding:"6px 10px",minHeight:0,overflowY:"auto"}}>
          {g.players.map((name,i)=>{
            const total=g.totals[i], cur=g.current[i];
            const f7 = gameId==="flip7" ? g.flip7[i] : false;
            const doubled = gameId==="skyjo" ? g.doubled[i] : false;
            const tourTotal = cur + (f7?15:0);
            const pct = Math.min(100,Math.round((Math.max(0,total)/g.limit)*100));
            const danger = gameId==="odin" ? total>=g.limit-3 : gameId==="skyjo" ? total>=g.limit*0.75 : total>=g.limit*0.8;
            const isOut = gameId==="odin" && total>=g.limit;

            return (
              <div key={i} style={{background:G.surface,border:`1px solid ${danger?G.color:G.border}`,
                borderRadius:14,padding:"8px 10px 8px 12px",position:"relative",flexShrink:0,
                opacity:isOut?.5:1}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                  borderRadius:"14px 0 0 14px",background:COLORS[i%COLORS.length]}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:".9rem",fontWeight:700}}>{name}</span>
                    <span style={{fontSize:".8rem"}}>{roundNum>1?getRankIcon(i):""}</span>
                  </div>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.5rem",fontWeight:900,
                    color:danger?G.accent:G.text,lineHeight:1}}>{total}</span>
                </div>
                <div style={{width:"100%",height:4,background:G.surface2,borderRadius:2,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",borderRadius:2,width:`${pct}%`,transition:"width .35s",
                    background:danger?G.color:`${G.color}66`}}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div onClick={()=>adjustScore(i,-1)} style={{width:32,height:32,borderRadius:8,
                        border:"1px solid rgba(196,74,58,.3)",background:"rgba(196,74,58,.15)",color:"#ff8070",
                        fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center",
                        cursor:"pointer",userSelect:"none",flexShrink:0}}>−</div>
                      <div style={{flex:1,textAlign:"center"}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.4rem",fontWeight:700,lineHeight:1}}>{cur}</div>
                        <div style={{fontSize:".5rem",color:G.sub,letterSpacing:".08em",textTransform:"uppercase"}}>
                          {gameId==="flip7"?"ce tour":"cette manche"}</div>
                      </div>
                      <div onClick={()=>adjustScore(i,+1)} style={{width:32,height:32,borderRadius:8,
                        border:"1px solid rgba(74,154,106,.3)",background:"rgba(74,154,106,.15)",color:"#6dcc90",
                        fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center",
                        cursor:"pointer",userSelect:"none",flexShrink:0}}>＋</div>
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {[[-10,"#ff8070","rgba(196,74,58,.12)","rgba(196,74,58,.3)"],
                        [-5,"#ff8070","rgba(196,74,58,.12)","rgba(196,74,58,.3)"],
                        [5,"#6dcc90","rgba(74,154,106,.12)","rgba(74,154,106,.3)"],
                        [10,"#6dcc90","rgba(74,154,106,.12)","rgba(74,154,106,.3)"]].map(([val,color,bg,border])=>(
                        <div key={val} onClick={()=>adjustScore(i,val)}
                          style={{flex:1,height:24,borderRadius:6,border:`1px solid ${border}`,background:bg,
                          color,fontSize:".65rem",fontWeight:700,display:"flex",alignItems:"center",
                          justifyContent:"center",cursor:"pointer",userSelect:"none"}}>
                          {val>0?`+${val}`:val}
                        </div>
                      ))}
                    </div>
                  </div>
                  {gameId==="flip7" && (
                    <div onClick={()=>toggleFlip7(i)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                      background:f7?"rgba(246,201,14,.15)":G.surface2,
                      border:`1px solid ${f7?"rgba(246,201,14,.5)":G.border}`,
                      borderRadius:10,padding:"5px 10px",cursor:"pointer",flexShrink:0,minWidth:62}}>
                      <span style={{fontSize:"1rem"}}>🃏</span>
                      <span style={{fontSize:".5rem",letterSpacing:".06em",textTransform:"uppercase",
                        color:f7?"#f6c90e":G.sub,fontWeight:f7?700:400}}>Flip7{f7?" +15":""}</span>
                    </div>
                  )}
                  {gameId==="skyjo" && (
                    <div onClick={()=>toggleDouble(i)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                      background:doubled?"rgba(239,68,68,.18)":G.surface2,
                      border:`1px solid ${doubled?"rgba(239,68,68,.6)":G.border}`,
                      borderRadius:10,padding:"5px 8px",cursor:"pointer",flexShrink:0,minWidth:58}}>
                      <span style={{fontSize:"1rem"}}>✕2</span>
                      <span style={{fontSize:".5rem",letterSpacing:".06em",textTransform:"uppercase",
                        color:doubled?"#f87171":G.sub,fontWeight:doubled?700:400}}>
                        {doubled?"Doublé":"Double"}
                      </span>
                    </div>
                  )}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minWidth:44}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,lineHeight:1,
                      color:doubled?"#f87171":f7?"#f6c90e":G.accent}}>
                      {gameId==="skyjo"
                        ? (doubled&&cur>0?`×2 = ${cur*2}`:cur!==0?`${cur>0?"+":""}${cur}`:"-")
                        : tourTotal>0?`+${tourTotal}`:"-"}
                    </div>
                    <div style={{fontSize:".5rem",color:G.sub,letterSpacing:".06em",textTransform:"uppercase"}}>total</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={S.footer}>
          <Btn ghost sm G={G} onClick={()=>setSheet("history")}>Historique</Btn>
          <Btn primary G={G} style={{flex:1}} onClick={validerRound}>{G.emoji} Valider {roundLabel.toLowerCase()}</Btn>
        </div>
      </>}

      {/* ── SHEET: HISTORY ── */}
      {sheet==="history" && g && (
        <div onClick={e=>{if(e.target===e.currentTarget)setSheet(null);}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",
          flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:10}}>
          <div style={{background:G.surface,borderRadius:"20px 20px 0 0",border:`1px solid ${G.border}`,
            width:"100%",maxHeight:"78%",display:"flex",flexDirection:"column"}}>
            <div style={{width:36,height:4,background:G.border,borderRadius:2,margin:"10px auto 8px",flexShrink:0}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0 16px 10px",flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:G.accent}}>📜 Historique</span>
              <div style={S.iconBtn} onClick={()=>setSheet(null)}>✕</div>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:"10px 14px"}}>
              {g.history.length===0
                ? <div style={{color:G.sub,textAlign:"center",padding:20}}>Aucun tour encore</div>
                : <table style={{width:"100%",borderCollapse:"collapse",fontSize:".75rem"}}>
                    <thead><tr>
                      <th style={{color:G.sub,fontWeight:400,padding:"4px 5px",borderBottom:`1px solid ${G.border}`,fontSize:".6rem"}}>{roundLabel}</th>
                      {g.players.map((n,i)=><th key={i} style={{color:G.sub,fontWeight:400,padding:"4px 5px",borderBottom:`1px solid ${G.border}`,fontSize:".6rem"}}>{n.length>5?n.slice(0,4)+".":n}</th>)}
                    </tr></thead>
                    <tbody>
                      {g.history.map((h,hi)=>{
                        const scores = Array.isArray(h) ? h : h.scores;
                        const isF7 = h.flip7||[];
                        return <tr key={hi}>
                          <td style={{padding:"5px",textAlign:"center",borderBottom:`1px solid ${G.surface2}`,color:G.sub,fontSize:".62rem"}}>{hi+1}</td>
                          {scores.map((s,i)=>{
                            const isDoubled=h.doubled&&h.doubled[i];
                            return <td key={i} style={{padding:"5px",textAlign:"center",borderBottom:`1px solid ${G.surface2}`,
                              color:isF7[i]?"#f6c90e":isDoubled?"#f87171":G.text}}>
                              {s}{isF7[i]?" 🃏":""}{isDoubled?" ×2":""}
                            </td>;
                          })}
                        </tr>;
                      })}
                      <tr>
                        <td style={{padding:"5px",textAlign:"center",color:G.accent,fontWeight:700,borderTop:`1px solid ${G.border}`,fontSize:".62rem"}}>Tot.</td>
                        {g.totals.map((s,i)=><td key={i} style={{padding:"5px",textAlign:"center",color:G.accent,fontWeight:700,borderTop:`1px solid ${G.border}`}}>{s}</td>)}
                      </tr>
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── SHEET: PAST GAMES ── */}
      {sheet==="past" && pastGroupId && (()=>{
        const grp=data.groups.find(x=>x.id===pastGroupId);
        return (
          <div onClick={e=>{if(e.target===e.currentTarget)setSheet(null);}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",
            flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:10}}>
            <div style={{background:G.surface,borderRadius:"20px 20px 0 0",border:`1px solid ${G.border}`,
              width:"100%",maxHeight:"78%",display:"flex",flexDirection:"column"}}>
              <div style={{width:36,height:4,background:G.border,borderRadius:2,margin:"10px auto 8px",flexShrink:0}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"0 16px 10px",flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:G.accent}}>🏆 Parties passées</span>
                <div style={S.iconBtn} onClick={()=>setSheet(null)}>✕</div>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"10px 14px"}}>
                {!grp?.pastGames?.length
                  ? <div style={{color:G.sub,textAlign:"center",padding:20}}>Aucune partie enregistrée</div>
                  : grp.pastGames.map((pg,pi)=>{
                      const pgGame = GAMES[pg.gameId] || G;
                      const ds=new Date(pg.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
                      const sorted=[...pg.scores].sort((a,b)=>pgGame.winMode==="lowest"?a.score-b.score:b.score-a.score);
                      const sc=sorted.map((s,i)=>`${MEDALS[i]} ${s.name} ${s.score}pts`).join(" · ");
                      return (
                        <div key={pi} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
                          padding:"8px 0",borderBottom:`1px solid ${G.surface2}`,gap:8}}>
                          <div>
                            <div style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",color:pgGame.accent}}>
                              {pgGame.emoji} {pg.winner}
                            </div>
                            <div style={{fontSize:".63rem",color:G.sub,marginTop:2,lineHeight:1.5}}>{sc}</div>
                          </div>
                          <div style={{flexShrink:0,textAlign:"right"}}>
                            <div style={{fontSize:".65rem",color:G.sub}}>{ds}</div>
                            <div style={{fontSize:".63rem",color:G.sub}}>{pg.rounds} tour{pg.rounds>1?"s":""}</div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── WIN SCREEN ── */}
      {showWin && g && (()=>{
        const ranked=[...g.players.map((name,i)=>({name,score:g.totals[i]}))];
        ranked.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score);
        return (
          <div style={{position:"fixed",inset:0,background:G.bg,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",textAlign:"center",padding:"20px 30px",zIndex:50,overflowY:"auto"}}>
            <div style={{fontSize:"3rem",marginBottom:8}}>🏆</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",color:G.accent,fontWeight:900,marginBottom:4}}>{ranked[0].name} gagne !</div>
            <div style={{color:G.sub,fontSize:".82rem",marginBottom:18}}>Partie terminée en {roundNum} {roundLabel.toLowerCase()}{roundNum>1?"s":""}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,width:"100%",maxWidth:300,marginBottom:28}}>
              {ranked.map((r,idx)=>(
                <div key={idx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:G.surface,borderRadius:10,padding:"10px 16px",
                  border:`1px solid ${idx===0?G.color:G.border}`}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:".9rem"}}>{MEDALS[idx]} {r.name}</span>
                  <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:G.accent}}>{r.score} pts</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:12}}>
              <Btn ghost G={G} style={{padding:"12px 22px",fontSize:".9rem"}} onClick={()=>{update(a=>{a.activeGame=null;return a;});goHome();}}>🏠 Accueil</Btn>
              <Btn primary G={G} style={{padding:"12px 22px",fontSize:".9rem"}} onClick={rejouer}>🔄 Rejouer</Btn>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── SELECTOR SCREEN ───────────────────────────────────────────────────
function GameSelector({ onSelect }) {
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#0a0a0f",color:"#e8e8f0",
      width:"100%",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:30,
      backgroundImage:"radial-gradient(ellipse at 50% 30%,rgba(120,80,200,.15) 0%,transparent 60%)"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap'); *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`}</style>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,color:"rgba(255,255,255,.25)",
        letterSpacing:".3em",textTransform:"uppercase",marginBottom:8}}>Score Keeper</div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"2rem",fontWeight:900,color:"#fff",
        letterSpacing:".1em",marginBottom:6}}>Quel jeu ?</div>
      <div style={{color:"rgba(255,255,255,.35)",fontSize:".75rem",marginBottom:40}}>Choisis ton jeu pour commencer</div>
      <div style={{display:"flex",flexDirection:"column",gap:14,width:"100%",maxWidth:320}}>
        {Object.entries(GAMES).map(([id,G])=>(
          <div key={id} onClick={()=>onSelect(id)}
            style={{background:`linear-gradient(135deg,${G.surface} 0%,${G.bg} 100%)`,
            border:`1px solid ${G.color}44`,borderRadius:20,padding:"20px 24px",cursor:"pointer",
            display:"flex",alignItems:"center",gap:16,
            boxShadow:`0 4px 24px ${G.colorDim}`,transition:"transform .15s,box-shadow .15s"}}>
            <div style={{fontSize:"2.8rem",flexShrink:0,lineHeight:1}}>{G.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.3rem",fontWeight:900,
                color:G.accent,letterSpacing:".06em"}}>{G.label.toUpperCase()}</div>
              {G.desc.split("\n").map((line,i)=>(
                <div key={i} style={{fontSize:".7rem",color:"rgba(255,255,255,.4)",marginTop:i===0?4:1,letterSpacing:".04em"}}>{line}</div>
              ))}
            </div>
            <div style={{color:G.accent,fontSize:"1.2rem",flexShrink:0,opacity:.6}}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────
export default function Root() {
  const [gameId, setGameId] = useState(null);
  return gameId
    ? <GameApp gameId={gameId} onBack={()=>setGameId(null)}/>
    : <GameSelector onSelect={setGameId}/>;
}
