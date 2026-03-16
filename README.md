# Browser Top

ブラウザのスタートページとして使えるカスタムダッシュボード。
よく使うサービスのURLをグループごとにカード表示し、ブラウザ上から追加・編集・削除できます。
<img width="2940" height="1610" alt="image" src="https://github.com/user-attachments/assets/1e040f0b-27f9-4c19-910b-cd9d4ec73594" />

GA4のデータを表示するセクションを追加
<img width="1263" height="786" alt="Image" src="https://github.com/user-attachments/assets/a1e37227-47b9-4685-aaba-5011232fc416" />

## Features

- 新しいタブページを自動でオーバーライド（Chrome / Brave 拡張機能）
- グループごとのブックマーク管理（追加・編集・削除）
- ドラッグ&ドロップでリンク・グループの並び替え
- ブックマークバーからリンクをドロップして追加
- テキスト形式での一括インポート / エクスポート（同名グループは自動マージ）
- コンパクトアイコングリッド表示（favicon + 名前）
- Music ウィジェット（YouTube Music のアルバムアートグリッド表示 + ワンクリック再生）
- リンク個別 / ホスト単位のカスタムfavicon設定（Settings）
- GA4 アナリティクスダッシュボード（複数プロパティ対応）
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

- 1行目: グループ名（Music ウィジェットの場合は `[music]グループ名`）
- `表示名,URL` でカンマ区切り（表示名省略時はホスト名を自動採用）
- 空行でグループ区切り

サンプルは [example.txt](example.txt) を参照してください。

## GA4 Analytics Setup

新しいタブに Google Analytics 4 のサマリー（アクティブユーザー・イベント数・キーイベント・新規ユーザー数 + 7日間推移グラフ）を表示できます。

### 1. Google Cloud プロジェクトの準備

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（既存でも可）
2. 「APIとサービス」→「ライブラリ」→ **Google Analytics Data API** を検索して有効化

### 2. OAuth2 クライアントIDの作成

1. 「APIとサービス」→「認証情報」→「認証情報を作成」→ **OAuth クライアント ID**
2. 初回は「OAuth 同意画面」の設定が必要
   - User Type: **外部** を選択
   - アプリ名・メールアドレスを入力して保存
   - スコープの追加は不要（拡張側で指定します）
   - テストユーザーに自分の Google アカウントを追加
3. アプリケーションの種類: **ウェブアプリケーション**
4. 「承認済みのリダイレクト URI」に以下を追加:
   ```
   https://<拡張機能のID>.chromiumapp.org/
   ```
   拡張機能のIDは `chrome://extensions` でデベロッパーモードを有効にすると確認できます。
5. 作成後、**クライアント ID** と **クライアント シークレット** をコピー

### 3. GA4 プロパティIDの確認

1. [Google Analytics](https://analytics.google.com/) を開く
2. 管理（歯車アイコン）→ プロパティ設定
3. 「プロパティ ID」の数字（例: `123456789`）をメモ
4. 複数サービスを表示したい場合は、各プロパティIDを控える

> 複数の Google アカウントにまたがる場合は、1つのアカウントを全プロパティに「閲覧者」として追加してください。

### 4. Browser Top での設定

1. 新しいタブを開き、右上の **Settings** をクリック
2. 「GA4 Analytics」セクション:
   - **OAuth2 Client ID** にクライアントIDを入力
   - **OAuth2 Client Secret** にクライアントシークレットを入力
   - **Connect Google Account** をクリックして Google 認証
   - **GA4 Properties** にサービス名とプロパティIDを追加（「+ Add Property」で複数追加可能）
   - **Auto refresh on new tab** で新しいタブを開くたびに自動取得するか選択
3. **Save** をクリック

ダッシュボードに各プロパティの過去7日間のメトリクスとグラフが表示されます。

### データの取得とセキュリティ

- 取得データは5分間キャッシュされます。自動更新が有効な場合、キャッシュ期限切れ時に新しいタブを開くと自動で再取得します
- 認証情報（トークン・クライアントシークレット）は暗号化して `chrome.storage.local` に保存されます
- API スコープは `analytics.readonly`（読み取り専用）のみを使用します
- 認証情報やプロパティIDはコードに含まれないため、リポジトリの公開に影響しません
