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
const link_1 = __importDefault(require("./link"));
const irc_1 = require("../../../shared/irc");
const helper_1 = __importDefault(require("../../helper"));
const chan_1 = require("../../models/chan");
const nickRegExp = /(?:\x03[0-9]{1,2}(?:,[0-9]{1,2})?)?([\w[\]\\`^{|}-]+)/g;
exports.default = (function (irc, network) {
    const client = this;
    irc.on("notice", function (data) {
        data.type = msg_1.MessageType.NOTICE;
        handleMessage(data);
    });
    irc.on("action", function (data) {
        data.type = msg_1.MessageType.ACTION;
        handleMessage(data);
    });
    irc.on("privmsg", function (data) {
        data.type = msg_1.MessageType.MESSAGE;
        handleMessage(data);
    });
    irc.on("wallops", function (data) {
        data.from_server = true;
        data.type = msg_1.MessageType.WALLOPS;
        handleMessage(data);
    });
    function handleMessage(data) {
        let chan;
        let from;
        let highlight = false;
        let showInActive = false;
        const self = data.nick === irc.user.nick;
        // Some servers send messages without any nickname
        if (!data.nick) {
            data.from_server = true;
            data.nick = data.hostname || network.host;
        }
        // Check if the sender is in our ignore list
        const shouldIgnore = !self &&
            network.ignoreList.some(function (entry) {
                return helper_1.default.compareHostmask(entry, data);
            });
        // Server messages that aren't targeted at a channel go to the server window
        if (data.from_server &&
            (!data.target ||
                !network.getChannel(data.target) ||
                network.getChannel(data.target)?.type !== chan_1.ChanType.CHANNEL)) {
            chan = network.getLobby();
            from = chan.getUser(data.nick);
        }
        else {
            if (shouldIgnore) {
                return;
            }
            let target = data.target;
            // If the message is targeted at us, use sender as target instead
            if (target.toLowerCase() === irc.user.nick.toLowerCase()) {
                target = data.nick;
            }
            chan = network.getChannel(target);
            if (typeof chan === "undefined") {
                // Send notices that are not targeted at us into the server window
                if (data.type === msg_1.MessageType.NOTICE) {
                    showInActive = true;
                    chan = network.getLobby();
                }
                else {
                    chan = client.createChannel({
                        type: chan_1.ChanType.QUERY,
                        name: target,
                    });
                    client.emit("join", {
                        network: network.uuid,
                        chan: chan.getFilteredClone(true),
                        index: network.addChannel(chan),
                    });
                    client.save();
                    chan.loadMessages(client, network);
                }
            }
            from = chan.getUser(data.nick);
            // Query messages (unless self or muted) always highlight
            if (chan.type === chan_1.ChanType.QUERY) {
                highlight = !self;
            }
            else if (chan.type === chan_1.ChanType.CHANNEL) {
                from.lastMessage = data.time || Date.now();
            }
        }
        // msg is constructed down here because `from` is being copied in the constructor
        const msg = new msg_1.default({
            type: data.type,
            time: data.time,
            text: data.message,
            self: self,
            from: from,
            highlight: highlight,
            users: [],
        });
        if (showInActive) {
            msg.showInActive = true;
        }
        // remove IRC formatting for custom highlight testing
        const cleanMessage = (0, irc_1.cleanIrcMessage)(data.message);
        // Self messages in channels are never highlighted
        // Non-self messages are highlighted as soon as the nick is detected
        if (!msg.highlight && !msg.self) {
            msg.highlight = network.highlightRegex?.test(data.message);
            // If we still don't have a highlight, test against custom highlights if there's any
            if (!msg.highlight && client.highlightRegex) {
                msg.highlight = client.highlightRegex.test(cleanMessage);
            }
        }
        // if highlight exceptions match, do not highlight at all
        if (msg.highlight && client.highlightExceptionRegex) {
            msg.highlight = !client.highlightExceptionRegex.test(cleanMessage);
        }
        if (data.group) {
            msg.statusmsgGroup = data.group;
        }
        let match;
        while ((match = nickRegExp.exec(data.message))) {
            if (chan.findUser(match[1])) {
                // @ts-expect-error Type 'string' is not assignable to type '{ mode: string; }'.ts(2345)
                msg.users.push(match[1]);
            }
        }
        // No prefetch URLs unless are simple MESSAGE or ACTION types
        if ([msg_1.MessageType.MESSAGE, msg_1.MessageType.ACTION].includes(data.type)) {
            (0, link_1.default)(client, chan, msg, cleanMessage);
        }
        chan.pushMessage(client, msg, !msg.self);
        // Do not send notifications if the channel is muted or for messages older than 15 minutes (znc buffer for example)
        if (!chan.muted && msg.highlight && (!data.time || data.time > Date.now() - 900000)) {
            let title = chan.name;
            let body = cleanMessage;
            if (msg.type === msg_1.MessageType.ACTION) {
                // For actions, do not include colon in the message
                body = `${data.nick} ${body}`;
            }
            else if (chan.type !== chan_1.ChanType.QUERY) {
                // In channels, prepend sender nickname to the message
                body = `${data.nick}: ${body}`;
            }
            // If a channel is active on any client, highlight won't increment and notification will say (0 mention)
            if (chan.highlight > 0) {
                title += ` (${chan.highlight} ${chan.type === chan_1.ChanType.QUERY ? "new message" : "mention"}${chan.highlight > 1 ? "s" : ""})`;
            }
            if (chan.highlight > 1) {
                body += `\n\n… and ${chan.highlight - 1} other message${chan.highlight > 2 ? "s" : ""}`;
            }
            client.manager.webPush.push(client, {
                type: "notification",
                chanId: chan.id,
                timestamp: data.time || Date.now(),
                title: title,
                body: body,
            }, true);
        }
        // Keep track of all mentions in channels for this client
        if (msg.highlight && chan.type === chan_1.ChanType.CHANNEL) {
            client.mentions.push({
                chanId: chan.id,
                msgId: msg.id,
                type: msg.type,
                time: msg.time,
                text: msg.text,
                from: msg.from,
            });
            if (client.mentions.length > 100) {
                client.mentions.splice(0, client.mentions.length - 100);
            }
        }
    }
});
