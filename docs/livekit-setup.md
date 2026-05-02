# LiveKit セットアップ手順 (samee 通話基盤)

samee の通話は **LiveKit (SFU)** で実装されています。Mesh WebRTC は廃止しました。

---

## 1. LiveKit Cloud のアカウントとプロジェクト

1. https://cloud.livekit.io/ にサインアップ（Google ログイン推奨）
2. 新規プロジェクトを作成。Region は **Tokyo (ap-northeast-1)** を選ぶ（国内ユーザー向けの遅延最小化）
3. プロジェクト Dashboard → **Settings** で以下を控える:
   - **Project URL**（例: `wss://samee-xyz.livekit.cloud`）
   - **API Keys** タブで `Generate API Key` → API Key と Secret をコピー（**Secret は1度しか表示されない** ので忘れずに保管）

---

## 2. 環境変数の設定（必須3つ）

| 変数名 | 値の取得元 | スコープ | クライアント露出 |
|--------|-----------|---------|---------------|
| `LIVEKIT_API_KEY` | LiveKit Dashboard → Settings → Keys → API Key | サーバー専用 | ❌ 漏らさない |
| `LIVEKIT_API_SECRET` | 同じく Secret | サーバー専用 | ❌ 漏らさない |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit Dashboard → Settings → Project URL | クライアント公開 | ✅ wss:// は公開して OK |

### 2-1. ローカル開発

`.env.local` に追加（git 管理外）:

```bash
LIVEKIT_API_KEY=APIxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 2-2. Vercel への投入

1. Vercel Dashboard → 該当プロジェクト → **Settings** → **Environment Variables**
2. **3 つの環境変数を1つずつ追加**：
   | Name | Value | Environments |
   |------|-------|-------------|
   | `LIVEKIT_API_KEY` | `APIxxxxxxxxxxx` | ✅ Production / ✅ Preview / ✅ Development |
   | `LIVEKIT_API_SECRET` | `secretxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | ✅ Production / ✅ Preview / ✅ Development |
   | `NEXT_PUBLIC_LIVEKIT_URL` | `wss://your-project.livekit.cloud` | ✅ Production / ✅ Preview / ✅ Development |

   → 3 環境すべてにチェックを入れる（Production だけだとプレビュー環境で動かない）

3. **必ず再デプロイする**：環境変数は新しいデプロイにしか反映されない
   - Vercel Dashboard → Deployments → 最新の Production デプロイ → 「⋯」→ **Redeploy**
   - または `git commit --allow-empty -m "trigger redeploy" && git push` で空コミット

### 2-3. 投入忘れ／タイポした場合の挙動

- `/api/livekit/token` が **HTTP 503 `{ error: 'not_configured' }`** を返す
- `/voice/<roomId>` 画面に **「通話機能を準備中です」** という紫色のバナーが出る（500 エラーページにはならない）
- 開発環境（`NODE_ENV !== 'production'`）の場合のみ admin 向けデバッグ文言「LIVEKIT_API_KEY / LIVEKIT_API_SECRET / NEXT_PUBLIC_LIVEKIT_URL を Vercel に設定し再デプロイしてください」が追加表示される

---

## 3. LiveKit Cloud 推奨設定

LiveKit Dashboard → Settings で次を設定:

| 設定 | 推奨値 | 理由 |
|------|--------|------|
| **Region** | Tokyo (ap-northeast-1) | 国内ユーザーへの RTT を最小化（〜30ms 以内） |
| **Max participants per room** | 10 | samee の最大想定。これ以上は SFU の帯域コスト効率が落ちる |
| **Recording** | OFF | samee は録音禁止ポリシー（`voice_recording_off` ルール）。Egress 課金も発生しない |
| **Egress** | OFF | 録音 OFF と整合 |
| **Codec** | Opus + RED（既定） | RED で軽微なパケットロスを補完。コードでも `red: true` 指定済み |
| **DTX (Discontinuous Transmission)** | ON（コード側で `dtx: true`） | 無音区間の帯域節約 |
| **Adaptive Stream / Dynacast** | ON（コード側で有効） | サブスクライバー側の帯域に応じて受信側でスケール |

### Noise reduction / Echo cancellation

- **デフォルト**: ブラウザの `MediaTrackConstraints` 既定値で `echoCancellation: true` / `noiseSuppression: true` / `autoGainControl: true` が有効
- 反響や音割れが報告された場合のみ `voice/[roomId]/page.tsx` の `Room` 初期化箇所で `audioCaptureDefaults` を上書きする（必要時に対応）

### 無料枠を超えた時の注意

- LiveKit Cloud の無料枠は **月 1,000 connection-minutes**（〜60 名 × 17 分相当）
- 超過すると **新規接続が拒否**される（既存接続は継続）
- Pro プラン（USD 50/月、5,000 minutes）または Scale プランへのアップグレードが必要
- Dashboard → Billing で残量と当月の見込み消費を毎週確認することを推奨

---

## 4. 動作確認（簡易）

詳細は [livekit-test-checklist.md](./livekit-test-checklist.md) を参照。

```bash
npm run dev
# → http://localhost:3000/voice/<roomId> にアクセス
```

入室ボタン → マイク許可 → 別タブ／別アカウントで同じ部屋に入室 → 双方向音声が聞こえれば OK。

エラー指針:
- 紫バナー「通話機能を準備中です」 → 環境変数未設定。`§2-2` を見直す
- 赤バナー「この通話には入れません」 → 部屋が closed か LiveKit に到達できない
- 黄バナー「マイクが使えません」 → ブラウザのサイト設定からマイク許可

---

## 5. iOS Safari 対応

- `getUserMedia` は **ユーザー操作（タップ）後** に呼ばれる必要がある。samee は「入室」ボタン押下のハンドラ内で LiveKit `connect()` → `setMicrophoneEnabled(true)` を呼ぶので OS 要件を満たす
- 自動接続は禁止（バックグラウンドタブからの入室は拒否される）
- 退出時に `Room.disconnect()` で全 track が `track.stop()` され、マイクのインジケータが即座に消える
- バックグラウンドに移ると iOS が AudioContext を suspend するが、復帰時に LiveKit が自動再開する

---

## 6. 本番監視

LiveKit Dashboard → Sessions で:
- 同時接続数
- 平均パケットロス
- 切断率
- p95 RTT

を週次で確認。問題があれば:
- 高 RTT → Region を見直す
- 高パケロス → bitrate を下げる（`publishDefaults.audioPreset.maxBitrate` を 32000 → 24000 に）
- 高切断率 → クライアント側の Reconnect ロジックは LiveKit SDK に任せている。発生頻度が高ければ別の transport 制約を疑う

---

## 7. セルフホスト（将来オプション）

LiveKit Cloud から離脱する場合:
1. Docker で `livekit-server` を立てる（公式 docker-compose あり）
2. TURN サーバ（coturn）を併設
3. `NEXT_PUBLIC_LIVEKIT_URL` を自前 wss URL に差し替えるだけ
4. コードの変更は不要

---

## 8. 関連ファイル

| ファイル | 役割 |
|---------|------|
| `app/api/livekit/token/route.ts` | Token 発行（サーバー専用） |
| `app/(app)/voice/[roomId]/page.tsx` | 通話ルーム本体（クライアント） |
| `.env.local.example` | 環境変数のテンプレート |
| `docs/livekit-test-checklist.md` | 実機テスト項目 |
