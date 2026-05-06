# UI ライト化移行プラン

YVOICE 全体の UI を「ダーク + ネオン」基調から、添付画像のような
「白カード + 余白広め + 紫アクセント」基調へ段階的に移行するためのプラン。

## 移行方針

- **画面ごとに段階的に変換**。一気に全画面を変えると壊れるリスクが大きい
- **共通プリミティブを集約**: `components/ui/SimpleCard.tsx` の
  `SimpleCard` / `SimpleSectionHeader` / `SimpleAvatarTile` / `SIMPLE_COLORS`
- **残す YVOICE らしさ**: 紫アクセント (#9D5CFF)、主ボタンの紫塗り、
  YVOICE ロゴ、わずかなオンライン中グロー
- **削るもの**: 強い cyan / pink ネオン、過剰なグロー、cluttered な
  装飾

## カラーパレット (`SIMPLE_COLORS`)

```
pageBg:        #f5f5f7    (light gray)
cardBg:        #ffffff    (white)
cardBorder:    rgba(15,23,42,0.06)
cardShadow:    0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)
textPrimary:   #0f172a    (dark navy)
textSecondary: rgba(15,23,42,0.6)
textTertiary:  rgba(15,23,42,0.35)
accent:        #9D5CFF    (YVOICE 紫)
accentBg:      rgba(157,92,255,0.10)
accentBorder:  rgba(157,92,255,0.32)
accentDeep:    #7c3aed
```

## Phase 進捗

### Phase 1 — 一覧画面の白カード化

- [x] **ギルド一覧 (GuildsContent.tsx)** — ✅ 完了 (本 commit)
  - `/guilds` 単体ルート / `/guild` の「ギルド」サブタブ両方で適用
  - light gray ページ + 白カード + 紫アクセントに刷新
  - cyan ネオン (#27DFFF / #0891B2) は完全削除
  - 紫アクセントは FAB と参加ボタンのみ
- [ ] **いますぐ村一覧 (`app/(app)/guild/page.tsx`)** — 未着手
  - 現状: 強いダーク + ネオン背景 + 多数のセクション (今夜 / 今週 / 新着)
  - リスク: 700+ 行で複雑、ヒーロー section / 検索 / フィルタ / FAB を
    全部触る
  - 推奨: Phase 1.5 として独立コミット
- [ ] **/guilds/[id] (ギルド詳細)** — 未着手
  - 直前 commit で大幅改修済み (タイムライン + 通話ルーム + 詳細モーダル)
  - 詳細モーダルだけは light に寄せやすい (合理的に独立化)

### Phase 2 — 通話 / グループ画面のシンプル化

- [ ] **/group ページ** — 未着手
  - 現状: ダーク基調、グループ通話一覧 + 作成シート
  - SimpleCard を適用すれば短時間で light 化可能
- [ ] **/voice ページ (通話ルーム一覧)** — 未着手
- [ ] **/voice/[roomId] (通話ルーム詳細)** — 未着手
  - LiveKit セッション中なのでダーク維持の方が眼に優しい可能性あり、要相談

### Phase 3 — チャット画面の整理

- [ ] **/chat 一覧** — 未着手
  - 添付画像と最も近い UI 要件 (アイコン + 名前 + 最終メッセージ + 未読)
  - SimpleCard の応用で整理可能
- [ ] **/chat/[matchId] 詳細** — 未着手
  - メッセージ吹き出しの可読性を最優先
  - 既存 dark 吹き出しを white bg + 薄い影に置換

### Phase 4 — 周辺の整合性確保

- [ ] **TL (タイムライン)** — 緑ネオン基調をどうするか要相談
- [ ] **マイページ** — シルバートーンをどうするか要相談
- [ ] **通知** — 黄色アクセントをどうするか要相談
- [ ] **下部ナビ (BottomNav)** — light 化するか dark 維持か要相談
- [ ] **AppLayout 全体** — `bg: #080812` を light に切替えるかどうか
  (大規模なので最後)

## 実装の進め方

各 Phase の各画面ごとに:

1. 現状ファイルを読み、ダーク色/グロー/装飾を SIMPLE_COLORS に置換可能か
   確認
2. 1 ファイル単位で書き換え (機能・データ取得・state は触らない)
3. 検証 (tsc / next build) → commit → push
4. 実機確認結果を docs/friends-rail-verification.md か別ファイルに追記

## やらないこと

- 一気に全画面を light 化 (壊れるリスク)
- 既存 component の API 変更 (props を破壊しない)
- 機能削除や DB 変更 (light 化は表示のみ)
- BottomNav の構成変更
- ロゴ / フォント / 文字色定数 (#9D5CFF) の変更

## 参考: マッキーさんが添付した画像の UI 特徴

- 白〜薄いグレー背景
- 大きめの白いカード (角丸 24px 程度)
- 余白広め (カード間 12px、内部 14-16px)
- 文字: 濃ネイビー (#0f172a)、サブは灰色
- アイコン + 名前 + 件数 のシンプル構成
- バナー広告も自然に挿入されている
- ボタンは控えめ、主機能のみ強調
