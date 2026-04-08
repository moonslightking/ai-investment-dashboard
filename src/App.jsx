import { useState, useEffect, useCallback, useRef } from "react";

// ===== FINNHUB API KEY =====
const FINNHUB_KEY = "d7as2l9r01qtpbh9kjj0d7as2l9r01qtpbh9kjjg";

// ===== 行情拉取 =====
// 美股：Finnhub /quote
// A股/港股/台股/韩股：新浪财经接口（JSONP via script tag）

function finnhubQuote(symbol){
  return fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
    .then(r=>r.json())
    .then(j=>{
      if(!j||j.c==null||j.c===0) return null;
      const chg = j.pc>0 ? +((j.c-j.pc)/j.pc*100).toFixed(2) : 0;
      return {p:+j.c.toFixed(2), c:chg};
    })
    .catch(()=>null);
}

// 新浪财经：支持 A股(sz/sh前缀)、港股(hk前缀)、美股(gb_前缀)、台股(tw前缀)
// 代码映射规则：
//   A股: 6开头→sh，其他→sz
//   港股: 5位数字→hk{code}
//   台股: 4位数字→tw{code}
//   韩股: 6位数字→kr{code}（新浪不支持，跳过）
function sinaCode(ticker, market){
  if(market==="A"){
    return ticker.startsWith("6") ? `sh${ticker}` : `sz${ticker}`;
  }
  if(market==="HK") return `hk${ticker.replace(/^0+/,'')}`;  // 去前导0
  if(market==="TW") return `tw${ticker}`;
  return null;
}

function sinaQuote(ticker, market){
  const code = sinaCode(ticker, market);
  if(!code) return Promise.resolve(null);
  return new Promise((resolve)=>{
    const cbName = `_sina_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timer = setTimeout(()=>{
      delete window[cbName];
      document.body.removeChild(script);
      resolve(null);
    }, 8000);
    // 新浪直接返回 var hq_str_xxx="..." 格式，用 fetch 解析更可靠
    fetch(`https://hq.sinajs.cn/list=${code}`, {
      headers:{ Referer:"https://finance.sina.com.cn" }
    })
    .then(r=>r.text())
    .then(txt=>{
      clearTimeout(timer);
      delete window[cbName];
      document.body.removeChild(script);
      // 解析: var hq_str_sh600000="浦发银行,10.10,10.08,10.05,..."
      const m = txt.match(/"([^"]+)"/);
      if(!m||!m[1]) return resolve(null);
      const parts = m[1].split(",");
      if(market==="HK"){
        // 港股格式：名称,昨收,今开,最高,最低,现价,...
        const price = parseFloat(parts[6]);
        const prevClose = parseFloat(parts[3]);
        if(!price||!prevClose) return resolve(null);
        const chg = +((price-prevClose)/prevClose*100).toFixed(2);
        resolve({p:price, c:chg});
      } else if(market==="A"){
        // A股: 名称,今开,昨收,现价,...
        const price = parseFloat(parts[3]);
        const prevClose = parseFloat(parts[2]);
        if(!price||!prevClose) return resolve(null);
        const chg = +((price-prevClose)/prevClose*100).toFixed(2);
        resolve({p:price, c:chg});
      } else if(market==="TW"){
        const price = parseFloat(parts[6]);
        const prevClose = parseFloat(parts[3]);
        if(!price||!prevClose) return resolve(null);
        const chg = +((price-prevClose)/prevClose*100).toFixed(2);
        resolve({p:price, c:chg});
      } else {
        resolve(null);
      }
    })
    .catch(()=>{
      clearTimeout(timer);
      try{ document.body.removeChild(script); }catch(e){}
      resolve(null);
    });
    document.body.appendChild(script);
  });
}

// 对所有股票并发拉取，返回 {ticker_market: {p, c}} 映射
async function fetchAllQuotes(stocks){
  const tasks = [];
  for(const [lid, list] of Object.entries(stocks)){
    for(const s of list){
      const key = `${s.t}_${s.m}`;
      if(s.m==="US"||s.m==="KR"){
        // 韩股 Finnhub 用 KRX:代码格式，美股直接用ticker
        const sym = s.m==="KR" ? `KRX:${s.t}` : s.t;
        tasks.push(finnhubQuote(sym).then(q=>({key, q})));
      } else {
        tasks.push(sinaQuote(s.t, s.m).then(q=>({key, q})));
      }
    }
  }
  const results = await Promise.allSettled(tasks);
  const map = {};
  for(const r of results){
    if(r.status==="fulfilled"&&r.value&&r.value.q){
      map[r.value.key] = r.value.q;
    }
  }
  return map;
}

const LI = ["L0","L1","L2","L3","L4","L5","L6","L7","L8"];
const LN = {L0:"能源层",L1:"芯片层",L2:"基础设施层",L3:"模型与平台层",L4:"工具与中间件层",L5:"内容供给层",L6:"分发与变现层",L7:"具身智能层",L8:"终端应用层"};
const TC = {cold:{l:"冷",c:"#4A6FA5"},warm:{l:"温",c:"#D4A03C"},hot:{l:"热",c:"#C9503C"}};
const MC = {US:"#5A8ABF",HK:"#C9503C",A:"#D4A03C",TW:"#6A9A6A",KR:"#8A7ABF"};
const ML = {US:"美",HK:"港",A:"A",TW:"台",KR:"韩"};

function initStocks(){return{
  L0:[{t:"GEV",n:"GE Vernova",m:"US",p:398.5,c:2.1},{t:"CAT",n:"Caterpillar",m:"US",p:372.8,c:0.8},{t:"ETN",n:"Eaton",m:"US",p:312.4,c:1.5},{t:"VRT",n:"Vertiv",m:"US",p:128.6,c:3.2},{t:"300274",n:"阳光电源",m:"A",p:78.3,c:-1.2},{t:"300750",n:"宁德时代",m:"A",p:215.6,c:0.6},{t:"002916",n:"盛弘股份",m:"A",p:48.7,c:4.8},{t:"300443",n:"金盘科技",m:"A",p:42.1,c:2.3}],
  L1:[{t:"NVDA",n:"NVIDIA",m:"US",p:142.8,c:1.8},{t:"AMD",n:"AMD",m:"US",p:128.5,c:-0.5},{t:"AVGO",n:"Broadcom",m:"US",p:198.2,c:1.2},{t:"MU",n:"Micron",m:"US",p:118.9,c:5.6},{t:"2330",n:"台积电",m:"TW",p:1085,c:0.9},{t:"000660",n:"SK海力士",m:"KR",p:218500,c:3.4},{t:"688256",n:"寒武纪",m:"A",p:382.1,c:-2.1},{t:"300502",n:"中际旭创",m:"A",p:128.5,c:1.7},{t:"300502B",n:"新易盛",m:"A",p:88.6,c:2.9}],
  L2:[{t:"EQIX",n:"Equinix",m:"US",p:892.3,c:0.4},{t:"DLR",n:"Digital Realty",m:"US",p:178.5,c:1.1},{t:"DELL",n:"Dell",m:"US",p:118.9,c:2.7},{t:"SMCI",n:"Supermicro",m:"US",p:42.3,c:-3.2},{t:"ANET",n:"Arista",m:"US",p:98.7,c:1.4},{t:"PWR",n:"Quanta Svc",m:"US",p:298.4,c:0.6},{t:"2317",n:"鸿海",m:"TW",p:198.5,c:1.8},{t:"000977",n:"浪潮信息",m:"A",p:38.2,c:3.1}],
  L3:[{t:"MSFT",n:"Microsoft",m:"US",p:428.5,c:0.3},{t:"GOOGL",n:"Alphabet",m:"US",p:178.2,c:-0.8},{t:"AMZN",n:"Amazon",m:"US",p:208.3,c:1.2},{t:"META",n:"Meta",m:"US",p:612.4,c:0.9},{t:"02390",n:"智谱",m:"HK",p:68.5,c:5.2},{t:"09698",n:"MiniMax",m:"HK",p:42.3,c:3.8},{t:"BABA",n:"阿里巴巴",m:"US",p:138.6,c:2.1}],
  L4:[{t:"U",n:"Unity",m:"US",p:28.4,c:-1.8},{t:"NOW",n:"ServiceNow",m:"US",p:1028.5,c:0.7},{t:"PLTR",n:"Palantir",m:"US",p:98.7,c:3.1},{t:"02400",n:"心动公司",m:"HK",p:52.8,c:1.6}],
  L5:[{t:"RBLX",n:"Roblox",m:"US",p:72.3,c:2.4},{t:"TTWO",n:"Take-Two",m:"US",p:218.5,c:0.5},{t:"00700",n:"腾讯",m:"HK",p:498.2,c:0.8},{t:"09999",n:"网易",m:"HK",p:178.3,c:-0.3},{t:"01772",n:"中文在线",m:"HK",p:5.28,c:8.2},{t:"00772",n:"阅文集团",m:"HK",p:28.5,c:2.1},{t:"01024",n:"快手",m:"HK",p:58.9,c:1.4},{t:"002555",n:"三七互娱",m:"A",p:22.8,c:0.9}],
  L6:[{t:"APP",n:"AppLovin",m:"US",p:368.5,c:1.9},{t:"TTD",n:"Trade Desk",m:"US",p:78.2,c:-2.1},{t:"MGNI",n:"Magnite",m:"US",p:18.3,c:3.5},{t:"01860",n:"汇量科技",m:"HK",p:22.8,c:2.6},{t:"301071",n:"易点天下",m:"A",p:18.9,c:1.2}],
  L7:[{t:"TSLA",n:"Tesla",m:"US",p:278.5,c:2.8},{t:"QCOM",n:"Qualcomm",m:"US",p:172.4,c:0.6},{t:"002050",n:"三花智控",m:"A",p:28.9,c:5.1},{t:"688017",n:"绿的谐波",m:"A",p:68.3,c:4.2},{t:"300124",n:"汇川技术",m:"A",p:62.5,c:2.7},{t:"002747",n:"埃斯顿",m:"A",p:18.6,c:3.8}],
  L8:[{t:"GOOGL",n:"Alphabet",m:"US",p:178.2,c:-0.8},{t:"MSFT",n:"Microsoft",m:"US",p:428.5,c:0.3},{t:"VEEV",n:"Veeva",m:"US",p:242.3,c:1.1},{t:"DOCS",n:"Doximity",m:"US",p:58.7,c:2.4}],
};}

function initSources(){return[
  {id:"s1",n:"Dell'Oro Group",u:"https://www.delloro.com/news",lg:"en",cat:"must",ly:["L2"],fq:"月"},
  {id:"s2",n:"Fabricated Knowledge",u:"https://fabricatedknowledge.com",lg:"en",cat:"must",ly:["L1"],fq:"周"},
  {id:"s3",n:"SemiAnalysis",u:"https://semianalysis.com",lg:"en",cat:"must",ly:["L1","L2"],fq:"周"},
  {id:"s4",n:"Tech Investments",u:"https://techinvestments.io",lg:"en",cat:"must",ly:["L1","L2"],fq:"周"},
  {id:"s5",n:"Data Center Frontier",u:"https://datacenterfrontier.com",lg:"en",cat:"opt",ly:["L0","L2"],fq:"周"},
  {id:"s6",n:"Data Center Knowledge",u:"https://datacenterknowledge.com",lg:"en",cat:"opt",ly:["L0","L2"],fq:"周"},
  {id:"s7",n:"CNESA 储能联盟",u:"https://cnesa.org",lg:"zh",cat:"opt",ly:["L0"],fq:"月"},
  {id:"s8",n:"The Information",u:"https://theinformation.com",lg:"en",cat:"must",ly:["L3","L4"],fq:"日"},
  {id:"s9",n:"Menlo Ventures Report",u:"https://menlovc.com/perspective",lg:"en",cat:"must",ly:["L3"],fq:"年"},
  {id:"s10",n:"Foundation Capital",u:"https://foundationcapital.com/ideas",lg:"en",cat:"opt",ly:["L3","L4"],fq:"月"},
  {id:"s11",n:"Stratechery",u:"https://stratechery.com",lg:"en",cat:"opt",ly:["L3","L4"],fq:"周"},
  {id:"s12",n:"机器之心",u:"https://jiqizhixin.com",lg:"zh",cat:"must",ly:["L3","L4"],fq:"日"},
  {id:"s13",n:"赛博禅心",u:"wechat",lg:"zh",cat:"opt",ly:["L3"],fq:"周"},
  {id:"s14",n:"Naavik",u:"https://naavik.co",lg:"en",cat:"must",ly:["L5"],fq:"周"},
  {id:"s15",n:"Mobile Dev Memo",u:"https://mobiledevmemo.com",lg:"en",cat:"must",ly:["L6"],fq:"周"},
  {id:"s16",n:"AppsFlyer Blog",u:"https://appsflyer.com/blog",lg:"en",cat:"must",ly:["L6"],fq:"半年"},
  {id:"s17",n:"DataEye",u:"https://dataeye.com",lg:"zh",cat:"must",ly:["L5"],fq:"周"},
  {id:"s18",n:"Sensor Tower",u:"https://sensortower.com/blog",lg:"en",cat:"opt",ly:["L5","L6"],fq:"周"},
  {id:"s19",n:"AdExchanger",u:"https://adexchanger.com",lg:"en",cat:"opt",ly:["L6"],fq:"日"},
  {id:"s20",n:"白鲸出海",u:"https://baijingapp.com",lg:"zh",cat:"opt",ly:["L5","L6"],fq:"日"},
  {id:"s21",n:"I/O Fund",u:"https://io-fund.com",lg:"en",cat:"must",ly:["L0","L1","L2"],fq:"周"},
  {id:"s22",n:"NVIDIA Blog",u:"https://blogs.nvidia.com",lg:"en",cat:"must",ly:["L1","L7"],fq:"周"},
  {id:"s23",n:"Futurum Group",u:"https://futurumgroup.com/insights",lg:"en",cat:"opt",ly:["L1","L2"],fq:"周"},
  {id:"s24",n:"Lex Fridman",u:"https://youtube.com/@lexfridman",lg:"en",cat:"opt",ly:["L3","L8"],fq:"周"},
  {id:"s25",n:"Peter Diamandis",u:"https://youtube.com/@peterdiamandis",lg:"en",cat:"opt",ly:["L7","L8"],fq:"周"},
];}

function initItems(){return[
  {id:"m1",src:"Dell'Oro",tl:"Q1 Data Center Capex $280B, +52% YoY",dt:"03-24",ai:{ly:["L2"],sub:"服务器",imp:"high",sm:"数据中心CapEx超预期，推理需求成新驱动力"},st:"pending",cL:null},
  {id:"m2",src:"Fab Knowledge",tl:"HBM4 yield 85% at 16-hi stack",dt:"03-23",ai:{ly:["L1"],sub:"存储芯片",imp:"high",sm:"SK海力士HBM4良率突破85%"},st:"pending",cL:null},
  {id:"m3",src:"Naavik",tl:"Roblox Q1 bookings +48%, payouts $500M",dt:"03-22",ai:{ly:["L5"],sub:"游戏",imp:"high",sm:"Roblox高增长，UGC飞轮持续验证"},st:"pending",cL:null},
  {id:"m4",src:"MobileDevMemo",tl:"AppLovin Axon global launch",dt:"03-21",ai:{ly:["L6"],sub:"广告",imp:"high",sm:"AppLovin自助平台上线，向电商扩张"},st:"pending",cL:null},
  {id:"m5",src:"机器之心",tl:"Claude Opus 4.6: SWE 80.8%",dt:"03-20",ai:{ly:["L3"],sub:"大模型",imp:"med",sm:"Anthropic旗舰编程持续领先"},st:"unread",cL:null},
  {id:"m6",src:"Tech Invest",tl:"TSMC 2nm booked to 2027",dt:"03-19",ai:{ly:["L1"],sub:"代工",imp:"high",sm:"台积电2nm排满2027"},st:"pending",cL:null},
  {id:"m7",src:"DataEye",tl:"AI短剧日增800部,Top50占比42%",dt:"03-18",ai:{ly:["L5"],sub:"短剧",imp:"high",sm:"AI短剧爆发，买量需求暴增"},st:"pending",cL:null},
  {id:"m8",src:"I/O Fund",tl:"Big Tech CapEx run-rate >$700B",dt:"03-17",ai:{ly:["L0","L2"],sub:"CapEx",imp:"high",sm:"五大云厂商年化超7000亿"},st:"unread",cL:null},
  {id:"m9",src:"NVIDIA",tl:"GR00T N2 humanoid model",dt:"03-12",ai:{ly:["L7"],sub:"机器人",imp:"med",sm:"NVIDIA人形机器人基础模型"},st:"unread",cL:null},
  {id:"m10",src:"白鲸出海",tl:"汇量Q1 Mintegral +40%",dt:"03-10",ai:{ly:["L6"],sub:"广告",imp:"high",sm:"汇量高增长，非游扩大"},st:"pending",cL:null},
];}

const mkSS=ns=>ns.map(x=>({n:x,s:"cold"}));
function initLayers(){return[
  {id:"L0",t:"cold",sig:[],ss:mkSS(["燃气轮机","数据中心光伏","输配电","储能","电源架构","电能质量"])},
  {id:"L1",t:"cold",sig:[],ss:mkSS(["GPU/ASIC","HBM/DRAM","先进封装","晶圆代工","光模块"])},
  {id:"L2",t:"cold",sig:[],ss:mkSS(["IDC运营商","AI服务器","网络设备","散热/液冷","工程建设"])},
  {id:"L3",t:"cold",sig:[],ss:mkSS(["基础大模型","Agent平台","云AI/MaaS","开源模型"])},
  {id:"L4",t:"cold",sig:[],ss:mkSS(["AI编程","无代码","游戏工具","AI SaaS"])},
  {id:"L5",t:"cold",sig:[],ss:mkSS(["移动游戏","AI短剧","UGC视频","AI应用"])},
  {id:"L6",t:"cold",sig:[],ss:mkSS(["程序化广告","聚合平台","应用商店","归因分析"])},
  {id:"L7",t:"cold",sig:[],ss:mkSS(["人形机器人","自动驾驶","核心零部件"])},
  {id:"L8",t:"cold",sig:[],ss:mkSS(["AI搜索","AI消费助手","垂直应用","AI硬件"])},
];}

function initData(){return{layers:initLayers(),tx:[],scan:null,stocks:initStocks(),items:initItems(),sources:initSources()};}

function loadD(){
  try{const r=localStorage.getItem("ai-dash-data");return r?JSON.parse(r):null;}
  catch(e){return null;}
}
function saveD(d){try{localStorage.setItem("ai-dash-data",JSON.stringify(d));}catch(e){console.error(e);}}

export default function App(){
  const[d,setD]=useState(()=>initData());
  const[ready,setReady]=useState(false);
  const[pg,setPg]=useState("main");
  const[quotes,setQuotes]=useState({});       // {ticker_market: {p, c}}
  const[qStatus,setQStatus]=useState("idle"); // idle | loading | ok | err
  const[qTime,setQTime]=useState(null);       // 最后更新时间
  const stocksRef = useRef(null);

  useEffect(()=>{
    const saved=loadD();
    if(saved && saved.layers && saved.stocks){setD(saved);}
    setReady(true);
  },[]);

  // 行情拉取
  const doFetch = useCallback(async(stocks)=>{
    setQStatus("loading");
    try{
      const map = await fetchAllQuotes(stocks);
      const count = Object.keys(map).length;
      if(count>0){
        setQuotes(map);
        setQTime(new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}));
        setQStatus("ok");
      } else {
        setQStatus("err");
      }
    }catch(e){
      setQStatus("err");
    }
  },[]);

  useEffect(()=>{
    if(!ready) return;
    stocksRef.current = d.stocks;
    doFetch(d.stocks);
    const timer = setInterval(()=>doFetch(stocksRef.current), 5*60*1000);
    return ()=>clearInterval(timer);
  },[ready]); // eslint-disable-line

  // 当用户手动增删股票时更新 ref
  useEffect(()=>{ stocksRef.current = d.stocks; },[d.stocks]);

  const P=useCallback((nd)=>{setD(nd);saveD(nd);},[]);

  if(!ready) return <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#080B10",color:"#2A3A4A",fontFamily:"monospace",fontSize:11}}>LOADING...</div>;

  const pushSig=(id,ly)=>{
    const it=d.items.find(x=>x.id===id);
    if(!it)return;
    const nl=d.layers.map(l=>l.id===ly?{...l,sig:[...l.sig,{tx:it.ai.sm,dt:it.dt,sr:it.src}]}:l);
    const ni=d.items.map(x=>x.id===id?{...x,st:"confirmed",cL:ly}:x);
    P({...d,layers:nl,items:ni});
  };
  const dismiss=(id)=>P({...d,items:d.items.map(x=>x.id===id?{...x,st:"dismissed"}:x)});
  const setTmp=(lid,t)=>P({...d,layers:d.layers.map(l=>l.id===lid?{...l,t}:l)});
  const setSS=(lid,si,v)=>P({...d,layers:d.layers.map(l=>{if(l.id!==lid)return l;const a=[...l.ss];a[si]={...a[si],s:v};return{...l,ss:a};})});
  const addTx=(f,t,n)=>P({...d,tx:[...d.tx,{f,t,n,dt:new Date().toISOString().slice(0,10)}]});
  const rmTx=(i)=>P({...d,tx:d.tx.filter((_,j)=>j!==i)});
  const rmSig=(lid,i)=>P({...d,layers:d.layers.map(l=>l.id===lid?{...l,sig:l.sig.filter((_,j)=>j!==i)}:l)});
  const addStk=(lid,s)=>{const ns={...d.stocks,[lid]:[...(d.stocks[lid]||[]),s]};P({...d,stocks:ns});doFetch(ns);};
  const rmStk=(lid,i)=>P({...d,stocks:{...d.stocks,[lid]:d.stocks[lid].filter((_,j)=>j!==i)}});
  const addSrc=(s)=>P({...d,sources:[...d.sources,{...s,id:"s"+Date.now()}]});
  const rmSrc=(id)=>P({...d,sources:d.sources.filter(x=>x.id!==id)});

  const pend=d.items.filter(x=>x.st==="pending"&&x.ai.imp==="high").length;

  return(
    <div style={{background:"#080B10",color:"#A0AABA",fontFamily:"'DM Sans','Noto Sans SC',sans-serif",fontSize:12,minHeight:"100vh"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderBottom:"1px solid #141C26",background:"#080B10",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:"#D4A03C",fontWeight:900}}>◆</span>
          <span style={{fontSize:13,fontWeight:700,color:"#DEE4EA"}}>AI产业链投资看板</span>
        </div>
        <div style={{display:"flex",gap:2}}>
          <button onClick={()=>setPg("main")} style={pg==="main"?bA:bN}>看板{pend>0&&<span style={bdg}>{pend}</span>}</button>
          <button onClick={()=>setPg("src")} style={pg==="src"?bA:bN}>信源</button>
        </div>
      </div>

      {pg==="main"?(
        <div style={{display:"flex",flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{flex:"1 1 400px",minWidth:340,maxWidth:520,padding:10,borderRight:"1px solid #101820",overflowY:"auto",maxHeight:"calc(100vh - 40px)"}}>
            <StockPanel stocks={d.stocks} addStk={addStk} rmStk={rmStk} quotes={quotes} qStatus={qStatus} qTime={qTime} onRefresh={()=>doFetch(d.stocks)}/>
          </div>
          <div style={{flex:"1 1 440px",minWidth:360,padding:10,overflowY:"auto",maxHeight:"calc(100vh - 40px)"}}>
            <Radar layers={d.layers} tx={d.tx} scan={d.scan} setTmp={setTmp} setSS={setSS} addTx={addTx} rmTx={rmTx} rmSig={rmSig} onScan={()=>{const n=prompt("要点:");P({...d,scan:new Date().toISOString().slice(0,10)});}}/>
            <div style={{marginTop:12,borderTop:"1px solid #141C26",paddingTop:10}}>
              <Feed items={d.items} pushSig={pushSig} dismiss={dismiss}/>
            </div>
          </div>
        </div>
      ):(
        <div style={{maxWidth:680,margin:"0 auto",padding:12}}>
          <Sources sources={d.sources} addSrc={addSrc} rmSrc={rmSrc}/>
        </div>
      )}
    </div>
  );
}

// ===== STOCK PANEL (M2) =====
function StockPanel({stocks,addStk,rmStk,quotes,qStatus,qTime,onRefresh}){
  const[edit,setEdit]=useState(false);
  const[addTo,setAddTo]=useState(null);
  const[nf,setNf]=useState({t:"",n:"",m:"US"});
  const[collapsed,setCollapsed]=useState({});

  const qc = qStatus==="loading"?"#D4A03C":qStatus==="ok"?"#4A9A5A":qStatus==="err"?"#C9503C":"#3A4A5A";
  const ql = qStatus==="loading"?"拉取中…":qStatus==="ok"?`${qTime} 更新`:qStatus==="err"?"行情失败":"等待";

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#DEE4EA"}}>产业链监控</div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:1}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:qc}}/>
            <span style={{fontSize:9,color:qc}}>{ql}</span>
            {qStatus!=="loading"&&<button onClick={onRefresh} style={{border:"none",background:"transparent",color:"#3A4A5A",fontSize:9,cursor:"pointer",fontFamily:"inherit",padding:"0 2px"}}>↻</button>}
          </div>
        </div>
        <button onClick={()=>{setEdit(!edit);setAddTo(null);}} style={edit?{...btn,background:"#D4A03C",color:"#080B10"}:{...btn,background:"#141A26",color:"#6A7A8A"}}>{edit?"完成":"管理"}</button>
      </div>
      {LI.map(lid=>{
        const list=stocks[lid]||[];
        // 用实时行情覆盖显示，没拿到就 fallback 到硬编码值
        const liveList = list.map(s=>{
          const q = quotes[`${s.t}_${s.m}`];
          return q ? {...s, p:q.p, c:q.c} : s;
        });
        const avg=liveList.length?(liveList.reduce((a,x)=>a+x.c,0)/liveList.length):0;
        const ac=avg>0.5?"#4A9A5A":avg<-0.5?"#C9503C":"#6A7A8A";
        const isC=!!collapsed[lid];
        return(
          <div key={lid} style={{marginBottom:1}}>
            <div onClick={()=>setCollapsed(p=>({...p,[lid]:!p[lid]}))} style={{display:"flex",alignItems:"center",padding:"5px 8px",background:"#0D1118",borderLeft:"3px solid "+ac,cursor:"pointer"}}>
              <span style={{fontFamily:"monospace",fontSize:10,color:"#3A4A5A",width:22,fontWeight:600}}>{lid}</span>
              <span style={{fontSize:11,fontWeight:600,color:"#C0CCD8",flex:1}}>{LN[lid]}</span>
              <span style={{fontSize:9,color:"#3A4A5A"}}>{list.length}只</span>
              <span style={{fontSize:10,fontFamily:"monospace",color:ac,fontWeight:600,marginLeft:6}}>{avg>0?"+":""}{avg.toFixed(1)}%</span>
              <span style={{fontSize:9,color:"#2A3444",marginLeft:4,display:"inline-block",transform:isC?"none":"rotate(180deg)",transition:"transform 0.1s"}}>▾</span>
            </div>
            {!isC&&(
              <div style={{background:"#0A0E14",padding:"1px 8px 3px 33px",borderLeft:"3px solid #141A26"}}>
                {liveList.map((s,i)=>{
                  const hasLive = !!quotes[`${s.t}_${s.m}`];
                  const cc=s.c>0?"#4A9A5A":s.c<0?"#C9503C":"#6A7A8A";
                  const dispP = s.p>0 ? (s.p>999?Math.round(s.p).toLocaleString():s.p) : "—";
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",padding:"2px 0",borderBottom:"1px solid #0C1018",gap:3}}>
                      <span style={{fontFamily:"monospace",fontSize:10,color:"#4A5A6A",width:54,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.t}</span>
                      <span style={{flex:1,color:"#B0BCC8",fontSize:11}}>{s.n}</span>
                      <span style={{fontSize:8,padding:"0 3px",borderRadius:2,background:(MC[s.m]||"#555")+"18",color:MC[s.m]||"#555",fontWeight:600}}>{ML[s.m]||s.m}</span>
                      <span style={{width:56,textAlign:"right",fontFamily:"monospace",fontSize:10,color:hasLive?"#A0AABA":"#3A4A5A"}}>{dispP}</span>
                      <span style={{width:44,textAlign:"right",fontFamily:"monospace",fontSize:10,color:hasLive?cc:"#3A4A5A",fontWeight:600}}>{s.p>0?(s.c>0?"+":"")+s.c+"%":"—"}</span>
                      {edit&&<button onClick={()=>rmStk(lid,i)} style={xb}>×</button>}
                    </div>
                  );
                })}
                {edit&&addTo===lid?(
                  <div style={{display:"flex",gap:3,padding:"3px 0",alignItems:"center"}}>
                    <input value={nf.t} onChange={e=>setNf({...nf,t:e.target.value})} placeholder="代码" style={{...inp,width:50}}/>
                    <input value={nf.n} onChange={e=>setNf({...nf,n:e.target.value})} placeholder="名称" style={{...inp,flex:1}}/>
                    <select value={nf.m} onChange={e=>setNf({...nf,m:e.target.value})} style={sel}>{Object.keys(ML).map(k=><option key={k} value={k}>{ML[k]}</option>)}</select>
                    <button onClick={()=>{if(nf.t&&nf.n){addStk(lid,{t:nf.t,n:nf.n,m:nf.m,p:0,c:0});setNf({t:"",n:"",m:"US"});setAddTo(null);}}} style={{...btn,background:"#D4A03C",color:"#080B10",fontSize:9,padding:"2px 6px"}}>加</button>
                    <button onClick={()=>setAddTo(null)} style={{...btn,color:"#4A5A6A",fontSize:9,padding:"2px 4px",background:"transparent"}}>×</button>
                  </div>
                ):edit?(
                  <div style={{padding:"2px 0"}}><button onClick={()=>{setAddTo(lid);setNf({t:"",n:"",m:"US"});}} style={{border:"none",background:"transparent",color:"#3A5A7A",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>+ 添加</button></div>
                ):null}
              </div>
            )}
          </div>
        );
      })}
      <div style={{fontSize:9,color:"#1A2434",textAlign:"center",marginTop:8}}>Finnhub · 新浪财经 · 5min自动刷新</div>
    </div>
  );
}

// ===== RADAR (M1) =====
function Radar({layers,tx,scan,setTmp,setSS,addTx,rmTx,rmSig,onScan}){
  const[exp,setExp]=useState(null);
  const[edit,setEdit]=useState(false);
  const[txE,setTxE]=useState(false);
  const[txF,setTxF]=useState("L5");
  const[txT,setTxT]=useState("L6");
  const[txN,setTxN]=useState("");
  const dl=[...layers].reverse();

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"#DEE4EA"}}>温度雷达</div><div style={sub}>模块一 · {scan||"未扫描"}</div></div>
        <div style={{display:"flex",gap:3}}>
          <button onClick={()=>setEdit(!edit)} style={edit?{...btn,background:"#D4A03C",color:"#080B10"}:{...btn,background:"#141A26",color:"#6A7A8A"}}>{edit?"完成":"编辑"}</button>
          <button onClick={onScan} style={{...btn,background:"#141A26",color:"#6A7A8A"}}>扫描</button>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:5}}>
        {Object.entries(TC).map(([k,v])=><div key={k} style={{display:"flex",alignItems:"center",gap:2,fontSize:9,color:"#3A4A5A"}}><span style={{width:6,height:6,borderRadius:"50%",background:v.c}}/>{v.l}</div>)}
      </div>
      {tx.length>0&&<div style={{padding:"4px 8px",background:"#0D1118",borderRadius:2,marginBottom:4}}>
        <div style={{fontSize:8,color:"#3A4A5A",fontWeight:700}}>传导信号</div>
        {tx.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,marginTop:1}}>
          <span style={{color:"#D4A03C",fontFamily:"monospace",fontWeight:700,fontSize:10}}>{x.f}→{x.t}</span>
          <span style={{flex:1,color:"#6A7A8A",fontSize:10}}>{x.n}</span>
          {edit&&<button onClick={()=>rmTx(i)} style={xb}>×</button>}
        </div>)}
      </div>}
      {edit&&<div style={{marginBottom:4}}>
        <button onClick={()=>setTxE(!txE)} style={{...btn,width:"100%",background:"#0D1118",color:"#4A5A6A",fontSize:9}}>{txE?"关闭":"+ 传导"}</button>
        {txE&&<div style={{display:"flex",gap:3,marginTop:3,flexWrap:"wrap"}}>
          <select value={txF} onChange={e=>setTxF(e.target.value)} style={{...sel,width:48}}>{LI.map(l=><option key={l} value={l}>{l}</option>)}</select>
          <span style={{color:"#D4A03C",fontWeight:700,lineHeight:"22px"}}>→</span>
          <select value={txT} onChange={e=>setTxT(e.target.value)} style={{...sel,width:48}}>{LI.map(l=><option key={l} value={l}>{l}</option>)}</select>
          <input value={txN} onChange={e=>setTxN(e.target.value)} placeholder="描述" style={{...inp,flex:1}}/>
          <button onClick={()=>{if(txN.trim()){addTx(txF,txT,txN.trim());setTxN("");}}} style={{...btn,background:"#D4A03C",color:"#080B10",fontSize:9}}>加</button>
        </div>}
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        {dl.map(l=>{
          const tc=TC[l.t];const isE=exp===l.id;
          return <div key={l.id}>
            <div onClick={()=>setExp(isE?null:l.id)} style={{display:"flex",alignItems:"center",padding:"4px 8px",cursor:"pointer",borderLeft:"2px solid "+tc.c,background:isE?"rgba("+parseInt(tc.c.slice(1,3),16)+","+parseInt(tc.c.slice(3,5),16)+","+parseInt(tc.c.slice(5,7),16)+",0.06)":"#0D1118"}}>
              <span style={{fontFamily:"monospace",fontSize:9,color:"#3A4A5A",width:22,fontWeight:600}}>{l.id}</span>
              <span style={{fontSize:11,fontWeight:600,color:"#C8D0DA",flex:1}}>{LN[l.id]}</span>
              {l.sig.length>0&&<span style={{fontSize:8,color:"#3A4A5A",marginRight:4}}>{l.sig.length}</span>}
              {edit?<div style={{display:"flex",gap:1}} onClick={e=>e.stopPropagation()}>
                {["cold","warm","hot"].map(t=><button key={t} onClick={()=>setTmp(l.id,t)} style={{border:"none",borderRadius:2,padding:"1px 5px",fontSize:8,cursor:"pointer",fontWeight:600,background:l.t===t?TC[t].c:"#1A2233",color:l.t===t?"#FFF":"#3A4A5A",fontFamily:"inherit"}}>{TC[t].l}</button>)}
              </div>:<>
                <span style={{width:6,height:6,borderRadius:"50%",background:tc.c,marginRight:3}}/>
                <span style={{fontSize:10,color:tc.c,fontWeight:600}}>{tc.l}</span>
              </>}
              <span style={{fontSize:8,color:"#2A3444",marginLeft:4,display:"inline-block",transform:isE?"rotate(180deg)":"none",transition:"transform 0.1s"}}>▾</span>
            </div>
            {isE&&<div style={{background:"#090D14",borderLeft:"2px solid "+tc.c,padding:"4px 8px 6px 30px"}}>
              <div style={{fontSize:8,color:"#3A4A5A",fontWeight:700,marginBottom:2}}>细分</div>
              {l.ss.map((ss,si)=><div key={si} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,marginBottom:1}}>
                <span style={{width:4,height:4,borderRadius:"50%",background:TC[ss.s].c}}/>
                <span style={{color:"#6A7A8A",flex:1}}>{ss.n}</span>
                {edit?<div style={{display:"flex",gap:1}}>{["cold","warm","hot"].map(t=><button key={t} onClick={()=>setSS(l.id,si,t)} style={{border:"none",borderRadius:1,padding:"0 4px",fontSize:7,cursor:"pointer",fontWeight:600,background:ss.s===t?TC[t].c:"#1A2233",color:ss.s===t?"#FFF":"#3A4A5A",fontFamily:"inherit"}}>{TC[t].l}</button>)}</div>
                :<span style={{fontSize:8,color:TC[ss.s].c}}>{TC[ss.s].l}</span>}
              </div>)}
              <div style={{marginTop:4,fontSize:8,color:"#3A4A5A",fontWeight:700}}>信号</div>
              {l.sig.length===0&&<div style={{fontSize:9,color:"#2A3444"}}>暂无</div>}
              {l.sig.map((s,si)=><div key={si} style={{display:"flex",gap:3,marginBottom:1,alignItems:"center"}}>
                <span style={{fontSize:8,color:"#2A3444"}}>{s.dt}</span>
                <span style={{flex:1,fontSize:9,color:"#6A7A8A"}}>{s.tx}</span>
                <span style={{fontSize:7,color:"#2A3444"}}>[{s.sr}]</span>
                {edit&&<button onClick={()=>rmSig(l.id,si)} style={xb}>×</button>}
              </div>)}
            </div>}
          </div>;
        })}
      </div>
    </div>
  );
}

// ===== FEED (M3) =====
function Feed({items,pushSig,dismiss}){
  const[ft,setFt]=useState("pending");
  const[lf,setLf]=useState("all");
  const fl=items.filter(i=>(ft==="all"||i.st===ft)&&(lf==="all"||i.ai.ly.includes(lf)));

  return <div>
    <div style={{fontSize:14,fontWeight:700,color:"#DEE4EA",marginBottom:2}}>信息聚合</div>
    <div style={sub}>模块三 · AI分类 → 推送至雷达</div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:6,marginBottom:6,flexWrap:"wrap",gap:4}}>
      <div style={{display:"flex",gap:2}}>
        {[["pending","待确认"],["unread","未读"],["confirmed","已推送"],["all","全部"]].map(([k,v])=>
          <button key={k} onClick={()=>setFt(k)} style={ft===k?{...fb,background:"#1A2636",color:"#D4A03C"}:fb}>{v}</button>
        )}
      </div>
      <select value={lf} onChange={e=>setLf(e.target.value)} style={sel}><option value="all">全部</option>{LI.map(l=><option key={l} value={l}>{l}</option>)}</select>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {fl.length===0&&<div style={{textAlign:"center",color:"#2A3444",padding:14}}>暂无</div>}
      {fl.map(it=>{
        const ic=it.ai.imp==="high"?"#C9503C":it.ai.imp==="med"?"#D4A03C":"#4A6FA5";
        return <div key={it.id} style={{background:"#0D1118",borderRadius:2,padding:"7px 10px",borderLeft:"2px solid "+ic,opacity:it.st==="dismissed"?0.3:1}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:3,marginBottom:2}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:ic}}/>
              <span style={{fontSize:10,color:"#4A6A8A",fontWeight:600}}>{it.src}</span>
              <span style={{fontSize:9,color:"#2A3444"}}>{it.dt}</span>
            </div>
            <div style={{display:"flex",gap:2}}>
              {it.ai.ly.map(l=><span key={l} style={{fontSize:8,color:"#D4A03C",background:"rgba(212,160,60,0.08)",padding:"0 4px",borderRadius:1,fontFamily:"monospace",fontWeight:600}}>{l}</span>)}
            </div>
          </div>
          <div style={{fontSize:12,fontWeight:600,color:"#DEE4EA",lineHeight:1.3,marginBottom:2}}>{it.tl}</div>
          <div style={{fontSize:10,color:"#5A6A7A",marginBottom:4}}>{it.ai.sm}</div>
          {(it.st==="pending"||it.st==="unread")&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {it.ai.ly.map(l=><button key={l} onClick={()=>pushSig(it.id,l)} style={{border:"none",background:"rgba(212,160,60,0.1)",color:"#D4A03C",fontSize:9,padding:"2px 7px",borderRadius:2,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>→{l}</button>)}
            <button onClick={()=>dismiss(it.id)} style={{border:"none",background:"transparent",color:"#2A3A4A",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>忽略</button>
          </div>}
          {it.st==="confirmed"&&<span style={{fontSize:9,color:"#4A9A5A",fontWeight:600}}>✓ {it.cL}</span>}
        </div>;
      })}
    </div>
  </div>;
}

// ===== SOURCES =====
function Sources({sources,addSrc,rmSrc}){
  const[adding,setAdding]=useState(false);
  const[nf,setNf]=useState({n:"",u:"",lg:"en",cat:"opt",ly:"L1",fq:"周"});

  const byL={};sources.forEach(s=>{const k=(s.ly||[])[0]||"L0";if(!byL[k])byL[k]=[];byL[k].push(s);});

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div><div style={{fontSize:16,fontWeight:700,color:"#DEE4EA"}}>信源管理</div><div style={{fontSize:10,color:"#3A4A5A"}}>{sources.length}个信源</div></div>
      <button onClick={()=>setAdding(!adding)} style={{...btn,background:adding?"#9A3A3A":"#D4A03C",color:"#080B10"}}>{adding?"取消":"+ 添加"}</button>
    </div>
    {adding&&<div style={{background:"#0D1118",borderRadius:3,padding:8,marginBottom:10,border:"1px solid #1A2233"}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
        <input value={nf.n} onChange={e=>setNf({...nf,n:e.target.value})} placeholder="名称" style={{...inp,flex:1,minWidth:100}}/>
        <input value={nf.u} onChange={e=>setNf({...nf,u:e.target.value})} placeholder="URL" style={{...inp,flex:2,minWidth:160}}/>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
        <select value={nf.lg} onChange={e=>setNf({...nf,lg:e.target.value})} style={sel}><option value="en">EN</option><option value="zh">中文</option></select>
        <select value={nf.cat} onChange={e=>setNf({...nf,cat:e.target.value})} style={sel}><option value="must">必读</option><option value="opt">选读</option></select>
        <select value={nf.ly} onChange={e=>setNf({...nf,ly:e.target.value})} style={sel}>{LI.map(l=><option key={l} value={l}>{l}</option>)}</select>
        <input value={nf.fq} onChange={e=>setNf({...nf,fq:e.target.value})} placeholder="频率" style={{...inp,width:40}}/>
        <button onClick={()=>{if(nf.n.trim()){addSrc({n:nf.n,u:nf.u,lg:nf.lg,cat:nf.cat,ly:[nf.ly],fq:nf.fq});setNf({n:"",u:"",lg:"en",cat:"opt",ly:"L1",fq:"周"});setAdding(false);}}} style={{...btn,background:"#D4A03C",color:"#080B10"}}>确认</button>
      </div>
    </div>}
    {LI.map(lid=>{
      const srcs=byL[lid];if(!srcs)return null;
      return <div key={lid} style={{marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,color:"#4A6A8A",borderBottom:"1px solid #141A26",paddingBottom:2,marginBottom:3}}>{lid} {LN[lid]}</div>
        {srcs.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:"1px solid #0C1018"}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:s.cat==="must"?"#D4A03C":"#2A3A4A"}}/>
          <span style={{fontSize:12,color:s.cat==="must"?"#C0CCD8":"#5A6A7A",flex:1,fontWeight:s.cat==="must"?600:400}}>{s.n}</span>
          <span style={{fontSize:9,color:"#3A4A5A"}}>{s.lg==="zh"?"中":"EN"}</span>
          <span style={{fontSize:9,color:"#3A4A5A"}}>{s.fq}</span>
          <span style={{fontSize:9,color:s.cat==="must"?"#D4A03C":"#3A4A5A"}}>{s.cat==="must"?"必读":"选读"}</span>
          {s.u&&s.u!=="wechat"&&<a href={s.u.startsWith("http")?s.u:"https://"+s.u} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#4A6FA5",textDecoration:"none"}}>↗</a>}
          <button onClick={()=>rmSrc(s.id)} style={xb}>×</button>
        </div>)}
      </div>;
    })}
  </div>;
}

// ===== SHARED STYLES =====
const sub = {fontSize:9,color:"#3A4A5A"};
const btn = {border:"none",borderRadius:3,padding:"4px 10px",fontSize:10,cursor:"pointer",fontWeight:600,fontFamily:"inherit"};
const bN = {border:"none",background:"transparent",color:"#3A4A5A",fontSize:11,padding:"5px 12px",borderRadius:3,cursor:"pointer",fontFamily:"inherit",position:"relative"};
const bA = {...bN,background:"#141A26",color:"#DEE4EA"};
const bdg = {position:"absolute",top:0,right:2,background:"#C9503C",color:"#FFF",fontSize:7,fontWeight:700,borderRadius:4,padding:"0 3px"};
const inp = {background:"#080B10",border:"1px solid #1A2233",borderRadius:2,padding:"3px 6px",color:"#A0AABA",fontSize:10,fontFamily:"inherit",outline:"none"};
const sel = {background:"#0D1118",border:"1px solid #1A2233",borderRadius:2,padding:"3px 5px",color:"#A0AABA",fontSize:10,fontFamily:"inherit",outline:"none"};
const fb = {border:"none",background:"#0D1118",color:"#3A4A5A",fontSize:9,padding:"2px 7px",borderRadius:2,cursor:"pointer",fontFamily:"inherit"};
const xb = {border:"none",background:"transparent",color:"#7A3A3A",cursor:"pointer",fontSize:12,padding:"0 2px",fontFamily:"inherit"};
