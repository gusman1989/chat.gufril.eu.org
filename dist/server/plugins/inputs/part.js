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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const msg_1 = __importStar(require("../../models/msg"));
const config_1 = __importDefault(require("../../config"));
const chan_1 = require("../../models/chan");
const commands = ["close", "leave", "part"];
const allowDisconnected = true;
const input = function (network, chan, cmd, args) {
    let target = chan;
    if (args.length > 0) {
        const newTarget = network.getChannel(args[0]);
        if (typeof newTarget !== "undefined") {
            // If first argument is a channel user is in, part that channel
            target = newTarget;
            args.shift();
        }
    }
    if (target.type === chan_1.ChanType.LOBBY) {
        chan.pushMessage(this, new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: "You can not part from networks, use /quit instead.",
        }));
        return;
    }
    // If target is not a channel or we are not connected, instantly remove the channel
    // Otherwise send part to the server and wait for response
    if (target.type !== chan_1.ChanType.CHANNEL ||
        target.state === chan_1.ChanState.PARTED ||
        !network.irc.connected) {
        this.part(network, target);
    }
    else {
        const partMessage = args.join(" ") || network.leaveMessage || config_1.default.values.leaveMessage;
        network.irc.part(target.name, partMessage);
    }
    return true;
};
exports.default = {
    commands,
    input,
    allowDisconnected,
};
