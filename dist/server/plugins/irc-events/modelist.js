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
const chan_1 = require("../../models/chan");
const msg_1 = __importStar(require("../../models/msg"));
exports.default = (function (irc, network) {
    const client = this;
    irc.on("banlist", (list) => {
        const data = list.bans.map((ban) => ({
            hostmask: ban.banned,
            banned_by: ban.banned_by,
            banned_at: ban.banned_at * 1000,
        }));
        handleList(chan_1.SpecialChanType.BANLIST, "Ban list", list.channel, data);
    });
    irc.on("inviteList", (list) => {
        const data = list.invites.map((invite) => ({
            hostmask: invite.invited,
            invited_by: invite.invited_by,
            invited_at: invite.invited_at * 1000,
        }));
        handleList(chan_1.SpecialChanType.INVITELIST, "Invite list", list.channel, data);
    });
    function handleList(type, name, channel, data) {
        if (data.length === 0) {
            const msg = new msg_1.default({
                time: new Date(),
                type: msg_1.MessageType.ERROR,
                text: `${name} is empty`,
            });
            let chan = network.getChannel(channel);
            // Send error to lobby if we receive empty list for a channel we're not in
            if (typeof chan === "undefined") {
                msg.showInActive = true;
                chan = network.getLobby();
            }
            chan.pushMessage(client, msg, true);
            return;
        }
        const chanName = `${name} for ${channel}`;
        let chan = network.getChannel(chanName);
        if (typeof chan === "undefined") {
            chan = client.createChannel({
                type: chan_1.ChanType.SPECIAL,
                special: type,
                name: chanName,
                data: data,
            });
            client.emit("join", {
                network: network.uuid,
                chan: chan.getFilteredClone(true),
                index: network.addChannel(chan),
            });
        }
        else {
            chan.data = data;
            client.emit("msg:special", {
                chan: chan.id,
                data: data,
            });
        }
    }
});
