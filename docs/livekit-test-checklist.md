# LiveKit 通話 — 実機テストチェックリスト

本番投入前および機能変更後に上から順に確認してください。

凡例:
- ✅ 自動／API 経由で確認済み
- ⏳ 実機・人手による確認が必要（Claude のサンドボックスでは検証不能）
- ⚠️ 条件付き成功
- ❌ 失敗
- — 未着手

> 最新検証日: 2026-05-04 / 対象 commit: `0a8daee` 直前の baseline 確認時点 / Vercel deploy: `dpl_MqBmpQ6crtQN9DybRyhkoWjmKxe8`
>
> **2026-05-04 確認済**:
> - `/api/debug/env-check` で **3 つすべて `true`** ✅
> - `/api/livekit/token` (空 body) → `400 invalid_room_id` ✅
> - `/api/livekit/token` (UUID + 未認証) → `401 unauthenticated` ✅
> - **debug endpoint は本コミットで削除済み**（削除条件「3 つとも true + 401」を満たしたため）

## 0. 前提

- ✅ Vercel に `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `NEXT_PUBLIC_LIVEKIT_URL` の **3 環境変数** が production runtime に反映済み（2026-05-04 確認）
- ✅ 直近のデプロイは最新 commit を反映
- ✅ Token API は `400 invalid_room_id` / `401 unauthenticated` を正しく返却
- ⏳ テスト用に **2 アカウント以上** 用意（本人確認済み 1 + 未確認 1 が望ましい）

### 0-A. env が Lambda runtime に届いていない場合の切り分け（重要）

token route の env チェック（[`app/api/livekit/token/route.ts:52-54`](../app/api/livekit/token/route.ts:52)）:
```ts
const apiKey    = process.env.LIVEKIT_API_KEY
const apiSecret = process.env.LIVEKIT_API_SECRET
const lkUrl     = process.env.NEXT_PUBLIC_LIVEKIT_URL
if (!apiKey || !apiSecret || !lkUrl) return 503 not_configured
```

**3 つのうち 1 つでも空なら 503 が返る**。Vercel Dashboard で以下を順に確認してください:

1. **変数名の完全一致**（タイポチェック）
   - `LIVEKIT_API_KEY` （アンダースコア、すべて大文字）
   - `LIVEKIT_API_SECRET`
   - `NEXT_PUBLIC_LIVEKIT_URL`（`NEXT_PUBLIC_` 必須）
   - 例: `LIVE_KIT_API_KEY` / `LIVEKIT_KEY` / `LIVEKIT_URL`（NEXT_PUBLIC_ 抜け）はすべて NG

2. **Environments 列の確認**
   - 各変数の右側に **Production** タグが付いているか
   - Preview のみ・Development のみだと Production Lambda は読めない
   - 3 つすべてのチェックボックスを ON

3. **値が空でないこと**
   - Vercel UI で値は `*****` 表示。クリックして編集モードに入ると値が見える
   - 改行・前後スペースが混入していないか（コピペ時に起こる）

4. **再デプロイの順序**
   - 環境変数は **新ビルドにのみ反映**。env 追加 → そのまま放置だと既存ビルドに反映されない
   - Vercel Dashboard → Deployments → 最新 Production deploy の右端「⋯」→ **Redeploy** をクリック
   - もしくは CLI で `git commit --allow-empty -m "chore: trigger redeploy" && git push`
   - **Redeploy 時に "Use existing Build Cache" のチェックを外す** 方が確実（特に NEXT_PUBLIC_* が build-time 埋込のため）

5. **反映確認**
   - 再デプロイ後 1〜2 分待つ
   - `curl -X POST https://www.nowmatejapan.com/api/livekit/token -H "Content-Type: application/json" -d '{}'`
   - → `401 {"error":"unauthenticated"}` が返れば env 反映成功
   - 依然 503 なら 1〜4 を再確認

### 0-B. それでも解決しない場合

- Vercel Functions のログを Dashboard → Functions → `/api/livekit/token` で確認
- 私が token route に追加した `console.error('[livekit/token] env missing:', missing)` で **どの変数が欠けているか** が出る
- 例: `[livekit/token] env missing: ['NEXT_PUBLIC_LIVEKIT_URL']` → URL だけ Production スコープに入っていない

## 1. PC Chrome — 単独入室

- ⏳ `/voice/<roomId>` を開く
- ⏳ 「入室」ボタンが表示される（自動で接続が始まらない）
- ⏳ ボタンを押す → マイク許可ダイアログが出る → 許可
- ⏳ 数秒以内に「LIVE」バッジが緑で点滅する
- ⏳ Console に `[livekit]` 系のエラーがない（`[voice]` の telemetry 行は OK）
- ⏳ 自分のアバターが speaker エリアに表示される
- ⏳ ヘッダーに「N人」参加人数バッジが出る

## 2. PC Chrome — 同一部屋に 2 タブで入室

- ⏳ タブ A: 通常ウィンドウでアカウント A としてログイン → `/voice/<roomId>` 入室
- ⏳ タブ B: シークレットウィンドウでアカウント B としてログイン → 同じ `/voice/<roomId>` 入室
- ⏳ 両タブで相手のアバターが participants に表示される
- ⏳ タブ A で発声 → タブ B から聞こえる
- ⏳ タブ B で発声 → タブ A から聞こえる
- ⏳ 発言中の人のアバターが緑グロー + pulse する
- ⏳ **遅延が 200ms 以内**（声と相手のリアクションの間隔）

## 3. マイクのオンオフ

- ⏳ マイクボタンをタップ → 自分のアバター下に MicOff バッジが赤で点く
- ⏳ 相手のタブから自分の声が聞こえなくなる
- ⏳ もう一度タップ → MicOff バッジが消える
- ⏳ 相手のタブから自分の声が再び聞こえる
- ⏳ ブラウザのアドレスバーのマイクインジケータが OFF/ON で同期する
- ⏳ 開発者ツールに `voice.mic.toggled` のテレメトリ行が出る

## 4. 退出 → クリーンアップ

- ⏳ 退出ボタン → `/voice` に戻る
- ⏳ OS のマイクインジケータ（macOS 上部の橙ドット / iOS 緑バー）が **即座に消える**
- ⏳ 残った相手側の participants から自分が消える
- ⏳ LiveKit Dashboard → Sessions に切断ログが記録される
- ⏳ 開発者ツールに `voice.session.left` + `voice.session.duration` が出る

## 5. 再入室

- ⏳ `/voice/<roomId>` に再度入室
- ⏳ 直前の audio element が残らない（重複再生がない）
- ⏳ 相手側でも自分の再入室が反映される

## 6. iPhone Safari

- ⏳ iPhone（Safari）で `/voice/<roomId>` を開く
- ⏳ 入室ボタンを **タップした直後** にマイク許可ダイアログが出る（タップ前には出ない）
- ⏳ 許可 → 入室成功 → 上部のマイクインジケータが緑に点く
- ⏳ 同部屋に PC Chrome から入室 → 双方向音声を確認
- ⏳ アプリをバックグラウンド（ホーム画面）→ 戻る → 接続が維持されているか自動再接続されている
- ⏳ 退出 → iOS のマイクインジケータが消える

## 7. iPhone Chrome

- ⏳ 同じ手順でマイク許可・接続・双方向音声を確認
- ⏳ PWA インストールせず Safari と同じ挙動

## 8. ネットワーク切断 → 再接続

- ⏳ 入室後、PC で Wi-Fi をオフ → 5 秒待つ → 戻す
- ⏳ 黄色バナー「通話に再接続中…」が出る（spinner 付き）
- ⏳ 5〜15 秒以内に再接続成功 → バナーが消える
- ⏳ 音声が復帰する
- ⏳ 再接続できない場合は赤バナー「通話の接続が切れました」 + 「もう一度入る」retry ボタンが出る
- ⏳ 開発者ツールに `voice.reconnect.started` → `voice.reconnect.recovered` が出る

## 9. マイク許可拒否

- ⏳ PC Chrome のサイト設定でマイクを「ブロック」に設定
- ⏳ 入室 → 黄バナー「マイクが使えません。今は聞き専で参加しています。」
- ⏳ 「もう一度マイクを試す」ボタンが押せる
- ⏳ サイト設定で許可に戻し、ボタン押下 → speaker に昇格できる
- ⏳ 退出ボタンが押せる（操作不能にならない）

## 10. 環境変数未設定（運用ミス対応）

- ✅ **API レベルで確認済**: `curl -X POST https://nowmatejapan.com/api/livekit/token` → `HTTP 503 {"error":"not_configured"}` （2026-05-03 確認）
- ✅ レスポンス body は `{"error":"not_configured"}` のみ。`LIVEKIT_API_KEY` 等の変数名・値・stack trace は漏洩していない
- ⏳ ブラウザでの確認: ログイン状態で `/voice/<roomId>` を開く → 紫バナー「通話機能を準備中です」が出る
- ⏳ **500 ページは表示されない**
- ⏳ DevTools Network → `/api/livekit/token` が `503 { error: 'not_configured' }` を返す
- ⏳ env を投入して再デプロイすれば即復帰する

## 11. ルーム closed

- ⏳ `voice_rooms.status = 'closed'` の部屋を opener として閉じる
- ⏳ 別アカウントで同じ部屋に入ろうとする
- ⏳ 赤バナー「この通話には入れません」+ retry / 一覧に戻る ボタン
- ⏳ DevTools Network → `/api/livekit/token` が 410 `room_closed` を返す

## 12. 10 人想定での挙動

- ⏳ 同部屋に 10 名（3〜4 アカウントを 2〜3 端末ずつ）入室
- ⏳ CPU 使用率が許容範囲（< 30% / マシン）
- ⏳ 音声が破綻しない（lag・チャタリングなし）
- ⏳ LiveKit Dashboard で送受信帯域を確認（音声のみ部屋なら 1 人あたり 〜32kbps）
- ⏳ 1 名がネット低帯域でも残り 9 人は影響を受けない（SFU の利点）

## 13. 退出ガード（Hard close）

- ⏳ 通話中にブラウザタブを閉じる（×ボタン）
- ⏳ LiveKit Dashboard で 30 秒以内に participant が disconnected になる
- ⏳ 残った participants 一覧から自動で消える

## 14. 無音・初回ヒント・参加人数

- ⏳ 入室直後に「はじめての通話？」紫ヒントが 1 度だけ出る（sessionStorage で 2 回目は出ない）
- ⏳ ヘッダーに参加人数バッジ「N人」が出る
- ⏳ 30 秒以上誰も話さなかった時に「🤫 今はみんな静か。『お疲れさま』から始めてみる？」が控えめに出る
- ⏳ 開発者ツールに `voice.silence.detected` が出る

## 15. Token API のセキュリティ（API 経由で確認可能）

- ✅ **2026-05-03 確認済**: 未認証 POST → `HTTP 401` ではなく `HTTP 503 not_configured` を返す（env 未設定が優先）。env 投入後は 401 を返すよう設計
- ✅ レスポンスに `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` の値および変数名は含まれない
- ✅ 不正な roomId（UUID 形式違反）は env 投入後 `400 invalid_room_id` を返す（実装確認）
- ⏳ env 投入後、未認証で UUID を投げて 401 になることを確認
- ⏳ 同一ユーザーで 60 秒に 13 回以上叩いて `429 rate_limited` になることを確認

## 16. ヘルスチェック（毎週）

- ⏳ LiveKit Dashboard → Sessions で過去 7 日のメトリクス
  - ⏳ 切断率 < 5%
  - ⏳ p95 RTT < 100ms
  - ⏳ 平均パケロス < 1%
- ⏳ LiveKit Dashboard → Billing で当月使用量が無料枠／契約枠の 80% 以下
- ⏳ Vercel Functions ログで `/api/livekit/token` の 5xx 率 < 1%

---

## トラブルシューティング早見表

| 症状 | 原因候補 | 対応 |
|------|---------|------|
| 入室ボタン押しても何も起きない | token API が 503 | env 設定を確認、再デプロイ |
| 紫「準備中」 | env 未設定 | LIVEKIT_API_KEY / SECRET / URL を Vercel に追加 |
| 赤「入れません」 | ルーム closed か接続失敗 | DB の voice_rooms.status を確認 |
| 黄「マイクが使えません」 | ブラウザ permission 拒否 | サイト設定からマイク許可 |
| 黄「再接続中…」が解消しない | LiveKit 到達不能 | NEXT_PUBLIC_LIVEKIT_URL を確認、Region 障害を Status Page で確認 |
| 1 タブで自分の声がエコーする | 自分の audio をローカル再生している | 既定では LiveKit はローカル track を再生しない設計。発生したら audioElsRef のフィルタを確認 |
| iOS で接続後 5 秒で切れる | バックグラウンド suspend | 仕様。再接続が走るか確認 |
