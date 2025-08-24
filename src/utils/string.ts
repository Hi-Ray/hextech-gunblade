/**
 * Replaces the locale placeholder inside a url.
 *
 * @param str {string} - The url that contains the placeholder.
 * @param locale {string} - The locale to be replaced.
 */
export function replaceLocalePlaceholder(str: string, locale: string) {
    return str
        .replaceAll('{current_country_locale}', locale)
        .replaceAll('{locale}', locale)
        .replaceAll('{bcplocale}', locale);
}

/**
 * Replaces the event placeholder inside a url.
 *
 * @param str {string} - The url that contains the placeholder.
 * @param event {string} - The event to be replaced.
 */
export function replaceEventPlaceholder(str: string, event: string) {
    return str.replaceAll('{event}', event);
}

export function isValidUTF8(str: string) {
    const regex = /[\uD800-\uDFFF]/;
    return !regex.test(str);
}
