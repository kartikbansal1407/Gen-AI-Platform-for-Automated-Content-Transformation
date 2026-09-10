import { redirect } from "next/navigation";
import { isAuthenticated } from "@/backend/auth";
import { ContentForgeApp } from "@/frontend/components/content-forge-app";

export default async function OmniFormPage() {
  if (!(await isAuthenticated())) redirect("/login");
  return <ContentForgeApp section="omniform" />;
}
