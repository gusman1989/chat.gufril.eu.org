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
const helper_1 = __importDefault(require("../../helper"));
const chan_1 = require("../../models/chan");
const commands = ["ignore", "unignore", "ignorelist"];
const input = function (network, chan, cmd, args) {
    const client = this;
    let target;
    // let hostmask: cmd === "ignoreList" ? string : undefined;
    let hostmask;
    if (cmd !== "ignorelist" && (args.length === 0 || args[0].trim().length === 0)) {
        chan.pushMessage(client, new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: `Usage: /${cmd} <nick>[!ident][@host]`,
        }));
        return;
    }
    if (cmd !== "ignorelist") {
        // Trim to remove any spaces from the hostmask
        target = args[0].trim();
        hostmask = helper_1.default.parseHostmask(target);
    }
    switch (cmd) {
        case "ignore": {
            // IRC nicks are case insensitive
            if (hostmask.nick.toLowerCase() === network.nick.toLowerCase()) {
                chan.pushMessage(client, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: "You can't ignore yourself",
                }));
            }
            else if (!network.ignoreList.some(function (entry) {
                return helper_1.default.compareHostmask(entry, hostmask);
            })) {
                hostmask.when = Date.now();
                network.ignoreList.push(hostmask);
                client.save();
                chan.pushMessage(client, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: `\u0002${hostmask.nick}!${hostmask.ident}@${hostmask.hostname}\u000f added to ignorelist`,
                }));
            }
            else {
                chan.pushMessage(client, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: "The specified user/hostmask is already ignored",
                }));
            }
            break;
        }
        case "unignore": {
            const idx = network.ignoreList.findIndex(function (entry) {
                return helper_1.default.compareHostmask(entry, hostmask);
            });
            // Check if the entry exists before removing it, otherwise
            // let the user know.
            if (idx !== -1) {
                network.ignoreList.splice(idx, 1);
                client.save();
                chan.pushMessage(client, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: `Successfully removed \u0002${hostmask.nick}!${hostmask.ident}@${hostmask.hostname}\u000f from ignorelist`,
                }));
            }
            else {
                chan.pushMessage(client, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: "The specified user/hostmask is not ignored",
                }));
            }
            break;
        }
        case "ignorelist":
            if (network.ignoreList.length === 0) {
                chan.pushMessage(client, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: "Ignorelist is empty",
                }));
            }
            else {
                const chanName = "Ignored users";
                const ignored = network.ignoreList.map((data) => ({
                    hostmask: `${data.nick}!${data.ident}@${data.hostname}`,
                    when: data.when,
                }));
                let newChan = network.getChannel(chanName);
                if (typeof newChan === "undefined") {
                    newChan = client.createChannel({
                        type: chan_1.ChanType.SPECIAL,
                        special: chan_1.SpecialChanType.IGNORELIST,
                        name: chanName,
                        data: ignored,
                    });
                    client.emit("join", {
                        network: network.uuid,
                        chan: newChan.getFilteredClone(true),
                        index: network.addChannel(newChan),
                    });
                }
                else {
                    // TODO: add type for this chan/event
                    newChan.data = ignored;
                    client.emit("msg:special", {
                        chan: newChan.id,
                        data: ignored,
                    });
                }
            }
            break;
    }
};
exports.default = {
    commands,
    input,
};
