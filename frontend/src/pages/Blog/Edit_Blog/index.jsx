import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { API_BASE_URL } from "../../../config/api";
import RichTextEditor from "../../compnents/Editor/editor";
import { 
  Save, 
  ArrowLeft, 
  Image as ImageIcon, 
  Type, 
  Link as LinkIcon, 
  AlignLeft, 
  Layers,
  RefreshCw,
  UploadCloud
} from "lucide-react";

const EditBlogPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentHTML, setContentHTML] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    short_description: "",
    category: "",
    banner_image: "",
    sub_image_1: "",
    sub_image_2: "",
  });

  const [files, setFiles] = useState({
    banner: null,
    sub1: null,
    sub2: null,
  });

  const getImageUrl = (image) =>
    image ? `${API_BASE_URL}/images/block/${image}` : null;

  useEffect(() => {
    API.get(`/blog/edit/${id}`)
      .then((res) => {
        setForm(res.data);
        setContentHTML(res.data.content || "");
        setLoading(false);
      })
      .catch(() => alert("Failed to load content block"));
  }, [id]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) =>
    setFiles({ ...files, [e.target.name]: e.target.files[0] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("slug", form.slug);
    fd.append("short_description", form.short_description);
    fd.append("content", contentHTML);
    fd.append("category", form.category);

    fd.append("old_banner", form.banner_image);
    fd.append("old_sub1", form.sub_image_1);
    fd.append("old_sub2", form.sub_image_2);

    if (files.banner) fd.append("banner", files.banner);
    if (files.sub1) fd.append("sub1", files.sub1);
    if (files.sub2) fd.append("sub2", files.sub2);

    try {
      await API.put(`/blog/edit/${id}`, fd);
      navigate("/blog");
    } catch {
      alert("Operational failure: Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="text-blue-50 animate-spin" size={40} />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Syncing Content Data...</p>
      </div>
    );
  }

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
              Edit <span className="text-blue-500 font-bold not-italic">Content Block</span>
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Instance ID: {id}</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
          Commit Updates
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: CONTENT CORE */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Metadata Section */}
          <BentoBox title="Identity & Metadata" icon={<Type />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Article Title" icon={<Type />}>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter catchphrase title..."
                  className="input-field"
                />
              </InputGroup>

              <InputGroup label="URL Slug" icon={<LinkIcon />}>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="url-friendly-slug"
                  className="input-field font-mono text-blue-400"
                />
              </InputGroup>

              <div className="md:col-span-2">
                <InputGroup label="SEO Snippet (Short Description)" icon={<AlignLeft />}>
                  <textarea
                    name="short_description"
                    value={form.short_description}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Brief summary for search results..."
                    className="input-field resize-none"
                  />
                </InputGroup>
              </div>
            </div>
          </BentoBox>

          {/* Editor Section */}
          <BentoBox title="Rich Text Narrative" icon={<AlignLeft />}>
            <div className="bg-[#020617] rounded-2xl border border-white/5 overflow-hidden min-h-[400px]">
              <RichTextEditor
                initialValue={contentHTML}
                onChange={setContentHTML}
              />
            </div>
          </BentoBox>
        </div>

        {/* RIGHT: MEDIA & SETTINGS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Banner Section */}
          <BentoBox title="Featured Asset" icon={<ImageIcon />}>
            <div className="space-y-4">
              <div className="relative group rounded-2xl overflow-hidden bg-black/40 border border-white/5 aspect-video">
                {form.banner_image || files.banner ? (
                  <img
                    src={files.banner ? URL.createObjectURL(files.banner) : getImageUrl(form.banner_image)}
                    alt="Banner Preview"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                    <ImageIcon size={32} />
                    <p className="text-[10px] font-black uppercase mt-2">No Asset Found</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">Update Banner</p>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  name="banner"
                  onChange={handleFileChange}
                  className="hidden"
                  id="banner-upload"
                />
                <label 
                  htmlFor="banner-upload"
                  className="flex items-center justify-center gap-2 w-full p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-blue-900/10"
                >
                  <UploadCloud size={14} /> Upload New Asset
                </label>
              </div>
            </div>
          </BentoBox>

          {/* Categorization */}
          <BentoBox title="Classification" icon={<Layers />}>
            <InputGroup label="Category Domain" icon={<Layers />}>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. Technology, Updates..."
                className="input-field"
              />
            </InputGroup>
          </BentoBox>

          {/* Save Status Bento */}
          <div className="bg-gradient-to-br from-slate-900 to-[#020617] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
             <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] text-slate-500 font-bold uppercase">Node Status</span>
               <span className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter animate-pulse">Synced</span>
             </div>
             <p className="text-[9px] text-slate-600 leading-relaxed font-medium">
               Last automated backup was performed successfully. System is ready for commit.
             </p>
          </div>
        </div>
      </div>

      {/* Tailwind Custom Layer for Inputs */}
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
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
};

/* --- SUB-COMPONENTS --- */

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

export default EditBlogPage;