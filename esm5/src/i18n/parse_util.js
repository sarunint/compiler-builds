/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { ParseError } from '../parse_util';
/**
 * An i18n error.
 */
var I18nError = /** @class */ (function (_super) {
    tslib_1.__extends(I18nError, _super);
    function I18nError(span, msg) {
        return _super.call(this, span, msg) || this;
    }
    return I18nError;
}(ParseError));
export { I18nError };
//# sourceMappingURL=parse_util.js.map