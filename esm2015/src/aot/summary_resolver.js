/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { deserializeSummaries } from './summary_serializer';
import { stripGeneratedFileSuffix, summaryFileName } from './util';
export class AotSummaryResolver {
    constructor(host, staticSymbolCache) {
        this.host = host;
        this.staticSymbolCache = staticSymbolCache;
        // Note: this will only contain StaticSymbols without members!
        this.summaryCache = new Map();
        this.loadedFilePaths = new Map();
        // Note: this will only contain StaticSymbols without members!
        this.importAs = new Map();
        this.knownFileNameToModuleNames = new Map();
    }
    isLibraryFile(filePath) {
        // Note: We need to strip the .ngfactory. file path,
        // so this method also works for generated files
        // (for which host.isSourceFile will always return false).
        return !this.host.isSourceFile(stripGeneratedFileSuffix(filePath));
    }
    toSummaryFileName(filePath, referringSrcFileName) {
        return this.host.toSummaryFileName(filePath, referringSrcFileName);
    }
    fromSummaryFileName(fileName, referringLibFileName) {
        return this.host.fromSummaryFileName(fileName, referringLibFileName);
    }
    resolveSummary(staticSymbol) {
        const rootSymbol = staticSymbol.members.length ?
            this.staticSymbolCache.get(staticSymbol.filePath, staticSymbol.name) :
            staticSymbol;
        let summary = this.summaryCache.get(rootSymbol);
        if (!summary) {
            this._loadSummaryFile(staticSymbol.filePath);
            summary = this.summaryCache.get(staticSymbol);
        }
        return (rootSymbol === staticSymbol && summary) || null;
    }
    getSymbolsOf(filePath) {
        if (this._loadSummaryFile(filePath)) {
            return Array.from(this.summaryCache.keys()).filter((symbol) => symbol.filePath === filePath);
        }
        return null;
    }
    getImportAs(staticSymbol) {
        staticSymbol.assertNoMembers();
        return this.importAs.get(staticSymbol);
    }
    /**
     * Converts a file path to a module name that can be used as an `import`.
     */
    getKnownModuleName(importedFilePath) {
        return this.knownFileNameToModuleNames.get(importedFilePath) || null;
    }
    addSummary(summary) { this.summaryCache.set(summary.symbol, summary); }
    _loadSummaryFile(filePath) {
        let hasSummary = this.loadedFilePaths.get(filePath);
        if (hasSummary != null) {
            return hasSummary;
        }
        let json = null;
        if (this.isLibraryFile(filePath)) {
            const summaryFilePath = summaryFileName(filePath);
            try {
                json = this.host.loadSummary(summaryFilePath);
            }
            catch (e) {
                console.error(`Error loading summary file ${summaryFilePath}`);
                throw e;
            }
        }
        hasSummary = json != null;
        this.loadedFilePaths.set(filePath, hasSummary);
        if (json) {
            const { moduleName, summaries, importAs } = deserializeSummaries(this.staticSymbolCache, this, filePath, json);
            summaries.forEach((summary) => this.summaryCache.set(summary.symbol, summary));
            if (moduleName) {
                this.knownFileNameToModuleNames.set(filePath, moduleName);
            }
            importAs.forEach((importAs) => { this.importAs.set(importAs.symbol, importAs.importAs); });
        }
        return hasSummary;
    }
}
//# sourceMappingURL=summary_resolver.js.map