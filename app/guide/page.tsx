import Link from "next/link";
import FooterLink from "../components/FooterLink";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ from?: string }> };

export default async function GuidePage({ searchParams }: Props) {
  const params = await searchParams;
  const showLoginButton = params.from === "consent";

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/80 via-white to-sky-50/60 py-8 px-4">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        {/* ヘッダー: 戻るボタン（左・設定へ） + タイトル */}
        <div className="flex items-center gap-3 pb-2">
          <Link
            href="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm border border-rose-100 text-gray-700 hover:bg-rose-50 transition"
            aria-label="設定に戻る"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose-400 font-medium tracking-wide">How to use</p>
            <h1 className="text-xl font-bold text-gray-800">アプリの使い方</h1>
            <p className="text-xs text-gray-500">はじめての方もこれでバッチリ</p>
          </div>
        </div>

        {/* 1. ログイン */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-rose-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg">📱</span>
            <h2 className="text-lg font-bold text-gray-800">1. ログイン</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12">
            Google アカウントでログインします。初回は同意画面の確認が必要です。
          </p>
        </section>

        {/* 2. 記録 */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-amber-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">✏️</span>
            <h2 className="text-lg font-bold text-gray-800">2. 記録をつける</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12">
            「記録」画面で体調・食事・睡眠などを入力して保存します。
          </p>
        </section>

        {/* 食事画像・食事分析 */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-emerald-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg">📸</span>
            <h2 className="text-lg font-bold text-gray-800">食事画像・食事分析</h2>
          </div>
          <div className="space-y-2 pl-12 text-sm text-gray-600">
            <p>
              記録画面で食事の写真を撮影・アップロードすると、AIが画像から料理内容を読み取り、カロリー・タンパク質・脂質・炭水化物・食物繊維・塩分などの目安を推定します。<strong>文字でメモを書いただけの場合も「文字から栄養を推定」ボタンで、同様にカロリー・PFCなどの数値を推定できます。</strong> 推定結果は記録の栄養欄に反映でき、その日のアドバイス（オネエのコメント）でも食事内容を踏まえたフィードバックを受けられます。
            </p>
            <p className="text-xs text-gray-500">
              分析には OpenAI（画像は GPT-4o、文字は GPT-4o-mini）を使用しています。あくまで推定であり、医療・ダイエットの判断は主治医や栄養士の指導に従ってください。
            </p>
          </div>
        </section>

        {/* 3. 分析AI */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-violet-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg">📊</span>
            <h2 className="text-lg font-bold text-gray-800">3. 分析AIを見る</h2>
          </div>
          <div className="space-y-3 pl-12 text-sm text-gray-600">
            <p>「分析」画面で期間ごとの傾向やAIのコメントを確認できます。記録が増えるほど、気づきの精度が上がります。</p>
            <p className="font-medium text-gray-700">AIについて</p>
            <p>
              本アプリのAIは、あなたの記録（食事・体調・便・腹痛・運動・アルコール・睡眠・ストレスなど）を<strong>まとめて</strong>見て、因果関係（例：お酒を飲んだ翌日は腹痛、脂っこい食事で便が悪い、生理前でイライラしやすい など）を指摘します。話し方は<strong>基本設定</strong>で「ツンデレ（オネエ）」「あまあま」「イケメン口調」から選べます。
            </p>
            <p>
              アドバイスは、プロフィール・健康管理で入力した既往歴・服薬・有効にしたモードをサーバー側で安全に参照したうえで生成されます。<strong>医療診断や治療の代替ではありません。</strong> 体の不安がある場合は必ず医師に相談してください。
            </p>
            <p className="font-medium text-gray-700">週間・月間グラフ</p>
            <p>
              画面上部の「週間 (7日間)」「月間 (30日間)」トグルで表示期間を切り替えられます。体調・腹痛・トイレ・気分・体重・アルコールなどの項目を選んでグラフに追加でき、「オネエの期間総評」も表示されます。
            </p>
          </div>
        </section>

        {/* 4. 履歴 */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-sky-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg">📅</span>
            <h2 className="text-lg font-bold text-gray-800">4. 履歴を確認</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12">
            「履歴」（カレンダー）画面で過去の記録を確認し、必要なら編集・削除できます。
          </p>
        </section>

        {/* ゲーム（モチベーション） */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-amber-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">🎮</span>
            <h2 className="text-lg font-bold text-gray-800">ゲーム（モチベーション）</h2>
          </div>
          <div className="space-y-2 pl-12 text-sm text-gray-600">
            <p>
              「ゲーム」画面では、記録を続けるほど<strong>ポイント</strong>がたまり、連続で記録した日数が<strong>ストリーク</strong>として表示されます。3日・7日・2週間・30日連続などの達成で<strong>バッジ</strong>を獲得でき、モチベーション維持に役立ちます。
            </p>
            <p>
              <strong>ぽっち（ペット育成）</strong> … ゲーム画面の「ぽっち」カード、または「ぽっちを育てる」からペットを迎えられます。たまったポイントで<strong>餌</strong>（幸福度アップ）や<strong>着せ替え</strong>（リボン・帽子・マフラーなど）を購入して、ぽっちを育てましょう。餌は所持分から「あげる」、衣装は購入後に「着せ替え」で装着できます。
            </p>
          </div>
        </section>

        {/* リマインダー（服薬・検診） */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-green-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg">⏰</span>
            <h2 className="text-lg font-bold text-gray-800">リマインダー（服薬・検診）</h2>
          </div>
          <div className="space-y-2 pl-12 text-sm text-gray-600">
            <p>
              設定メニューから「リマインダー」を開くと、<strong>今日の服薬スケジュール</strong>（健康管理で登録した薬と朝・昼・晩・眠前の時刻）と、<strong>検診リマインダー</strong>（健康診断など予定日の登録・一覧・削除）をまとめて確認できます。服薬の表示時刻は健康管理ページの「リマインダー表示時刻」で変更できます。
            </p>
            <p>
              <strong>📱 スマホに通知</strong> … リマインダー画面の「スマホに通知を届ける」ボタンで、服薬時刻・検診予定日にプッシュ通知を受け取れます。PWAとしてホーム画面に追加すると便利です。
            </p>
          </div>
        </section>

        {/* 5. 設定 */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-pink-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-lg">⚙️</span>
            <h2 className="text-lg font-bold text-gray-800">5. 設定</h2>
          </div>
          <div className="space-y-3 pl-12 text-sm text-gray-600">
            <p>「設定」はメニューから3つのページに分かれています。</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>基本設定</strong> … AIの口調（ツンデレ・あまあま・イケメン）と、使用する健康管理モード（IBD・アルコール・メンタル・ボディメイク）のON/OFF。</li>
              <li><strong>プロフィール</strong> … 名前・生年月日・性別・身長・体重・既往歴。AIのアドバイスや生理予測に使われます。</li>
              <li><strong>健康管理</strong> … 生理周期（最後の生理開始日・周期・期間）と、服薬中の薬と服用タイミング（朝・昼・晩・眠前）。服薬リマインダーで使う表示時刻もここで設定できます。</li>
              <li><strong>リマインダー</strong> … 今日の服薬スケジュールの確認と、検診予定の追加・一覧・削除。</li>
            </ul>
            <p className="font-medium text-gray-700 mt-2">生理周期表示の根拠（ソース）</p>
            <p>
              カレンダーや記録画面に出る「生理予測」「PMS」「排卵日」は、<strong>健康管理ページで入力した「最後の生理開始日」「周期の長さ」「生理期間」だけ</strong>を使って、アプリ内で計算しています。医療機器や他アプリとの連携はなく、表示は目安であり、避妊・妊娠の判断には使わないでください。性別を「女性」にすると、健康管理で生理周期の入力欄が表示されます。
            </p>
          </div>
        </section>

        {/* 6. モードの説明 */}
        <section className="rounded-2xl bg-white/90 p-5 shadow-sm border border-indigo-100/80">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg">🏷️</span>
            <h2 className="text-lg font-bold text-gray-800">6. モードの説明</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12 mb-2">基本設定でONにしたモードだけ、記録・分析で使えます。</p>
          <ul className="pl-12 text-sm text-gray-600 list-disc list-inside space-y-1">
            <li><strong>IBDモード</strong> 腹痛・トイレ回数などを詳しく記録</li>
            <li><strong>メンタルモード</strong> 気分・睡眠・日記の記録</li>
            <li><strong>ダイエットモード</strong> 体重・栄養・歩数の記録</li>
          </ul>
        </section>

        {/* 開発者向け */}
        <section className="rounded-xl bg-gray-50/80 px-4 py-3 border border-gray-100">
          <p className="text-xs text-gray-400 italic">
            ※ 機能を追加・変更したときは、このページの該当セクションを更新してください。（開発者向け）
          </p>
        </section>

        {/* ログインへ進む（同意後のときだけ） */}
        {showLoginButton && (
          <div className="pt-2">
            <a
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-rose-200/50 hover:from-rose-600 hover:to-rose-700 transition-all"
            >
              <span>ログインへ進む</span>
              <span aria-hidden>→</span>
            </a>
          </div>
        )}

        <footer className="pt-6 pb-4">
          <FooterLink />
        </footer>
      </div>
    </div>
  );
}
