"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import styles from "../dashboard/dashboard.module.css";
import {
  getManagedCases,
  getPendingCases,
  saveManagedCases,
  savePendingCases,
  type ManagedCase,
  type PendingCase
} from "@/lib/caseStore";

type MailMessage = {
  id: string;
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt: string;
  body: string;
  preview: string;
  hasAttachments: boolean;
  attachments: {
    filename: string;
    size: number;
    contentType: string;
    isExcel: boolean;
    contentBase64?: string;
  }[];
  hasExcelAttachment: boolean;
};

type CaseStatus = "pending" | "managed";

type CaseRow = (PendingCase | ManagedCase) & {
  status: CaseStatus;
};

type ExcelPreview = {
  filename: string;
  sheets: { name: string; data: string[][] }[];
  activeSheet: number;
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

const formatSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatSender = (senderName?: string, senderAddress?: string) => {
  if (senderName && senderAddress) {
    return `${senderName} <${senderAddress}>`;
  }

  return senderName || senderAddress || "送信者不明";
};

const isExchangeRequest = (item: PendingCase | ManagedCase) => /(交換|差し替え|replacement)/i.test(item.subject);

const openExcelPreview = (file: { filename: string; contentBase64?: string }): ExcelPreview | null => {
  if (!file.contentBase64) {
    return null;
  }

  try {
    const binary = atob(file.contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const workbook = XLSX.read(bytes, { type: "array" });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      data: XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], { header: 1, defval: "" })
    }));

    return { filename: file.filename, sheets, activeSheet: 0 };
  } catch {
    return null;
  }
};

const downloadAttachment = (file: { filename: string; contentType: string; contentBase64?: string }) => {
  if (!file.contentBase64 || typeof window === "undefined") {
    return false;
  }

  const binary = window.atob(file.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: file.contentType || "application/octet-stream" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
  return true;
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
  const [managedCases, setManagedCases] = useState<ManagedCase[]>([]);
  const [mailError, setMailError] = useState("");
  const [isUnprocessedOnly, setIsUnprocessedOnly] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);
  const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);

  const today = useMemo(() => new Date(), []);

  const reloadCaseLists = () => {
    const nextPending = getPendingCases().filter((item) => isWithinLastDays(item.receivedAt, DAYS_TO_FETCH, today));
    const nextManaged = getManagedCases().filter((item) => isWithinLastDays(item.receivedAt, DAYS_TO_FETCH, today));
    setPendingCases(nextPending);
    setManagedCases(nextManaged);
  };

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

    reloadCaseLists();
    void syncStatus();
  }, [today]);

  const caseRows = useMemo<CaseRow[]>(() => {
    const pendingRows = pendingCases.map((item) => ({
      ...item,
      status: "pending" as const
    }));
    const managedRows = managedCases.map((item) => ({
      ...item,
      status: "managed" as const
    }));

    return [...pendingRows, ...managedRows].sort((a, b) => {
      const aTime = new Date(a.receivedAt).getTime();
      const bTime = new Date(b.receivedAt).getTime();
      return bTime - aTime;
    });
  }, [pendingCases, managedCases]);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return caseRows.filter((item) => {
      if (isUnprocessedOnly && item.status !== "pending") {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = `${item.subject} ${item.sender} ${item.senderName ?? ""} ${item.senderAddress ?? ""}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [caseRows, isUnprocessedOnly, searchText]);

  const unprocessedCount = caseRows.filter((item) => item.status === "pending").length;

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

      const inWindowById = new Map(inWindowMessages.map((item) => [item.id, item]));
      const refreshedPending = existingPending.map((item) => {
        const latest = inWindowById.get(item.id);
        if (!latest) {
          return item;
        }

        return {
          ...item,
          sender: formatSender(latest.senderName, latest.senderAddress),
          senderName: latest.senderName,
          senderAddress: latest.senderAddress,
          receivedAt: latest.receivedAt,
          preview: latest.preview,
          body: latest.body,
          attachments: latest.attachments
        };
      });

      const excludedIds = new Set([...refreshedPending.map((item) => item.id), ...managed.map((item) => item.id)]);

      const additions: PendingCase[] = inWindowMessages
        .filter((item) => !excludedIds.has(item.id))
        .map((item) => ({
          id: item.id,
          subject: item.subject,
          sender: formatSender(item.senderName, item.senderAddress),
          senderName: item.senderName,
          senderAddress: item.senderAddress,
          receivedAt: item.receivedAt,
          preview: item.preview,
          body: item.body,
          attachments: item.attachments,
          importedAt: new Date().toISOString()
        }));

      const nextPending = [...refreshedPending, ...additions];
      savePendingCases(nextPending);
      reloadCaseLists();
      setSelectedCase(null);
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

    reloadCaseLists();
    setSelectedCase((current) => (current?.id === caseId ? null : current));
  };

  const transferBulkToCaseManagement = () => {
    const targets = filteredRows.filter((item) => item.status === "pending");
    if (targets.length === 0) {
      return;
    }

    const targetIds = new Set(targets.map((item) => item.id));
    const pending = getPendingCases();
    const managed = getManagedCases();
    const existingManagedIds = new Set(managed.map((item) => item.id));

    const toTransfer = pending.filter((item) => targetIds.has(item.id));
    const remaining = pending.filter((item) => !targetIds.has(item.id));
    savePendingCases(remaining);

    const additions = toTransfer
      .filter((item) => !existingManagedIds.has(item.id))
      .map((item) => ({
        ...item,
        transferredAt: new Date().toISOString()
      }));

    saveManagedCases([...additions, ...managed]);
    reloadCaseLists();

    if (selectedCase && targetIds.has(selectedCase.id)) {
      setSelectedCase(null);
    }
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
          <section className={`${styles.panel} ${styles.mailOpsPanel}`}>
            <div className={styles.mailOpsHeader}>
              <div>
                <p className={styles.mailOpsLabel}>未処理件数</p>
                <p className={styles.mailOpsCount}>未処理{unprocessedCount}件</p>
              </div>

              <div className={styles.mailOpsButtons}>
                <button
                  className={styles.primaryCaseButton}
                  type="button"
                  onClick={transferBulkToCaseManagement}
                  disabled={unprocessedCount === 0}
                >
                  一括案件化
                </button>
                <button
                  className={styles.importButton}
                  type="button"
                  onClick={loadMailMessages}
                  disabled={!isImapConfigured || isMessageLoading}
                >
                  {isMessageLoading ? "再取得中..." : "メール再取得"}
                </button>
              </div>
            </div>

            <div className={styles.mailFilters}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isUnprocessedOnly}
                  onChange={(event) => setIsUnprocessedOnly(event.target.checked)}
                />
                未処理のみ
              </label>

              <input
                className={styles.searchInput}
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="件名・取引先で検索"
              />

              <span className={`${styles.connectionBadge} ${isImapConfigured ? styles.connected : styles.disconnected}`}>
                {isStatusLoading ? "IMAP確認中" : isImapConfigured ? "IMAP設定済み" : "IMAP未設定"}
              </span>
            </div>

            {mailError ? <p className={styles.errorText}>{mailError}</p> : null}

            <div className={styles.mailTableWrap}>
              <table className={styles.mailTable}>
                <thead>
                  <tr>
                    <th>状態</th>
                    <th>件名</th>
                    <th>取引先</th>
                    <th>日時</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item) => (
                    <tr key={`${item.status}-${item.id}`} onClick={() => setSelectedCase(item)}>
                      <td>
                        <span className={item.status === "pending" ? styles.statusPending : styles.statusManaged}>
                          {item.status === "pending" ? "未処理" : "処理済"}
                        </span>
                      </td>
                      <td>
                        <p className={styles.tableSubject} title={item.subject || "(件名なし)"}>
                          {item.subject || "(件名なし)"}
                        </p>
                      </td>
                      <td>
                        <p className={styles.tableSender} title={item.sender}>
                          {item.sender}
                        </p>
                      </td>
                      <td>{formatDateTime(item.receivedAt)}</td>
                      <td>
                        <button
                          className={styles.convertButton}
                          type="button"
                          disabled={item.status !== "pending"}
                          onClick={(event) => {
                            event.stopPropagation();
                            transferToCaseManagement(item.id);
                          }}
                        >
                          案件化
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRows.length === 0 ? <p className={styles.noMailText}>表示対象のメールはありません。</p> : null}
            </div>
          </section>
        </section>

        {selectedCase ? (
          <div className={styles.modalOverlay} onClick={() => setSelectedCase(null)}>
            <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{selectedCase.subject || "(件名なし)"}</h3>
                <button className={styles.modalClose} type="button" onClick={() => setSelectedCase(null)}>
                  ×
                </button>
              </div>

              <div className={styles.modalMeta}>
                <p>
                  <strong>送信者:</strong> {formatSender(selectedCase.senderName, selectedCase.senderAddress)}
                </p>
                <p>
                  <strong>受信日時:</strong> {formatDateTime(selectedCase.receivedAt)}
                </p>
                <p>
                  <strong>状態:</strong> {selectedCase.status === "pending" ? "未処理" : "処理済"}
                </p>
              </div>

              {selectedCase.attachments?.filter((file) => file.isExcel).length ? (
                <section className={styles.attachmentSection}>
                  <h4>{isExchangeRequest(selectedCase) ? "交換依頼のExcel添付" : "Excel添付"}</h4>
                  <ul>
                    {selectedCase.attachments
                      ?.filter((file) => file.isExcel)
                      .map((file) => (
                        <li key={`${selectedCase.id}-${file.filename}`}>
                          <span>{file.filename}</span>
                          <span className={styles.attachmentActions}>
                            <span>{formatSize(file.size)}</span>
                            <button
                              className={styles.attachmentButton}
                              type="button"
                              onClick={() => {
                                const preview = openExcelPreview(file);
                                if (!preview) {
                                  setMailError("このExcel添付は読み込みデータが不足しているため開けません。メール再取得を実行してください。");
                                } else {
                                  setExcelPreview(preview);
                                }
                              }}
                            >
                              プレビュー
                            </button>
                            <button
                              className={styles.attachmentButton}
                              type="button"
                              onClick={() => {
                                const isDownloaded = downloadAttachment(file);
                                if (!isDownloaded) {
                                  setMailError("このExcel添付は読み込みデータが不足しているため開けません。メール再取得を実行してください。");
                                }
                              }}
                            >
                              ダウンロード
                            </button>
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              ) : null}

              <section className={styles.modalBodyWrap}>
                <h4>本文</h4>
                <pre className={styles.mailBody}>{selectedCase.body || "本文なし"}</pre>
              </section>
            </div>
          </div>
        ) : null}

        {excelPreview ? (
          <div className={styles.modalOverlay} onClick={() => setExcelPreview(null)}>
            <div className={`${styles.modalCard} ${styles.excelModalCard}`} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{excelPreview.filename}</h3>
                <button className={styles.modalClose} type="button" onClick={() => setExcelPreview(null)}>
                  ×
                </button>
              </div>

              {excelPreview.sheets.length > 1 ? (
                <div className={styles.excelTabList}>
                  {excelPreview.sheets.map((sheet, index) => (
                    <button
                      key={`${sheet.name}-${index}`}
                      className={`${styles.excelTab} ${excelPreview.activeSheet === index ? styles.excelTabActive : ""}`}
                      type="button"
                      onClick={() => setExcelPreview({ ...excelPreview, activeSheet: index })}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className={styles.excelTableWrap}>
                <table className={styles.excelTable}>
                  <thead>
                    <tr>
                      {excelPreview.sheets[excelPreview.activeSheet]?.data[0]?.map((header, idx) => (
                        <th key={`header-${idx}`}>{header}</th>
                      )) || null}
                    </tr>
                  </thead>
                  <tbody>
                    {excelPreview.sheets[excelPreview.activeSheet]?.data.slice(1).map((row, rowIdx) => (
                      <tr key={`row-${rowIdx}`}>
                        {row.map((cell, cellIdx) => (
                          <td key={`cell-${rowIdx}-${cellIdx}`}>{cell}</td>
                        ))}
                      </tr>
                    )) || null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
