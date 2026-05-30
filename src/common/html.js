// @ts-check

/**
 * Encode string as HTML.
 *
 * @see https://stackoverflow.com/a/48073476/10629172
 *
 * @param {string} str String to encode.
 * @param {object} [options] Encoding options.
 * @param {boolean} [options.encodeAll=false] Encode every character when the string contains HTML-sensitive characters.
 * @returns {string} Encoded string.
 */
const encodeHTML = (str, { encodeAll = false } = {}) => {
  const encoded = str
    .replace(/[\u00A0-\u9999<>&](?!#)/gim, (i) => {
      return "&#" + i.charCodeAt(0) + ";";
    })
    .replace(/\u0008/gim, "");

  if (!encodeAll || encoded === str) {
    return encoded;
  }

  return str
    .replace(/\u0008/gim, "")
    .split("")
    .map((i) => "&#" + i.charCodeAt(0) + ";")
    .join("");
};

export { encodeHTML };
