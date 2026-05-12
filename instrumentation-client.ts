// Sentry client-side init (browser). Next.js 14+ の公式ファイル名
// `instrumentation-client.ts` を採用 (Turbopack 互換、@sentry/nextjs 推奨)。
// server / edge runtime 初期化は instrumentation.ts 側で行う。
//
// Safety:
//   - DSN を NEXT_PUBLIC_SENTRY_DSN から読む。未設定なら enabled: false で
//     完全 no-op (dev / preview / E2E スモーク中に勝手に送らない)。
//   - Session Replay と長時間 trace は初期段階では off。サンプリング率も低く。
//   - sendDefaultPii: false で User-Agent / IP / cookie の自動添付を無効。

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// App Router のページ遷移を Sentry の navigation transaction として記録する
// 公式 hook。@sentry/nextjs 10.x が export を要求する。
// (DSN 未設定でも export 自体は必要。Sentry.captureRouterTransitionStart は
//  Sentry.init が呼ばれていなければ no-op になる。)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // 環境名 (production / preview / development) を Vercel が自動付与する
    // VERCEL_ENV から取る。ローカル開発時は NODE_ENV (development) フォールバック。
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // 初期段階はトレース 10% のみ。負荷状況を見て段階的に調整。
    tracesSampleRate: 0.1,
    // Session Replay は完全 off (重い + PII リスク)。Phase 2 以降で別途検討。
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // PII (User-Agent / IP / cookie) の自動添付を禁止。
    // 個人情報を必要最小限に絞る。
    sendDefaultPii: false,
    // debug モードは本番では当然 off。dev でも uncomment 不要 (デバッグ時のみ)。
    debug: false,
  })
}
