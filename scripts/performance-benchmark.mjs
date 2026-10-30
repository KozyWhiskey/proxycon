import {spawn} from 'node:child_process';import {mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const args=process.argv.slice(2),value=name=>args.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const base=value('--base-url');if(!['http://127.0.0.1:3045','https://upkeep.vercel.app'].includes(base)||!args.includes('--allow-live-fixture'))throw Error('Specify an allowed --base-url and --allow-live-fixture. The benchmark creates and removes only marked disposable test data.');
const samples=Number(value('--samples')||4);if(!Number.isInteger(samples)||samples<1||samples>30)throw Error('Samples must be 1–30');
const navigationSamples=Number(value('--navigation-samples')||20);if(!Number.isInteger(navigationSamples)||navigationSamples<1||navigationSamples>30)throw Error('Navigation samples must be 1–30');
const folder=resolve('.next-verify/performance/runs/'+new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(folder,{recursive:true});
const env={...process.env,PROXYCON_PERFORMANCE_FIXTURE:'true',PERFORMANCE_MANIFEST:resolve(folder,'private-session.json'),PERF_BASE_URL:base,PERF_REPS:String(samples),PERF_NAV_REPS:String(navigationSamples),PERF_OUTPUT:resolve(folder,'navigation.json'),PERF_ACTION_OUTPUT:resolve(folder,'results.json'),PERF_ACTION_REPS:'5'};
const run=(script,...args)=>new Promise((accept,reject)=>{const p=spawn(process.execPath,[script,...args],{env,stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',c=>c?reject(Error(script+' failed ('+c+')')):accept());});
try {await run('scripts/fixtures/performance-live.mjs');await run('scripts/performance-navigation.mjs');await run('scripts/fixtures/performance-live.mjs','scale');await run('scripts/performance-result.mjs');}
finally {await run('scripts/fixtures/performance-live.mjs','cleanup');}
await writeFile(resolve(folder,'run.json'),JSON.stringify({base,samples,navigationSamples,at:new Date().toISOString(),cleanup:'completed'},null,2));console.log('Benchmark results:',folder);
