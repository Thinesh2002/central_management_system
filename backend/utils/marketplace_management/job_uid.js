function pad(num) {
  return String(num).padStart(2, "0");
}

function createJobUid({ platformCode, accountUid, syncType }) {
  const now = new Date();

  const datePart = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("");

  const timePart = [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");

  return `JOB_${datePart}_${timePart}_${platformCode}_${accountUid}_${syncType}`.toUpperCase();
}

function createRequestUid(platformCode) {
  return `REQ_${platformCode}_${Date.now()}_${Math.floor(Math.random() * 99999)}`;
}

module.exports = {
  createJobUid,
  createRequestUid,
};