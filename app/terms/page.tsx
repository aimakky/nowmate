import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm text-brand-500">← Back</Link>
      </div>
      <div className="max-w-2xl mx-auto px-5 py-8 prose prose-sm text-gray-700">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Terms of Use</h1>

        <p className="text-sm text-gray-500 mb-6">Last updated: 2024</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">1. Age Requirement</h2>
        <p>You must be 18 years of age or older to use VILLIA. By creating an account, you confirm that you meet this requirement.</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">2. Community Rules</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Be respectful and kind to all users.</li>
          <li>Do not harass, threaten, or bully anyone.</li>
          <li>Do not share illegal, offensive, or explicit content.</li>
          <li>Do not use the platform for solicitation, scams, or fraud.</li>
          <li>Do not impersonate another person.</li>
          <li>Do not share other users' personal information without consent.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">3. Prohibited Activities</h2>
        <p>The following are strictly prohibited:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Any illegal activity under Japanese law or your home country's law.</li>
          <li>Human trafficking or exploitation of any kind.</li>
          <li>Sexual solicitation or sharing explicit content.</li>
          <li>Automated bots or scraping of user data.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">4. Account Termination & Restrictions</h2>
        <p>We reserve the right to suspend or delete accounts that violate these Terms without prior notice.</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">5. 投稿制限・シャドウバン制度（Shadow Ban）</h2>
        <p>villiaでは民度を守るために、以下の自動制限制度を運用しています。</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>シャドウバン（Shadow Ban）</strong>とは、アカウントを完全に停止するのではなく、他のユーザーへの影響を制限する措置です。対象ユーザー本人はアプリを使い続けられますが、投稿が他者に表示されにくくなります。</li>
          <li>複数のユーザーから通報を受けた場合、自動的にシャドウバンが適用されることがあります（5件：7日間 / 10件：30日間 / 20件以上：永久）。</li>
          <li>シャドウバンは、ルール違反の抑止と健全なコミュニティ維持を目的としています。</li>
          <li>不当なシャドウバンだと感じた場合は、フィードバック機能またはお問い合わせよりご連絡ください。</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500">※ 同一ユーザーからの重複通報は1票としてカウントされます。集団通報による不当なBANを防ぐための仕組みです。</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">6. コンテンツの取り扱いについて</h2>
        <p>村（コミュニティ）内の投稿は、そのコミュニティの参加者のためのものです。他のユーザーの投稿を無断でスクリーンショットし、外部のSNS等に拡散することは、villiaの精神に反する行為です。本人の同意なく投稿を外部拡散した場合、アカウント停止の対象となることがあります。</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">7. Disclaimer</h2>
        <p>VILLIA is provided "as is". We are not responsible for the actions of users. Please exercise caution when meeting people from the platform in person.</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">8. Contact</h2>
        <p>For questions about these Terms, please use our <Link href="/contact" className="text-brand-500">contact form</Link>.</p>
      </div>
    </div>
  )
}
