// Sentry server-side init (Node.js runtime).
// instrumentation.ts から NEXT_RUNTIME === 'nodejs' のときに import される。
//
// Safety:
//   - SENTRY_DSN または NEXT_PUBLIC_SENTRY_DSN のどちらかが設定されていれば有効化。
//   - DSN 未設定の dev / E2E スモーク中は no-op で発火しない。

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    debug: false,
  })
}
