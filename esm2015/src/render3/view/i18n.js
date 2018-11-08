/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** I18n separators for metadata **/
const I18N_MEANING_SEPARATOR = '|';
const I18N_ID_SEPARATOR = '@@';
/** Name of the i18n attributes **/
export const I18N_ATTR = 'i18n';
export const I18N_ATTR_PREFIX = 'i18n-';
/** Placeholder wrapper for i18n expressions **/
export const I18N_PLACEHOLDER_SYMBOL = '�';
// Parse i18n metas like:
// - "@@id",
// - "description[@@id]",
// - "meaning|description[@@id]"
export function parseI18nMeta(meta) {
    let id;
    let meaning;
    let description;
    if (meta) {
        const idIndex = meta.indexOf(I18N_ID_SEPARATOR);
        const descIndex = meta.indexOf(I18N_MEANING_SEPARATOR);
        let meaningAndDesc;
        [meaningAndDesc, id] =
            (idIndex > -1) ? [meta.slice(0, idIndex), meta.slice(idIndex + 2)] : [meta, ''];
        [meaning, description] = (descIndex > -1) ?
            [meaningAndDesc.slice(0, descIndex), meaningAndDesc.slice(descIndex + 1)] :
            ['', meaningAndDesc];
    }
    return { id, meaning, description };
}
export function isI18NAttribute(name) {
    return name === I18N_ATTR || name.startsWith(I18N_ATTR_PREFIX);
}
export function wrapI18nPlaceholder(content, contextId = 0) {
    const blockId = contextId > 0 ? `:${contextId}` : '';
    return `${I18N_PLACEHOLDER_SYMBOL}${content}${blockId}${I18N_PLACEHOLDER_SYMBOL}`;
}
export function assembleI18nBoundString(strings, bindingStartIndex = 0, contextId = 0) {
    if (!strings.length)
        return '';
    let acc = '';
    const lastIdx = strings.length - 1;
    for (let i = 0; i < lastIdx; i++) {
        acc += `${strings[i]}${wrapI18nPlaceholder(bindingStartIndex + i, contextId)}`;
    }
    acc += strings[lastIdx];
    return acc;
}
function getSeqNumberGenerator(startsAt = 0) {
    let current = startsAt;
    return () => current++;
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
export class I18nContext {
    constructor(index, templateIndex, ref, level = 0, uniqueIdGen) {
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
    wrap(symbol, elementIndex, contextId, closed) {
        const state = closed ? '/' : '';
        return wrapI18nPlaceholder(`${state}${symbol}${elementIndex}`, contextId);
    }
    append(content) { this.content += content; }
    genTemplatePattern(contextId, templateId) {
        return wrapI18nPlaceholder(`tmpl:${contextId}:${templateId}`);
    }
    getId() { return this.id; }
    getRef() { return this.ref; }
    getIndex() { return this.index; }
    getContent() { return this.content; }
    getTemplateIndex() { return this.templateIndex; }
    getBindings() { return this.bindings; }
    appendBinding(binding) { this.bindings.add(binding); }
    isRoot() { return this.level === 0; }
    isResolved() {
        const regex = new RegExp(this.genTemplatePattern('\\d+', '\\d+'));
        return !regex.test(this.content);
    }
    appendText(content) { this.append(content.trim()); }
    appendTemplate(index) { this.append(this.genTemplatePattern(this.id, index)); }
    appendElement(elementIndex, closed) {
        this.append(this.wrap('#', elementIndex, this.id, closed));
    }
    forkChildContext(index, templateIndex) {
        return new I18nContext(index, templateIndex, this.ref, this.level + 1, this.uniqueIdGen);
    }
    reconcileChildContext(context) {
        const id = context.getId();
        const content = context.getContent();
        const templateIndex = context.getTemplateIndex();
        const pattern = new RegExp(this.genTemplatePattern(this.id, templateIndex));
        const replacement = `${this.wrap('*', templateIndex, id)}${content}${this.wrap('*', templateIndex, id, true)}`;
        this.content = this.content.replace(pattern, replacement);
    }
}
//# sourceMappingURL=i18n.js.map