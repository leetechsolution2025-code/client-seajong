import { redirect } from "next/navigation";

export default function Home() {
  // Client project: redirect thẳng về trang login
  redirect("/login");
}

export const dynamic = "force-dynamic";
