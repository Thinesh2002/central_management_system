export const USER_KEY = "user";
export const TOKEN_KEY = "token";

// Emit Auth Change Event
function emitAuthChange() {
  try {
    window.dispatchEvent(new Event("auth_change"));
  } catch {}
}

// Get
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("getStoredUser error:", error);
    return null;
  }
}

//Set User
export function setStoredUser(user) {
  try {
    if (user === null || user === undefined) {
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    emitAuthChange();
  } catch (error) {
    console.error("setStoredUser error:", error);
  }
}

//Get Token
export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("getAuthToken error:", error);
    return null;
  }
}

//Set Token
export function setAuthToken(token) {
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
    emitAuthChange();
  } catch (error) {
    console.error("setAuthToken error:", error);
  }
}

/* ---------------------- CLEAR AUTH ---------------------- */
export function clearAuth() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    emitAuthChange();
  } catch (error) {
    console.error("clearAuth error:", error);
  }
}

/* ---------------------- STORE AUTH (LOGIN) ---------------------- */
export function storeAuth(user, token) {
  try {
    if (user === null || user === undefined)
      localStorage.removeItem(USER_KEY);
    else
      localStorage.setItem(USER_KEY, JSON.stringify(user));

    if (!token)
      localStorage.removeItem(TOKEN_KEY);
    else
      localStorage.setItem(TOKEN_KEY, token);

    emitAuthChange();
  } catch (error) {
    console.error("storeAuth error:", error);
  }
}

/* ---------------------- LOGOUT (NEW) ---------------------- */
export function logout() {
  clearAuth();
}

/* ---------------------- BACKWARD-COMPATIBILITY ALIASES ---------------------- */
export const getUser = getStoredUser;
export const getToken = getAuthToken;
export const setUser = setStoredUser;
export const setToken = setAuthToken;
