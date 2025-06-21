# MTG Deck Price Calculator

Magic: The Gathering のデッキリストから各カードの最安価格を自動取得し、デッキ全体の価格を計算する Web アプリケーションです。

## 使用方法

1. デッキリストを MO の形式で入力欄に貼り付け:

   ```
   4 Lightning Bolt
   2 Counterspell
   4 Island
   ```

2. 「価格を計算する」ボタンをクリック

3. 自動で各カードの価格を取得し、合計金額を表示

4. 必要に応じて「CSV エクスポート」で結果を保存

## セットアップ方法

### インストール

```sh
# リポジトリをクローン
git clone <repository-url>
cd mtg-deck-price-calculator

# 依存関係をインストール
npm install
```

### 開発環境での実行

```sh
# 開発サーバーを起動
npm run dev
```

### Netlify 環境での実行

```sh
# Netlify Dev環境を起動（Functions含む）
npm run netlify:dev
```

### 本番ビルド

```sh
# 本番用ビルド
npm run build
```

## 利用可能なスクリプト

| コマンド                 | 説明                   |
| ------------------------ | ---------------------- |
| `npm run dev`            | 開発サーバーを起動     |
| `npm run build`          | 本番用ビルドを作成     |
| `npm run preview`        | ビルド結果をプレビュー |
| `npm run netlify:dev`    | Netlify Dev 環境を起動 |
| `npm run netlify:build`  | Netlify 用ビルド       |
| `npm run netlify:deploy` | Netlify にデプロイ     |

## プロジェクト構成

```
mtg-deck-price-calculator/
├── src/
│   ├── App.vue          # メインコンポーネント
│   ├── main.js          # アプリケーションエントリーポイント
│   └── assets/          # CSS・画像ファイル
├── netlify/
│   └── functions/       # Netlify Functions（API）
│       └── card-price.js # 価格取得API
├── public/              # 静的ファイル
├── netlify.toml         # Netlify設定
├── package.json         # 依存関係定義
├── tailwind.config.js   # TailwindCSS設定
└── vite.config.js       # Vite設定
```

## 環境変数

開発時にデモモードを有効にする場合：

```sh
# .env.local ファイルを作成
DEMO_MODE=true
```

## 注意事項

- 価格情報は外部サイト（Wisdom Guild）から取得しているため、サイトの仕様変更により動作しなくなる可能性があります
- レート制限により、大量のカードを一度に処理する場合は時間がかかります（1 分間に 1 リクエスト）
- 価格情報の正確性については保証できません。重要な取引の際は公式の価格を確認してください

## 技術スタック

- **フロントエンド**: Vue.js 3 + Vite
- **スタイリング**: TailwindCSS
- **バックエンド**: Netlify Functions (Node.js)
- **デプロイ**: Netlify
