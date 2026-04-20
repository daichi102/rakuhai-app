// 仕様書（設置業務仕様書_20260327.doc）に基づいたチェック表スキーマ

export type WorkCheckSection = "basic" | "arrival" | "completion" | "options" | "signature";

export interface BasicInfo {
  inquiryNo: string; // 問い合わせ番号（自動反映、編集不可）
  workAssignee: string; // 作業担当者（必須、プルダウン）
  store?: string; // 販売店（任意）
  productModel: string; // 設置商品品番（必須、自動反映）
  serialNumber?: string; // 製造番号（任意）
}

export interface ArrivalCheck {
  openingWithCustomer: boolean; // お客様立会いで開梱
  openingDamageCheck: boolean; // 開梱時キズ確認
  preDeliveryRoute: string; // 搬入前ルート確認（床/壁/その他）
  surroundingDamageCheck: boolean; // 設置場所周囲キズ確認
}

export interface CompletionCheck {
  customerStatusConfirm: boolean; // お客様による設置状況確認
  operationConfirm: boolean; // 動作確認（立会い）
  postInstallDamageCheck: boolean; // 設置後キズ確認
  postDeliveryRoute: string; // 搬入後ルート確認（床/壁/その他）
  cleaningDone: boolean; // 清掃実施
  instructionProvided: boolean; // 取扱説明
}

export interface OptionsInfo {
  elevator: "無" | "有"; // エレベーター
  floorNumber?: number; // 設置階数
  stairs?: "屋内" | "屋外"; // 階段
  warranty?: "有" | "無"; // 保証書
  carryback: "持ち帰り" | "持ち帰らない"; // 持ち帰り
  removeExisting: "無" | "有"; // 搬出品
  refrigeratorType?: string; // 冷蔵庫区分
  washingMachineType?: string; // 洗濯機区分
  optionalWork: {
    unitruck: boolean; // ユニック
    doorWindowHandrail: boolean; // ドア・窓・手すり外し
    counterOver: boolean; // カウンター越え
    highWork: boolean; // 高所作業
    specialWork: boolean; // 特殊作業
    recycle: boolean; // リサイクル有
  };
  notes?: string; // 変更内容/備考
}

export interface SignatureInfo {
  installDate: string; // 設置日（必須）
  startTime: string; // 開始時刻（必須）
  endTime: string; // 終了時刻（必須）
  cooperationCompany?: string; // 協力会社（任意）
  customerName: string; // お客様名（必須）
  customerSignature: string; // お客様電子署名（必須、base64）
  assigneeSignature: string; // 担当者電子署名（必須、base64）
}

export interface PhotoData {
  id: string;
  damageType: string; // 傷の場所・種類
  imageUrl: string; // Firebase Storage URL
  uploadedAt: string;
}

export interface WorkCheckFull {
  caseId: string;
  basic: BasicInfo;
  arrival: ArrivalCheck;
  completion: CompletionCheck;
  options: OptionsInfo;
  signature: SignatureInfo;
  photos: PhotoData[]; // 傷ありチェック時の写真
  confirmedAt?: string; // 確定日時
  status: "draft" | "confirmed"; // 下書き / 確定
}

// 必須項目チェック
export const validateWorkCheck = (workCheck: WorkCheckFull): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!workCheck.basic.inquiryNo) errors.push("問い合わせ番号は必須です");
  if (!workCheck.basic.workAssignee) errors.push("作業担当者は必須です");
  if (!workCheck.basic.productModel) errors.push("設置商品品番は必須です");
  if (!workCheck.signature.installDate) errors.push("設置日は必須です");
  if (!workCheck.signature.startTime) errors.push("開始時刻は必須です");
  if (!workCheck.signature.endTime) errors.push("終了時刻は必須です");
  if (!workCheck.signature.customerName) errors.push("お客様名は必須です");
  if (!workCheck.signature.customerSignature) errors.push("お客様電子署名は必須です");
  if (!workCheck.signature.assigneeSignature) errors.push("担当者電子署名は必須です");

  // 傷チェック時は写真が必須
  const hasDamage =
    workCheck.arrival.openingDamageCheck ||
    workCheck.arrival.surroundingDamageCheck ||
    workCheck.completion.postInstallDamageCheck;
  if (hasDamage && workCheck.photos.length === 0) {
    errors.push("傷ありチェックの場合、写真の保存が必須です");
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
