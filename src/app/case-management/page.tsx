"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import styles from "../dashboard/dashboard.module.css";
import { getManagedCases, saveManagedCases, type ManagedCase, type WorkCheck, type WorkCheckFull, type CompletionReportForm, type CompletionReportRow, type AizaInfo } from "@/lib/caseStore";
import { PRICE_LIST, getPriceLabel, getGroupedPrices } from "@/lib/priceList";
import { defaultWorkCheckItems, calculateWorkCheckTotal, defaultWorkCheckFull } from "@/lib/workCheckDefaults";

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

function WorkCheckTab({ caseData }: { caseData: ManagedCase }) {
  const [workCheck, setWorkCheck] = useState<WorkCheckFull>(caseData.workCheckFull || defaultWorkCheckFull(caseData.aizaInfo));
  const sigCanvasRef = useRef<any>(null);

  const handleFieldChange = (field: keyof WorkCheckFull, value: any) => {
    setWorkCheck((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckChange = (field: keyof WorkCheckFull, checked: boolean) => {
    setWorkCheck((prev) => ({ ...prev, [field]: checked }));
  };

  const handleOptionWorkToggle = (work: string) => {
    setWorkCheck((prev) => {
      const optionWorks = prev.optionWorks || [];
      if (optionWorks.includes(work)) {
        return { ...prev, optionWorks: optionWorks.filter((w) => w !== work) };
      }
      return { ...prev, optionWorks: [...optionWorks, work] };
    });
  };

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const saveSignature = () => {
    const sig = sigCanvasRef.current?.toDataURL("image/png");
    if (sig) {
      handleFieldChange("signatureDataUrl", sig);
      handleFieldChange("signedAt", new Date().toISOString());
    }
  };

  const inputStyle = { padding: "8px", border: "1px solid #ddd", borderRadius: "4px", width: "100%" };
  const labelStyle = { display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" };

  return (
    <div className={styles.tabContent}>
      <h3 style={{ marginBottom: "20px" }}>作業チェック表</h3>

      {/* 5-1 基本情報 */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>5-1 基本情報</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>
              問い合わせ番号 <span style={{ color: "red" }}>※</span>
            </label>
            <input type="text" value={workCheck.inquiryNo || ""} onChange={(e) => handleFieldChange("inquiryNo", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              作業担当者 <span style={{ color: "red" }}>※</span>
            </label>
            <input type="text" value={workCheck.worker || ""} onChange={(e) => handleFieldChange("worker", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>販売店</label>
            <input type="text" value={workCheck.store || ""} onChange={(e) => handleFieldChange("store", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              設置商品（品番） <span style={{ color: "red" }}>※</span>
            </label>
            <input type="text" value={workCheck.productCode || ""} onChange={(e) => handleFieldChange("productCode", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>製造番号</label>
            <input type="text" value={workCheck.serialNo || ""} onChange={(e) => handleFieldChange("serialNo", e.target.value)} style={inputStyle} />
          </div>
        </div>
      </section>

      {/* 5-2 商品搬入時チェック */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>
          5-2 商品搬入時チェック <span style={{ color: "red" }}>※必須</span>
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.unboxWithCustomer || false} onChange={(e) => handleCheckChange("unboxWithCustomer", e.target.checked)} />
            お客様立会いで開梱
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.checkScratchOnUnbox || false} onChange={(e) => handleCheckChange("checkScratchOnUnbox", e.target.checked)} />
            開梱時キズ確認
          </label>
          <div>
            <label style={labelStyle}>搬入前ルート確認</label>
            <select value={workCheck.checkRouteBeforeCarryIn || ""} onChange={(e) => handleFieldChange("checkRouteBeforeCarryIn", e.target.value)} style={inputStyle}>
              <option value="">-- 選択 --</option>
              <option value="床">床</option>
              <option value="壁">壁</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.checkScratchAroundInstall || false} onChange={(e) => handleCheckChange("checkScratchAroundInstall", e.target.checked)} />
            設置場所周囲キズ確認
          </label>
        </div>
      </section>

      {/* 5-3 作業終了後チェック */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>
          5-3 作業終了後チェック <span style={{ color: "red" }}>※必須</span>
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.customerConfirm || false} onChange={(e) => handleCheckChange("customerConfirm", e.target.checked)} />
            お客様による設置状況確認
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.operationCheck || false} onChange={(e) => handleCheckChange("operationCheck", e.target.checked)} />
            動作確認（立会い）
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.checkScratchAfterInstall || false} onChange={(e) => handleCheckChange("checkScratchAfterInstall", e.target.checked)} />
            設置後キズ確認
          </label>
          <div>
            <label style={labelStyle}>搬入後ルート確認</label>
            <select value={workCheck.checkRouteAfterCarryIn || ""} onChange={(e) => handleFieldChange("checkRouteAfterCarryIn", e.target.value)} style={inputStyle}>
              <option value="">-- 選択 --</option>
              <option value="床">床</option>
              <option value="壁">壁</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.cleaning || false} onChange={(e) => handleCheckChange("cleaning", e.target.checked)} />
            清掃実施
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.explanation || false} onChange={(e) => handleCheckChange("explanation", e.target.checked)} />
            取扱説明
          </label>
        </div>
      </section>

      {/* 5-4 搬入/搬出・オプション */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>5-4 搬入/搬出・オプション</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>エレベーター</label>
            <select value={workCheck.elevator || ""} onChange={(e) => handleFieldChange("elevator", e.target.value)} style={inputStyle}>
              <option value="">-- 選択 --</option>
              <option value="無">無</option>
              <option value="有">有</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>設置階数</label>
            <input type="text" value={workCheck.floorNo || ""} onChange={(e) => handleFieldChange("floorNo", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>階段</label>
            <select value={workCheck.stairs || ""} onChange={(e) => handleFieldChange("stairs", e.target.value)} style={inputStyle}>
              <option value="">-- 選択 --</option>
              <option value="屋内">屋内</option>
              <option value="屋外">屋外</option>
              <option value="なし">なし</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.warranty || false} onChange={(e) => handleCheckChange("warranty", e.target.checked)} />
            保証書
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={workCheck.takeBack || false} onChange={(e) => handleCheckChange("takeBack", e.target.checked)} />
            持ち帰り
          </label>
          <div>
            <label style={labelStyle}>搬出品</label>
            <select value={workCheck.carryOut || ""} onChange={(e) => handleFieldChange("carryOut", e.target.value)} style={inputStyle}>
              <option value="">-- 選択 --</option>
              <option value="無">無</option>
              <option value="有">有</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
          <h5 style={{ marginTop: 0, marginBottom: "12px" }}>オプション作業</h5>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {["ユニック", "ドア・窓・手すり外し", "カウンター越え", "高所作業", "特殊作業", "リサイクル有"].map((work) => (
              <label key={work} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={(workCheck.optionWorks || []).includes(work)}
                  onChange={() => handleOptionWorkToggle(work)}
                />
                {work}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "16px" }}>
          <label style={labelStyle}>変更内容/備考</label>
          <textarea
            value={workCheck.remarks || ""}
            onChange={(e) => handleFieldChange("remarks", e.target.value)}
            style={{ ...inputStyle, minHeight: "80px", fontFamily: "inherit" }}
          />
        </div>
      </section>

      {/* 5-5 日時・署名 */}
      <section style={{ marginBottom: "24px" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>5-5 日時・署名</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>
              設置日 <span style={{ color: "red" }}>※</span>
            </label>
            <input type="date" value={workCheck.installDate || ""} onChange={(e) => handleFieldChange("installDate", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>設置時間</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "end" }}>
              <div>
                <label style={{ ...labelStyle, fontSize: "11px" }}>開始</label>
                <input type="time" value={workCheck.installTimeStart || ""} onChange={(e) => handleFieldChange("installTimeStart", e.target.value)} style={inputStyle} />
              </div>
              <span>～</span>
              <div>
                <label style={{ ...labelStyle, fontSize: "11px" }}>終了</label>
                <input type="time" value={workCheck.installTimeEnd || ""} onChange={(e) => handleFieldChange("installTimeEnd", e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>協力会社</label>
            <input type="text" value={workCheck.partnerCompany || ""} onChange={(e) => handleFieldChange("partnerCompany", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              お客様名 <span style={{ color: "red" }}>※</span>
            </label>
            <input type="text" value={workCheck.customerName || ""} onChange={(e) => handleFieldChange("customerName", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <h4 style={{ marginTop: "20px", marginBottom: "12px" }}>お客様署名</h4>
        <div style={{ border: "1px solid #ddd", borderRadius: "4px", marginBottom: "12px", backgroundColor: "#fafafa" }}>
          <SignatureCanvas
            ref={sigCanvasRef}
            canvasProps={{
              width: 500,
              height: 120,
              className: "sigCanvas",
              style: { border: "none", borderRadius: "0px", backgroundColor: "#fff", display: "block", width: "100%" }
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button onClick={clearSignature} style={{ padding: "8px 16px", backgroundColor: "#f5f5f5", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}>
            クリア
          </button>
          <button onClick={saveSignature} style={{ padding: "8px 16px", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            署名を保存
          </button>
        </div>

        {workCheck.signatureDataUrl && (
          <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <p style={{ fontSize: "12px", color: "#666", margin: "0 0 8px 0" }}>署名確認</p>
            <img src={workCheck.signatureDataUrl} alt="signature" style={{ maxWidth: "200px", border: "1px solid #ddd", borderRadius: "4px" }} />
          </div>
        )}
      </section>
    </div>
  );
}

function ReportTab({ caseData }: { caseData: ManagedCase }) {
  const [form, setForm] = useState<CompletionReportForm>(
    caseData.completionReportForm || {
      completionDate: caseData.workCheckFull?.installDate,
      issueDate: caseData.workCheckFull?.installDate,
      productRows: [],
      materialRows: [],
      extraRows: []
    }
  );

  const handleFieldChange = (field: keyof CompletionReportForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowChange = (section: "productRows" | "materialRows" | "extraRows", id: string, field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      [section]: prev[section].map((row) => (row.id === id ? { ...row, [field]: value, amount: field === "unitPrice" || field === "qty" ? (row.qty || 0) * (field === "unitPrice" ? value : row.unitPrice || 0) : row.amount } : row))
    }));
  };

  const addRow = (section: "productRows" | "materialRows" | "extraRows") => {
    const newRow: CompletionReportRow = { id: Date.now().toString(), content: "", qty: 1, unitPrice: 0, amount: 0 };
    setForm((prev) => ({ ...prev, [section]: [...prev[section], newRow] }));
  };

  const removeRow = (section: "productRows" | "materialRows" | "extraRows", id: string) => {
    setForm((prev) => ({ ...prev, [section]: prev[section].filter((row) => row.id !== id) }));
  };

  const calculateDistanceCharge = (): number => {
    const distance = form.roundTripDistance || 0;
    return Math.max(0, (distance - 40) * 80);
  };

  const getSubtotal = (rows: CompletionReportRow[]): number => rows.reduce((sum, row) => sum + (row.amount || 0), 0);

  const productSubtotal = getSubtotal(form.productRows);
  const materialSubtotal = getSubtotal(form.materialRows);
  const extraSubtotal = getSubtotal(form.extraRows);
  const distanceCharge = calculateDistanceCharge();
  const total = productSubtotal + materialSubtotal + extraSubtotal + (form.parkingFee || 0) + distanceCharge + (form.highwayCost || 0);

  const saveForm = () => {
    const managed = getManagedCases();
    const updated = managed.map((c) => (c.id === caseData.id ? { ...c, completionReportForm: form } : c));
    saveManagedCases(updated);
  };

  const inputStyle = { padding: "8px", border: "1px solid #ddd", borderRadius: "4px", width: "100%" };
  const labelStyle = { display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" };

  return (
    <div className={styles.tabContent}>
      <h3 style={{ marginBottom: "20px" }}>設置完了報告書</h3>

      {/* 7-1 ヘッダー */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>7-1 ヘッダー</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", fontSize: "13px" }}>
          <div>
            <label style={labelStyle}>依頼受付NO</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>{caseData.aizaInfo?.inquiryNo || "-"}</div>
          </div>
          <div>
            <label style={labelStyle}>協力会社名</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>株式会社アイザ</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>協力会社住所</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>東京都板橋区上板橋2-2-6</div>
          </div>
          <div>
            <label style={labelStyle}>TEL</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>03-5921-3005</div>
          </div>
          <div>
            <label style={labelStyle}>FAX</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>03-3937-0683</div>
          </div>
          <div>
            <label style={labelStyle}>発行部署名</label>
            <input type="text" value={form.issuerName || ""} onChange={(e) => handleFieldChange("issuerName", e.target.value)} placeholder="東京 株式会社アイザ + 名前" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>設置完了日</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>{form.completionDate || "-"}</div>
          </div>
          <div>
            <label style={labelStyle}>完了報告書発行日</label>
            <input type="date" value={form.issueDate || ""} onChange={(e) => handleFieldChange("issueDate", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>設置先お客様</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>{caseData.aizaInfo?.customerName || "-"}</div>
          </div>
          <div>
            <label style={labelStyle}>依頼元店名</label>
            <input type="text" value={form.stName || ""} onChange={(e) => handleFieldChange("stName", e.target.value)} placeholder="ハイアールジャパンセールス + ST" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>依頼元販社</label>
            <input type="text" value={form.salesCompany || ""} onChange={(e) => handleFieldChange("salesCompany", e.target.value)} style={inputStyle} />
          </div>
        </div>
      </section>

      {/* 7-2 設置商品 */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>7-2 設置商品</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>商品名・内容</th>
              <th style={{ padding: "8px", textAlign: "center", width: "80px" }}>品番</th>
              <th style={{ padding: "8px", textAlign: "center", width: "60px" }}>数量</th>
              <th style={{ padding: "8px", textAlign: "right", width: "80px" }}>単価</th>
              <th style={{ padding: "8px", textAlign: "right", width: "80px" }}>金額</th>
              <th style={{ padding: "8px", textAlign: "left", flex: 1 }}>備考</th>
              <th style={{ padding: "8px", textAlign: "center", width: "40px" }}>削除</th>
            </tr>
          </thead>
          <tbody>
            {form.productRows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>
                  <input type="text" value={row.content} onChange={(e) => handleRowChange("productRows", row.id, "content", e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "center" }}>{caseData.aizaInfo?.productCode || "-"}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <input type="number" value={row.qty} onChange={(e) => handleRowChange("productRows", row.id, "qty", Number(e.target.value))} style={{ ...inputStyle, width: "100%", textAlign: "center" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  <input type="number" value={row.unitPrice} onChange={(e) => handleRowChange("productRows", row.id, "unitPrice", Number(e.target.value))} style={{ ...inputStyle, textAlign: "right" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>¥{row.amount.toLocaleString("ja-JP")}</td>
                <td style={{ padding: "8px" }}>
                  <input type="text" value={row.note || ""} onChange={(e) => handleRowChange("productRows", row.id, "note", e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <button onClick={() => removeRow("productRows", row.id)} style={{ padding: "4px 8px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => addRow("productRows")} style={{ padding: "8px 16px", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
          + 行を追加
        </button>
        <div style={{ marginTop: "12px", textAlign: "right", fontWeight: "bold" }}>小計: ¥{productSubtotal.toLocaleString("ja-JP")}</div>
      </section>

      {/* 7-3 仕様部材 */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>7-3 仕様部材</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>明細</th>
              <th style={{ padding: "8px", textAlign: "center", width: "60px" }}>数量</th>
              <th style={{ padding: "8px", textAlign: "right", width: "80px" }}>単価</th>
              <th style={{ padding: "8px", textAlign: "right", width: "80px" }}>金額</th>
              <th style={{ padding: "8px", textAlign: "left", flex: 1 }}>備考</th>
              <th style={{ padding: "8px", textAlign: "center", width: "40px" }}>削除</th>
            </tr>
          </thead>
          <tbody>
            {form.materialRows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>
                  <input type="text" value={row.content} onChange={(e) => handleRowChange("materialRows", row.id, "content", e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <input type="number" value={row.qty} onChange={(e) => handleRowChange("materialRows", row.id, "qty", Number(e.target.value))} style={{ ...inputStyle, width: "100%", textAlign: "center" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  <input type="number" value={row.unitPrice} onChange={(e) => handleRowChange("materialRows", row.id, "unitPrice", Number(e.target.value))} style={{ ...inputStyle, textAlign: "right" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>¥{row.amount.toLocaleString("ja-JP")}</td>
                <td style={{ padding: "8px" }}>
                  <input type="text" value={row.note || ""} onChange={(e) => handleRowChange("materialRows", row.id, "note", e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <button onClick={() => removeRow("materialRows", row.id)} style={{ padding: "4px 8px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => addRow("materialRows")} style={{ padding: "8px 16px", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
          + 行を追加
        </button>
        <div style={{ marginTop: "12px", textAlign: "right", fontWeight: "bold" }}>小計: ¥{materialSubtotal.toLocaleString("ja-JP")}</div>
      </section>

      {/* 7-4 別途料金 */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>7-4 別途料金</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>作業内容</th>
              <th style={{ padding: "8px", textAlign: "center", width: "60px" }}>数量</th>
              <th style={{ padding: "8px", textAlign: "right", width: "80px" }}>単価</th>
              <th style={{ padding: "8px", textAlign: "right", width: "80px" }}>金額</th>
              <th style={{ padding: "8px", textAlign: "left", flex: 1 }}>備考</th>
              <th style={{ padding: "8px", textAlign: "center", width: "40px" }}>削除</th>
            </tr>
          </thead>
          <tbody>
            {form.extraRows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px" }}>
                  <select
                    value={row.content}
                    onChange={(e) => {
                      const selectedLabel = e.target.value;
                      const matchedPrice = PRICE_LIST.find((p) => getPriceLabel(p) === selectedLabel);
                      if (matchedPrice) {
                        handleRowChange("extraRows", row.id, "content", selectedLabel);
                        handleRowChange("extraRows", row.id, "unitPrice", matchedPrice.price);
                      } else if (selectedLabel === "custom") {
                        handleRowChange("extraRows", row.id, "content", "");
                        handleRowChange("extraRows", row.id, "unitPrice", 0);
                      } else {
                        handleRowChange("extraRows", row.id, "content", selectedLabel);
                      }
                    }}
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    <option value="">-- 選択 --</option>
                    {Object.entries(getGroupedPrices()).map(([category, items]) => (
                      <optgroup key={category} label={category}>
                        {items.map((item) => {
                          const label = getPriceLabel(item);
                          return (
                            <option key={label} value={label}>
                              {label} （¥{item.price.toLocaleString("ja-JP")}）
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                    <option value="custom">その他（手動入力）</option>
                  </select>
                </td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <input type="number" value={row.qty} onChange={(e) => handleRowChange("extraRows", row.id, "qty", Number(e.target.value))} style={{ ...inputStyle, width: "100%", textAlign: "center" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  <input type="number" value={row.unitPrice} onChange={(e) => handleRowChange("extraRows", row.id, "unitPrice", Number(e.target.value))} style={{ ...inputStyle, textAlign: "right" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>¥{row.amount.toLocaleString("ja-JP")}</td>
                <td style={{ padding: "8px" }}>
                  <input type="text" value={row.note || ""} onChange={(e) => handleRowChange("extraRows", row.id, "note", e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <button onClick={() => removeRow("extraRows", row.id)} style={{ padding: "4px 8px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "12px" }}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => addRow("extraRows")} style={{ padding: "8px 16px", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
          + 行を追加
        </button>
        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px" }}>
          <div>
            <label style={labelStyle}>駐車料金</label>
            <input type="number" value={form.parkingFee || 0} onChange={(e) => handleFieldChange("parkingFee", Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>高速代</label>
            <input type="number" value={form.highwayCost || 0} onChange={(e) => handleFieldChange("highwayCost", Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>往復距離（km）</label>
            <input type="number" value={form.roundTripDistance || 0} onChange={(e) => handleFieldChange("roundTripDistance", Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>距離加算</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>¥{distanceCharge.toLocaleString("ja-JP")}</div>
          </div>
        </div>
        <div style={{ marginTop: "12px", textAlign: "right", fontWeight: "bold" }}>別途料金小計: ¥{(extraSubtotal + (form.parkingFee || 0) + distanceCharge + (form.highwayCost || 0)).toLocaleString("ja-JP")}</div>
      </section>

      {/* 7-5 合計・追記 */}
      <section style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>7-5 合計・追記</h4>
        <div style={{ marginBottom: "16px", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>合計金額</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#d32f2f" }}>¥{total.toLocaleString("ja-JP")}</p>
        </div>
        <div>
          <label style={labelStyle}>直収内容</label>
          <textarea value={form.directCollectionNote || ""} onChange={(e) => handleFieldChange("directCollectionNote", e.target.value)} style={{ ...inputStyle, minHeight: "60px", fontFamily: "inherit" }} />
        </div>
      </section>

      {/* 7-6 ご連絡事項 */}
      <section style={{ marginBottom: "24px" }}>
        <h4 style={{ marginTop: 0, marginBottom: "16px" }}>7-6 ご連絡事項</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>機器製造番号</label>
            <div style={{ padding: "8px", backgroundColor: "#f5f5f5", borderRadius: "4px", fontSize: "13px" }}>{caseData.workCheckFull?.serialNo || "-"}</div>
          </div>
          <div>
            <label style={labelStyle}>保証書</label>
            <select value={form.warranty || ""} onChange={(e) => handleFieldChange("warranty", e.target.value)} style={inputStyle}>
              <option value="">-- 選択 --</option>
              <option value="あり">あり</option>
              <option value="なし">なし</option>
            </select>
          </div>
        </div>
      </section>

      {/* 保存ボタン */}
      <div style={{ marginTop: "20px", display: "flex", gap: "8px" }}>
        <button onClick={saveForm} style={{ padding: "10px 20px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
          フォームを保存
        </button>
      </div>
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
              {activeTab === "workcheck" && <WorkCheckTab caseData={selectedCase} />}
              {activeTab === "report" && <ReportTab caseData={selectedCase} />}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
