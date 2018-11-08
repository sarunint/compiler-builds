/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const CORE = '@angular/core';
export class Identifiers {
}
Identifiers.ANALYZE_FOR_ENTRY_COMPONENTS = {
    name: 'ANALYZE_FOR_ENTRY_COMPONENTS',
    moduleName: CORE,
};
Identifiers.ElementRef = { name: 'ElementRef', moduleName: CORE };
Identifiers.NgModuleRef = { name: 'NgModuleRef', moduleName: CORE };
Identifiers.ViewContainerRef = { name: 'ViewContainerRef', moduleName: CORE };
Identifiers.ChangeDetectorRef = {
    name: 'ChangeDetectorRef',
    moduleName: CORE,
};
Identifiers.QueryList = { name: 'QueryList', moduleName: CORE };
Identifiers.TemplateRef = { name: 'TemplateRef', moduleName: CORE };
Identifiers.Renderer2 = { name: 'Renderer2', moduleName: CORE };
Identifiers.CodegenComponentFactoryResolver = {
    name: 'ɵCodegenComponentFactoryResolver',
    moduleName: CORE,
};
Identifiers.ComponentFactoryResolver = {
    name: 'ComponentFactoryResolver',
    moduleName: CORE,
};
Identifiers.ComponentFactory = { name: 'ComponentFactory', moduleName: CORE };
Identifiers.ComponentRef = { name: 'ComponentRef', moduleName: CORE };
Identifiers.NgModuleFactory = { name: 'NgModuleFactory', moduleName: CORE };
Identifiers.createModuleFactory = {
    name: 'ɵcmf',
    moduleName: CORE,
};
Identifiers.moduleDef = {
    name: 'ɵmod',
    moduleName: CORE,
};
Identifiers.moduleProviderDef = {
    name: 'ɵmpd',
    moduleName: CORE,
};
Identifiers.RegisterModuleFactoryFn = {
    name: 'ɵregisterModuleFactory',
    moduleName: CORE,
};
Identifiers.inject = { name: 'inject', moduleName: CORE };
Identifiers.INJECTOR = { name: 'INJECTOR', moduleName: CORE };
Identifiers.Injector = { name: 'Injector', moduleName: CORE };
Identifiers.defineInjectable = { name: 'defineInjectable', moduleName: CORE };
Identifiers.InjectableDef = { name: 'ɵInjectableDef', moduleName: CORE };
Identifiers.ViewEncapsulation = {
    name: 'ViewEncapsulation',
    moduleName: CORE,
};
Identifiers.ChangeDetectionStrategy = {
    name: 'ChangeDetectionStrategy',
    moduleName: CORE,
};
Identifiers.SecurityContext = {
    name: 'SecurityContext',
    moduleName: CORE,
};
Identifiers.LOCALE_ID = { name: 'LOCALE_ID', moduleName: CORE };
Identifiers.TRANSLATIONS_FORMAT = {
    name: 'TRANSLATIONS_FORMAT',
    moduleName: CORE,
};
Identifiers.inlineInterpolate = {
    name: 'ɵinlineInterpolate',
    moduleName: CORE,
};
Identifiers.interpolate = { name: 'ɵinterpolate', moduleName: CORE };
Identifiers.EMPTY_ARRAY = { name: 'ɵEMPTY_ARRAY', moduleName: CORE };
Identifiers.EMPTY_MAP = { name: 'ɵEMPTY_MAP', moduleName: CORE };
Identifiers.Renderer = { name: 'Renderer', moduleName: CORE };
Identifiers.viewDef = { name: 'ɵvid', moduleName: CORE };
Identifiers.elementDef = { name: 'ɵeld', moduleName: CORE };
Identifiers.anchorDef = { name: 'ɵand', moduleName: CORE };
Identifiers.textDef = { name: 'ɵted', moduleName: CORE };
Identifiers.directiveDef = { name: 'ɵdid', moduleName: CORE };
Identifiers.providerDef = { name: 'ɵprd', moduleName: CORE };
Identifiers.queryDef = { name: 'ɵqud', moduleName: CORE };
Identifiers.pureArrayDef = { name: 'ɵpad', moduleName: CORE };
Identifiers.pureObjectDef = { name: 'ɵpod', moduleName: CORE };
Identifiers.purePipeDef = { name: 'ɵppd', moduleName: CORE };
Identifiers.pipeDef = { name: 'ɵpid', moduleName: CORE };
Identifiers.nodeValue = { name: 'ɵnov', moduleName: CORE };
Identifiers.ngContentDef = { name: 'ɵncd', moduleName: CORE };
Identifiers.unwrapValue = { name: 'ɵunv', moduleName: CORE };
Identifiers.createRendererType2 = { name: 'ɵcrt', moduleName: CORE };
// type only
Identifiers.RendererType2 = {
    name: 'RendererType2',
    moduleName: CORE,
};
// type only
Identifiers.ViewDefinition = {
    name: 'ɵViewDefinition',
    moduleName: CORE,
};
Identifiers.createComponentFactory = { name: 'ɵccf', moduleName: CORE };
Identifiers.setClassMetadata = { name: 'ɵsetClassMetadata', moduleName: CORE };
export function createTokenForReference(reference) {
    return { identifier: { reference: reference } };
}
export function createTokenForExternalReference(reflector, reference) {
    return createTokenForReference(reflector.resolveExternalReference(reference));
}
//# sourceMappingURL=identifiers.js.map