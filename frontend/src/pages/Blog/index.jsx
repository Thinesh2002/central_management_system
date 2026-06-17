import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../../config/api";
import { Link, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  Calendar, 
  Layers, 
  Eye,
  FileText
} from "lucide-react";

/* Image helper */
const getImageUrl = (image) =>
  image ? `${API_BASE_URL}/images/block/${image}` : null;

const BlockDashboard = () => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = () => {
    setLoading(true);
    API.get("/blog/view")
      .then((res) => setBlocks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to terminate this content block?")) {
      // API call logic here
      alert("Delete protocol initiated for ID: " + id);
    }
  };

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in duration-700 p-2 md:p-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">
            Content <span className="text-blue-500 font-bold not-italic">Blocks</span>
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
            Media Assets & Article Management
          </p>
        </div>

        <Link
          to="/add-blog"
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-95"
        >
          <Plus size={16} /> New Entry
        </Link>
      </div>

      {/* DASHBOARD STATS (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-[#111827]/40 border border-white/5 p-6 rounded-[2rem] flex items-center gap-4">
            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><FileText size={20}/></div>
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Blocks</p>
               <h3 className="text-2xl font-black text-white">{blocks.length}</h3>
            </div>
         </div>
         {/* More stats can be added here */}
      </div>

      {/* CONTENT GRID */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
           <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
           <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Syncing Content Matrix...</p>
        </div>
      ) : blocks.length === 0 ? (
        <div className="bg-[#111827]/40 border border-white/5 rounded-[2rem] p-20 text-center">
           <p className="text-slate-500 italic">No content blocks found in the current instance.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((item) => (
            <div
              key={item.id}
              className="group bg-[#111827]/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-500 shadow-2xl flex flex-col"
            >
              {/* Image Preview Area */}
              <div className="h-52 relative overflow-hidden bg-black/40">
                {item.banner_image ? (
                  <img
                    src={getImageUrl(item.banner_image)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-900/20">
                    <ImageIcon size={32} />
                    <span className="text-[9px] font-black uppercase tracking-widest mt-2">No Visual Asset</span>
                  </div>
                )}
                
                {/* Status Badge Over Image */}
                <div className="absolute top-4 right-4">
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter backdrop-blur-md border ${
                      item.status === "published"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                   }`}>
                     {item.status}
                   </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-8 space-y-4 flex-1 flex flex-col">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      <Layers size={12} /> {item.category || "General"}
                   </div>
                   <h2 className="text-xl font-black text-white tracking-tighter line-clamp-1 group-hover:text-blue-400 transition-colors">
                     {item.title}
                   </h2>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 italic">
                  {item.short_description || "No description provided for this node."}
                </p>

                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600">
                   <div className="flex items-center gap-1.5 uppercase tracking-widest">
                      <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                   </div>
                </div>

                {/* Actions: Modern Button Style */}
                <div className="flex gap-3 pt-6 mt-auto border-t border-white/5">
                  <button
                    onClick={() => navigate(`/edit-blog/${item.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Edit3 size={14} /> Edit
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-4 py-3 bg-white/5 hover:bg-red-500/20 text-slate-600 hover:text-red-400 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockDashboard;