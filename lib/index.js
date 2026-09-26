//#region lib/index.js
/**
 * Host loader entry for the browser-only sidebar status plugin.
 *
 * The browser half ships via `exports["./client"]`, discovered through this
 * package's `dsh.client` declaration. The empty `apply` exists so the package
 * appears as a Loader entry — which is exactly what the client-modules scanner
 * walks to compose the browser bundle.
 *
 * Everything this plugin shows is read on the browser side through the already
 * mounted `account` Remote namespace, so there is no host-side behavior to add
 * here. That also means the loader entry must declare NO `inject` list: an
 * unknown host service would leave this fiber pending forever. `slots` and
 * `locale` are browser-side services and are declared in `dsh.client.inject`
 * (package.json) instead, which is where they belong.
 */
/** Host plugin body — no host-side behavior for this surface plugin. */
function apply() {}
//#endregion

export { apply };
