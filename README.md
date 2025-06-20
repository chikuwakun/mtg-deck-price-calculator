# MTG Deck Price Calculator 🃏

Magic: The Gatheringのデッキリストから各カードの価格を自動取得し、デッキ全体の価格を計算するWebアプリケーションです。

## 🌟 特徴

- **デッキリスト解析**: テキスト形式のデッキリストを貼り付けるだけで自動解析
- **価格自動取得**: Wisdom Guildから最新の価格情報を取得
- **日本語対応**: カード名の日英対応と日本語表示
- **CSVエクスポート**: 計算結果をCSVファイルとして保存可能
- **レスポンシブデザイン**: スマートフォンからPCまで対応
- **レート制限対応**: サーバー負荷を考慮した適切な間隔での価格取得

## 🛠️ 技術スタック

- **フロントエンド**: Vue.js 3 + Vite
- **スタイリング**: TailwindCSS
- **バックエンド**: Netlify Functions (Node.js)
- **価格取得**: Axios + Cheerio (Web Scraping)
- **デプロイ**: Netlify

## 📋 使用方法

1. デッキリストを以下の形式で入力欄に貼り付け:
   ```
   4 Lightning Bolt
   2 Counterspell
   1 Black Lotus
   4 Island
   ```

2. 「価格を計算する」ボタンをクリック

3. 自動で各カードの価格を取得し、合計金額を表示

4. 必要に応じて「CSVエクスポート」で結果を保存

## 🚀 セットアップ方法

### 前提条件

- Node.js 18以上
- npm または yarn

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

ブラウザで http://localhost:5173/ にアクセス

### Netlify環境での実行

```sh
# Netlify Dev環境を起動（Functions含む）
npm run netlify:dev
```

### 本番ビルド

```sh
# 本番用ビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

## 🔧 利用可能なスクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用ビルドを作成 |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run netlify:dev` | Netlify Dev環境を起動 |
| `npm run netlify:build` | Netlify用ビルド |
| `npm run netlify:deploy` | Netlifyにデプロイ |

## 📁 プロジェクト構成

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

## 🔑 環境変数

開発時にデモモードを有効にする場合：

```sh
# .env.local ファイルを作成
DEMO_MODE=true
```

## 📝 推奨IDE設定

- **エディタ**: [VSCode](https://code.visualstudio.com/)
- **拡張機能**: [Vue - Official (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
  - Veturがインストール済みの場合は無効化してください

## ⚠️ 注意事項

- 価格情報は外部サイト（Wisdom Guild）から取得しているため、サイトの仕様変更により動作しなくなる可能性があります
- レート制限により、大量のカードを一度に処理する場合は時間がかかります（1分間に1リクエスト）
- 価格情報の正確性については保証できません。重要な取引の際は公式の価格を確認してください

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🔗 関連リンク

- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Netlify](https://www.netlify.com/)
- [Wisdom Guild](https://whisper.wisdom-guild.net/)
