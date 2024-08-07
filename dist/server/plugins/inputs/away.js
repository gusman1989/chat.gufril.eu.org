"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands = ["away", "back"];
const input = function (network, chan, cmd, args) {
    let reason = "";
    if (cmd === "away") {
        reason = args.join(" ") || " ";
        network.irc.raw("AWAY", reason);
    }
    else {
        // back command
        network.irc.raw("AWAY");
    }
    network.awayMessage = reason;
    this.save();
};
exports.default = {
    commands,
    input,
};
