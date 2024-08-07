"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.condensedTypes = exports.cleanIrcMessage = void 0;
const matchFormatting = /\x02|\x1D|\x1F|\x16|\x0F|\x11|\x1E|\x03(?:[0-9]{1,2}(?:,[0-9]{1,2})?)?|\x04(?:[0-9a-f]{6}(?:,[0-9a-f]{6})?)?/gi;
function cleanIrcMessage(message) {
    return message.replace(matchFormatting, "").trim();
}
exports.cleanIrcMessage = cleanIrcMessage;
exports.condensedTypes = new Set([
    "away",
    "back",
    "chghost",
    "join",
    "kick",
    "mode",
    "nick",
    "part",
    "quit",
]);
