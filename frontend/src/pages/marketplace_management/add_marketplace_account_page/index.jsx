import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Store,
  KeyRound,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Globe2,
  Eye,
  EyeOff,
} from "lucide-react";

import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";

const initialForm = {
  platform_code: "DARAZ",
  account_uid: "",
  account_name: "",
  account_code: "",
  country_code: "LK",
  seller_id: "",
  seller_email: "",
  store_url: "",
  api_base_url: "https://api.daraz.lk/rest",
  is_sandbox: false,

  app_key: "",
  app_secret: "",
  access_token: "",
  refresh_token: "",
  access_token_expires_at: "",
  refresh_token_expires_at: "",

  consumer_key: "",
  consumer_secret: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#070B14] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-yellow-400/70 focus:ring-2 focus:ring-yellow-400/10";

function normalizePlatform(value) {
  const text = String(value || "").trim().toUpperCase();

  if (text === "WOO" || text === "WOOCOMMERCE") {
    return "WOO";
  }

  return "DARAZ";
}

function makeAccountUid(platform, country, accountCode) {
  const cleanPlatform = normalizePlatform(platform);
  const cleanCountry = String(country || "LK").trim().toUpperCase();
  const cleanCode = String(accountCode || "001")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  return `${cleanPlatform}_${cleanCountry}_${cleanCode}`;
}

export default function AddMarketplaceAccountPage() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showConsumerSecret, setShowConsumerSecret] = useState(false);

  const navigate = useNavigate();

  const platform = normalizePlatform(form.platform_code);
  const isDaraz = platform === "DARAZ";
  const isWoo = platform === "WOO";

  const generatedUidPreview = useMemo(() => {
    return makeAccountUid(platform, form.country_code, form.account_code);
  }, [platform, form.country_code, form.account_code]);

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handlePlatformChange(value) {
    const nextPlatform = normalizePlatform(value);

    setForm((prev) => ({
      ...prev,
      platform_code: nextPlatform,
      account_uid: "",
      api_base_url:
        nextPlatform === "DARAZ" ? "https://api.daraz.lk/rest" : "",
      store_url: nextPlatform === "WOO" ? prev.store_url : "",
      seller_id: nextPlatform === "DARAZ" ? prev.seller_id : "",
      seller_email: nextPlatform === "DARAZ" ? prev.seller_email : "",
      app_key: nextPlatform === "DARAZ" ? prev.app_key : "",
      app_secret: nextPlatform === "DARAZ" ? prev.app_secret : "",
      access_token: nextPlatform === "DARAZ" ? prev.access_token : "",
      refresh_token: nextPlatform === "DARAZ" ? prev.refresh_token : "",
      access_token_expires_at:
        nextPlatform === "DARAZ" ? prev.access_token_expires_at : "",
      refresh_token_expires_at:
        nextPlatform === "DARAZ" ? prev.refresh_token_expires_at : "",
      consumer_key: nextPlatform === "WOO" ? prev.consumer_key : "",
      consumer_secret: nextPlatform === "WOO" ? prev.consumer_secret : "",
    }));
  }

  function getFinalAccountUid() {
    return form.account_uid.trim() || generatedUidPreview;
  }

  function validateForm() {
    if (!form.platform_code) return "Platform is required.";
    if (!form.account_name.trim()) return "Account name is required.";
    if (!form.account_code.trim()) return "Account code is required.";

    if (isDaraz) {
      if (!getFinalAccountUid()) return "Account UID is required.";
      if (!form.app_key.trim()) return "Daraz app key is required.";
      if (!form.app_secret.trim()) return "Daraz app secret is required.";
    }

    if (isWoo) {
      if (!form.store_url.trim()) return "WooCommerce store URL is required.";
      if (!form.consumer_key.trim()) {
        return "WooCommerce consumer key is required.";
      }
      if (!form.consumer_secret.trim()) {
        return "WooCommerce consumer secret is required.";
      }
    }

    return "";
  }

  function buildDarazPayload() {
    return {
      platform_code: "DARAZ",
      account_uid: getFinalAccountUid(),
      account_name: form.account_name.trim(),
      account_code: form.account_code.trim(),
      country_code: form.country_code.trim().toUpperCase() || "LK",
      seller_id: form.seller_id.trim() || null,
      seller_email: form.seller_email.trim() || null,
      store_url: form.store_url.trim() || null,
      api_base_url: form.api_base_url.trim() || "https://api.daraz.lk/rest",
      is_sandbox: form.is_sandbox ? 1 : 0,

      app_key: form.app_key.trim(),
      app_secret: form.app_secret.trim(),
      access_token: form.access_token.trim() || null,
      refresh_token: form.refresh_token.trim() || null,
      access_token_expires_at: form.access_token_expires_at || null,
      refresh_token_expires_at: form.refresh_token_expires_at || null,
    };
  }

  function buildWooPayload() {
    return {
      platform_code: "WOO",
      account_uid: getFinalAccountUid(),
      account_name: form.account_name.trim(),
      account_code: form.account_code.trim(),
      country_code: form.country_code.trim().toUpperCase() || "LK",
      store_url: form.store_url.trim(),
      is_sandbox: form.is_sandbox ? 1 : 0,

      consumer_key: form.consumer_key.trim(),
      consumer_secret: form.consumer_secret.trim(),
    };
  }

  async function handleTestWooConnection() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setTesting(true);
      setError("");
      setMessage("");

      await marketplaceApi.connectWooAccount(buildWooPayload());

      setMessage("WooCommerce connected successfully. Account saved.");
      navigate("/marketplace/accounts");
    } catch (err) {
      setError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          err?.message ||
          "WooCommerce connection failed. Please check API keys."
      );
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (isWoo) {
        await marketplaceApi.connectWooAccount(buildWooPayload());
      } else {
        await marketplaceApi.createAccount(buildDarazPayload());
      }

      navigate("/marketplace/accounts");
    } catch (err) {
      setError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to create marketplace account."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/marketplace/accounts"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-yellow-300"
          >
            <ArrowLeft size={16} />
            Back to marketplace accounts
          </Link>

          <h1 className="text-xl font-semibold text-white">
            Add Marketplace Account
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Connect Daraz seller account or WooCommerce store.
          </p>
        </div>

        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
          Credentials will be saved in account credentials table.
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300">
                <Store size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-white">Account Details</h2>
                <p className="text-xs text-slate-400">
                  Basic marketplace account information.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Platform">
                <select
                  value={platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="DARAZ">Daraz</option>
                  <option value="WOO">WooCommerce</option>
                </select>
              </Field>

              <Field label="Country Code">
                <input
                  value={form.country_code}
                  onChange={(e) =>
                    updateField("country_code", e.target.value.toUpperCase())
                  }
                  placeholder="LK"
                  className={inputClass}
                />
              </Field>

              <Field label="Account UID">
                <input
                  value={form.account_uid}
                  onChange={(e) =>
                    updateField("account_uid", e.target.value.toUpperCase())
                  }
                  placeholder={generatedUidPreview}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Empty ah vitta auto use aagum: {generatedUidPreview}
                </p>
              </Field>

              <Field label="Account Code">
                <input
                  value={form.account_code}
                  onChange={(e) =>
                    updateField("account_code", e.target.value.toUpperCase())
                  }
                  placeholder={isWoo ? "BH_WOO" : "DLK001"}
                  className={inputClass}
                />
              </Field>

              <Field label="Account Name" className="md:col-span-2">
                <input
                  value={form.account_name}
                  onChange={(e) => updateField("account_name", e.target.value)}
                  placeholder={
                    isWoo
                      ? "BrightHub WooCommerce"
                      : "Daraz LK Main Account"
                  }
                  className={inputClass}
                />
              </Field>

              {isDaraz && (
                <>
                  <Field label="Seller ID">
                    <input
                      value={form.seller_id}
                      onChange={(e) => updateField("seller_id", e.target.value)}
                      placeholder="Seller ID"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Seller Email">
                    <input
                      type="email"
                      value={form.seller_email}
                      onChange={(e) =>
                        updateField("seller_email", e.target.value)
                      }
                      placeholder="seller@example.com"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="API Base URL" className="md:col-span-2">
                    <input
                      value={form.api_base_url}
                      onChange={(e) =>
                        updateField("api_base_url", e.target.value)
                      }
                      placeholder="https://api.daraz.lk/rest"
                      className={inputClass}
                    />
                  </Field>
                </>
              )}

              {isWoo && (
                <Field label="WooCommerce Store URL" className="md:col-span-2">
                  <input
                    value={form.store_url}
                    onChange={(e) => updateField("store_url", e.target.value)}
                    placeholder="https://yourstore.com"
                    className={inputClass}
                  />
                </Field>
              )}

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#070B14] px-4 py-3 text-sm text-slate-300 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_sandbox}
                  onChange={(e) => updateField("is_sandbox", e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-yellow-400"
                />
                Sandbox / test account
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300">
                <KeyRound size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  {isDaraz ? "Daraz API Credentials" : "WooCommerce API Keys"}
                </h2>
                <p className="text-xs text-slate-400">
                  Secret values should not be shown after saving.
                </p>
              </div>
            </div>

            {isDaraz ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="App Key">
                  <input
                    value={form.app_key}
                    onChange={(e) => updateField("app_key", e.target.value)}
                    placeholder="Daraz app key"
                    className={inputClass}
                  />
                </Field>

                <Field label="App Secret">
                  <SecretInput
                    value={form.app_secret}
                    show={showAppSecret}
                    setShow={setShowAppSecret}
                    onChange={(value) => updateField("app_secret", value)}
                    placeholder="Daraz app secret"
                  />
                </Field>

                <Field label="Access Token" className="md:col-span-2">
                  <textarea
                    value={form.access_token}
                    onChange={(e) =>
                      updateField("access_token", e.target.value)
                    }
                    rows={3}
                    placeholder="Paste Daraz access token"
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <Field label="Refresh Token" className="md:col-span-2">
                  <textarea
                    value={form.refresh_token}
                    onChange={(e) =>
                      updateField("refresh_token", e.target.value)
                    }
                    rows={3}
                    placeholder="Paste Daraz refresh token"
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <Field label="Access Token Expires At">
                  <input
                    type="datetime-local"
                    value={form.access_token_expires_at}
                    onChange={(e) =>
                      updateField("access_token_expires_at", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Refresh Token Expires At">
                  <input
                    type="datetime-local"
                    value={form.refresh_token_expires_at}
                    onChange={(e) =>
                      updateField("refresh_token_expires_at", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Consumer Key">
                  <input
                    value={form.consumer_key}
                    onChange={(e) =>
                      updateField("consumer_key", e.target.value)
                    }
                    placeholder="ck_xxxxxxxxx"
                    className={inputClass}
                  />
                </Field>

                <Field label="Consumer Secret">
                  <SecretInput
                    value={form.consumer_secret}
                    show={showConsumerSecret}
                    setShow={setShowConsumerSecret}
                    onChange={(value) => updateField("consumer_secret", value)}
                    placeholder="cs_xxxxxxxxx"
                  />
                </Field>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ShieldCheck size={18} />
              </div>

              <div>
                <h3 className="font-semibold text-white">Save Account</h3>
                <p className="text-xs text-slate-400">
                  {isWoo
                    ? "Woo account will be tested before save."
                    : "Create Daraz account and save credentials."}
                </p>
              </div>
            </div>

            {isWoo && (
              <button
                type="button"
                onClick={handleTestWooConnection}
                disabled={testing || saving}
                className="mb-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 text-[12px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {testing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Test & Save Woo
              </button>
            )}

            <button
              type="submit"
              disabled={saving || testing}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 text-[12px] font-semibold text-slate-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Account
            </button>
          </section>

          <section className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
            <div className="flex gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-yellow-300"
              />

              <div>
                <h3 className="font-semibold text-yellow-200">
                  {isWoo ? "WooCommerce Note" : "Daraz Token Note"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-yellow-100/80">
                  {isWoo
                    ? "WooCommerce does not use refresh token. Store URL, consumer key and consumer secret are enough."
                    : "Daraz refresh token expiry needs seller reauthorization."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <Globe2 size={17} />
              <h3 className="font-semibold">Code Examples</h3>
            </div>

            <div className="space-y-2 text-sm text-slate-400">
              <CodeLine text="DARAZ_LK_001" />
              <CodeLine text="BH_WOO" />
              <CodeLine text="WOO_LK_001" />
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function SecretInput({ value, show, setShow, onChange, placeholder }) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pr-11`}
      />

      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-yellow-300"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

function CodeLine({ text }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#070B14] px-3 py-2 font-mono text-xs text-yellow-200">
      {text}
    </div>
  );
}