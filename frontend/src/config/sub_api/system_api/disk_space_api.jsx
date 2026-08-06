import api from "../../api";

export const diskSpaceApi = {
  getDiskSpace: () => api.get("/system/disk-space"),
};

export default diskSpaceApi;
