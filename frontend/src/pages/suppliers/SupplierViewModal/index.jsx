export default function SupplierViewModal({ open, onClose, supplier }) {
  if (!open || !supplier) return null;

  const openPhone = () => {
    if (!supplier.phone) return;
    window.open(`tel:${supplier.phone}`, "_blank");
  };

  const openEmail = () => {
    if (!supplier.email) return;
    window.open(`mailto:${supplier.email}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-[#101010] border border-orange-500/30 shadow-2xl shadow-orange-500/20 animate-[fadeIn_.25s_ease]">
        <div className="border-b border-white/10 p-5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {supplier.supplier_name}
            </h2>
            <p className="text-gray-400 text-sm">
              Full supplier profile and payment details
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="Contact Person" value={supplier.contact_person} />
          <Info label="Phone" value={supplier.phone} />
          <Info label="Email" value={supplier.email} />
          <Info label="Address" value={supplier.address} />
          <Info label="Bank Name" value={supplier.bank_name} />
          <Info label="Bank Branch" value={supplier.bank_branch} />
          <Info label="Account Holder" value={supplier.account_holder_name} />
          <Info label="Account Number" value={supplier.account_number} />
          <Info label="SWIFT / Bank Code" value={supplier.swift_code} />
          <Info label="Status" value={supplier.status} />
        </div>

        <div className="p-5 border-t border-white/10 flex flex-wrap justify-end gap-3">
          <button
            onClick={openPhone}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all"
          >
            Call Supplier
          </button>

          <button
            onClick={openEmail}
            className="px-5 py-3 rounded-2xl bg-orange-500 text-black font-semibold hover:shadow-lg hover:shadow-orange-500/40 transition-all"
          >
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#070707] border border-white/10 p-4 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-white break-words">
        {value || "-"}
      </p>
    </div>
  );
}