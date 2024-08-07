"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../../log"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const helper_1 = __importDefault(require("../../helper"));
const config_1 = __importDefault(require("../../config"));
const utils_1 = __importDefault(require("../utils"));
const program = new commander_1.Command("reset");
program
    .description("Reset user password")
    .on("--help", utils_1.default.extraHelp)
    .argument("<name>", "name of the user")
    .option("--password [password]", "new password, will be prompted if not specified")
    .action(function (name, cmdObj) {
    if (!fs_1.default.existsSync(config_1.default.getUsersPath())) {
        log_1.default.error(`${config_1.default.getUsersPath()} does not exist.`);
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ClientManager = require("../../clientManager").default;
    const users = new ClientManager().getUsers();
    if (users === undefined) {
        // There was an error, already logged
        return;
    }
    if (!users.includes(name)) {
        log_1.default.error(`User ${chalk_1.default.bold(name)} does not exist.`);
        return;
    }
    if (cmdObj.password) {
        change(name, cmdObj.password);
        return;
    }
    log_1.default.prompt({
        text: "Enter new password:",
        silent: true,
    }, function (err, password) {
        if (err) {
            return;
        }
        change(name, password);
    });
});
function change(name, password) {
    const pathReal = config_1.default.getUserConfigPath(name);
    const pathTemp = pathReal + ".tmp";
    const user = JSON.parse(fs_1.default.readFileSync(pathReal, "utf-8"));
    user.password = helper_1.default.password.hash(password);
    user.sessions = {};
    const newUser = JSON.stringify(user, null, "\t");
    // Write to a temp file first, in case the write fails
    // we do not lose the original file (for example when disk is full)
    fs_1.default.writeFileSync(pathTemp, newUser, {
        mode: 0o600,
    });
    fs_1.default.renameSync(pathTemp, pathReal);
    log_1.default.info(`Successfully reset password for ${chalk_1.default.bold(name)}.`);
}
exports.default = program;
