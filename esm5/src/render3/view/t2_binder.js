/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { ImplicitReceiver, RecursiveAstVisitor } from '../../expression_parser/ast';
import { CssSelector } from '../../selector';
import { Template } from '../r3_ast';
import { getAttrsForDirectiveMatching } from './util';
/**
 * Processes `Target`s with a given set of directives and performs a binding operation, which
 * returns an object similar to TypeScript's `ts.TypeChecker` that contains knowledge about the
 * target.
 */
var R3TargetBinder = /** @class */ (function () {
    function R3TargetBinder(directiveMatcher) {
        this.directiveMatcher = directiveMatcher;
    }
    /**
     * Perform a binding operation on the given `Target` and return a `BoundTarget` which contains
     * metadata about the types referenced in the template.
     */
    R3TargetBinder.prototype.bind = function (target) {
        if (!target.template) {
            // TODO(alxhub): handle targets which contain things like HostBindings, etc.
            throw new Error('Binding without a template not yet supported');
        }
        // First, parse the template into a `Scope` structure. This operation captures the syntactic
        // scopes in the template and makes them available for later use.
        var scope = Scope.apply(target.template);
        // Next, perform directive matching on the template using the `DirectiveBinder`. This returns:
        //   - directives: Map of nodes (elements & ng-templates) to the directives on them.
        //   - bindings: Map of inputs, outputs, and attributes to the directive/element that claims
        //     them. TODO(alxhub): handle multiple directives claiming an input/output/etc.
        //   - references: Map of #references to their targets.
        var _a = DirectiveBinder.apply(target.template, this.directiveMatcher), directives = _a.directives, bindings = _a.bindings, references = _a.references;
        // Finally, run the TemplateBinder to bind references, variables, and other entities within the
        // template. This extracts all the metadata that doesn't depend on directive matching.
        var _b = TemplateBinder.apply(target.template, scope), expressions = _b.expressions, symbols = _b.symbols, nestingLevel = _b.nestingLevel;
        return new R3BoundTarget(target, directives, bindings, references, expressions, symbols, nestingLevel);
    };
    return R3TargetBinder;
}());
export { R3TargetBinder };
/**
 * Represents a binding scope within a template.
 *
 * Any variables, references, or other named entities declared within the template will
 * be captured and available by name in `namedEntities`. Additionally, child templates will
 * be analyzed and have their child `Scope`s available in `childScopes`.
 */
var Scope = /** @class */ (function () {
    function Scope(parentScope) {
        this.parentScope = parentScope;
        /**
         * Named members of the `Scope`, such as `Reference`s or `Variable`s.
         */
        this.namedEntities = new Map();
        /**
         * Child `Scope`s for immediately nested `Template`s.
         */
        this.childScopes = new Map();
    }
    /**
     * Process a template (either as a `Template` sub-template with variables, or a plain array of
     * template `Node`s) and construct its `Scope`.
     */
    Scope.apply = function (template) {
        var scope = new Scope();
        scope.ingest(template);
        return scope;
    };
    /**
     * Internal method to process the template and populate the `Scope`.
     */
    Scope.prototype.ingest = function (template) {
        var _this = this;
        if (template instanceof Template) {
            // Variables on an <ng-template> are defined in the inner scope.
            template.variables.forEach(function (node) { return _this.visitVariable(node); });
            // Process the nodes of the template.
            template.children.forEach(function (node) { return node.visit(_this); });
        }
        else {
            // No overarching `Template` instance, so process the nodes directly.
            template.forEach(function (node) { return node.visit(_this); });
        }
    };
    Scope.prototype.visitElement = function (element) {
        var _this = this;
        // `Element`s in the template may have `Reference`s which are captured in the scope.
        element.references.forEach(function (node) { return _this.visitReference(node); });
        // Recurse into the `Element`'s children.
        element.children.forEach(function (node) { return node.visit(_this); });
    };
    Scope.prototype.visitTemplate = function (template) {
        var _this = this;
        // References on a <ng-template> are defined in the outer scope, so capture them before
        // processing the template's child scope.
        template.references.forEach(function (node) { return _this.visitReference(node); });
        // Next, create an inner scope and process the template within it.
        var scope = new Scope(this);
        scope.ingest(template);
        this.childScopes.set(template, scope);
    };
    Scope.prototype.visitVariable = function (variable) {
        // Declare the variable if it's not already.
        this.maybeDeclare(variable);
    };
    Scope.prototype.visitReference = function (reference) {
        // Declare the variable if it's not already.
        this.maybeDeclare(reference);
    };
    // Unused visitors.
    Scope.prototype.visitContent = function (content) { };
    Scope.prototype.visitBoundAttribute = function (attr) { };
    Scope.prototype.visitBoundEvent = function (event) { };
    Scope.prototype.visitBoundText = function (text) { };
    Scope.prototype.visitText = function (text) { };
    Scope.prototype.visitTextAttribute = function (attr) { };
    Scope.prototype.maybeDeclare = function (thing) {
        // Declare something with a name, as long as that name isn't taken.
        if (!this.namedEntities.has(thing.name)) {
            this.namedEntities.set(thing.name, thing);
        }
    };
    /**
     * Look up a variable within this `Scope`.
     *
     * This can recurse into a parent `Scope` if it's available.
     */
    Scope.prototype.lookup = function (name) {
        if (this.namedEntities.has(name)) {
            // Found in the local scope.
            return this.namedEntities.get(name);
        }
        else if (this.parentScope !== undefined) {
            // Not in the local scope, but there's a parent scope so check there.
            return this.parentScope.lookup(name);
        }
        else {
            // At the top level and it wasn't found.
            return null;
        }
    };
    /**
     * Get the child scope for a `Template`.
     *
     * This should always be defined.
     */
    Scope.prototype.getChildScope = function (template) {
        var res = this.childScopes.get(template);
        if (res === undefined) {
            throw new Error("Assertion error: child scope for " + template + " not found");
        }
        return res;
    };
    return Scope;
}());
/**
 * Processes a template and matches directives on nodes (elements and templates).
 *
 * Usually used via the static `apply()` method.
 */
var DirectiveBinder = /** @class */ (function () {
    function DirectiveBinder(matcher, directives, bindings, references) {
        this.matcher = matcher;
        this.directives = directives;
        this.bindings = bindings;
        this.references = references;
    }
    /**
     * Process a template (list of `Node`s) and perform directive matching against each node.
     *
     * @param template the list of template `Node`s to match (recursively).
     * @param selectorMatcher a `SelectorMatcher` containing the directives that are in scope for
     * this template.
     * @returns three maps which contain information about directives in the template: the
     * `directives` map which lists directives matched on each node, the `bindings` map which
     * indicates which directives claimed which bindings (inputs, outputs, etc), and the `references`
     * map which resolves #references (`Reference`s) within the template to the named directive or
     * template node.
     */
    DirectiveBinder.apply = function (template, selectorMatcher) {
        var directives = new Map();
        var bindings = new Map();
        var references = new Map();
        var matcher = new DirectiveBinder(selectorMatcher, directives, bindings, references);
        matcher.ingest(template);
        return { directives: directives, bindings: bindings, references: references };
    };
    DirectiveBinder.prototype.ingest = function (template) {
        var _this = this;
        template.forEach(function (node) { return node.visit(_this); });
    };
    DirectiveBinder.prototype.visitElement = function (element) { this.visitElementOrTemplate(element.name, element); };
    DirectiveBinder.prototype.visitTemplate = function (template) { this.visitElementOrTemplate('ng-template', template); };
    DirectiveBinder.prototype.visitElementOrTemplate = function (tag, node) {
        var _this = this;
        // First, determine the HTML shape of the node for the purpose of directive matching.
        // Do this by building up a `CssSelector` for the node.
        var cssSelector = new CssSelector();
        cssSelector.setElement(tag);
        // Add attributes to the CSS selector.
        var attrs = getAttrsForDirectiveMatching(node);
        Object.getOwnPropertyNames(attrs).forEach(function (name) {
            var value = attrs[name];
            cssSelector.addAttribute(name, value);
            // Treat the 'class' attribute specially.
            if (name.toLowerCase() === 'class') {
                var classes = value.trim().split(/\s+/g);
                classes.forEach(function (className) { return cssSelector.addClassName(className); });
            }
        });
        // Next, use the `SelectorMatcher` to get the list of directives on the node.
        var directives = [];
        this.matcher.match(cssSelector, function (_, directive) { return directives.push(directive); });
        if (directives.length > 0) {
            this.directives.set(node, directives);
        }
        // Resolve any references that are created on this node.
        node.references.forEach(function (ref) {
            var dirTarget = null;
            // If the reference expression is empty, then it matches the "primary" directive on the node
            // (if there is one). Otherwise it matches the host node itself (either an element or
            // <ng-template> node).
            if (ref.value.trim() === '') {
                // This could be a reference to a component if there is one.
                dirTarget = directives.find(function (dir) { return dir.isComponent; }) || null;
            }
            else {
                // This is a reference to a directive exported via exportAs. One should exist.
                dirTarget = directives.find(function (dir) { return dir.exportAs === ref.value; }) || null;
                // Check if a matching directive was found, and error if it wasn't.
                if (dirTarget === null) {
                    // TODO(alxhub): Return an error value here that can be used for template validation.
                    throw new Error("Assertion error: failed to find directive with exportAs: " + ref.value);
                }
            }
            if (dirTarget !== null) {
                // This reference points to a directive.
                _this.references.set(ref, { directive: dirTarget, node: node });
            }
            else {
                // This reference points to the node itself.
                _this.references.set(ref, node);
            }
        });
        // Associate bindings on the node with directives or with the node itself.
        // Inputs:
        node.attributes.concat(node.inputs).forEach(function (binding) {
            var dir = directives.find(function (dir) { return dir.inputs.hasOwnProperty(binding.name); });
            if (dir !== undefined) {
                _this.bindings.set(binding, dir);
            }
            else {
                _this.bindings.set(binding, node);
            }
        });
        // Outputs:
        node.outputs.forEach(function (binding) {
            var dir = directives.find(function (dir) { return dir.outputs.hasOwnProperty(binding.name); });
            if (dir !== undefined) {
                _this.bindings.set(binding, dir);
            }
            else {
                _this.bindings.set(binding, node);
            }
        });
        // Recurse into the node's children.
        node.children.forEach(function (child) { return child.visit(_this); });
    };
    // Unused visitors.
    DirectiveBinder.prototype.visitContent = function (content) { };
    DirectiveBinder.prototype.visitVariable = function (variable) { };
    DirectiveBinder.prototype.visitReference = function (reference) { };
    DirectiveBinder.prototype.visitTextAttribute = function (attribute) { };
    DirectiveBinder.prototype.visitBoundAttribute = function (attribute) { };
    DirectiveBinder.prototype.visitBoundEvent = function (attribute) { };
    DirectiveBinder.prototype.visitBoundAttributeOrEvent = function (node) { };
    DirectiveBinder.prototype.visitText = function (text) { };
    DirectiveBinder.prototype.visitBoundText = function (text) { };
    return DirectiveBinder;
}());
/**
 * Processes a template and extract metadata about expressions and symbols within.
 *
 * This is a companion to the `DirectiveBinder` that doesn't require knowledge of directives matched
 * within the template in order to operate.
 *
 * Expressions are visited by the superclass `RecursiveAstVisitor`, with custom logic provided
 * by overridden methods from that visitor.
 */
var TemplateBinder = /** @class */ (function (_super) {
    tslib_1.__extends(TemplateBinder, _super);
    function TemplateBinder(bindings, symbols, nestingLevel, scope, template, level) {
        var _this = _super.call(this) || this;
        _this.bindings = bindings;
        _this.symbols = symbols;
        _this.nestingLevel = nestingLevel;
        _this.scope = scope;
        _this.template = template;
        _this.level = level;
        // Save a bit of processing time by constructing this closure in advance.
        _this.visitNode = function (node) { return node.visit(_this); };
        return _this;
    }
    /**
     * Process a template and extract metadata about expressions and symbols within.
     *
     * @param template the nodes of the template to process
     * @param scope the `Scope` of the template being processed.
     * @returns three maps which contain metadata about the template: `expressions` which interprets
     * special `AST` nodes in expressions as pointing to references or variables declared within the
     * template, `symbols` which maps those variables and references to the nested `Template` which
     * declares them, if any, and `nestingLevel` which associates each `Template` with a integer
     * nesting level (how many levels deep within the template structure the `Template` is), starting
     * at 1.
     */
    TemplateBinder.apply = function (template, scope) {
        var expressions = new Map();
        var symbols = new Map();
        var nestingLevel = new Map();
        // The top-level template has nesting level 0.
        var binder = new TemplateBinder(expressions, symbols, nestingLevel, scope, template instanceof Template ? template : null, 0);
        binder.ingest(template);
        return { expressions: expressions, symbols: symbols, nestingLevel: nestingLevel };
    };
    TemplateBinder.prototype.ingest = function (template) {
        if (template instanceof Template) {
            // For <ng-template>s, process inputs, outputs, variables, and child nodes. References were
            // processed in the scope of the containing template.
            template.inputs.forEach(this.visitNode);
            template.outputs.forEach(this.visitNode);
            template.variables.forEach(this.visitNode);
            template.children.forEach(this.visitNode);
            // Set the nesting level.
            this.nestingLevel.set(template, this.level);
        }
        else {
            // Visit each node from the top-level template.
            template.forEach(this.visitNode);
        }
    };
    TemplateBinder.prototype.visitElement = function (element) {
        // Vist the inputs, outputs, and children of the element.
        element.inputs.forEach(this.visitNode);
        element.outputs.forEach(this.visitNode);
        element.children.forEach(this.visitNode);
    };
    TemplateBinder.prototype.visitTemplate = function (template) {
        // First, visit the inputs, outputs of the template node.
        template.inputs.forEach(this.visitNode);
        template.outputs.forEach(this.visitNode);
        // References are also evaluated in the outer context.
        template.references.forEach(this.visitNode);
        // Next, recurse into the template using its scope, and bumping the nesting level up by one.
        var childScope = this.scope.getChildScope(template);
        var binder = new TemplateBinder(this.bindings, this.symbols, this.nestingLevel, childScope, template, this.level + 1);
        binder.ingest(template);
    };
    TemplateBinder.prototype.visitVariable = function (variable) {
        // Register the `Variable` as a symbol in the current `Template`.
        if (this.template !== null) {
            this.symbols.set(variable, this.template);
        }
    };
    TemplateBinder.prototype.visitReference = function (reference) {
        // Register the `Reference` as a symbol in the current `Template`.
        if (this.template !== null) {
            this.symbols.set(reference, this.template);
        }
    };
    // Unused template visitors
    TemplateBinder.prototype.visitText = function (text) { };
    TemplateBinder.prototype.visitContent = function (content) { };
    TemplateBinder.prototype.visitTextAttribute = function (attribute) { };
    // The remaining visitors are concerned with processing AST expressions within template bindings
    TemplateBinder.prototype.visitBoundAttribute = function (attribute) { attribute.value.visit(this); };
    TemplateBinder.prototype.visitBoundEvent = function (event) { event.handler.visit(this); };
    TemplateBinder.prototype.visitBoundText = function (text) { text.value.visit(this); };
    // These five types of AST expressions can refer to expression roots, which could be variables
    // or references in the current scope.
    TemplateBinder.prototype.visitPropertyRead = function (ast, context) {
        this.maybeMap(context, ast, ast.name);
        return _super.prototype.visitPropertyRead.call(this, ast, context);
    };
    TemplateBinder.prototype.visitSafePropertyRead = function (ast, context) {
        this.maybeMap(context, ast, ast.name);
        return _super.prototype.visitSafePropertyRead.call(this, ast, context);
    };
    TemplateBinder.prototype.visitPropertyWrite = function (ast, context) {
        this.maybeMap(context, ast, ast.name);
        return _super.prototype.visitPropertyWrite.call(this, ast, context);
    };
    TemplateBinder.prototype.visitMethodCall = function (ast, context) {
        this.maybeMap(context, ast, ast.name);
        return _super.prototype.visitMethodCall.call(this, ast, context);
    };
    TemplateBinder.prototype.visitSafeMethodCall = function (ast, context) {
        this.maybeMap(context, ast, ast.name);
        return _super.prototype.visitSafeMethodCall.call(this, ast, context);
    };
    TemplateBinder.prototype.maybeMap = function (scope, ast, name) {
        // If the receiver of the expression isn't the `ImplicitReceiver`, this isn't the root of an
        // `AST` expression that maps to a `Variable` or `Reference`.
        if (!(ast.receiver instanceof ImplicitReceiver)) {
            return;
        }
        // Check whether the name exists in the current scope. If so, map it. Otherwise, the name is
        // probably a property on the top-level component context.
        var target = this.scope.lookup(name);
        if (target !== null) {
            this.bindings.set(ast, target);
        }
    };
    return TemplateBinder;
}(RecursiveAstVisitor));
/**
 * Metadata container for a `Target` that allows queries for specific bits of metadata.
 *
 * See `BoundTarget` for documentation on the individual methods.
 */
var R3BoundTarget = /** @class */ (function () {
    function R3BoundTarget(target, directives, bindings, references, exprTargets, symbols, nestingLevel) {
        this.target = target;
        this.directives = directives;
        this.bindings = bindings;
        this.references = references;
        this.exprTargets = exprTargets;
        this.symbols = symbols;
        this.nestingLevel = nestingLevel;
    }
    R3BoundTarget.prototype.getDirectivesOfNode = function (node) {
        return this.directives.get(node) || null;
    };
    R3BoundTarget.prototype.getReferenceTarget = function (ref) {
        return this.references.get(ref) || null;
    };
    R3BoundTarget.prototype.getConsumerOfBinding = function (binding) {
        return this.bindings.get(binding) || null;
    };
    R3BoundTarget.prototype.getExpressionTarget = function (expr) {
        return this.exprTargets.get(expr) || null;
    };
    R3BoundTarget.prototype.getTemplateOfSymbol = function (symbol) {
        return this.symbols.get(symbol) || null;
    };
    R3BoundTarget.prototype.getNestingLevel = function (template) { return this.nestingLevel.get(template) || 0; };
    R3BoundTarget.prototype.getUsedDirectives = function () {
        var set = new Set();
        this.directives.forEach(function (dirs) { return dirs.forEach(function (dir) { return set.add(dir); }); });
        return Array.from(set.values());
    };
    return R3BoundTarget;
}());
export { R3BoundTarget };
//# sourceMappingURL=t2_binder.js.map