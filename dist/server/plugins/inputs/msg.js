"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const msg_1 = __importStar(require("../../models/msg"));
const chan_1 = require("../../models/chan");
const commands = ["query", "msg", "say"];
function getTarget(cmd, args, chan) {
    switch (cmd) {
        case "msg":
        case "query":
            return args.shift();
        default:
            return chan.name;
    }
}
const input = function (network, chan, cmd, args) {
    let targetName = getTarget(cmd, args, chan);
    if (cmd === "query") {
        if (!targetName) {
            chan.pushMessage(this, new msg_1.default({
                type: msg_1.MessageType.ERROR,
                text: "You cannot open a query window without an argument.",
            }));
            return;
        }
        const target = network.getChannel(targetName);
        if (typeof target === "undefined") {
            const char = targetName[0];
            if (network.irc.network.options.CHANTYPES &&
                network.irc.network.options.CHANTYPES.includes(char)) {
                chan.pushMessage(this, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: "You can not open query windows for channels, use /join instead.",
                }));
                return;
            }
            for (let i = 0; i < network.irc.network.options.PREFIX.length; i++) {
                if (network.irc.network.options.PREFIX[i].symbol === char) {
                    chan.pushMessage(this, new msg_1.default({
                        type: msg_1.MessageType.ERROR,
                        text: "You can not open query windows for names starting with a user prefix.",
                    }));
                    return;
                }
            }
            const newChan = this.createChannel({
                type: chan_1.ChanType.QUERY,
                name: targetName,
            });
            this.emit("join", {
                network: network.uuid,
                chan: newChan.getFilteredClone(true),
                shouldOpen: true,
                index: network.addChannel(newChan),
            });
            this.save();
            newChan.loadMessages(this, network);
        }
    }
    if (args.length === 0) {
        return true;
    }
    if (!targetName) {
        return true;
    }
    const msg = args.join(" ");
    if (msg.length === 0) {
        return true;
    }
    network.irc.say(targetName, msg);
    // If the IRCd does not support echo-message, simulate the message
    // being sent back to us.
    if (!network.irc.network.cap.isEnabled("echo-message")) {
        const parsedTarget = network.irc.network.extractTargetGroup(targetName);
        let targetGroup;
        if (parsedTarget) {
            targetName = parsedTarget.target;
            targetGroup = parsedTarget.target_group;
        }
        const channel = network.getChannel(targetName);
        if (typeof channel !== "undefined") {
            network.irc.emit("privmsg", {
                nick: network.irc.user.nick,
                ident: network.irc.user.username,
                hostname: network.irc.user.host,
                target: targetName,
                group: targetGroup,
                message: msg,
            });
        }
    }
    return true;
};
exports.default = {
    commands,
    input,
};
