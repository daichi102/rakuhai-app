import { app } from "@/lib/firebase";

export default function Home() {
  return (
    <main className="container">
      <h1>設置業務システム</h1>
      <p>Firebase と Vercel の初期設定が完了しています。</p>
      <p>Firebase App Name: {app.name}</p>
      <ul>
        <li>次に Outlook 連携（Microsoft Graph）を追加</li>
        <li>案件取込（AI抽出）機能を実装</li>
      </ul>
    </main>
  );
}
