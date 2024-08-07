"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-var-requires */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const log_1 = __importDefault(require("./log"));
const helper_1 = __importDefault(require("./helper"));
const utils_1 = __importDefault(require("./command-line/utils"));
class Config {
    values = require(path_1.default.resolve(path_1.default.join(__dirname, "..", "defaults", "config.js")));
    #homePath = "";
    getHomePath() {
        return this.#homePath;
    }
    getConfigPath() {
        return path_1.default.join(this.#homePath, "config.js");
    }
    getUserLogsPath() {
        return path_1.default.join(this.#homePath, "logs");
    }
    getStoragePath() {
        return path_1.default.join(this.#homePath, "storage");
    }
    getFileUploadPath() {
        return path_1.default.join(this.#homePath, "uploads");
    }
    getUsersPath() {
        return path_1.default.join(this.#homePath, "users");
    }
    getUserConfigPath(name) {
        return path_1.default.join(this.getUsersPath(), `${name}.json`);
    }
    getClientCertificatesPath() {
        return path_1.default.join(this.#homePath, "certificates");
    }
    getPackagesPath() {
        return path_1.default.join(this.#homePath, "packages");
    }
    getPackageModulePath(packageName) {
        return path_1.default.join(this.getPackagesPath(), "node_modules", packageName);
    }
    getDefaultNick() {
        if (!this.values.defaults.nick) {
            return "thelounge";
        }
        return this.values.defaults.nick.replace(/%/g, () => Math.floor(Math.random() * 10).toString());
    }
    merge(newConfig) {
        this._merge_config_objects(this.values, newConfig);
    }
    _merge_config_objects(oldConfig, newConfig) {
        // semi exposed function so that we can test it
        // it mutates the oldConfig, but returns it as a convenience for testing
        for (const key in newConfig) {
            if (!Object.prototype.hasOwnProperty.call(oldConfig, key)) {
                log_1.default.warn(`Unknown key "${chalk_1.default.bold(key)}", please verify your config.`);
            }
        }
        return lodash_1.default.mergeWith(oldConfig, newConfig, (objValue, srcValue, key) => {
            // Do not override config variables if the type is incorrect (e.g. object changed into a string)
            if (typeof objValue !== "undefined" &&
                objValue !== null &&
                typeof objValue !== typeof srcValue) {
                log_1.default.warn(`Incorrect type for "${chalk_1.default.bold(key)}", please verify your config.`);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return objValue;
            }
            // For arrays, simply override the value with user provided one.
            if (lodash_1.default.isArray(objValue)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return srcValue;
            }
        });
    }
    setHome(newPath) {
        this.#homePath = helper_1.default.expandHome(newPath);
        // Reload config from new home location
        const configPath = this.getConfigPath();
        if (fs_1.default.existsSync(configPath)) {
            const userConfig = require(configPath);
            if (lodash_1.default.isEmpty(userConfig)) {
                log_1.default.warn(`The file located at ${chalk_1.default.green(configPath)} does not appear to expose anything.`);
                log_1.default.warn(`Make sure it is non-empty and the configuration is exported using ${chalk_1.default.bold("module.exports = { ... }")}.`);
                log_1.default.warn("Using default configuration...");
            }
            this.merge(userConfig);
        }
        if (this.values.fileUpload.baseUrl) {
            try {
                new URL("test/file.png", this.values.fileUpload.baseUrl);
            }
            catch (e) {
                this.values.fileUpload.baseUrl = undefined;
                log_1.default.warn(`The ${chalk_1.default.bold("fileUpload.baseUrl")} you specified is invalid: ${String(e)}`);
            }
        }
        const manifestPath = utils_1.default.getFileFromRelativeToRoot("public", "thelounge.webmanifest");
        // Check if manifest exists, if not, the app most likely was not built
        if (!fs_1.default.existsSync(manifestPath)) {
            log_1.default.error(`The client application was not built. Run ${chalk_1.default.bold("NODE_ENV=production yarn build")} to resolve this.`);
            process.exit(1);
        }
        // Load theme color from the web manifest
        const manifest = JSON.parse(fs_1.default.readFileSync(manifestPath, "utf8"));
        this.values.themeColor = manifest.theme_color;
        // log dir probably shouldn't be world accessible.
        // Create it with the desired permission bits if it doesn't exist yet.
        let logsStat = undefined;
        const userLogsPath = this.getUserLogsPath();
        try {
            logsStat = fs_1.default.statSync(userLogsPath);
        }
        catch {
            // ignored on purpose, node v14.17.0 will give us {throwIfNoEntry: false}
        }
        if (!logsStat) {
            try {
                fs_1.default.mkdirSync(userLogsPath, { recursive: true, mode: 0o750 });
            }
            catch (e) {
                log_1.default.error("Unable to create logs directory", e);
            }
        }
        else if (logsStat && logsStat.mode & 0o001) {
            log_1.default.warn(userLogsPath, "is world readable.", "The log files may be exposed. Please fix the permissions.");
            if (os_1.default.platform() !== "win32") {
                log_1.default.warn(`run \`chmod o-x "${userLogsPath}"\` to correct it.`);
            }
        }
    }
}
exports.default = new Config();
