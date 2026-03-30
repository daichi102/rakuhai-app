# rrakuhai-app

Firebase + Vercel 構成の初期セットアップ済みプロジェクトです。

## 1) 前提

- Node.js 20 以上
- npm 10 以上
- Firebase CLI
- Vercel CLI（任意）

## 2) 初回セットアップ

```bash
npm install
```

`.env.example` をコピーして `.env.local` を作成してください。

```bash
copy .env.example .env.local
```

`.firebaserc` の `your-firebase-project-id` を実際のFirebase Project IDに変更してください。

## 3) 開発起動

```bash
npm run dev
```

## 4) Firebase（任意）

```bash
firebase login
firebase use <project-id>
firebase emulators:start
```

## 5) Vercelデプロイ

```bash
vercel
vercel --prod
```

Vercel Dashboard に以下環境変数を設定してください。

- `NEXT_PUBLIC_FIREBASE_*`
- `MICROSOFT_*`
- `GRAPH_MAILBOX_USER`
- `AZURE_DOC_INTEL_*`

## 6) 現在の構成

- Next.js App Router
- Firebase初期化 (`src/lib/firebase.ts`)
- Firebase Rules/Indexes (`firebase.json`, `firestore.rules`, `storage.rules`)
- Vercel設定 (`vercel.json`)
