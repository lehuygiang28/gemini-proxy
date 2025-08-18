/**
 * Remove trailing slash from the url
 * @param url - The url to remove the trailing slash from
 * @returns The url with the trailing slash removed
 */
export function removeTrailingSlash(url: string) {
    return url.replace(/\/$/, '');
}

/**
 * Remove leading slash from the url
 * @param url - The url to remove the leading slash from
 * @returns The url with the leading slash removed
 */
export function removeLeadingSlash(url: string) {
    return url.replace(/^\//, '');
}

/**
 * Resolve the url by removing the leading and trailing slashes from the base url and path
 * @param baseUrl - The base url to resolve the url from
 * @param path - The path to resolve the url from
 * @returns The resolved url
 */
export function resolveUrl(baseUrl: string, path: string) {
    return `${removeLeadingSlash(removeTrailingSlash(baseUrl))}/${removeLeadingSlash(removeTrailingSlash(path))}`;
}
