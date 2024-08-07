"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-var-requires */
const log_1 = __importDefault(require("../log"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const config_1 = __importDefault(require("../config"));
const utils_1 = __importDefault(require("./utils"));
const program = new commander_1.Command("upgrade");
program
    .arguments("[packages...]")
    .description("Upgrade installed themes and packages to their latest versions")
    .on("--help", utils_1.default.extraHelp)
    .action(function (packages) {
    const fs = require("fs");
    const path = require("path");
    // Get paths to the location of packages directory
    const packagesConfig = path.join(config_1.default.getPackagesPath(), "package.json");
    const packagesList = JSON.parse(fs.readFileSync(packagesConfig, "utf-8")).dependencies;
    const argsList = ["upgrade", "--latest"];
    let count = 0;
    if (!Object.entries(packagesList).length) {
        log_1.default.warn("There are no packages installed.");
        return;
    }
    // If a package names are supplied, check they exist
    if (packages.length) {
        log_1.default.info("Upgrading the following packages:");
        packages.forEach((p) => {
            log_1.default.info(`- ${chalk_1.default.green(p)}`);
            if (Object.prototype.hasOwnProperty.call(packagesList, p)) {
                argsList.push(p);
                count++;
            }
            else {
                log_1.default.error(`${chalk_1.default.green(p)} is not installed.`);
            }
        });
    }
    else {
        log_1.default.info("Upgrading all packages...");
    }
    if (count === 0 && packages.length) {
        log_1.default.warn("There are not any packages to upgrade.");
        return;
    }
    const command = argsList.shift();
    const params = argsList;
    if (!command) {
        return;
    }
    return utils_1.default.executeYarnCommand(command, ...params)
        .then(() => {
        log_1.default.info("Package(s) have been successfully upgraded.");
    })
        .catch((code) => {
        log_1.default.error(`Failed to upgrade package(s). Exit code ${String(code)}`);
        process.exit(1);
    });
});
exports.default = program;
