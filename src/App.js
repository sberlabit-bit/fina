import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: "Food", icon: "🍔", color: "#FF6B6B", budget: 500 },
  { name: "Transport", icon: "🚗", color: "#4ECDC4", budget: 200 },
  { name: "Shopping", icon: "🛍️", color: "#FFD93D", budget: 300 },
  { name: "Health", icon: "💊", color: "#95E1D3", budget: 150 },
  { name: "Fun", icon: "🎮", color: "#F38181", budget: 200 },
  { name: "Bills", icon: "💡", color: "#74B9FF", budget: 400 },
  { name: "Other", icon: "📦", color: "#A29BFE", budget: 100 },
];

const PRESET_COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#95E1D3","#F38181","#74B9FF","#A29BFE","#FD79A8","#55EFC4","#FDCB6E","#E17055","#81ECEC"];
const PRESET_EMOJIS = ["🍔","🚗","🛍️","💊","🎮","💡","📦","✈️","🏠","🎓","💼","🐾","🎵","📱","🏋️","🍕","☕","🎁","💈","🌿"];


const CURRENCIES = [
  { code: "EUR", label: "€ EUR — Euro", locale: "fr-FR" },
  { code: "USD", label: "$ USD — US Dollar", locale: "en-US" },
  { code: "GBP", label: "£ GBP — British Pound", locale: "en-GB" },
  { code: "JPY", label: "¥ JPY — Japanese Yen", locale: "ja-JP" },
  { code: "CHF", label: "CHF — Swiss Franc", locale: "de-CH" },
  { code: "CAD", label: "CAD — Canadian Dollar", locale: "en-CA" },
  { code: "AUD", label: "AUD — Australian Dollar", locale: "en-AU" },
];

const makeFmt = (currency) => {
  const c = CURRENCIES.find(x => x.code === currency) || CURRENCIES[0];
  return (n) => new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code }).format(n);
};
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("landing");
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [monthlyBudget, setMonthlyBudget] = useState(3000);
  const [currency, setCurrency] = useState("EUR");
  const [form, setForm] = useState({ name: "", amount: "", category: "Food", date: new Date().toISOString().split("T")[0] });
  const [toast, setToast] = useState(null);

  const fmt = makeFmt(currency);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setPage("app");
        loadData(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadData(userId) {
    const savedBudget = localStorage.getItem(`fina_monthly_budget_${userId}`);
    if (savedBudget) setMonthlyBudget(parseFloat(savedBudget));
    const savedCurrency = localStorage.getItem(`fina_currency_${userId}`);
    if (savedCurrency) setCurrency(savedCurrency);
    const [{ data: txns }, { data: cats }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("categories").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    ]);
    if (txns) setTransactions(txns);
    if (cats && cats.length > 0) setCategories(cats);
    else {
      const defaultWithUser = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: userId }));
      const { data: seeded } = await supabase.from("categories").insert(defaultWithUser).select();
      if (seeded) setCategories(seeded);
    }
  }

  function updateMonthlyBudget(val) {
    setMonthlyBudget(val);
    if (session) localStorage.setItem(`fina_monthly_budget_${session.user.id}`, val);
  }

  function updateCurrency(val) {
    setCurrency(val);
    if (session) localStorage.setItem(`fina_currency_${session.user.id}`, val);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function addTransaction() {
    if (!form.name.trim() || !form.amount) return showToast("Please fill in all fields", "error");
    const newT = { ...form, amount: parseFloat(form.amount), user_id: session.user.id };
    const { data, error } = await supabase.from("transactions").insert(newT).select().single();
    if (error) return showToast("Error adding expense", "error");
    setTransactions([data, ...transactions]);
    setForm({ name: "", amount: "", category: categories[0]?.name || "Other", date: new Date().toISOString().split("T")[0] });
    showToast("Expense added! ✓");
  }

  async function deleteTransaction(id) {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions(transactions.filter((t) => t.id !== id));
    showToast("Deleted");
  }

  async function addCategory(cat) {
    if (categories.find((c) => c.name.toLowerCase() === cat.name.toLowerCase())) return showToast("Category already exists", "error");
    const { data, error } = await supabase.from("categories").insert({ ...cat, user_id: session.user.id }).select().single();
    if (error) return showToast("Error adding category", "error");
    setCategories([...categories, data]);
    showToast(`${cat.icon} ${cat.name} added!`);
  }

  async function deleteCategory(id) {
    await supabase.from("categories").delete().eq("id", id);
    setCategories(categories.filter((c) => c.id !== id));
    showToast("Category removed");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setTransactions([]);
    setCategories(DEFAULT_CATEGORIES);
    setPage("landing");
  }

  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const spentByCategory = categories.map((c) => ({
    ...c, spent: transactions.filter((t) => t.category === c.name).reduce((s, t) => s + t.amount, 0),
  }));

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
    bg: dark ? "#0d0d14" : "#eeeef2",
    surface: dark ? "#16161f" : "#f7f7fa",
    surface2: dark ? "#1e1e2e" : "#e4e4ea",
    border: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)",
    text: dark ? "#f0f0f0" : "#1a1a2e",
    muted: dark ? "#555577" : "#6b6b80",
    accent: "#7C6FF7",
    accentSoft: dark ? "rgba(124,111,247,0.15)" : "rgba(124,111,247,0.1)",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#7C6FF7", fontFamily: "sans-serif", fontSize: 18 }}>Loading...</div>
    </div>
  );

  if (page === "landing") return <Landing dark={dark} setDark={setDark} th={th} onStart={() => session ? setPage("app") : setPage("auth")} />;
  if (page === "auth") return <Auth th={th} dark={dark} setDark={setDark} supabase={supabase} showToast={showToast} setPage={setPage} toast={toast} />;

  return (
    <div style={{ minHeight: "100vh", background: th.bg, fontFamily: "'DM Sans', sans-serif", color: th.text, transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "#FF6B6B" : th.accent, color: "#fff", borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "slideIn 0.3s ease" }}>{toast.msg}</div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px }
        * { box-sizing: border-box; margin: 0; padding: 0 }
        input, select { font-family: inherit }
        button:hover { opacity: 0.85 }
      `}</style>

      {/* Sidebar */}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, background: th.surface, borderRight: `1px solid ${th.border}`, display: "flex", flexDirection: "column", padding: "28px 16px", zIndex: 100, transition: "background 0.3s" }}>
        <div style={{ marginBottom: 40, paddingLeft: 8 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: th.accent, letterSpacing: -0.5 }}>Fina</div>
          <div style={{ fontSize: 11, color: th.muted, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>Fine with your finances</div>
        </div>

        {[
          { id: "dashboard", icon: "◈", label: "Dashboard" },
          { id: "transactions", icon: "⊟", label: "Transactions" },
          { id: "budget", icon: "◎", label: "Budget" },
          { id: "add", icon: "+", label: "Add Expense" },
          { id: "categories", icon: "⊞", label: "Categories" },
          { id: "settings", icon: "⚙", label: "Settings" },
        ].map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, marginBottom: 4, background: tab === item.id ? th.accentSoft : "transparent", border: "none", cursor: "pointer", color: tab === item.id ? th.accent : th.muted, fontSize: 14, fontWeight: tab === item.id ? 600 : 500, transition: "all 0.15s", textAlign: "left", width: "100%" }}>
            <span style={{ fontSize: 18, width: 22 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div style={{ marginTop: "auto" }}>
          {session && (
            <div style={{ padding: "10px 14px", marginBottom: 8, background: th.surface2, borderRadius: 12 }}>
              <p style={{ fontSize: 11, color: th.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Signed in as</p>
              <p style={{ fontSize: 13, color: th.text, fontWeight: 500, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</p>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: th.surface2, borderRadius: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: th.muted, fontWeight: 500 }}>{dark ? "🌙 Dark" : "☀️ Light"}</span>
            <div onClick={() => setDark(!dark)} style={{ width: 44, height: 24, borderRadius: 12, background: dark ? th.accent : "#ddd", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
              <div style={{ position: "absolute", top: 2, left: dark ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
          <button onClick={signOut} style={{ width: "100%", padding: "10px 14px", background: "rgba(255,107,107,0.1)", border: "none", cursor: "pointer", color: "#FF6B6B", fontSize: 13, fontWeight: 600, textAlign: "left", borderRadius: 12, fontFamily: "inherit" }}>
            → Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 260, padding: "36px 40px", minHeight: "100vh", animation: "fadeUp 0.4s ease" }}>
        {tab === "dashboard" && <Dashboard th={th} totalBudget={totalBudget} totalSpent={totalSpent} spentByCategory={spentByCategory} lineData={lineData} barData={barData} pieData={pieData} transactions={transactions} monthlyBudget={monthlyBudget} updateMonthlyBudget={updateMonthlyBudget} fmt={fmt} dark={dark} />}
        {tab === "transactions" && <Transactions th={th} transactions={transactions} deleteTransaction={deleteTransaction} categories={categories} fmt={fmt} />}
        {tab === "budget" && <Budget th={th} spentByCategory={spentByCategory} fmt={fmt} />}
        {tab === "add" && <AddExpense th={th} form={form} setForm={setForm} addTransaction={addTransaction} categories={categories} setTab={setTab} fmt={fmt} dark={dark} />}
        {tab === "categories" && <Categories th={th} categories={categories} addCategory={addCategory} deleteCategory={deleteCategory} showToast={showToast} fmt={fmt} />}
        {tab === "settings" && <Settings th={th} currency={currency} updateCurrency={updateCurrency} monthlyBudget={monthlyBudget} updateMonthlyBudget={updateMonthlyBudget} fmt={fmt} dark={dark} setDark={setDark} />}
      </div>
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function Auth({ th, dark, setDark, supabase, showToast, setPage, toast }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) return showToast("Please fill in all fields", "error");
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) showToast(error.message, "error");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) showToast(error.message, "error");
      else showToast("Check your email to confirm your account!");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: th.bg, fontFamily: "'DM Sans', sans-serif", color: th.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0 } @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "#FF6B6B" : th.accent, color: "#fff", borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>{toast.msg}</div>
      )}

      <div style={{ width: "100%", maxWidth: 420, padding: 24, animation: "fadeUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: th.accent, marginBottom: 8 }}>Fina</div>
          <p style={{ color: th.muted, fontSize: 14 }}>Fine with your finances</p>
        </div>

        <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 24, padding: 32 }}>
          {/* Toggle */}
          <div style={{ display: "flex", background: th.surface2, borderRadius: 14, padding: 4, marginBottom: 28 }}>
            {["login", "signup"].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", background: mode === m ? th.accent : "transparent", color: mode === m ? "#fff" : th.muted, fontSize: 14, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 8 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", background: th.bg, border: `1.5px solid ${th.border}`, borderRadius: 14, padding: "14px 18px", color: th.text, fontSize: 15, outline: "none", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 8 }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", background: th.bg, border: `1.5px solid ${th.border}`, borderRadius: 14, padding: "14px 18px", color: th.text, fontSize: 15, outline: "none", fontFamily: "inherit" }}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
            </div>

            <button onClick={handleAuth} disabled={loading} style={{ background: th.accent, color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, boxShadow: "0 8px 24px rgba(124,111,247,0.35)", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Loading..." : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>
          </div>
        </div>

        <button onClick={() => setPage("landing")} style={{ width: "100%", marginTop: 16, padding: "10px", background: "transparent", border: "none", cursor: "pointer", color: th.muted, fontSize: 13, fontFamily: "inherit" }}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function Landing({ dark, setDark, th, onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: th.bg, fontFamily: "'DM Sans', sans-serif", color: th.text, transition: "background 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } } * { box-sizing:border-box; margin:0; padding:0 }`}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 60px", borderBottom: `1px solid ${th.border}` }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: th.accent }}>Fina</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div onClick={() => setDark(!dark)} style={{ width: 44, height: 24, borderRadius: 12, background: dark ? th.accent : "#ddd", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
            <div style={{ position: "absolute", top: 2, left: dark ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.3s" }} />
          </div>
          <button onClick={onStart} style={{ background: th.accent, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Get Started →</button>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "100px 40px 80px", animation: "fadeUp 0.6s ease" }}>
        <div style={{ display: "inline-block", background: th.accentSoft, color: th.accent, borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 28 }}>Free Budget Tracker</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24, maxWidth: 700 }}>
          Be <span style={{ color: th.accent }}>fine</span> with<br />your finances.
        </h1>
        <p style={{ fontSize: 18, color: th.muted, maxWidth: 480, lineHeight: 1.7, marginBottom: 44, fontWeight: 400 }}>
          A clean, fast expense tracker with smart budgets, visual charts, and custom categories. Built for people who actually want to save.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <button onClick={onStart} style={{ background: th.accent, color: "#fff", border: "none", borderRadius: 14, padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 32px rgba(124,111,247,0.35)" }}>Get Started — It's Free</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { icon: "📊", title: "Visual Charts", desc: "Line, bar, and donut charts show exactly where your budget stands at a glance." },
            { icon: "🏷️", title: "Custom Categories", desc: "Create your own spending categories with custom icons, colors and budget limits." },
            { icon: "🔐", title: "Your Data, Private", desc: "Sign in securely. Your expenses are private and only visible to you." },
          ].map((f) => (
            <div key={f.title} style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: th.muted, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${th.border}`, padding: "24px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: th.accent }}>Fina</span>
        <span style={{ color: th.muted, fontSize: 13 }}>© 2026 · Fine with your finances</span>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ th, totalBudget, totalSpent, spentByCategory, lineData, barData, pieData, transactions, monthlyBudget, updateMonthlyBudget, fmt, dark }) {
  const remaining = monthlyBudget - totalSpent;
  const pct = Math.min((totalSpent / monthlyBudget) * 100, 100);
  const catTotal = totalBudget;
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget);
  const isOver = totalSpent > monthlyBudget;
  const catOver = catTotal > monthlyBudget;

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Dashboard</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 32 }}>March 2026 — Your financial overview</p>

      {/* Monthly Budget Setter */}
      <div style={{ background: th.surface, border: `1.5px solid ${th.accent}44`, borderRadius: 20, padding: "20px 28px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ color: th.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Monthly Budget</p>
          {editingBudget ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                style={{ background: th.bg, border: `1.5px solid ${th.accent}`, borderRadius: 10, padding: "8px 14px", color: th.text, fontSize: 22, fontWeight: 800, width: 160, outline: "none", fontFamily: "'Syne', sans-serif" }} />
              <button onClick={() => { updateMonthlyBudget(parseFloat(budgetInput)); setEditingBudget(false); }}
                style={{ background: th.accent, color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Save</button>
              <button onClick={() => setEditingBudget(false)}
                style={{ background: "transparent", color: th.muted, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: th.accent }}>{fmt(monthlyBudget)}</span>
              <button onClick={() => { setBudgetInput(monthlyBudget); setEditingBudget(true); }}
                style={{ background: th.accentSoft, color: th.accent, border: "none", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: th.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Spent</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: isOver ? "#FF6B6B" : th.text }}>{fmt(totalSpent)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: th.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Remaining</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: isOver ? "#FF6B6B" : "#4ECDC4" }}>{fmt(remaining)}</p>
          </div>
        </div>
        {catOver && (
          <div style={{ width: "100%", background: "rgba(255,107,107,0.1)", border: "1px solid #FF6B6B44", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#FF6B6B", fontWeight: 600 }}>
            ⚠️ Your category budgets ({fmt(catTotal)}) exceed your monthly budget ({fmt(monthlyBudget)}). Consider adjusting your categories.
          </div>
        )}
        <div style={{ width: "100%", background: th.surface2, borderRadius: 10, height: 8 }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 10, background: isOver ? "linear-gradient(90deg, #FF6B6B, #FF9999)" : `linear-gradient(90deg, ${th.accent}, #C084FC)`, transition: "width 0.8s ease" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
        {[
          { label: "Monthly Budget", value: fmt(monthlyBudget), sub: "Your spending limit", color: th.accent },
          { label: "Total Spent", value: fmt(totalSpent), sub: `${pct.toFixed(0)}% of budget`, color: dark ? "#f0f0f0" : "#1a1a2e" },
          { label: "Remaining", value: fmt(remaining), sub: isOver ? "Over budget!" : "Available", color: isOver ? "#FF6B6B" : "#4ECDC4" },
        ].map((k) => (
          <div key={k.label} style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: "24px 28px" }}>
            <p style={{ color: th.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{k.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: k.color, letterSpacing: -1 }}>{k.value}</p>
            <p style={{ color: th.muted, fontSize: 13, marginTop: 6 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
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
            <div style={{ flex: 1, overflowY: "auto", maxHeight: 180 }}>
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

      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Recent Transactions</p>
        {transactions.length === 0 ? (
          <p style={{ color: th.muted, fontSize: 14, textAlign: "center", padding: "20px 0" }}>No transactions yet — add your first expense!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {transactions.slice(0, 5).map((t) => {
              const cat = spentByCategory.find((c) => c.name === t.category);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${th.border}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cat?.color || "#888"}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cat?.icon || "📦"}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</p>
                    <p style={{ color: th.muted, fontSize: 12, marginTop: 2 }}>{t.category} · {fmtDate(t.date)}</p>
                  </div>
                  <span style={{ color: "#FF6B6B", fontWeight: 700, fontSize: 15 }}>-{fmt(t.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function Transactions({ th, transactions, deleteTransaction, categories, fmt }) {
  const [search, setSearch] = useState("");
  const filtered = transactions.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Transactions</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 28 }}>{transactions.length} total expenses</p>
      <input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", maxWidth: 400, background: th.surface, border: `1px solid ${th.border}`, borderRadius: 14, padding: "12px 18px", color: th.text, fontSize: 14, outline: "none", marginBottom: 24, fontFamily: "inherit" }} />
      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", padding: "14px 24px", borderBottom: `1px solid ${th.border}` }}>
          {["Description", "Category", "Date", "Amount"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted }}>{h}</span>
          ))}
        </div>
        {filtered.map((t) => {
          const cat = categories.find((c) => c.name === t.category);
          return (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", padding: "16px 24px", borderBottom: `1px solid ${th.border}`, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat?.color || "#888"}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{cat?.icon || "📦"}</div>
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

function Budget({ th, spentByCategory, fmt }) {
  return (
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Budget Goals</h1>
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
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 8, background: over ? "linear-gradient(90deg, #FF6B6B, #FF9999)" : `linear-gradient(90deg, ${cat.color}, ${cat.color}aa)`, transition: "width 0.8s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Expense ──────────────────────────────────────────────────────────────

function AddExpense({ th, form, setForm, addTransaction, categories, setTab, fmt, dark }) {
  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Add Expense</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 36 }}>Log a new transaction to your budget</p>
      <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
        {[
          { label: "Description", key: "name", type: "text", placeholder: "e.g. Whole Foods" },
          { label: "Amount ($)", key: "amount", type: "number", placeholder: "e.g. 45.00" },
          { label: "Date", key: "date", type: "date", placeholder: "" },
        ].map((f) => (
          <div key={f.key}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 8 }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} style={{ width: "100%", background: th.surface2, border: `1.5px solid ${th.border}`, borderRadius: 14, padding: "14px 18px", color: th.text, fontSize: 15, outline: "none", fontFamily: "inherit", colorScheme: dark ? "dark" : "light" }} />
          </div>
        ))}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted }}>Category</label>
            <button onClick={() => setTab("categories")} style={{ background: th.accentSoft, border: "none", color: th.accent, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>+ Manage</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {categories.map((cat) => (
              <button key={cat.name} onClick={() => setForm({ ...form, category: cat.name })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", background: form.category === cat.name ? `${cat.color}22` : th.bg, border: `1.5px solid ${form.category === cat.name ? cat.color : th.border}`, color: form.category === cat.name ? cat.color : th.muted, fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={addTransaction} style={{ background: "#7C6FF7", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, boxShadow: "0 8px 24px rgba(124,111,247,0.35)", fontFamily: "inherit" }}>
          Add Expense →
        </button>
      </div>
    </div>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────

function Categories({ th, categories, addCategory, deleteCategory, showToast, fmt }) {
  const [showForm, setShowForm] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", icon: "📦", color: "#7C6FF7", budget: "" });

  function handleAdd() {
    if (!newCat.name.trim() || !newCat.budget) return showToast("Please fill in all fields", "error");
    addCategory({ ...newCat, budget: parseFloat(newCat.budget) });
    setNewCat({ name: "", icon: "📦", color: "#7C6FF7", budget: "" });
    setShowForm(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Categories</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ background: th.accent, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {showForm ? "✕ Cancel" : "+ New Category"}
        </button>
      </div>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 32 }}>{categories.length} categories · customise your spending groups</p>

      {showForm && (
        <div style={{ background: th.surface, border: `1.5px solid ${th.accent}44`, borderRadius: 20, padding: 28, marginBottom: 28, animation: "modalIn 0.2s ease" }}>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>✨ Create New Category</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 8 }}>Name</label>
              <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Travel" style={{ width: "100%", background: th.bg, border: `1.5px solid ${th.border}`, borderRadius: 12, padding: "12px 16px", color: th.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 8 }}>Monthly Budget ($)</label>
              <input type="number" value={newCat.budget} onChange={(e) => setNewCat({ ...newCat, budget: e.target.value })} placeholder="e.g. 300" style={{ width: "100%", background: th.bg, border: `1.5px solid ${th.border}`, borderRadius: 12, padding: "12px 16px", color: th.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 10 }}>Pick an Emoji</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRESET_EMOJIS.map((e) => (
                <button key={e} onClick={() => setNewCat({ ...newCat, icon: e })} style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${newCat.icon === e ? th.accent : th.border}`, background: newCat.icon === e ? th.accentSoft : th.bg, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: th.muted, display: "block", marginBottom: 10 }}>Pick a Color</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setNewCat({ ...newCat, color: c })} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: `3px solid ${newCat.color === c ? "#fff" : "transparent"}`, cursor: "pointer", boxShadow: newCat.color === c ? `0 0 0 2px ${c}` : "none" }} />
              ))}
            </div>
          </div>
          <div style={{ background: th.bg, borderRadius: 14, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${newCat.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{newCat.icon}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: newCat.color }}>{newCat.name || "Category Name"}</p>
              <p style={{ color: th.muted, fontSize: 12 }}>Budget: {newCat.budget ? fmt(parseFloat(newCat.budget)) : "$0.00"}/mo</p>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: th.muted, fontWeight: 600 }}>PREVIEW</span>
          </div>
          <button onClick={handleAdd} style={{ background: th.accent, color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Create Category →
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {categories.map((cat) => (
          <div key={cat.id || cat.name} style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 18, padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${cat.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{cat.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</p>
              <p style={{ color: th.muted, fontSize: 12, marginTop: 2 }}>{fmt(cat.budget)}/mo budget</p>
            </div>
            <button onClick={() => deleteCategory(cat.id || cat.name)} style={{ background: "rgba(255,107,107,0.1)", border: "none", color: "#FF6B6B", borderRadius: 10, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings({ th, currency, updateCurrency, monthlyBudget, updateMonthlyBudget, fmt, dark, setDark }) {
  const [budgetInput, setBudgetInput] = useState(monthlyBudget);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updateMonthlyBudget(parseFloat(budgetInput));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Settings</h1>
      <p style={{ color: th.muted, fontSize: 14, marginBottom: 36 }}>Customise Fina to your preferences</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Currency */}
        <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>💱 Currency</h3>
          <p style={{ color: th.muted, fontSize: 13, marginBottom: 20 }}>All amounts will be displayed in your chosen currency</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CURRENCIES.map((c) => (
              <div key={c.code} onClick={() => updateCurrency(c.code)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", borderRadius: 14, cursor: "pointer",
                background: currency === c.code ? th.accentSoft : th.bg,
                border: `1.5px solid ${currency === c.code ? th.accent : th.border}`,
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: currency === c.code ? th.accent : th.text }}>{c.label}</span>
                {currency === c.code && <span style={{ color: th.accent, fontSize: 16 }}>✓</span>}
              </div>
            ))}
          </div>
          <p style={{ color: th.muted, fontSize: 12, marginTop: 16 }}>Preview: {fmt(1234.56)}</p>
        </div>

        {/* Monthly Budget */}
        <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🎯 Monthly Budget</h3>
          <p style={{ color: th.muted, fontSize: 13, marginBottom: 20 }}>Set your overall spending limit for the month</p>
          <input
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            style={{ width: "100%", background: th.bg, border: `1.5px solid ${th.border}`, borderRadius: 14, padding: "14px 18px", color: th.text, fontSize: 20, fontWeight: 700, outline: "none", fontFamily: "'Syne', sans-serif", marginBottom: 16 }}
          />
          <button onClick={handleSave} style={{ background: saved ? "#4ECDC4" : th.accent, color: "#fff", border: "none", borderRadius: 12, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.3s" }}>
            {saved ? "✓ Saved!" : "Save Budget"}
          </button>
        </div>

        {/* Theme */}
        <div style={{ background: th.surface, border: `1px solid ${th.border}`, borderRadius: 20, padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🎨 Appearance</h3>
          <p style={{ color: th.muted, fontSize: 13, marginBottom: 20 }}>Choose between dark and light mode</p>
          <div style={{ display: "flex", gap: 12 }}>
            {[{ label: "🌙 Dark", val: true }, { label: "☀️ Light", val: false }].map((t) => (
              <div key={t.label} onClick={() => setDark(t.val)} style={{
                flex: 1, padding: "14px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                background: dark === t.val ? th.accentSoft : th.bg,
                border: `1.5px solid ${dark === t.val ? th.accent : th.border}`,
                color: dark === t.val ? th.accent : th.muted,
                fontWeight: 600, fontSize: 14, transition: "all 0.15s",
              }}>{t.label}</div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
