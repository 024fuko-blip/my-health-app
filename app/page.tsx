import { redirect } from 'next/navigation';

// トップページ (/) に来たら、自動的に /dashboard に転送する
export default function RootPage() {
  redirect('/dashboard');
}