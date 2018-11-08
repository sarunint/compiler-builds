export class SummaryResolver {
}
export class JitSummaryResolver {
    constructor() {
        this._summaries = new Map();
    }
    isLibraryFile() { return false; }
    toSummaryFileName(fileName) { return fileName; }
    fromSummaryFileName(fileName) { return fileName; }
    resolveSummary(reference) {
        return this._summaries.get(reference) || null;
    }
    getSymbolsOf() { return []; }
    getImportAs(reference) { return reference; }
    getKnownModuleName(fileName) { return null; }
    addSummary(summary) { this._summaries.set(summary.symbol, summary); }
}
//# sourceMappingURL=summary_resolver.js.map