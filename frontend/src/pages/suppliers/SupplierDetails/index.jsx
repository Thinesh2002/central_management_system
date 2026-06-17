export default function SupplierDetailsPopup({
  open,
  onClose,
  supplier,
}) {
  if (!open || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0d1726] border border-yellow-400/30 shadow-2xl shadow-yellow-400/20">
        <div className="sticky top-0 bg-[#0d1726] z-10 border-b border-white/10 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              Supplier Full Details
            </h2>

            <p className="text-slate-300 text-sm">
              Contact details, supplier details and bank account details
            </p>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 transition-all text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <h3 className="text-yellow-400 font-semibold mb-3">
              Supplier Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Info
                label="Supplier Name"
                value={supplier.supplier_name}
                highlight
              />

              <Info
                label="Contact Person"
                value={supplier.contact_person}
              />

              <Info
                label="Phone"
                value={supplier.phone}
              />

              <Info
                label="Email"
                value={supplier.email}
              />

              <Info
                label="Address"
                value={supplier.address}
              />

              <Info
                label="Status"
                value={supplier.status}
              />

              <Info
                label="Total SKUs"
                value={supplier.total_skus}
              />

              <Info
                label="Created At"
                value={supplier.created_at}
              />
            </div>
          </section>

          <section>
            <h3 className="text-yellow-400 font-semibold mb-3">
              Bank Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Info
                label="Bank Name"
                value={supplier.bank_name}
                highlight
              />

              <Info
                label="Bank Branch"
                value={supplier.bank_branch}
              />

              <Info
                label="Account Holder Name"
                value={supplier.account_holder_name}
              />

              <Info
                label="Account Number"
                value={supplier.account_number}
              />

              <Info
                label="SWIFT / Bank Code"
                value={supplier.swift_code}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  highlight,
}) {
  return (
    <div className="rounded-2xl bg-[#081221] border border-white/10 p-4 hover:border-yellow-400/40 transition-all">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 font-semibold break-words ${
          highlight ? "text-yellow-400" : "text-white"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}