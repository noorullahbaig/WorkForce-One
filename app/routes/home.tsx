import { redirect } from "react-router";
import { getUser } from "../services/auth.server";
import { cloudflareContext } from "../context";
import type { Route } from "./+types/home";

export async function loader({ request, context }: Route.LoaderArgs) {
	const user = await getUser(request, context.get(cloudflareContext).env);
	throw redirect(user ? (user.role === "admin" ? "/admin" : "/employee") : "/login");
}

export default function Home() { return null; }
