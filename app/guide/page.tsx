import Link from "next/link";
import FooterLink from "../components/FooterLink";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ from?: string }> };

export default async function GuidePage({ searchParams }: Props) {
  const params = await searchParams;
  const showLoginButton = params.from === "consent";

  return (
    <div className="min-h-screen bg-[var(--color-card)] py-8 px-4">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        {/* ヘッダー: 戻るボタン（左・設定へ） + タイトル */}
        <div className="flex items-center gap-3 pb-2">
          <Link
            href="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            aria-label="設定に戻る"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500 font-medium tracking-wide">How to use</p>
            <h1 className="text-xl font-bold text-slate-800">アプリの使い方</h1>
            <p className="text-xs text-slate-500">はじめての方もこれでバッチリ</p>
          </div>
        </div>

        {/* 1. ログイン */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">📱</span>
            <h2 className="text-lg font-bold text-gray-800">1. ログイン</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12">
            Google アカウントでログインします。初回は同意画面の確認が必要です。
          </p>
        </section>

        {/* 2. 記録 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">✏️</span>
            <h2 className="text-lg font-bold text-gray-800">2. 記録をつける</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12">
            「記録」画面で体調・食事・睡眠などを入力して保存します。体温・体重は大きな入力欄で記録しやすく、プロフィールで平熱・体重を設定しているとデフォルト値が自動で入ります。
          </p>
          <p className="text-sm text-gray-600 pl-12 mt-2">
            <strong>今日の記録プログレス</strong> … 今日を選択しているとき「今日の記録 2/6 項目」のように記入済みが表示されます。未記入は点線枠で示され、次に何をすべきか分かりやすくなっています。
          </p>
        </section>

        {/* 食事画像・食事分析 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">📸</span>
            <h2 className="text-lg font-bold text-gray-800">食事画像・食事分析</h2>
          </div>
          <div className="space-y-2 pl-12 text-sm text-gray-600">
            <p>
              記録画面で食事の写真を撮影・アップロードすると、AIが画像から料理内容を読み取り、カロリー・タンパク質・脂質・炭水化物・食物繊維・塩分などの目安を推定します。<strong>文字でメモを書いただけの場合も「文字から栄養を推定」ボタンで、同様にカロリー・PFCなどの数値を推定できます。</strong> 推定結果は記録の栄養欄に反映でき、その日のアドバイス（オネエのコメント）でも食事内容を踏まえたフィードバックを受けられます。
            </p>
            <p className="text-xs text-gray-500">
              分析には OpenAI（画像は GPT-4o、文字は GPT-4o-mini）を使用しています。あくまで推定であり、医療・栄養の判断は主治医や栄養士の指導に従ってください。
            </p>
          </div>
        </section>

        {/* 3. 分析AI */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">📊</span>
            <h2 className="text-lg font-bold text-gray-800">3. 分析AIを見る</h2>
          </div>
          <div className="space-y-3 pl-12 text-sm text-gray-600">
            <p>「分析」画面で期間ごとの傾向やAIのコメントを確認できます。記録が増えるほど、気づきの精度が上がります。</p>
            <p className="font-medium text-gray-700">AIについて</p>
            <p>
              本アプリのAIは、あなたの記録（食事・体調・便・腹痛・運動・アルコール・睡眠・ストレスなど）を<strong>まとめて</strong>見て、因果関係（例：お酒を飲んだ翌日は腹痛、脂っこい食事で便が悪い、生理前でイライラしやすい など）を指摘します。相棒の性格は<strong>基本設定</strong>で「ツンデレ」「厳しめ」「あまあま」「成瀬（勘違いイケメン風）」から選べます。
            </p>
            <p>
              アドバイスは、プロフィール・健康管理で入力した既往歴・服薬・有効にしたモードをサーバー側で安全に参照したうえで生成されます。<strong>医療診断や治療の代替ではありません。</strong> 体の不安がある場合は必ず医師に相談してください。
            </p>
            <p className="font-medium text-gray-700">今日の体調・日次タブの見方</p>
            <p>
              日次タブでは最上部に<strong>今日の体調</strong>カードを表示。グラフ・心身スコア・相関マップ・相棒総評は折りたたみ可能で、最初は相棒総評とグラフを開いた状態です。色はスレート系に統一し、認知負荷を軽減しています。
            </p>
            <p className="font-medium text-gray-700">心身スコア・相関マップ（日次タブ）</p>
            <p>
              記録をもとに「心（メンタル）」と「身（フィジカル）」のスコアを計算し、睡眠↔体調・ストレス↔体調・飲酒→翌日腹痛などの相関を自動検出します。「心身相関の発見」カードで「飲酒した翌日は腹痛が通常の約〇倍」といったパターンが表示されます。
            </p>
            <p className="font-medium text-gray-700">週間・月間グラフ（日次タブ）</p>
            <p>
              分析画面の「日次」タブで「週間 (7日間)」「月間 (30日間)」トグルで表示期間を切り替えられます。体調・腹痛・トイレ・気分・体重・アルコールなどの項目を選んでグラフに追加でき、「相棒の期間総評」も表示されます。同一期間はキャッシュされ、毎回のAPI呼び出しを抑えます。
            </p>
            <p className="font-medium text-gray-700">タブの説明</p>
            <p>
              各タブの下に簡単な説明が出ます。「日次＝直近の傾向を把握」「週次＝週単位のパターン」「月次＝月単位の流れ」「年次＝年間の変化」で、次に何を見ればよいか迷わなくなります。
            </p>
            <p className="font-medium text-gray-700">週次・月次・年次レポート（長期分析）</p>
            <p>
              「週次」「月次」「年次」タブでは、階層構造で蓄積されたAI分析を確認できます。週次は7日分の記録から因果関係を分析、月次は4〜5件の週次要約を総合、年次は12ヶ月分の月次要約から季節性バイオリズム（例：春に体調崩しやすい）を指摘します。毎週月曜・毎月1日・毎年1月1日に自動生成され、手動で「再生成」も可能です。
            </p>
          </div>
        </section>

        {/* 4. 履歴 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">📅</span>
            <h2 className="text-lg font-bold text-gray-800">4. 履歴を確認</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12">
            「履歴」（カレンダー）画面で過去の記録を確認し、必要なら編集・削除できます。
          </p>
        </section>

        {/* ゲーム（モチベーション） */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">🎮</span>
            <h2 className="text-lg font-bold text-gray-800">ゲーム（モチベーション）</h2>
          </div>
          <div className="space-y-2 pl-12 text-sm text-gray-600">
            <p>
              「ゲーム」画面では、記録を続けるほど<strong>ポイント</strong>がたまり、連続で記録した日数が<strong>ストリーク</strong>として表示されます。3日・7日・2週間・30日連続などの達成で<strong>バッジ</strong>を獲得でき、モチベーション維持に役立ちます。
            </p>
            <p>
              <strong>ぽっち（ペット育成）</strong> … ゲーム画面の「ぽっち」カード、または「ぽっちを育てる」からペットを迎えられます。たまったポイントで<strong>餌</strong>（幸福度アップ）や<strong>着せ替え</strong>（リボン・帽子・マフラーなど）を購入して、ぽっちを育てましょう。餌は所持分から「あげる」、衣装は購入後に「着せ替え」で装着できます。
            </p>
            <p>
              <strong>ぽっち×心身相関</strong> … 今日の記録や天気・花粉と連動して、ぽっちの様子が変わります。睡眠が悪いと眠そうな顔😴、花粉シーズン（2〜5月）はマスク😷、ストレスが高いと心配そうな顔😟、体調が悪いと元気のないコメントに。プロフィールで現在地を設定すると、その地域の天気も表示されます。
            </p>
          </div>
        </section>

        {/* リマインダー（服薬・検診） */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">⏰</span>
            <h2 className="text-lg font-bold text-gray-800">リマインダー（服薬・検診）</h2>
          </div>
          <div className="space-y-2 pl-12 text-sm text-gray-600">
            <p>
              設定メニューから「リマインダー」を開くと、<strong>今日の服薬スケジュール</strong>（健康管理で登録した薬と朝・昼・晩・眠前の時刻）と、<strong>検診リマインダー</strong>（病院名・予定日・予約時間・メモを登録。病院名は履歴から選べます）をまとめて確認できます。服薬の表示時刻は健康管理ページの「リマインダー表示時刻」で変更できます。
            </p>
            <p>
              <strong>📱 スマホに通知</strong> … リマインダー画面の「スマホに通知を届ける」ボタンで、服薬時刻・検診予定日にプッシュ通知を受け取れます。服薬通知には、記録に基づいたオネエのアドバイス（AIコメント）も一緒にお届けします。PWAとしてホーム画面に追加すると便利です。
            </p>
            <p>
              <strong>💬 LINE連携</strong> … 設定画面の「LINE連携」から、公式アカウントを友だち追加して連携できます。連携すると、服薬リマインド・検診リマインド（当日・前日）がLINEとウェブ通知で届き、チャットで「体調4」「食事: サラダ」「記録 メモ」のように送るとその日の記録が保存されます。
              「個別の問い合わせ受け付けておりません」と二重に返信される場合は、LINE公式アカウント管理画面の<strong>応答設定</strong>で「応答メッセージ」をオフにしてください。
            </p>
            <p>
              <strong>🤖 LINEで相談</strong> … 連携後は何でも相談できる相棒モード。既往歴・服薬（副作用・飲み合わせ）・年齢・性別・生理周期・IBDなどアプリで設定した情報を前提に、AIが答えます。友だち追加時や返信には「記録」「今日の体調予想」「ペット」「分析」のボタンが表示され、ワンタップで使えます。
            </p>
            <p>
              <strong>📋 Rich Menu</strong> … 友だち追加した瞬間に、チャット下部に「記録」「今日の体調予想」「ペット」「分析」の4つメニューが自動で表示されます。記録・ペット・分析はアプリの各ページへ、今日の体調予想は過去1週間の健康データ・天気・花粉・黄砂・生理情報からAIが今日の体調を予測してLINEで返信します。
            </p>
            <p>
              <strong>🌅 おはよう相棒</strong> … 毎朝、天気・服装・花粉・直近の記録からAIが予測する気分・体調の波をお届けします。プロフィールで現在地を設定すると、その地域の天気が反映されます。
            </p>
            <p className="text-xs text-gray-500">通知・LINE連携は希望者のみの機能です。</p>
            <div id="notification" className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800 mb-2">通知が有効にならない場合</p>
              <p className="text-sm text-gray-700 mb-2"><strong>Android（Chrome）:</strong></p>
              <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1 mb-3">
                <li>画面右上の ︙ メニュー → 設定</li>
                <li>サイトの設定 → 通知</li>
                <li>このサイトを「許可」にする（または「通知設定を開く」ボタンをタップ）</li>
              </ol>
              <p className="text-sm text-gray-700 mb-2"><strong>iPhone（Safari）:</strong></p>
              <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">
                <li>まず「ホームに追加」で PWA としてインストール</li>
                <li>設定アプリ → [アプリ名] または Safari → ウェブサイト → 通知</li>
                <li>このサイトを「許可」にする</li>
              </ol>
            </div>
          </div>
        </section>

        {/* 5. 設定 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">⚙️</span>
            <h2 className="text-lg font-bold text-gray-800">5. 設定</h2>
          </div>
          <div className="space-y-3 pl-12 text-sm text-gray-600">
            <p>「設定」はメニューから3つのページに分かれています。</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>基本設定</strong> … AIの口調（ツンデレ・厳しめ・あまあま・成瀬）と、使用する健康管理モード（IBD・アルコール・メンタル・ボディメイク）のON/OFF。</li>
              <li><strong>プロフィール</strong> … 名前・生年月日・性別・身長・体重・平熱・既往歴。平熱と体重を設定すると、記録画面の体温・体重欄にデフォルト値が表示され入力が楽になります。AIのアドバイスや生理予測に使われます。</li>
              <li><strong>健康管理</strong> … 生理周期（最後の生理開始日・周期・期間）と、服薬中の薬と服用タイミング（朝・昼・晩・眠前）。<strong>薬はNDBオープンデータ（約8,000品目）から候補を検索</strong>して登録でき、AIアドバイスに薬効分類・後発品情報が活用されます。服薬リマインダーで使う表示時刻もここで設定できます。分析画面では服薬中の薬ごとに「PMDAで副作用を確認する」リンクが表示されます。</li>
              <li><strong>リマインダー</strong> … 今日の服薬スケジュールと、検診・通院予定（病院名・日時・メモ）。前日と当日にLINE・ウェブでリマインドされます。</li>
            </ul>
            <p className="font-medium text-gray-700 mt-2">生理周期表示の根拠（ソース）</p>
            <p>
              カレンダーや記録画面に出る「生理予測」「PMS」「排卵日」は、<strong>健康管理ページで入力した「最後の生理開始日」「周期の長さ」「生理期間」だけ</strong>を使って、アプリ内で計算しています。医療機器や他アプリとの連携はなく、表示は目安であり、避妊・妊娠の判断には使わないでください。性別を「女性」にすると、健康管理で生理周期の入力欄が表示されます。
            </p>
          </div>
        </section>

        {/* 6. モードの説明 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">🏷️</span>
            <h2 className="text-lg font-bold text-gray-800">6. モードの説明</h2>
          </div>
          <p className="text-sm text-gray-600 pl-12 mb-2">基本設定でONにしたモードだけ、記録・分析で使えます。</p>
          <ul className="pl-12 text-sm text-gray-600 list-disc list-inside space-y-1">
            <li><strong>IBDモード</strong> 腹痛・トイレ回数などを詳しく記録</li>
            <li><strong>メンタルモード</strong> 気分・睡眠・日記の記録</li>
            <li><strong>ボディメイクモード</strong> 体重・栄養・歩数の記録</li>
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
              className="inline-flex w-full items-center justify-center gap-2 bg-[var(--color-sage)] px-4 py-4 text-sm font-bold text-white hover:opacity-90 transition"
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
