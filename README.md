# Browser Top

ブラウザのスタートページとして使えるカスタムダッシュボード。
よく使うサービスのURLをグループごとにカード表示し、ブラウザ上から追加・編集・削除できます。
<img width="2940" height="1610" alt="image" src="https://github.com/user-attachments/assets/1e040f0b-27f9-4c19-910b-cd9d4ec73594" />


## Features

- 新しいタブページを自動でオーバーライド（Chrome / Brave 拡張機能）
- グループごとのブックマーク管理（追加・編集・削除）
- ドラッグ&ドロップでリンク・グループの並び替え
- ブックマークバーからリンクをドロップして追加
- テキスト形式での一括インポート / エクスポート（同名グループは自動マージ）
- コンパクトアイコングリッド表示（favicon + 名前）
- リンク個別 / ホスト単位のカスタムfavicon設定（Settings）
- リアルタイム時計・日付表示
- ダークテーマ
- `chrome.storage.local` でデータ永続化（シークレットモードでも利用可能）
- `index.html` を直接開いても使える（`localStorage` にフォールバック）

## Install (Chrome / Brave Extension)

1. このリポジトリをクローンまたはダウンロード
2. ブラウザで `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. このフォルダを選択

新しいタブを開くと Browser Top が表示されます。

> シークレットモードで使う場合: 拡張機能の詳細 → 「シークレットモードでの実行を許可する」を有効化

## Import Format

テキストで一括登録できます。

```text
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
