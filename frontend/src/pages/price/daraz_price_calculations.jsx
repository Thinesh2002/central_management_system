import { useState, useMemo } from "react";
import { Calculator, ShoppingBag, Package, TrendingUp, Info } from "lucide-react";

export default function DarazDarkDashboard() {
  const [cost, setCost] = useState("");

  const FEES = {
    DARAZ_FEE: 20,
    PACKAGING: 3,
    RETURN: 3,
    ADS: 3,
    HANDLING: 2,
    TARGET_PROFIT: 20,
  };

  const calculation = useMemo(() => {
    const productCost = parseFloat(cost);
    if (!productCost || productCost <= 0) return null;

    const totalExpensePercent =
      FEES.DARAZ_FEE + FEES.PACKAGING + FEES.RETURN + FEES.ADS + FEES.HANDLING;

    const usablePercent = 100 - (totalExpensePercent + FEES.TARGET_PROFIT);
    const sellingPrice = productCost / (usablePercent / 100);

    const expensesAmount = (sellingPrice * totalExpensePercent) / 100;
    const profitAmount = (sellingPrice * FEES.TARGET_PROFIT) / 100;

    return {
      sellingPrice: sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      expensesAmount: expensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      profitAmount: profitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      darazCut: ((sellingPrice * FEES.DARAZ_FEE) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    };
  }, [cost]);

  return (
    <div className=" text-gray-200 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-[#1f1f1f] rounded-lg">
                <Calculator size={28} />
              </div>
              Daraz Seller Pro
            </h1>
            <p className="text-gray-400 mt-2">
              Calculate your business margins accurately.
            </p>
          </div>
          <div className="hidden md:block px-4 py-2  border border-gray-700 rounded-full text-xs font-medium text-gray-300">
            Status: Optimizer Active
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Input Section - Left */}
          <div className="lg:col-span-4 space-y-6">
            <div className=" p-6 rounded-2xl border border-gray-800 shadow-xl">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Product Cost Price
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full px-4 py-4 ] border border-gray-700 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none transition-all text-white text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>
              
              <div className="mt-8 space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Fixed Rates
                </h4>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Daraz Fee</span>
                  <span className="text-sm font-mono text-white">{FEES.DARAZ_FEE}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Target Profit</span>
                  <span className="text-sm font-mono text-green-400">{FEES.TARGET_PROFIT}%</span>
                </div>
              </div>
            </div>

            <div className=" p-4 rounded-xl border border-gray-800 flex gap-3">
              <Info className="text-gray-400 shrink-0" size={20} />
              <p className="text-xs text-gray-400 leading-relaxed">
                This calculation automatically includes packaging (3%), advertising (3%), and handling (2%) fees.
              </p>
            </div>
          </div>

          {/* Output Section - Right */}
          <div className="lg:col-span-8">
            {!calculation ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-800 p-8 text-center">
                <div className="w-16 h-16  rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="text-gray-500" size={30} />
                </div>
                <h3 className="text-gray-400 font-medium">No Data Available</h3>
                <p className="text-gray-500 text-sm max-w-[200px] mt-1">
                  Enter the product cost to analyze the selling price.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Selling Price Card */}
                <div className="md:col-span-2  p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden border border-gray-800">
                  <div className="relative z-10">
                    <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">
                      Recommended Selling Price
                    </p>
                    <h3 className="text-5xl font-black mt-2 tracking-tight">
                      {calculation.sellingPrice}
                    </h3>
                    <div className="mt-6 flex items-center gap-2 text-gray-300  w-fit px-3 py-1 rounded-full text-xs">
                      <TrendingUp size={14} /> Optimized for {FEES.TARGET_PROFIT}% Profit
                    </div>
                  </div>
                  <Package className="absolute -right-4 -bottom-4 opacity-10 rotate-12" size={160} />
                </div>

                {/* Profit Card */}
                <div className=" p-6 rounded-2xl border border-gray-800 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold uppercase mb-2">
                    Net Profit Amount
                  </p>
                  <h3 className="text-3xl font-bold text-green-400">
                    {calculation.profitAmount}
                  </h3>
                  <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[20%]"></div>
                  </div>
                </div>

                {/* Expenses Card */}
                <div className=" p-6 rounded-2xl border border-gray-800 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold uppercase mb-2">
                    Total Platform Fees
                  </p>
                  <h3 className="text-3xl font-bold text-red-400">
                    {calculation.expensesAmount}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    Includes Daraz fee: {calculation.darazCut}
                  </p>
                </div>

                {/* Mini Stats Breakdown */}
                <div className="md:col-span-2 grid grid-cols-3 gap-3">
                  {["Packaging", "Ads", "Return"].map((item) => (
                    <div
                      key={item}
                      className=" p-3 rounded-xl border border-gray-800 text-center"
                    >
                      <p className="text-[10px] text-gray-500 uppercase">{item}</p>
                      <p className="text-sm font-semibold text-gray-300">3%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

    
      </div>
    </div>
  );
}