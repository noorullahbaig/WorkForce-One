import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "../app/context";
import { resetDemoData } from "../app/services/reset.server";

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	fetch(request, env, ctx) {
		const provider = new RouterContextProvider();
		provider.set(cloudflareContext, { env, ctx });
		return requestHandler(request, provider);
	},
	async scheduled(_controller, env, ctx) {
		ctx.waitUntil(resetDemoData(env.DB));
	},
} satisfies ExportedHandler<Env>;
