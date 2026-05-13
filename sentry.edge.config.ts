// Sentry edge-runtime init (Vercel Edge / middleware.ts 経路で実行される箇所)。
// instrumentation.ts から NEXT_RUNTIME === 'edge' のときに import される。
//
// 注: edge runtime は API が制限されているため、最小構成のみ。

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
