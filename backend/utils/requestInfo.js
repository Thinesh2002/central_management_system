function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    ""
  );
}

function getUserAgent(req) {
  return String(req.headers["user-agent"] || "").slice(0, 500);
}

function requestInfo(req) {
  return {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  };
}

module.exports = { getClientIp, getUserAgent, requestInfo };
