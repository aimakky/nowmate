// Voice telemetry — 構造化イベントロギング
//
// 設計:
//  - すべて { event, props, ts, sessionId } の形に揃える
//  - 既定では console.info に JSON 1 行で吐く（Vercel Functions のログから後で集計可能）
//  - 将来 Sentry や Datadog に飛ばしたければ logSink を差し替えるだけ
//  - ユーザー個人情報を載せない（user_id はハッシュ化済の short ID のみ）

export type VoiceEventName =
  // 入室フロー
  | 'voice.entry.viewed'         // ルームページに到達
  | 'voice.entry.cta_clicked'    // 「入室」ボタン押下
  | 'voice.token.requested'      // /api/livekit/token を呼び出した
  | 'voice.token.success'        // token 取得成功
  | 'voice.token.failed'         // token 取得失敗（reason 同梱）
  | 'voice.connect.started'      // LiveKit 接続開始
  | 'voice.connect.success'      // 接続完了
  | 'voice.connect.failed'       // 接続失敗
  // マイク
  | 'voice.mic.requested'        // setMicrophoneEnabled(true) 呼び出し
  | 'voice.mic.granted'          // 成功
  | 'voice.mic.denied'           // ユーザー or OS が拒否
  | 'voice.mic.toggled'          // ミュート/アンミュート
  // ライフサイクル
  | 'voice.reconnect.started'
  | 'voice.reconnect.recovered'
  | 'voice.session.left'
  // 滞在/離脱
  | 'voice.session.duration'     // 入室→退出までの秒
  | 'voice.silence.detected'     // 30 秒以上発話 0
  // YouTube 同時視聴（broadcast 経由・DB なし）
  | 'voice.youtube.shared'       // 誰かが URL を共有
  | 'voice.youtube.stopped'      // 共有を停止

interface BaseProps {
  roomId?:    string
  /** 短縮 user_id（追跡しすぎない） */
  userTag?:   string
  /** ms の RTT / 接続にかかった時間など */
  ms?:        number
  /** error の理由文字列 */
  reason?:    string
  /** participants 数 */
  size?:      number
  /** is_listener / is_speaker などの初期モード */
  mode?:      string
}

type LogSink = (line: string) => void
let sink: LogSink = (line) => { try { console.info(line) } catch { /* noop */ } }

export function setLogSink(s: LogSink) { sink = s }

let sessionId: string | null = null
function getSessionId(): string {
  if (sessionId) return sessionId
  if (typeof window === 'undefined') return 'srv'
  try {
    const k = 'samee_voice_session_v1'
    let v = sessionStorage.getItem(k)
    if (!v) {
      v = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID().slice(0, 12)
        : Math.random().toString(36).slice(2, 14)
      sessionStorage.setItem(k, v)
    }
    sessionId = v
    return v
  } catch { return 'anon' }
}

/** user_id を 8 文字に短縮（個人特定はできない、紐付けはできる） */
export function userTag(userId: string | null | undefined): string | undefined {
  if (!userId) return undefined
  return userId.slice(0, 8)
}

/** イベントを構造化 1 行 JSON で記録 */
export function logVoice(event: VoiceEventName, props: BaseProps = {}): void {
  const line = JSON.stringify({
    ev:  event,
    ts:  Date.now(),
    sid: getSessionId(),
    ...props,
  })
  sink(`[voice] ${line}`)
}

/** 入室時刻を記録して、退出時に経過時間を返すユーティリティ */
const t0Map = new Map<string, number>()
export function startTimer(key: string): void {
  t0Map.set(key, Date.now())
}
export function endTimer(key: string): number | undefined {
  const t0 = t0Map.get(key)
  if (!t0) return undefined
  t0Map.delete(key)
  return Date.now() - t0
}
