import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth-screen";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Sign up · Dripi" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/projects");
  return <AuthScreen mode="signup" />;
}
