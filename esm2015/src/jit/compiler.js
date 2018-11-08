/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { identifierName, ngModuleJitUrl, sharedStylesheetJitUrl, templateJitUrl, templateSourceUrl } from '../compile_metadata';
import { ConstantPool } from '../constant_pool';
import * as ir from '../output/output_ast';
import { interpretStatements } from '../output/output_interpreter';
import { jitStatements } from '../output/output_jit';
import { SyncAsync, stringify } from '../util';
/**
 * An internal module of the Angular compiler that begins with component types,
 * extracts templates, and eventually produces a compiled version of the component
 * ready for linking into an application.
 *
 * @security  When compiling templates at runtime, you must ensure that the entire template comes
 * from a trusted source. Attacker-controlled data introduced by a template could expose your
 * application to XSS risks.  For more detail, see the [Security Guide](http://g.co/ng/security).
 */
export class JitCompiler {
    constructor(_metadataResolver, _templateParser, _styleCompiler, _viewCompiler, _ngModuleCompiler, _summaryResolver, _reflector, _compilerConfig, _console, getExtraNgModuleProviders) {
        this._metadataResolver = _metadataResolver;
        this._templateParser = _templateParser;
        this._styleCompiler = _styleCompiler;
        this._viewCompiler = _viewCompiler;
        this._ngModuleCompiler = _ngModuleCompiler;
        this._summaryResolver = _summaryResolver;
        this._reflector = _reflector;
        this._compilerConfig = _compilerConfig;
        this._console = _console;
        this.getExtraNgModuleProviders = getExtraNgModuleProviders;
        this._compiledTemplateCache = new Map();
        this._compiledHostTemplateCache = new Map();
        this._compiledDirectiveWrapperCache = new Map();
        this._compiledNgModuleCache = new Map();
        this._sharedStylesheetCount = 0;
        this._addedAotSummaries = new Set();
    }
    compileModuleSync(moduleType) {
        return SyncAsync.assertSync(this._compileModuleAndComponents(moduleType, true));
    }
    compileModuleAsync(moduleType) {
        return Promise.resolve(this._compileModuleAndComponents(moduleType, false));
    }
    compileModuleAndAllComponentsSync(moduleType) {
        return SyncAsync.assertSync(this._compileModuleAndAllComponents(moduleType, true));
    }
    compileModuleAndAllComponentsAsync(moduleType) {
        return Promise.resolve(this._compileModuleAndAllComponents(moduleType, false));
    }
    getComponentFactory(component) {
        const summary = this._metadataResolver.getDirectiveSummary(component);
        return summary.componentFactory;
    }
    loadAotSummaries(summaries) {
        this.clearCache();
        this._addAotSummaries(summaries);
    }
    _addAotSummaries(fn) {
        if (this._addedAotSummaries.has(fn)) {
            return;
        }
        this._addedAotSummaries.add(fn);
        const summaries = fn();
        for (let i = 0; i < summaries.length; i++) {
            const entry = summaries[i];
            if (typeof entry === 'function') {
                this._addAotSummaries(entry);
            }
            else {
                const summary = entry;
                this._summaryResolver.addSummary({ symbol: summary.type.reference, metadata: null, type: summary });
            }
        }
    }
    hasAotSummary(ref) { return !!this._summaryResolver.resolveSummary(ref); }
    _filterJitIdentifiers(ids) {
        return ids.map(mod => mod.reference).filter((ref) => !this.hasAotSummary(ref));
    }
    _compileModuleAndComponents(moduleType, isSync) {
        return SyncAsync.then(this._loadModules(moduleType, isSync), () => {
            this._compileComponents(moduleType, null);
            return this._compileModule(moduleType);
        });
    }
    _compileModuleAndAllComponents(moduleType, isSync) {
        return SyncAsync.then(this._loadModules(moduleType, isSync), () => {
            const componentFactories = [];
            this._compileComponents(moduleType, componentFactories);
            return {
                ngModuleFactory: this._compileModule(moduleType),
                componentFactories: componentFactories
            };
        });
    }
    _loadModules(mainModule, isSync) {
        const loading = [];
        const mainNgModule = this._metadataResolver.getNgModuleMetadata(mainModule);
        // Note: for runtime compilation, we want to transitively compile all modules,
        // so we also need to load the declared directives / pipes for all nested modules.
        this._filterJitIdentifiers(mainNgModule.transitiveModule.modules).forEach((nestedNgModule) => {
            // getNgModuleMetadata only returns null if the value passed in is not an NgModule
            const moduleMeta = this._metadataResolver.getNgModuleMetadata(nestedNgModule);
            this._filterJitIdentifiers(moduleMeta.declaredDirectives).forEach((ref) => {
                const promise = this._metadataResolver.loadDirectiveMetadata(moduleMeta.type.reference, ref, isSync);
                if (promise) {
                    loading.push(promise);
                }
            });
            this._filterJitIdentifiers(moduleMeta.declaredPipes)
                .forEach((ref) => this._metadataResolver.getOrLoadPipeMetadata(ref));
        });
        return SyncAsync.all(loading);
    }
    _compileModule(moduleType) {
        let ngModuleFactory = this._compiledNgModuleCache.get(moduleType);
        if (!ngModuleFactory) {
            const moduleMeta = this._metadataResolver.getNgModuleMetadata(moduleType);
            // Always provide a bound Compiler
            const extraProviders = this.getExtraNgModuleProviders(moduleMeta.type.reference);
            const outputCtx = createOutputContext();
            const compileResult = this._ngModuleCompiler.compile(outputCtx, moduleMeta, extraProviders);
            ngModuleFactory = this._interpretOrJit(ngModuleJitUrl(moduleMeta), outputCtx.statements)[compileResult.ngModuleFactoryVar];
            this._compiledNgModuleCache.set(moduleMeta.type.reference, ngModuleFactory);
        }
        return ngModuleFactory;
    }
    /**
     * @internal
     */
    _compileComponents(mainModule, allComponentFactories) {
        const ngModule = this._metadataResolver.getNgModuleMetadata(mainModule);
        const moduleByJitDirective = new Map();
        const templates = new Set();
        const transJitModules = this._filterJitIdentifiers(ngModule.transitiveModule.modules);
        transJitModules.forEach((localMod) => {
            const localModuleMeta = this._metadataResolver.getNgModuleMetadata(localMod);
            this._filterJitIdentifiers(localModuleMeta.declaredDirectives).forEach((dirRef) => {
                moduleByJitDirective.set(dirRef, localModuleMeta);
                const dirMeta = this._metadataResolver.getDirectiveMetadata(dirRef);
                if (dirMeta.isComponent) {
                    templates.add(this._createCompiledTemplate(dirMeta, localModuleMeta));
                    if (allComponentFactories) {
                        const template = this._createCompiledHostTemplate(dirMeta.type.reference, localModuleMeta);
                        templates.add(template);
                        allComponentFactories.push(dirMeta.componentFactory);
                    }
                }
            });
        });
        transJitModules.forEach((localMod) => {
            const localModuleMeta = this._metadataResolver.getNgModuleMetadata(localMod);
            this._filterJitIdentifiers(localModuleMeta.declaredDirectives).forEach((dirRef) => {
                const dirMeta = this._metadataResolver.getDirectiveMetadata(dirRef);
                if (dirMeta.isComponent) {
                    dirMeta.entryComponents.forEach((entryComponentType) => {
                        const moduleMeta = moduleByJitDirective.get(entryComponentType.componentType);
                        templates.add(this._createCompiledHostTemplate(entryComponentType.componentType, moduleMeta));
                    });
                }
            });
            localModuleMeta.entryComponents.forEach((entryComponentType) => {
                if (!this.hasAotSummary(entryComponentType.componentType)) {
                    const moduleMeta = moduleByJitDirective.get(entryComponentType.componentType);
                    templates.add(this._createCompiledHostTemplate(entryComponentType.componentType, moduleMeta));
                }
            });
        });
        templates.forEach((template) => this._compileTemplate(template));
    }
    clearCacheFor(type) {
        this._compiledNgModuleCache.delete(type);
        this._metadataResolver.clearCacheFor(type);
        this._compiledHostTemplateCache.delete(type);
        const compiledTemplate = this._compiledTemplateCache.get(type);
        if (compiledTemplate) {
            this._compiledTemplateCache.delete(type);
        }
    }
    clearCache() {
        // Note: don't clear the _addedAotSummaries, as they don't change!
        this._metadataResolver.clearCache();
        this._compiledTemplateCache.clear();
        this._compiledHostTemplateCache.clear();
        this._compiledNgModuleCache.clear();
    }
    _createCompiledHostTemplate(compType, ngModule) {
        if (!ngModule) {
            throw new Error(`Component ${stringify(compType)} is not part of any NgModule or the module has not been imported into your module.`);
        }
        let compiledTemplate = this._compiledHostTemplateCache.get(compType);
        if (!compiledTemplate) {
            const compMeta = this._metadataResolver.getDirectiveMetadata(compType);
            assertComponent(compMeta);
            const hostMeta = this._metadataResolver.getHostComponentMetadata(compMeta, compMeta.componentFactory.viewDefFactory);
            compiledTemplate =
                new CompiledTemplate(true, compMeta.type, hostMeta, ngModule, [compMeta.type]);
            this._compiledHostTemplateCache.set(compType, compiledTemplate);
        }
        return compiledTemplate;
    }
    _createCompiledTemplate(compMeta, ngModule) {
        let compiledTemplate = this._compiledTemplateCache.get(compMeta.type.reference);
        if (!compiledTemplate) {
            assertComponent(compMeta);
            compiledTemplate = new CompiledTemplate(false, compMeta.type, compMeta, ngModule, ngModule.transitiveModule.directives);
            this._compiledTemplateCache.set(compMeta.type.reference, compiledTemplate);
        }
        return compiledTemplate;
    }
    _compileTemplate(template) {
        if (template.isCompiled) {
            return;
        }
        const compMeta = template.compMeta;
        const externalStylesheetsByModuleUrl = new Map();
        const outputContext = createOutputContext();
        const componentStylesheet = this._styleCompiler.compileComponent(outputContext, compMeta);
        compMeta.template.externalStylesheets.forEach((stylesheetMeta) => {
            const compiledStylesheet = this._styleCompiler.compileStyles(createOutputContext(), compMeta, stylesheetMeta);
            externalStylesheetsByModuleUrl.set(stylesheetMeta.moduleUrl, compiledStylesheet);
        });
        this._resolveStylesCompileResult(componentStylesheet, externalStylesheetsByModuleUrl);
        const pipes = template.ngModule.transitiveModule.pipes.map(pipe => this._metadataResolver.getPipeSummary(pipe.reference));
        const { template: parsedTemplate, pipes: usedPipes } = this._parseTemplate(compMeta, template.ngModule, template.directives);
        const compileResult = this._viewCompiler.compileComponent(outputContext, compMeta, parsedTemplate, ir.variable(componentStylesheet.stylesVar), usedPipes);
        const evalResult = this._interpretOrJit(templateJitUrl(template.ngModule.type, template.compMeta), outputContext.statements);
        const viewClass = evalResult[compileResult.viewClassVar];
        const rendererType = evalResult[compileResult.rendererTypeVar];
        template.compiled(viewClass, rendererType);
    }
    _parseTemplate(compMeta, ngModule, directiveIdentifiers) {
        // Note: ! is ok here as components always have a template.
        const preserveWhitespaces = compMeta.template.preserveWhitespaces;
        const directives = directiveIdentifiers.map(dir => this._metadataResolver.getDirectiveSummary(dir.reference));
        const pipes = ngModule.transitiveModule.pipes.map(pipe => this._metadataResolver.getPipeSummary(pipe.reference));
        return this._templateParser.parse(compMeta, compMeta.template.htmlAst, directives, pipes, ngModule.schemas, templateSourceUrl(ngModule.type, compMeta, compMeta.template), preserveWhitespaces);
    }
    _resolveStylesCompileResult(result, externalStylesheetsByModuleUrl) {
        result.dependencies.forEach((dep, i) => {
            const nestedCompileResult = externalStylesheetsByModuleUrl.get(dep.moduleUrl);
            const nestedStylesArr = this._resolveAndEvalStylesCompileResult(nestedCompileResult, externalStylesheetsByModuleUrl);
            dep.setValue(nestedStylesArr);
        });
    }
    _resolveAndEvalStylesCompileResult(result, externalStylesheetsByModuleUrl) {
        this._resolveStylesCompileResult(result, externalStylesheetsByModuleUrl);
        return this._interpretOrJit(sharedStylesheetJitUrl(result.meta, this._sharedStylesheetCount++), result.outputCtx.statements)[result.stylesVar];
    }
    _interpretOrJit(sourceUrl, statements) {
        if (!this._compilerConfig.useJit) {
            return interpretStatements(statements, this._reflector);
        }
        else {
            return jitStatements(sourceUrl, statements, this._reflector, this._compilerConfig.jitDevMode);
        }
    }
}
class CompiledTemplate {
    constructor(isHost, compType, compMeta, ngModule, directives) {
        this.isHost = isHost;
        this.compType = compType;
        this.compMeta = compMeta;
        this.ngModule = ngModule;
        this.directives = directives;
        this._viewClass = null;
        this.isCompiled = false;
    }
    compiled(viewClass, rendererType) {
        this._viewClass = viewClass;
        this.compMeta.componentViewType.setDelegate(viewClass);
        for (let prop in rendererType) {
            this.compMeta.rendererType[prop] = rendererType[prop];
        }
        this.isCompiled = true;
    }
}
function assertComponent(meta) {
    if (!meta.isComponent) {
        throw new Error(`Could not compile '${identifierName(meta.type)}' because it is not a component.`);
    }
}
function createOutputContext() {
    const importExpr = (symbol) => ir.importExpr({ name: identifierName(symbol), moduleName: null, runtime: symbol });
    return { statements: [], genFilePath: '', importExpr, constantPool: new ConstantPool() };
}
//# sourceMappingURL=compiler.js.map