# YVOICE デプロイ手順

## 現状 (2026-05-06)

`.github/workflows/deploy.yml` は 274 連続失敗のため削除済 (commit で履歴あり)。
`amondnet/vercel-action@v25` が deprecated になり VERCEL_TOKEN も期限切れの
可能性が高いため、**自動デプロイは現在動作していません**。

## 推奨: Vercel 純正 GitHub 連携を有効化

最も安全で楽な方法。Vercel ダッシュボード操作のみで設定完了。

### 手順

1. https://vercel.com にログイン
2. プロジェクト `yvoice` (org: `totonavi`) を開く
3. **Settings → Git** に移動
4. "Connected Git Repository" が `aimakky/yvoice` になっていることを確認
   - もし接続が切れていれば再接続
5. **Production Branch** が `main` であることを確認
6. **Auto Deploy** が有効であることを確認

これで `git push origin main` のたびに Vercel が自動デプロイします。

### 確認方法

```bash
# push 前
curl -sL "https://www.nowmatejapan.com/login" | grep -oE 'dpl_[a-zA-Z0-9]+' | sort -u

# 数分待った後
curl -sL "https://www.nowmatejapan.com/login" | grep -oE 'dpl_[a-zA-Z0-9]+' | sort -u
```

dpl_ ID が変わっていれば自動デプロイ成功。

## フォールバック: 手動デプロイ (CLI)

Vercel ダッシュボード設定が間に合わない場合の手動方法。

### 前提

ローカルマシンで Vercel CLI に認証済であること:

```bash
npx vercel whoami
# → makkyaistudio-4031 (など) が表示されれば OK
# 表示されなければ npx vercel login で認証
```

### デプロイコマンド

```bash
cd /path/to/nowmate
npx vercel --prod
```

ビルド〜デプロイで 2〜4 分かかる。完了すると新 deployment ID が表示される。

### デプロイ反映確認

```bash
# 1. live HTML 取得
curl -sLI "https://www.nowmatejapan.com/login" | grep -iE "X-Vercel|Cache|Age"

# 2. 期待値:
#   X-Vercel-Cache: MISS  または  Age: 0 付近
#   新しい dpl_ ID が出ること

# 3. iPhone Safari で確認:
#   - アプリ完全終了 (アプリスイッチャーから上スワイプ)
#   - 設定 → Safari → 履歴と Web サイトデータを消去
#   - PWA 削除 → 再追加 (ホームに追加している場合)
```

## なぜ自動デプロイが壊れていたか (記録)

- `.github/workflows/deploy.yml` で `amondnet/vercel-action@v25` を使用
- このアクションは 2022 年から更新されておらず Node.js 20 deprecation 警告も出ていた
- 274 回連続で `Deploy to Vercel` step が 0 秒で失敗 = 認証/設定エラー (ログは admin only で取れず)
- 失敗の主因として推定:
  - `VERCEL_TOKEN` 期限切れ
  - `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` の値ズレ
  - Action 自体の互換性問題

## 今後の指針

- **Vercel 純正連携が動き出したら本ドキュメントの「フォールバック」セクションは削除**
- 純正連携が動かない場合の応急処置として手動 CLI デプロイ手順を残す
- 自前 GitHub Actions を再導入する場合は最新の `vercel/action` (公式) または `vercel-cli` を直接呼ぶ方針を検討
