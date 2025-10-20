import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to the today page by default
  redirect("/today");
}
