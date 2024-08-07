"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../log"));
const commander_1 = require("commander");
const clientManager_1 = __importDefault(require("../clientManager"));
const utils_1 = __importDefault(require("./utils"));
const sqlite_1 = __importDefault(require("../plugins/messageStorage/sqlite"));
const storageCleaner_1 = require("../storageCleaner");
const program = new commander_1.Command("storage").description("various utilities related to the message storage");
program
    .command("migrate")
    .argument("[username]", "migrate a specific user only, all if not provided")
    .description("Migrate message storage where needed")
    .on("--help", utils_1.default.extraHelp)
    .action(function (user) {
    runMigrations(user).catch((err) => {
        log_1.default.error(err.toString());
        process.exit(1);
    });
});
program
    .command("clean")
    .argument("[user]", "clean messages for a specific user only, all if not provided")
    .description("Delete messages from the DB based on the storage policy")
    .on("--help", utils_1.default.extraHelp)
    .action(function (user) {
    runCleaning(user).catch((err) => {
        log_1.default.error(err.toString());
        process.exit(1);
    });
});
async function runMigrations(user) {
    const manager = new clientManager_1.default();
    const users = manager.getUsers();
    if (user) {
        if (!users.includes(user)) {
            throw new Error(`invalid user ${user}`);
        }
        return migrateUser(manager, user);
    }
    for (const name of users) {
        await migrateUser(manager, name);
        // if any migration fails we blow up,
        // chances are the rest won't complete either
    }
}
// runs sqlite migrations for a user, which must exist
async function migrateUser(manager, user) {
    log_1.default.info("handling user", user);
    if (!isUserLogEnabled(manager, user)) {
        log_1.default.info("logging disabled for user", user, ". Skipping");
        return;
    }
    const sqlite = new sqlite_1.default(user);
    await sqlite.enable(); // enable runs migrations
    await sqlite.close();
    log_1.default.info("user", user, "migrated successfully");
}
function isUserLogEnabled(manager, user) {
    const conf = manager.readUserConfig(user);
    if (!conf) {
        log_1.default.error("Could not open user configuration of", user);
        return false;
    }
    return conf.log;
}
async function runCleaning(user) {
    const manager = new clientManager_1.default();
    const users = manager.getUsers();
    if (user) {
        if (!users.includes(user)) {
            throw new Error(`invalid user ${user}`);
        }
        return cleanUser(manager, user);
    }
    for (const name of users) {
        await cleanUser(manager, name);
        // if any migration fails we blow up,
        // chances are the rest won't complete either
    }
}
async function cleanUser(manager, user) {
    log_1.default.info("handling user", user);
    if (!isUserLogEnabled(manager, user)) {
        log_1.default.info("logging disabled for user", user, ". Skipping");
        return;
    }
    const sqlite = new sqlite_1.default(user);
    await sqlite.enable();
    const cleaner = new storageCleaner_1.StorageCleaner(sqlite);
    const num_deleted = await cleaner.runDeletesNoLimit();
    log_1.default.info(`deleted ${num_deleted} messages`);
    log_1.default.info("running a vacuum now, this might take a while");
    if (num_deleted > 0) {
        await sqlite.vacuum();
    }
    await sqlite.close();
    log_1.default.info(`cleaning messages for ${user} has been successful`);
}
exports.default = program;
