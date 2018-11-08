/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { ParseError } from '../parse_util';
import * as html from './ast';
// http://cldr.unicode.org/index/cldr-spec/plural-rules
var PLURAL_CASES = ['zero', 'one', 'two', 'few', 'many', 'other'];
/**
 * Expands special forms into elements.
 *
 * For example,
 *
 * ```
 * { messages.length, plural,
 *   =0 {zero}
 *   =1 {one}
 *   other {more than one}
 * }
 * ```
 *
 * will be expanded into
 *
 * ```
 * <ng-container [ngPlural]="messages.length">
 *   <ng-template ngPluralCase="=0">zero</ng-template>
 *   <ng-template ngPluralCase="=1">one</ng-template>
 *   <ng-template ngPluralCase="other">more than one</ng-template>
 * </ng-container>
 * ```
 */
export function expandNodes(nodes) {
    var expander = new _Expander();
    return new ExpansionResult(html.visitAll(expander, nodes), expander.isExpanded, expander.errors);
}
var ExpansionResult = /** @class */ (function () {
    function ExpansionResult(nodes, expanded, errors) {
        this.nodes = nodes;
        this.expanded = expanded;
        this.errors = errors;
    }
    return ExpansionResult;
}());
export { ExpansionResult };
var ExpansionError = /** @class */ (function (_super) {
    tslib_1.__extends(ExpansionError, _super);
    function ExpansionError(span, errorMsg) {
        return _super.call(this, span, errorMsg) || this;
    }
    return ExpansionError;
}(ParseError));
export { ExpansionError };
/**
 * Expand expansion forms (plural, select) to directives
 *
 * @internal
 */
var _Expander = /** @class */ (function () {
    function _Expander() {
        this.isExpanded = false;
        this.errors = [];
    }
    _Expander.prototype.visitElement = function (element, context) {
        return new html.Element(element.name, element.attrs, html.visitAll(this, element.children), element.sourceSpan, element.startSourceSpan, element.endSourceSpan);
    };
    _Expander.prototype.visitAttribute = function (attribute, context) { return attribute; };
    _Expander.prototype.visitText = function (text, context) { return text; };
    _Expander.prototype.visitComment = function (comment, context) { return comment; };
    _Expander.prototype.visitExpansion = function (icu, context) {
        this.isExpanded = true;
        return icu.type == 'plural' ? _expandPluralForm(icu, this.errors) :
            _expandDefaultForm(icu, this.errors);
    };
    _Expander.prototype.visitExpansionCase = function (icuCase, context) {
        throw new Error('Should not be reached');
    };
    return _Expander;
}());
// Plural forms are expanded to `NgPlural` and `NgPluralCase`s
function _expandPluralForm(ast, errors) {
    var children = ast.cases.map(function (c) {
        if (PLURAL_CASES.indexOf(c.value) == -1 && !c.value.match(/^=\d+$/)) {
            errors.push(new ExpansionError(c.valueSourceSpan, "Plural cases should be \"=<number>\" or one of " + PLURAL_CASES.join(", ")));
        }
        var expansionResult = expandNodes(c.expression);
        errors.push.apply(errors, expansionResult.errors);
        return new html.Element("ng-template", [new html.Attribute('ngPluralCase', "" + c.value, c.valueSourceSpan)], expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
    });
    var switchAttr = new html.Attribute('[ngPlural]', ast.switchValue, ast.switchValueSourceSpan);
    return new html.Element('ng-container', [switchAttr], children, ast.sourceSpan, ast.sourceSpan, ast.sourceSpan);
}
// ICU messages (excluding plural form) are expanded to `NgSwitch`  and `NgSwitchCase`s
function _expandDefaultForm(ast, errors) {
    var children = ast.cases.map(function (c) {
        var expansionResult = expandNodes(c.expression);
        errors.push.apply(errors, expansionResult.errors);
        if (c.value === 'other') {
            // other is the default case when no values match
            return new html.Element("ng-template", [new html.Attribute('ngSwitchDefault', '', c.valueSourceSpan)], expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
        }
        return new html.Element("ng-template", [new html.Attribute('ngSwitchCase', "" + c.value, c.valueSourceSpan)], expansionResult.nodes, c.sourceSpan, c.sourceSpan, c.sourceSpan);
    });
    var switchAttr = new html.Attribute('[ngSwitch]', ast.switchValue, ast.switchValueSourceSpan);
    return new html.Element('ng-container', [switchAttr], children, ast.sourceSpan, ast.sourceSpan, ast.sourceSpan);
}
//# sourceMappingURL=icu_ast_expander.js.map