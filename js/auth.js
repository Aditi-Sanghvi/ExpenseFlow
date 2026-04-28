(() => {
  const readUsers = () => {
    try {
      return JSON.parse(localStorage.getItem("ExpenseFlow:users") || "{}") || {};
    } catch {
      return {};
    }
  };

  const writeUsers = (users) => {
    localStorage.setItem("ExpenseFlow:users", JSON.stringify(users));
  };

  const setSession = (email) => {
    localStorage.setItem("ExpenseFlow:session", JSON.stringify({ email }));
  };

  const clearSession = () => {
    localStorage.removeItem("ExpenseFlow:session");
  };

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem("ExpenseFlow:session") || "null");
    } catch {
      return null;
    }
  };

  const simpleHash = (str) => {

    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h.toString(16);
  };

  const requireAuth = () => {
    const session = getSession();
    if (!session || !session.email) {
      window.location.href = "login.html";
      return null;
    }
    return session;
  };

  window.ExpenseFlowAuth = {
    readUsers,
    writeUsers,
    setSession,
    clearSession,
    getSession,
    simpleHash,
    requireAuth,
  };
})();

