"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { getManagedCases, getPendingCases } from "@/lib/caseStore";

type StatCard = {
  label: string;
  value: string;
  tone: "blue" | "green" | "orange" | "violet";
};

type TaskCard = {
  id: string;
  title: string;
  date: string;
  status: string;
  priority: "urgent" | "normal";
};

type MailMessage = {
  id: string;
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt: string;
  body: string;
  preview: string;
  hasAttachments: boolean;
};

const tasks: TaskCard[] = [];

const menuItems = [
  { label: "ダッシュボード", path: "/dashboard" },
  { label: "メール取込み", path: "/mail-import" },
  { label: "案件管理", path: "/case-management" },
  { label: "マスタ設定", path: "" }
];

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isImapConfigured, setIsImapConfigured] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [mailMessages, setMailMessages] = useState<MailMessage[]>([]);
  const [mailError, setMailError] = useState("");
  const [expandedMailId, setExpandedMailId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatCard[]>([
    { label: "本日の案件数", value: "0", tone: "blue" },
    { label: "対応完了", value: "0", tone: "green" },
    { label: "要対応", value: "0", tone: "orange" },
    { label: "遅延リスク", value: "0", tone: "violet" }
  ]);

  useEffect(() => {
    const syncMailStatus = async () => {
      try {
        const response = await fetch("/api/mail/status", { cache: "no-store" });
        const data = (await response.json()) as { configured?: boolean };
        setIsImapConfigured(Boolean(data.configured));
      } catch {
        setMailError("IMAP設定状態の確認に失敗しました。");
      } finally {
        setIsStatusLoading(false);
      }
    };

    // 統計情報を更新
    const pending = getPendingCases();
    const managed = getManagedCases();
    const today = new Date().toLocaleDateString("ja-JP");

    const todayCount = [
      ...pending,
      ...managed
    ].filter((c) => new Date(c.receivedAt).toLocaleDateString("ja-JP") === today).length;

    setStats([
      { label: "本日の案件数", value: String(todayCount), tone: "blue" },
      { label: "対応完了", value: String(managed.length), tone: "green" },
      { label: "要対応", value: String(pending.length), tone: "orange" },
      { label: "遅延リスク", value: "0", tone: "violet" }
    ]);

    void syncMailStatus();
  }, []);

  const loadMailMessages = async () => {
    setMailError("");
    setIsMessageLoading(true);

    try {
      const response = await fetch("/api/mail/messages", { cache: "no-store" });
      const data = (await response.json()) as {
        error?: string;
        messages?: MailMessage[];
      };

      if (!response.ok) {
        setMailError(data.error ?? "IMAPメールの読み込みに失敗しました。");
        return;
      }

      setMailMessages(data.messages ?? []);
      setExpandedMailId(null);
    } catch {
      setMailError("IMAPメールの読み込みに失敗しました。");
    } finally {
      setIsMessageLoading(false);
    }
  };

  const formatReceivedAt = (value: string) => {
    if (!value) {
      return "日時不明";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("ja-JP");
  };

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
            <p className={styles.headerCaption}>Overview</p>
            <h1 className={styles.headerTitle}>ダッシュボード</h1>
          </div>
        </header>

        <section className={styles.statsGrid}>
          {stats.map((stat) => (
            <article key={stat.label} className={`${styles.statCard} ${styles[`tone_${stat.tone}`]}`}>
              <p className={styles.statLabel}>{stat.label}</p>
              <p className={styles.statValue}>{stat.value}</p>
            </article>
          ))}
        </section>

        <section className={styles.mainGrid}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>要対応リスト</h2>
              <span>優先順</span>
            </div>

            <div className={styles.taskList}>
              {tasks.map((task) => (
                <article key={task.id} className={styles.taskCard}>
                  <span
                    className={`${styles.priorityBar} ${
                      task.priority === "urgent" ? styles.priorityUrgent : styles.priorityNormal
                    }`}
                  />
                  <div className={styles.taskBody}>
                    <div className={styles.taskTop}>
                      <p className={styles.taskTitle}>{task.title}</p>
                      <span className={styles.taskId}>{task.id}</span>
                    </div>
                    <div className={styles.taskMeta}>
                      <span>{task.date}</span>
                      <span className={styles.dot}>•</span>
                      <span>{task.status}</span>
                    </div>
                  </div>
                </article>
              ))}
              {tasks.length === 0 && <p className={styles.emptyText}>現在、要対応案件はありません。</p>}
            </div>
          </section>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>配送読み込み</h2>
              <span>IMAP</span>
            </div>

            <div className={styles.importPanel}>
              <p className={styles.importDescription}>IMAP受信メールから配送情報を読み込みます。</p>

              <div className={styles.connectionRow}>
                <span className={`${styles.connectionBadge} ${isImapConfigured ? styles.connected : styles.disconnected}`}>
                  {isStatusLoading ? "確認中..." : isImapConfigured ? "設定済み" : "未設定"}
                </span>
              </div>

              <div className={styles.importActions}>
                <button
                  className={styles.importButton}
                  type="button"
                  onClick={loadMailMessages}
                  disabled={!isImapConfigured || isMessageLoading}
                >
                  {isMessageLoading ? "読み込み中..." : "メールを読み込む"}
                </button>
              </div>

              {mailError ? <p className={styles.errorText}>{mailError}</p> : null}

              <div className={styles.mailList}>
                {mailMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`${styles.mailCard} ${styles.mailCardClickable}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedMailId((current) => (current === message.id ? null : message.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedMailId((current) => (current === message.id ? null : message.id));
                      }
                    }}
                  >
                    <div className={styles.mailHeader}>
                      <p className={styles.mailSubject}>{message.subject}</p>
                      {message.hasAttachments ? <span className={styles.mailTag}>添付あり</span> : null}
                    </div>
                    <p className={styles.mailMeta}>
                      {message.senderName || message.senderAddress || "送信者不明"} ・ {formatReceivedAt(message.receivedAt)}
                    </p>
                    <p className={styles.mailPreview}>{message.preview || "本文プレビューなし"}</p>
                    {expandedMailId === message.id ? (
                      <pre className={styles.mailBody}>{message.body || "本文なし"}</pre>
                    ) : null}
                  </article>
                ))}

                {mailMessages.length === 0 ? (
                  <p className={styles.noMailText}>メールはまだ読み込まれていません。</p>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
