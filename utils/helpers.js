/**
 * Debounces a function, ensuring it's not called more frequently than the specified delay.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} A debounced version of the passed function.
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttles a function, ensuring it's not called more frequently than the specified interval.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The minimum number of milliseconds between function calls.
 * @returns {Function} A throttled version of the passed function.
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Formats a number to a specified number of decimal places.
 * @param {number} num - The number to format.
 * @param {number} [decimalPlaces=2] - The number of decimal places to round to.
 * @returns {string} The formatted number as a string.
 */
export function formatNumber(num, decimalPlaces = 2) {
    return Number(num).toFixed(decimalPlaces);
}

/**
 * Generates a unique ID.
 * @returns {string} A unique ID.
 */
export function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Safely accesses nested object properties without throwing errors.
 * @param {Object} obj - The object to access.
 * @param {string} path - The path to the property, using dot notation.
 * @param {*} [defaultValue=undefined] - The value to return if the path doesn't exist.
 * @returns {*} The value at the specified path, or the default value if not found.
 */
export function safeGet(obj, path, defaultValue = undefined) {
    const travel = (regexp) =>
        String.prototype.split
            .call(path, regexp)
            .filter(Boolean)
            .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
    const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
    return result === undefined || result === obj ? defaultValue : result;
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, or empty object).
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is empty, false otherwise.
 */
export function isEmpty(value) {
    return (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && Object.keys(value).length === 0)
    );
}