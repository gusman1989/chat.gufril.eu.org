"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const log_1 = __importDefault(require("../log"));
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const helper_1 = __importDefault(require("../helper"));
const config_1 = __importDefault(require("../config"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
let home;
class Utils {
    static extraHelp() {
        [
            "",
            "Environment variable:",
            `  THELOUNGE_HOME            Path for all configuration files and folders. Defaults to ${chalk_1.default.green(helper_1.default.expandHome(Utils.defaultHome()))}`,
            "",
        ].forEach((e) => log_1.default.raw(e));
    }
    static defaultHome() {
        if (home) {
            return home;
        }
        const distConfig = Utils.getFileFromRelativeToRoot(".thelounge_home");
        home = fs_1.default.readFileSync(distConfig, "utf-8").trim();
        return home;
    }
    static getFileFromRelativeToRoot(...fileName) {
        // e.g. /thelounge/server/command-line/utils.ts
        if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
            return path_1.default.resolve(path_1.default.join(__dirname, "..", "..", ...fileName));
        }
        // e.g. /thelounge/dist/server/command-line/utils.ts
        return path_1.default.resolve(path_1.default.join(__dirname, "..", "..", "..", ...fileName));
    }
    // Parses CLI options such as `-c public=true`, `-c debug.raw=true`, etc.
    static parseConfigOptions(val, memo) {
        // Invalid option that is not of format `key=value`, do nothing
        if (!val.includes("=")) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return memo;
        }
        const parseValue = (value) => {
            switch (value) {
                case "true":
                    return true;
                case "false":
                    return false;
                case "undefined":
                    return undefined;
                case "null":
                    return null;
                default:
                    if (/^-?[0-9]+$/.test(value)) {
                        // Numbers like port
                        return parseInt(value, 10);
                    }
                    else if (/^\[.*\]$/.test(value)) {
                        // Arrays
                        // Supporting arrays `[a,b]` and `[a, b]`
                        const array = value.slice(1, -1).split(/,\s*/);
                        // If [] is given, it will be parsed as `[ "" ]`, so treat this as empty
                        if (array.length === 1 && array[0] === "") {
                            return [];
                        }
                        return array.map(parseValue); // Re-parses all values of the array
                    }
                    return value;
            }
        };
        // First time the option is parsed, memo is not set
        if (memo === undefined) {
            memo = {};
        }
        // Note: If passed `-c foo="bar=42"` (with single or double quotes), `val`
        //       will always be passed as `foo=bar=42`, never with quotes.
        const position = val.indexOf("="); // Only split on the first = found
        const key = val.slice(0, position);
        const value = val.slice(position + 1);
        const parsedValue = parseValue(value);
        if (lodash_1.default.has(memo, key)) {
            log_1.default.warn(`Configuration key ${chalk_1.default.bold(key)} was already specified, ignoring...`);
        }
        else {
            memo = lodash_1.default.set(memo, key, parsedValue);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return memo;
    }
    static executeYarnCommand(command, ...parameters) {
        const yarn = require.resolve("yarn/bin/yarn.js");
        const packagesPath = config_1.default.getPackagesPath();
        const cachePath = path_1.default.join(packagesPath, "package_manager_cache");
        const staticParameters = [
            "--cache-folder",
            cachePath,
            "--cwd",
            packagesPath,
            "--json",
            "--ignore-scripts",
            "--non-interactive",
        ];
        const env = {
            // We only ever operate in production mode
            NODE_ENV: "production",
            // If The Lounge runs from a user that does not have a home directory,
            // yarn may fail when it tries to read certain folders,
            // we give it an existing folder so the reads do not throw a permission error.
            // Yarn uses os.homedir() to figure out the path, which internally reads
            // from the $HOME env on unix. On Windows it uses $USERPROFILE, but
            // the user folder should always exist on Windows, so we don't set it.
            HOME: cachePath,
        };
        return new Promise((resolve, reject) => {
            let success = false;
            const add = (0, child_process_1.spawn)(process.execPath, [yarn, command, ...staticParameters, ...parameters], { env: env });
            add.stdout.on("data", (data) => {
                data.toString()
                    .trim()
                    .split("\n")
                    .forEach((line) => {
                    try {
                        const json = JSON.parse(line);
                        if (json.type === "success") {
                            success = true;
                        }
                    }
                    catch (e) {
                        // Stdout buffer has limitations and yarn may print
                        // big package trees, for example in the upgrade command
                        // See https://github.com/thelounge/thelounge/issues/3679
                    }
                });
            });
            add.stderr.on("data", (data) => {
                data.toString()
                    .trim()
                    .split("\n")
                    .forEach((line) => {
                    try {
                        const json = JSON.parse(line);
                        switch (json.type) {
                            case "error":
                                log_1.default.error(json.data);
                                break;
                            case "warning":
                                // this includes pointless things like "ignored scripts due to flag"
                                // so let's hide it
                                break;
                        }
                        return;
                    }
                    catch (e) {
                        // we simply fall through and log at debug... chances are there's nothing the user can do about it
                        // as it includes things like deprecation warnings, but we might want to know as developers
                    }
                    log_1.default.debug(line);
                });
            });
            add.on("error", (e) => {
                log_1.default.error(`${e.message}:`, e.stack || "");
                process.exit(1);
            });
            add.on("close", (code) => {
                if (!success || code !== 0) {
                    return reject(code);
                }
                resolve(true);
            });
        });
    }
}
exports.default = Utils;
