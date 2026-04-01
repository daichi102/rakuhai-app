import styles from "./dashboard.module.css";

type CaseStatusSummary = {
  label: string;
  count: number;
  tone?: "normal" | "alert";
};

type TodayCase = {
  inquiryNo: string;
  customerName: string;
  area: string;
  status: string;
  scheduledAt: string;
  assignee: string;
  priority: "高" | "中" | "低";
};

type ActionItem = {
  inquiryNo: string;
  customerName: string;
  reason: string;
  status: string;
  due: string;
  assignee: string;
  priority: "高" | "中" | "低";
};

const statusSummaries: CaseStatusSummary[] = [
  { label: "未処理（メールのみ）", count: 12 },
  { label: "案件化済", count: 8 },
  { label: "日程調整中", count: 6 },
  { label: "配車確定", count: 5 },
  { label: "作業中", count: 4 },
  { label: "完了（チェック表確定）", count: 10 },
  { label: "報告書作成済", count: 7 },
  { label: "要確認", count: 3, tone: "alert" },
  { label: "取込エラー", count: 2, tone: "alert" }
];

const todayCases: TodayCase[] = [
  {
    inquiryNo: "01137162",
    customerName: "カワムラ ナチヨ",
    area: "和光市",
    status: "日程調整中",
    scheduledAt: "本日 10:00",
    assignee: "佐藤",
    priority: "高"
  },
  {
    inquiryNo: "01137177",
    customerName: "山田 太郎",
    area: "新宿区",
    status: "配車確定",
    scheduledAt: "本日 13:30",
    assignee: "田中",
    priority: "中"
  },
  {
    inquiryNo: "01137183",
    customerName: "鈴木 花子",
    area: "板橋区",
    status: "作業中",
    scheduledAt: "本日 15:00",
    assignee: "高橋",
    priority: "中"
  }
];

const actionItems: ActionItem[] = [
  {
    inquiryNo: "01137162",
    customerName: "カワムラ ナチヨ",
    reason: "希望日が明日だが日程未確定",
    status: "日程調整中",
    due: "本日中",
    assignee: "佐藤",
    priority: "高"
  },
  {
    inquiryNo: "01137155",
    customerName: "株式会社サンプル",
    reason: "Excel抽出項目と本文が不一致",
    status: "要確認",
    due: "本日中",
    assignee: "田中",
    priority: "高"
  },
  {
    inquiryNo: "01137140",
    customerName: "井上 一郎",
    reason: "完了済みだが報告書未作成",
    status: "完了（チェック表確定）",
    due: "明日",
    assignee: "高橋",
    priority: "中"
  }
];

const priorityClass = (priority: "高" | "中" | "低") => {
  if (priority === "高") return styles.priorityHigh;
  if (priority === "中") return styles.priorityMid;
  return styles.priorityLow;
};

export default function DashboardPage() {
  return (
    <main className={`${styles.page} container`}>
      <header className={styles.header}>
        <h1 className={styles.title}>業務ダッシュボード</h1>
        <p className={styles.subtitle}>今日の状況を一目で確認し、優先対応を判断する画面</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>今日の案件</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>案件番号</th>
                <th>顧客名</th>
                <th>エリア</th>
                <th>ステータス</th>
                <th>予定</th>
                <th>担当</th>
                <th>優先度</th>
              </tr>
            </thead>
            <tbody>
              {todayCases.map((item) => (
                <tr key={item.inquiryNo}>
                  <td>{item.inquiryNo}</td>
                  <td>{item.customerName}</td>
                  <td>{item.area}</td>
                  <td>{item.status}</td>
                  <td>{item.scheduledAt}</td>
                  <td>{item.assignee}</td>
                  <td>
                    <span className={`${styles.priority} ${priorityClass(item.priority)}`}>{item.priority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ステータス別件数</h2>
        <div className={styles.cards}>
          {statusSummaries.map((summary) => (
            <article
              className={`${styles.card} ${summary.tone === "alert" ? styles.cardAlert : ""}`}
              key={summary.label}
            >
              <p className={styles.cardLabel}>{summary.label}</p>
              <p className={styles.cardCount}>{summary.count}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>要対応リスト</h2>
        <ul className={styles.actionList}>
          {actionItems.map((item) => (
            <li className={styles.actionItem} key={item.inquiryNo}>
              <div className={styles.actionTop}>
                <p className={styles.actionTitle}>
                  {item.inquiryNo} / {item.customerName}
                </p>
                <span className={`${styles.priority} ${priorityClass(item.priority)}`}>{item.priority}</span>
              </div>
              <p className={styles.actionReason}>{item.reason}</p>
              <p className={styles.actionMeta}>
                ステータス: {item.status} / 期限: {item.due} / 担当: {item.assignee}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
