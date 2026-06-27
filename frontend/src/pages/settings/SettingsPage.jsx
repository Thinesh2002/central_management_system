import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, FileText, RefreshCw, Search, Settings, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'cms_page_settings';

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => ({
    compactTables: true,
    autoRefreshDashboard: true,
    showNotifications: true,
    showHeaderSearch: true,
    ...readSettings(),
  }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1200);
    return () => window.clearTimeout(timer);
  }, [settings]);

  function toggle(key) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="page-shell">
      <div className="page-header-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Page settings, logs shortcuts and dashboard display options.</p>
        </div>
        {saved && <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Saved</span>}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Link to="/logs" className="erp-card block transition hover:border-yellow-300/40">
          <div className="flex items-center gap-3">
            <FileText className="text-yellow-200" size={18} />
            <div>
              <p className="text-sm font-bold text-slate-100">System Logs</p>
              <p className="mt-1 text-xs text-slate-500">Open API/user/system log page.</p>
            </div>
          </div>
        </Link>
        <Link to="/daraz-products/logs" className="erp-card block transition hover:border-yellow-300/40">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-yellow-200" size={18} />
            <div>
              <p className="text-sm font-bold text-slate-100">Sync Logs</p>
              <p className="mt-1 text-xs text-slate-500">Daraz/Woo sync success and failed logs.</p>
            </div>
          </div>
        </Link>
        <Link to="/access-control" className="erp-card block transition hover:border-yellow-300/40">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-yellow-200" size={18} />
            <div>
              <p className="text-sm font-bold text-slate-100">Page Access</p>
              <p className="mt-1 text-xs text-slate-500">Update page permission settings.</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="erp-card">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="text-yellow-200" size={18} />
          <h2 className="text-sm font-bold text-slate-100">Page Settings</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SettingToggle icon={Search} title="Header SKU Search" text="Show quick SKU search in header and open SKU report." checked={settings.showHeaderSearch} onClick={() => toggle('showHeaderSearch')} />
          <SettingToggle icon={Bell} title="Dashboard Notifications" text="Show Daraz/Woo new order notifications in dashboard." checked={settings.showNotifications} onClick={() => toggle('showNotifications')} />
          <SettingToggle icon={RefreshCw} title="Dashboard Auto Refresh" text="Prepare dashboard pages for future auto refresh." checked={settings.autoRefreshDashboard} onClick={() => toggle('autoRefreshDashboard')} />
          <SettingToggle icon={FileText} title="Compact Tables" text="Keep tables smaller and user-friendly." checked={settings.compactTables} onClick={() => toggle('compactTables')} />
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ icon: Icon, title, text, checked, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-yellow-300/30">
      <div className="flex gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-yellow-200"><Icon size={16} /></div>
        <div>
          <p className="text-sm font-bold text-slate-100">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{text}</p>
        </div>
      </div>
      <span className={`mt-1 h-5 w-9 rounded-full border p-0.5 transition ${checked ? 'border-emerald-300/30 bg-emerald-400/20' : 'border-slate-700 bg-slate-900'}`}>
        <span className={`block h-3.5 w-3.5 rounded-full transition ${checked ? 'translate-x-4 bg-emerald-300' : 'bg-slate-500'}`} />
      </span>
    </button>
  );
}
