import { Miniflare } from "miniflare";
const mf = new Miniflare({
  modules: true,
  script: `
    export default {
      async fetch(request, env, ctx) {
        try {
          const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kuala_Lumpur",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(new Date());
          return new Response(JSON.stringify(parts));
        } catch(e) {
          return new Response(e.stack, { status: 500 });
        }
      }
    }
  `
});
mf.dispatchFetch("http://localhost").then(r => r.text()).then(console.log);
