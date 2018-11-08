/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const STRIP_SRC_FILE_SUFFIXES = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
const GENERATED_FILE = /\.ngfactory\.|\.ngsummary\./;
const JIT_SUMMARY_FILE = /\.ngsummary\./;
const JIT_SUMMARY_NAME = /NgSummary$/;
export function ngfactoryFilePath(filePath, forceSourceFile = false) {
    const urlWithSuffix = splitTypescriptSuffix(filePath, forceSourceFile);
    return `${urlWithSuffix[0]}.ngfactory${normalizeGenFileSuffix(urlWithSuffix[1])}`;
}
export function stripGeneratedFileSuffix(filePath) {
    return filePath.replace(GENERATED_FILE, '.');
}
export function isGeneratedFile(filePath) {
    return GENERATED_FILE.test(filePath);
}
export function splitTypescriptSuffix(path, forceSourceFile = false) {
    if (path.endsWith('.d.ts')) {
        return [path.slice(0, -5), forceSourceFile ? '.ts' : '.d.ts'];
    }
    const lastDot = path.lastIndexOf('.');
    if (lastDot !== -1) {
        return [path.substring(0, lastDot), path.substring(lastDot)];
    }
    return [path, ''];
}
export function normalizeGenFileSuffix(srcFileSuffix) {
    return srcFileSuffix === '.tsx' ? '.ts' : srcFileSuffix;
}
export function summaryFileName(fileName) {
    const fileNameWithoutSuffix = fileName.replace(STRIP_SRC_FILE_SUFFIXES, '');
    return `${fileNameWithoutSuffix}.ngsummary.json`;
}
export function summaryForJitFileName(fileName, forceSourceFile = false) {
    const urlWithSuffix = splitTypescriptSuffix(stripGeneratedFileSuffix(fileName), forceSourceFile);
    return `${urlWithSuffix[0]}.ngsummary${urlWithSuffix[1]}`;
}
export function stripSummaryForJitFileSuffix(filePath) {
    return filePath.replace(JIT_SUMMARY_FILE, '.');
}
export function summaryForJitName(symbolName) {
    return `${symbolName}NgSummary`;
}
export function stripSummaryForJitNameSuffix(symbolName) {
    return symbolName.replace(JIT_SUMMARY_NAME, '');
}
const LOWERED_SYMBOL = /\u0275\d+/;
export function isLoweredSymbol(name) {
    return LOWERED_SYMBOL.test(name);
}
export function createLoweredSymbol(id) {
    return `\u0275${id}`;
}
//# sourceMappingURL=util.js.map