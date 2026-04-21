import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm text-brand-500">← Back</Link>
      </div>
      <div className="max-w-2xl mx-auto px-5 py-8 text-gray-700">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: 2024</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Email address (for account creation)</li>
          <li>Profile information (name, age, nationality, languages, bio, photo)</li>
          <li>Usage data (likes, matches, messages)</li>
          <li>Location area (city/region — not precise GPS coordinates)</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>To operate and improve the service</li>
          <li>To show your profile to other users in your area</li>
          <li>To facilitate matches and messaging</li>
          <li>To investigate reports of abuse</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">Data Sharing</h2>
        <p className="text-sm">We do not sell your personal data to third parties. Your profile is visible to other registered users of Samee.</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">Data Retention</h2>
        <p className="text-sm">Your data is retained while your account is active. You may delete your account at any time from the Settings page.</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">Security</h2>
        <p className="text-sm">We use industry-standard security measures. Passwords are encrypted. Messages are only accessible to matched users.</p>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">Contact</h2>
        <p className="text-sm">For privacy inquiries, please use our <Link href="/contact" className="text-brand-500">contact form</Link>.</p>
      </div>
    </div>
  )
}
