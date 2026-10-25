import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth-screen";
import { emailConfigured } from "@/lib/email";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Log in · Dripi" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getSessionUser()) redirect("/projects");
  const sp = await props.searchParams;
  const created = sp.created === "1";
  const email = typeof sp.email === "string" ? sp.email : "";
  return <AuthScreen mode="login" notice={created ? `Account created.${emailConfigured() ? " We’ve sent you a welcome email." : ""} Log in with your new password.` : undefined} initialEmail={email} />;
}
