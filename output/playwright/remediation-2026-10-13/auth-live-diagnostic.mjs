import {createRequire} from 'node:module';import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);const {chromium}=require(process.cwd()+'/node_modules/@playwright/test');
const base='https://workforce-one-hrms-demo.noorullahbaig31.workers.dev';const browser=await chromium.launch();const results=[];
for(const width of [1440,768,390,360]){
 const errors=[];const ctx=await browser.newContext({viewport:{width,height:844}});const page=await ctx.newPage();page.on('pageerror',e=>errors.push({url:page.url(),message:e.message,stack:e.stack}));
 try{
 await page.goto(base+'/login');await page.getByRole('button',{name:/Employee/}).click();await page.getByRole('button',{name:'Enter workspace'}).click();await page.waitForURL(base+'/employee');const tour=page.getByRole('button',{name:'Not now'});if(await tour.isVisible())await tour.click();
 await page.goto(base+'/admin');await page.waitForURL(base+'/employee');const tab=await ctx.newPage();tab.on('pageerror',e=>errors.push({url:tab.url(),message:e.message,stack:e.stack}));await tab.goto(base+'/employee/profile');
 if(width<1200)await page.getByRole('button',{name:'User profile & account'}).click();await page.getByRole('button',{name:'Sign out'}).first().click();await page.waitForURL(/\/login/);await tab.reload();await tab.waitForURL(/\/login/);await page.goBack();await page.reload();await page.waitForURL(/\/login/);
 results.push({width,status:errors.length?'Observed page error':'Pass',errors});
 }catch(e){results.push({width,status:'Diagnostic failed',message:e.message.split('\n').slice(0,3).join('\n'),errors})}finally{await page.request.post(base+'/logout',{headers:{Origin:base}}).catch(()=>{});await ctx.close()}
}
await browser.close();writeFileSync('output/playwright/remediation-2026-10-13/auth-live-diagnostic.json',JSON.stringify({base,liveBusinessMutations:false,results},null,2));console.log(JSON.stringify(results,null,2));
