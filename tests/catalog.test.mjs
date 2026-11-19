import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const json=(p)=>JSON.parse(readFileSync(join(root,p),"utf8"));
const manifest=json("data/manifest.json");
const projects=manifest.groups.flatMap(g=>json("data/groups/"+g.id+".json").projects);

test("catalog covers the complete declared portfolio",()=>{
 assert.equal(projects.length,51);
 assert.equal(projects.filter(x=>x.github).length,49);
 assert.equal(new Set(projects.filter(x=>x.github).map(x=>x.github.full_name.toLowerCase())).size,48);
});

test("duplicate GitHub mappings are preserved as separate Vercel projects",()=>{
 const grouped=projects.filter(x=>x.github?.full_name==="1998x-stack/historicalRecords");
 assert.deepEqual(grouped.map(x=>x.name).sort(),["historical-records","historical-records-lu26"]);
});

test("every record has a distinct identity and a traceable evidence level",()=>{
 assert.equal(new Set(projects.map(p=>p.name)).size,51);
 const allowed=new Set(["readme","name-only","vercel-only","vercel-metadata","source-inspection"]);
 for(const p of projects){assert.ok(allowed.has(p.evidence),p.name);assert.ok(p.summary.length>10,p.name)}
});

test("private repositories do not include secret values or source code",()=>{
 const data=JSON.stringify(projects);
 assert.ok(!/github_pat_|ghp_[A-Za-z0-9]{20,}|-----BEGIN.*PRIVATE KEY-----/.test(data));
 assert.equal(projects.filter(p=>p.github?.visibility==="private").length,41);
 assert.equal(projects.filter(p=>p.github?.visibility==="public").length,8);
 assert.equal(projects.filter(p=>!p.github).length,2);
});

test("static site references only local JavaScript and stylesheets",()=>{
 const html=readFileSync(join(root,"site/index.html"),"utf8");
 assert.match(html,/\.\/assets\/styles\.css/);
 assert.match(html,/\.\/assets\/app\.js/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:\/\//);
});
