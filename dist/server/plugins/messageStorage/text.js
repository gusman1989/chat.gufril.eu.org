"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/restrict-template-expressions */
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const filenamify_1 = __importDefault(require("filenamify"));
const config_1 = __importDefault(require("../../config"));
const msg_1 = require("../../models/msg");
class TextFileMessageStorage {
    isEnabled;
    username;
    constructor(username) {
        this.username = username;
        this.isEnabled = false;
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async enable() {
        this.isEnabled = true;
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async close() {
        this.isEnabled = false;
    }
    async index(network, channel, msg) {
        if (!this.isEnabled) {
            return;
        }
        const logPath = path_1.default.join(config_1.default.getUserLogsPath(), this.username, TextFileMessageStorage.getNetworkFolderName(network));
        try {
            await promises_1.default.mkdir(logPath, { recursive: true });
        }
        catch (e) {
            throw new Error(`Unable to create logs directory: ${e}`);
        }
        let line = `[${msg.time.toISOString()}] `;
        // message types from src/models/msg.js
        switch (msg.type) {
            case msg_1.MessageType.ACTION:
                // [2014-01-01 00:00:00] * @Arnold is eating cookies
                line += `* ${msg.from.mode}${msg.from.nick} ${msg.text}`;
                break;
            case msg_1.MessageType.JOIN:
                // [2014-01-01 00:00:00] *** Arnold (~arnold@foo.bar) joined
                line += `*** ${msg.from.nick} (${msg.hostmask}) joined`;
                break;
            case msg_1.MessageType.KICK:
                // [2014-01-01 00:00:00] *** Arnold was kicked by Bernie (Don't steal my cookies!)
                line += `*** ${msg.target.nick} was kicked by ${msg.from.nick} (${msg.text})`;
                break;
            case msg_1.MessageType.MESSAGE:
                // [2014-01-01 00:00:00] <@Arnold> Put that cookie down.. Now!!
                line += `<${msg.from.mode}${msg.from.nick}> ${msg.text}`;
                break;
            case msg_1.MessageType.MODE:
                // [2014-01-01 00:00:00] *** Arnold set mode +o Bernie
                line += `*** ${msg.from.nick} set mode ${msg.text}`;
                break;
            case msg_1.MessageType.NICK:
                // [2014-01-01 00:00:00] *** Arnold changed nick to Bernie
                line += `*** ${msg.from.nick} changed nick to ${msg.new_nick}`;
                break;
            case msg_1.MessageType.NOTICE:
                // [2014-01-01 00:00:00] -Arnold- pssst, I have cookies!
                line += `-${msg.from.nick}- ${msg.text}`;
                break;
            case msg_1.MessageType.PART:
                // [2014-01-01 00:00:00] *** Arnold (~arnold@foo.bar) left (Bye all!)
                line += `*** ${msg.from.nick} (${msg.hostmask}) left (${msg.text})`;
                break;
            case msg_1.MessageType.QUIT:
                // [2014-01-01 00:00:00] *** Arnold (~arnold@foo.bar) quit (Connection reset by peer)
                line += `*** ${msg.from.nick} (${msg.hostmask}) quit (${msg.text})`;
                break;
            case msg_1.MessageType.CHGHOST:
                // [2014-01-01 00:00:00] *** Arnold changed host to: new@fancy.host
                line += `*** ${msg.from.nick} changed host to '${msg.new_ident}@${msg.new_host}'`;
                break;
            case msg_1.MessageType.TOPIC:
                // [2014-01-01 00:00:00] *** Arnold changed topic to: welcome everyone!
                line += `*** ${msg.from.nick} changed topic to '${msg.text}'`;
                break;
            default:
                // unhandled events will not be logged
                return;
        }
        line += "\n";
        try {
            await promises_1.default.appendFile(path_1.default.join(logPath, TextFileMessageStorage.getChannelFileName(channel)), line);
        }
        catch (e) {
            throw new Error(`Failed to write user log: ${e}`);
        }
    }
    async deleteChannel() {
        // Not implemented for text log files
    }
    getMessages() {
        // Not implemented for text log files
        // They do not contain enough data to fully re-create message objects
        // Use sqlite storage instead
        return Promise.resolve([]);
    }
    canProvideMessages() {
        return false;
    }
    static getNetworkFolderName(network) {
        // Limit network name in the folder name to 23 characters
        // So we can still fit 12 characters of the uuid for de-duplication
        const networkName = cleanFilename(network.name.substring(0, 23).replace(/ /g, "-"));
        return `${networkName}-${network.uuid.substring(networkName.length + 1)}`;
    }
    static getChannelFileName(channel) {
        return `${cleanFilename(channel.name)}.log`;
    }
}
exports.default = TextFileMessageStorage;
function cleanFilename(name) {
    name = (0, filenamify_1.default)(name, { replacement: "_" });
    name = name.toLowerCase();
    return name;
}
