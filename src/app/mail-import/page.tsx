"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "../dashboard/dashboard.module.css";
import { getManagedCases, getPendingCases, saveManagedCases, savePendingCases, type PendingCase } from "@/lib/caseStore";

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

const DAYS_TO_FETCH = 5;

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

const isWithinLastDays = (value: string, days: number, baseDate: Date) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return date >= start && date <= end;
};

export default function MailImportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isImapConfigured, setIsImapConfigured] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [pendingCases, setPendingCases] = useState<PendingCase[]>([]);
  const [mailError, setMailError] = useState("");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const syncStatus = async () => {
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

    const storedPending = getPendingCases().filter((item) => isWithinLastDays(item.receivedAt, DAYS_TO_FETCH, today));
    setPendingCases(storedPending);
    void syncStatus();
  }, [today]);

  const loadMailMessages = async () => {
    setMailError("");
    setIsMessageLoading(true);

    try {
      const response = await fetch("/api/mail/messages", { cache: "no-store" });
      const data = (await response.json()) as {
        error?: string;
        details?: { message?: string };
        messages?: MailMessage[];
      };

      if (!response.ok) {
        const detailMessage = data.details?.message ? ` (${data.details.message})` : "";
        setMailError((data.error ?? "メールの読み込みに失敗しました。") + detailMessage);
        return;
      }

      const fetched = data.messages ?? [];
      const inWindowMessages = fetched.filter((item) => isWithinLastDays(item.receivedAt, DAYS_TO_FETCH, today));

      const existingPending = getPendingCases();
      const managed = getManagedCases();
      const excludedIds = new Set([...existingPending.map((item) => item.id), ...managed.map((item) => item.id)]);

      const additions: PendingCase[] = inWindowMessages
        .filter((item) => !excludedIds.has(item.id))
        .map((item) => ({
          id: item.id,
          subject: item.subject,
          sender: item.senderName || item.senderAddress || "送信者不明",
          receivedAt: item.receivedAt,
          preview: item.preview,
          body: item.body,
          importedAt: new Date().toISOString()
        }));

      const nextPending = [...existingPending, ...additions];
      savePendingCases(nextPending);
      setPendingCases(nextPending.filter((item) => isWithinLastDays(item.receivedAt, DAYS_TO_FETCH, today)));
      setExpandedCaseId(null);
    } catch {
      setMailError("メールの読み込みに失敗しました。");
    } finally {
      setIsMessageLoading(false);
    }
  };

  const transferToCaseManagement = (caseId: string) => {
    const pending = getPendingCases();
    const target = pending.find((item) => item.id === caseId);
    if (!target) {
      return;
    }

    const remaining = pending.filter((item) => item.id !== caseId);
    savePendingCases(remaining);

    const managed = getManagedCases();
    const exists = managed.some((item) => item.id === caseId);
    if (!exists) {
      saveManagedCases([
        {
          ...target,
          transferredAt: new Date().toISOString()
        },
        ...managed
      ]);
    }

    setPendingCases(remaining.filter((item) => isWithinLastDays(item.receivedAt, DAYS_TO_FETCH, today)));
    setExpandedCaseId((current) => (current === caseId ? null : current));
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
            <p className={styles.headerCaption}>Mail Import</p>
            <h1 className={styles.headerTitle}>メール取込み</h1>
          </div>
        </header>

        <section className={`${styles.mainGrid} ${styles.mailImportGrid}`}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>メール読み込み</h2>
              <span>IMAP</span>
            </div>

            <div className={styles.importPanel}>
              <p className={styles.importDescription}>受信メールから本日の新規未確定案件を作成します。</p>

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
            </div>
          </section>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>直近5日の新規未確定案件</h2>
              <span>{pendingCases.length}件</span>
            </div>

            <div className={`${styles.mailList} ${styles.mailImportList}`}>
              {pendingCases.map((item) => (
                <article
                  key={item.id}
                  className={`${styles.mailCard} ${styles.mailCardClickable}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedCaseId((current) => (current === item.id ? null : item.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedCaseId((current) => (current === item.id ? null : item.id));
                    }
                  }}
                >
                  <div className={styles.mailHeader}>
                    <p className={styles.mailSubject}>{item.subject || "(件名なし)"}</p>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        transferToCaseManagement(item.id);
                      }}
                    >
                      案件管理へ転送
                    </button>
                  </div>
                  <p className={styles.mailMeta}>
                    {item.sender} ・ {formatDateTime(item.receivedAt)}
                  </p>
                  <p className={styles.mailPreview}>{item.preview || "本文プレビューなし"}</p>
                  {expandedCaseId === item.id ? <pre className={styles.mailBody}>{item.body || "本文なし"}</pre> : null}
                </article>
              ))}

              {pendingCases.length === 0 ? (
                <p className={styles.noMailText}>直近5日の新規未確定案件はありません。</p>
              ) : null}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
