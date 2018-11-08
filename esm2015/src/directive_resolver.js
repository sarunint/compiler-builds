/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createComponent, createContentChild, createContentChildren, createDirective, createHostBinding, createHostListener, createInput, createOutput, createViewChild, createViewChildren } from './core';
import { resolveForwardRef, splitAtColon, stringify } from './util';
const QUERY_METADATA_IDENTIFIERS = [
    createViewChild,
    createViewChildren,
    createContentChild,
    createContentChildren,
];
/*
 * Resolve a `Type` for {@link Directive}.
 *
 * This interface can be overridden by the application developer to create custom behavior.
 *
 * See {@link Compiler}
 */
export class DirectiveResolver {
    constructor(_reflector) {
        this._reflector = _reflector;
    }
    isDirective(type) {
        const typeMetadata = this._reflector.annotations(resolveForwardRef(type));
        return typeMetadata && typeMetadata.some(isDirectiveMetadata);
    }
    resolve(type, throwIfNotFound = true) {
        const typeMetadata = this._reflector.annotations(resolveForwardRef(type));
        if (typeMetadata) {
            const metadata = findLast(typeMetadata, isDirectiveMetadata);
            if (metadata) {
                const propertyMetadata = this._reflector.propMetadata(type);
                const guards = this._reflector.guards(type);
                return this._mergeWithPropertyMetadata(metadata, propertyMetadata, guards, type);
            }
        }
        if (throwIfNotFound) {
            throw new Error(`No Directive annotation found on ${stringify(type)}`);
        }
        return null;
    }
    _mergeWithPropertyMetadata(dm, propertyMetadata, guards, directiveType) {
        const inputs = [];
        const outputs = [];
        const host = {};
        const queries = {};
        Object.keys(propertyMetadata).forEach((propName) => {
            const input = findLast(propertyMetadata[propName], (a) => createInput.isTypeOf(a));
            if (input) {
                if (input.bindingPropertyName) {
                    inputs.push(`${propName}: ${input.bindingPropertyName}`);
                }
                else {
                    inputs.push(propName);
                }
            }
            const output = findLast(propertyMetadata[propName], (a) => createOutput.isTypeOf(a));
            if (output) {
                if (output.bindingPropertyName) {
                    outputs.push(`${propName}: ${output.bindingPropertyName}`);
                }
                else {
                    outputs.push(propName);
                }
            }
            const hostBindings = propertyMetadata[propName].filter(a => createHostBinding.isTypeOf(a));
            hostBindings.forEach(hostBinding => {
                if (hostBinding.hostPropertyName) {
                    const startWith = hostBinding.hostPropertyName[0];
                    if (startWith === '(') {
                        throw new Error(`@HostBinding can not bind to events. Use @HostListener instead.`);
                    }
                    else if (startWith === '[') {
                        throw new Error(`@HostBinding parameter should be a property name, 'class.<name>', or 'attr.<name>'.`);
                    }
                    host[`[${hostBinding.hostPropertyName}]`] = propName;
                }
                else {
                    host[`[${propName}]`] = propName;
                }
            });
            const hostListeners = propertyMetadata[propName].filter(a => createHostListener.isTypeOf(a));
            hostListeners.forEach(hostListener => {
                const args = hostListener.args || [];
                host[`(${hostListener.eventName})`] = `${propName}(${args.join(',')})`;
            });
            const query = findLast(propertyMetadata[propName], (a) => QUERY_METADATA_IDENTIFIERS.some(i => i.isTypeOf(a)));
            if (query) {
                queries[propName] = query;
            }
        });
        return this._merge(dm, inputs, outputs, host, queries, guards, directiveType);
    }
    _extractPublicName(def) { return splitAtColon(def, [null, def])[1].trim(); }
    _dedupeBindings(bindings) {
        const names = new Set();
        const publicNames = new Set();
        const reversedResult = [];
        // go last to first to allow later entries to overwrite previous entries
        for (let i = bindings.length - 1; i >= 0; i--) {
            const binding = bindings[i];
            const name = this._extractPublicName(binding);
            publicNames.add(name);
            if (!names.has(name)) {
                names.add(name);
                reversedResult.push(binding);
            }
        }
        return reversedResult.reverse();
    }
    _merge(directive, inputs, outputs, host, queries, guards, directiveType) {
        const mergedInputs = this._dedupeBindings(directive.inputs ? directive.inputs.concat(inputs) : inputs);
        const mergedOutputs = this._dedupeBindings(directive.outputs ? directive.outputs.concat(outputs) : outputs);
        const mergedHost = directive.host ? Object.assign({}, directive.host, host) : host;
        const mergedQueries = directive.queries ? Object.assign({}, directive.queries, queries) : queries;
        if (createComponent.isTypeOf(directive)) {
            const comp = directive;
            return createComponent({
                selector: comp.selector,
                inputs: mergedInputs,
                outputs: mergedOutputs,
                host: mergedHost,
                exportAs: comp.exportAs,
                moduleId: comp.moduleId,
                queries: mergedQueries,
                changeDetection: comp.changeDetection,
                providers: comp.providers,
                viewProviders: comp.viewProviders,
                entryComponents: comp.entryComponents,
                template: comp.template,
                templateUrl: comp.templateUrl,
                styles: comp.styles,
                styleUrls: comp.styleUrls,
                encapsulation: comp.encapsulation,
                animations: comp.animations,
                interpolation: comp.interpolation,
                preserveWhitespaces: directive.preserveWhitespaces,
            });
        }
        else {
            return createDirective({
                selector: directive.selector,
                inputs: mergedInputs,
                outputs: mergedOutputs,
                host: mergedHost,
                exportAs: directive.exportAs,
                queries: mergedQueries,
                providers: directive.providers, guards
            });
        }
    }
}
function isDirectiveMetadata(type) {
    return createDirective.isTypeOf(type) || createComponent.isTypeOf(type);
}
export function findLast(arr, condition) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (condition(arr[i])) {
            return arr[i];
        }
    }
    return null;
}
//# sourceMappingURL=directive_resolver.js.map