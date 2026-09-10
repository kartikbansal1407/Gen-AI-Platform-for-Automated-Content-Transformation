import { redirect } from "next/navigation";
import { isAuthenticated } from "@/backend/auth";
export default async function Home() {
  redirect((await isAuthenticated()) ? "/dashboard" : "/login");
}
