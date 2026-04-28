import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm text-brand-500">← Back</Link>
      </div>
      <div className="max-w-2xl mx-auto px-5 py-8 prose prose-sm text-gray-700">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-gray-500 mb-8">最終更新日：2026年4月</p>

        <p className="text-sm leading-relaxed">
          villia（以下「当サービス」）は、ユーザーのプライバシーを最大限尊重します。
          本プライバシーポリシーは、当サービスが収集する情報、その利用目的、保管方法、および開示条件について説明します。
        </p>

        {/* 1 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">1. 収集する情報</h2>
        <h3 className="text-base font-bold text-gray-700 mt-4 mb-1">1-1. アカウント登録時に収集する情報</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>電話番号（ハッシュ化して保存・認証目的）</li>
          <li>表示名・プロフィール画像・自己紹介文</li>
          <li>メールアドレス（任意・通知目的）</li>
        </ul>

        <h3 className="text-base font-bold text-gray-700 mt-4 mb-1">1-2. サービス利用時に自動収集する情報</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>IPアドレス（投稿・送信時にログに記録）</li>
          <li>デバイス情報（OS種別・ブラウザ種別）</li>
          <li>アクセス日時・操作ログ</li>
          <li>投稿・メッセージ・漂流瓶のコンテンツ</li>
          <li>通報履歴・受信通報</li>
        </ul>

        <h3 className="text-base font-bold text-gray-700 mt-4 mb-1">1-3. 収集しない情報</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>クレジットカード・銀行口座情報（決済は外部サービス経由）</li>
          <li>位置情報（GPSデータ）</li>
          <li>ボイスルームの会話内容（録音・録音ログは保持しない）</li>
        </ul>

        {/* 2 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">2. 情報の利用目的</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>サービスの提供・運営・改善</li>
          <li>ユーザーサポートへの対応</li>
          <li>不正利用・規約違反の検知・対応</li>
          <li>法令に基づく情報開示への対応</li>
          <li>サービスの安全性・信頼性の維持</li>
          <li>新機能・キャンペーンのお知らせ（オプトアウト可）</li>
        </ul>

        {/* 3 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">3. 情報の保管期間</h2>
        <div className="overflow-x-auto mt-2 not-prose">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-stone-50">
                <th className="text-left p-2 border border-stone-200 font-bold">情報の種類</th>
                <th className="text-left p-2 border border-stone-200 font-bold">保管期間</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-stone-200">投稿・メッセージ（送信ログ含む）</td>
                <td className="p-2 border border-stone-200">削除後180日間</td>
              </tr>
              <tr className="bg-stone-50">
                <td className="p-2 border border-stone-200">IPアドレス（投稿・送信時）</td>
                <td className="p-2 border border-stone-200">180日間</td>
              </tr>
              <tr>
                <td className="p-2 border border-stone-200">通報履歴</td>
                <td className="p-2 border border-stone-200">365日間</td>
              </tr>
              <tr className="bg-stone-50">
                <td className="p-2 border border-stone-200">アカウント登録情報</td>
                <td className="p-2 border border-stone-200">退会後180日間</td>
              </tr>
              <tr>
                <td className="p-2 border border-stone-200">電話番号ハッシュ</td>
                <td className="p-2 border border-stone-200">退会後2年間（再登録制限目的）</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">※ 法令に基づく保全要請がある場合、上記期間を超えて保持することがあります。</p>

        {/* 4 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">4. 第三者への情報提供</h2>
        <p>当社は以下の場合を除き、ユーザー情報を第三者に提供しません：</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>ユーザーの同意がある場合</li>
          <li>裁判所・捜査機関からの適法な令状・要請がある場合</li>
          <li>プロバイダ責任制限法に基づく発信者情報開示請求に対応する場合</li>
          <li>生命・身体・財産への重大な危険を防止するため必要な場合</li>
          <li>サービス運営に必要な委託先（Supabase, Vercel等）への提供（守秘義務契約あり）</li>
        </ul>

        {/* 5 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">5. セキュリティ</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>通信はすべてHTTPS（TLS 1.2以上）で暗号化されます。</li>
          <li>電話番号はハッシュ化して保存し、原文は保持しません。</li>
          <li>データベースはRow Level Security（RLS）により、他のユーザーのデータに直接アクセスできない設計です。</li>
          <li>定期的なセキュリティレビューを実施します。</li>
        </ul>

        {/* 6 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">6. ユーザーの権利</h2>
        <p>ユーザーは以下の権利を有します：</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>開示請求：</strong>当社が保有するご自身の情報の開示を請求できます。</li>
          <li><strong>訂正・削除：</strong>不正確な情報の訂正、または情報の削除を請求できます。</li>
          <li><strong>利用停止：</strong>一定の場合、個人情報の利用停止を請求できます。</li>
          <li><strong>退会：</strong>いつでもアカウントを削除できます。削除後も保管期間中のデータは上記ポリシーに従い保持されます。</li>
        </ul>
        <p className="mt-2 text-sm">権利行使のご請求は<Link href="/contact" className="text-brand-500">お問い合わせフォーム</Link>からご連絡ください。本人確認の上、合理的な期間内に対応します。</p>

        {/* 7 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">7. Cookie・ローカルストレージ</h2>
        <p>当サービスは以下の目的でCookieおよびlocalStorageを使用します：</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>ログイン状態の維持（セッションCookie）</li>
          <li>機能設定の保存（投稿制限カウント、スロウモード等）</li>
          <li>アクセス解析（匿名化した利用統計）</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">分析ツールによる第三者Cookieは使用していません。</p>

        {/* 8 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">8. 未成年者のプライバシー</h2>
        <p>当サービスは18歳以上を対象としており、18歳未満の方の利用を意図していません。18歳未満の方の情報を収集したと判明した場合、速やかに削除します。</p>

        {/* 9 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">9. ポリシーの変更</h2>
        <p>本ポリシーを変更する場合、サービス内またはメール（登録がある場合）で事前に通知します。重要な変更の場合、再同意を求めることがあります。</p>

        {/* 10 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">10. 準拠法・管轄</h2>
        <p>本ポリシーは日本法（個人情報の保護に関する法律）に準拠します。</p>

        {/* 11 */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">11. お問い合わせ</h2>
        <p>個人情報の取り扱いに関するご質問・ご要望は、<Link href="/contact" className="text-brand-500">お問い合わせフォーム</Link>からご連絡ください。</p>

        <div className="mt-10 pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>本ポリシーは2026年4月に制定されました。</p>
        </div>
      </div>
    </div>
  )
}
