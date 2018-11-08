/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** I18n separators for metadata **/
var I18N_MEANING_SEPARATOR = '|';
var I18N_ID_SEPARATOR = '@@';
/** Name of the i18n attributes **/
export var I18N_ATTR = 'i18n';
export var I18N_ATTR_PREFIX = 'i18n-';
/** Placeholder wrapper for i18n expressions **/
export var I18N_PLACEHOLDER_SYMBOL = '�';
// Parse i18n metas like:
// - "@@id",
// - "description[@@id]",
// - "meaning|description[@@id]"
export function parseI18nMeta(meta) {
    var _a, _b;
    var id;
    var meaning;
    var description;
    if (meta) {
        var idIndex = meta.indexOf(I18N_ID_SEPARATOR);
        var descIndex = meta.indexOf(I18N_MEANING_SEPARATOR);
        var meaningAndDesc = void 0;
        _a = (idIndex > -1) ? [meta.slice(0, idIndex), meta.slice(idIndex + 2)] : [meta, ''], meaningAndDesc = _a[0], id = _a[1];
        _b = (descIndex > -1) ?
            [meaningAndDesc.slice(0, descIndex), meaningAndDesc.slice(descIndex + 1)] :
            ['', meaningAndDesc], meaning = _b[0], description = _b[1];
    }
    return { id: id, meaning: meaning, description: description };
}
export function isI18NAttribute(name) {
    return name === I18N_ATTR || name.startsWith(I18N_ATTR_PREFIX);
}
export function wrapI18nPlaceholder(content, contextId) {
    if (contextId === void 0) { contextId = 0; }
    var blockId = contextId > 0 ? ":" + contextId : '';
    return "" + I18N_PLACEHOLDER_SYMBOL + content + blockId + I18N_PLACEHOLDER_SYMBOL;
}
export function assembleI18nBoundString(strings, bindingStartIndex, contextId) {
    if (bindingStartIndex === void 0) { bindingStartIndex = 0; }
    if (contextId === void 0) { contextId = 0; }
    if (!strings.length)
        return '';
    var acc = '';
    var lastIdx = strings.length - 1;
    for (var i = 0; i < lastIdx; i++) {
        acc += "" + strings[i] + wrapI18nPlaceholder(bindingStartIndex + i, contextId);
    }
    acc += strings[lastIdx];
    return acc;
}
function getSeqNumberGenerator(startsAt) {
    if (startsAt === void 0) { startsAt = 0; }
    var current = startsAt;
    return function () { return current++; };
}
/**
 * I18nContext is a helper class which keeps track of all i18n-related aspects
 * (accumulates content, bindings, etc) between i18nStart and i18nEnd instructions.
 *
 * When we enter a nested template, the top-level context is being passed down
 * to the nested component, which uses this context to generate a child instance
 * of I18nContext class (to handle nested template) and at the end, reconciles it back
 * with the parent context.
 */
var I18nContext = /** @class */ (function () {
    function I18nContext(index, templateIndex, ref, level, uniqueIdGen) {
        if (level === void 0) { level = 0; }
        this.index = index;
        this.templateIndex = templateIndex;
        this.ref = ref;
        this.level = level;
        this.uniqueIdGen = uniqueIdGen;
        this.content = '';
        this.bindings = new Set();
        this.uniqueIdGen = uniqueIdGen || getSeqNumberGenerator();
        this.id = this.uniqueIdGen();
    }
    I18nContext.prototype.wrap = function (symbol, elementIndex, contextId, closed) {
        var state = closed ? '/' : '';
        return wrapI18nPlaceholder("" + state + symbol + elementIndex, contextId);
    };
    I18nContext.prototype.append = function (content) { this.content += content; };
    I18nContext.prototype.genTemplatePattern = function (contextId, templateId) {
        return wrapI18nPlaceholder("tmpl:" + contextId + ":" + templateId);
    };
    I18nContext.prototype.getId = function () { return this.id; };
    I18nContext.prototype.getRef = function () { return this.ref; };
    I18nContext.prototype.getIndex = function () { return this.index; };
    I18nContext.prototype.getContent = function () { return this.content; };
    I18nContext.prototype.getTemplateIndex = function () { return this.templateIndex; };
    I18nContext.prototype.getBindings = function () { return this.bindings; };
    I18nContext.prototype.appendBinding = function (binding) { this.bindings.add(binding); };
    I18nContext.prototype.isRoot = function () { return this.level === 0; };
    I18nContext.prototype.isResolved = function () {
        var regex = new RegExp(this.genTemplatePattern('\\d+', '\\d+'));
        return !regex.test(this.content);
    };
    I18nContext.prototype.appendText = function (content) { this.append(content.trim()); };
    I18nContext.prototype.appendTemplate = function (index) { this.append(this.genTemplatePattern(this.id, index)); };
    I18nContext.prototype.appendElement = function (elementIndex, closed) {
        this.append(this.wrap('#', elementIndex, this.id, closed));
    };
    I18nContext.prototype.forkChildContext = function (index, templateIndex) {
        return new I18nContext(index, templateIndex, this.ref, this.level + 1, this.uniqueIdGen);
    };
    I18nContext.prototype.reconcileChildContext = function (context) {
        var id = context.getId();
        var content = context.getContent();
        var templateIndex = context.getTemplateIndex();
        var pattern = new RegExp(this.genTemplatePattern(this.id, templateIndex));
        var replacement = "" + this.wrap('*', templateIndex, id) + content + this.wrap('*', templateIndex, id, true);
        this.content = this.content.replace(pattern, replacement);
    };
    return I18nContext;
}());
export { I18nContext };
//# sourceMappingURL=i18n.js.map