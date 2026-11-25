# Vendored browser libraries

The editor and the PowerPoint export run in the browser, so the extension serves two libraries from its own local server. They are the published browser bundles, copied here without any change. Nothing is loaded from a CDN or any other address at run time.

| File | Package | Version | License | Size in bytes | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `pptxgen.min.js` | [PptxGenJS](https://github.com/gitbrent/PptxGenJS) | 4.0.1 | MIT | 271,010 | `097f0b92e15035a72bba72b59ef1ece62ab45ec6075ac85fe0e2d80d3f59b8e3` |
| `jszip.min.js` | [JSZip](https://github.com/Stuk/jszip) | 3.10.2 | MIT or GPL-3.0-or-later (used under MIT) | 97,781 | `7f839b2d4688b845c105ebf5d2f9803075f91ea0fe72bdaac176c3a04dd3d2c1` |

## Provenance

Both files are byte-identical to the files in the npm packages of the same version:

- `pptxgen.min.js` is `dist/pptxgen.min.js` from `pptxgenjs@4.0.1`.
- `jszip.min.js` is `dist/jszip.min.js` from `jszip@3.10.2`.

The page loads JSZip first, then the PptxGenJS build without dependencies. PowerPoint import, export and embedded chart workbooks share JSZip 3.10.2. This avoids the additional JSZip 3.10.1 copy in PptxGenJS's full bundle and saves 189,879 bytes without modifying either published file.

The exact versions are pinned in `package.json` and `package-lock.json`. After `npm ci --ignore-scripts`, `vendor.test.mjs` compares the files byte for byte with `node_modules`.

To update a library, change its pinned version, install it, copy the file from `node_modules/<package>/dist/`, and update the table above.

## Licenses

- `PptxGenJS-LICENSE.txt` and `JSZip-LICENSE.txt` are the license notices of the two bundles.
- `licenses/` holds the license files that PptxGenJS, JSZip and their dependencies publish on npm. The bundles inline code from several of these packages, among them pako (MIT and Zlib), lie, immediate, setimmediate and inherits. The folder comes from the full dependency trees, so it can contain more than the bundles use.

## Notes for reviewers

- Only the JSZip bundle contains a `new Function(` call. It belongs to the `setimmediate` polyfill and only runs when a string, not a function, is passed to `setImmediate`. Neither library does that. The extension's own sources use no `eval` or `new Function`, and the page's content security policy has no `unsafe-eval`.
- The PptxGenJS bundle has a code path that downloads images given by address (`XMLHttpRequest`). The extension never reaches it. The deck model accepts only embedded PNG and JPEG data URLs, `export.mjs` passes them to `addImage({ data })`, and the content security policy (`connect-src 'self'`) would block any other address. JSZip has no network code.
