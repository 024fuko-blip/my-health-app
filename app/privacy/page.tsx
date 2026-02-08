export const dynamic = 'force-dynamic';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-2xl rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">1. 取得する情報</h2>
          <p className="text-sm text-gray-700">
            本アプリは、Google ログインを通じて以下の情報を取得します。
          </p>
          <ul className="text-sm text-gray-700 list-disc pl-5">
            <li>メールアドレス</li>
            <li>氏名（Google アカウントに設定されている場合）</li>
            <li>プロフィール画像（Google アカウントに設定されている場合）</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">2. 利用目的</h2>
          <p className="text-sm text-gray-700">
            取得した情報は、以下の目的で利用します。
          </p>
          <ul className="text-sm text-gray-700 list-disc pl-5">
            <li>ユーザー認証および本人確認</li>
            <li>アカウントの作成および管理</li>
            <li>サービス提供・改善のための分析</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">3. 第三者提供</h2>
          <p className="text-sm text-gray-700">
            法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">4. 保存期間</h2>
          <p className="text-sm text-gray-700">
            取得した情報は、サービス提供に必要な期間に限り保存し、不要となった場合は適切に削除します。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">5. お問い合わせ</h2>
          <p className="text-sm text-gray-700">
            本ポリシーに関するお問い合わせは、運営者までご連絡ください。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">6. 改定</h2>
          <p className="text-sm text-gray-700">
            本ポリシーは必要に応じて改定します。改定後は本ページにて通知します。
          </p>
        </section>
      </div>
    </div>
  );
}
