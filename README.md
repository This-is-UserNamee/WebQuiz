# WebQuiz

これは、React、Vite、Node.js、Socket.IOを使用して構築されたリアルタイムのWebクイズアプリケーションです。

## 特徴

*   リアルタイムのマルチプレイヤー クイズ ゲーム
*   ReactとViteで構築されたモダンなフロントエンド
*   Node.jsとSocket.IOによるスケーラブルなバックエンド

## 前提条件

*   [Node.js](https://nodejs.org/) (v18以降を推奨)
*   [npm](https://www.npmjs.com/)

## インストール

1.  リポジトリをクローンします:
    ```bash
    git clone https://github.com/This-is-UserNamee/WebQuiz
    cd WebQuiz
    ```
2.  依存関係をインストールします:
    ```bash
    npm install
    ```

## 使い方

### 開発

フロントエンドとバックエンドの開発サーバーを同時に起動するには、プロジェクトのルートディレクトリで次のコマンドを実行します:

```bash
npm run dev
```

これにより、次のことが行われます:

*   `apps/backend` でバックエンド開発サーバー (nodemon) を起動します。
*   `apps/frontend` でフロントエンド開発サーバー (Vite) を起動します。

### ビルド

アプリケーションを本番用にビルドするには:

```bash
# フロントエンドをビルドします
npm --workspace apps/frontend run build

# バックエンドをビルドします
npm --workspace apps/backend run build
```

## プロジェクト構造

このプロジェクトはモノレポとして構成されています:

*   `apps/frontend`: ReactとViteで構築されたフロントエンドアプリケーション。
*   `apps/backend`: Node.jsとSocket.IOで構築されたバックエンドサーバー。

## 利用可能なスクリプト

### ルート

*   `npm run dev`: フロントエンドとバックエンドの両方の開発サーバーを起動します。
*   `npm run dev:frontend`: フロントエンド開発サーバーのみを起動します。
*   `npm run dev:backend`: バックエンド開発サーバーのみを起動します。

### フロントエンド (`apps/frontend`)

*   `npm run dev`: 開発モードでViteを起動します。
*   `npm run build`: 本番用にアプリケーションをビルドします。
*   `npm run lint`: ESLintでコードをリントします。
*   `npm run preview`: ビルドされたアプリケーションをプレビューします。

### バックエンド (`apps/backend`)

*   `npm run dev`: `ts-node`と`nodemon`を使用して開発モードでサーバーを起動します。
*   `npm run build`: TypeScriptをJavaScriptにコンパイルします。
