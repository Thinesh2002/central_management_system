const { callDarazApi } = require("../../marketplace/daraz_api_service");

// Instant Messaging API — flat GET/POST query params like the read-side
// Order API (not the Fulfillment API's JSON-wrapped request objects), per
// these endpoints' own docs.

async function openSession({ account, credentials, orderId }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/im/session/open",
    method: "POST",
    requestType: "im_session_open",
    query: { order_id: orderId },
  });
}

async function sendMessage({ account, credentials, sessionId, txt, templateId = "1" }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/im/message/send",
    method: "POST",
    requestType: "im_message_send",
    query: { session_id: sessionId, template_id: templateId, txt },
  });
}

async function getMessages({ account, credentials, sessionId, startTime, pageSize = 20, lastMessageId }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/im/message/list",
    method: "GET",
    requestType: "im_message_list",
    query: {
      session_id: sessionId,
      start_time: startTime,
      page_size: pageSize,
      last_message_id: lastMessageId,
    },
  });
}

async function getSessionDetail({ account, credentials, sessionId }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/im/session/get",
    method: "GET",
    requestType: "im_session_get",
    query: { session_id: sessionId },
  });
}

async function getSessionList({ account, credentials, startTime, pageSize = 20, lastSessionId }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/im/session/list",
    method: "GET",
    requestType: "im_session_list",
    query: { start_time: startTime, page_size: pageSize, last_session_id: lastSessionId },
  });
}

async function readSession({ account, credentials, sessionId, lastReadMessageId }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/im/session/read",
    method: "POST",
    requestType: "im_session_read",
    query: { session_id: sessionId, last_read_message_id: lastReadMessageId },
  });
}

module.exports = {
  openSession,
  sendMessage,
  getMessages,
  getSessionDetail,
  getSessionList,
  readSession,
};
