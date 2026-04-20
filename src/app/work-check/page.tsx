"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { getManagedCases, type ManagedCase } from "@/lib/caseStore";
import { validateWorkCheck, type WorkCheckFull } from "@/lib/workCheckSchema";
import styles from "../dashboard/dashboard.module.css";

type TabType = "basic" | "arrival" | "completion" | "options" | "signature";

function WorkCheckPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [caseData, setCaseData] = useState<ManagedCase | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const customerSigRef = useRef<any>(null);
  const assigneeSigRef = useRef<any>(null);

  const [workCheck, setWorkCheck] = useState<WorkCheckFull>({
    caseId: caseId || "",
    basic: {
      inquiryNo: "",
      workAssignee: "",
      store: "",
      productModel: "",
      serialNumber: ""
    },
    arrival: {
      openingWithCustomer: false,
      openingDamageCheck: false,
      preDeliveryRoute: "床",
      surroundingDamageCheck: false
    },
    completion: {
      customerStatusConfirm: false,
      operationConfirm: false,
      postInstallDamageCheck: false,
      postDeliveryRoute: "床",
      cleaningDone: false,
      instructionProvided: false
    },
    options: {
      elevator: "無",
      floorNumber: 1,
      stairs: "屋内",
      warranty: "有",
      carryback: "持ち帰り",
      removeExisting: "無",
      optionalWork: {
        unitruck: false,
        doorWindowHandrail: false,
        counterOver: false,
        highWork: false,
        specialWork: false,
        recycle: false
      },
      notes: ""
    },
    signature: {
      installDate: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      cooperationCompany: "",
      customerName: "",
      customerSignature: "",
      assigneeSignature: ""
    },
    photos: [],
    status: "draft"
  });

  // ケースデータ取得
  useEffect(() => {
    if (!caseId) {
      router.push("/case-management");
      return;
    }

    const cases = getManagedCases();
    const found = cases.find((c) => c.id === caseId);
    if (found) {
      setCaseData(found);
      // アイザシート情報を自動反映
      if (found.aizaInfo) {
        setWorkCheck((prev) => ({
          ...prev,
          basic: {
            ...prev.basic,
            inquiryNo: found.aizaInfo?.inquiryNo || "",
            productModel: `${found.aizaInfo?.productCode || ""} ${found.aizaInfo?.productName || ""}`,
            serialNumber: found.aizaInfo?.productCode
          },
          signature: {
            ...prev.signature,
            customerName: found.aizaInfo?.customerName || ""
          }
        }));
      }
    }
    setIsLoading(false);
  }, [caseId, router]);

  const handleConfirm = async () => {
    const { valid, errors } = validateWorkCheck(workCheck);
    if (!valid) {
      setValidationErrors(errors);
      return;
    }

    try {
      // localStorage に保存
      const cases = getManagedCases();
      const updatedCases = cases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              workCheckFull: workCheck,
              status: "confirmed" as const
            }
          : c
      );
      localStorage.setItem("managedCases", JSON.stringify(updatedCases));

      // 成功メッセージ表示
      alert("作業チェック表を確定しました");

      // 案件管理画面に戻る
      router.push("/case-management");
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました");
    }
  };

  const clearErrors = () => setValidationErrors([]);

  if (isLoading) return <div style={{ padding: "20px" }}>読み込み中...</div>;
  if (!caseData) return <div style={{ padding: "20px" }}>案件が見つかりません</div>;

  return (
    <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "24px", borderBottom: "2px solid #2196f3", paddingBottom: "12px" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", color: "#333" }}>作業チェック表</h1>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>{caseData.subject}</p>
      </header>

      {validationErrors.length > 0 && (
        <div style={{ padding: "16px", backgroundColor: "#ffebee", borderRadius: "8px", marginBottom: "16px" }}>
          <div style={{ color: "#c62828", marginBottom: "8px", fontWeight: "bold" }}>⚠️ エラーがあります</div>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#c62828" }}>
            {validationErrors.map((err, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                {err}
              </li>
            ))}
          </ul>
          <button
            onClick={clearErrors}
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            閉じる
          </button>
        </div>
      )}

      {/* タブ */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid #ddd" }}>
        {(["basic", "arrival", "completion", "options", "signature"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 20px",
              backgroundColor: activeTab === tab ? "#2196f3" : "#f5f5f5",
              color: activeTab === tab ? "white" : "#333",
              border: "none",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
              fontWeight: activeTab === tab ? "bold" : "normal"
            }}
          >
            {tab === "basic" && "基本情報"}
            {tab === "arrival" && "搬入時チェック"}
            {tab === "completion" && "完了後チェック"}
            {tab === "options" && "オプション"}
            {tab === "signature" && "日時・署名"}
          </button>
        ))}
      </div>

      {/* 基本情報タブ */}
      {activeTab === "basic" && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", borderBottom: "2px solid #2196f3", paddingBottom: "8px" }}>
            基本情報
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px" }}>
                問い合わせ番号 *
              </label>
              <input
                type="text"
                value={workCheck.basic.inquiryNo}
                disabled
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f5f5f5",
                  fontSize: "14px",
                  cursor: "not-allowed"
                }}
              />
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#999" }}>自動反映（編集不可）</p>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px" }}>
                作業担当者 *
              </label>
              <select
                value={workCheck.basic.workAssignee}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    basic: { ...workCheck.basic, workAssignee: e.target.value }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              >
                <option value="">-- 選択してください --</option>
                <option value="田中太郎">田中太郎</option>
                <option value="鈴木次郎">鈴木次郎</option>
                <option value="山田三郎">山田三郎</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px" }}>
                販売店
              </label>
              <input
                type="text"
                value={workCheck.basic.store || ""}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    basic: { ...workCheck.basic, store: e.target.value }
                  })
                }
                placeholder="任意"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px" }}>
                設置商品品番 *
              </label>
              <input
                type="text"
                value={workCheck.basic.productModel}
                disabled
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f5f5f5",
                  fontSize: "14px",
                  cursor: "not-allowed"
                }}
              />
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#999" }}>自動反映</p>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px" }}>
                製造番号
              </label>
              <input
                type="text"
                value={workCheck.basic.serialNumber || ""}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    basic: { ...workCheck.basic, serialNumber: e.target.value }
                  })
                }
                placeholder="任意"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 搬入時チェックタブ */}
      {activeTab === "arrival" && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", borderBottom: "2px solid #2196f3", paddingBottom: "8px" }}>
            商品搬入時チェック（必須）
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { key: "openingWithCustomer", label: "お客様立会いで開梱" },
              { key: "openingDamageCheck", label: "開梱時キズ確認" },
              { key: "surroundingDamageCheck", label: "設置場所周囲キズ確認" }
            ].map((item) => (
              <label
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px",
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={workCheck.arrival[item.key as keyof typeof workCheck.arrival] as boolean}
                  onChange={(e) =>
                    setWorkCheck({
                      ...workCheck,
                      arrival: {
                        ...workCheck.arrival,
                        [item.key]: e.target.checked
                      }
                    })
                  }
                  style={{ marginRight: "12px", width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: "500" }}>{item.label}</span>
              </label>
            ))}

            <div style={{ marginTop: "12px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                搬入前ルート確認
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                {["床", "壁", "その他"].map((route) => (
                  <label key={route} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="preDeliveryRoute"
                      value={route}
                      checked={workCheck.arrival.preDeliveryRoute === route}
                      onChange={(e) =>
                        setWorkCheck({
                          ...workCheck,
                          arrival: { ...workCheck.arrival, preDeliveryRoute: e.target.value }
                        })
                      }
                      style={{ marginRight: "6px", cursor: "pointer" }}
                    />
                    {route}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 作業終了後チェックタブ */}
      {activeTab === "completion" && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", borderBottom: "2px solid #2196f3", paddingBottom: "8px" }}>
            作業終了後チェック（必須）
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { key: "customerStatusConfirm", label: "お客様による設置状況確認" },
              { key: "operationConfirm", label: "動作確認（立会い）" },
              { key: "postInstallDamageCheck", label: "設置後キズ確認" },
              { key: "cleaningDone", label: "清掃実施" },
              { key: "instructionProvided", label: "取扱説明" }
            ].map((item) => (
              <label
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px",
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={workCheck.completion[item.key as keyof typeof workCheck.completion] as boolean}
                  onChange={(e) =>
                    setWorkCheck({
                      ...workCheck,
                      completion: {
                        ...workCheck.completion,
                        [item.key]: e.target.checked
                      }
                    })
                  }
                  style={{ marginRight: "12px", width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: "500" }}>{item.label}</span>
              </label>
            ))}

            <div style={{ marginTop: "12px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                搬入後ルート確認
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                {["床", "壁", "その他"].map((route) => (
                  <label key={route} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="postDeliveryRoute"
                      value={route}
                      checked={workCheck.completion.postDeliveryRoute === route}
                      onChange={(e) =>
                        setWorkCheck({
                          ...workCheck,
                          completion: { ...workCheck.completion, postDeliveryRoute: e.target.value }
                        })
                      }
                      style={{ marginRight: "6px", cursor: "pointer" }}
                    />
                    {route}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* オプションタブ */}
      {activeTab === "options" && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", borderBottom: "2px solid #2196f3", paddingBottom: "8px" }}>
            搬入/搬出・オプション
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>エレベーター</label>
              <select
                value={workCheck.options.elevator}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    options: { ...workCheck.options, elevator: e.target.value as "無" | "有" }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
              >
                <option value="無">無</option>
                <option value="有">有</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>設置階数</label>
              <input
                type="number"
                value={workCheck.options.floorNumber || 1}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    options: { ...workCheck.options, floorNumber: Math.max(1, Number(e.target.value)) }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>階段</label>
              <select
                value={workCheck.options.stairs || "屋内"}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    options: { ...workCheck.options, stairs: e.target.value as "屋内" | "屋外" }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
              >
                <option value="屋内">屋内</option>
                <option value="屋外">屋外</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>保証書</label>
              <select
                value={workCheck.options.warranty || "有"}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    options: { ...workCheck.options, warranty: e.target.value as "有" | "無" }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
              >
                <option value="有">有</option>
                <option value="無">無</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>オプション作業</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { key: "unitruck", label: "ユニック" },
                  { key: "doorWindowHandrail", label: "ドア・窓・手すり外し" },
                  { key: "counterOver", label: "カウンター越え" },
                  { key: "highWork", label: "高所作業" },
                  { key: "specialWork", label: "特殊作業" },
                  { key: "recycle", label: "リサイクル有" }
                ].map((item) => (
                  <label key={item.key} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={workCheck.options.optionalWork[item.key as keyof typeof workCheck.options.optionalWork]}
                      onChange={(e) =>
                        setWorkCheck({
                          ...workCheck,
                          options: {
                            ...workCheck.options,
                            optionalWork: {
                              ...workCheck.options.optionalWork,
                              [item.key]: e.target.checked
                            }
                          }
                        })
                      }
                      style={{ marginRight: "8px", cursor: "pointer" }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>変更内容/備考</label>
              <textarea
                value={workCheck.options.notes || ""}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    options: { ...workCheck.options, notes: e.target.value }
                  })
                }
                placeholder="任意"
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontFamily: "inherit"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 日時・署名タブ */}
      {activeTab === "signature" && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", borderBottom: "2px solid #2196f3", paddingBottom: "8px" }}>
            日時・署名
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>設置日 *</label>
              <input
                type="date"
                value={workCheck.signature.installDate}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    signature: { ...workCheck.signature, installDate: e.target.value }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div></div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>開始時刻 *</label>
              <input
                type="time"
                value={workCheck.signature.startTime}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    signature: { ...workCheck.signature, startTime: e.target.value }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>終了時刻 *</label>
              <input
                type="time"
                value={workCheck.signature.endTime}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    signature: { ...workCheck.signature, endTime: e.target.value }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>協力会社</label>
              <input
                type="text"
                value={workCheck.signature.cooperationCompany || ""}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    signature: { ...workCheck.signature, cooperationCompany: e.target.value }
                  })
                }
                placeholder="任意"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>お客様名 *</label>
              <input
                type="text"
                value={workCheck.signature.customerName}
                onChange={(e) =>
                  setWorkCheck({
                    ...workCheck,
                    signature: { ...workCheck.signature, customerName: e.target.value }
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          {/* お客様署名 */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold" }}>お客様電子署名 *</h3>
            <div
              style={{
                border: "2px solid #2196f3",
                borderRadius: "8px",
                backgroundColor: "white",
                marginBottom: "12px"
              }}
            >
              <SignatureCanvas
                ref={customerSigRef}
                canvasProps={{
                  width: 500,
                  height: 120,
                  style: { borderRadius: "6px", display: "block", width: "100%" }
                }}
              />
            </div>
            <button
              onClick={() => customerSigRef.current?.clear()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "8px"
              }}
            >
              クリア
            </button>
            <button
              onClick={() => {
                const sig = customerSigRef.current?.toDataURL("image/png");
                if (sig) {
                  setWorkCheck({
                    ...workCheck,
                    signature: { ...workCheck.signature, customerSignature: sig }
                  });
                }
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              保存
            </button>
          </div>

          {/* 担当者署名 */}
          <div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold" }}>担当者電子署名 *</h3>
            <div
              style={{
                border: "2px solid #2196f3",
                borderRadius: "8px",
                backgroundColor: "white",
                marginBottom: "12px"
              }}
            >
              <SignatureCanvas
                ref={assigneeSigRef}
                canvasProps={{
                  width: 500,
                  height: 120,
                  style: { borderRadius: "6px", display: "block", width: "100%" }
                }}
              />
            </div>
            <button
              onClick={() => assigneeSigRef.current?.clear()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "8px"
              }}
            >
              クリア
            </button>
            <button
              onClick={() => {
                const sig = assigneeSigRef.current?.toDataURL("image/png");
                if (sig) {
                  setWorkCheck({
                    ...workCheck,
                    signature: { ...workCheck.signature, assigneeSignature: sig }
                  });
                }
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* 確定ボタン */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: "12px 24px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          キャンセル
        </button>
        <button
          onClick={handleConfirm}
          style={{
            padding: "12px 24px",
            backgroundColor: "#d32f2f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold"
          }}
        >
          作業チェック表を確定する
        </button>
      </div>
    </main>
  );
}

export default function WorkCheckPage() {
  return (
    <Suspense fallback={<div style={{ padding: "20px" }}>読み込み中...</div>}>
      <WorkCheckPageContent />
    </Suspense>
  );
}
