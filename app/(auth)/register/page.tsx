import { redirect } from 'next/navigation';

/** Google 認証に統一。新規登録は /login の Google ログインで自動作成される */
export default function RegisterPage() {
  redirect('/login');
}
