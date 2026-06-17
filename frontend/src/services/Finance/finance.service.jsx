import API from "../../config/api";

// Finance Incomes
export const getIncomes = () => API.get("/finance/View-income");

export const getIncome = (id) =>
  API.get(`/finance/View-income/${id}`);

export const addIncome = (data) =>
  API.post("/finance/add-income", data);

export const updateIncome = (id, data) =>
  API.put(`/finance/incomes/${id}`, data);

export const deleteIncome = (id) =>
  API.delete(`/finance/incomes/${id}`);
