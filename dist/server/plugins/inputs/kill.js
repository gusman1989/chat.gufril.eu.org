"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands = ["kill"];
const input = function ({ irc }, chan, cmd, args) {
    if (args.length !== 0) {
        irc.raw("KILL", args[0], args.slice(1).join(" "));
    }
    return true;
};
exports.default = {
    commands,
    input,
};
