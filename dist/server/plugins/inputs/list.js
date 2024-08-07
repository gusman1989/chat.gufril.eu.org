"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands = ["list"];
const input = function (network, chan, cmd, args) {
    network.chanCache = [];
    network.irc.list(...args);
    return true;
};
exports.default = {
    commands,
    input,
};
