/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as o from './output_ast';
export function mapEntry(key, value) {
    return { key, value, quoted: false };
}
export function mapLiteral(obj) {
    return o.literalMap(Object.keys(obj).map(key => ({
        key,
        quoted: false,
        value: obj[key],
    })));
}
//# sourceMappingURL=map_util.js.map