"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const msg_1 = __importDefault(require("../../models/msg"));
const sts_1 = __importDefault(require("../sts"));
exports.default = (function (irc, network) {
    const client = this;
    irc.on("cap ls", (data) => {
        handleSTS(data, true);
    });
    irc.on("cap new", (data) => {
        handleSTS(data, false);
    });
    function handleSTS(data, shouldReconnect) {
        if (!Object.prototype.hasOwnProperty.call(data.capabilities, "sts")) {
            return;
        }
        const isSecure = irc.connection.transport.socket.encrypted;
        const values = {};
        data.capabilities.sts.split(",").map((value) => {
            value = value.split("=", 2);
            values[value[0]] = value[1];
        });
        if (isSecure) {
            const duration = parseInt(values.duration, 10);
            if (isNaN(duration)) {
                return;
            }
            sts_1.default.update(network.host, network.port, duration);
        }
        else {
            const port = parseInt(values.port, 10);
            if (isNaN(port)) {
                return;
            }
            network.getLobby().pushMessage(client, new msg_1.default({
                text: `Server sent a strict transport security policy, reconnecting to ${network.host}:${port}…`,
            }), true);
            // Forcefully end the connection if STS is seen in CAP LS
            // We will update the port and tls setting if we see CAP NEW,
            // but will not force a reconnection
            if (shouldReconnect) {
                irc.connection.end();
            }
            // Update the port
            network.port = port;
            irc.options.port = port;
            // Enable TLS
            network.tls = true;
            network.rejectUnauthorized = true;
            irc.options.tls = true;
            irc.options.rejectUnauthorized = true;
            if (shouldReconnect) {
                // Start a new connection
                irc.connect();
            }
            client.save();
        }
    }
});
