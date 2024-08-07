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
const lodash_1 = __importDefault(require("lodash"));
const ua_parser_js_1 = __importDefault(require("ua-parser-js"));
const uuid_1 = require("uuid");
const escapeRegExp_1 = __importDefault(require("lodash/escapeRegExp"));
const crypto_1 = __importDefault(require("crypto"));
const chalk_1 = __importDefault(require("chalk"));
const log_1 = __importDefault(require("./log"));
const chan_1 = __importStar(require("./models/chan"));
const msg_1 = __importStar(require("./models/msg"));
const config_1 = __importDefault(require("./config"));
const irc_1 = require("../shared/irc");
const inputs_1 = __importDefault(require("./plugins/inputs"));
const publicClient_1 = __importDefault(require("./plugins/packages/publicClient"));
const sqlite_1 = __importDefault(require("./plugins/messageStorage/sqlite"));
const text_1 = __importDefault(require("./plugins/messageStorage/text"));
const network_1 = __importDefault(require("./models/network"));
const storageCleaner_1 = require("./storageCleaner");
const events = [
    "away",
    "cap",
    "connection",
    "unhandled",
    "ctcp",
    "chghost",
    "error",
    "help",
    "info",
    "invite",
    "join",
    "kick",
    "list",
    "mode",
    "modelist",
    "motd",
    "message",
    "names",
    "nick",
    "part",
    "quit",
    "sasl",
    "topic",
    "welcome",
    "whois",
];
class Client {
    awayMessage;
    lastActiveChannel;
    attachedClients;
    config;
    id;
    idMsg;
    idChan;
    name;
    networks;
    mentions;
    manager;
    messageStorage;
    highlightRegex;
    highlightExceptionRegex;
    messageProvider;
    fileHash;
    constructor(manager, name, config = {}) {
        lodash_1.default.merge(this, {
            awayMessage: "",
            lastActiveChannel: -1,
            attachedClients: {},
            config: config,
            id: (0, uuid_1.v4)(),
            idChan: 1,
            idMsg: 1,
            name: name,
            networks: [],
            mentions: [],
            manager: manager,
            messageStorage: [],
            highlightRegex: null,
            highlightExceptionRegex: null,
            messageProvider: undefined,
        });
        const client = this;
        client.config.log = Boolean(client.config.log);
        client.config.password = String(client.config.password);
        if (!config_1.default.values.public && client.config.log) {
            if (config_1.default.values.messageStorage.includes("sqlite")) {
                client.messageProvider = new sqlite_1.default(client.name);
                if (config_1.default.values.storagePolicy.enabled) {
                    log_1.default.info(`Activating storage cleaner. Policy: ${config_1.default.values.storagePolicy.deletionPolicy}. MaxAge: ${config_1.default.values.storagePolicy.maxAgeDays} days`);
                    const cleaner = new storageCleaner_1.StorageCleaner(client.messageProvider);
                    cleaner.start();
                }
                client.messageStorage.push(client.messageProvider);
            }
            if (config_1.default.values.messageStorage.includes("text")) {
                client.messageStorage.push(new text_1.default(client.name));
            }
            for (const messageStorage of client.messageStorage) {
                messageStorage.enable().catch((e) => log_1.default.error(e));
            }
        }
        if (!lodash_1.default.isPlainObject(client.config.sessions)) {
            client.config.sessions = {};
        }
        if (!lodash_1.default.isPlainObject(client.config.clientSettings)) {
            client.config.clientSettings = {};
        }
        if (!lodash_1.default.isPlainObject(client.config.browser)) {
            client.config.browser = {};
        }
        if (client.config.clientSettings.awayMessage) {
            client.awayMessage = client.config.clientSettings.awayMessage;
        }
        client.config.clientSettings.searchEnabled = client.messageProvider !== undefined;
        client.compileCustomHighlights();
        lodash_1.default.forOwn(client.config.sessions, (session) => {
            if (session.pushSubscription) {
                this.registerPushSubscription(session, session.pushSubscription, true);
            }
        });
    }
    connect() {
        const client = this;
        if (client.networks.length !== 0) {
            throw new Error(`${client.name} is already connected`);
        }
        (client.config.networks || []).forEach((network) => client.connectToNetwork(network, true));
        // Networks are stored directly in the client object
        // We don't need to keep it in the config object
        delete client.config.networks;
        if (client.name) {
            log_1.default.info(`User ${chalk_1.default.bold(client.name)} loaded`);
            // Networks are created instantly, but to reduce server load on startup
            // We randomize the IRC connections and channel log loading
            let delay = client.manager.clients.length * 500;
            client.networks.forEach((network) => {
                setTimeout(() => {
                    network.channels.forEach((channel) => channel.loadMessages(client, network));
                    if (!network.userDisconnected && network.irc) {
                        network.irc.connect();
                    }
                }, delay);
                delay += 1000 + Math.floor(Math.random() * 1000);
            });
            client.fileHash = client.manager.getDataToSave(client).newHash;
        }
    }
    createChannel(attr) {
        const chan = new chan_1.default(attr);
        chan.id = this.idChan++;
        return chan;
    }
    emit(event, data) {
        if (this.manager !== null) {
            this.manager.sockets.in(this.id.toString()).emit(event, data);
        }
    }
    find(channelId) {
        let network = null;
        let chan = null;
        for (const n of this.networks) {
            chan = lodash_1.default.find(n.channels, { id: channelId });
            if (chan) {
                network = n;
                break;
            }
        }
        if (network && chan) {
            return { network, chan };
        }
        return false;
    }
    networkFromConfig(args) {
        const client = this;
        let channels = [];
        if (Array.isArray(args.channels)) {
            let badChanConf = false;
            args.channels.forEach((chan) => {
                const type = chan_1.ChanType[(chan.type || "channel").toUpperCase()];
                if (!chan.name || !type) {
                    badChanConf = true;
                    return;
                }
                channels.push(client.createChannel({
                    name: chan.name,
                    key: chan.key || "",
                    type: type,
                    muted: chan.muted,
                }));
            });
            if (badChanConf && client.name) {
                log_1.default.warn("User '" +
                    client.name +
                    "' on network '" +
                    String(args.name) +
                    "' has an invalid channel which has been ignored");
            }
            // `join` is kept for backwards compatibility when updating from versions <2.0
            // also used by the "connect" window
        }
        else if (args.join) {
            channels = args.join
                .replace(/,/g, " ")
                .split(/\s+/g)
                .map((chan) => {
                if (!chan.match(/^[#&!+]/)) {
                    chan = `#${chan}`;
                }
                return client.createChannel({
                    name: chan,
                });
            });
        }
        // TODO; better typing for args
        return new network_1.default({
            uuid: args.uuid,
            name: String(args.name || (config_1.default.values.lockNetwork ? config_1.default.values.defaults.name : "") || ""),
            host: String(args.host || ""),
            port: parseInt(String(args.port), 10),
            tls: !!args.tls,
            userDisconnected: !!args.userDisconnected,
            rejectUnauthorized: !!args.rejectUnauthorized,
            password: String(args.password || ""),
            nick: String(args.nick || ""),
            username: String(args.username || ""),
            realname: String(args.realname || ""),
            leaveMessage: String(args.leaveMessage || ""),
            sasl: String(args.sasl || ""),
            saslAccount: String(args.saslAccount || ""),
            saslPassword: String(args.saslPassword || ""),
            commands: args.commands || [],
            channels: channels,
            ignoreList: args.ignoreList ? args.ignoreList : [],
            proxyEnabled: !!args.proxyEnabled,
            proxyHost: String(args.proxyHost || ""),
            proxyPort: parseInt(args.proxyPort, 10),
            proxyUsername: String(args.proxyUsername || ""),
            proxyPassword: String(args.proxyPassword || ""),
        });
    }
    connectToNetwork(args, isStartup = false) {
        const client = this;
        // Get channel id for lobby before creating other channels for nicer ids
        const lobbyChannelId = client.idChan++;
        const network = this.networkFromConfig(args);
        // Set network lobby channel id
        network.getLobby().id = lobbyChannelId;
        client.networks.push(network);
        client.emit("network", {
            networks: [network.getFilteredClone(this.lastActiveChannel, -1)],
        });
        if (!network.validate(client)) {
            return;
        }
        network.createIrcFramework(client);
        // TODO
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        events.forEach(async (plugin) => {
            (await Promise.resolve().then(() => __importStar(require(`./plugins/irc-events/${plugin}`)))).default.apply(client, [
                network.irc,
                network,
            ]);
        });
        if (network.userDisconnected) {
            network.getLobby().pushMessage(client, new msg_1.default({
                text: "You have manually disconnected from this network before, use the /connect command to connect again.",
            }), true);
        }
        else if (!isStartup) {
            // irc is created in createIrcFramework
            // TODO; fix type
            network.irc.connect();
        }
        if (!isStartup) {
            client.save();
            network.channels.forEach((channel) => channel.loadMessages(client, network));
        }
    }
    generateToken(callback) {
        crypto_1.default.randomBytes(64, (err, buf) => {
            if (err) {
                throw err;
            }
            callback(buf.toString("hex"));
        });
    }
    calculateTokenHash(token) {
        return crypto_1.default.createHash("sha512").update(token).digest("hex");
    }
    updateSession(token, ip, request) {
        const client = this;
        const agent = (0, ua_parser_js_1.default)(request.headers["user-agent"] || "");
        let friendlyAgent = "";
        if (agent.browser.name) {
            friendlyAgent = `${agent.browser.name} ${agent.browser.major || ""}`;
        }
        else {
            friendlyAgent = "Unknown browser";
        }
        if (agent.os.name) {
            friendlyAgent += ` on ${agent.os.name}`;
            if (agent.os.version) {
                friendlyAgent += ` ${agent.os.version}`;
            }
        }
        client.config.sessions[token] = lodash_1.default.assign(client.config.sessions[token], {
            lastUse: Date.now(),
            ip: ip,
            agent: friendlyAgent,
        });
        client.save();
    }
    setPassword(hash, callback) {
        const client = this;
        const oldHash = client.config.password;
        client.config.password = hash;
        client.manager.saveUser(client, function (err) {
            if (err) {
                // If user file fails to write, reset it back
                client.config.password = oldHash;
                return callback(false);
            }
            return callback(true);
        });
    }
    input(data) {
        const client = this;
        data.text.split("\n").forEach((line) => {
            data.text = line;
            client.inputLine(data);
        });
    }
    inputLine(data) {
        const client = this;
        const target = client.find(data.target);
        if (!target) {
            return;
        }
        // Sending a message to a channel is higher priority than merely opening one
        // so that reloading the page will open this channel
        this.lastActiveChannel = target.chan.id;
        let text = data.text;
        // This is either a normal message or a command escaped with a leading '/'
        if (text.charAt(0) !== "/" || text.charAt(1) === "/") {
            if (target.chan.type === chan_1.ChanType.LOBBY) {
                target.chan.pushMessage(this, new msg_1.default({
                    type: msg_1.MessageType.ERROR,
                    text: "Messages can not be sent to lobbies.",
                }));
                return;
            }
            text = "say " + text.replace(/^\//, "");
        }
        else {
            text = text.substring(1);
        }
        const args = text.split(" ");
        const cmd = args?.shift()?.toLowerCase() || "";
        const irc = target.network.irc;
        const connected = irc?.connected;
        const emitFailureDisconnected = () => {
            target.chan.pushMessage(this, new msg_1.default({
                type: msg_1.MessageType.ERROR,
                text: "You are not connected to the IRC network, unable to send your command.",
            }));
        };
        const plugin = inputs_1.default.userInputs.get(cmd);
        if (plugin) {
            if (!connected && !plugin.allowDisconnected) {
                emitFailureDisconnected();
                return;
            }
            plugin.input.apply(client, [target.network, target.chan, cmd, args]);
            return;
        }
        const extPlugin = inputs_1.default.pluginCommands.get(cmd);
        if (extPlugin) {
            if (!connected && !extPlugin.allowDisconnected) {
                emitFailureDisconnected();
                return;
            }
            extPlugin.input(new publicClient_1.default(client, extPlugin.packageInfo), { network: target.network, chan: target.chan }, cmd, args);
            return;
        }
        if (!connected) {
            emitFailureDisconnected();
            return;
        }
        // TODO: fix
        irc.raw(text);
    }
    compileCustomHighlights() {
        function compileHighlightRegex(customHighlightString) {
            if (typeof customHighlightString !== "string") {
                return null;
            }
            // Ensure we don't have empty strings in the list of highlights
            const highlightsTokens = customHighlightString
                .split(",")
                .map((highlight) => (0, escapeRegExp_1.default)(highlight.trim()))
                .filter((highlight) => highlight.length > 0);
            if (highlightsTokens.length === 0) {
                return null;
            }
            return new RegExp(`(?:^|[ .,+!?|/:<>(){}'"@&~-])(?:${highlightsTokens.join("|")})(?:$|[ .,+!?|/:<>(){}'"-])`, "i");
        }
        this.highlightRegex = compileHighlightRegex(this.config.clientSettings.highlights);
        this.highlightExceptionRegex = compileHighlightRegex(this.config.clientSettings.highlightExceptions);
    }
    more(data) {
        const client = this;
        const target = client.find(data.target);
        if (!target) {
            return null;
        }
        const chan = target.chan;
        let messages = [];
        let index = 0;
        // If client requests -1, send last 100 messages
        if (data.lastId < 0) {
            index = chan.messages.length;
        }
        else {
            index = chan.messages.findIndex((val) => val.id === data.lastId);
        }
        // If requested id is not found, an empty array will be sent
        if (index > 0) {
            let startIndex = index;
            if (data.condensed) {
                // Limit to 1000 messages (that's 10x normal limit)
                const indexToStop = Math.max(0, index - 1000);
                let realMessagesLeft = 100;
                for (let i = index - 1; i >= indexToStop; i--) {
                    startIndex--;
                    // Do not count condensed messages towards the 100 messages
                    if (irc_1.condensedTypes.has(chan.messages[i].type)) {
                        continue;
                    }
                    // Count up actual 100 visible messages
                    if (--realMessagesLeft === 0) {
                        break;
                    }
                }
            }
            else {
                startIndex = Math.max(0, index - 100);
            }
            messages = chan.messages.slice(startIndex, index);
        }
        return {
            chan: chan.id,
            messages: messages,
            totalMessages: chan.messages.length,
        };
    }
    clearHistory(data) {
        const client = this;
        const target = client.find(data.target);
        if (!target) {
            return;
        }
        target.chan.messages = [];
        target.chan.unread = 0;
        target.chan.highlight = 0;
        target.chan.firstUnread = 0;
        client.emit("history:clear", {
            target: target.chan.id,
        });
        if (!target.chan.isLoggable()) {
            return;
        }
        for (const messageStorage of this.messageStorage) {
            messageStorage.deleteChannel(target.network, target.chan).catch((e) => log_1.default.error(e));
        }
    }
    async search(query) {
        if (!this.messageProvider?.isEnabled) {
            return {
                ...query,
                results: [],
            };
        }
        return this.messageProvider.search(query);
    }
    open(socketId, target) {
        // Due to how socket.io works internally, normal events may arrive later than
        // the disconnect event, and because we can't control this timing precisely,
        // process this event normally even if there is no attached client anymore.
        const attachedClient = this.attachedClients[socketId] ||
            {};
        // Opening a window like settings
        if (target === null) {
            attachedClient.openChannel = -1;
            return;
        }
        const targetNetChan = this.find(target);
        if (!targetNetChan) {
            return;
        }
        targetNetChan.chan.unread = 0;
        targetNetChan.chan.highlight = 0;
        if (targetNetChan.chan.messages.length > 0) {
            targetNetChan.chan.firstUnread =
                targetNetChan.chan.messages[targetNetChan.chan.messages.length - 1].id;
        }
        attachedClient.openChannel = targetNetChan.chan.id;
        this.lastActiveChannel = targetNetChan.chan.id;
        this.emit("open", targetNetChan.chan.id);
    }
    sort(data) {
        const order = data.order;
        if (!lodash_1.default.isArray(order)) {
            return;
        }
        switch (data.type) {
            case "networks":
                this.networks.sort((a, b) => order.indexOf(a.uuid) - order.indexOf(b.uuid));
                // Sync order to connected clients
                this.emit("sync_sort", {
                    order: this.networks.map((obj) => obj.uuid),
                    type: data.type,
                });
                break;
            case "channels": {
                const network = lodash_1.default.find(this.networks, { uuid: data.target });
                if (!network) {
                    return;
                }
                network.channels.sort((a, b) => {
                    // Always sort lobby to the top regardless of what the client has sent
                    // Because there's a lot of code that presumes channels[0] is the lobby
                    if (a.type === chan_1.ChanType.LOBBY) {
                        return -1;
                    }
                    else if (b.type === chan_1.ChanType.LOBBY) {
                        return 1;
                    }
                    return order.indexOf(a.id) - order.indexOf(b.id);
                });
                // Sync order to connected clients
                this.emit("sync_sort", {
                    order: network.channels.map((obj) => obj.id),
                    type: data.type,
                    target: network.uuid,
                });
                break;
            }
        }
        this.save();
    }
    names(data) {
        const client = this;
        const target = client.find(data.target);
        if (!target) {
            return;
        }
        client.emit("names", {
            id: target.chan.id,
            users: target.chan.getSortedUsers(target.network.irc),
        });
    }
    part(network, chan) {
        const client = this;
        network.channels = lodash_1.default.without(network.channels, chan);
        client.mentions = client.mentions.filter((msg) => !(msg.chanId === chan.id));
        chan.destroy();
        client.save();
        client.emit("part", {
            chan: chan.id,
        });
    }
    quit(signOut) {
        const sockets = this.manager.sockets.sockets;
        const room = sockets.adapter.rooms.get(this.id.toString());
        if (room) {
            for (const user of room) {
                const socket = sockets.sockets.get(user);
                if (socket) {
                    if (signOut) {
                        socket.emit("sign-out");
                    }
                    socket.disconnect();
                }
            }
        }
        this.networks.forEach((network) => {
            network.quit();
            network.destroy();
        });
        for (const messageStorage of this.messageStorage) {
            messageStorage.close().catch((e) => log_1.default.error(e));
        }
    }
    clientAttach(socketId, token) {
        const client = this;
        if (client.awayMessage && lodash_1.default.size(client.attachedClients) === 0) {
            client.networks.forEach(function (network) {
                // Only remove away on client attachment if
                // there is no away message on this network
                if (network.irc && !network.awayMessage) {
                    network.irc.raw("AWAY");
                }
            });
        }
        const openChannel = client.lastActiveChannel;
        client.attachedClients[socketId] = { token, openChannel };
    }
    clientDetach(socketId) {
        const client = this;
        delete this.attachedClients[socketId];
        if (client.awayMessage && lodash_1.default.size(client.attachedClients) === 0) {
            client.networks.forEach(function (network) {
                // Only set away on client deattachment if
                // there is no away message on this network
                if (network.irc && !network.awayMessage) {
                    network.irc.raw("AWAY", client.awayMessage);
                }
            });
        }
    }
    // TODO: type session to this.attachedClients
    registerPushSubscription(session, subscription, noSave = false) {
        if (!lodash_1.default.isPlainObject(subscription) ||
            !lodash_1.default.isPlainObject(subscription.keys) ||
            typeof subscription.endpoint !== "string" ||
            !/^https?:\/\//.test(subscription.endpoint) ||
            typeof subscription.keys.p256dh !== "string" ||
            typeof subscription.keys.auth !== "string") {
            session.pushSubscription = null;
            return;
        }
        const data = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
        };
        session.pushSubscription = data;
        if (!noSave) {
            this.save();
        }
        return data;
    }
    unregisterPushSubscription(token) {
        this.config.sessions[token].pushSubscription = undefined;
        this.save();
    }
    save = lodash_1.default.debounce(function SaveClient() {
        if (config_1.default.values.public) {
            return;
        }
        const client = this;
        client.manager.saveUser(client);
    }, 5000, { maxWait: 20000 });
}
exports.default = Client;
