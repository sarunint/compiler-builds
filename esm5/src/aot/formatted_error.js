/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { syntaxError } from '../util';
var FORMATTED_MESSAGE = 'ngFormattedMessage';
function indentStr(level) {
    if (level <= 0)
        return '';
    if (level < 6)
        return ['', ' ', '  ', '   ', '    ', '     '][level];
    var half = indentStr(Math.floor(level / 2));
    return half + half + (level % 2 === 1 ? ' ' : '');
}
function formatChain(chain, indent) {
    if (indent === void 0) { indent = 0; }
    if (!chain)
        return '';
    var position = chain.position ?
        chain.position.fileName + "(" + (chain.position.line + 1) + "," + (chain.position.column + 1) + ")" :
        '';
    var prefix = position && indent === 0 ? position + ": " : '';
    var postfix = position && indent !== 0 ? " at " + position : '';
    var message = "" + prefix + chain.message + postfix;
    return "" + indentStr(indent) + message + ((chain.next && ('\n' + formatChain(chain.next, indent + 2))) || '');
}
export function formattedError(chain) {
    var message = formatChain(chain) + '.';
    var error = syntaxError(message);
    error[FORMATTED_MESSAGE] = true;
    error.chain = chain;
    error.position = chain.position;
    return error;
}
export function isFormattedError(error) {
    return !!error[FORMATTED_MESSAGE];
}
//# sourceMappingURL=formatted_error.js.map