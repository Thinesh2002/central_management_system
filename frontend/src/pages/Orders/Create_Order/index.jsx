import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Save, Package, User, Database,
  Trash2, CreditCard, Sparkles, MapPin, Phone, Wallet,
  ShoppingCart, Search, RefreshCw
} from "lucide-react";
import API, { API_BASE_URL } from "../../../config/api";
import { addIncome } from "../../../services/Finance/finance.service";

export default function OrderCreate() {
  /* ================= STATE MANAGEMENT ================= */
  const [order, setOrder] = useState({
    order_id: "",
    customer_id: "",
    total_amount: 0,
    buyer_paid_shipping_fee: 0,
    shipping_fee: 0, // 🔥 Database-la store panna inga irukku
    payment_method: "COD",
    status: "PENDING",
  });

  const [items, setItems] = useState([{ sku: "", quantity: 1, price: 0, image: "" }]);
  const [loading, setLoading] = useState(false);
  
  const [finance, setFinance] = useState({
    source_name: "whatsapp",
    order_number: "",
    platform_fee: 0,
    commission: 0,
    shipping_fee: 0,
    income_date: new Date().toISOString().split('T')[0],
    notes: "Auto generated from order create"
  });

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, custRes] = await Promise.all([
          API.get("/products/list"),
          API.get("/customers/view")
        ]);
        const filtered = prodRes.data.filter(p => p.product_type === "single" || p.product_type === "child");
        setProducts(filtered.length ? filtered : prodRes.data);
        setCustomers(custRes.data);
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };
    fetchData();
  }, []);

  /* ================= CALCULATIONS ================= */
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);

  const netProfit = useMemo(() => {
    const buyerShip = Number(order.buyer_paid_shipping_fee || 0);
    const expenses = Number(finance.platform_fee || 0) + 
                     Number(finance.commission || 0) + 
                     Number(finance.shipping_fee || 0);
    return (subtotal + buyerShip) - expenses;
  }, [subtotal, order.buyer_paid_shipping_fee, finance]);

  /* ================= ACTIONS ================= */
  const handleSkuSelect = (index, sku) => {
    const product = products.find(p => p.sku === sku);
    if (!product) return;
    const updated = [...items];
    updated[index] = { 
      ...updated[index], 
      sku, 
      price: Number(product.selling_price), 
      image: product.main_image 
    };
    setItems(updated);
  };

  const submit = async () => {
    if (!order.order_id.trim() || !order.customer_id) {
      return alert("Order ID & Customer required! 🛑");
    }

    const isInvalid = items.some(item => !item.sku || item.quantity <= 0);
    if (isInvalid) {
      return alert("Please select products for all rows! 📦");
    }

    setLoading(true);

    try {
      // 🔥 LOGIC: Total calculation matrum shipping mapping
      const grandTotal = subtotal + Number(order.buyer_paid_shipping_fee || 0);
      
      const orderPayload = {
        order: { 
          ...order, 
          total_amount: grandTotal,
          shipping_fee: finance.shipping_fee // 🔥 Finance cost-ah order table-ku anupuroam
        }, 
        items 
      };

      // 1. Save Order & Update Stock
      const orderRes = await API.post("/orders/add", orderPayload);
      
      if(orderRes.data.success) {
        // 2. Save Finance Entry
        await addIncome({ 
          ...finance, 
          order_number: order.order_id,
          gross_amount: subtotal,
          net_amount: netProfit,
          buyer_paid_shipping_fee: order.buyer_paid_shipping_fee
        });

        alert("System Synced Successfully! Order Created + Finance Recorded ✨🚀");
        // Reset or Redirect logic here
      }
    } catch (err) {
      alert(`Sync Failure: ${err.response?.data?.error || "Server connection failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-300 p-4 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
                <ShoppingCart size={24} className="text-white" />
              </span>
              Create Order
            </h1>
            <p className="text-slate-500 mt-1">Real-time inventory and profit tracking.</p>
          </div>
          <button 
            disabled={loading}
            onClick={submit}
            className={`group relative px-10 py-3 rounded-xl font-bold transition-all flex items-center gap-2 overflow-hidden shadow-xl 
              ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {loading ? "SYNCING..." : "SYNC SYSTEM"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: CONFIGURATION */}
          <div className="lg:col-span-4 space-y-6">
            <Card title="Order Details" icon={<Database size={18} className="text-blue-400" />}>
              <div className="space-y-4">
                <ModernInput 
                  label="Reference ID (Order ID)" 
                  placeholder="WH-1023" 
                  value={order.order_id}
                  onChange={(e) => setOrder({...order, order_id: e.target.value})}
                />
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Customer</label>
                  <select 
                    value={order.customer_id}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      const c = customers.find(cust => cust.id === cid);
                      setSelectedCustomer(c);
                      setOrder(prev => ({ ...prev, customer_id: cid }));
                    }}
                    className="w-full bg-slate-900/50 border border-white/10 p-3 rounded-xl outline-none text-white"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <AnimatePresence>
                  {selectedCustomer && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl"
                    >
                      <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                        <User size={14} className="text-blue-400" /> {selectedCustomer.name}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2"><MapPin size={12}/> {selectedCustomer.address}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>

            <Card title="Finance Sync" icon={<Wallet size={18} className="text-emerald-400" />}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Sales Channel</label>
                  <select 
                    value={finance.source_name}
                    onChange={(e) => setFinance({...finance, source_name: e.target.value})}
                    className="w-full bg-slate-900/50 border border-white/10 p-3 rounded-xl outline-none"
                  >
                    <option value="whatsapp">Whatsapp</option>
                    <option value="daraz">Daraz</option>
                    <option value="website">Website</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FinanceInput label="Buyer Shipping" value={order.buyer_paid_shipping_fee} onChange={(v) => setOrder({...order, buyer_paid_shipping_fee: v})} />
                  <FinanceInput label="Our Shipping Cost" value={finance.shipping_fee} onChange={(v) => setFinance({...finance, shipping_fee: v})} />
                </div>

                {finance.source_name === 'daraz' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="grid grid-cols-2 gap-3 p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl overflow-hidden">
                    <FinanceInput label="Platform Fee" value={finance.platform_fee} onChange={(v) => setFinance({...finance, platform_fee: v})} />
                    <FinanceInput label="Commission" value={finance.commission} onChange={(v) => setFinance({...finance, commission: v})} />
                  </motion.div>
                )}

                <div className="mt-4 p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-2xl border border-emerald-500/20">
                   <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Calculated Profit</p>
                   <h2 className="text-3xl font-black text-white flex items-center gap-2">
                     Rs. {netProfit.toLocaleString()} <Sparkles size={20} className="text-emerald-500" />
                   </h2>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: CART ITEMS */}
          <div className="lg:col-span-8 space-y-4">
             <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                  <Package size={18} /> Cart ({items.length})
                </h3>
                <button 
                  onClick={() => setItems([...items, { sku: "", quantity: 1, price: 0, image: "" }])}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all text-xs font-bold"
                >
                  <Plus size={16} /> ADD ITEM
                </button>
             </div>

             <div className="space-y-4">
               <AnimatePresence mode="popLayout">
                {items.map((item, i) => (
                  <ItemRow 
                    key={i} 
                    item={item} 
                    products={products} 
                    onSkuSelect={handleSkuSelect}
                    onQtyChange={(idx, qty) => {
                      const updated = [...items];
                      updated[idx].quantity = Math.max(1, Number(qty));
                      setItems(updated);
                    }}
                    onRemove={(idx) => items.length > 1 && setItems(items.filter((_, i) => i !== idx))}
                    index={i}
                  />
                ))}
               </AnimatePresence>
             </div>

             {/* TOTAL SUMMARY */}
             <div className="bg-blue-600/10 p-8 rounded-[2.5rem] border border-blue-500/20 mt-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><ShoppingCart size={120} /></div>
                <div className="flex justify-between items-end relative z-10">
                  <div className="space-y-4">
                    <div className="flex gap-10">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Subtotal</p>
                        <p className="text-2xl font-bold text-white">Rs. {subtotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Items</p>
                        <p className="text-2xl font-bold text-white">{items.reduce((a, b) => a + b.quantity, 0)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">Grand Total</p>
                    <p className="text-5xl font-black text-white">
                      <span className="text-blue-500 text-2xl mr-2">Rs.</span>
                      {(subtotal + order.buyer_paid_shipping_fee).toLocaleString()}
                    </p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= CUSTOM UI COMPONENTS ================= */

const Card = ({ title, children, icon }) => (
  <section className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
    <div className="flex items-center gap-2 mb-6">
      {icon}
      <h3 className="font-bold text-white text-xs uppercase tracking-widest">{title}</h3>
    </div>
    {children}
  </section>
);

const ModernInput = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
    <input 
      {...props}
      className="w-full bg-slate-900/50 border border-white/10 p-3 rounded-xl focus:border-blue-500 outline-none transition-all text-white"
    />
  </div>
);

const FinanceInput = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">Rs.</span>
      <input 
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-black/40 border border-white/10 pl-9 pr-3 py-2.5 rounded-xl text-sm focus:border-emerald-500/50 outline-none transition-all text-white"
      />
    </div>
  </div>
);

const ItemRow = ({ item, index, products, onSkuSelect, onQtyChange, onRemove }) => {
  const imageUrl = item.sku && item.image ? `${API_BASE_URL}/images/products/${item.sku}/${item.image}` : null;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group grid grid-cols-12 gap-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 p-5 rounded-[2rem] items-center transition-all"
    >
      <div className="col-span-5 flex items-center gap-5">
        <div className="h-20 w-20 rounded-2xl bg-black border border-white/10 overflow-hidden flex-shrink-0 relative">
          {imageUrl ? (
            <img src={imageUrl} alt="sku" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-800"><Package size={32} /></div>
          )}
        </div>
        <div className="w-full">
           <p className="text-[10px] text-slate-500 uppercase mb-1">Select Product SKU</p>
           <select 
            className="w-full bg-transparent font-bold text-white text-lg outline-none cursor-pointer"
            value={item.sku}
            onChange={(e) => onSkuSelect(index, e.target.value)}
          >
            <option value="">Choose SKU...</option>
            {products.map(p => <option key={p.sku} value={p.sku} className="bg-[#050810]">{p.sku} - {p.product_name}</option>)}
          </select>
        </div>
      </div>

      <div className="col-span-3">
        <p className="text-[10px] text-slate-500 uppercase mb-2 text-center">Quantity</p>
        <div className="flex items-center justify-center gap-4 bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
          <button onClick={() => onQtyChange(index, item.quantity - 1)} className="text-xl text-slate-500 hover:text-white transition-colors">-</button>
          <span className="font-black text-white min-w-[20px] text-center">{item.quantity}</span>
          <button onClick={() => onQtyChange(index, item.quantity + 1)} className="text-xl text-slate-500 hover:text-white transition-colors">+</button>
        </div>
      </div>

      <div className="col-span-3 text-right">
        <p className="text-[10px] text-slate-500 uppercase mb-1 tracking-widest">Row Total</p>
        <p className="text-2xl font-black text-white">Rs. {(item.price * item.quantity).toLocaleString()}</p>
      </div>

      <div className="col-span-1 flex justify-end">
        <button 
          onClick={() => onRemove(index)}
          className="p-3 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </motion.div>
  );
};