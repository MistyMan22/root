import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to tasks page by default
  redirect("/tasks");
}
