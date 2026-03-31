"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "./login.module.css";

const mapAuthErrorMessage = (code: string) => {
  switch (code) {
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid-please-pass-a-valid-api-key":
      return "Firebase APIキーが無効です。.env.local の NEXT_PUBLIC_FIREBASE_API_KEY を確認してください。";
    case "auth/user-not-found":
      return "ユーザーが見つかりません。Firebase Authentication の「ユーザー」タブで作成してください。";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが間違っています。";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。少し待ってから再試行してください。";
    default:
      return `ログインに失敗しました（${code}）。`;
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    if (!auth.app.options.apiKey?.startsWith("AIza")) {
      setError("Firebase APIキーの形式が不正です。.env.local の NEXT_PUBLIC_FIREBASE_API_KEY を確認してください。");
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        setError(mapAuthErrorMessage(err.code));
      } else {
        setError("ログインに失敗しました。時間をおいて再試行してください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.badge}>設置業務システム</p>
        <h1 className={styles.title}>ログイン</h1>
        <p className={styles.description}>Firebase Authentication でサインインしてください。</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@company.com"
            required
          />

          <label className={styles.label} htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8文字以上"
            required
          />

          {error ? <p className={styles.error}>{error}</p> : null}

          <button className={styles.submitButton} type="submit" disabled={isLoading}>
            {isLoading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className={styles.footerLinks}>
          <Link href="/" className={styles.link}>
            トップへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
