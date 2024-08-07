"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./plugins/auth"));
const client_1 = __importDefault(require("./client"));
const config_1 = __importDefault(require("./config"));
const webpush_1 = __importDefault(require("./plugins/webpush"));
const log_1 = __importDefault(require("./log"));
class ClientManager {
    clients;
    sockets;
    identHandler;
    webPush;
    constructor() {
        this.clients = [];
    }
    init(identHandler, sockets) {
        this.sockets = sockets;
        this.identHandler = identHandler;
        this.webPush = new webpush_1.default();
        if (!config_1.default.values.public) {
            this.loadUsers();
            // LDAP does not have user commands, and users are dynamically
            // created upon logon, so we don't need to watch for new files
            if (!config_1.default.values.ldap.enable) {
                this.autoloadUsers();
            }
        }
    }
    findClient(name) {
        name = name.toLowerCase();
        return this.clients.find((u) => u.name.toLowerCase() === name);
    }
    loadUsers() {
        let users = this.getUsers();
        if (users.length === 0) {
            log_1.default.info(`There are currently no users. Create one with ${chalk_1.default.bold("thelounge add <name>")}.`);
            return;
        }
        const alreadySeenUsers = new Set();
        users = users.filter((user) => {
            user = user.toLowerCase();
            if (alreadySeenUsers.has(user)) {
                log_1.default.error(`There is more than one user named "${chalk_1.default.bold(user)}". Usernames are now case insensitive, duplicate users will not load.`);
                return false;
            }
            alreadySeenUsers.add(user);
            return true;
        });
        // This callback is used by Auth plugins to load users they deem acceptable
        const callbackLoadUser = (user) => {
            this.loadUser(user);
        };
        if (!auth_1.default.loadUsers(users, callbackLoadUser)) {
            // Fallback to loading all users
            users.forEach((name) => this.loadUser(name));
        }
    }
    autoloadUsers() {
        fs_1.default.watch(config_1.default.getUsersPath(), lodash_1.default.debounce(() => {
            const loaded = this.clients.map((c) => c.name);
            const updatedUsers = this.getUsers();
            if (updatedUsers.length === 0) {
                log_1.default.info(`There are currently no users. Create one with ${chalk_1.default.bold("thelounge add <name>")}.`);
            }
            // Reload all users. Existing users will only have their passwords reloaded.
            updatedUsers.forEach((name) => this.loadUser(name));
            // Existing users removed since last time users were loaded
            lodash_1.default.difference(loaded, updatedUsers).forEach((name) => {
                const client = lodash_1.default.find(this.clients, { name });
                if (client) {
                    client.quit(true);
                    this.clients = lodash_1.default.without(this.clients, client);
                    log_1.default.info(`User ${chalk_1.default.bold(name)} disconnected and removed.`);
                }
            });
        }, 1000, { maxWait: 10000 }));
    }
    loadUser(name) {
        const userConfig = this.readUserConfig(name);
        if (!userConfig) {
            return;
        }
        let client = this.findClient(name);
        if (client) {
            if (userConfig.password !== client.config.password) {
                /**
                 * If we happen to reload an existing client, make super duper sure we
                 * have their latest password. We're not replacing the entire config
                 * object, because that could have undesired consequences.
                 *
                 * @see https://github.com/thelounge/thelounge/issues/598
                 */
                client.config.password = userConfig.password;
                log_1.default.info(`Password for user ${chalk_1.default.bold(name)} was reset.`);
            }
        }
        else {
            client = new client_1.default(this, name, userConfig);
            client.connect();
            this.clients.push(client);
        }
        return client;
    }
    getUsers = function () {
        if (!fs_1.default.existsSync(config_1.default.getUsersPath())) {
            return [];
        }
        return fs_1.default
            .readdirSync(config_1.default.getUsersPath())
            .filter((file) => file.endsWith(".json"))
            .map((file) => file.slice(0, -5));
    };
    addUser(name, password, enableLog) {
        if (path_1.default.basename(name) !== name) {
            throw new Error(`${name} is an invalid username.`);
        }
        const userPath = config_1.default.getUserConfigPath(name);
        if (fs_1.default.existsSync(userPath)) {
            log_1.default.error(`User ${chalk_1.default.green(name)} already exists.`);
            return false;
        }
        const user = {
            password: password || "",
            log: enableLog,
        };
        try {
            fs_1.default.writeFileSync(userPath, JSON.stringify(user, null, "\t"), {
                mode: 0o600,
            });
        }
        catch (e) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            log_1.default.error(`Failed to create user ${chalk_1.default.green(name)} (${e})`);
            throw e;
        }
        try {
            const userFolderStat = fs_1.default.statSync(config_1.default.getUsersPath());
            const userFileStat = fs_1.default.statSync(userPath);
            if (userFolderStat &&
                userFileStat &&
                (userFolderStat.uid !== userFileStat.uid || userFolderStat.gid !== userFileStat.gid)) {
                log_1.default.warn(`User ${chalk_1.default.green(name)} has been created, but with a different uid (or gid) than expected.`);
                log_1.default.warn("The file owner has been changed to the expected user. " +
                    "To prevent any issues, please run thelounge commands " +
                    "as the correct user that owns the config folder.");
                log_1.default.warn("See https://thelounge.chat/docs/usage#using-the-correct-system-user for more information.");
                fs_1.default.chownSync(userPath, userFolderStat.uid, userFolderStat.gid);
            }
        }
        catch (e) {
            // We're simply verifying file owner as a safe guard for users
            // that run `thelounge add` as root, so we don't care if it fails
        }
        return true;
    }
    getDataToSave(client) {
        const json = Object.assign({}, client.config, {
            networks: client.networks.map((n) => n.export()),
        });
        const newUser = JSON.stringify(json, null, "\t");
        const newHash = crypto_1.default.createHash("sha256").update(newUser).digest("hex");
        return { newUser, newHash };
    }
    saveUser(client, callback) {
        const { newUser, newHash } = this.getDataToSave(client);
        // Do not write to disk if the exported data hasn't actually changed
        if (client.fileHash === newHash) {
            return;
        }
        const pathReal = config_1.default.getUserConfigPath(client.name);
        const pathTemp = pathReal + ".tmp";
        try {
            // Write to a temp file first, in case the write fails
            // we do not lose the original file (for example when disk is full)
            fs_1.default.writeFileSync(pathTemp, newUser, {
                mode: 0o600,
            });
            fs_1.default.renameSync(pathTemp, pathReal);
            return callback ? callback() : true;
        }
        catch (e) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            log_1.default.error(`Failed to update user ${chalk_1.default.green(client.name)} (${e})`);
            if (callback) {
                callback(e);
            }
        }
    }
    removeUser(name) {
        const userPath = config_1.default.getUserConfigPath(name);
        if (!fs_1.default.existsSync(userPath)) {
            log_1.default.error(`Tried to remove non-existing user ${chalk_1.default.green(name)}.`);
            return false;
        }
        fs_1.default.unlinkSync(userPath);
        return true;
    }
    readUserConfig(name) {
        const userPath = config_1.default.getUserConfigPath(name);
        if (!fs_1.default.existsSync(userPath)) {
            log_1.default.error(`Tried to read non-existing user ${chalk_1.default.green(name)}`);
            return false;
        }
        try {
            const data = fs_1.default.readFileSync(userPath, "utf-8");
            return JSON.parse(data);
        }
        catch (e) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            log_1.default.error(`Failed to read user ${chalk_1.default.bold(name)}: ${e}`);
        }
        return false;
    }
}
exports.default = ClientManager;
