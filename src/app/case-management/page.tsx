"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import styles from "../dashboard/dashboard.module.css";
import { getManagedCases, type ManagedCase, type WorkCheck, type AizaInfo } from "@/lib/caseStore";
import { defaultWorkCheckItems, calculateWorkCheckTotal } from "@/lib/workCheckDefaults";

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

type TabType = "details" | "workcheck" | "report";

function DetailsTab({ caseData }: { caseData: ManagedCase }) {
  const aiza = caseData.aizaInfo;

  return (
    <div className={styles.tabContent}>
      <h3 style={{ marginBottom: "16px" }}>アイザシート情報</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>発注元名</label>
          <p style={{ margin: 0 }}>{aiza?.orderName || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>発注元電話</label>
          <p style={{ margin: 0 }}>{aiza?.orderPhone || "-"}</p>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>発注元住所</label>
          <p style={{ margin: 0 }}>{aiza?.orderAddress || "-"}</p>
        </div>
      </div>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #ddd" }} />

      <h3 style={{ marginTop: "20px", marginBottom: "16px" }}>お客様情報</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>顧客カナ</label>
          <p style={{ margin: 0 }}>{aiza?.customerKana || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>顧客名</label>
          <p style={{ margin: 0 }}>{aiza?.customerName || "-"}</p>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>顧客住所</label>
          <p style={{ margin: 0 }}>{aiza?.customerAddress || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>顧客電話</label>
          <p style={{ margin: 0 }}>{aiza?.customerPhone || "-"}</p>
        </div>
      </div>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #ddd" }} />

      <h3 style={{ marginTop: "20px", marginBottom: "16px" }}>商品情報</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>商品名</label>
          <p style={{ margin: 0 }}>{aiza?.productName || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>製造番号</label>
          <p style={{ margin: 0 }}>{aiza?.productCode || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>色</label>
          <p style={{ margin: 0 }}>{aiza?.productColor || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>数量</label>
          <p style={{ margin: 0 }}>{aiza?.productQty || "-"}</p>
        </div>
      </div>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #ddd" }} />

      <h3 style={{ marginTop: "20px", marginBottom: "16px" }}>作業情報</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>訪問日</label>
          <p style={{ margin: 0 }}>{aiza?.visitDate || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>立会有無</label>
          <p style={{ margin: 0 }}>{aiza?.hasAttendant || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>既設品搬出</label>
          <p style={{ margin: 0 }}>{aiza?.existingRemoval || "-"}</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>保証書</label>
          <p style={{ margin: 0 }}>{aiza?.warranty || "-"}</p>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>備考</label>
          <p style={{ margin: 0 }}>{aiza?.notes || "-"}</p>
        </div>
      </div>
    </div>
  );
}

function WorkCheckTab({ caseData, workCheckState, setWorkCheckState }: { caseData: ManagedCase; workCheckState: WorkCheck; setWorkCheckState: (state: WorkCheck) => void }) {
  const sigCanvasRef = useRef<any>(null);

  const handleItemCheck = (itemId: string, checked: boolean) => {
    const updatedItems = workCheckState.items.map((item) =>
      item.id === itemId ? { ...item, checked } : item
    );
    const { subtotalInstall, subtotalParts, subtotalExtra, total } = calculateWorkCheckTotal(updatedItems);
    setWorkCheckState({ ...workCheckState, items: updatedItems, subtotalInstall, subtotalParts, subtotalExtra, total });
  };

  const handleQtyChange = (itemId: string, qty: number) => {
    const updatedItems = workCheckState.items.map((item) =>
      item.id === itemId ? { ...item, qty } : item
    );
    const { subtotalInstall, subtotalParts, subtotalExtra, total } = calculateWorkCheckTotal(updatedItems);
    setWorkCheckState({ ...workCheckState, items: updatedItems, subtotalInstall, subtotalParts, subtotalExtra, total });
  };

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const saveSignature = () => {
    const sig = sigCanvasRef.current?.toDataURL("image/png");
    if (sig) {
      setWorkCheckState({ ...workCheckState, signatureDataUrl: sig, signedAt: new Date().toISOString() });
    }
  };

  return (
    <div className={styles.tabContent}>
      <h3 style={{ marginBottom: "16px" }}>工事内容チェックリスト</h3>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: "8px", textAlign: "left" }}>チェック</th>
            <th style={{ padding: "8px", textAlign: "left" }}>内容</th>
            <th style={{ padding: "8px", textAlign: "center", width: "60px" }}>数量</th>
            <th style={{ padding: "8px", textAlign: "right", width: "100px" }}>単価</th>
            <th style={{ padding: "8px", textAlign: "right", width: "100px" }}>金額</th>
          </tr>
        </thead>
        <tbody>
          {workCheckState.items.map((item) => {
            const amount = (item.checked ? (item.qty || 0) * (item.unitPrice || 0) : 0).toLocaleString("ja-JP");
            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => handleItemCheck(item.id, e.target.checked)}
                  />
                </td>
                <td style={{ padding: "8px" }}>{item.label}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  {item.unitPrice ? (
                    <input
                      type="number"
                      value={item.qty || 0}
                      onChange={(e) => handleQtyChange(item.id, Math.max(0, Number(e.target.value)))}
                      style={{ width: "50px", padding: "4px" }}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  {item.unitPrice ? `¥${item.unitPrice.toLocaleString("ja-JP")}` : "-"}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>¥{amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "4px", marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px 0" }}>設置商品小計</p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>¥{workCheckState.subtotalInstall.toLocaleString("ja-JP")}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px 0" }}>部材・料金小計</p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>¥{workCheckState.subtotalParts.toLocaleString("ja-JP")}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px 0" }}>別途料金小計</p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>¥{workCheckState.subtotalExtra.toLocaleString("ja-JP")}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px 0" }}>合計金額</p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#d32f2f" }}>¥{workCheckState.total.toLocaleString("ja-JP")}</p>
          </div>
        </div>
      </div>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #ddd" }} />

      <h3 style={{ marginTop: "20px", marginBottom: "16px" }}>お客様サイン</h3>

      <div style={{ border: "1px solid #ddd", borderRadius: "4px", marginBottom: "12px" }}>
        <SignatureCanvas
          ref={sigCanvasRef}
          canvasProps={{
            width: 500,
            height: 150,
            className: "sigCanvas",
            style: { border: "1px solid #ddd", borderRadius: "4px", backgroundColor: "#fff" }
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={clearSignature} style={{ padding: "8px 16px", backgroundColor: "#f5f5f5", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}>
          クリア
        </button>
        <button onClick={saveSignature} style={{ padding: "8px 16px", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          サイン保存
        </button>
      </div>

      {workCheckState.signatureDataUrl && (
        <div style={{ marginTop: "12px" }}>
          <p style={{ fontSize: "12px", color: "#666", margin: "0 0 8px 0" }}>サイン確認</p>
          <img src={workCheckState.signatureDataUrl} alt="signature" style={{ maxWidth: "200px", border: "1px solid #ddd", borderRadius: "4px" }} />
        </div>
      )}
    </div>
  );
}

function ReportTab({ caseData, workCheckState }: { caseData: ManagedCase; workCheckState: WorkCheck }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const generatePDF = async () => {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseData.id,
          aizaInfo: caseData.aizaInfo,
          workCheck: workCheckState
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PDF生成に失敗しました");
      }

      if (data.pdfUrl) {
        const link = document.createElement("a");
        link.href = data.pdfUrl;
        link.download = `completion-report-${caseData.id}.pdf`;
        link.click();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF生成に失敗しました");
      console.error("PDF生成エラー:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      <h3 style={{ marginBottom: "16px" }}>作業完了書</h3>

      {error && <div style={{ padding: "12px", backgroundColor: "#ffebee", color: "#c62828", borderRadius: "4px", marginBottom: "16px" }}>{error}</div>}

      {caseData.completionReport ? (
        <>
          <p style={{ fontSize: "14px", color: "#666" }}>生成日時: {formatDateTime(caseData.completionReport.generatedAt)}</p>

          <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px", textAlign: "center" }}>
            <p style={{ margin: "0 0 12px 0" }}>QRコード</p>
            {/* TODO: QRコード表示 */}
            <div style={{ width: "150px", height: "150px", margin: "0 auto", backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              QRコード
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <a href={caseData.completionReport.pdfStoragePath} download style={{ display: "inline-block", padding: "8px 16px", backgroundColor: "#4caf50", color: "white", textDecoration: "none", borderRadius: "4px", cursor: "pointer" }}>
              PDFをダウンロード
            </a>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: "#666", marginBottom: "16px" }}>作業チェック表を完了した後、生成できます。</p>
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            style={{
              padding: "8px 16px",
              backgroundColor: isGenerating ? "#ccc" : "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isGenerating ? "not-allowed" : "pointer"
            }}
          >
            {isGenerating ? "生成中..." : "作業完了書を生成する"}
          </button>
        </>
      )}
    </div>
  );
}

export default function CaseManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [managedCases, setManagedCases] = useState<ManagedCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ManagedCase | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [workCheckState, setWorkCheckState] = useState<WorkCheck>({
    items: defaultWorkCheckItems,
    subtotalInstall: 0,
    subtotalParts: 0,
    subtotalExtra: 0,
    total: 0
  });

  useEffect(() => {
    setManagedCases(getManagedCases());
  }, []);

  const handleSelectCase = (caseItem: ManagedCase) => {
    setSelectedCase(caseItem);
    setActiveTab("details");
    setWorkCheckState(caseItem.workCheck || { items: defaultWorkCheckItems, subtotalInstall: 0, subtotalParts: 0, subtotalExtra: 0, total: 0 });
  };

  const closeModal = () => {
    setSelectedCase(null);
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
              <article key={item.id} className={styles.mailCard} onClick={() => handleSelectCase(item)} style={{ cursor: "pointer" }}>
                <div className={styles.mailHeader}>
                  <p className={styles.mailSubject}>{item.subject || "(件名なし)"}</p>
                </div>
                <p className={styles.mailMeta}>
                  {item.senderName || item.sender} ・ 受信: {formatDateTime(item.receivedAt)}
                </p>
                <p className={styles.mailMeta}>転送日時: {formatDateTime(item.transferredAt)}</p>
                <p className={styles.mailPreview}>{item.preview || "本文プレビューなし"}</p>
              </article>
            ))}

            {managedCases.length === 0 ? <p className={styles.noMailText}>登録済み案件はありません。</p> : null}
          </div>
        </section>
      </section>

      {/* モーダル */}
      {selectedCase && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", borderRadius: "8px", width: "90%", maxWidth: "900px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid #eee", position: "sticky", top: 0, backgroundColor: "white" }}>
              <h2 style={{ margin: 0 }}>{selectedCase.subject}</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}>
                ×
              </button>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
              <button
                onClick={() => setActiveTab("details")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  backgroundColor: activeTab === "details" ? "#2196f3" : "#f5f5f5",
                  color: activeTab === "details" ? "white" : "black",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                作業詳細
              </button>
              <button
                onClick={() => setActiveTab("workcheck")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  backgroundColor: activeTab === "workcheck" ? "#2196f3" : "#f5f5f5",
                  color: activeTab === "workcheck" ? "white" : "black",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                作業チェック表
              </button>
              <button
                onClick={() => setActiveTab("report")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  backgroundColor: activeTab === "report" ? "#2196f3" : "#f5f5f5",
                  color: activeTab === "report" ? "white" : "black",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                作業完了書
              </button>
            </div>

            <div style={{ padding: "16px" }}>
              {activeTab === "details" && <DetailsTab caseData={selectedCase} />}
              {activeTab === "workcheck" && <WorkCheckTab caseData={selectedCase} workCheckState={workCheckState} setWorkCheckState={setWorkCheckState} />}
              {activeTab === "report" && <ReportTab caseData={selectedCase} workCheckState={workCheckState} />}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
