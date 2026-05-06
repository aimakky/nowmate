# 職業別ゲーム大会 (YVOICE Work Cup) 実装プラン

> ⚠️ Coming Soon。本ドキュメントは将来実装の構想とロードマップ。
> 現在は `/guild`「いますぐ村」タブに Coming Soon カード (WorkCupTeaserCard)
> のみ実装。本実装は未着手。

## コンセプト

20 歳以上限定の大人向けゲーム通話コミュニティ YVOICE で、**職業や業界
ごとにチームを組んで参加できるゲーム大会**を開催する。

### 最初の目玉企画
- **職業対抗 Apex リーグ**
- 営業職 / エンジニア / 看護師 / 美容師 / 接客業 / 公務員 / フリーランス /
  経営者 / 夜勤明け 等の職業別チーム

### 既存機能との連携
- ゲーム村: 大会告知 + 練習募集
- ギルド: 職業別チーム結成 (常設コミュニティ化)
- グループ通話: チーム練習 + 本番 VC
- チャット: チーム連絡
- タイムライン: 結果共有 + 盛り上げ
- プロフィール: 参加履歴 + 称号バッジ

---

## Phase 別ロードマップ

### Phase 0 (本 commit) — 構想公開 ✅
- [x] `/guild` の「いますぐ村」タブに Coming Soon カードを追加
- [x] タップで詳細モーダル表示 (説明 + 想定チーム + 連携予定)
- [x] 本ドキュメント作成
- DB / API / 本実装: ゼロ

### Phase 1 — 興味あり登録 (DB 変更最小限)
- 「興味あり」ボタンで notifications に row insert
  (type='workcup_interest', actor_id=自分)
- 興味あり数を Coming Soon カードに表示 (例: 「85 人が興味あり」)
- DB 変更なし (既存 notifications テーブルを type 拡張で再利用)
- リスク: 低

### Phase 2 — 職業別チーム (= ギルドの拡張)
- 既存の `villages` テーブルに `is_workcup_team` フラグ追加 or
  category='Apex職業' などの予約 category を使う
- 既存ギルド作成フローを再利用、職業選択ステップを追加
- DB 変更: `villages` テーブルへの 1 列追加 (要 SQL 案提示)
- リスク: 中

### Phase 3 — 大会開催機能
- 新規テーブル `tournaments`:
  - id / title / game_title / status / start_at / end_at / rules /
    eligible_categories[] (募集職業) / created_by
- 新規テーブル `tournament_entries`:
  - tournament_id / team_id (= village_id) / status / created_at
- 大会一覧 + 詳細ページ (/tournaments, /tournaments/[id])
- DB 変更: 新規テーブル 2 つ + RLS ポリシー (要 SQL 案提示 + マッキーさん
  実行判断)
- リスク: 中〜高

### Phase 4 — トーナメント / リーグ進行
- 新規テーブル `tournament_matches`:
  - tournament_id / round / team_a_id / team_b_id / scheduled_at /
    result_a / result_b / status
- 結果入力フォーム (ホストのみ)
- 自動シード生成 (シングルエリミネ / ダブルエリミネ / 総当たりリーグ)
- DB 変更: 新規テーブル 1 つ
- リスク: 中

### Phase 5 — 称号 / 戦績
- 既存 `qa_titles` パターン or 新規 `tournament_titles` で称号付与
  (営業職代表 / Apex Work Cup 優勝 / 夜勤明け最強 / etc)
- プロフィールカードに称号バッジ表示
- DB 変更: 新規テーブル or 既存拡張 (要設計)
- リスク: 中

### Phase 6 — 配信 / 観戦 (将来)
- 大会の VC を観戦専用枠で開放
- LiveKit の listener 機能を再利用
- 録画は禁止 (既存ポリシー維持)
- DB 変更: voice_rooms に tournament_id FK 列追加
- リスク: 中〜高

---

## 想定チーム / 職業カテゴリ (Phase 2 で確定)

```
営業職 / エンジニア / 看護師 / 医療従事者 / 介護職 / 美容師 / 理容師 /
接客業 / 飲食 / 公務員 / 教員 / 警察・消防 / 自衛隊 / 経営者 /
フリーランス / クリエイター / デザイナー / マーケター / 物流ドライバー /
工場勤務 / 建設 / 不動産 / 保険・金融 / IT・SaaS / 人事 / 経理 /
夜勤系 / シフト勤務 / 専業主婦・主夫 / 学生 (社会人未満) / その他
```

(既存 `lib/guild.ts` の INDUSTRIES とは別の「職業カテゴリ」を新規定義予定。
ただし重複は避けて将来統合可能性を残す。)

---

## 称号案 (Phase 5)

- 営業職代表 / エンジニア代表 / 看護師代表 等 (職業ごと)
- Apex Work Cup 優勝 / 準優勝 / ベスト 4
- 夜勤明け最強 / 社畜代表 / 経営者の覇者 (ニックネーム系)
- 連続出場 N 回 / 全勝記録 / MVP

---

## 守りたいポリシー

- **20 歳以上限定**: 既存 age_verified を必須化
- **本人確認推奨**: Stripe Identity verified を上位称号要件に
- **出会い系化させない**: 配偶者 / 恋人探しを連想させる文言禁止
- **録音・録画禁止**: 既存 VC ポリシー継承
- **DB 変更は SQL 案を必ず先出し**: マッキーさん判断で実行
- **既存機能を壊さない**: 大会機能は付加機能、village / voice_room
  / chat の core lo

---

## 実装順序の判断材料

- Phase 0 → 1 はノーリスク (既存テーブル流用)。即着手可能
- Phase 2 から DB 変更。マッキーさん判断必須
- Phase 3 以降は新規テーブル群が必要 → SQL 設計フェーズが先

## マッキーさん向けの確認チェック

[ ] Phase 0 (Coming Soon カード) を実装済 ←今ここ
[ ] Phase 1 (興味あり登録) に進むか
[ ] Phase 2 以降の DB 設計に進むか (Apex リーグ実開催を視野に入れた時)
[ ] 命名: 「職業別ゲーム大会」「YVOICE Work Cup」「職業対抗リーグ」
    のどれを正式名にするか
[ ] 第 1 回開催の対象ゲーム: Apex で確定か / 他候補もあるか
