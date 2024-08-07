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
const commands = ["mute", "unmute"];
const allowDisconnected = true;
function args_to_channels(network, args) {
    const targets = [];
    for (const arg of args) {
        const target = network.channels.find((c) => c.name === arg);
        if (target) {
            targets.push(target);
        }
    }
    return targets;
}
function change_mute_state(client, target, valueToSet) {
    if (target.type === "special") {
        return;
    }
    target.setMuteStatus(valueToSet);
    client.emit("mute:changed", {
        target: target.id,
        status: valueToSet,
    });
}
const input = function (network, chan, cmd, args) {
    const valueToSet = cmd === "mute" ? true : false;
    const client = this;
    if (args.length === 0) {
        change_mute_state(client, chan, valueToSet);
        return;
    }
    const targets = args_to_channels(network, args);
    if (targets.length !== args.length) {
        const targetNames = targets.map((ch) => ch.name);
        const missing = args.filter((x) => !targetNames.includes(x));
        chan.pushMessage(client, new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: `No open ${missing.length === 1 ? "channel or user" : "channels or users"} found for ${missing.join(",")}`,
        }));
        return;
    }
    for (const target of targets) {
        change_mute_state(client, target, valueToSet);
    }
};
exports.default = {
    commands,
    input,
    allowDisconnected,
};
