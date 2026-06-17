import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../config/api";
import RichTextEditor from "../../compnents/Editor/editor"; // ✅ Integrated Editor
import { 
  Plus, 
  Save, 
  Image as ImageIcon, 
  Type, 
  Link as LinkIcon, 
  AlignLeft, 
  Layers,
  ArrowLeft,
  UploadCloud,
  CheckCircle
} from "lucide-react";

const AddBlog = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    slug: "",
    short_description: "",
    content: "",
    category: "",
    status: "draft",
  });

  const [files, setFiles] = useState({
    banner: null,
    sub1: null,
    sub2: null,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditorChange = (html) => {
    setForm({ ...form, content: html });
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();

    Object.keys(form).forEach(key => data.append(key, form[key]));
    if (files.banner) data.append("banner", files.banner);
    if (files.sub1) data.append("sub1", files.sub1);
    if (files.sub2) data.append("sub2", files.sub2);

    try {
      setLoading(true);
      await API.post("/blog/add", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("System updated: New content block deployed.");
      navigate("/blog");
    } catch (error) {
      alert("Deployment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" mx-auto space-y-8 animate-in fade-in duration-700 p-2 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
          >
            <ArrowLeft className="text-slate-400 group-hover:text-blue-400" size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic">
              Create <span className="text-blue-500 font-bold not-italic">New Block</span>
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Content Deployment Protocol</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
        >
          {loading ? <CheckCircle className="animate-pulse" size={14} /> : <Plus size={14} />}
          Deploy Content
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: CONTENT CORE */}
        <div className="lg:col-span-8 space-y-6">
          <BentoBox title="Core Identity" icon={<Type />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Block Title" icon={<Type />}>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="The future of tech..."
                  className="input-field"
                />
              </InputGroup>

              <InputGroup label="URL Identifier (Slug)" icon={<LinkIcon />}>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  required
                  placeholder="future-tech-2026"
                  className="input-field font-mono text-blue-400"
                />
              </InputGroup>

              <div className="md:col-span-2">
                <InputGroup label="Abstract (Short Description)" icon={<AlignLeft />}>
                  <textarea
                    name="short_description"
                    value={form.short_description}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Brief summary for indexing..."
                    className="input-field resize-none"
                  />
                </InputGroup>
              </div>
            </div>
          </BentoBox>

          <BentoBox title="Narrative Content" icon={<AlignLeft />}>
            <div className="bg-[#020617] rounded-2xl border border-white/5 overflow-hidden">
              <RichTextEditor
                initialValue={form.content}
                onChange={handleEditorChange}
              />
            </div>
          </BentoBox>
        </div>

        {/* RIGHT: ASSETS & CONFIG */}
        <div className="lg:col-span-4 space-y-6">
          
          <BentoBox title="Primary Asset" icon={<ImageIcon />}>
            <div className="space-y-4">
              <div className="aspect-video bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center overflow-hidden relative group">
                {files.banner ? (
                  <img src={URL.createObjectURL(files.banner)} className="w-full h-full object-cover" alt="Banner" />
                ) : (
                  <div className="flex flex-col items-center text-slate-700">
                    <ImageIcon size={32} />
                    <span className="text-[9px] font-black uppercase mt-2 tracking-widest">No Asset Loaded</span>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <input type="file" name="banner" id="banner" className="hidden" onChange={handleFileChange} />
                <label htmlFor="banner" className="flex items-center justify-center gap-2 w-full p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
                  <UploadCloud size={14} /> Select Banner
                </label>
              </div>
            </div>
          </BentoBox>

          <BentoBox title="Configuration" icon={<Layers />}>
            <div className="space-y-6">
              <InputGroup label="Category Domain" icon={<Layers />}>
                <input name="category" value={form.category} onChange={handleChange} placeholder="Tech, News, etc." className="input-field" />
              </InputGroup>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-500 transition-colors">Deployment Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="w-full bg-[#020617] border border-white/5 px-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/40 text-sm">
                  <option value="draft">Draft (Offline)</option>
                  <option value="published">Published (Live)</option>
                </select>
              </div>
            </div>
          </BentoBox>

          <div className="bg-gradient-to-br from-slate-900 to-[#020617] border border-white/5 rounded-[2rem] p-8">
             <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Protocol Info</span>
               <span className="text-[10px] text-blue-500 font-black uppercase tracking-tighter">Ready</span>
             </div>
             <p className="text-[9px] text-slate-600 leading-relaxed font-bold italic">
               Validation complete. Content nodes are ready for matrix injection.
             </p>
          </div>
        </div>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          background-color: #020617;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1rem 1rem 1rem 3rem;
          border-radius: 1rem;
          color: #cbd5e1;
          outline: none;
          transition: all 0.3s;
          font-size: 0.875rem;
        }
        .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
      `}</style>
    </div>
  );
};

/* --- REUSABLE COMPONENTS --- */

const BentoBox = ({ title, icon, children }) => (
  <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl transition-all hover:border-white/10 group">
    <div className="flex items-center gap-2 mb-6 opacity-80 group-hover:opacity-100 transition-opacity">
      <span className="text-blue-500">{icon}</span>
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{title}</h3>
    </div>
    {children}
  </div>
);

const InputGroup = ({ label, icon, children }) => (
  <div className="space-y-2 group relative">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-500 transition-colors">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
        {icon}
      </span>
      {children}
    </div>
  </div>
);

export default AddBlog;