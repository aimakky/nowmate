import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm text-brand-500">← Back</Link>
      </div>
      <div className="max-w-2xl mx-auto px-5 py-8 prose prose-sm text-gray-700">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">利用規約 / Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-8">最終更新日 / Last updated: 2026年4月</p>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">1. 年齢制限 / Age Requirement</h2>
        <p>villiaは18歳以上の方のみご利用いただけます。アカウント作成をもって、この条件を満たすことを確認したものとみなします。</p>
        <p className="text-sm text-gray-500">You must be 18 years of age or older to use villia. By creating an account, you confirm that you meet this requirement.</p>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">2. コミュニティルール / Community Rules</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>すべてのユーザーに対して礼儀正しく、親切に接してください。</li>
          <li>嫌がらせ、脅迫、いじめは禁止です。</li>
          <li>違法・攻撃的・露骨なコンテンツの共有は禁止です。</li>
          <li>勧誘・詐欺・不正行為を目的とした利用は禁止です。</li>
          <li>他人のなりすましは禁止です。</li>
          <li>同意なく他のユーザーの個人情報を共有することは禁止です。</li>
        </ul>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">3. 禁止行為 / Prohibited Activities</h2>
        <p>以下の行為は厳格に禁止されています：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>日本法またはお住まいの国の法律に違反するあらゆる行為。</li>
          <li>人身売買またはあらゆる形態の搾取。</li>
          <li>性的勧誘または露骨なコンテンツの共有。</li>
          <li>自動ボットやユーザーデータのスクレイピング。</li>
          <li>他のユーザーへの自傷・自殺の勧誘・誘導。</li>
          <li>ボイスルームおよびその他の通話機能における無断録音・録画。</li>
          <li>他のユーザーの投稿・発言を本人の同意なく外部SNSへ拡散する行為。</li>
          <li>複数アカウントを用いた通報の乱用（集団通報）。</li>
        </ul>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">4. ボイスルームの利用 / Voice Room Usage</h2>
        <p>ボイスルーム（通話機能）への参加にあたっては、以下の事項に同意するものとします：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>無断録音・録画の禁止：</strong>ボイスルーム内の会話を、参加者全員の同意なく録音・録画・スクリーンショットすることは禁止です。</li>
          <li>他の参加者が不快に感じる発言・行為はお控えください。</li>
          <li>当社はボイスルームでの会話内容を記録・保存しません。ただし、通報があった場合の調査のため、参加記録（入退室時刻・参加者）は保持されます。</li>
        </ul>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">5. コンテンツの取り扱い / Content Policy</h2>
        <p>村（コミュニティ）内の投稿は、そのコミュニティの参加者のためのものです。</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>他のユーザーの投稿を無断でスクリーンショットし、外部SNS等に拡散することは、villiaの精神に反する行為です。本人の同意なく投稿を外部拡散した場合、アカウント停止の対象となることがあります。</li>
          <li>投稿したコンテンツのライセンスは投稿者に帰属しますが、サービス提供・運営・改善を目的として、当社が当該コンテンツを利用することに同意するものとします。</li>
          <li>削除された投稿・メッセージは、<strong>法令遵守・発信者情報開示・不正調査の目的で最大180日間、バックアップとして保持</strong>されることがあります。</li>
        </ul>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">6. 投稿制限・シャドウバン制度（Shadow Ban）</h2>
        <p>villiaでは民度を守るために、以下の自動制限制度を運用しています。</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>シャドウバン（Shadow Ban）</strong>とは、アカウントを完全に停止するのではなく、他のユーザーへの影響を制限する措置です。対象ユーザー本人はアプリを使い続けられますが、投稿が他者に表示されにくくなります。</li>
          <li>複数のユーザーから通報を受けた場合、自動的にシャドウバンが適用されることがあります（5件：7日間 / 10件：30日間 / 20件以上：永久）。</li>
          <li>同一ユーザーからの重複通報は1票としてカウントされます。集団通報による不当なBANを防ぐための仕組みです。</li>
          <li>不当なシャドウバンだと感じた場合は、フィードバック機能またはお問い合わせよりご連絡ください。</li>
        </ul>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">7. 発信者情報の開示 / Sender Information Disclosure</h2>
        <p>当社は、以下の場合に限り、法令に基づき発信者情報を開示することがあります：</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>裁判所・捜査機関からの適法な請求があった場合。</li>
          <li>プロバイダ責任制限法に基づく発信者情報開示請求に応じる場合。</li>
          <li>生命・身体・財産に重大な危険が生じる可能性があると当社が判断した場合。</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">villiaは日本のプロバイダ責任制限法（特定電気通信役務提供者の損害賠償責任の制限及び発信者情報の開示に関する法律）に準拠した運営を行います。</p>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">8. ログの保全 / Log Retention</h2>
        <p>当社は、以下の情報を一定期間保持します：</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>投稿・メッセージの送信記録（IPアドレス、送信日時）：<strong>180日間</strong></li>
          <li>通報記録：<strong>365日間</strong></li>
          <li>アカウント登録情報（電話番号ハッシュ等）：<strong>退会後180日間</strong></li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">これらの情報は、不正行為の調査、法令に基づく開示、ならびにサービスの安全運営を目的として保持されます。詳細は<Link href="/privacy" className="text-brand-500">プライバシーポリシー</Link>をご参照ください。</p>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">9. 精神的健康に関する免責 / Mental Health Disclaimer</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
          <p className="text-sm font-bold text-amber-800 mb-2">⚠️ 重要な免責事項</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
            <li>villiaはコミュニティサービスであり、<strong>精神的健康サポート・カウンセリング・医療サービスではありません</strong>。</li>
            <li>自傷・自殺に関するキーワードを検知した場合、専門機関の連絡先を表示しますが、これはあくまで情報提供であり、当社が精神的健康の責任を負うものではありません。</li>
            <li>精神的な危機状態にある方は、必ず専門の医療機関・相談窓口にご相談ください。</li>
            <li>緊急の場合は <strong>よりそいホットライン：0120-279-338</strong>（24時間）へご連絡ください。</li>
          </ul>
        </div>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">10. アカウント停止・制限 / Account Termination & Restrictions</h2>
        <p>当社は、本利用規約に違反するアカウントを事前通知なく停止または削除する権利を留保します。停止・削除の理由は原則として開示しませんが、不当な処分と考える場合は<Link href="/contact" className="text-brand-500">お問い合わせ</Link>よりご連絡ください。</p>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">11. 免責事項 / Disclaimer & Limitation of Liability</h2>
        <p>villiaは「現状のまま（as is）」で提供されます。当社は以下について責任を負いません：</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>ユーザー同士のやり取りから生じた損害・トラブル。</li>
          <li>他のユーザーの行為によって生じた損害。</li>
          <li>サービスの一時的な中断・障害による損害。</li>
          <li>ユーザーが提供した情報の正確性。</li>
          <li>プラットフォーム上で知り合った人物と実際に会うことから生じるリスク。</li>
        </ul>
        <p className="mt-2">当社の損害賠償責任は、法令上許容される最大限の範囲において、直近3ヶ月間にユーザーが当社に支払った金額を上限とします。</p>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">12. 準拠法・管轄 / Governing Law</h2>
        <p>本利用規約は日本法に準拠し、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>

        {/* ───────────────────────────────── */}
        <h2 className="text-lg font-bold text-gray-800 mt-8 mb-2">13. お問い合わせ / Contact</h2>
        <p>本利用規約に関するご質問は、<Link href="/contact" className="text-brand-500">お問い合わせフォーム</Link>からご連絡ください。</p>

        <div className="mt-10 pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>本規約は2026年4月に改定されました。以前のバージョンとの差分は<Link href="/contact" className="text-brand-400">お問い合わせ</Link>より確認できます。</p>
        </div>
      </div>
    </div>
  )
}
