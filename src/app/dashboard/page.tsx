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

type ScheduleItem = {
  time: string;
  title: string;
  owner: string;
};

const stats: StatCard[] = [
  { label: "本日の案件数", value: "0", tone: "blue" },
  { label: "対応完了", value: "0", tone: "green" },
  { label: "要対応", value: "0", tone: "orange" },
  { label: "遅延リスク", value: "0", tone: "violet" }
];

const tasks: TaskCard[] = [];

const schedules: ScheduleItem[] = [];

const menuItems = ["ダッシュボード", "案件管理", "スケジュール", "顧客管理", "マスタ設定"];

export default function DashboardPage() {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>R</div>
          <div>
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
              {item}
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
            </div>
          </section>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>本日の予定</h2>
              <span>{schedules.length}件</span>
            </div>

            <div className={styles.scheduleList}>
              {schedules.map((item) => (
                <article key={`${item.time}-${item.title}`} className={styles.scheduleCard}>
                  <p className={styles.scheduleTime}>{item.time}</p>
                  <div>
                    <p className={styles.scheduleTitle}>{item.title}</p>
                    <p className={styles.scheduleOwner}>{item.owner}</p>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
