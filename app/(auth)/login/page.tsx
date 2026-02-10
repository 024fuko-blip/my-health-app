export const dynamic = "force-dynamic";

import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="text-gray-500">読み込み中...</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
