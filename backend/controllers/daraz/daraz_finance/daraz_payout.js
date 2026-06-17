const axios = require("axios");
const crypto = require("crypto");

const generateSignature = (apiPath, params, appSecret) => {
    const sortedKeys = Object.keys(params).sort();
    let signString = apiPath;
    for (let key of sortedKeys) {
        signString += key + params[key];
    }
    return crypto
        .createHmac("sha256", appSecret)
        .update(signString)
        .digest("hex")
        .toUpperCase();
};

exports.getStatementPayoutSummary = async (req, res) => {
    try {
        const baseUrl = process.env.DARAZ_API_BASE;
        const appSecret = process.env.DARAZ_APP_SECRET;
        const accessToken = process.env.DARAZ_ACCESS_TOKEN;

        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 5);
        const startDateStr = start.toISOString().split('T')[0];
        const endDateStr = end.toISOString().split('T')[0];

        const payoutPath = "/finance/payout/status/get";
        const payoutParams = {
            app_key: process.env.DARAZ_APP_KEY,
            access_token: accessToken,
            timestamp: Date.now().toString(),
            sign_method: "sha256",
            created_after: startDateStr
        };
        payoutParams.sign = generateSignature(payoutPath, payoutParams, appSecret);

        const transPath = "/finance/transaction/details/get";
        const transParams = {
            app_key: process.env.DARAZ_APP_KEY,
            access_token: accessToken,
            timestamp: (Date.now() + 100).toString(),
            sign_method: "sha256",
            start_time: startDateStr,
            end_time: endDateStr,
            limit: "500",
            offset: "0"
        };
        transParams.sign = generateSignature(transPath, transParams, appSecret);

        const [payoutRes, transRes] = await Promise.all([
            axios.get(`${baseUrl}${payoutPath}`, { params: payoutParams }),
            axios.get(`${baseUrl}${transPath}`, { params: transParams })
        ]);

        if (payoutRes.data.code !== "0") throw new Error(payoutRes.data.message);

        const statements = payoutRes.data?.data || [];
        let weeklyPayout = {};
        let totalSettled = 0;

        const statementDetails = statements.map(s => {
            const payout = parseFloat(String(s.payout || "0").replace(/[^\d.-]/g, "")) || 0;
            totalSettled += payout;
            const created = new Date(s.created_at);
            const weekKey = `${created.getFullYear()}-W${Math.ceil(created.getDate() / 7)}`;
            weeklyPayout[weekKey] = (weeklyPayout[weekKey] || 0) + payout;
            return {
                statementNumber: s.statement_number,
                createdAt: s.created_at,
                payout: payout.toFixed(2),
                paid: Number(s.paid || 0)
            };
        });

        const transactions = transRes.data?.data || [];
        let totalFees = 0;
        let totalRevenue = 0;

        const processedTrans = transactions.map(t => {
            const amt = parseFloat(t.amount || 0);
            if (amt > 0) totalRevenue += amt;
            else totalFees += Math.abs(amt);
            return {
                orderNo: t.order_no,
                type: t.transaction_type,
                amount: amt,
                date: t.transaction_date,
                sku: t.seller_sku || "N/A",
                image: t.lazada_sku_image || null 
            };
        });

        return res.json({
            success: true,
            data: {
                summary: {
                    totalSettled: parseFloat(totalSettled.toFixed(2)),
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    totalFees: parseFloat(totalFees.toFixed(2)),
                    netLiveBalance: parseFloat((totalRevenue - totalFees).toFixed(2))
                },
                weeklyPayout,
                statements: statementDetails,
                recentTransactions: processedTrans.slice(0, 50)
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.getOrderImage = async (req, res) => {
    try {
        const { order_id } = req.params;
        const apiPath = "/order/items/get";
        const baseUrl = process.env.DARAZ_API_BASE;
        const appSecret = process.env.DARAZ_APP_SECRET;

        const params = {
            app_key: process.env.DARAZ_APP_KEY,
            access_token: process.env.DARAZ_ACCESS_TOKEN,
            timestamp: Date.now().toString(),
            sign_method: "sha256",
            order_id: order_id.toString()
        };

        const sortedKeys = Object.keys(params).sort();
        let signString = apiPath;
        for (let key of sortedKeys) { signString += key + params[key]; }
        
        params.sign = crypto.createHmac("sha256", appSecret)
            .update(signString).digest("hex").toUpperCase();

        const response = await axios.get(`${baseUrl}${apiPath}`, { params });
        const items = response.data?.data || [];
        
        // Modal-kku mukhkiyamaana image URL-ah mattum anuppuvom
        return res.json({ 
            success: true, 
            image: items[0]?.product_main_image || null 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};