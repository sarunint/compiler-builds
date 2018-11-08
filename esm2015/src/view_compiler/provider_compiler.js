/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Identifiers, createTokenForExternalReference } from '../identifiers';
import { LifecycleHooks } from '../lifecycle_reflector';
import * as o from '../output/output_ast';
import { convertValueToOutputAst } from '../output/value_util';
import { ProviderAstType } from '../template_parser/template_ast';
export function providerDef(ctx, providerAst) {
    let flags = 0 /* None */;
    if (!providerAst.eager) {
        flags |= 4096 /* LazyProvider */;
    }
    if (providerAst.providerType === ProviderAstType.PrivateService) {
        flags |= 8192 /* PrivateProvider */;
    }
    if (providerAst.isModule) {
        flags |= 1073741824 /* TypeModuleProvider */;
    }
    providerAst.lifecycleHooks.forEach((lifecycleHook) => {
        // for regular providers, we only support ngOnDestroy
        if (lifecycleHook === LifecycleHooks.OnDestroy ||
            providerAst.providerType === ProviderAstType.Directive ||
            providerAst.providerType === ProviderAstType.Component) {
            flags |= lifecycleHookToNodeFlag(lifecycleHook);
        }
    });
    const { providerExpr, flags: providerFlags, depsExpr } = providerAst.multiProvider ?
        multiProviderDef(ctx, flags, providerAst.providers) :
        singleProviderDef(ctx, flags, providerAst.providerType, providerAst.providers[0]);
    return {
        providerExpr,
        flags: providerFlags, depsExpr,
        tokenExpr: tokenExpr(ctx, providerAst.token),
    };
}
function multiProviderDef(ctx, flags, providers) {
    const allDepDefs = [];
    const allParams = [];
    const exprs = providers.map((provider, providerIndex) => {
        let expr;
        if (provider.useClass) {
            const depExprs = convertDeps(providerIndex, provider.deps || provider.useClass.diDeps);
            expr = ctx.importExpr(provider.useClass.reference).instantiate(depExprs);
        }
        else if (provider.useFactory) {
            const depExprs = convertDeps(providerIndex, provider.deps || provider.useFactory.diDeps);
            expr = ctx.importExpr(provider.useFactory.reference).callFn(depExprs);
        }
        else if (provider.useExisting) {
            const depExprs = convertDeps(providerIndex, [{ token: provider.useExisting }]);
            expr = depExprs[0];
        }
        else {
            expr = convertValueToOutputAst(ctx, provider.useValue);
        }
        return expr;
    });
    const providerExpr = o.fn(allParams, [new o.ReturnStatement(o.literalArr(exprs))], o.INFERRED_TYPE);
    return {
        providerExpr,
        flags: flags | 1024 /* TypeFactoryProvider */,
        depsExpr: o.literalArr(allDepDefs)
    };
    function convertDeps(providerIndex, deps) {
        return deps.map((dep, depIndex) => {
            const paramName = `p${providerIndex}_${depIndex}`;
            allParams.push(new o.FnParam(paramName, o.DYNAMIC_TYPE));
            allDepDefs.push(depDef(ctx, dep));
            return o.variable(paramName);
        });
    }
}
function singleProviderDef(ctx, flags, providerType, providerMeta) {
    let providerExpr;
    let deps;
    if (providerType === ProviderAstType.Directive || providerType === ProviderAstType.Component) {
        providerExpr = ctx.importExpr(providerMeta.useClass.reference);
        flags |= 16384 /* TypeDirective */;
        deps = providerMeta.deps || providerMeta.useClass.diDeps;
    }
    else {
        if (providerMeta.useClass) {
            providerExpr = ctx.importExpr(providerMeta.useClass.reference);
            flags |= 512 /* TypeClassProvider */;
            deps = providerMeta.deps || providerMeta.useClass.diDeps;
        }
        else if (providerMeta.useFactory) {
            providerExpr = ctx.importExpr(providerMeta.useFactory.reference);
            flags |= 1024 /* TypeFactoryProvider */;
            deps = providerMeta.deps || providerMeta.useFactory.diDeps;
        }
        else if (providerMeta.useExisting) {
            providerExpr = o.NULL_EXPR;
            flags |= 2048 /* TypeUseExistingProvider */;
            deps = [{ token: providerMeta.useExisting }];
        }
        else {
            providerExpr = convertValueToOutputAst(ctx, providerMeta.useValue);
            flags |= 256 /* TypeValueProvider */;
            deps = [];
        }
    }
    const depsExpr = o.literalArr(deps.map(dep => depDef(ctx, dep)));
    return { providerExpr, flags, depsExpr };
}
function tokenExpr(ctx, tokenMeta) {
    return tokenMeta.identifier ? ctx.importExpr(tokenMeta.identifier.reference) :
        o.literal(tokenMeta.value);
}
export function depDef(ctx, dep) {
    // Note: the following fields have already been normalized out by provider_analyzer:
    // - isAttribute, isHost
    const expr = dep.isValue ? convertValueToOutputAst(ctx, dep.value) : tokenExpr(ctx, dep.token);
    let flags = 0 /* None */;
    if (dep.isSkipSelf) {
        flags |= 1 /* SkipSelf */;
    }
    if (dep.isOptional) {
        flags |= 2 /* Optional */;
    }
    if (dep.isSelf) {
        flags |= 4 /* Self */;
    }
    if (dep.isValue) {
        flags |= 8 /* Value */;
    }
    return flags === 0 /* None */ ? expr : o.literalArr([o.literal(flags), expr]);
}
export function lifecycleHookToNodeFlag(lifecycleHook) {
    let nodeFlag = 0 /* None */;
    switch (lifecycleHook) {
        case LifecycleHooks.AfterContentChecked:
            nodeFlag = 2097152 /* AfterContentChecked */;
            break;
        case LifecycleHooks.AfterContentInit:
            nodeFlag = 1048576 /* AfterContentInit */;
            break;
        case LifecycleHooks.AfterViewChecked:
            nodeFlag = 8388608 /* AfterViewChecked */;
            break;
        case LifecycleHooks.AfterViewInit:
            nodeFlag = 4194304 /* AfterViewInit */;
            break;
        case LifecycleHooks.DoCheck:
            nodeFlag = 262144 /* DoCheck */;
            break;
        case LifecycleHooks.OnChanges:
            nodeFlag = 524288 /* OnChanges */;
            break;
        case LifecycleHooks.OnDestroy:
            nodeFlag = 131072 /* OnDestroy */;
            break;
        case LifecycleHooks.OnInit:
            nodeFlag = 65536 /* OnInit */;
            break;
    }
    return nodeFlag;
}
export function componentFactoryResolverProviderDef(reflector, ctx, flags, entryComponents) {
    const entryComponentFactories = entryComponents.map((entryComponent) => ctx.importExpr(entryComponent.componentFactory));
    const token = createTokenForExternalReference(reflector, Identifiers.ComponentFactoryResolver);
    const classMeta = {
        diDeps: [
            { isValue: true, value: o.literalArr(entryComponentFactories) },
            { token: token, isSkipSelf: true, isOptional: true },
            { token: createTokenForExternalReference(reflector, Identifiers.NgModuleRef) },
        ],
        lifecycleHooks: [],
        reference: reflector.resolveExternalReference(Identifiers.CodegenComponentFactoryResolver)
    };
    const { providerExpr, flags: providerFlags, depsExpr } = singleProviderDef(ctx, flags, ProviderAstType.PrivateService, {
        token,
        multi: false,
        useClass: classMeta,
    });
    return { providerExpr, flags: providerFlags, depsExpr, tokenExpr: tokenExpr(ctx, token) };
}
//# sourceMappingURL=provider_compiler.js.map