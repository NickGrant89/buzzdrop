import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AdminLoginPage from "./AdminLoginClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <AdminLoginPage />
    </Suspense>
  );
}
