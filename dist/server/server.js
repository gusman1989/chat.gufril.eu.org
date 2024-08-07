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
const ws_1 = require("ws");
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const dns_1 = __importDefault(require("dns"));
const chalk_1 = __importDefault(require("chalk"));
const net_1 = __importDefault(require("net"));
const log_1 = __importDefault(require("./log"));
const client_1 = __importDefault(require("./client"));
const clientManager_1 = __importDefault(require("./clientManager"));
const uploader_1 = __importDefault(require("./plugins/uploader"));
const helper_1 = __importDefault(require("./helper"));
const config_1 = __importDefault(require("./config"));
const identification_1 = __importDefault(require("./identification"));
const changelog_1 = __importDefault(require("./plugins/changelog"));
const inputs_1 = __importDefault(require("./plugins/inputs"));
const auth_1 = __importDefault(require("./plugins/auth"));
const themes_1 = __importDefault(require("./plugins/packages/themes"));
themes_1.default.loadLocalThemes();
const index_1 = __importDefault(require("./plugins/packages/index"));
const chan_1 = require("./models/chan");
const utils_1 = __importDefault(require("./command-line/utils"));
// A random number that will force clients to reload the page if it differs
const serverHash = Math.floor(Date.now() * Math.random());
let manager = null;
async function default_1(options = {
    dev: false,
}) {
    log_1.default.info(`The Lounge ${chalk_1.default.green(helper_1.default.getVersion())} \
(Node.js ${chalk_1.default.green(process.versions.node)} on ${chalk_1.default.green(process.platform)} ${process.arch})`);
    log_1.default.info(`Configuration file: ${chalk_1.default.green(config_1.default.getConfigPath())}`);
    const staticOptions = {
        redirect: false,
        maxAge: 86400 * 1000,
    };
    const app = (0, express_1.default)();
    if (options.dev) {
        (await Promise.resolve().then(() => __importStar(require("./plugins/dev-server")))).default(app);
    }
    app.set("env", "production")
        .disable("x-powered-by")
        .use(allRequests)
        .use(addSecurityHeaders)
        .get("/", indexRequest)
        .get("/service-worker.js", forceNoCacheRequest)
        .get("/js/bundle.js.map", forceNoCacheRequest)
        .get("/css/style.css.map", forceNoCacheRequest)
        .use(express_1.default.static(utils_1.default.getFileFromRelativeToRoot("public"), staticOptions))
        .use("/storage/", express_1.default.static(config_1.default.getStoragePath(), staticOptions));
    if (config_1.default.values.fileUpload.enable) {
        uploader_1.default.router(app);
    }
    // This route serves *installed themes only*. Local themes are served directly
    // from the `public/themes/` folder as static assets, without entering this
    // handler. Remember this if you make changes to this function, serving of
    // local themes will not get those changes.
    app.get("/themes/:theme.css", (req, res) => {
        const themeName = req.params.theme;
        const theme = themes_1.default.getByName(themeName);
        if (theme === undefined || theme.filename === undefined) {
            return res.status(404).send("Not found");
        }
        return res.sendFile(theme.filename);
    });
    app.get("/packages/:package/:filename", (req, res) => {
        const packageName = req.params.package;
        const fileName = req.params.filename;
        const packageFile = index_1.default.getPackage(packageName);
        if (!packageFile || !index_1.default.getFiles().includes(`${packageName}/${fileName}`)) {
            return res.status(404).send("Not found");
        }
        const packagePath = config_1.default.getPackageModulePath(packageName);
        return res.sendFile(path_1.default.join(packagePath, fileName));
    });
    if (config_1.default.values.public && (config_1.default.values.ldap || {}).enable) {
        log_1.default.warn("Server is public and set to use LDAP. Set to private mode if trying to use LDAP authentication.");
    }
    let server;
    if (!config_1.default.values.https.enable) {
        const createServer = (await Promise.resolve().then(() => __importStar(require("http")))).createServer;
        server = createServer(app);
    }
    else {
        const keyPath = helper_1.default.expandHome(config_1.default.values.https.key);
        const certPath = helper_1.default.expandHome(config_1.default.values.https.certificate);
        const caPath = helper_1.default.expandHome(config_1.default.values.https.ca);
        if (!keyPath.length || !fs_1.default.existsSync(keyPath)) {
            log_1.default.error("Path to SSL key is invalid. Stopping server...");
            process.exit(1);
        }
        if (!certPath.length || !fs_1.default.existsSync(certPath)) {
            log_1.default.error("Path to SSL certificate is invalid. Stopping server...");
            process.exit(1);
        }
        if (caPath.length && !fs_1.default.existsSync(caPath)) {
            log_1.default.error("Path to SSL ca bundle is invalid. Stopping server...");
            process.exit(1);
        }
        const createServer = (await Promise.resolve().then(() => __importStar(require("https")))).createServer;
        server = createServer({
            key: fs_1.default.readFileSync(keyPath),
            cert: fs_1.default.readFileSync(certPath),
            ca: caPath ? fs_1.default.readFileSync(caPath) : undefined,
        }, app);
    }
    let listenParams;
    if (typeof config_1.default.values.host === "string" && config_1.default.values.host.startsWith("unix:")) {
        listenParams = config_1.default.values.host.replace(/^unix:/, "");
    }
    else {
        listenParams = {
            port: config_1.default.values.port,
            host: config_1.default.values.host,
        };
    }
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    server.on("error", (err) => log_1.default.error(`${err}`));
    server.listen(listenParams, () => {
        if (typeof listenParams === "string") {
            log_1.default.info("Available on socket " + chalk_1.default.green(listenParams));
        }
        else {
            const protocol = config_1.default.values.https.enable ? "https" : "http";
            const address = server?.address();
            if (address && typeof address !== "string") {
                // TODO: Node may revert the Node 18 family string --> number change
                // @ts-expect-error This condition will always return 'false' since the types 'string' and 'number' have no overlap.
                if (address.family === "IPv6" || address.family === 6) {
                    address.address = "[" + address.address + "]";
                }
                log_1.default.info("Available at " +
                    chalk_1.default.green(`${protocol}://${address.address}:${address.port}/`) +
                    ` in ${chalk_1.default.bold(config_1.default.values.public ? "public" : "private")} mode`);
            }
        }
        // This should never happen
        if (!server) {
            return;
        }
        const sockets = new socket_io_1.Server(server, {
            wsEngine: ws_1.Server,
            cookie: false,
            serveClient: false,
            // TODO: type as Server.Transport[]
            transports: config_1.default.values.transports,
            pingTimeout: 60000,
        });
        sockets.on("connect", (socket) => {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            socket.on("error", (err) => log_1.default.error(`io socket error: ${err}`));
            if (config_1.default.values.public) {
                performAuthentication.call(socket, {});
            }
            else {
                socket.on("auth:perform", performAuthentication);
                socket.emit("auth:start", serverHash);
            }
        });
        manager = new clientManager_1.default();
        index_1.default.loadPackages();
        const defaultTheme = themes_1.default.getByName(config_1.default.values.theme);
        if (defaultTheme === undefined) {
            log_1.default.warn(`The specified default theme "${chalk_1.default.red(config_1.default.values.theme)}" does not exist, verify your config.`);
            config_1.default.values.theme = "default";
        }
        else if (defaultTheme.themeColor) {
            config_1.default.values.themeColor = defaultTheme.themeColor;
        }
        new identification_1.default((identHandler, err) => {
            if (err) {
                log_1.default.error(`Could not start identd server, ${err.message}`);
                process.exit(1);
            }
            else if (!manager) {
                log_1.default.error("Could not start identd server, ClientManager is undefined");
                process.exit(1);
            }
            manager.init(identHandler, sockets);
        });
        // Handle ctrl+c and kill gracefully
        let suicideTimeout = null;
        const exitGracefully = async function () {
            if (suicideTimeout !== null) {
                return;
            }
            log_1.default.info("Exiting...");
            // Close all client and IRC connections
            if (manager) {
                manager.clients.forEach((client) => client.quit());
            }
            if (config_1.default.values.prefetchStorage) {
                log_1.default.info("Clearing prefetch storage folder, this might take a while...");
                (await Promise.resolve().then(() => __importStar(require("./plugins/storage")))).default.emptyDir();
            }
            // Forcefully exit after 3 seconds
            suicideTimeout = setTimeout(() => process.exit(1), 3000);
            // Close http server
            server?.close(() => {
                if (suicideTimeout !== null) {
                    clearTimeout(suicideTimeout);
                }
                process.exit(0);
            });
        };
        /* eslint-disable @typescript-eslint/no-misused-promises */
        process.on("SIGINT", exitGracefully);
        process.on("SIGTERM", exitGracefully);
        /* eslint-enable @typescript-eslint/no-misused-promises */
        // Clear storage folder after server starts successfully
        if (config_1.default.values.prefetchStorage) {
            Promise.resolve().then(() => __importStar(require("./plugins/storage"))).then(({ default: storage }) => {
                storage.emptyDir();
            })
                .catch((err) => {
                log_1.default.error(`Could not clear storage folder, ${err.message}`);
            });
        }
        changelog_1.default.checkForUpdates(manager);
    });
    return server;
}
exports.default = default_1;
function getClientLanguage(socket) {
    const acceptLanguage = socket.handshake.headers["accept-language"];
    if (typeof acceptLanguage === "string" && /^[\x00-\x7F]{1,50}$/.test(acceptLanguage)) {
        // only allow ASCII strings between 1-50 characters in length
        return acceptLanguage;
    }
    return null;
}
function getClientIp(socket) {
    let ip = socket.handshake.address || "127.0.0.1";
    if (config_1.default.values.reverseProxy) {
        const forwarded = String(socket.handshake.headers["x-forwarded-for"])
            .split(/\s*,\s*/)
            .filter(Boolean);
        if (forwarded.length && net_1.default.isIP(forwarded[0])) {
            ip = forwarded[0];
        }
    }
    return ip.replace(/^::ffff:/, "");
}
function getClientSecure(socket) {
    let secure = socket.handshake.secure;
    if (config_1.default.values.reverseProxy && socket.handshake.headers["x-forwarded-proto"] === "https") {
        secure = true;
    }
    return secure;
}
function allRequests(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    return next();
}
function addSecurityHeaders(req, res, next) {
    const policies = [
        "default-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "connect-src 'self' ws: wss:",
        "style-src 'self' https: 'unsafe-inline'",
        "script-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "font-src 'self' https:",
        "media-src 'self' https:", // self for notification sound; allow https media (audio previews)
    ];
    // If prefetch is enabled, but storage is not, we have to allow mixed content
    // - https://user-images.githubusercontent.com is where we currently push our changelog screenshots
    // - data: is required for the HTML5 video player
    if (config_1.default.values.prefetchStorage || !config_1.default.values.prefetch) {
        policies.push("img-src 'self' data: https://user-images.githubusercontent.com");
        policies.unshift("block-all-mixed-content");
    }
    else {
        policies.push("img-src http: https: data:");
    }
    res.setHeader("Content-Security-Policy", policies.join("; "));
    res.setHeader("Referrer-Policy", "no-referrer");
    return next();
}
function forceNoCacheRequest(req, res, next) {
    // Intermittent proxies must not cache the following requests,
    // browsers must fetch the latest version of these files (service worker, source maps)
    res.setHeader("Cache-Control", "no-cache, no-transform");
    return next();
}
function indexRequest(req, res) {
    res.setHeader("Content-Type", "text/html");
    return fs_1.default.readFile(utils_1.default.getFileFromRelativeToRoot("client/index.html.tpl"), "utf-8", (err, file) => {
        if (err) {
            throw err;
        }
        const config = {
            ...getServerConfiguration(),
            ...{ cacheBust: helper_1.default.getVersionCacheBust() },
        };
        res.send(lodash_1.default.template(file)(config));
    });
}
function initializeClient(socket, client, token, lastMessage, openChannel) {
    socket.off("auth:perform", performAuthentication);
    socket.emit("auth:success");
    client.clientAttach(socket.id, token);
    // Client sends currently active channel on reconnect,
    // pass it into `open` directly so it is verified and updated if necessary
    if (openChannel) {
        client.open(socket.id, openChannel);
        // If client provided channel passes checks, use it. if client has invalid
        // channel open (or windows like settings) then use last known server active channel
        openChannel = client.attachedClients[socket.id].openChannel || client.lastActiveChannel;
    }
    else {
        openChannel = client.lastActiveChannel;
    }
    if (config_1.default.values.fileUpload.enable) {
        new uploader_1.default(socket);
    }
    socket.on("disconnect", function () {
        process.nextTick(() => client.clientDetach(socket.id));
    });
    socket.on("input", (data) => {
        if (lodash_1.default.isPlainObject(data)) {
            client.input(data);
        }
    });
    socket.on("more", (data) => {
        if (lodash_1.default.isPlainObject(data)) {
            const history = client.more(data);
            if (history !== null) {
                socket.emit("more", history);
            }
        }
    });
    socket.on("network:new", (data) => {
        if (lodash_1.default.isPlainObject(data)) {
            // prevent people from overriding webirc settings
            data.uuid = null;
            data.commands = null;
            data.ignoreList = null;
            client.connectToNetwork(data);
        }
    });
    socket.on("network:get", (data) => {
        if (typeof data !== "string") {
            return;
        }
        const network = lodash_1.default.find(client.networks, { uuid: data });
        if (!network) {
            return;
        }
        socket.emit("network:info", network.exportForEdit());
    });
    socket.on("network:edit", (data) => {
        if (!lodash_1.default.isPlainObject(data)) {
            return;
        }
        const network = lodash_1.default.find(client.networks, { uuid: data.uuid });
        if (!network) {
            return;
        }
        network.edit(client, data);
    });
    socket.on("history:clear", (data) => {
        if (lodash_1.default.isPlainObject(data)) {
            client.clearHistory(data);
        }
    });
    if (!config_1.default.values.public && !config_1.default.values.ldap.enable) {
        socket.on("change-password", (data) => {
            if (lodash_1.default.isPlainObject(data)) {
                const old = data.old_password;
                const p1 = data.new_password;
                const p2 = data.verify_password;
                if (typeof p1 === "undefined" || p1 === "" || p1 !== p2) {
                    socket.emit("change-password", {
                        error: "",
                        success: false,
                    });
                    return;
                }
                helper_1.default.password
                    .compare(old || "", client.config.password)
                    .then((matching) => {
                    if (!matching) {
                        socket.emit("change-password", {
                            error: "password_incorrect",
                            success: false,
                        });
                        return;
                    }
                    const hash = helper_1.default.password.hash(p1);
                    client.setPassword(hash, (success) => {
                        const obj = { success: false, error: undefined };
                        if (success) {
                            obj.success = true;
                        }
                        else {
                            obj.error = "update_failed";
                        }
                        socket.emit("change-password", obj);
                    });
                })
                    .catch((error) => {
                    log_1.default.error(`Error while checking users password. Error: ${error.message}`);
                });
            }
        });
    }
    socket.on("open", (data) => {
        client.open(socket.id, data);
    });
    socket.on("sort", (data) => {
        if (lodash_1.default.isPlainObject(data)) {
            client.sort(data);
        }
    });
    socket.on("names", (data) => {
        if (lodash_1.default.isPlainObject(data)) {
            client.names(data);
        }
    });
    socket.on("changelog", () => {
        Promise.all([changelog_1.default.fetch(), index_1.default.outdated()])
            .then(([changelogData, packageUpdate]) => {
            changelogData.packages = packageUpdate;
            socket.emit("changelog", changelogData);
        })
            .catch((error) => {
            log_1.default.error(`Error while fetching changelog. Error: ${error.message}`);
        });
    });
    // In public mode only one client can be connected,
    // so there's no need to handle msg:preview:toggle
    if (!config_1.default.values.public) {
        socket.on("msg:preview:toggle", (data) => {
            if (lodash_1.default.isPlainObject(data)) {
                return;
            }
            const networkAndChan = client.find(data.target);
            const newState = Boolean(data.shown);
            if (!networkAndChan) {
                return;
            }
            // Process multiple message at once for /collapse and /expand commands
            if (Array.isArray(data.messageIds)) {
                for (const msgId of data.messageIds) {
                    const message = networkAndChan.chan.findMessage(msgId);
                    if (message) {
                        for (const preview of message.previews) {
                            preview.shown = newState;
                        }
                    }
                }
                return;
            }
            const message = networkAndChan.chan.findMessage(data.msgId);
            if (!message) {
                return;
            }
            const preview = message.findPreview(data.link);
            if (preview) {
                preview.shown = newState;
            }
        });
    }
    socket.on("mentions:get", () => {
        socket.emit("mentions:list", client.mentions);
    });
    socket.on("mentions:dismiss", (msgId) => {
        if (typeof msgId !== "number") {
            return;
        }
        client.mentions.splice(client.mentions.findIndex((m) => m.msgId === msgId), 1);
    });
    socket.on("mentions:dismiss_all", () => {
        client.mentions = [];
    });
    if (!config_1.default.values.public) {
        socket.on("push:register", (subscription) => {
            if (!Object.prototype.hasOwnProperty.call(client.config.sessions, token)) {
                return;
            }
            const registration = client.registerPushSubscription(client.config.sessions[token], subscription);
            if (registration) {
                client.manager.webPush.pushSingle(client, registration, {
                    type: "notification",
                    timestamp: Date.now(),
                    title: "The Lounge",
                    body: "🚀 Push notifications have been enabled",
                });
            }
        });
        socket.on("push:unregister", () => client.unregisterPushSubscription(token));
    }
    const sendSessionList = () => {
        // TODO: this should use the ClientSession type currently in client
        const sessions = lodash_1.default.map(client.config.sessions, (session, sessionToken) => {
            return {
                current: sessionToken === token,
                active: lodash_1.default.reduce(client.attachedClients, (count, attachedClient) => count + (attachedClient.token === sessionToken ? 1 : 0), 0),
                lastUse: session.lastUse,
                ip: session.ip,
                agent: session.agent,
                token: sessionToken, // TODO: Ideally don't expose actual tokens to the client
            };
        });
        socket.emit("sessions:list", sessions);
    };
    socket.on("sessions:get", sendSessionList);
    if (!config_1.default.values.public) {
        socket.on("setting:set", (newSetting) => {
            if (!lodash_1.default.isPlainObject(newSetting)) {
                return;
            }
            if (typeof newSetting.value === "object" ||
                typeof newSetting.name !== "string" ||
                newSetting.name[0] === "_") {
                return;
            }
            // We do not need to do write operations and emit events if nothing changed.
            if (client.config.clientSettings[newSetting.name] !== newSetting.value) {
                client.config.clientSettings[newSetting.name] = newSetting.value;
                // Pass the setting to all clients.
                client.emit("setting:new", {
                    name: newSetting.name,
                    value: newSetting.value,
                });
                client.save();
                if (newSetting.name === "highlights" || newSetting.name === "highlightExceptions") {
                    client.compileCustomHighlights();
                }
                else if (newSetting.name === "awayMessage") {
                    if (typeof newSetting.value !== "string") {
                        newSetting.value = "";
                    }
                    client.awayMessage = newSetting.value;
                }
            }
        });
        socket.on("setting:get", () => {
            if (!Object.prototype.hasOwnProperty.call(client.config, "clientSettings")) {
                socket.emit("setting:all", {});
                return;
            }
            const clientSettings = client.config.clientSettings;
            socket.emit("setting:all", clientSettings);
        });
        socket.on("search", async (query) => {
            const results = await client.search(query);
            socket.emit("search:results", results);
        });
        socket.on("mute:change", ({ target, setMutedTo }) => {
            const networkAndChan = client.find(target);
            if (!networkAndChan) {
                return;
            }
            const { chan, network } = networkAndChan;
            // If the user mutes the lobby, we mute the entire network.
            if (chan.type === chan_1.ChanType.LOBBY) {
                for (const channel of network.channels) {
                    if (channel.type !== chan_1.ChanType.SPECIAL) {
                        channel.setMuteStatus(setMutedTo);
                    }
                }
            }
            else {
                if (chan.type !== chan_1.ChanType.SPECIAL) {
                    chan.setMuteStatus(setMutedTo);
                }
            }
            for (const attachedClient of Object.keys(client.attachedClients)) {
                manager.sockets.in(attachedClient).emit("mute:changed", {
                    target,
                    status: setMutedTo,
                });
            }
            client.save();
        });
    }
    socket.on("sign-out", (tokenToSignOut) => {
        // If no token provided, sign same client out
        if (!tokenToSignOut || typeof tokenToSignOut !== "string") {
            tokenToSignOut = token;
        }
        if (!Object.prototype.hasOwnProperty.call(client.config.sessions, tokenToSignOut)) {
            return;
        }
        delete client.config.sessions[tokenToSignOut];
        client.save();
        lodash_1.default.map(client.attachedClients, (attachedClient, socketId) => {
            if (attachedClient.token !== tokenToSignOut) {
                return;
            }
            const socketToRemove = manager.sockets.of("/").sockets.get(socketId);
            socketToRemove.emit("sign-out");
            socketToRemove.disconnect();
        });
        // Do not send updated session list if user simply logs out
        if (tokenToSignOut !== token) {
            sendSessionList();
        }
    });
    // socket.join is a promise depending on the adapter.
    void socket.join(client.id?.toString());
    const sendInitEvent = (tokenToSend) => {
        socket.emit("init", {
            active: openChannel,
            networks: client.networks.map((network) => network.getFilteredClone(openChannel, lastMessage)),
            token: tokenToSend,
        });
        socket.emit("commands", inputs_1.default.getCommands());
    };
    if (config_1.default.values.public) {
        sendInitEvent(null);
    }
    else if (!token) {
        client.generateToken((newToken) => {
            token = client.calculateTokenHash(newToken);
            client.attachedClients[socket.id].token = token;
            client.updateSession(token, getClientIp(socket), socket.request);
            sendInitEvent(newToken);
        });
    }
    else {
        client.updateSession(token, getClientIp(socket), socket.request);
        sendInitEvent(null);
    }
}
function getClientConfiguration() {
    const config = lodash_1.default.pick(config_1.default.values, [
        "public",
        "lockNetwork",
        "useHexIp",
        "prefetch",
    ]);
    config.fileUpload = config_1.default.values.fileUpload.enable;
    config.ldapEnabled = config_1.default.values.ldap.enable;
    if (!config.lockNetwork) {
        config.defaults = lodash_1.default.clone(config_1.default.values.defaults);
    }
    else {
        // Only send defaults that are visible on the client
        config.defaults = lodash_1.default.pick(config_1.default.values.defaults, [
            "name",
            "nick",
            "username",
            "password",
            "realname",
            "join",
        ]);
    }
    config.isUpdateAvailable = changelog_1.default.isUpdateAvailable;
    config.applicationServerKey = manager.webPush.vapidKeys.publicKey;
    config.version = helper_1.default.getVersionNumber();
    config.gitCommit = helper_1.default.getGitCommit();
    config.themes = themes_1.default.getAll();
    config.defaultTheme = config_1.default.values.theme;
    config.defaults.nick = config_1.default.getDefaultNick();
    config.defaults.sasl = "";
    config.defaults.saslAccount = "";
    config.defaults.saslPassword = "";
    if (uploader_1.default) {
        config.fileUploadMaxFileSize = uploader_1.default.getMaxFileSize();
    }
    return config;
}
function getServerConfiguration() {
    return { ...config_1.default.values, ...{ stylesheets: index_1.default.getStylesheets() } };
}
function performAuthentication(data) {
    if (!lodash_1.default.isPlainObject(data)) {
        return;
    }
    const socket = this;
    let client;
    let token;
    const finalInit = () => initializeClient(socket, client, token, data.lastMessage || -1, data.openChannel);
    const initClient = () => {
        // Configuration does not change during runtime of TL,
        // and the client listens to this event only once
        if (!data.hasConfig) {
            socket.emit("configuration", getClientConfiguration());
            socket.emit("push:issubscribed", token && client.config.sessions[token].pushSubscription ? true : false);
        }
        client.config.browser = {
            ip: getClientIp(socket),
            isSecure: getClientSecure(socket),
            language: getClientLanguage(socket),
        };
        // If webirc is enabled perform reverse dns lookup
        if (config_1.default.values.webirc === null) {
            return finalInit();
        }
        reverseDnsLookup(client.config.browser?.ip, (hostname) => {
            client.config.browser.hostname = hostname;
            finalInit();
        });
    };
    if (config_1.default.values.public) {
        client = new client_1.default(manager);
        client.connect();
        manager.clients.push(client);
        socket.on("disconnect", function () {
            manager.clients = lodash_1.default.without(manager.clients, client);
            client.quit();
        });
        initClient();
        return;
    }
    if (typeof data.user !== "string") {
        return;
    }
    const authCallback = (success) => {
        // Authorization failed
        if (!success) {
            if (!client) {
                log_1.default.warn(`Authentication for non existing user attempted from ${chalk_1.default.bold(getClientIp(socket))}`);
            }
            else {
                log_1.default.warn(`Authentication failed for user ${chalk_1.default.bold(data.user)} from ${chalk_1.default.bold(getClientIp(socket))}`);
            }
            socket.emit("auth:failed");
            return;
        }
        // If authorization succeeded but there is no loaded user,
        // load it and find the user again (this happens with LDAP)
        if (!client) {
            client = manager.loadUser(data.user);
        }
        initClient();
    };
    client = manager.findClient(data.user);
    // We have found an existing user and client has provided a token
    if (client && data.token) {
        const providedToken = client.calculateTokenHash(data.token);
        if (Object.prototype.hasOwnProperty.call(client.config.sessions, providedToken)) {
            token = providedToken;
            return authCallback(true);
        }
    }
    auth_1.default.initialize().then(() => {
        // Perform password checking
        auth_1.default.auth(manager, client, data.user, data.password, authCallback);
    });
}
function reverseDnsLookup(ip, callback) {
    // node can throw, even if we provide valid input based on the DNS server
    // returning SERVFAIL it seems: https://github.com/thelounge/thelounge/issues/4768
    // so we manually resolve with the ip as a fallback in case something fails
    try {
        dns_1.default.reverse(ip, (reverseErr, hostnames) => {
            if (reverseErr || hostnames.length < 1) {
                return callback(ip);
            }
            dns_1.default.resolve(hostnames[0], net_1.default.isIP(ip) === 6 ? "AAAA" : "A", (resolveErr, resolvedIps) => {
                // TODO: investigate SoaRecord class
                if (!Array.isArray(resolvedIps)) {
                    return callback(ip);
                }
                if (resolveErr || resolvedIps.length < 1) {
                    return callback(ip);
                }
                for (const resolvedIp of resolvedIps) {
                    if (ip === resolvedIp) {
                        return callback(hostnames[0]);
                    }
                }
                return callback(ip);
            });
        });
    }
    catch (err) {
        log_1.default.error(`failed to resolve rDNS for ${ip}, using ip instead`, err.toString());
        setImmediate(callback, ip); // makes sure we always behave asynchronously
    }
}
