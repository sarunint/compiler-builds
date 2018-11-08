/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import * as o from './output/output_ast';
import { parseI18nMeta } from './render3/view/i18n';
import { error } from './util';
var CONSTANT_PREFIX = '_c';
// Closure variables holding messages must be named `MSG_[A-Z0-9]+`
var TRANSLATION_PREFIX = 'MSG_';
/**
 * Closure uses `goog.getMsg(message)` to lookup translations
 */
var GOOG_GET_MSG = 'goog.getMsg';
/**
 * Context to use when producing a key.
 *
 * This ensures we see the constant not the reference variable when producing
 * a key.
 */
var KEY_CONTEXT = {};
/**
 * A node that is a place-holder that allows the node to be replaced when the actual
 * node is known.
 *
 * This allows the constant pool to change an expression from a direct reference to
 * a constant to a shared constant. It returns a fix-up node that is later allowed to
 * change the referenced expression.
 */
var FixupExpression = /** @class */ (function (_super) {
    tslib_1.__extends(FixupExpression, _super);
    function FixupExpression(resolved) {
        var _this = _super.call(this, resolved.type) || this;
        _this.resolved = resolved;
        _this.original = resolved;
        return _this;
    }
    FixupExpression.prototype.visitExpression = function (visitor, context) {
        if (context === KEY_CONTEXT) {
            // When producing a key we want to traverse the constant not the
            // variable used to refer to it.
            return this.original.visitExpression(visitor, context);
        }
        else {
            return this.resolved.visitExpression(visitor, context);
        }
    };
    FixupExpression.prototype.isEquivalent = function (e) {
        return e instanceof FixupExpression && this.resolved.isEquivalent(e.resolved);
    };
    FixupExpression.prototype.isConstant = function () { return true; };
    FixupExpression.prototype.fixup = function (expression) {
        this.resolved = expression;
        this.shared = true;
    };
    return FixupExpression;
}(o.Expression));
/**
 * A constant pool allows a code emitter to share constant in an output context.
 *
 * The constant pool also supports sharing access to ivy definitions references.
 */
var ConstantPool = /** @class */ (function () {
    function ConstantPool() {
        this.statements = [];
        this.translations = new Map();
        this.deferredTranslations = new Map();
        this.literals = new Map();
        this.literalFactories = new Map();
        this.injectorDefinitions = new Map();
        this.directiveDefinitions = new Map();
        this.componentDefinitions = new Map();
        this.pipeDefinitions = new Map();
        this.nextNameIndex = 0;
    }
    ConstantPool.prototype.getConstLiteral = function (literal, forceShared) {
        if (literal instanceof o.LiteralExpr || literal instanceof FixupExpression) {
            // Do no put simple literals into the constant pool or try to produce a constant for a
            // reference to a constant.
            return literal;
        }
        var key = this.keyOf(literal);
        var fixup = this.literals.get(key);
        var newValue = false;
        if (!fixup) {
            fixup = new FixupExpression(literal);
            this.literals.set(key, fixup);
            newValue = true;
        }
        if ((!newValue && !fixup.shared) || (newValue && forceShared)) {
            // Replace the expression with a variable
            var name_1 = this.freshName();
            this.statements.push(o.variable(name_1).set(literal).toDeclStmt(o.INFERRED_TYPE, [o.StmtModifier.Final]));
            fixup.fixup(o.variable(name_1));
        }
        return fixup;
    };
    ConstantPool.prototype.getDeferredTranslationConst = function (suffix) {
        var index = this.statements.push(new o.ExpressionStatement(o.NULL_EXPR)) - 1;
        var variable = o.variable(this.freshTranslationName(suffix));
        this.deferredTranslations.set(variable, index);
        return variable;
    };
    ConstantPool.prototype.setDeferredTranslationConst = function (variable, message) {
        var index = this.deferredTranslations.get(variable);
        this.statements[index] = this.getTranslationDeclStmt(variable, message);
    };
    ConstantPool.prototype.getTranslationDeclStmt = function (variable, message) {
        var fnCall = o.variable(GOOG_GET_MSG).callFn([o.literal(message)]);
        return variable.set(fnCall).toDeclStmt(o.INFERRED_TYPE, [o.StmtModifier.Final]);
    };
    ConstantPool.prototype.appendTranslationMeta = function (meta) {
        var parsedMeta = typeof meta === 'string' ? parseI18nMeta(meta) : meta;
        var docStmt = i18nMetaToDocStmt(parsedMeta);
        if (docStmt) {
            this.statements.push(docStmt);
        }
    };
    // Generates closure specific code for translation.
    //
    // ```
    // /**
    //  * @desc description?
    //  * @meaning meaning?
    //  */
    // const MSG_XYZ = goog.getMsg('message');
    // ```
    ConstantPool.prototype.getTranslation = function (message, meta, suffix) {
        var parsedMeta = parseI18nMeta(meta);
        // The identity of an i18n message depends on the message and its meaning
        var key = parsedMeta.meaning ? message + "\0\0" + parsedMeta.meaning : message;
        var exp = this.translations.get(key);
        if (exp) {
            return exp;
        }
        var variable = o.variable(this.freshTranslationName(suffix));
        this.appendTranslationMeta(parsedMeta);
        this.statements.push(this.getTranslationDeclStmt(variable, message));
        this.translations.set(key, variable);
        return variable;
    };
    ConstantPool.prototype.getDefinition = function (type, kind, ctx, forceShared) {
        if (forceShared === void 0) { forceShared = false; }
        var definitions = this.definitionsOf(kind);
        var fixup = definitions.get(type);
        var newValue = false;
        if (!fixup) {
            var property = this.propertyNameOf(kind);
            fixup = new FixupExpression(ctx.importExpr(type).prop(property));
            definitions.set(type, fixup);
            newValue = true;
        }
        if ((!newValue && !fixup.shared) || (newValue && forceShared)) {
            var name_2 = this.freshName();
            this.statements.push(o.variable(name_2).set(fixup.resolved).toDeclStmt(o.INFERRED_TYPE, [o.StmtModifier.Final]));
            fixup.fixup(o.variable(name_2));
        }
        return fixup;
    };
    ConstantPool.prototype.getLiteralFactory = function (literal) {
        // Create a pure function that builds an array of a mix of constant  and variable expressions
        if (literal instanceof o.LiteralArrayExpr) {
            var argumentsForKey = literal.entries.map(function (e) { return e.isConstant() ? e : o.literal(null); });
            var key = this.keyOf(o.literalArr(argumentsForKey));
            return this._getLiteralFactory(key, literal.entries, function (entries) { return o.literalArr(entries); });
        }
        else {
            var expressionForKey = o.literalMap(literal.entries.map(function (e) { return ({
                key: e.key,
                value: e.value.isConstant() ? e.value : o.literal(null),
                quoted: e.quoted
            }); }));
            var key = this.keyOf(expressionForKey);
            return this._getLiteralFactory(key, literal.entries.map(function (e) { return e.value; }), function (entries) { return o.literalMap(entries.map(function (value, index) { return ({
                key: literal.entries[index].key,
                value: value,
                quoted: literal.entries[index].quoted
            }); })); });
        }
    };
    ConstantPool.prototype._getLiteralFactory = function (key, values, resultMap) {
        var _this = this;
        var literalFactory = this.literalFactories.get(key);
        var literalFactoryArguments = values.filter((function (e) { return !e.isConstant(); }));
        if (!literalFactory) {
            var resultExpressions = values.map(function (e, index) { return e.isConstant() ? _this.getConstLiteral(e, true) : o.variable("a" + index); });
            var parameters = resultExpressions.filter(isVariable).map(function (e) { return new o.FnParam(e.name, o.DYNAMIC_TYPE); });
            var pureFunctionDeclaration = o.fn(parameters, [new o.ReturnStatement(resultMap(resultExpressions))], o.INFERRED_TYPE);
            var name_3 = this.freshName();
            this.statements.push(o.variable(name_3).set(pureFunctionDeclaration).toDeclStmt(o.INFERRED_TYPE, [
                o.StmtModifier.Final
            ]));
            literalFactory = o.variable(name_3);
            this.literalFactories.set(key, literalFactory);
        }
        return { literalFactory: literalFactory, literalFactoryArguments: literalFactoryArguments };
    };
    /**
     * Produce a unique name.
     *
     * The name might be unique among different prefixes if any of the prefixes end in
     * a digit so the prefix should be a constant string (not based on user input) and
     * must not end in a digit.
     */
    ConstantPool.prototype.uniqueName = function (prefix) { return "" + prefix + this.nextNameIndex++; };
    ConstantPool.prototype.definitionsOf = function (kind) {
        switch (kind) {
            case 2 /* Component */:
                return this.componentDefinitions;
            case 1 /* Directive */:
                return this.directiveDefinitions;
            case 0 /* Injector */:
                return this.injectorDefinitions;
            case 3 /* Pipe */:
                return this.pipeDefinitions;
        }
        error("Unknown definition kind " + kind);
        return this.componentDefinitions;
    };
    ConstantPool.prototype.propertyNameOf = function (kind) {
        switch (kind) {
            case 2 /* Component */:
                return 'ngComponentDef';
            case 1 /* Directive */:
                return 'ngDirectiveDef';
            case 0 /* Injector */:
                return 'ngInjectorDef';
            case 3 /* Pipe */:
                return 'ngPipeDef';
        }
        error("Unknown definition kind " + kind);
        return '<unknown>';
    };
    ConstantPool.prototype.freshName = function () { return this.uniqueName(CONSTANT_PREFIX); };
    ConstantPool.prototype.freshTranslationName = function (suffix) {
        return this.uniqueName(TRANSLATION_PREFIX + suffix).toUpperCase();
    };
    ConstantPool.prototype.keyOf = function (expression) {
        return expression.visitExpression(new KeyVisitor(), KEY_CONTEXT);
    };
    return ConstantPool;
}());
export { ConstantPool };
/**
 * Visitor used to determine if 2 expressions are equivalent and can be shared in the
 * `ConstantPool`.
 *
 * When the id (string) generated by the visitor is equal, expressions are considered equivalent.
 */
var KeyVisitor = /** @class */ (function () {
    function KeyVisitor() {
        this.visitWrappedNodeExpr = invalid;
        this.visitWriteVarExpr = invalid;
        this.visitWriteKeyExpr = invalid;
        this.visitWritePropExpr = invalid;
        this.visitInvokeMethodExpr = invalid;
        this.visitInvokeFunctionExpr = invalid;
        this.visitInstantiateExpr = invalid;
        this.visitConditionalExpr = invalid;
        this.visitNotExpr = invalid;
        this.visitAssertNotNullExpr = invalid;
        this.visitCastExpr = invalid;
        this.visitFunctionExpr = invalid;
        this.visitBinaryOperatorExpr = invalid;
        this.visitReadPropExpr = invalid;
        this.visitReadKeyExpr = invalid;
        this.visitCommaExpr = invalid;
    }
    KeyVisitor.prototype.visitLiteralExpr = function (ast) {
        return "" + (typeof ast.value === 'string' ? '"' + ast.value + '"' : ast.value);
    };
    KeyVisitor.prototype.visitLiteralArrayExpr = function (ast, context) {
        var _this = this;
        return "[" + ast.entries.map(function (entry) { return entry.visitExpression(_this, context); }).join(',') + "]";
    };
    KeyVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
        var _this = this;
        var mapKey = function (entry) {
            var quote = entry.quoted ? '"' : '';
            return "" + quote + entry.key + quote;
        };
        var mapEntry = function (entry) {
            return mapKey(entry) + ":" + entry.value.visitExpression(_this, context);
        };
        return "{" + ast.entries.map(mapEntry).join(',');
    };
    KeyVisitor.prototype.visitExternalExpr = function (ast) {
        return ast.value.moduleName ? "EX:" + ast.value.moduleName + ":" + ast.value.name :
            "EX:" + ast.value.runtime.name;
    };
    KeyVisitor.prototype.visitReadVarExpr = function (node) { return "VAR:" + node.name; };
    KeyVisitor.prototype.visitTypeofExpr = function (node, context) {
        return "TYPEOF:" + node.expr.visitExpression(this, context);
    };
    return KeyVisitor;
}());
function invalid(arg) {
    throw new Error("Invalid state: Visitor " + this.constructor.name + " doesn't handle " + arg.constructor.name);
}
function isVariable(e) {
    return e instanceof o.ReadVarExpr;
}
// Converts i18n meta informations for a message (id, description, meaning)
// to a JsDoc statement formatted as expected by the Closure compiler.
function i18nMetaToDocStmt(meta) {
    var tags = [];
    if (meta.id || meta.description) {
        var text = meta.id ? "[BACKUP_MESSAGE_ID:" + meta.id + "] " + meta.description : meta.description;
        tags.push({ tagName: "desc" /* Desc */, text: text.trim() });
    }
    if (meta.meaning) {
        tags.push({ tagName: "meaning" /* Meaning */, text: meta.meaning });
    }
    return tags.length == 0 ? null : new o.JSDocCommentStmt(tags);
}
//# sourceMappingURL=constant_pool.js.map