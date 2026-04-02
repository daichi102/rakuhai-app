"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

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

type OutlookMessage = {
  id: string;
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt: string;
  preview: string;
  hasAttachments: boolean;
};

const stats: StatCard[] = [
  { label: "本日の案件数", value: "0", tone: "blue" },
  { label: "対応完了", value: "0", tone: "green" },
  { label: "要対応", value: "0", tone: "orange" },
  { label: "遅延リスク", value: "0", tone: "violet" }
];

const tasks: TaskCard[] = [];

const menuItems = ["ダッシュボード", "案件管理", "マスタ設定"];

export default function DashboardPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [outlookMessages, setOutlookMessages] = useState<OutlookMessage[]>([]);
  const [outlookError, setOutlookError] = useState("");

  useEffect(() => {
    const syncOutlookStatus = async () => {
      try {
        const response = await fetch("/api/outlook/status", { cache: "no-store" });
        const data = (await response.json()) as { connected?: boolean };
        setIsOutlookConnected(Boolean(data.connected));
      } catch {
        setOutlookError("Outlook接続状態の確認に失敗しました。");
      } finally {
        setIsStatusLoading(false);
      }
    };

    void syncOutlookStatus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outlookResult = params.get("outlook");
    if (outlookResult === "connected") {
      setOutlookError("");
      setIsOutlookConnected(true);
      return;
    }

    if (outlookResult === "error") {
      const reason = params.get("reason") ?? "Outlook連携に失敗しました。";
      setOutlookError(reason);
    }
  }, []);

  const startOutlookConnect = () => {
    window.location.href = "/api/outlook/connect";
  };

  const loadOutlookMessages = async () => {
    setOutlookError("");
    setIsMessageLoading(true);

    try {
      const response = await fetch("/api/outlook/messages", { cache: "no-store" });
      const data = (await response.json()) as {
        error?: string;
        messages?: OutlookMessage[];
      };

      if (!response.ok) {
        setOutlookError(data.error ?? "Outlookメールの読み込みに失敗しました。");
        if (response.status === 401) {
          setIsOutlookConnected(false);
        }
        return;
      }

      setOutlookMessages(data.messages ?? []);
    } catch {
      setOutlookError("Outlookメールの読み込みに失敗しました。");
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
          {menuItems.map((item, index) => (
            <button
              key={item}
              className={`${styles.menuItem} ${index === 0 ? styles.menuItemActive : ""}`}
              type="button"
            >
              <span className={styles.menuDot} />
              <span className={styles.menuLabel}>{item}</span>
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
              <span>Outlook</span>
            </div>

            <div className={styles.importPanel}>
              <p className={styles.importDescription}>Outlookの受信メールから配送情報を読み込みます。</p>

              <div className={styles.connectionRow}>
                <span className={`${styles.connectionBadge} ${isOutlookConnected ? styles.connected : styles.disconnected}`}>
                  {isStatusLoading ? "確認中..." : isOutlookConnected ? "接続済み" : "未接続"}
                </span>
              </div>

              <div className={styles.importActions}>
                <button className={styles.secondaryButton} type="button" onClick={startOutlookConnect}>
                  {isOutlookConnected ? "Outlookを再連携" : "Outlookに接続"}
                </button>
                <button
                  className={styles.importButton}
                  type="button"
                  onClick={loadOutlookMessages}
                  disabled={!isOutlookConnected || isMessageLoading}
                >
                  {isMessageLoading ? "読み込み中..." : "Outlookメールを読み込む"}
                </button>
              </div>

              {outlookError ? <p className={styles.errorText}>{outlookError}</p> : null}

              <div className={styles.mailList}>
                {outlookMessages.map((message) => (
                  <article key={message.id} className={styles.mailCard}>
                    <div className={styles.mailHeader}>
                      <p className={styles.mailSubject}>{message.subject}</p>
                      {message.hasAttachments ? <span className={styles.mailTag}>添付あり</span> : null}
                    </div>
                    <p className={styles.mailMeta}>
                      {message.senderName || message.senderAddress || "送信者不明"} ・ {formatReceivedAt(message.receivedAt)}
                    </p>
                    <p className={styles.mailPreview}>{message.preview || "本文プレビューなし"}</p>
                  </article>
                ))}

                {outlookMessages.length === 0 ? (
                  <p className={styles.noMailText}>Outlookメールはまだ読み込まれていません。</p>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
