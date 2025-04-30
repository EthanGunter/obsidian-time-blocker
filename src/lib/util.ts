/**
 * Escapes characters with special meaning in regular expressions.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeRegex(str: string) {
    // $& means the whole matched string
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}