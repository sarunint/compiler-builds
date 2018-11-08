var SummaryResolver = /** @class */ (function () {
    function SummaryResolver() {
    }
    return SummaryResolver;
}());
export { SummaryResolver };
var JitSummaryResolver = /** @class */ (function () {
    function JitSummaryResolver() {
        this._summaries = new Map();
    }
    JitSummaryResolver.prototype.isLibraryFile = function () { return false; };
    JitSummaryResolver.prototype.toSummaryFileName = function (fileName) { return fileName; };
    JitSummaryResolver.prototype.fromSummaryFileName = function (fileName) { return fileName; };
    JitSummaryResolver.prototype.resolveSummary = function (reference) {
        return this._summaries.get(reference) || null;
    };
    JitSummaryResolver.prototype.getSymbolsOf = function () { return []; };
    JitSummaryResolver.prototype.getImportAs = function (reference) { return reference; };
    JitSummaryResolver.prototype.getKnownModuleName = function (fileName) { return null; };
    JitSummaryResolver.prototype.addSummary = function (summary) { this._summaries.set(summary.symbol, summary); };
    return JitSummaryResolver;
}());
export { JitSummaryResolver };
//# sourceMappingURL=summary_resolver.js.map