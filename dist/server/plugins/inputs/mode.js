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
const commands = ["mode", "umode", "op", "deop", "hop", "dehop", "voice", "devoice"];
const input = function ({ irc, nick }, chan, cmd, args) {
    if (cmd === "umode") {
        irc.raw("MODE", nick, ...args);
        return;
    }
    else if (cmd !== "mode") {
        if (chan.type !== chan_1.ChanType.CHANNEL) {
            chan.pushMessage(this, new msg_1.default({
                type: msg_1.MessageType.ERROR,
                text: `${cmd} command can only be used in channels.`,
            }));
            return;
        }
        const target = args.filter((arg) => arg !== "");
        if (target.length === 0) {
            chan.pushMessage(this, new msg_1.default({
                type: msg_1.MessageType.ERROR,
                text: `Usage: /${cmd} <nick> [...nick]`,
            }));
            return;
        }
        const mode = {
            op: "+o",
            hop: "+h",
            voice: "+v",
            deop: "-o",
            dehop: "-h",
            devoice: "-v",
        }[cmd];
        const limit = parseInt(irc.network.supports("MODES")) || target.length;
        for (let i = 0; i < target.length; i += limit) {
            const targets = target.slice(i, i + limit);
            const amode = `${mode[0]}${mode[1].repeat(targets.length)}`;
            irc.raw("MODE", chan.name, amode, ...targets);
        }
        return;
    }
    if (args.length === 0 || args[0][0] === "+" || args[0][0] === "-") {
        args.unshift(chan.type === chan_1.ChanType.CHANNEL || chan.type === chan_1.ChanType.QUERY ? chan.name : nick);
    }
    irc.raw("MODE", ...args);
};
exports.default = {
    commands,
    input,
};
