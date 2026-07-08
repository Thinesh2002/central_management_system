import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone, User } from "lucide-react";

import customersApi from "../../../../config/sub_api/order_management_api/customers_api";
import Loader from "../../../../components/common/Loader";

const FIELD = {
  name: ["name", "customer_name", "full_name", "first_name"],
  phone: ["phone", "phone_number", "mobile", "mobile_number", "contact_number"],
  email: ["email", "email_address"],
  address: ["address", "address_line1", "shipping_address", "billing_address"],
  city: ["city", "town"],
};

function readValue(obj, keys, fallback = "-") {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

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

export default function CustomerViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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
      <button
        type="button"
        onClick={() => navigate("/order-management/customers")}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-orange-300"
      >
        <ArrowLeft size={16} />
        Back to Customers
      </button>

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
            <h1 className="flex items-center gap-2 text-lg font-medium text-slate-100">
              <User size={18} />
              {readValue(customer, FIELD.name)}
            </h1>
            <p className="mt-1 text-[12px] text-slate-500">Joined {formatDate(customer.created_at)}</p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <Phone size={15} className="text-orange-300" />
                <span className="text-[13px] text-slate-300">{readValue(customer, FIELD.phone)}</span>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <Mail size={15} className="text-orange-300" />
                <span className="text-[13px] text-slate-300">{readValue(customer, FIELD.email)}</span>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <MapPin size={15} className="text-orange-300" />
                <span className="text-[13px] text-slate-300">
                  {readValue(customer, FIELD.address)}
                  {readValue(customer, FIELD.city, "") ? `, ${readValue(customer, FIELD.city)}` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-medium text-slate-100">Order History ({orders.length})</h2>
              <p className="text-[12px] text-slate-500">
                Local (manual) orders placed by this customer. Daraz/WooCommerce orders aren't linked
                to a customer record.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900">
                  <tr>
                    {["Order No", "Date", "Status", "Total"].map((header) => (
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
                      <td colSpan="4" className="px-3 py-5 text-center text-[13px] text-slate-500">
                        No local orders found for this customer.
                      </td>
                    </tr>
                  )}

                  {orders.map((order) => (
                    <tr key={order.id} className="bg-slate-950">
                      <td className="px-3 py-2 text-[13px] text-slate-200">{order.order_no || order.id}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-400">{formatDate(order.order_date)}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-400">{order.order_status || "-"}</td>
                      <td className="px-3 py-2 text-[13px] text-slate-200">
                        {money(order.total_amount ?? order.grand_total ?? order.total)}
                      </td>
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
