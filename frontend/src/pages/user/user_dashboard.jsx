import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../config/api";
import { getStoredUser } from "../../config/auth";
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Clock, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Zap
} from "lucide-react";

export default function UserDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, recent: [] });
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/user/stats");
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get("/user/users");
      setUsers(res.data.users || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const filtered = users.filter(u =>
    (u.name || "").toLowerCase().includes(query.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(query.toLowerCase()) ||
    (u.user_id || "").toLowerCase().includes(query.toLowerCase()) ||
    String(u.id) === query
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to terminate this user instance?")) return;
    try {
      await API.delete(`/auth/${id}`);
      fetchStats();
      fetchUsers();
    } catch (err) { alert(err.response?.data?.message || "Termination failed"); }
  };

  const handleEdit = async (u) => {
    const me = getStoredUser();
    if (me && me.id === u.id) { navigate("/profile"); return; }
    const newName = prompt("Modify User Identity (Name):", u.name || "");
    if (newName === null) return;
    try {
      await API.put(`/auth/${u.id}`, { name: newName });
      fetchUsers(); fetchStats();
    } catch (err) { alert("Update failed"); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-2">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter italic">
            User <span className="text-blue-500 font-bold not-italic">Directory</span>
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Access Control & Security Matrix</p>
        </div>

        <button
          onClick={() => navigate("/register")}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          <UserPlus size={14} /> Provision User
        </button>
      </div>

      {/* TOP BENTO STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KPI: TOTAL USERS */}
        <div className="lg:col-span-4 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
          <Users size={120} className="absolute -right-8 -bottom-8 text-white/10 group-hover:scale-110 transition-transform duration-700" />
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Total Node Population</p>
          <div className="text-5xl font-black text-white tracking-tighter tabular-nums">
            {stats.total ?? 0}
          </div>
          <div className="mt-4 flex items-center gap-2 text-blue-200 text-[10px] font-black uppercase">
            <ShieldCheck size={12} /> System Integrity Verified
          </div>
        </div>

        {/* RECENT ACTIVITY BENTO */}
        <div className="lg:col-span-8 bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
            <Clock size={16} className="text-blue-500" /> Recent Onboarding
          </h3>
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-2">
              {stats.recent?.length ? stats.recent.map(u => (
                <div key={u.id} className="min-w-[200px] bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black italic">
                    {u.name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{u.name || "Anonymous"}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">#{u.user_id}</p>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-xs italic">No recent activity detected.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & TABLE SECTION */}
      <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl p-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              className="w-full bg-[#020617] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-slate-600"
              placeholder="Filter by name, email, or instance ID..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={() => { setQuery(""); setPage(1); }}
            className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <XCircle size={14} /> Reset
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Zap className="text-blue-500 animate-pulse mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Indexing User Nodes...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-5 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                    <th className="pb-5 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity</th>
                    <th className="pb-5 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Handle</th>
                    <th className="pb-5 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                    <th className="pb-5 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {paginated.map((u) => (
                    <tr key={u.id} className="group hover:bg-blue-500/[0.02] transition-colors">
                      <td className="py-5 px-4 font-mono text-xs text-slate-500">#{u.id}</td>
                      <td className="py-5 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{u.name}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={10}/> {u.email}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-xs font-medium text-slate-400 uppercase tracking-tighter bg-white/[0.02] rounded-lg border border-white/5">{u.user_id}</td>
                      <td className="py-5 px-4 text-[10px] text-slate-500 font-bold uppercase">{u.created_at}</td>
                      <td className="py-5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(u)} className="p-2 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-900/20"><Edit3 size={14}/></button>
                          <button onClick={() => handleDelete(u.id)} className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-900/20"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MODERN PAGINATION */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-10 pt-8 border-t border-white/5 gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Showing {paginated.length} of {filtered.length} nodes
              </span>

              <div className="flex items-center gap-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-white px-4 py-2 bg-white/5 rounded-xl border border-white/10 tracking-widest">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}