/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as o from '../output/output_ast';
import { jitStatements } from '../output/output_jit';
/**
 * Implementation of `CompileReflector` which resolves references to @angular/core
 * symbols at runtime, according to a consumer-provided mapping.
 *
 * Only supports `resolveExternalReference`, all other methods throw.
 */
var R3JitReflector = /** @class */ (function () {
    function R3JitReflector(context) {
        this.context = context;
    }
    R3JitReflector.prototype.resolveExternalReference = function (ref) {
        // This reflector only handles @angular/core imports.
        if (ref.moduleName !== '@angular/core') {
            throw new Error("Cannot resolve external reference to " + ref.moduleName + ", only references to @angular/core are supported.");
        }
        if (!this.context.hasOwnProperty(ref.name)) {
            throw new Error("No value provided for @angular/core symbol '" + ref.name + "'.");
        }
        return this.context[ref.name];
    };
    R3JitReflector.prototype.parameters = function (typeOrFunc) { throw new Error('Not implemented.'); };
    R3JitReflector.prototype.annotations = function (typeOrFunc) { throw new Error('Not implemented.'); };
    R3JitReflector.prototype.shallowAnnotations = function (typeOrFunc) { throw new Error('Not implemented.'); };
    R3JitReflector.prototype.tryAnnotations = function (typeOrFunc) { throw new Error('Not implemented.'); };
    R3JitReflector.prototype.propMetadata = function (typeOrFunc) { throw new Error('Not implemented.'); };
    R3JitReflector.prototype.hasLifecycleHook = function (type, lcProperty) { throw new Error('Not implemented.'); };
    R3JitReflector.prototype.guards = function (typeOrFunc) { throw new Error('Not implemented.'); };
    R3JitReflector.prototype.componentModuleUrl = function (type, cmpMetadata) { throw new Error('Not implemented.'); };
    return R3JitReflector;
}());
/**
 * JIT compiles an expression and returns the result of executing that expression.
 *
 * @param def the definition which will be compiled and executed to get the value to patch
 * @param context an object map of @angular/core symbol names to symbols which will be available in
 * the context of the compiled expression
 * @param sourceUrl a URL to use for the source map of the compiled expression
 * @param constantPool an optional `ConstantPool` which contains constants used in the expression
 */
export function jitExpression(def, context, sourceUrl, preStatements) {
    // The ConstantPool may contain Statements which declare variables used in the final expression.
    // Therefore, its statements need to precede the actual JIT operation. The final statement is a
    // declaration of $def which is set to the expression being compiled.
    var statements = preStatements.concat([
        new o.DeclareVarStmt('$def', def, undefined, [o.StmtModifier.Exported]),
    ]);
    var res = jitStatements(sourceUrl, statements, new R3JitReflector(context), false);
    return res['$def'];
}
//# sourceMappingURL=r3_jit.js.map