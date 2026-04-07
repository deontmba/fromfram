import { redirect } from "next/navigation";

export default function Home() {
  redirect("/subscription/select-plan");
}
