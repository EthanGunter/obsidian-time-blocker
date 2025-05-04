/**
 * Escapes characters with special meaning in regular expressions.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeRegex(str: string) {
    // $& means the whole matched string
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getInnerClientRect(element: HTMLElement) {
    if (!element) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const paddingTop = parseFloat(style.paddingTop);
    const paddingLeft = parseFloat(style.paddingLeft);
    const borderTop = parseFloat(style.borderTopWidth);
    const borderLeft = parseFloat(style.borderLeftWidth);

    // Calculate inner dimensions by subtracting padding from clientWidth/Height
    const width =
        element.clientWidth - paddingLeft - parseFloat(style.paddingRight);
    const height =
        element.clientHeight - paddingTop - parseFloat(style.paddingBottom);

    // Calculate inner position by adding border and padding to getBoundingClientRect top/left
    const top = rect.top + borderTop + paddingTop;
    const left = rect.left + borderLeft + paddingLeft;

    return {
        x: left,
        y: top,
        width: width,
        height: height,
        top: top,
        left: left,
        bottom: top + height,
        right: left + width,
    };
}