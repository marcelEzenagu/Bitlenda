const crypto = require("crypto");

/**
 * Utility class for MEXC signing and query building.
 */
class MexcSigner {
  /**
   * URL-encode string (replaces spaces with %20 and encodes special chars)
   */
  static urlEncode(value) {
    return encodeURIComponent(value).replace(/\+/g, "%20");
  }

  /**
   * Builds a sorted, URL-encoded query string from an object
   * (Equivalent to getRequestParamString in Java)
   */
  static buildRequestParamString(params = {}) {
    const keys = Object.keys(params).sort();
    if (keys.length === 0) return "";

    return keys
      .map((key) => {
        const value = params[key] ?? "";
        return `${key}=${MexcSigner.urlEncode(String(value))}`;
      })
      .join("&");
  }

  /**
   * Computes HMAC SHA256 signature using accessKey, timestamp, and params
   * (Equivalent to sign(SignVo signVo))
   */
  static sign({ accessKey, secretKey, reqTime, requestParam = "" }) {
    const message = accessKey + reqTime + requestParam;
    return MexcSigner.actualSignature(message, secretKey);
  }

  /**
   * Performs actual HMAC SHA256 operation and returns hex string
   * (Equivalent to actualSignature in Java)
   */
  static actualSignature(inputStr, key) {
    return crypto.createHmac("sha256", key).update(inputStr).digest("hex");
  }
}

module.exports = MexcSigner;
