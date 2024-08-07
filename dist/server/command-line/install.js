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
/* eslint-disable @typescript-eslint/restrict-template-expressions */
const log_1 = __importDefault(require("../log"));
const chalk_1 = __importDefault(require("chalk"));
const semver_1 = __importDefault(require("semver"));
const helper_1 = __importDefault(require("../helper"));
const config_1 = __importDefault(require("../config"));
const utils_1 = __importDefault(require("./utils"));
const commander_1 = require("commander");
const program = new commander_1.Command("install");
program
    .argument("<package>", "package to install. Use `file:$path_to_package_dir` to install a local package")
    .description("Install a theme or a package")
    .on("--help", utils_1.default.extraHelp)
    .action(async function (packageName) {
    const fs = await Promise.resolve().then(() => __importStar(require("fs")));
    const fspromises = fs.promises;
    const path = await Promise.resolve().then(() => __importStar(require("path")));
    const packageJson = await Promise.resolve().then(() => __importStar(require("package-json")));
    if (!fs.existsSync(config_1.default.getConfigPath())) {
        log_1.default.error(`${config_1.default.getConfigPath()} does not exist.`);
        return;
    }
    log_1.default.info("Retrieving information about the package...");
    // TODO: type
    let readFile = null;
    let isLocalFile = false;
    if (packageName.startsWith("file:")) {
        isLocalFile = true;
        // our yarn invocation sets $HOME to the cachedir, so we must expand ~ now
        // else the path will be invalid when npm expands it.
        packageName = expandTildeInLocalPath(packageName);
        readFile = fspromises
            .readFile(path.join(packageName.substring("file:".length), "package.json"), "utf-8")
            .then((data) => JSON.parse(data));
    }
    else {
        const split = packageName.split("@");
        packageName = split[0];
        const packageVersion = split[1] || "latest";
        readFile = packageJson.default(packageName, {
            fullMetadata: true,
            version: packageVersion,
        });
    }
    if (!readFile) {
        // no-op, error should've been thrown before this point
        return;
    }
    readFile
        .then((json) => {
        const humanVersion = isLocalFile ? packageName : `${json.name} v${json.version}`;
        if (!("thelounge" in json)) {
            log_1.default.error(`${chalk_1.default.red(humanVersion)} does not have The Lounge metadata.`);
            process.exit(1);
        }
        if (json.thelounge.supports &&
            !semver_1.default.satisfies(helper_1.default.getVersionNumber(), json.thelounge.supports, {
                includePrerelease: true,
            })) {
            log_1.default.error(`${chalk_1.default.red(humanVersion)} does not support The Lounge v${helper_1.default.getVersionNumber()}. Supported version(s): ${json.thelounge.supports}`);
            process.exit(2);
        }
        log_1.default.info(`Installing ${chalk_1.default.green(humanVersion)}...`);
        const yarnVersion = isLocalFile ? packageName : `${json.name}@${json.version}`;
        return utils_1.default.executeYarnCommand("add", "--exact", yarnVersion)
            .then(() => {
            log_1.default.info(`${chalk_1.default.green(humanVersion)} has been successfully installed.`);
            if (isLocalFile) {
                // yarn v1 is buggy if a local filepath is used and doesn't update
                // the lockfile properly. We need to run an install in that case
                // even though that's supposed to be done by the add subcommand
                return utils_1.default.executeYarnCommand("install").catch((err) => {
                    throw `Failed to update lockfile after package install ${err}`;
                });
            }
        })
            .catch((code) => {
            throw `Failed to install ${chalk_1.default.red(humanVersion)}. Exit code: ${code}`;
        });
    })
        .catch((e) => {
        log_1.default.error(`${e}`);
        process.exit(1);
    });
});
function expandTildeInLocalPath(packageName) {
    const path = packageName.substring("file:".length);
    return "file:" + helper_1.default.expandHome(path);
}
exports.default = program;
