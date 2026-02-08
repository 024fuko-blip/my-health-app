export const dynamic = 'force-dynamic';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-2xl rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">利用規約</h1>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">1. 適用</h2>
          <p className="text-sm text-gray-700">
            本規約は、本アプリの提供する各種サービス（以下「本サービス」）の利用条件を定めるものです。
            利用者は本規約に同意の上、本サービスを利用するものとします。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">2. アカウント</h2>
          <p className="text-sm text-gray-700">
            本サービスの利用には Google アカウントによる認証が必要です。利用者は自身の責任において
            アカウント情報を管理し、第三者に不正利用されないよう十分注意してください。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">3. 健康情報の取り扱い</h2>
          <p className="text-sm text-gray-700">
            本サービスは体調・食事・生活習慣等の記録を扱いますが、医療行為を目的としたものではありません。
            診断や治療が必要な場合は、必ず医療機関へご相談ください。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">4. 禁止事項</h2>
          <ul className="text-sm text-gray-700 list-disc pl-5">
            <li>本サービスの運営を妨害する行為</li>
            <li>不正アクセス、またはそれを試みる行為</li>
            <li>他者の権利を侵害する行為</li>
            <li>法令または公序良俗に反する行為</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">5. 免責事項</h2>
          <p className="text-sm text-gray-700">
            本サービスの内容は、正確性・有用性を保証するものではありません。
            利用者が本サービスを利用したことにより生じた損害について、運営者は一切の責任を負いません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">6. サービスの変更・停止</h2>
          <p className="text-sm text-gray-700">
            運営者は、事前の通知なく本サービスの内容を変更または停止することがあります。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-800">7. 改定</h2>
          <p className="text-sm text-gray-700">
            本規約は必要に応じて改定します。改定後は本ページにて通知します。
          </p>
        </section>
      </div>
    </div>
  );
}
