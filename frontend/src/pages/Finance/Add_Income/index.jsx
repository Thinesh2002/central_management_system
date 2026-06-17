import React, { useState, useEffect } from "react";
import { addIncome } from "../../../services/Finance/finance.service";
import { useNavigate } from "react-router-dom";
import { 
  Wallet, 
  Hash, 
  Banknote, 
  Calculator, 
  Calendar, 
  FileText, 
  PlusCircle, 
  ArrowLeft 
} from "lucide-react";

const AddIncome = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    source_name: "",
    order_number: "",
    gross_amount: "",
    platform_fee: "",
    commission: "",
    shipping_fee: "",
    net_amount: 0,
    income_date: "",
    notes: ""
  });

  const [loading, setLoading] = useState(false);

  /* ======================
      AUTO NET CALCULATION
  ====================== */
  useEffect(() => {
    const gross = Number(form.gross_amount || 0);
    const platform = Number(form.platform_fee || 0);
    const commission = Number(form.commission || 0);
    const shipping = Number(form.shipping_fee || 0);

    const net = gross - (platform + commission + shipping);
    setForm(prev => ({ ...prev, net_amount: net }));
  }, [form.gross_amount, form.platform_fee, form.commission, form.shipping_fee]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addIncome(form);
      navigate("/finance-dashboard");
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in duration-700 p-4 md:p-8">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/20">
            <Wallet className="text-blue-500" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic">
              Record <span className="text-blue-500 font-bold not-italic">Income</span>
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Finance & Revenue Log</p>
          </div>
        </div>
      </div>

      {/* FORM CONTAINER */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: CORE INFO */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <PlusCircle size={18} className="text-blue-500" /> Transaction Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                icon={<Wallet />} label="Platform Source" 
                type="select" name="source_name" value={form.source_name} onChange={handleChange}
                options={["Daraz", "Whatsapp", "Website", "Offline", "Other"]}
              />
              <Input 
                icon={<Hash />} label="Order Reference" 
                name="order_number" value={form.order_number} onChange={handleChange} 
                placeholder="Ex: #ORD-12345"
              />
              <div className="md:col-span-2">
                 <Input 
                   icon={<Banknote />} label="Gross Amount (LKR)" 
                   type="number" name="gross_amount" value={form.gross_amount} onChange={handleChange} 
                   placeholder="0.00" highlight
                 />
              </div>
            </div>
          </div>

          <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Calculator size={18} className="text-blue-500" /> Deductions & Fees
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Input icon={<PlusCircle />} label="Platform Fee" name="platform_fee" type="number" value={form.platform_fee} onChange={handleChange} />
               <Input icon={<PlusCircle />} label="Commission" name="commission" type="number" value={form.commission} onChange={handleChange} />
               <Input icon={<PlusCircle />} label="Shipping Fee" name="shipping_fee" type="number" value={form.shipping_fee} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* RIGHT: SUMMARY & ACTIONS */}
        <div className="lg:col-span-4 space-y-6">
          {/* NET SUMMARY */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
            <Calculator size={120} className="absolute -right-8 -bottom-8 text-white/10 group-hover:scale-110 transition-transform duration-700" />
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Net Settlement</p>
            <div className="text-4xl font-black text-white tracking-tighter mb-4 tabular-nums">
              Rs. {form.net_amount.toLocaleString()}
            </div>
            <p className="text-blue-200 text-[10px] leading-relaxed font-bold uppercase">
              Auto-calculated based on deductions
            </p>
          </div>

          <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-6">
            <Input icon={<Calendar />} label="Posting Date" name="income_date" type="date" value={form.income_date} onChange={handleChange} />
            <Input icon={<FileText />} label="Transaction Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
            
            <div className="pt-4 space-y-3">
               <button 
                 type="submit" disabled={loading}
                 className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-50"
               >
                 {loading ? "Saving..." : "Confirm & Save"}
               </button>
               <button 
                 type="button" onClick={() => navigate(-1)}
                 className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
               >
                 Go Back
               </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

/* ================= COMPONENT: CUSTOM INPUT ================= */
const Input = ({ label, icon, type = "text", name, value, onChange, options, placeholder, highlight }) => (
  <div className="space-y-2 group">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-500 transition-colors">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
          {React.cloneElement(icon, { size: 16 })}
        </div>
      )}

      {type === "select" ? (
        <select 
          name={name} value={value} onChange={onChange} required
          className="w-full bg-[#020617] border border-white/10 px-12 py-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all appearance-none"
        >
          <option value="">Select Platform</option>
          {options.map(opt => <option key={opt} value={opt.toLowerCase()}>{opt}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea 
          name={name} value={value} onChange={onChange} rows="3" placeholder={placeholder}
          className="w-full bg-[#020617] border border-white/10 px-4 py-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
        />
      ) : (
        <input 
          type={type} name={name} value={value} onChange={onChange} required={highlight} placeholder={placeholder}
          className={`w-full bg-[#020617] border border-white/10 px-12 py-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all tabular-nums ${highlight ? 'text-blue-400 font-bold text-xl' : 'text-sm'}`}
        />
      )}
    </div>
  </div>
);

export default AddIncome;