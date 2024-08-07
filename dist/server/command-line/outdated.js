"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const utils_1 = __importDefault(require("./utils"));
const packages_1 = __importDefault(require("../plugins/packages"));
const log_1 = __importDefault(require("../log"));
const program = new commander_1.Command("outdated");
program
    .description("Check for any outdated packages")
    .on("--help", utils_1.default.extraHelp)
    .action(async () => {
    log_1.default.info("Checking for outdated packages");
    await packages_1.default
        .outdated(0)
        .then((outdated) => {
        if (outdated) {
            log_1.default.info("There are outdated packages");
        }
        else {
            log_1.default.info("No outdated packages");
        }
    })
        .catch(() => {
        log_1.default.error("Error finding outdated packages.");
    });
});
exports.default = program;
