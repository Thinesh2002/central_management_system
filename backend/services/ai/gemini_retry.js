const DEFAULT_RATE_LIMIT_DELAY_MS = 20000;
const OVERLOAD_RETRY_DELAY_MS = 8000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiTransientError(error) {
  try {
    const parsed = typeof error.message === "string" ? JSON.parse(error.message) : null;
    const code = parsed?.error?.code;

    if (code === 429) {
      const retryDetail = (parsed.error.details || []).find((detail) =>
        String(detail["@type"] || "").includes("RetryInfo")
      );
      const seconds = retryDetail?.retryDelay ? parseFloat(retryDetail.retryDelay) : null;

      return {
        code,
        retryDelayMs: Number.isFinite(seconds) ? seconds * 1000 + 1000 : DEFAULT_RATE_LIMIT_DELAY_MS,
        message: "Gemini rate limit exceeded for this request. Try again in a minute.",
      };
    }

    if (code === 503) {
      return {
        code,
        retryDelayMs: OVERLOAD_RETRY_DELAY_MS,
        message: "Gemini is temporarily overloaded. Try again in a moment.",
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function callGeminiWithRetry(client, params, retriesLeft) {
  try {
    return await client.models.generateContent(params);
  } catch (error) {
    const transient = parseGeminiTransientError(error);

    if (transient && retriesLeft > 0) {
      await sleep(transient.retryDelayMs);
      return callGeminiWithRetry(client, params, retriesLeft - 1);
    }

    if (transient) {
      const transientError = new Error(transient.message);
      transientError.statusCode = transient.code;
      throw transientError;
    }

    throw error;
  }
}

module.exports = { callGeminiWithRetry, sleep, parseGeminiTransientError };
