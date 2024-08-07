"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChanState = exports.SpecialChanType = exports.ChanType = void 0;
const lodash_1 = __importDefault(require("lodash"));
const log_1 = __importDefault(require("../log"));
const config_1 = __importDefault(require("../config"));
const user_1 = __importDefault(require("./user"));
const msg_1 = require("./msg");
const storage_1 = __importDefault(require("../plugins/storage"));
const prefix_1 = __importDefault(require("./prefix"));
var ChanType;
(function (ChanType) {
    ChanType["CHANNEL"] = "channel";
    ChanType["LOBBY"] = "lobby";
    ChanType["QUERY"] = "query";
    ChanType["SPECIAL"] = "special";
})(ChanType = exports.ChanType || (exports.ChanType = {}));
var SpecialChanType;
(function (SpecialChanType) {
    SpecialChanType["BANLIST"] = "list_bans";
    SpecialChanType["INVITELIST"] = "list_invites";
    SpecialChanType["CHANNELLIST"] = "list_channels";
    SpecialChanType["IGNORELIST"] = "list_ignored";
})(SpecialChanType = exports.SpecialChanType || (exports.SpecialChanType = {}));
var ChanState;
(function (ChanState) {
    ChanState[ChanState["PARTED"] = 0] = "PARTED";
    ChanState[ChanState["JOINED"] = 1] = "JOINED";
})(ChanState = exports.ChanState || (exports.ChanState = {}));
class Chan {
    // TODO: don't force existence, figure out how to make TS infer it.
    id;
    messages;
    name;
    key;
    topic;
    firstUnread;
    unread;
    highlight;
    users;
    muted;
    type;
    state;
    userAway;
    special;
    data;
    closed;
    num_users;
    static optionalProperties = ["userAway", "special", "data", "closed", "num_users"];
    constructor(attr) {
        lodash_1.default.defaults(this, attr, {
            id: 0,
            messages: [],
            name: "",
            key: "",
            topic: "",
            type: ChanType.CHANNEL,
            state: ChanState.PARTED,
            firstUnread: 0,
            unread: 0,
            highlight: 0,
            users: new Map(),
            muted: false,
        });
    }
    destroy() {
        this.dereferencePreviews(this.messages);
    }
    pushMessage(client, msg, increasesUnread = false) {
        const chan = this.id;
        const obj = { chan, msg };
        msg.id = client.idMsg++;
        // If this channel is open in any of the clients, do not increase unread counter
        const isOpen = lodash_1.default.find(client.attachedClients, { openChannel: chan }) !== undefined;
        if (msg.self) {
            // reset counters/markers when receiving self-/echo-message
            this.unread = 0;
            this.firstUnread = msg.id;
            this.highlight = 0;
        }
        else if (!isOpen) {
            if (!this.firstUnread) {
                this.firstUnread = msg.id;
            }
            if (increasesUnread || msg.highlight) {
                obj.unread = ++this.unread;
            }
            if (msg.highlight) {
                obj.highlight = ++this.highlight;
            }
        }
        client.emit("msg", obj);
        // Never store messages in public mode as the session
        // is completely destroyed when the page gets closed
        if (config_1.default.values.public) {
            return;
        }
        // showInActive is only processed on "msg", don't need it on page reload
        if (msg.showInActive) {
            delete msg.showInActive;
        }
        this.writeUserLog(client, msg);
        if (config_1.default.values.maxHistory >= 0 && this.messages.length > config_1.default.values.maxHistory) {
            const deleted = this.messages.splice(0, this.messages.length - config_1.default.values.maxHistory);
            // If maxHistory is 0, image would be dereferenced before client had a chance to retrieve it,
            // so for now, just don't implement dereferencing for this edge case.
            if (config_1.default.values.maxHistory > 0) {
                this.dereferencePreviews(deleted);
            }
        }
    }
    dereferencePreviews(messages) {
        if (!config_1.default.values.prefetch || !config_1.default.values.prefetchStorage) {
            return;
        }
        messages.forEach((message) => {
            if (message.previews) {
                message.previews.forEach((preview) => {
                    if (preview.thumb) {
                        storage_1.default.dereference(preview.thumb);
                        preview.thumb = "";
                    }
                });
            }
        });
    }
    getSortedUsers(irc) {
        const users = Array.from(this.users.values());
        if (!irc || !irc.network || !irc.network.options || !irc.network.options.PREFIX) {
            return users;
        }
        const userModeSortPriority = {};
        irc.network.options.PREFIX.forEach((prefix, index) => {
            userModeSortPriority[prefix.symbol] = index;
        });
        userModeSortPriority[""] = 99; // No mode is lowest
        return users.sort(function (a, b) {
            if (a.mode === b.mode) {
                return a.nick.toLowerCase() < b.nick.toLowerCase() ? -1 : 1;
            }
            return userModeSortPriority[a.mode] - userModeSortPriority[b.mode];
        });
    }
    findMessage(msgId) {
        return this.messages.find((message) => message.id === msgId);
    }
    findUser(nick) {
        return this.users.get(nick.toLowerCase());
    }
    getUser(nick) {
        return this.findUser(nick) || new user_1.default({ nick }, new prefix_1.default([]));
    }
    setUser(user) {
        this.users.set(user.nick.toLowerCase(), user);
    }
    removeUser(user) {
        this.users.delete(user.nick.toLowerCase());
    }
    /**
     * Get a clean clone of this channel that will be sent to the client.
     * This function performs manual cloning of channel object for
     * better control of performance and memory usage.
     *
     * @param {(int|bool)} lastActiveChannel - Last known active user channel id (needed to control how many messages are sent)
     *                                         If true, channel is assumed active.
     * @param {int} lastMessage - Last message id seen by active client to avoid sending duplicates.
     */
    getFilteredClone(lastActiveChannel, lastMessage) {
        return Object.keys(this).reduce((newChannel, prop) => {
            if (Chan.optionalProperties.includes(prop)) {
                if (this[prop] !== undefined || (Array.isArray(this[prop]) && this[prop].length)) {
                    newChannel[prop] = this[prop];
                }
            }
            else if (prop === "users") {
                // Do not send users, client requests updated user list whenever needed
                newChannel[prop] = [];
            }
            else if (prop === "messages") {
                // If client is reconnecting, only send new messages that client has not seen yet
                if (lastMessage && lastMessage > -1) {
                    // When reconnecting, always send up to 100 messages to prevent message gaps on the client
                    // See https://github.com/thelounge/thelounge/issues/1883
                    newChannel[prop] = this[prop].filter((m) => m.id > lastMessage).slice(-100);
                }
                else {
                    // If channel is active, send up to 100 last messages, for all others send just 1
                    // Client will automatically load more messages whenever needed based on last seen messages
                    const messagesToSend = lastActiveChannel === true || this.id === lastActiveChannel ? 100 : 1;
                    newChannel[prop] = this[prop].slice(-messagesToSend);
                }
                newChannel.totalMessages = this[prop].length;
            }
            else {
                newChannel[prop] = this[prop];
            }
            return newChannel;
        }, {});
    }
    writeUserLog(client, msg) {
        this.messages.push(msg);
        // Are there any logs enabled
        if (client.messageStorage.length === 0) {
            return;
        }
        const targetChannel = this;
        // Is this particular message or channel loggable
        if (!msg.isLoggable() || !this.isLoggable()) {
            // Because notices are nasty and can be shown in active channel on the client
            // if there is no open query, we want to always log notices in the sender's name
            if (msg.type === msg_1.MessageType.NOTICE && msg.showInActive) {
                targetChannel.name = msg.from.nick || ""; // TODO: check if || works
            }
            else {
                return;
            }
        }
        // Find the parent network where this channel is in
        const target = client.find(this.id);
        if (!target) {
            return;
        }
        for (const messageStorage of client.messageStorage) {
            messageStorage.index(target.network, targetChannel, msg).catch((e) => log_1.default.error(e));
        }
    }
    loadMessages(client, network) {
        if (!this.isLoggable()) {
            return;
        }
        if (!network.irc) {
            // Network created, but misconfigured
            log_1.default.warn(`Failed to load messages for ${client.name}, network ${network.name} is not initialized.`);
            return;
        }
        if (!client.messageProvider) {
            if (network.irc.network.cap.isEnabled("znc.in/playback")) {
                // if we do have a message provider we might be able to only fetch partial history,
                // so delay the cap in this case.
                requestZncPlayback(this, network, 0);
            }
            return;
        }
        client.messageProvider
            .getMessages(network, this, () => client.idMsg++)
            .then((messages) => {
            if (messages.length === 0) {
                if (network.irc.network.cap.isEnabled("znc.in/playback")) {
                    requestZncPlayback(this, network, 0);
                }
                return;
            }
            this.messages.unshift(...messages);
            if (!this.firstUnread) {
                this.firstUnread = messages[messages.length - 1].id;
            }
            client.emit("more", {
                chan: this.id,
                messages: messages.slice(-100),
                totalMessages: messages.length,
            });
            if (network.irc.network.cap.isEnabled("znc.in/playback")) {
                const from = Math.floor(messages[messages.length - 1].time.getTime() / 1000);
                requestZncPlayback(this, network, from);
            }
        })
            .catch((err) => log_1.default.error(`Failed to load messages for ${client.name}: ${err.toString()}`));
    }
    isLoggable() {
        return this.type === ChanType.CHANNEL || this.type === ChanType.QUERY;
    }
    setMuteStatus(muted) {
        this.muted = !!muted;
    }
}
function requestZncPlayback(channel, network, from) {
    network.irc.raw("ZNC", "*playback", "PLAY", channel.name, from.toString());
}
exports.default = Chan;
