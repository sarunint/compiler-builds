/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { PipeResolver } from '@angular/compiler';
var MockPipeResolver = /** @class */ (function (_super) {
    tslib_1.__extends(MockPipeResolver, _super);
    function MockPipeResolver(refector) {
        var _this = _super.call(this, refector) || this;
        _this._pipes = new Map();
        return _this;
    }
    /**
     * Overrides the {@link Pipe} for a pipe.
     */
    MockPipeResolver.prototype.setPipe = function (type, metadata) { this._pipes.set(type, metadata); };
    /**
     * Returns the {@link Pipe} for a pipe:
     * - Set the {@link Pipe} to the overridden view when it exists or fallback to the
     * default
     * `PipeResolver`, see `setPipe`.
     */
    MockPipeResolver.prototype.resolve = function (type, throwIfNotFound) {
        if (throwIfNotFound === void 0) { throwIfNotFound = true; }
        var metadata = this._pipes.get(type);
        if (!metadata) {
            metadata = _super.prototype.resolve.call(this, type, throwIfNotFound);
        }
        return metadata;
    };
    return MockPipeResolver;
}(PipeResolver));
export { MockPipeResolver };
//# sourceMappingURL=pipe_resolver_mock.js.map