import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/backend/auth";
import { productSections } from "@/lib/product";
import { ContentForgeApp } from "@/frontend/components/content-forge-app";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const selected = productSections.find((item) => item.id === section);
  if (!selected) notFound();
  if (!(await isAuthenticated())) redirect("/login");
  return <ContentForgeApp section={selected.id} />;
}
