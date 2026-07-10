import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Mail, MapPin, Phone, User } from "lucide-react";

import customersApi from "../../../../config/sub_api/order_management_api/customers_api";
import Loader from "../../../../components/common/Loader";

function getApiMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusClass(status) {
  if (status === "ACTIVE") return "border-emerald-900 bg-emerald-950 text-emerald-300";
  if (status === "BLOCKED") return "border-red-900 bg-red-950 text-red-300";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

function AddressBlock({ title, fullName, phone, line1, line2, city, district, province, postalCode, country }) {
  const hasAny = fullName || line1 || city;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {hasAny ? (
        <div className="space-y-0.5 text-[13px] text-slate-300">
          {fullName && <p className="font-medium text-slate-200">{fullName}</p>}
          {phone && <p className="text-slate-400">{phone}</p>}
          {line1 && <p>{line1}</p>}
          {line2 && <p>{line2}</p>}
          <p className="text-slate-400">
            {[city, district, province, postalCode].filter(Boolean).join(", ")}
          </p>
          {country && <p className="text-slate-400">{country}</p>}
        </div>
      ) : (
        <p className="text-[13px] text-slate-500">Not provided.</p>
      )}
    </div>
  );
}

export default function CustomerViewPage() {
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await customersApi.getById(id);
        if (!cancelled) setCustomer(res?.data?.data || res?.data || null);
      } catch (err) {
        if (!cancelled) setError(getApiMessage(err, "Failed to load customer."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const orders = Array.isArray(customer?.orders) ? customer.orders : [];

  return (
    <div className="space-y-3">
      {loading ? (
        <Loader label="Loading customer..." minHeight="240px" />
      ) : error ? (
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      ) : !customer ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
          Customer not found.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-medium text-slate-100">
                  <User size={18} />
                  {customer.customer_name}
                </h1>
                <p className="mt-1 text-[12px] text-slate-500">
                  {customer.customer_code ? `${customer.customer_code} · ` : ""}
                  Joined {formatDate(customer.created_at)}
                  {customer.source_type ? ` · via ${customer.source_type}` : ""}
                  {customer.source_account_name ? ` (${customer.source_account_name})` : ""}
                </p>
              </div>

              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                  customer.status
                )}`}
              >
                {customer.status || "-"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-[11px] uppercase text-slate-500">Total Orders</p>
                <p className="text-lg font-bold text-slate-100">{customer.total_orders ?? 0}</p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-[11px] uppercase text-slate-500">Total Spent</p>
                <p className="text-lg font-bold text-orange-300">{money(customer.total_spent)}</p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-[11px] uppercase text-slate-500">Last Order</p>
                <p className="text-lg font-bold text-slate-100">{formatDate(customer.last_order_at)}</p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <Phone size={15} className="text-orange-300" />
                <span className="text-[13px] text-slate-300">
                  {customer.phone || "-"}
                  {customer.phone_alt ? ` / ${customer.phone_alt}` : ""}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-3">
              <Mail size={15} className="text-orange-300" />
              <span className="text-[13px] text-slate-300">{customer.email || "-"}</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AddressBlock
                title="Shipping Address"
                fullName={customer.shipping_full_name}
                phone={customer.shipping_phone}
                line1={customer.shipping_address_line1}
                line2={customer.shipping_address_line2}
                city={customer.shipping_city}
                district={customer.shipping_district}
                province={customer.shipping_province}
                postalCode={customer.shipping_postal_code}
                country={customer.shipping_country}
              />
              <AddressBlock
                title="Billing Address"
                fullName={customer.billing_full_name}
                phone={customer.billing_phone}
                line1={customer.billing_address_line1}
                line2={customer.billing_address_line2}
                city={customer.billing_city}
                district={customer.billing_district}
                province={customer.billing_province}
                postalCode={customer.billing_postal_code}
                country={customer.billing_country}
              />
            </div>

            {(customer.customer_note || customer.internal_note) && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {customer.customer_note && (
                  <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <MapPin size={12} /> Customer Note
                    </p>
                    <p className="text-[13px] text-slate-300">{customer.customer_note}</p>
                  </div>
                )}
                {customer.internal_note && (
                  <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Internal Note
                    </p>
                    <p className="text-[13px] text-slate-300">{customer.internal_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-medium text-slate-100">Order History ({orders.length})</h2>
              <p className="text-[12px] text-slate-500">
                All orders placed by this customer, across local, Daraz and WooCommerce.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900">
                  <tr>
                    {["Order No", "Platform", "Account", "Date", "Status", "Total"].map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2 text-left text-xs font-normal uppercase tracking-wide text-slate-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {!orders.length && (
                    <tr>
                      <td colSpan="6" className="px-3 py-5 text-center text-[13px] text-slate-500">
                        No orders found for this customer.
                      </td>
                    </tr>
                  )}

                  {orders.map((order) => (
                    <tr key={`${order.platform}-${order.id}`} className="bg-slate-950">
                      <td className="px-3 py-2 text-[13px] text-slate-200">{order.order_no || order.id}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-400">{order.platform}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-400">{order.account_name || "-"}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-400">{formatDate(order.order_date)}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-400">{order.order_status || "-"}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-200">{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
