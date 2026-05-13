// Next.js App Router instrumentation entry。
// Sentry の server / edge 初期化をランタイム別に呼び分ける。
// @sentry/nextjs の公式ガイドに沿った最小実装。
//
// 公式: https://docs.sentry.io/platforms/javascript/guides/nextjs/

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// App Router の uncaught server-side error を Sentry に送る公式 hook。
// React Server Component / Route Handler / Server Action のいずれで
// 投げられた error もここに到達する。
export { captureRequestError as onRequestError } from '@sentry/nextjs'
