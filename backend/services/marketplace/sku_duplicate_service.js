const skuMappingModel = require('../../models/marketplace/sku_mapping_model');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeMethod(value) {
  return clean(value || 'SKU_ACCOUNT').toUpperCase();
}

function buildCandidate(baseSku, method, accountCode, customSuffix, sequence = 0) {
  const sku = clean(baseSku);
  const account = clean(accountCode).toUpperCase();
  const suffix = clean(customSuffix).replace(/^_+/, '');

  switch (normalizeMethod(method)) {
    case 'SAME_SKU':
    case 'SAME':
      return sku;
    case 'SKU_A':
    case 'LETTER':
      return `${sku}_${ALPHABET[sequence] || `A${sequence}`}`;
    case 'SKU_001':
    case 'NUMBER':
      return `${sku}_${String(sequence + 1).padStart(3, '0')}`;
    case 'CUSTOM_SUFFIX':
    case 'CUSTOM':
      return suffix ? `${sku}_${suffix}` : sku;
    case 'SKU_ACCOUNT':
    case 'ACCOUNT':
    default:
      return account ? `${sku}_${account}` : sku;
  }
}

async function exists(platform, account, marketplaceSku) {
  const mapping = await skuMappingModel.findMatch({
    platform,
    account_id: account?.id || account?.account_id,
    account_code: account?.account_code,
    marketplace_sku: marketplaceSku,
  }).catch(() => null);
  return Boolean(mapping);
}

async function resolveMarketplaceSku({ platform, account = {}, baseSku, method, customSuffix }) {
  const requestedMethod = normalizeMethod(method);

  if (requestedMethod === 'SAME_SKU' || requestedMethod === 'SAME') {
    const candidate = buildCandidate(baseSku, requestedMethod, account.account_code, customSuffix, 0);
    return { sku: candidate, duplicate: await exists(platform, account, candidate), method: requestedMethod };
  }

  for (let index = 0; index < 100; index += 1) {
    const candidate = buildCandidate(baseSku, requestedMethod, account.account_code, customSuffix, index);
    const duplicate = await exists(platform, account, candidate);
    if (!duplicate || requestedMethod === 'CUSTOM_SUFFIX' || requestedMethod === 'CUSTOM' || requestedMethod === 'SKU_ACCOUNT' || requestedMethod === 'ACCOUNT') {
      return { sku: candidate, duplicate, method: requestedMethod };
    }
  }

  return { sku: `${clean(baseSku)}_${Date.now()}`, duplicate: false, method: requestedMethod };
}

module.exports = { buildCandidate, resolveMarketplaceSku };
