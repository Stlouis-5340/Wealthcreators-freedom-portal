import { redirect } from "next/navigation";

export const instant = false;

/** Public registration stays closed. Accounts are created from an invite link. */
export default function SignupPage() {
  redirect("/login?notice=invite");
}
