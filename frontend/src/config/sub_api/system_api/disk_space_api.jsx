import api from "../../api";

export const diskSpaceApi = {
  getDiskSpace: () => api.get("/system/disk-space"),
  cleanBinlogs: (keepDays) => api.post("/system/disk-space/clean-binlogs", { keep_days: keepDays }),
};

export default diskSpaceApi;
