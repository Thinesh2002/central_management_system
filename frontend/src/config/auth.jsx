const TOKEN_KEY = "cm_token";
const USER_KEY = "cm_user";
const MENU_KEY = "cm_menu";

export function saveAuth(token, user, menu = []) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(MENU_KEY, JSON.stringify(menu || []));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function getStoredMenu() {
  try {
    return JSON.parse(localStorage.getItem(MENU_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveMenu(menu = []) {
  localStorage.setItem(MENU_KEY, JSON.stringify(menu || []));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(MENU_KEY);
  window.location.href = "/login";
}

export function isLoggedIn() {
  return Boolean(getToken());
}
