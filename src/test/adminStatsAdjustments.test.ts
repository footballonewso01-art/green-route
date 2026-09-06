// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type Config = { mode: string; resourceId: string; start: string; end: string; total: number; uniquePercent: number; countries: string; reason: string; startAt?: string; endAt?: string };
type Aggregate = { kind: string; resource_id: string; profile_id: string; card_id: string; bucket: string; dimension_type: string; dimension_value: string; total: number; unique_count: number };
interface MathModule { allocate: (n: number, weights: number[]) => number[]; normalize: (c: Config, now?: number) => Config; build: (c: Config, resources: { id: string; created: string }[], rows: Aggregate[], cards: Aggregate[]) => { rows: Aggregate[]; summary: { after: number; unique: number; before: number; countries: { name: string; clicks: number }[]; trend: { date: string; clicks: number }[] } } }
interface Service { authorize: (app: unknown, event: unknown) => string; subject: (app: unknown, event: unknown) => { status?: number; user?: { id: string } }; preview: (app: unknown, user: string, actor: string, c: Config) => { id: string; summary: { before: number; after: number } }; change: (app: unknown, user: string, actor: string, id: string, undo: boolean) => void; revision: (app: unknown, user: string) => number; list: (app: unknown, user: string) => unknown }
const loadMath = () => { const module = { exports: {} }; vm.runInNewContext(readFileSync('pocketbase/pb_hooks/stats_adjustment_math.js','utf8'), { module }); return module.exports as MathModule; };
const day = (offset: number) => new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
const config = (extra: Partial<Config> = {}): Config => ({ mode: 'links', resourceId: 'all', start: day(-7), end: day(-1), total: 12500, uniquePercent: 80, countries: '', reason: 'Manual correction after verified ingestion outage.', ...extra });
const uid = 'user00000000001', other = 'user00000000002', lid = 'link00000000001', pid = 'profile00000001', card = 'card00000000001', actor = 'admin0000000001';
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id TEXT PRIMARY KEY);
    INSERT INTO users VALUES('${uid}'),('${other}'),('${actor}');
    CREATE TABLE links(id TEXT PRIMARY KEY,user_id TEXT,title TEXT,slug TEXT,created TEXT,clicks_count INTEGER);
    CREATE TABLE public_profiles(id TEXT PRIMARY KEY,user_id TEXT,name TEXT,slug TEXT,created TEXT);
    CREATE TABLE analytics_rollup_state(id TEXT PRIMARY KEY,status TEXT);
    INSERT INTO analytics_rollup_state VALUES('historical','complete');
    CREATE TABLE analytics_hourly_rollup(link_id TEXT,bucket TEXT,dimension_type TEXT,dimension_value TEXT,total INTEGER,unique_count INTEGER,PRIMARY KEY(link_id,bucket,dimension_type,dimension_value));
    CREATE TABLE profile_analytics_hourly_rollup(profile_id TEXT,bucket TEXT,dimension_type TEXT,dimension_value TEXT,total INTEGER,unique_count INTEGER,PRIMARY KEY(profile_id,bucket,dimension_type,dimension_value));
    CREATE TABLE profile_click_hourly_rollup(profile_id TEXT,profile_link_id TEXT,link_id TEXT,bucket TEXT,total INTEGER,unique_count INTEGER,PRIMARY KEY(profile_id,profile_link_id,link_id,bucket));
    CREATE TABLE analytics_daily(id TEXT,link_id TEXT,day TEXT,count INTEGER,created TEXT,updated TEXT,UNIQUE(link_id,day));
    CREATE TABLE clicks(id TEXT,link_id TEXT,created TEXT,source_profile_id TEXT,profile_link_id TEXT,is_unique INTEGER);
    CREATE INDEX idx_clicks_created ON clicks(created);
    INSERT INTO links VALUES('${lid}','${uid}','Main link','main','${day(-30)} 00:00:00.000Z',150),('link00000000002','${other}','Other link','other','${day(-30)} 00:00:00.000Z',999);
    INSERT INTO public_profiles VALUES('${pid}','${uid}','Profile','profile','${day(-30)} 00:00:00.000Z');`);
  const buckets = [day(-3)+'T12:00:00Z',day(-2)+'T17:00:00Z'];
  for (const bucket of buckets) {
    for (const [dimension,value] of [['all',''],['country','US'],['device','Mobile'],['browser','Chrome'],['os','Android'],['referrer','Direct']]) {
      db.prepare('INSERT INTO analytics_hourly_rollup VALUES(?,?,?,?,?,?)').run(lid,bucket,dimension,value,75,dimension==='all'?60:0);
      db.prepare('INSERT INTO profile_analytics_hourly_rollup VALUES(?,?,?,?,?,?)').run(pid,bucket,dimension,value,100,dimension==='all'?80:0);
    }
    db.prepare('INSERT INTO profile_click_hourly_rollup VALUES(?,?,?,?,?,?)').run(pid,card,lid,bucket,30,24);
    db.prepare('INSERT INTO analytics_daily VALUES(?,?,?,?,?,?)').run(bucket,lid,bucket.slice(0,10)+' 00:00:00.000Z',75,'','');
    for(let i=0;i<75;i++) db.prepare('INSERT INTO clicks VALUES(?,?,?,?,?,?)').run(bucket+i,lid,bucket.replace('T',' ').replace('Z','.000Z'),i<30?pid:'',i<30?card:'',i<24?1:0);
  }
  const app = {
    db: () => ({ newQuery: (sql: string) => {
      let bindings: Record<string, unknown> = {};
      const query = { bind: (p: Record<string, unknown>) => { bindings = p; return query; },
        execute: () => db.prepare(sql.replace(/\{:(\w+)\}/g, ':$1')).run(usedBindings(sql, bindings) as never),
        one: (model: object) => { const row=db.prepare(sql.replace(/\{:(\w+)\}/g, ':$1')).get(usedBindings(sql, bindings) as never); if (!row) throw new Error('No rows'); Object.assign(model,row); },
        all: (rows: unknown[]) => { rows.push(...db.prepare(sql.replace(/\{:(\w+)\}/g, ':$1')).all(usedBindings(sql, bindings) as never)); }
      }; return query;
    } }),
    findRecordById: (_collection: string, id: string) => { if (!db.prepare('SELECT id FROM users WHERE id=?').get(id)) throw new Error('Missing user'); return { id }; },
    runInTransaction: (action: (tx: unknown) => void) => { db.exec('BEGIN'); try { action(app); db.exec('COMMIT'); } catch(e) { db.exec('ROLLBACK'); throw e; } }
  };
  function usedBindings(sql: string, values: Record<string, unknown>) { return Object.fromEntries([...sql.matchAll(/\{:(\w+)\}/g)].map(m => [m[1],values[m[1]]])); }
  function DynamicModel(this: object, shape: object) { Object.assign(this,shape); }
  let down!: (a: unknown) => void;
  vm.runInNewContext(readFileSync('pocketbase/pb_migrations/1788610000_add_stats_adjustments.js','utf8'), { DynamicModel, migrate: (up: (a: unknown) => void, rollback: (a: unknown) => void) => { up(app); down=rollback; } });
  const module = { exports: {} };
  vm.runInNewContext(readFileSync('pocketbase/pb_hooks/stats_adjustments.js','utf8'), { module, __hooks: 'hooks', require: () => loadMath(), DynamicModel, arrayOf: () => [], $security: { sha256: (s: string) => createHash('sha256').update(s).digest('hex'), randomString: (length: number) => randomBytes(length).toString('hex').slice(0,length) } });
  return { db, app, service: module.exports as Service, down, buckets };
}

describe('statistics adjustment math', () => {
  it('allocates exact integer totals without exceeding proportional capacities', () => {
    const math=loadMath();
    for(let total=0;total<300;total++) {
      const weights=[1,3,17,41], values=math.allocate(total,weights);
      expect(values.reduce((a,b)=>a+b,0)).toBe(total);
      expect(values.every(n=>Number.isSafeInteger(n)&&n>=0)).toBe(true);
      if(total<=62) expect(values.every((n,i)=>n<=weights[i])).toBe(true);
    }
  });
  it('rejects future, invalid, oversized dates and invalid totals or unique share', () => {
    const math=loadMath();
    for(const changes of [{end:day(0)},{start:'2026-02-30'},{start:day(-92)},{total:-1},{total:1.5},{total:10000001},{uniquePercent:74},{resourceId:'" OR true'},{reason:'short'}]) expect(()=>math.normalize(config(changes))).toThrow();
  });
  it('builds deterministic distributed history for a new resource without individual events', () => {
    const math=loadMath(), c=math.normalize(config());
    const build=()=>math.build(c,[{id:lid,created:day(-30)+' 00:00:00.000Z'}],[],[]);
    const result=build(); expect(result).toEqual(build());
    const all=result.rows.filter(r=>r.dimension_type==='all');
    expect(all.length).toBe(168); expect(Math.max(...all.map(r=>r.total))).toBeLessThan(200);
    expect(all.reduce((a,r)=>a+r.total,0)).toBe(12500);
    expect(all.reduce((a,r)=>a+r.unique_count,0)).toBe(10000);
    for(const dimension of ['country','device','os','browser','referrer']) expect(result.rows.filter(r=>r.dimension_type===dimension).reduce((sum,r)=>sum+r.total,0)).toBe(12500);
    expect(result.rows.every(r=>r.unique_count<=r.total)).toBe(true);
  });
  it('keeps global country quotas even when most hours have only one click', () => {
    const math=loadMath(), result=math.build(math.normalize(config({total:125})),[{id:lid,created:day(-30)+'T00:00:00Z'}],[],[]);
    expect(result.summary.countries.reduce((sum,c)=>sum+c.clicks,0)).toBe(125);
    expect(result.summary.countries.find(c=>c.name==='US')!.clicks).toBe(50);
    expect(result.summary.countries.length).toBe(5);
  });
});

describe('statistics adjustment SQL integration', () => {
  it.each([12500,125,0])('updates totals, all dimensions, timeline, daily counters and card attribution to %i; undo preserves later traffic', total => {
    const {db,app,service,down,buckets}=fixture();
    const p=service.preview(app,uid,actor,config({total}));
    expect(db.prepare('SELECT clicks_count FROM links WHERE id=?').get(lid)!.clicks_count).toBe(150);
    service.change(app,uid,actor,p.id,false);
    service.change(app,uid,actor,p.id,false); // idempotent retry
    expect(service.revision(app,uid)).toBe(1);
    expect(db.prepare('SELECT clicks_count FROM links WHERE id=?').get(lid)!.clicks_count).toBe(total);
    expect(db.prepare('SELECT COALESCE(sum(count),0) AS n FROM analytics_daily WHERE link_id=?').get(lid)!.n).toBe(total);
    const dimensions=db.prepare('SELECT dimension_type,sum(total) AS n FROM analytics_hourly_rollup WHERE link_id=? GROUP BY dimension_type').all(lid);
    expect(dimensions.every(r=>r.n===total)).toBe(true);
    expect(dimensions.length).toBe(total ? 6 : 0);
    if(total===12500) {
      expect(db.prepare("SELECT count(DISTINCT substr(bucket,1,10)) AS n FROM analytics_hourly_rollup WHERE dimension_type='all' AND total>0").get()!.n).toBe(7);
      expect(db.prepare("SELECT max(total) AS n FROM analytics_hourly_rollup WHERE dimension_type='all'").get()!.n).toBeLessThan(total * 0.05);
    }
    expect(db.prepare("SELECT count(*) AS n FROM (SELECT c.link_id,c.bucket,sum(c.total) AS attributed,r.total AS clicks FROM profile_click_hourly_rollup c JOIN analytics_hourly_rollup r ON r.link_id=c.link_id AND r.bucket=c.bucket AND r.dimension_type='all' GROUP BY c.link_id,c.bucket HAVING attributed>clicks)").get()!.n).toBe(0);
    expect(db.prepare("SELECT COALESCE(sum(unique_count),0) AS n FROM analytics_hourly_rollup WHERE dimension_type='all'").get()!.n).toBe(Math.round(total*.8));
    expect(db.prepare('SELECT COALESCE(sum(total),0) AS n FROM profile_click_hourly_rollup').get()!.n).toBe(Math.round(total*.4));
    expect(db.prepare('SELECT count(*) AS n FROM clicks').get()!.n).toBe(150); // untouched source records
    expect(db.prepare('SELECT clicks_count FROM links WHERE user_id=?').get(other)!.clicks_count).toBe(999);
    expect(()=>down(app)).toThrow('Revert applied');
    // A real click arrives after the adjustment, updating the existing aggregates.
    for(const [dimension,value] of [['all',''],['country','US'],['device','Mobile'],['browser','Chrome'],['os','Android'],['referrer','Direct']]) {
      db.prepare('INSERT INTO analytics_hourly_rollup VALUES(?,?,?,?,1,?) ON CONFLICT(link_id,bucket,dimension_type,dimension_value) DO UPDATE SET total=total+1,unique_count=unique_count+excluded.unique_count').run(lid,buckets[0],dimension,value,dimension==='all'?1:0);
    }
    db.prepare('UPDATE links SET clicks_count=clicks_count+1 WHERE id=?').run(lid);
    db.prepare("INSERT INTO analytics_daily VALUES('new',?,?,1,'','') ON CONFLICT(link_id,day) DO UPDATE SET count=count+1").run(lid,buckets[0].slice(0,10)+' 00:00:00.000Z');
    service.change(app,uid,actor,p.id,true); service.change(app,uid,actor,p.id,true);
    expect(db.prepare('SELECT clicks_count FROM links WHERE id=?').get(lid)!.clicks_count).toBe(151);
    expect(db.prepare("SELECT sum(total) AS n FROM analytics_hourly_rollup WHERE dimension_type='all'").get()!.n).toBe(151);
    expect(db.prepare('SELECT sum(total) AS n FROM profile_click_hourly_rollup').get()!.n).toBe(60);
    expect(service.revision(app,uid)).toBe(2);
    down(app); db.close();
  });
  it('adjusts profile views separately, leaving link clicks intact',()=>{
    const {db,app,service}=fixture(); const p=service.preview(app,uid,actor,config({mode:'profile_views',total:1000}));
    service.change(app,uid,actor,p.id,false);
    expect(db.prepare("SELECT sum(total) AS n FROM profile_analytics_hourly_rollup WHERE dimension_type='all'").get()!.n).toBe(1000);
    expect(db.prepare('SELECT clicks_count FROM links WHERE id=?').get(lid)!.clicks_count).toBe(150);
    expect(db.prepare('SELECT sum(total) AS n FROM profile_click_hourly_rollup').get()!.n).toBe(60);
    service.change(app,uid,actor,p.id,true); db.close();
  });
  it('blocks overlapping changes, stale previews, other actors and deleted or transferred resources',()=>{
    const {db,app,service}=fixture(); let p=service.preview(app,uid,actor,config());
    expect(()=>service.change(app,uid,other,p.id,false)).toThrow('own preview');
    db.prepare("UPDATE analytics_hourly_rollup SET total=total+1 WHERE link_id=? AND dimension_type='all'").run(lid);
    expect(()=>service.change(app,uid,actor,p.id,false)).toThrow('changed after');
    p=service.preview(app,uid,actor,config()); service.change(app,uid,actor,p.id,false);
    expect(()=>service.preview(app,uid,actor,config())).toThrow('overlaps');
    db.prepare('UPDATE links SET user_id=? WHERE id=?').run(other,lid);
    expect(()=>service.change(app,uid,actor,p.id,true)).toThrow('removed or transferred');
    expect(db.prepare('SELECT state FROM stats_adjustments WHERE id=?').get(p.id)!.state).toBe('applied'); db.close();
  });
  it('rejects missing and non-admin auth, and never accepts cross-owner access from a regular user',()=>{
    const {db,app,service}=fixture();
    const event=(role:string,target:string)=>({auth:{id:actor,collection:()=>({name:'users'}),get:()=>role},request:{pathValue:()=>uid,url:{query:()=>({get:()=>target})}}});
    expect(()=>service.authorize(app,{auth:null})).toThrow('Sign in');
    expect(()=>service.authorize(app,event('user',''))).toThrow('Administrator');
    expect(service.subject(app,event('user',uid)).status).toBe(403);
    expect(service.subject(app,event('admin',uid)).user!.id).toBe(uid);
    expect(service.authorize(app,event('admin',''))).toBe(uid);
    expect(()=>service.preview(app,uid,actor,config({resourceId:'link00000000002'}))).toThrow('No resources'); db.close();
  });
  it('makes a failed counter consistency check fully atomic',()=>{
    const {db,app,service}=fixture(); db.prepare('UPDATE links SET clicks_count=0 WHERE id=?').run(lid);
    const p=service.preview(app,uid,actor,config({total:0}));
    expect(()=>service.change(app,uid,actor,p.id,false)).toThrow('counters need reconciliation');
    expect(db.prepare("SELECT sum(total) AS n FROM analytics_hourly_rollup WHERE dimension_type='all'").get()!.n).toBe(150);
    expect(db.prepare('SELECT state FROM stats_adjustments WHERE id=?').get(p.id)!.state).toBe('preview'); db.close();
  });
});
