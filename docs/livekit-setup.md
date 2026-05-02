# LiveKit セットアップ手順 (samee 通話基盤)

samee の通話は **LiveKit (SFU)** で実装されています。Mesh WebRTC は廃止しました。

## 1. アカウントとプロジェクト

1. https://cloud.livekit.io/ にサインアップ（Google ログイン推奨）
2. 新規プロジェクトを作成。Region は `Tokyo (ap-northeast-1)` 推奨（国内ユーザー向けの遅延を最小化）
3. プロジェクト Dashboard → **Settings** で以下を確認:
   - **Project URL**（例: `wss://samee-xyz.livekit.cloud`）
   - **API Keys** タブで `Generate API Key` → API Key と Secret をコピー（Secret は1度しか表示されない）

## 2. 環境変数

`.env.local` （ローカル）と Vercel Project Settings → Environment Variables に追加:

```
LIVEKIT_API_KEY=APIxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` は **server-only**（`/api/livekit/token` でのみ使用）。`NEXT_PUBLIC_` プレフィックスを付けてはいけない。
- `NEXT_PUBLIC_LIVEKIT_URL` は wss URL なので公開して問題なし。

Vercel に追加したら **Production / Preview / Development の 3 環境すべて** にチェックを入れる。再デプロイで反映。

## 3. プロジェクト推奨設定

LiveKit Dashboard で:

- **Codecs**: opus + red（既定で OK）
- **Max participants per room**: 10（samee は最大 10 人想定）
- **Recording**: OFF（録音禁止ポリシーに合わせる）
- **Egress**: 不要なら OFF

## 4. 動作確認

1. ローカル `npm run dev`
2. PC Chrome で `/voice/<roomId>` にアクセス
3. 入室ボタンを押すとブラウザのマイク許可ダイアログ → 許可
4. 別タブ（シークレット推奨、別アカウント）で同じ部屋に入室 → 双方向の音声を確認

Console に以下が出ていれば OK:
```
[livekit] connected to room samee-voice-<roomId>
```

エラーが出る場合は:
- `[livekit] token api 401` → Supabase auth 切れ。ログインし直す
- `[livekit] connect failed` → URL / API key の不整合。env を確認
- `マイクが使えません` → ブラウザ permission 拒否。アドレスバーの 🔒 → サイト設定からマイク許可

## 5. iOS Safari 対応

- `getUserMedia` は **ユーザー操作（タップ）後** に呼ばれる必要がある。samee は「入室」ボタン押下後に LiveKit `connect` → `setMicrophoneEnabled` を呼ぶので OS 要件を満たす
- 自動接続は禁止（無音タブからの入室拒否される）
- 退出時に `Room.disconnect()` で全 track が `track.stop()` され、マイクのインジケータが消える

## 6. 本番監視

LiveKit Dashboard → Sessions で:
- 同時接続数
- 平均パケットロス
- 切断率

を確認。問題があれば Region を ユーザーに近いものに変える、または bitrate を下げる（`publishDefaults.audioPreset.maxBitrate` を `voice/[roomId]/page.tsx` で調整）。

## 7. 料金

LiveKit Cloud の最初の無料枠は月 1,000 connection minutes。本番運用は Pro プラン（月額 50 USD〜）を想定。

セルフホストする場合は Docker で `livekit-server` を立てて URL を差し替えれば良い。コードの変更は不要。
