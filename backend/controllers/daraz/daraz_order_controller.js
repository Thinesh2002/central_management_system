const axios = require("axios");
const crypto = require("crypto");

// 🔐 Signature Generator - Daraz Algorithm Standard
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

exports.getOrders = async (req, res) => {
    try {
        const apiPath = "/orders/get";
        const itemsPath = "/order/items/get";
        const baseUrl = process.env.DARAZ_API_BASE;
        const accessToken = process.env.DARAZ_ACCESS_TOKEN;
        const appSecret = process.env.DARAZ_APP_SECRET;

        // 🛡️ Map to prevent Duplicate Orders
        let uniqueOrdersMap = new Map();
        let endDate = new Date();
        let windowCount = 0;
        const totalWindows = 8; // Approx last 2 months (8 x 7 days)

        // 1️⃣ WINDOW FETCHING LOOP (Handles all orders across time windows)
        while (windowCount < totalWindows) {
            let startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            let offset = 0;
            let hasMoreInWindow = true;

            while (hasMoreInWindow) {
                const params = {
                    app_key: process.env.DARAZ_APP_KEY,
                    access_token: accessToken,
                    timestamp: Date.now().toString(),
                    sign_method: "sha256",
                    update_after: startDate.toISOString(),
                    update_before: endDate.toISOString(),
                    limit: "100", // Max page size
                    offset: offset.toString()
                };

                params.sign = generateSignature(apiPath, params, appSecret);
                const response = await axios.get(`${baseUrl}${apiPath}`, { params });
                const orders = response.data?.data?.orders || [];

                if (orders.length === 0) break;

                // Only add to map if order_id is new (Duplicate Filter)
                orders.forEach(order => {
                    if (!uniqueOrdersMap.has(order.order_id)) {
                        uniqueOrdersMap.set(order.order_id, order);
                    }
                });

                // Pagination check
                if (orders.length < 100) hasMoreInWindow = false;
                else offset += 100;
            }

            endDate = startDate;
            windowCount++;
        }

        const allOrders = Array.from(uniqueOrdersMap.values());

        // 2️⃣ PARALLEL ENRICHMENT (Item Fetching & Quantity Merging)
        const enrichedOrders = await Promise.all(allOrders.map(async (order) => {
            try {
                const itemParams = {
                    app_key: process.env.DARAZ_APP_KEY,
                    access_token: accessToken,
                    order_id: order.order_id.toString(),
                    timestamp: Date.now().toString(),
                    sign_method: "sha256"
                };
                itemParams.sign = generateSignature(itemsPath, itemParams, appSecret);
                
                const iRes = await axios.get(`${baseUrl}${itemsPath}`, { params: itemParams });
                const rawItems = iRes.data?.data || [];

                // 🔥 GROUPING: Merge same SKU items into single object with 'quantity' property
                const groupedItems = [];
                rawItems.forEach(item => {
                    const existing = groupedItems.find(gi => gi.sku === item.sku);
                    if (existing) {
                        existing.quantity = (existing.quantity || 1) + 1;
                    } else {
                        groupedItems.push({ ...item, quantity: 1 });
                    }
                });

                return { 
                    ...order, 
                    main_image: groupedItems[0]?.product_main_image || null, 
                    item_list: groupedItems 
                };
            } catch (err) {
                return { ...order, item_list: [], main_image: null };
            }
        }));

        // 3️⃣ ANALYTICS & STATS GENERATION
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const stats = {
            totalOrders: enrichedOrders.length,
            totalSales: enrichedOrders
                .filter(o => new Date(o.created_at) >= last30Days)
                .reduce((sum, o) => sum + parseFloat(o.price || 0), 0),
            bestSellers: []
        };

        // Best Sellers calculation using quantity weight
        const productCounts = {};
        enrichedOrders.forEach(o => {
            o.item_list?.forEach(item => {
                productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
            });
        });

        stats.bestSellers = Object.entries(productCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // ✅ Return data in Frontend compatible format
        return res.json({
            message: "Success",
            data: {
                data: {
                    orders: enrichedOrders,
                    stats
                }
            }
        });

    } catch (error) {
        console.error("Daraz API Master Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

exports.getOrderItems = async (req, res) => {
    try {
        const { order_id } = req.params;
        if (!order_id) return res.status(400).json({ message: "order_id is required" });

        const apiPath = "/order/items/get";
        const baseUrl = process.env.DARAZ_API_BASE;
        const timestamp = Date.now().toString();

        const params = {
            app_key: process.env.DARAZ_APP_KEY,
            access_token: process.env.DARAZ_ACCESS_TOKEN,
            order_id: order_id,
            timestamp: timestamp,
            sign_method: "sha256"
        };

        params.sign = generateSignature(apiPath, params, process.env.DARAZ_APP_SECRET);
        const response = await axios.get(`${baseUrl}${apiPath}`, { params });

        const rawItems = response.data?.data || [];
        const groupedItems = [];
        rawItems.forEach(item => {
            const existing = groupedItems.find(gi => gi.sku === item.sku);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                groupedItems.push({ ...item, quantity: 1 });
            }
        });

        return res.json({ message: "Success", data: groupedItems });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};