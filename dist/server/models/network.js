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
const uuid_1 = require("uuid");
const irc_framework_1 = __importDefault(require("irc-framework"));
const chan_1 = __importStar(require("./chan"));
const msg_1 = __importStar(require("./msg"));
const prefix_1 = __importDefault(require("./prefix"));
const helper_1 = __importDefault(require("../helper"));
const config_1 = __importDefault(require("../config"));
const sts_1 = __importDefault(require("../plugins/sts"));
const clientCertificate_1 = __importDefault(require("../plugins/clientCertificate"));
/**
 * List of keys which should be sent to the client by default.
 */
const fieldsForClient = {
    uuid: true,
    name: true,
    nick: true,
    serverOptions: true,
};
class Network {
    nick;
    name;
    host;
    port;
    tls;
    userDisconnected;
    rejectUnauthorized;
    password;
    awayMessage;
    commands;
    username;
    realname;
    leaveMessage;
    sasl;
    saslAccount;
    saslPassword;
    channels;
    uuid;
    proxyHost;
    proxyPort;
    proxyUsername;
    proxyPassword;
    proxyEnabled;
    highlightRegex;
    irc;
    chanCache;
    ignoreList;
    keepNick;
    status;
    serverOptions;
    // TODO: this is only available on export
    hasSTSPolicy;
    constructor(attr) {
        lodash_1.default.defaults(this, attr, {
            name: "",
            nick: "",
            host: "",
            port: 6667,
            tls: false,
            userDisconnected: false,
            rejectUnauthorized: false,
            password: "",
            awayMessage: "",
            commands: [],
            username: "",
            realname: "",
            leaveMessage: "",
            sasl: "",
            saslAccount: "",
            saslPassword: "",
            channels: [],
            irc: null,
            serverOptions: {
                CHANTYPES: ["#", "&"],
                PREFIX: new prefix_1.default([
                    { symbol: "!", mode: "Y" },
                    { symbol: "@", mode: "o" },
                    { symbol: "%", mode: "h" },
                    { symbol: "+", mode: "v" },
                ]),
                NETWORK: "",
            },
            proxyHost: "",
            proxyPort: 1080,
            proxyUsername: "",
            proxyPassword: "",
            proxyEnabled: false,
            chanCache: [],
            ignoreList: [],
            keepNick: null,
        });
        if (!this.uuid) {
            this.uuid = (0, uuid_1.v4)();
        }
        if (!this.name) {
            this.name = this.host;
        }
        this.channels.unshift(new chan_1.default({
            name: this.name,
            type: chan_1.ChanType.LOBBY,
            // The lobby only starts as muted if every channel (unless it's special) is muted.
            // This is A) easier to implement and B) stops some confusion on startup.
            muted: this.channels.length >= 1 &&
                this.channels.every((chan) => chan.muted || chan.type === chan_1.ChanType.SPECIAL),
        }));
    }
    validate(client) {
        // Remove !, :, @ and whitespace characters from nicknames and usernames
        const cleanNick = (str) => str.replace(/[\x00\s:!@]/g, "_").substring(0, 100);
        // Remove new lines and limit length
        const cleanString = (str) => str.replace(/[\x00\r\n]/g, "").substring(0, 300);
        this.setNick(cleanNick(String(this.nick || config_1.default.getDefaultNick())));
        if (!this.username) {
            // If username is empty, make one from the provided nick
            this.username = this.nick.replace(/[^a-zA-Z0-9]/g, "");
        }
        this.username = cleanString(this.username) || "thelounge";
        this.realname = cleanString(this.realname) || this.nick;
        this.leaveMessage = cleanString(this.leaveMessage);
        this.password = cleanString(this.password);
        this.host = cleanString(this.host).toLowerCase();
        this.name = cleanString(this.name);
        this.saslAccount = cleanString(this.saslAccount);
        this.saslPassword = cleanString(this.saslPassword);
        this.proxyHost = cleanString(this.proxyHost);
        this.proxyPort = this.proxyPort || 1080;
        this.proxyUsername = cleanString(this.proxyUsername);
        this.proxyPassword = cleanString(this.proxyPassword);
        this.proxyEnabled = !!this.proxyEnabled;
        const error = function (network, text) {
            network.getLobby().pushMessage(client, new msg_1.default({
                type: msg_1.MessageType.ERROR,
                text: text,
            }), true);
        };
        if (!this.port) {
            this.port = this.tls ? 6697 : 6667;
        }
        if (!["", "plain", "external"].includes(this.sasl)) {
            this.sasl = "";
        }
        if (config_1.default.values.lockNetwork) {
            // This check is needed to prevent invalid user configurations
            if (!config_1.default.values.public &&
                this.host &&
                this.host.length > 0 &&
                this.host !== config_1.default.values.defaults.host) {
                error(this, `The hostname you specified (${this.host}) is not allowed.`);
                return false;
            }
            if (config_1.default.values.public) {
                this.name = config_1.default.values.defaults.name;
                // Sync lobby channel name
                this.getLobby().name = config_1.default.values.defaults.name;
            }
            this.host = config_1.default.values.defaults.host;
            this.port = config_1.default.values.defaults.port;
            this.tls = config_1.default.values.defaults.tls;
            this.rejectUnauthorized = config_1.default.values.defaults.rejectUnauthorized;
        }
        if (this.host.length === 0) {
            error(this, "You must specify a hostname to connect.");
            return false;
        }
        const stsPolicy = sts_1.default.get(this.host);
        if (stsPolicy && !this.tls) {
            error(this, `${this.host} has an active strict transport security policy, will connect to port ${stsPolicy.port} over a secure connection.`);
            this.port = stsPolicy.port;
            this.tls = true;
            this.rejectUnauthorized = true;
        }
        return true;
    }
    createIrcFramework(client) {
        this.irc = new irc_framework_1.default.Client({
            version: false,
            outgoing_addr: config_1.default.values.bind,
            enable_chghost: true,
            enable_echomessage: true,
            enable_setname: true,
            auto_reconnect: true,
            // Exponential backoff maxes out at 300 seconds after 9 reconnects,
            // it will keep trying for well over an hour (plus the timeouts)
            auto_reconnect_max_retries: 30,
            // TODO: this type should be set after setIrcFrameworkOptions
        });
        this.setIrcFrameworkOptions(client);
        this.irc.requestCap([
            "znc.in/self-message",
            "znc.in/playback", // See http://wiki.znc.in/Playback
        ]);
    }
    setIrcFrameworkOptions(client) {
        this.irc.options.host = this.host;
        this.irc.options.port = this.port;
        this.irc.options.password = this.password;
        this.irc.options.nick = this.nick;
        this.irc.options.username = config_1.default.values.useHexIp
            ? helper_1.default.ip2hex(client.config.browser.ip)
            : this.username;
        this.irc.options.gecos = this.realname;
        this.irc.options.tls = this.tls;
        this.irc.options.rejectUnauthorized = this.rejectUnauthorized;
        this.irc.options.webirc = this.createWebIrc(client);
        this.irc.options.client_certificate = null;
        if (this.proxyEnabled) {
            this.irc.options.socks = {
                host: this.proxyHost,
                port: this.proxyPort,
                user: this.proxyUsername,
                pass: this.proxyPassword,
            };
        }
        else {
            delete this.irc.options.socks;
        }
        if (!this.sasl) {
            delete this.irc.options.sasl_mechanism;
            delete this.irc.options.account;
        }
        else if (this.sasl === "external") {
            this.irc.options.sasl_mechanism = "EXTERNAL";
            this.irc.options.account = {};
            this.irc.options.client_certificate = clientCertificate_1.default.get(this.uuid);
        }
        else if (this.sasl === "plain") {
            delete this.irc.options.sasl_mechanism;
            this.irc.options.account = {
                account: this.saslAccount,
                password: this.saslPassword,
            };
        }
    }
    createWebIrc(client) {
        if (!config_1.default.values.webirc ||
            !Object.prototype.hasOwnProperty.call(config_1.default.values.webirc, this.host)) {
            return null;
        }
        const webircObject = {
            password: config_1.default.values.webirc[this.host],
            username: "thelounge",
            address: client.config.browser?.ip,
            hostname: client.config.browser?.hostname,
            options: {},
        };
        // https://ircv3.net/specs/extensions/webirc#options
        if (client.config.browser?.isSecure) {
            webircObject.options = {
                secure: true,
            };
        }
        if (typeof config_1.default.values.webirc[this.host] === "function") {
            webircObject.password = null;
            return config_1.default.values.webirc[this.host](webircObject, this);
        }
        return webircObject;
    }
    edit(client, args) {
        const oldNetworkName = this.name;
        const oldNick = this.nick;
        const oldRealname = this.realname;
        this.keepNick = null;
        this.nick = args.nick;
        this.host = String(args.host || "");
        this.name = String(args.name || "") || this.host;
        this.port = parseInt(args.port, 10);
        this.tls = !!args.tls;
        this.rejectUnauthorized = !!args.rejectUnauthorized;
        this.password = String(args.password || "");
        this.username = String(args.username || "");
        this.realname = String(args.realname || "");
        this.leaveMessage = String(args.leaveMessage || "");
        this.sasl = String(args.sasl || "");
        this.saslAccount = String(args.saslAccount || "");
        this.saslPassword = String(args.saslPassword || "");
        this.proxyHost = String(args.proxyHost || "");
        this.proxyPort = parseInt(args.proxyPort, 10);
        this.proxyUsername = String(args.proxyUsername || "");
        this.proxyPassword = String(args.proxyPassword || "");
        this.proxyEnabled = !!args.proxyEnabled;
        // Split commands into an array
        this.commands = String(args.commands || "")
            .replace(/\r\n|\r|\n/g, "\n")
            .split("\n")
            .filter((command) => command.length > 0);
        // Sync lobby channel name
        this.getLobby().name = this.name;
        if (this.name !== oldNetworkName) {
            // Send updated network name to all connected clients
            client.emit("network:name", {
                uuid: this.uuid,
                name: this.name,
            });
        }
        if (!this.validate(client)) {
            return;
        }
        if (this.irc) {
            if (this.nick !== oldNick) {
                if (this.irc.connected) {
                    // Send new nick straight away
                    this.irc.changeNick(this.nick);
                }
                else {
                    this.irc.user.nick = this.nick;
                    // Update UI nick straight away if IRC is not connected
                    client.emit("nick", {
                        network: this.uuid,
                        nick: this.nick,
                    });
                }
            }
            if (this.irc.connected &&
                this.realname !== oldRealname &&
                this.irc.network.cap.isEnabled("setname")) {
                this.irc.raw("SETNAME", this.realname);
            }
            this.setIrcFrameworkOptions(client);
            if (this.irc.options?.username) {
                this.irc.user.username = this.irc.options.username;
            }
            if (this.irc.options?.gecos) {
                this.irc.user.gecos = this.irc.options.gecos;
            }
        }
        client.save();
    }
    destroy() {
        this.channels.forEach((channel) => channel.destroy());
    }
    setNick(nick) {
        this.nick = nick;
        this.highlightRegex = new RegExp(
        // Do not match characters and numbers (unless IRC color)
        "(?:^|[^a-z0-9]|\x03[0-9]{1,2})" +
            // Escape nickname, as it may contain regex stuff
            lodash_1.default.escapeRegExp(nick) +
            // Do not match characters and numbers
            "(?:[^a-z0-9]|$)", 
        // Case insensitive search
        "i");
        if (this.keepNick === nick) {
            this.keepNick = null;
        }
        if (this.irc?.options) {
            this.irc.options.nick = nick;
        }
    }
    getFilteredClone(lastActiveChannel, lastMessage) {
        const filteredNetwork = Object.keys(this).reduce((newNetwork, prop) => {
            if (prop === "channels") {
                // Channels objects perform their own cloning
                newNetwork[prop] = this[prop].map((channel) => channel.getFilteredClone(lastActiveChannel, lastMessage));
            }
            else if (fieldsForClient[prop]) {
                // Some properties that are not useful for the client are skipped
                newNetwork[prop] = this[prop];
            }
            return newNetwork;
        }, {});
        filteredNetwork.status = this.getNetworkStatus();
        return filteredNetwork;
    }
    getNetworkStatus() {
        const status = {
            connected: false,
            secure: false,
        };
        if (this.irc && this.irc.connection && this.irc.connection.transport) {
            const transport = this.irc.connection.transport;
            if (transport.socket) {
                const isLocalhost = transport.socket.remoteAddress === "127.0.0.1";
                const isAuthorized = transport.socket.encrypted && transport.socket.authorized;
                status.connected = transport.isConnected();
                status.secure = isAuthorized || isLocalhost;
            }
        }
        return status;
    }
    addChannel(newChan) {
        let index = this.channels.length; // Default to putting as the last item in the array
        // Don't sort special channels in amongst channels/users.
        if (newChan.type === chan_1.ChanType.CHANNEL || newChan.type === chan_1.ChanType.QUERY) {
            // We start at 1 so we don't test against the lobby
            for (let i = 1; i < this.channels.length; i++) {
                const compareChan = this.channels[i];
                // Negative if the new chan is alphabetically before the next chan in the list, positive if after
                if (newChan.name.localeCompare(compareChan.name, undefined, {
                    sensitivity: "base",
                }) <= 0 ||
                    (compareChan.type !== chan_1.ChanType.CHANNEL && compareChan.type !== chan_1.ChanType.QUERY)) {
                    index = i;
                    break;
                }
            }
        }
        this.channels.splice(index, 0, newChan);
        return index;
    }
    quit(quitMessage) {
        if (!this.irc) {
            return;
        }
        // https://ircv3.net/specs/extensions/sts#rescheduling-expiry-on-disconnect
        sts_1.default.refreshExpiration(this.host);
        this.irc.quit(quitMessage || this.leaveMessage || config_1.default.values.leaveMessage);
    }
    exportForEdit() {
        const fieldsToReturn = [
            "uuid",
            "name",
            "nick",
            "password",
            "username",
            "realname",
            "leaveMessage",
            "sasl",
            "saslAccount",
            "saslPassword",
            "commands",
            "proxyEnabled",
            "proxyHost",
            "proxyPort",
            "proxyUsername",
            "proxyPassword",
        ];
        if (!config_1.default.values.lockNetwork) {
            fieldsToReturn.push("host");
            fieldsToReturn.push("port");
            fieldsToReturn.push("tls");
            fieldsToReturn.push("rejectUnauthorized");
        }
        const data = lodash_1.default.pick(this, fieldsToReturn);
        data.hasSTSPolicy = !!sts_1.default.get(this.host);
        return data;
    }
    export() {
        const network = lodash_1.default.pick(this, [
            "uuid",
            "awayMessage",
            "nick",
            "name",
            "host",
            "port",
            "tls",
            "userDisconnected",
            "rejectUnauthorized",
            "password",
            "username",
            "realname",
            "leaveMessage",
            "sasl",
            "saslAccount",
            "saslPassword",
            "commands",
            "ignoreList",
            "proxyHost",
            "proxyPort",
            "proxyUsername",
            "proxyEnabled",
            "proxyPassword",
        ]);
        network.channels = this.channels
            .filter(function (channel) {
            return channel.type === chan_1.ChanType.CHANNEL || channel.type === chan_1.ChanType.QUERY;
        })
            .map(function (chan) {
            const keys = ["name", "muted"];
            if (chan.type === chan_1.ChanType.CHANNEL) {
                keys.push("key");
            }
            else if (chan.type === chan_1.ChanType.QUERY) {
                keys.push("type");
            }
            return lodash_1.default.pick(chan, keys);
            // Override the type because we're omitting ID
        });
        return network;
    }
    getChannel(name) {
        name = name.toLowerCase();
        return lodash_1.default.find(this.channels, function (that, i) {
            // Skip network lobby (it's always unshifted into first position)
            return i > 0 && that.name.toLowerCase() === name;
        });
    }
    getLobby() {
        return this.channels[0];
    }
}
exports.default = Network;
