# Browser Top

ブラウザのスタートページとして使えるカスタムダッシュボード。
よく使うサービスのURLをグループごとにカード表示し、ブラウザ上から追加・編集・削除できます。
<img width="2940" height="1606" alt="image" src="https://github.com/user-attachments/assets/5d3a47c8-3e85-465b-bff7-35d2288bf42e" />

## Features

- グループごとのブックマーク管理（追加・編集・削除）
- ファビコン付きリスト表示
- リアルタイム時計・日付表示
- テキスト形式での一括インポート / エクスポート
- ダークテーマ
- データは `localStorage` に保存（サーバー不要）
- 単一HTMLファイル（依存なし）

## Usage

`index.html` をブラウザで開くだけで使えます。

Braveブラウザの場合:
設定 → 起動時 → 特定のページ → `index.html` のパスを指定

## Import Format

テキストで一括登録できます。

```
グループ名
表示名,https://example.com
https://example.org

別のグループ
表示名,https://another.com
```

- 1行目: グループ名
- `表示名,URL` でカンマ区切り（表示名省略時はホスト名を自動採用）
- 空行でグループ区切り

サンプルは [example.txt](example.txt) を参照してください。
