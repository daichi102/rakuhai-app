"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "../dashboard/dashboard.module.css";
import { getManagedCases, type ManagedCase } from "@/lib/caseStore";

const menuItems = [
  { label: "ダッシュボード", path: "/dashboard" },
  { label: "メール取込み", path: "/mail-import" },
  { label: "案件管理", path: "/case-management" },
  { label: "マスタ設定", path: "" }
];

const formatDateTime = (value: string) => {
  if (!value) {
    return "日時不明";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ja-JP");
};

export default function CaseManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [managedCases, setManagedCases] = useState<ManagedCase[]>([]);

  useEffect(() => {
    setManagedCases(getManagedCases());
  }, []);

  return (
    <main className={`${styles.page} ${isSidebarCollapsed ? styles.pageCollapsed : ""}`}>
      <aside className={styles.sidebar}>
        <button
          className={styles.sidebarToggle}
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          aria-label={isSidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          {isSidebarCollapsed ? "→" : "←"}
        </button>

        <div className={styles.brand}>
          <div className={styles.brandIcon}>R</div>
          <div className={styles.brandMeta}>
            <p className={styles.brandTitle}>Rakuhai Cloud</p>
            <p className={styles.brandSub}>Operations Suite</p>
          </div>
        </div>

        <nav className={styles.menu}>
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`${styles.menuItem} ${pathname === item.path ? styles.menuItemActive : ""}`}
              type="button"
              onClick={() => {
                if (item.path) {
                  router.push(item.path);
                }
              }}
            >
              <span className={styles.menuDot} />
              <span className={styles.menuLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.headerCaption}>Case Management</p>
            <h1 className={styles.headerTitle}>案件管理</h1>
          </div>
        </header>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>登録済み案件</h2>
            <span>{managedCases.length}件</span>
          </div>

          <div className={styles.mailList}>
            {managedCases.map((item) => (
              <article key={item.id} className={styles.mailCard}>
                <div className={styles.mailHeader}>
                  <p className={styles.mailSubject}>{item.subject || "(件名なし)"}</p>
                </div>
                <p className={styles.mailMeta}>
                  {item.sender} ・ 受信: {formatDateTime(item.receivedAt)}
                </p>
                <p className={styles.mailMeta}>転送日時: {formatDateTime(item.transferredAt)}</p>
                <p className={styles.mailPreview}>{item.preview || "本文プレビューなし"}</p>
              </article>
            ))}

            {managedCases.length === 0 ? <p className={styles.noMailText}>登録済み案件はありません。</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
