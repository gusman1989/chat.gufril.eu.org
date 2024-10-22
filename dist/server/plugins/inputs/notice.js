"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands = ["notice"];
const input = function (network, chan, cmd, args) {
    if (!args[1]) {
        return;
    }
    let targetName = args[0];
    let message = args.slice(1).join(" ");
    network.irc.notice(targetName, message);
    // If the IRCd does not support echo-message, simulate the message
    // being sent back to us.
    if (!network.irc.network.cap.isEnabled("echo-message")) {
        let targetGroup;
        const parsedTarget = network.irc.network.extractTargetGroup(targetName);
        if (parsedTarget) {
            targetName = parsedTarget.target;
            targetGroup = parsedTarget.target_group;
        }
        const targetChan = network.getChannel(targetName);
        if (typeof targetChan === "undefined") {
            message = "{to " + args[0] + "} " + message;
        }
        network.irc.emit("notice", {
            nick: network.irc.user.nick,
            target: targetName,
            group: targetGroup,
            message: message,
        });
    }
    return true;
};
exports.default = {
    commands,
    input,
};
