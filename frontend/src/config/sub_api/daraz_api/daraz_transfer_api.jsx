import api from "../../../config/api";

const LONG_TIMEOUT = 300000;

export const darazTransferApi = {
  transfer: (payload = {}) =>
    api.post("/daraz/transfer", payload, { timeout: LONG_TIMEOUT }),

  aiFill: (payload = {}) =>
    api.post("/daraz/transfer/ai-fill", payload, { timeout: LONG_TIMEOUT }),
};

export default darazTransferApi;
