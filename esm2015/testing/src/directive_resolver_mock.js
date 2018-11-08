/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DirectiveResolver } from '@angular/compiler';
/**
 * An implementation of {@link DirectiveResolver} that allows overriding
 * various properties of directives.
 */
export class MockDirectiveResolver extends DirectiveResolver {
    constructor(reflector) {
        super(reflector);
        this._directives = new Map();
    }
    resolve(type, throwIfNotFound = true) {
        return this._directives.get(type) || super.resolve(type, throwIfNotFound);
    }
    /**
     * Overrides the {@link core.Directive} for a directive.
     */
    setDirective(type, metadata) {
        this._directives.set(type, metadata);
    }
}
//# sourceMappingURL=directive_resolver_mock.js.map