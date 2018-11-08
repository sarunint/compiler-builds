/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as o from './output_ast';
import { debugOutputAstAsTypeScript } from './ts_emitter';
export function interpretStatements(statements, reflector) {
    const ctx = new _ExecutionContext(null, null, null, new Map());
    const visitor = new StatementInterpreter(reflector);
    visitor.visitAllStatements(statements, ctx);
    const result = {};
    ctx.exports.forEach((exportName) => { result[exportName] = ctx.vars.get(exportName); });
    return result;
}
function _executeFunctionStatements(varNames, varValues, statements, ctx, visitor) {
    const childCtx = ctx.createChildWihtLocalVars();
    for (let i = 0; i < varNames.length; i++) {
        childCtx.vars.set(varNames[i], varValues[i]);
    }
    const result = visitor.visitAllStatements(statements, childCtx);
    return result ? result.value : null;
}
class _ExecutionContext {
    constructor(parent, instance, className, vars) {
        this.parent = parent;
        this.instance = instance;
        this.className = className;
        this.vars = vars;
        this.exports = [];
    }
    createChildWihtLocalVars() {
        return new _ExecutionContext(this, this.instance, this.className, new Map());
    }
}
class ReturnValue {
    constructor(value) {
        this.value = value;
    }
}
function createDynamicClass(_classStmt, _ctx, _visitor) {
    const propertyDescriptors = {};
    _classStmt.getters.forEach((getter) => {
        // Note: use `function` instead of arrow function to capture `this`
        propertyDescriptors[getter.name] = {
            configurable: false,
            get: function () {
                const instanceCtx = new _ExecutionContext(_ctx, this, _classStmt.name, _ctx.vars);
                return _executeFunctionStatements([], [], getter.body, instanceCtx, _visitor);
            }
        };
    });
    _classStmt.methods.forEach(function (method) {
        const paramNames = method.params.map(param => param.name);
        // Note: use `function` instead of arrow function to capture `this`
        propertyDescriptors[method.name] = {
            writable: false,
            configurable: false,
            value: function (...args) {
                const instanceCtx = new _ExecutionContext(_ctx, this, _classStmt.name, _ctx.vars);
                return _executeFunctionStatements(paramNames, args, method.body, instanceCtx, _visitor);
            }
        };
    });
    const ctorParamNames = _classStmt.constructorMethod.params.map(param => param.name);
    // Note: use `function` instead of arrow function to capture `this`
    const ctor = function (...args) {
        const instanceCtx = new _ExecutionContext(_ctx, this, _classStmt.name, _ctx.vars);
        _classStmt.fields.forEach((field) => { this[field.name] = undefined; });
        _executeFunctionStatements(ctorParamNames, args, _classStmt.constructorMethod.body, instanceCtx, _visitor);
    };
    const superClass = _classStmt.parent ? _classStmt.parent.visitExpression(_visitor, _ctx) : Object;
    ctor.prototype = Object.create(superClass.prototype, propertyDescriptors);
    return ctor;
}
class StatementInterpreter {
    constructor(reflector) {
        this.reflector = reflector;
    }
    debugAst(ast) { return debugOutputAstAsTypeScript(ast); }
    visitDeclareVarStmt(stmt, ctx) {
        const initialValue = stmt.value ? stmt.value.visitExpression(this, ctx) : undefined;
        ctx.vars.set(stmt.name, initialValue);
        if (stmt.hasModifier(o.StmtModifier.Exported)) {
            ctx.exports.push(stmt.name);
        }
        return null;
    }
    visitWriteVarExpr(expr, ctx) {
        const value = expr.value.visitExpression(this, ctx);
        let currCtx = ctx;
        while (currCtx != null) {
            if (currCtx.vars.has(expr.name)) {
                currCtx.vars.set(expr.name, value);
                return value;
            }
            currCtx = currCtx.parent;
        }
        throw new Error(`Not declared variable ${expr.name}`);
    }
    visitWrappedNodeExpr(ast, ctx) {
        throw new Error('Cannot interpret a WrappedNodeExpr.');
    }
    visitTypeofExpr(ast, ctx) {
        throw new Error('Cannot interpret a TypeofExpr');
    }
    visitReadVarExpr(ast, ctx) {
        let varName = ast.name;
        if (ast.builtin != null) {
            switch (ast.builtin) {
                case o.BuiltinVar.Super:
                    return ctx.instance.__proto__;
                case o.BuiltinVar.This:
                    return ctx.instance;
                case o.BuiltinVar.CatchError:
                    varName = CATCH_ERROR_VAR;
                    break;
                case o.BuiltinVar.CatchStack:
                    varName = CATCH_STACK_VAR;
                    break;
                default:
                    throw new Error(`Unknown builtin variable ${ast.builtin}`);
            }
        }
        let currCtx = ctx;
        while (currCtx != null) {
            if (currCtx.vars.has(varName)) {
                return currCtx.vars.get(varName);
            }
            currCtx = currCtx.parent;
        }
        throw new Error(`Not declared variable ${varName}`);
    }
    visitWriteKeyExpr(expr, ctx) {
        const receiver = expr.receiver.visitExpression(this, ctx);
        const index = expr.index.visitExpression(this, ctx);
        const value = expr.value.visitExpression(this, ctx);
        receiver[index] = value;
        return value;
    }
    visitWritePropExpr(expr, ctx) {
        const receiver = expr.receiver.visitExpression(this, ctx);
        const value = expr.value.visitExpression(this, ctx);
        receiver[expr.name] = value;
        return value;
    }
    visitInvokeMethodExpr(expr, ctx) {
        const receiver = expr.receiver.visitExpression(this, ctx);
        const args = this.visitAllExpressions(expr.args, ctx);
        let result;
        if (expr.builtin != null) {
            switch (expr.builtin) {
                case o.BuiltinMethod.ConcatArray:
                    result = receiver.concat(...args);
                    break;
                case o.BuiltinMethod.SubscribeObservable:
                    result = receiver.subscribe({ next: args[0] });
                    break;
                case o.BuiltinMethod.Bind:
                    result = receiver.bind(...args);
                    break;
                default:
                    throw new Error(`Unknown builtin method ${expr.builtin}`);
            }
        }
        else {
            result = receiver[expr.name].apply(receiver, args);
        }
        return result;
    }
    visitInvokeFunctionExpr(stmt, ctx) {
        const args = this.visitAllExpressions(stmt.args, ctx);
        const fnExpr = stmt.fn;
        if (fnExpr instanceof o.ReadVarExpr && fnExpr.builtin === o.BuiltinVar.Super) {
            ctx.instance.constructor.prototype.constructor.apply(ctx.instance, args);
            return null;
        }
        else {
            const fn = stmt.fn.visitExpression(this, ctx);
            return fn.apply(null, args);
        }
    }
    visitReturnStmt(stmt, ctx) {
        return new ReturnValue(stmt.value.visitExpression(this, ctx));
    }
    visitDeclareClassStmt(stmt, ctx) {
        const clazz = createDynamicClass(stmt, ctx, this);
        ctx.vars.set(stmt.name, clazz);
        if (stmt.hasModifier(o.StmtModifier.Exported)) {
            ctx.exports.push(stmt.name);
        }
        return null;
    }
    visitExpressionStmt(stmt, ctx) {
        return stmt.expr.visitExpression(this, ctx);
    }
    visitIfStmt(stmt, ctx) {
        const condition = stmt.condition.visitExpression(this, ctx);
        if (condition) {
            return this.visitAllStatements(stmt.trueCase, ctx);
        }
        else if (stmt.falseCase != null) {
            return this.visitAllStatements(stmt.falseCase, ctx);
        }
        return null;
    }
    visitTryCatchStmt(stmt, ctx) {
        try {
            return this.visitAllStatements(stmt.bodyStmts, ctx);
        }
        catch (e) {
            const childCtx = ctx.createChildWihtLocalVars();
            childCtx.vars.set(CATCH_ERROR_VAR, e);
            childCtx.vars.set(CATCH_STACK_VAR, e.stack);
            return this.visitAllStatements(stmt.catchStmts, childCtx);
        }
    }
    visitThrowStmt(stmt, ctx) {
        throw stmt.error.visitExpression(this, ctx);
    }
    visitCommentStmt(stmt, context) { return null; }
    visitJSDocCommentStmt(stmt, context) { return null; }
    visitInstantiateExpr(ast, ctx) {
        const args = this.visitAllExpressions(ast.args, ctx);
        const clazz = ast.classExpr.visitExpression(this, ctx);
        return new clazz(...args);
    }
    visitLiteralExpr(ast, ctx) { return ast.value; }
    visitExternalExpr(ast, ctx) {
        return this.reflector.resolveExternalReference(ast.value);
    }
    visitConditionalExpr(ast, ctx) {
        if (ast.condition.visitExpression(this, ctx)) {
            return ast.trueCase.visitExpression(this, ctx);
        }
        else if (ast.falseCase != null) {
            return ast.falseCase.visitExpression(this, ctx);
        }
        return null;
    }
    visitNotExpr(ast, ctx) {
        return !ast.condition.visitExpression(this, ctx);
    }
    visitAssertNotNullExpr(ast, ctx) {
        return ast.condition.visitExpression(this, ctx);
    }
    visitCastExpr(ast, ctx) {
        return ast.value.visitExpression(this, ctx);
    }
    visitFunctionExpr(ast, ctx) {
        const paramNames = ast.params.map((param) => param.name);
        return _declareFn(paramNames, ast.statements, ctx, this);
    }
    visitDeclareFunctionStmt(stmt, ctx) {
        const paramNames = stmt.params.map((param) => param.name);
        ctx.vars.set(stmt.name, _declareFn(paramNames, stmt.statements, ctx, this));
        if (stmt.hasModifier(o.StmtModifier.Exported)) {
            ctx.exports.push(stmt.name);
        }
        return null;
    }
    visitBinaryOperatorExpr(ast, ctx) {
        const lhs = () => ast.lhs.visitExpression(this, ctx);
        const rhs = () => ast.rhs.visitExpression(this, ctx);
        switch (ast.operator) {
            case o.BinaryOperator.Equals:
                return lhs() == rhs();
            case o.BinaryOperator.Identical:
                return lhs() === rhs();
            case o.BinaryOperator.NotEquals:
                return lhs() != rhs();
            case o.BinaryOperator.NotIdentical:
                return lhs() !== rhs();
            case o.BinaryOperator.And:
                return lhs() && rhs();
            case o.BinaryOperator.Or:
                return lhs() || rhs();
            case o.BinaryOperator.Plus:
                return lhs() + rhs();
            case o.BinaryOperator.Minus:
                return lhs() - rhs();
            case o.BinaryOperator.Divide:
                return lhs() / rhs();
            case o.BinaryOperator.Multiply:
                return lhs() * rhs();
            case o.BinaryOperator.Modulo:
                return lhs() % rhs();
            case o.BinaryOperator.Lower:
                return lhs() < rhs();
            case o.BinaryOperator.LowerEquals:
                return lhs() <= rhs();
            case o.BinaryOperator.Bigger:
                return lhs() > rhs();
            case o.BinaryOperator.BiggerEquals:
                return lhs() >= rhs();
            default:
                throw new Error(`Unknown operator ${ast.operator}`);
        }
    }
    visitReadPropExpr(ast, ctx) {
        let result;
        const receiver = ast.receiver.visitExpression(this, ctx);
        result = receiver[ast.name];
        return result;
    }
    visitReadKeyExpr(ast, ctx) {
        const receiver = ast.receiver.visitExpression(this, ctx);
        const prop = ast.index.visitExpression(this, ctx);
        return receiver[prop];
    }
    visitLiteralArrayExpr(ast, ctx) {
        return this.visitAllExpressions(ast.entries, ctx);
    }
    visitLiteralMapExpr(ast, ctx) {
        const result = {};
        ast.entries.forEach(entry => result[entry.key] = entry.value.visitExpression(this, ctx));
        return result;
    }
    visitCommaExpr(ast, context) {
        const values = this.visitAllExpressions(ast.parts, context);
        return values[values.length - 1];
    }
    visitAllExpressions(expressions, ctx) {
        return expressions.map((expr) => expr.visitExpression(this, ctx));
    }
    visitAllStatements(statements, ctx) {
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            const val = stmt.visitStatement(this, ctx);
            if (val instanceof ReturnValue) {
                return val;
            }
        }
        return null;
    }
}
function _declareFn(varNames, statements, ctx, visitor) {
    return (...args) => _executeFunctionStatements(varNames, args, statements, ctx, visitor);
}
const CATCH_ERROR_VAR = 'error';
const CATCH_STACK_VAR = 'stack';
//# sourceMappingURL=output_interpreter.js.map