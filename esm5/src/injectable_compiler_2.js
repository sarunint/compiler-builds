/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { Identifiers } from './identifiers';
import * as o from './output/output_ast';
import { R3FactoryDelegateType, compileFactoryFunction } from './render3/r3_factory';
import { mapToMapExpression } from './render3/util';
export function compileInjectable(meta) {
    var result = null;
    function makeFn(ret) {
        return o.fn([], [new o.ReturnStatement(ret)], undefined, undefined, meta.name + "_Factory");
    }
    var factoryMeta = {
        name: meta.name,
        type: meta.type,
        deps: meta.ctorDeps,
        injectFn: Identifiers.inject,
        extraStatementFn: null,
    };
    if (meta.useClass !== undefined) {
        // meta.useClass has two modes of operation. Either deps are specified, in which case `new` is
        // used to instantiate the class with dependencies injected, or deps are not specified and
        // the factory of the class is used to instantiate it.
        //
        // A special case exists for useClass: Type where Type is the injectable type itself, in which
        // case omitting deps just uses the constructor dependencies instead.
        var useClassOnSelf = meta.useClass.isEquivalent(meta.type);
        var deps = meta.userDeps || (useClassOnSelf && meta.ctorDeps) || undefined;
        if (deps !== undefined) {
            // factory: () => new meta.useClass(...deps)
            result = compileFactoryFunction(tslib_1.__assign({}, factoryMeta, { delegate: meta.useClass, delegateDeps: deps, delegateType: R3FactoryDelegateType.Class }));
        }
        else {
            result = compileFactoryFunction(tslib_1.__assign({}, factoryMeta, { delegate: meta.useClass, delegateType: R3FactoryDelegateType.Factory }));
        }
    }
    else if (meta.useFactory !== undefined) {
        result = compileFactoryFunction(tslib_1.__assign({}, factoryMeta, { delegate: meta.useFactory, delegateDeps: meta.userDeps || [], delegateType: R3FactoryDelegateType.Function }));
    }
    else if (meta.useValue !== undefined) {
        // Note: it's safe to use `meta.useValue` instead of the `USE_VALUE in meta` check used for
        // client code because meta.useValue is an Expression which will be defined even if the actual
        // value is undefined.
        result = compileFactoryFunction(tslib_1.__assign({}, factoryMeta, { expression: meta.useValue }));
    }
    else if (meta.useExisting !== undefined) {
        // useExisting is an `inject` call on the existing token.
        result = compileFactoryFunction(tslib_1.__assign({}, factoryMeta, { expression: o.importExpr(Identifiers.inject).callFn([meta.useExisting]) }));
    }
    else {
        result = compileFactoryFunction(factoryMeta);
    }
    var token = meta.type;
    var providedIn = meta.providedIn;
    var expression = o.importExpr(Identifiers.defineInjectable).callFn([mapToMapExpression({ token: token, factory: result.factory, providedIn: providedIn })]);
    var type = new o.ExpressionType(o.importExpr(Identifiers.InjectableDef, [new o.ExpressionType(meta.type)]));
    return {
        expression: expression,
        type: type,
        statements: result.statements,
    };
}
//# sourceMappingURL=injectable_compiler_2.js.map