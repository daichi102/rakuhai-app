import { WorkCheckItem, WorkCheckFull, AizaInfo } from "@/lib/caseStore";

export const defaultWorkCheckItems: WorkCheckItem[] = [
  // 設置商品
  { id: "product", label: "商品設置", checked: false, qty: 1, unitPrice: 0 },

  // 直収内容別途料金
  { id: "washing-machine-removal", label: "洗濯機（ドラム式75kg以上）搬出", checked: false, qty: 1, unitPrice: 5000 },
  { id: "delivery-fee", label: "搬出品配送費（入替）", checked: false, qty: 1, unitPrice: 1500 },
  { id: "slider-up", label: "スライダー 階段揚げ", checked: false, qty: 1, unitPrice: 4000 },
  { id: "high-work-down", label: "高所作業車 階段下ろし", checked: false, qty: 1, unitPrice: 2000 },
  { id: "door-other", label: "その他 ドア/窓取付取外②", checked: false, qty: 1, unitPrice: 3000 },
  { id: "counter-exceed", label: "カウンター越え", checked: false },
  { id: "care-work", label: "養生作業", checked: false },

  // エアコン
  { id: "gas-recovery", label: "ガス回収", checked: false },
  { id: "hidden-piping", label: "隠ぺい配管", checked: false },

  // 別途追記事項
  { id: "high-speed-toll", label: "高速料金", checked: false, qty: 0, unitPrice: 0 },
  { id: "parking-fee", label: "駐車料金", checked: false, qty: 0, unitPrice: 0 },
  { id: "distance-charge", label: "距離加算（片道km）", checked: false, qty: 0, unitPrice: 0 }
];

export const calculateWorkCheckTotal = (items: WorkCheckItem[]): { subtotalInstall: number; subtotalParts: number; subtotalExtra: number; total: number } => {
  let subtotalInstall = 0; // 商品設置
  let subtotalParts = 0; // 部材・料金
  let subtotalExtra = 0; // 別途料金

  for (const item of items) {
    if (!item.checked || !item.unitPrice) continue;
    const amount = (item.qty || 0) * item.unitPrice;

    if (item.id === "product") {
      subtotalInstall += amount;
    } else if (item.id.startsWith("distance")) {
      // 距離加算は別途
      subtotalExtra += amount;
    } else if (!item.id.includes("high-speed") && !item.id.includes("parking") && !item.id.includes("gas") && !item.id.includes("hidden")) {
      subtotalParts += amount;
    } else {
      subtotalExtra += amount;
    }
  }

  return {
    subtotalInstall,
    subtotalParts,
    subtotalExtra,
    total: subtotalInstall + subtotalParts + subtotalExtra
  };
};

export const defaultWorkCheckFull = (aizaInfo?: AizaInfo): WorkCheckFull => ({
  inquiryNo: aizaInfo?.inquiryNo,
  productCode: aizaInfo?.productCode,
  customerName: aizaInfo?.customerName,
  optionWorks: []
});
