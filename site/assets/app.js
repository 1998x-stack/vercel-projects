const $ = (id) => document.getElementById(id);
const store = { manifest: null, projects: [], category: "all", status: "all", privacy: "all", query: "", sort: "name", lastFocus: null };
const STATE_NAMES = { READY:"READY", ERROR:"ERROR", BLOCKED:"BLOCKED", QUEUED:"QUEUED", BUILDING:"BUILDING", INITIALIZING:"INITIALIZING", CANCELED:"CANCELED", NONE:"无部署", UNKNOWN:"未知" };
const STATE_COLORS = {READY:"#7c6cda",ERROR:"#d66860",BLOCKED:"#e3a665",QUEUED:"#8d87c9",BUILDING:"#9282d2",INITIALIZING:"#a6a2db",CANCELED:"#9b9baa",NONE:"#dadce4",UNKNOWN:"#dadce4"};
const EVIDENCE = {"readme":"GitHub README 已核验","name-only":"仅据项目名推断，未完成源码审阅","vercel-only":"仅 Vercel 项目记录","vercel-metadata":"Vercel 部署元信息","source-inspection":"已检查连接仓库的源文件与资产目录"};
function el(tag,className,text){ const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n }
function safeState(p){return p.last_deployment?.state||"NONE"}
function privacy(p){return p.github?.visibility||"unlinked"}
function localeDate(value){if(!value)return "无记录";const d=new Date(value);return Number.isNaN(d.getTime())?"未核实":new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
function categoryName(id){return store.manifest?.groups.find(g=>g.id===id)?.name||id}
function msg(message){const n=$("notice");n.textContent=message;n.hidden=false;clearTimeout(msg.timeout);msg.timeout=setTimeout(()=>n.hidden=true,3500)}
function countStatus(name){return store.projects.filter(p=>safeState(p)===name).length}
function updateMetrics(){
 const p=store.projects, ready=countStatus("READY"),linked=p.filter(x=>x.github).length;
 $("metric-projects").textContent=String(p.length);
 $("metric-linked").textContent=String(linked);
 $("metric-ready").textContent=String(ready);
 $("metric-attention").textContent=String(p.length-ready);
 $("snapshot-date").textContent=store.manifest.generated_at;
 const chart=$("category-chart");chart.replaceChildren();
 store.manifest.groups.forEach(g=>{
   const cnt=p.filter(x=>x.category===g.id).length;
   const row=el("div","chart-line");
   row.append(el("span","chart-label",g.name));
   const track=el("div","chart-track"),bar=el("div","chart-bar");
   bar.style.width=(cnt/Math.max(1,...store.manifest.groups.map(a=>p.filter(x=>x.category===a.id).length))*100)+"%";
   track.append(bar);row.append(track,el("span","chart-value",String(cnt)));chart.append(row);
 });
 const percentage= p.length?Math.round(ready/p.length*100):0;
 $("status-ring").style.background="conic-gradient(#7d70da 0 "+percentage+"%, #edeef3 "+percentage+"% 100%)";
 $("status-ring-count").replaceChildren(document.createTextNode(String(ready)),el("small","", "READY"));
 const keys=["READY","ERROR","BLOCKED","QUEUED","BUILDING","INITIALIZING","CANCELED","NONE"];
 const legend=$("status-legend");legend.replaceChildren();
 keys.forEach(k=>{const n=countStatus(k);if(!n)return;const row=el("div","legend-row"),dot=el("span","legend-dot");dot.style.background=STATE_COLORS[k]||STATE_COLORS.UNKNOWN;row.append(dot,el("span","",STATE_NAMES[k]),el("strong","",String(n)));legend.append(row)});
}
function renderChips(){
 const root=$("category-filters");root.replaceChildren();
 const choices=[{id:"all",name:"全部项目"}].concat(store.manifest.groups);
 choices.forEach(g=>{const count=g.id==="all"?store.projects.length:store.projects.filter(p=>p.category===g.id).length;const b=el("button","chip"+(g.id===store.category?" active":""),g.name+" · "+count);b.type="button";b.setAttribute("aria-pressed",String(g.id===store.category));b.addEventListener("click",()=>{store.category=g.id;renderChips();renderProjects()});root.append(b)});
}
function currentProjects(){
 let data=store.projects.filter(p=>(store.category==="all"||p.category===store.category)&&(store.status==="all"||safeState(p)===store.status)&&(store.privacy==="all"||privacy(p)===store.privacy));
 const query=store.query.trim().toLocaleLowerCase();
 if(query)data=data.filter(p=>[p.name,p.github?.full_name,p.summary,p.stack,p.risk,p.next].join(" ").toLocaleLowerCase().includes(query));
 if(store.sort==="recent"){data.sort((a,b)=>(b.last_deployment?.created_at||"").localeCompare(a.last_deployment?.created_at||""))}
 else if(store.sort==="risk"){const rank={ERROR:0,BLOCKED:1,NONE:2,QUEUED:3,BUILDING:4,INITIALIZING:5,CANCELED:6,UNKNOWN:7,READY:8};data.sort((a,b)=>(rank[safeState(a)]??9)-(rank[safeState(b)]??9)||a.name.localeCompare(b.name))}
 else data.sort((a,b)=>a.name.localeCompare(b.name));
 return data;
}
function renderProjects(){
 const projects=currentProjects();$("results-count").textContent=String(projects.length);
 const root=$("project-list");root.replaceChildren();$("empty-results").hidden=projects.length>0;
 projects.forEach((p,i)=>{
   const row=el("button","project-row");row.type="button";row.setAttribute("aria-label","查看 "+p.name+" 的项目分析");
   const idx=el("span","project-index",String(i+1).padStart(2,"0"));
   const main=el("span","project-main");main.append(el("span","project-name",p.name),el("span","project-description",p.summary));
   const cat=el("span","project-categ",categoryName(p.category));
   const gh=el("span","project-repo",p.github?.full_name.split("/")[1]||"未关联 GitHub");cat.append(gh);
   const state=el("span","project-status"),s=safeState(p);state.append(el("span","state-chip state-"+s.toLowerCase(),STATE_NAMES[s]||s));
   const lock=el("span","privacy-tag "+privacy(p),privacy(p)==="private"?"PRIVATE":privacy(p)==="public"?"PUBLIC":"NO REPO");
   row.append(idx,main,cat,state,lock);
   row.addEventListener("click",()=>openDetail(p));root.append(row);
 });
}
function detailBlock(parent,title,body,klass){const section=el("section","detail-block"+(klass?" "+klass:""));section.append(el("h3","",title),el("p","",body||"未核验"));parent.append(section)}
function externalLink(label,url,secondary){if(!url)return null;const a=el("a",secondary?"secondary":"",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function openDetail(p){
 store.lastFocus=document.activeElement;
 const container=$("inspector-content");container.replaceChildren();
 const body=el("div","inspector-body");
 body.append(el("span","detail-eyebrow","PROJECT / "+categoryName(p.category)),el("h2","",p.name),el("p","detail-summary",p.summary));
 const tags=el("div","detail-tags");
 tags.append(el("span","state-chip state-"+safeState(p).toLowerCase(),STATE_NAMES[safeState(p)]||safeState(p)),el("span","",privacy(p)==="private"?"GitHub Private":privacy(p)==="public"?"GitHub Public":"未关联 GitHub"),el("span","",EVIDENCE[p.evidence]||"核验待完善"));body.append(tags);
 detailBlock(body,"技术与实现",p.stack);
 detailBlock(body,"风险与疑点",p.risk,"risk");
 detailBlock(body,"下一步建议",p.next,"next");
 detailBlock(body,"部署状态说明","最近一次部署："+(STATE_NAMES[safeState(p)]||safeState(p))+"；环境："+(p.last_deployment?.target||"无记录")+"。此状态仅代表 Vercel 部署历史，不是 HTTP 或业务健康检查结论。");
 const meta=el("div","detail-meta");
 const fields=[["Vercel 项目",p.name],["关联 GitHub",p.github?.full_name||"无"],["仓库可见性",privacy(p)],["最近部署时间",localeDate(p.last_deployment?.created_at)],["审计快照",p.checked_at],["证据级别",EVIDENCE[p.evidence]||p.evidence]];
 fields.forEach(([a,b])=>{meta.append(el("span","",a),el("strong","",b))});body.append(meta);
 const links=el("div","detail-links");
 links.append(externalLink("Vercel 控制台 ↗","https://vercel.com/xiemings-projects/"+encodeURIComponent(p.name),false));
 if(p.github)links.append(externalLink("GitHub 仓库 ↗","https://github.com/"+p.github.full_name,true));
 if(p.site_url)links.append(externalLink("配置域名（未验活） ↗",p.site_url,true));
 body.append(links);container.append(body);
 $("drawer-overlay").hidden=false;$("inspector").classList.add("open");$("inspector").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$("drawer-close").focus();
 const u=new URL(window.location.href);u.searchParams.set("project",p.name);history.replaceState(null,"",u);
}
function closeDetail(){
 $("inspector").classList.remove("open");$("inspector").setAttribute("aria-hidden","true");$("drawer-overlay").hidden=true;document.body.style.overflow="";
 const u=new URL(window.location.href);u.searchParams.delete("project");history.replaceState(null,"",u);
 if(store.lastFocus?.isConnected)store.lastFocus.focus();
}
function downloadCSV(){
 const headers=["Vercel Project","Category","GitHub Repo","Visibility","Latest Deployment","Target","Created At","Summary","Risk","Next Action","Evidence"];
 const rows=store.projects.map(p=>[p.name,categoryName(p.category),p.github?.full_name||"",privacy(p),safeState(p),p.last_deployment?.target||"",p.last_deployment?.created_at||"",p.summary,p.risk,p.next,p.evidence]);
 const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="vercel-projects-2026-11-19.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);msg("已导出 "+store.projects.length+" 条快照记录");
}
async function start(){
 try{
   const manifestRes=await fetch("./data/manifest.json",{cache:"no-store"});if(!manifestRes.ok)throw new Error("manifest HTTP "+manifestRes.status);
   store.manifest=await manifestRes.json();
   const groups=await Promise.all(store.manifest.groups.map(async g=>{const r=await fetch("./data/groups/"+g.id+".json",{cache:"no-store"});if(!r.ok)throw new Error(g.id+" HTTP "+r.status);const data=await r.json();if(data.category!==g.id||!Array.isArray(data.projects))throw new Error("Invalid group "+g.id);return data.projects}));
   store.projects=groups.flat();updateMetrics();renderChips();renderProjects();
   const id=new URL(window.location.href).searchParams.get("project");const selected=store.projects.find(p=>p.name===id);if(selected)openDetail(selected);
 }catch(error){$("project-list").replaceChildren(el("p","loading","加载项目数据失败："+error.message+"。请检查 Pages 构建与 data 目录。"));msg("项目数据读取失败")}
}
$("search-input").addEventListener("input",e=>{store.query=e.target.value;renderProjects()});
$("status-filter").addEventListener("change",e=>{store.status=e.target.value;renderProjects()});
$("privacy-filter").addEventListener("change",e=>{store.privacy=e.target.value;renderProjects()});
$("sort-select").addEventListener("change",e=>{store.sort=e.target.value;renderProjects()});
$("export-csv").addEventListener("click",downloadCSV);
$("drawer-close").addEventListener("click",closeDetail);
$("drawer-overlay").addEventListener("click",closeDetail);
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&$("inspector").classList.contains("open")){closeDetail();return}
 if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();$("search-input").focus()}
 if(e.key==="Tab"&&$("inspector").classList.contains("open")){const focusables=Array.from($("inspector").querySelectorAll("a[href],button:not([disabled])"));if(focusables.length){const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
});
start();
