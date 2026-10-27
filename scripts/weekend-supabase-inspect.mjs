import {readFile} from 'node:fs/promises';
import {parse} from 'dotenv';
const env=parse(await readFile('.env.local','utf8'));
const origin=new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;
if(origin!=='https://apnwvugvwlfopxtryjwk.supabase.co')throw new Error('Unexpected Supabase destination');
const response=await fetch(origin+'/rest/v1/',{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,Accept:'application/openapi+json'}});
console.log('Configured Supabase REST status:',response.status);
if(!response.ok)process.exitCode=1;
else{const schema=await response.json();console.log('RPCs:',Object.keys(schema.paths||{}).filter(p=>p.startsWith('/rpc/')).map(p=>p.slice(5)).sort().join(', '));await import('node:fs/promises').then(fs=>fs.mkdir('.next-verify',{recursive:true}).then(()=>fs.writeFile('.next-verify/weekend-rest-schema.json',JSON.stringify(schema))));}
