import { redirect } from "next/navigation";
import { isAuthenticated } from "@/backend/auth";
import { SignIn } from "@/frontend/components/sign-in";
export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/dashboard");
  const demo =
    process.env.NODE_ENV !== "production" &&
    !process.env.CONTENT_FORGE_ACCESS_CODE &&
    !process.env.ORBITA_ACCESS_CODE;
  return <SignIn demo={demo} />;
}
