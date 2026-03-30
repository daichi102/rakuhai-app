"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "./login.module.css";

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

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
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
