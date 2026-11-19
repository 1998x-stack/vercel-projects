import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const failures = [];
const assert = (ok,message) => { if(!ok)failures.push(message); };
const manifest = readJSON("data/manifest.json");
const groups = manifest.groups || [];
assert(manifest.schema_version === 1, "manifest schema_version must be 1");
assert(groups.length === 8, "expected eight categories");
const groupIds = new Set();
const records = [];
for(const g of groups){
  assert(!groupIds.has(g.id), "duplicate category: " + g.id);groupIds.add(g.id);
  const path = "data/groups/" + g.id + ".json";
  if(!existsSync(join(root,path))){failures.push("missing group: "+path);continue}
  let data;
  try{data=readJSON(path)}catch(e){failures.push("invalid JSON "+path+": "+e.message);continue}
  assert(data.schema_version === 1, "group version: " + path);
  assert(data.category === g.id, "category mismatch: " + path);
  assert(Array.isArray(data.projects), "projects must be array: " + path);
  records.push(...(data.projects || []));
}
const names=new Set(), linked=[], publicRepos=new Set(), privateRepos=new Set();
const states=new Set(["READY","ERROR","BLOCKED","QUEUED","BUILDING","INITIALIZING","CANCELED","NONE","UNKNOWN"]);
for(const p of records){
 assert(typeof p.name==="string"&&/^[a-z0-9][a-z0-9-]*$/.test(p.name),"bad name: "+p.name);
 assert(!names.has(p.name),"duplicate project: "+p.name); names.add(p.name);
 assert(groupIds.has(p.category),"unknown category: "+p.name);
 for(const field of ["summary","stack","risk","next","evidence"]) assert(typeof p[field]==="string"&&p[field].length>=3,"missing "+field+" for "+p.name);
 assert(typeof p.checked_at==="string"&&/^20\d\d-\d\d-\d\d$/.test(p.checked_at),"invalid checked_at: "+p.name);
 const status=p.last_deployment?.state || "NONE";
 assert(states.has(status),"invalid status: "+p.name+": "+status);
 if(p.last_deployment) assert(!Number.isNaN(Date.parse(p.last_deployment.created_at)),"bad deployment date: "+p.name);
 if(p.github){
   assert(/^1998x-stack\/[A-Za-z0-9_.-]+$/.test(p.github.full_name),"invalid GitHub ref: "+p.name);
   assert(["public","private"].includes(p.github.visibility),"invalid visibility: "+p.name);
   linked.push(p.github.full_name);
   if(p.github.visibility==="private")privateRepos.add(p.github.full_name.toLowerCase());
   if(p.github.visibility==="public")publicRepos.add(p.github.full_name.toLowerCase());
 }
 if(p.site_url){
   try{const u=new URL(p.site_url);assert(u.protocol==="https:"&&u.hostname.endsWith(".vercel.app")&&!u.username&&!u.password,"unsafe site URL: "+p.name)}catch{failures.push("invalid site URL: "+p.name)}
 }
 const serialized=JSON.stringify(p);
 assert(!/(?:ghp_|github_pat_|sk-[a-z0-9]{20,}|-----BEGIN (?:RSA|OPENSSH) PRIVATE KEY-----)/i.test(serialized),"sensitive token detected in "+p.name);
}
const expected=manifest.expected||{};
assert(records.length===expected.vercel_projects,"expected "+expected.vercel_projects+" projects, got "+records.length);
assert(linked.length===expected.github_links,"expected "+expected.github_links+" GitHub links, got "+linked.length);
assert(new Set(linked.map(x=>x.toLowerCase())).size===expected.unique_github_repositories,"unique GitHub repo mismatch");
assert(publicRepos.size===expected.public_repositories,"public repo count mismatch");
assert(privateRepos.size===expected.private_repositories,"private repo count mismatch");
for(const path of ["site/index.html","site/assets/styles.css","site/assets/app.js"])assert(existsSync(join(root,path)),"missing site asset: "+path);
if(failures.length){console.error("Catalog validation FAILED:\n"+failures.map(x=>" - "+x).join("\n"));process.exit(1)}
const counts={projects:records.length,githubLinks:linked.length,uniqueGithubRepos:new Set(linked.map(x=>x.toLowerCase())).size,publicRepos:publicRepos.size,privateRepos:privateRepos.size,ready:records.filter(p=>p.last_deployment?.state==="READY").length};
console.log("Catalog validation PASS",JSON.stringify(counts));
export { root, readJSON };
