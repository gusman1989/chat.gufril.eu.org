"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands = ["disconnect"];
const allowDisconnected = true;
const input = function (network, chan, cmd, args) {
    const quitMessage = args[0] ? args.join(" ") : undefined;
    network.quit(quitMessage);
    network.userDisconnected = true;
    this.save();
};
exports.default = {
    commands,
    input,
    allowDisconnected,
};
