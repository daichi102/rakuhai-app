export type AizaInfo = {
  orderName?: string;
  orderPhone?: string;
  orderAddress?: string;
  customerKana?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  productName?: string;
  productCode?: string;
  productColor?: string;
  productQty?: number;
  inquiryNo?: string;
  visitDate?: string;
  hasAttendant?: string;
  existingRemoval?: string;
  warranty?: string;
  notes?: string;
  staff?: string;
  caution?: string;
};

export type PendingCase = {
  id: string;
  subject: string;
  sender: string;
  senderName?: string;
  senderAddress?: string;
  receivedAt: string;
  preview: string;
  body?: string;
  priority?: "urgent" | "normal" | "low";
  attachments?: {
    filename: string;
    size: number;
    contentType: string;
    isExcel: boolean;
    contentBase64?: string;
  }[];
  aizaInfo?: AizaInfo;
  importedAt: string;
};

export type WorkCheckItem = {
  id: string;
  label: string;
  checked: boolean;
  qty?: number;
  unitPrice?: number;
};

export type WorkCheck = {
  items: WorkCheckItem[];
  subtotalInstall: number;
  subtotalParts: number;
  subtotalExtra: number;
  total: number;
  signatureDataUrl?: string;
  signedAt?: string;
  completedAt?: string;
};

export type WorkCheckFull = {
  inquiryNo?: string;
  worker?: string;
  store?: string;
  productCode?: string;
  serialNo?: string;

  unboxWithCustomer?: boolean;
  checkScratchOnUnbox?: boolean;
  checkRouteBeforeCarryIn?: string;
  checkScratchAroundInstall?: boolean;

  customerConfirm?: boolean;
  operationCheck?: boolean;
  checkScratchAfterInstall?: boolean;
  checkRouteAfterCarryIn?: string;
  cleaning?: boolean;
  explanation?: boolean;

  elevator?: "無" | "有";
  floorNo?: string;
  stairs?: "屋内" | "屋外" | "なし";
  warranty?: boolean;
  takeBack?: boolean;
  carryOut?: "無" | "有";
  productCategory?: string;
  optionWorks?: string[];
  remarks?: string;

  installDate?: string;
  installTimeStart?: string;
  installTimeEnd?: string;
  partnerCompany?: string;
  customerName?: string;
  signatureDataUrl?: string;
  signedAt?: string;
};

export type CompletionReportRow = {
  id: string;
  content: string;
  qty: number;
  unitPrice: number;
  amount: number;
  note?: string;
};

export type CompletionReportForm = {
  issuerName?: string;
  completionDate?: string;
  issueDate?: string;
  stName?: string;
  salesCompany?: string;

  productRows: CompletionReportRow[];
  materialRows: CompletionReportRow[];

  extraRows: CompletionReportRow[];
  parkingFee?: number;
  roundTripDistance?: number;
  distanceCharge?: number;
  highwayCost?: number;

  directCollectionNote?: string;

  warranty?: "あり" | "なし";
};

export type CompletionReport = {
  pdfStoragePath: string;
  qrCodeUrl: string;
  generatedAt: string;
};

export type ManagedCase = PendingCase & {
  transferredAt: string;
  status?: "pending" | "confirmed";
  workCheck?: WorkCheck;
  workCheckFull?: WorkCheckFull;
  completionReportForm?: CompletionReportForm;
  completionReport?: CompletionReport;
};

export type CaseStatus = "pending" | "managed" | "completed";

export type Case = {
  id: string;
  status: CaseStatus;
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt: string;
  preview: string;
  body?: string;
  aizaInfo?: AizaInfo;
  attachments?: {
    filename: string;
    size: number;
    contentType: string;
    isExcel: boolean;
  }[];
  importedAt: string;
  transferredAt?: string;
  workCheck?: WorkCheck;
  completionReport?: CompletionReport;
};

const PENDING_CASES_KEY = "rakuhai_pending_cases";
const MANAGED_CASES_KEY = "rakuhai_managed_cases";

const parseStorage = <T>(key: string): T[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = <T>(key: string, value: T[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getPendingCases = () => parseStorage<PendingCase>(PENDING_CASES_KEY);

export const savePendingCases = (items: PendingCase[]) => {
  writeStorage(PENDING_CASES_KEY, items);
};

export const getManagedCases = () => parseStorage<ManagedCase>(MANAGED_CASES_KEY);

export const saveManagedCases = (items: ManagedCase[]) => {
  writeStorage(MANAGED_CASES_KEY, items);
};

// Firestore操作関数（クライアント側で使用）

let dbInstance: any = null;
let authInstance: any = null;

const getDb = async () => {
  if (!dbInstance) {
    const { db } = await import("@/lib/firebase");
    dbInstance = db;
  }
  return dbInstance;
};

const getAuth = async () => {
  if (!authInstance) {
    const { auth } = await import("@/lib/firebase");
    authInstance = auth;
  }
  return authInstance;
};

export const saveCaseToFirestore = async (caseData: Omit<Case, "id">) => {
  try {
    const { collection, addDoc } = await import("firebase/firestore");
    const db = await getDb();
    const auth = await getAuth();

    if (!auth.currentUser) {
      throw new Error("ユーザーがログインしていません");
    }

    const docRef = await addDoc(collection(db, "cases"), {
      ...caseData,
      userId: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return docRef.id;
  } catch (error) {
    console.error("[Firestore] Failed to save case:", error);
    throw error;
  }
};

export const updateWorkCheck = async (caseId: string, workCheck: WorkCheck) => {
  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    const db = await getDb();

    await updateDoc(doc(db, "cases", caseId), {
      workCheck,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Firestore] Failed to update workCheck:", error);
    throw error;
  }
};

export const updateCompletionReport = async (caseId: string, completionReport: CompletionReport) => {
  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    const db = await getDb();

    await updateDoc(doc(db, "cases", caseId), {
      completionReport,
      status: "completed",
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Firestore] Failed to update completionReport:", error);
    throw error;
  }
};
