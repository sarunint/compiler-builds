/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { visitValue } from '../util';
import * as o from './output_ast';
export const QUOTED_KEYS = '$quoted$';
export function convertValueToOutputAst(ctx, value, type = null) {
    return visitValue(value, new _ValueOutputAstTransformer(ctx), type);
}
class _ValueOutputAstTransformer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    visitArray(arr, type) {
        return o.literalArr(arr.map(value => visitValue(value, this, null)), type);
    }
    visitStringMap(map, type) {
        const entries = [];
        const quotedSet = new Set(map && map[QUOTED_KEYS]);
        Object.keys(map).forEach(key => {
            entries.push(new o.LiteralMapEntry(key, visitValue(map[key], this, null), quotedSet.has(key)));
        });
        return new o.LiteralMapExpr(entries, type);
    }
    visitPrimitive(value, type) { return o.literal(value, type); }
    visitOther(value, type) {
        if (value instanceof o.Expression) {
            return value;
        }
        else {
            return this.ctx.importExpr(value);
        }
    }
}
//# sourceMappingURL=value_util.js.map