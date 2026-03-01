import { redirect } from "next/navigation";

// Root page redirects to the landing page
export default function RootPage() {
  redirect("/landing");
}
