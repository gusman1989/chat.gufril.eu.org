"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-var-requires */
const log_1 = __importDefault(require("../log"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const helper_1 = __importDefault(require("../helper"));
const config_1 = __importDefault(require("../config"));
const utils_1 = __importDefault(require("./utils"));
const program = new commander_1.Command("thelounge");
program
    .version(helper_1.default.getVersion(), "-v, --version")
    .option("-c, --config <key=value>", "override entries of the configuration file, must be specified for each entry that needs to be overriden", utils_1.default.parseConfigOptions)
    .on("--help", utils_1.default.extraHelp);
// Parse options from `argv` returning `argv` void of these options.
const argvWithoutOptions = program.parseOptions(process.argv);
config_1.default.setHome(process.env.THELOUNGE_HOME || utils_1.default.defaultHome());
// Check config file owner and warn if we're running under a different user
try {
    verifyFileOwner();
}
catch (e) {
    // We do not care about failures of these checks
    // fs.statSync will throw if config.js does not exist (e.g. first run)
}
// Create packages/package.json
createPackagesFolder();
// Merge config key-values passed as CLI options into the main config
config_1.default.merge(program.opts().config);
program.addCommand(require("./start").default);
program.addCommand(require("./install").default);
program.addCommand(require("./uninstall").default);
program.addCommand(require("./upgrade").default);
program.addCommand(require("./outdated").default);
program.addCommand(require("./storage").default);
if (!config_1.default.values.public) {
    require("./users").default.forEach((command) => {
        if (command) {
            program.addCommand(command);
        }
    });
}
// `parse` expects to be passed `process.argv`, but we need to remove to give it
// a version of `argv` that does not contain options already parsed by
// `parseOptions` above.
// This is done by giving it the updated `argv` that `parseOptions` returned,
// except it returns an object with `operands`/`unknown`, so we need to concat them.
// See https://github.com/tj/commander.js/blob/fefda77f463292/index.js#L686-L763
program.parse(argvWithoutOptions.operands.concat(argvWithoutOptions.unknown));
function createPackagesFolder() {
    const packagesPath = config_1.default.getPackagesPath();
    const packagesConfig = path_1.default.join(packagesPath, "package.json");
    // Create node_modules folder, otherwise yarn will start walking upwards to find one
    fs_1.default.mkdirSync(path_1.default.join(packagesPath, "node_modules"), { recursive: true });
    // Create package.json with private set to true, if it doesn't exist already
    if (!fs_1.default.existsSync(packagesConfig)) {
        fs_1.default.writeFileSync(packagesConfig, JSON.stringify({
            private: true,
            description: "Packages for The Lounge. Use `thelounge install <package>` command to add a package.",
            dependencies: {},
        }, null, "\t"));
    }
}
function verifyFileOwner() {
    if (!process.getuid) {
        return;
    }
    const uid = process.getuid();
    if (uid === 0) {
        log_1.default.warn(`You are currently running The Lounge as root. ${chalk_1.default.bold.red("We highly discourage running as root!")}`);
    }
    const configStat = fs_1.default.statSync(path_1.default.join(config_1.default.getHomePath(), "config.js"));
    if (configStat && configStat.uid !== uid) {
        log_1.default.warn("Config file owner does not match the user you are currently running The Lounge as.");
        log_1.default.warn("To prevent any issues, please run thelounge commands " +
            "as the correct user that owns the config folder.");
        log_1.default.warn("See https://thelounge.chat/docs/usage#using-the-correct-system-user for more information.");
    }
}
exports.default = program;
