# ミヤさんの投稿が TL に 1 件しか出ない問題 — 診断ログ取得手順

## 現状

- ミヤさんプロフィール: 投稿 7 件全部表示される
- TL「みんな」: ミヤさんの投稿が 1 件しか出ない
- 原因は不明 (コードレベルの静的分析では特定できず)

## 静的分析で立てた仮説

### 仮説 A: id 重複 / dedupe で消失
- `select('*')` の結果に同じ id が複数返ってくる
- `seen.add(r.id)` の dedupe で 6 件捨てられている
- 確認指標: `droppedByDedupe` > 0

### 仮説 B: feed 合成の段階で消失
- fetchTweets で 7 件取れているが、feed 合成中に 6 件捨てられる
- 確認指標: `droppedTweetsBetweenFetchAndFeed` > 0

### 仮説 C: fetchTweets が 1 件しか返さない
- RLS / 行制限 / select エラー等で 1 件しか取れない
- 確認指標: `rawCount` < 7

### 仮説 D: rendering の段階で消失
- feed には複数件入っているが React 描画で消える
- 確認指標: feed.tweetInFeed > 1 だが画面では 1 件
- (この場合は React DevTools での目視確認が必要)

---

## マッキーさんに取得してほしいログ

### 手順

1. iPhone Safari の履歴と Web サイトデータを消去
2. nowmatejapan.com にアクセス
3. TL「みんな」タブを開く
4. ブラウザの Web Inspector を開く (Mac Safari + iPhone 接続 or Eruda)
5. console を開く
6. 以下 2 種類のログを全文コピー

### ログ 1: fetchTweets

```
[timeline] fetchTweets ok: {
  rawCount: ?,
  uniqueCount: ?,
  droppedByDedupe: ?,
  userCount: ?,
  perUser: [
    { user_id: "xxxxx..", count: ?, sample: "..." },
    ...
  ],
  dupIdsTop5: [...],
  scope: "all"
}
```

確認すること:
- `rawCount` の値 (7 以上か、それとも 1 など極端に少ないか)
- `perUser` の中にミヤさんと思われるユーザーが何件で含まれるか
- `droppedByDedupe` が 0 でないなら id 重複が原因
- `dupIdsTop5` が空でないなら確定

### ログ 2: feed composed

```
[timeline] feed composed: {
  tab: "all",
  totalItems: ?,
  byType: { post: ?, tweet: ?, qa: ?, voice: ? },
  tweetSourceCount: ?,
  tweetInFeed: ?,
  droppedTweetsBetweenFetchAndFeed: ?,
  tweetByUserInFeed: [
    { user_id: "xxxxx..", count: ? },
    ...
  ]
}
```

確認すること:
- `tweetSourceCount` (= fetchTweets の uniqueCount と一致するはず)
- `tweetInFeed` (= 最終的に画面に並ぶ tweet の数)
- `droppedTweetsBetweenFetchAndFeed` が 0 でないなら合成段階で消失
- `tweetByUserInFeed` でミヤさんの user_id が何件か

---

## 結果別の対応

### case A: rawCount = 1 (fetchTweets で 1 件しか取れない)
- RLS が原因。同じ user で profile fetch (eq filter 付き) が 7 件返るのに
  TL fetch (filter なし) が 1 件 → RLS の policy 評価が条件によって変わる
- 対処: profile fetch と同じパターンで TL も `.in('user_id', [...])` で
  全アクティブユーザーを絞り込む形にすれば解決する可能性
- もしくは Supabase ダッシュボードで RLS policy を確認

### case B: rawCount = 7 で droppedByDedupe = 6
- dedupe が誤って消している (同じ id が複数返ってきている)
- 対処: なぜ重複が返るかを RLS で確認 (OR 条件で同一行が複数 USING に
  マッチする可能性)
- 対処: dedupe を維持しつつ、元の重複データの問題は別途追う

### case C: rawCount = 7、tweetSourceCount = 7、tweetInFeed = 7 だが画面 1 件
- 描画段階の問題 (React key 衝突 / TweetCard error / CSS 表示)
- 対処: React DevTools で確認 / Console に React error がないか

### case D: rawCount = 7、tweetSourceCount = 7、tweetInFeed = 1
- feed 合成の段階で 6 件消失
- 対処: combined.sort や voice 挿入のロジックを再点検

---

## 追加で取得すると有用なログ

ブラウザ console で以下を貼って実行:

```javascript
// 自分の user_id 確認
(async () => {
  const sb = await import('/lib/supabase/client.ts').then(m => m.createClient())
  const { data: { user } } = await sb.auth.getUser()
  console.log('my user_id:', user?.id)
})()
```

```javascript
// ミヤさんの user_id を含むかをまとめてチェック
// (上記ログの perUser から、件数が高い user_id がミヤさんかどうか
//  プロフィールを開いて URL の最後の部分と一致するか比較)
```

---

## 実行は不要だが参考用 SQL (Supabase SQL Editor)

```sql
-- ミヤさんの全 tweets を直接確認 (ミヤの user_id を入れる)
SELECT id, user_id, content, created_at, reply_to_id
FROM public.tweets
WHERE user_id = '<MIYA_UUID>'
ORDER BY created_at DESC;

-- tweets テーブルの RLS policy 確認
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tweets';

-- 自分 (makky) と miya の tweets を見たときの行数比較
SELECT user_id, count(*)
FROM public.tweets
GROUP BY user_id
ORDER BY count(*) DESC;
```

---

## 次のステップ

マッキーさんが上記ログを貼ったら、case A〜D のどれに該当するかが
即座に確定。次の commit でその case 専用の修正を入れる。
