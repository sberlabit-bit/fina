import { useState, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

// ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Food", icon: "🍔", color: "#FF6B6B", budget: 500 },
  { name: "Transport", icon: "🚗", color: "#4ECDC4", budget: 200 },
  { name: "Shopping", icon: "🛍️", color: "#FFD93D", budget: 300 },
  { name: "Health", icon: "💊", color: "#95E1D3", budget: 150 },
  { name: "Fun", icon: "🎮", color: "#F38181", budget: 200 },
  { name: "Bills", icon: "💡", color: "#74B9FF", budget: 400 },
  { name: "Other", icon: "📦", color: "#A29BFE", budget: 100 },
];

const SAMPLE = [
  { id: 1, category: "Food", name: "Whole Foods", amount: 67.4, date: "2026-03-01" },
  { id: 2, category: "Transport", name: "Uber", amount: 14.5, date: "2026-03-01" },
  { id: 3, category: "Fun", name: "Netflix", amount: 15.99, date: "2026-02-28" },
  { id: 4, category: "Shopping", name: "Amazon", amount: 89.0, date: "2026-02-27" },
  { id: 5, category: "Bills", name: "Electricity", amount: 120.0, date: "2026-02-25" },
  { id: 6, category: "Food", name: "Chipotle", amount: 13.75, date: "2026-02-24" },
  { id: 7, category: "Health", name: "Gym", amount: 45.0, date: "2026-02-22" },
  { id: 8, category: "Transport", name: "Gas", amount: 52.3, date: "2026-02-20" },
  { id: 9, category: "Food", name: "Starbucks", amount: 8.5, date: "2026-02-18" },
  { id: 10, category: "Shopping", name: "ZARA", amount: 134.0, date: "2026-02-15" },
  { id: 11, category: "Bills", name: "Internet", amount: 59.99, date: "2026-02-10" },
  { id: 12, category: "Fun", name: "Cinema", amount: 22.0, date: "2026-02-08" },
];

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("landing"); // landing | app
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [transactions, setTransactions] = useState(() => {
    try { const s = localStorage.getItem("budget_txns"); return s ? JSON.parse(s) : SAMPLE; } catch { return SAMPLE; }
  });
  const [form, setForm] = useState({ name: "", amount: "", category: "Food", date: new Date().toISOString().split("T")[0] });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try { localStorage.setItem("budget_txns", JSON.stringify(transactions)); } catch {}
  }, [transactions]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  function addTransaction() {
    if (!form.name.trim() || !form.amount) return showToast("Please fill in all fields", "error");
    const t = { id: Date.now(), ...form, amount: parseFloat(form.amount) };
    setTransactions([t, ...transactions]);
    setForm({ name: "", amount: "", category: "Food", date: new Date().toISOString().split("T")[0] });
    showToast("Expense added!");
  }

  function deleteTransaction(id) {
    setTransactions(transactions.filter((t) => t.id !== id));
    showToast("Deleted");
  }

  const totalBudget = CATEGORIES.reduce((s, c) => s + c.budget, 0);
  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const spentByCategory = CATEGORIES.map((c) => ({
    ...c, spent: transactions.filter((t) => t.category === c.name).reduce((s, t) => s + t.amount, 0),
  }));

  // chart data
  const lineData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    return { day: fmtDate(ds), spent: transactions.filter((t) => t.date === ds).reduce((s, t) => s + t.amount, 0) };
  });

  const barData = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((m, i) => ({
    month: m, spent: [820, 940, 1200, 760, 880, totalSpent][i],
  }));

  const pieData = spentByCategory.filter((c) => c.spent > 0).map((c) => ({ name: c.name, value: c.spent, color: c.color }));

  const th = {
    bg: dark ? "#0d0d14" : "#f5f5f7",
    surface: dark ? "#16161f" : "#ffffff",
    surface2: dark ? "#1e1e2e" : "#f0f0f5",
    border: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    text: dark ? "#f0f0f0" : "#0d0d14",
    muted: dark ? "#555577" : "#999",
    accent: "#7C6FF7",
    accentSoft: dark ? "rgba(124,111,247,0.15)" : "rgba(124,111,247,0.1)",
  };

  if (page === "landing") return <Landing dark={dark} setDark={setDark} th={th} onStart={() => setPage("app")} />;

  return (
    <div style={{ minHeight: "100vh", background: th.bg, fontFamily: "'DM Sans', sans-serif", color: th.text, transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? "#FF6B6B" : th.accent,
          color: "#fff", borderRadius: 14, padding: "12px 20px",
          fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          animation: "slideIn 0.3s ease",
        }}>{toast.msg}</div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px }
        * { box-sizing: border-box; margin: 0; padding: 0 }
        input, select { font-family: inherit }
      `}</style>

      {/* Sidebar */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
        background: th.surface, borderRight: `1px solid ${th.border}`,
        display: "flex", flexDirection: "column", padding: "28px 16px", zIndex: 100,
        transition: "background 0.3s",
      }}>
        <div style={{ marginBottom: 40, paddingLeft: 8 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: th.accent, letterSpacing: -0.5 }}>Fina</div>
          <div style={{ fontSize: 11, color: th.muted, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>Budget Tracker</div>
        </div>

        {[
          { id: "dashboard", icon: "◈", label: "Dashboard" },
          { id: "transactions", icon: "⊟", label: "Transactions" },
          { id: "budget", icon: "◎", label: "Budget" },
          { id: "add", icon: "+", label: "Add Expense" },
        ].map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 14px", borderRadius: 12, marginBottom: 4,
            background: tab === item.id ? th.accentSoft : "transparent",
            border: "none", cursor: "pointer", color: tab === item.id ? th.accent : th.muted,
            fontSize: 14, fontWeight: tab === item.id ? 600 : 500,
            transition: "all 0.15s", textAlign: "left",
          }}>
            <span style={{ fontSize: 18, width: 22 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div style={{ marginTop: "auto" }}>
          {/* Dark/Light Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: th.surface2, borderRadius: 12 }}>
            <span style={{ fontSize: 13, color: th.muted, fontWeight: 500 }}>{dark ? "🌙 Dark" : "☀️ Light"}</span>
            <div onClick={() => setDark(!dark)} style={{
              width: 44, height: 24, borderRadius: 12,
              background: dark ? th.accent : "#ddd",
              position: "relative", cursor: "pointer", transition: "background 0.3s",
            }}>
              <div style={{
                position: "absolute", top: 2, left: dark ? 22 : 2,
                width: 20, height: 20, borderRadius: 10,
                background: "#fff", transition: "left 0.3s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
          <button onClick={() => setPage("landing")} style={{
            width: "100%", marginTop: 8, padding: "10px 14px",
            background: "transparent", border: "none", cursor: "pointer",
            color: th.muted, fontSize: 13, fontWeight: 500, textAlign: "left",
            borderRadius: 12,
          }}>← Back to Home</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 240, padding: "36px 40px", minHeight: "100vh", animation: "fadeUp 0.4s ease" }}>
        {tab === "dashboard" && <Dashboard th={th} totalBudget={totalBudget} totalSpent={totalSpent} spentByCategory={spentByCategory} lineData={lineData} barData={barData} pieData={pieData} transactions={transactions} />}
        {tab === "transactions" && <Transactions th={th} transactions={transactions} deleteTransaction={deleteTransaction} />}
        {tab === "budget" && <Budget th={th} spentByCategory={spentByCategory} />}
        {tab === "add" && <AddExpense th={th} form={form} setForm={setForm} addTransaction={addTransaction} />}
      </div>
    </div>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────

function Landing({ dark, setDark, th, onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: th.bg, fontFamily: "'DM Sans', sans-serif", color: th.text, transition: "background 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } } * { box-sizing:border-box; margin:0; padding:0 }`}</style>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 60px", borderBottom: `1px solid ${th.border}` }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: th.accent }}>Fina</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div onClick={() => setDark(!dark)} style={{
            width: 44, height: 24, borderRadius: 12,
            background: dark ? th.accent : "#ddd",
            position: "relative", cursor: "pointer", transition: "background 0.3s",
          }}>
            <div style={{ position: "absolute", top: 2, left: dark ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.3s" }} />
          </div>
          <button onClick={onStart} style={{
            background: th.accent, color: "#fff", border: "none", borderRadius: 12,
            padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Open App →</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "100px 40px 80px", animation: "fadeUp 0.6s ease" }}>
        <div style={{ display: "inline-block", background: th.accentSoft, color: th.accent, borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 28 }}>
          Free Budget Tracker
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24, maxWidth: 700 }}>
          Know where your<br />
          <span style={{ color: th.accent }}>money goes.</span>
        </h1>
        <p style={{ fontSize: 18, color: th.muted, maxWidth: 480, lineHeight: 1.7, marginBottom: 44, fontWeight: 400 }}>
          A clean, fast expense tracker with smart budgets, visual charts, and zero complexity. Built for people who actually want to save.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <button onClick={onStart} style={{
            background: th.accent, color: "#fff", border: "none", borderRadius: 14,
            padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 8px 32px rgba(124,111,247,0.35)`,
            transition: "transform 0.15s",
          }}>Get Started — It's Free</button>
          <button style={{
            background: "transparent", color: th.text, border: `1.5px solid ${th.border}`,
            borderRadius: 14, padding: "16px 36px", fontSize: 16, fontWeight: 600, cursor: "pointer",
          }}>See Demo ↓</button>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { icon: "📊", title: "Visual Charts", desc: "Line, bar, and donut charts show exactly where your budget stands at a glance." },
            { icon: "💾", title: "Auto-Saved", desc: "Your data saves automatically in your browser. No account needed, no signup." },
            { icon: "🎯", title: "Budget Goals", desc: "Set spending limits per category and get instant feedback when you're close." },
          ].map((f) => (
            <div key={f.title} style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: th.muted, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${th.border}`, padding: "24px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: th.accent }}>Fina</span>
        <span style={{ color: th.muted, fontSize: 13 }}>© 2026 · Built with Claude</span>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard({ th, totalBudget, totalSpent, spentByCategory, lineData, barData, pieData, transactions }) {
  const remaining = totalBudget - totalSpent;
  const pct = Math.min((totalSpent / totalBudget) * 100, 100);

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Dashboard</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 32 }}>March 2026 — Your financial overview</p>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
        {[
          { label: "Total Budget", value: fmt(totalBudget), sub: "This month", color: th.accent },
          { label: "Total Spent", value: fmt(totalSpent), sub: `${pct.toFixed(0)}% of budget`, color: "#FF6B6B" },
          { label: "Remaining", value: fmt(remaining), sub: remaining < 0 ? "Over budget!" : "Available", color: "#4ECDC4" },
        ].map((k) => (
          <div key={k.label} style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: "24px 28px" }}>
            <p style={{ color: th.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{k.label}</p>
            <p style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: k.color, letterSpacing: -1 }}>{k.value}</p>
            <p style={{ color: th.muted, fontSize: 13, marginTop: 6 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Line Chart */}
        <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Spending — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: th.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: th.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 13 }} />
              <Line type="monotone" dataKey="spent" stroke="#7C6FF7" strokeWidth={2.5} dot={{ fill: "#7C6FF7", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Category Breakdown</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {pieData.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: th.muted, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 24, marginBottom: 28 }}>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Monthly Comparison</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData}>
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: th.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: th.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 13 }} />
            <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
              {barData.map((_, i) => <Cell key={i} fill={i === barData.length - 1 ? "#7C6FF7" : "#7C6FF744"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent */}
      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Recent Transactions</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {transactions.slice(0, 5).map((t) => {
            const cat = CATEGORIES.find((c) => c.name === t.category);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${th.border}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cat?.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cat?.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</p>
                  <p style={{ color: th.muted, fontSize: 12, marginTop: 2 }}>{t.category} · {fmtDate(t.date)}</p>
                </div>
                <span style={{ color: "#FF6B6B", fontWeight: 700, fontSize: 15 }}>-{fmt(t.amount)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function Transactions({ th, transactions, deleteTransaction }) {
  const [search, setSearch] = useState("");
  const filtered = transactions.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Transactions</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 28 }}>{transactions.length} total expenses</p>
      <input
        placeholder="Search transactions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%", maxWidth: 400, background: th.surface, border: `1px solid ${th.border}`,
          borderRadius: 14, padding: "12px 18px", color: th.text, fontSize: 14,
          outline: "none", marginBottom: 24, fontFamily: "inherit",
        }}
      />
      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", padding: "14px 24px", borderBottom: `1px solid ${th.border}` }}>
          {["Description", "Category", "Date", "Amount"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted }}>{h}</span>
          ))}
        </div>
        {filtered.map((t) => {
          const cat = CATEGORIES.find((c) => c.name === t.category);
          return (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", padding: "16px 24px", borderBottom: `1px solid ${th.border}`, alignItems: "center", transition: "background 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat?.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{cat?.icon}</div>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{t.name}</span>
              </div>
              <span style={{ fontSize: 13, color: th.muted }}>{t.category}</span>
              <span style={{ fontSize: 13, color: th.muted }}>{fmtDate(t.date)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#FF6B6B", fontWeight: 700, fontSize: 14 }}>-{fmt(t.amount)}</span>
                <button onClick={() => deleteTransaction(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.muted, fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: th.muted }}>No transactions found</div>}
      </div>
    </div>
  );
}

// ─── Budget ───────────────────────────────────────────────────────────────────

function Budget({ th, spentByCategory }) {
  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Budget Goals</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 32 }}>Track your spending against monthly limits</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        {spentByCategory.map((cat) => {
          const pct = Math.min((cat.spent / cat.budget) * 100, 100);
          const over = cat.spent > cat.budget;
          return (
            <div key={cat.name} style={{ background: th.surface, border: `1px solid ${over ? cat.color + "55" : th.border}`, borderRadius: 20, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `${cat.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{cat.icon}</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{cat.name}</p>
                    <p style={{ color: th.muted, fontSize: 12, marginTop: 2 }}>{fmt(cat.spent)} of {fmt(cat.budget)}</p>
                  </div>
                </div>
                <span style={{ color: over ? "#FF6B6B" : "#4ECDC4", fontWeight: 700, fontSize: 13 }}>{over ? "Over!" : `${(100 - pct).toFixed(0)}% left`}</span>
              </div>
              <div style={{ background: th.surface2 || "rgba(128,128,128,0.15)", borderRadius: 8, height: 8 }}>
                <div style={{
                  width: `${pct}%`, height: "100%", borderRadius: 8,
                  background: over ? `linear-gradient(90deg, #FF6B6B, #FF9999)` : `linear-gradient(90deg, ${cat.color}, ${cat.color}aa)`,
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Expense ──────────────────────────────────────────────────────────────

function AddExpense({ th, form, setForm, addTransaction }) {
  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Add Expense</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 36 }}>Log a new transaction to your budget</p>

      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
        {[
          { label: "Description", key: "name", type: "text", placeholder: "e.g. Whole Foods" },
          { label: "Amount ($)", key: "amount", type: "number", placeholder: "e.g. 45.00" },
          { label: "Date", key: "date", type: "date", placeholder: "" },
        ].map((f) => (
          <div key={f.key}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 8 }}>{f.label}</label>
            <input
              type={f.type} placeholder={f.placeholder} value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              style={{
                width: "100%", background: th.bg, border: `1.5px solid ${th.border}`,
                borderRadius: 14, padding: "14px 18px", color: th.text, fontSize: 15,
                outline: "none", transition: "border-color 0.15s", fontFamily: "inherit",
                colorScheme: th.bg === "#0d0d14" ? "dark" : "light",
              }}
            />
          </div>
        ))}

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 12 }}>Category</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {CATEGORIES.map((cat) => (
              <button key={cat.name} onClick={() => setForm({ ...form, category: cat.name })} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                background: form.category === cat.name ? `${cat.color}22` : th.bg,
                border: `1.5px solid ${form.category === cat.name ? cat.color : th.border}`,
                color: form.category === cat.name ? cat.color : th.muted,
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              }}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        <button onClick={addTransaction} style={{
          background: "#7C6FF7", color: "#fff", border: "none", borderRadius: 14,
          padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer",
          marginTop: 8, boxShadow: "0 8px 24px rgba(124,111,247,0.35)",
          transition: "transform 0.15s, box-shadow 0.15s", fontFamily: "inherit",
        }}>Add Expense →</button>
      </div>
    </div>
  );
}
