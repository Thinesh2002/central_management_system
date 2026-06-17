import { useEffect, useState } from "react";
import API from "../../../../config/api";
import { Trash2, Save, Database, Plus, Search } from "lucide-react";

export default function SkuMappingPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountCode, setAccountCode] = useState("");
  const [darazSku, setDarazSku] = useState("");
  const [correctSku, setCorrectSku] = useState("");
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await API.get("/accounts/view");
        setAccounts(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!accountCode) {
      setMappings([]);
      return;
    }
    fetchMappings();
  }, [accountCode]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/sku-mapping/view?account_code=${accountCode}`);
      setMappings(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accountCode || !darazSku || !correctSku) return;
    try {
      await API.post("/sku-mapping/create", {
        account_code: accountCode,
        daraz_sku: darazSku.trim(),
        correct_sku: correctSku.trim(),
      });
      setDarazSku("");
      setCorrectSku("");
      fetchMappings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (sku) => {
    try {
      await API.delete("/sku-mapping/delete", {
        data: { account_code: accountCode, daraz_sku: sku },
      });
      setMappings((prev) => prev.filter((item) => item.daraz_sku !== sku));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className=" bg-[#020617] text-slate-300  font-sans">
      <div className="space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          
              SKU Mapping
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Synchronize Daraz SKUs with your internal inventory system.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#0f172a] p-2 rounded-2xl border border-slate-800">
            <label className="pl-3 text-xs font-bold text-slate-500 uppercase tracking-tighter">Account</label>
            <select
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              className="bg-[#1e293b] border border-slate-700 text-white text-sm rounded-xl px-4 py-2 outline-none focus:border-blue-500 transition-all min-w-[200px]"
            >
              <option value="">Select Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.account_code}>{acc.account_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-slate-800 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Daraz SKU (Input)"
                value={darazSku}
                onChange={(e) => setDarazSku(e.target.value)}
                className="w-full bg-[#020617] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="relative">
              <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Internal SKU (Output)"
                value={correctSku}
                onChange={(e) => setCorrectSku(e.target.value)}
                className="w-full bg-[#020617] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-3 px-6 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              <Save size={18} />
              Create Mapping
            </button>
          </div>
        </div>

        <div className="bg-[#0f172a] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800">
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Daraz SKU</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Correct SKU</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-8 py-20 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div>
                  </td>
                </tr>
              ) : mappings.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-8 py-20 text-center text-slate-600 italic">
                    No mappings found for this account.
                  </td>
                </tr>
              ) : (
                mappings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <code className="bg-slate-900 px-3 py-1 rounded-lg text-blue-400 text-xs border border-slate-800">{item.daraz_sku}</code>
                    </td>
                    <td className="px-8 py-5">
                      <code className="bg-slate-900 px-3 py-1 rounded-lg text-emerald-400 text-xs border border-slate-800">{item.correct_sku}</code>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleDelete(item.daraz_sku)}
                        className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}