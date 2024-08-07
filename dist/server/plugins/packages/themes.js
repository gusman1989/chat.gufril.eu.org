"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const config_1 = __importDefault(require("../../config"));
const utils_1 = __importDefault(require("../../command-line/utils"));
const themes = new Map();
exports.default = {
    addTheme,
    getAll,
    getByName,
    loadLocalThemes,
};
function loadLocalThemes() {
    const builtInThemes = fs_1.default.readdirSync(utils_1.default.getFileFromRelativeToRoot("public", "themes"));
    builtInThemes
        .filter((theme) => theme.endsWith(".css"))
        .map(makeLocalThemeObject)
        .forEach((theme) => themes.set(theme.name, theme));
}
function addTheme(packageName, packageObject) {
    const theme = makePackageThemeObject(packageName, packageObject);
    if (theme) {
        themes.set(theme.name, theme);
    }
}
function getAll() {
    const filteredThemes = [];
    for (const theme of themes.values()) {
        filteredThemes.push(lodash_1.default.pick(theme, ["displayName", "name", "themeColor"]));
    }
    return lodash_1.default.sortBy(filteredThemes, "displayName");
}
function getByName(name) {
    return themes.get(name);
}
function makeLocalThemeObject(css) {
    const themeName = css.slice(0, -4);
    return {
        displayName: themeName.charAt(0).toUpperCase() + themeName.slice(1),
        name: themeName,
        themeColor: null,
    };
}
function makePackageThemeObject(moduleName, module) {
    if (!module || module.type !== "theme") {
        return;
    }
    const themeColor = /^#[0-9A-F]{6}$/i.test(module.themeColor) ? module.themeColor : null;
    const modulePath = config_1.default.getPackageModulePath(moduleName);
    return {
        displayName: module.name || moduleName,
        filename: path_1.default.join(modulePath, module.css),
        name: moduleName,
        themeColor: themeColor,
    };
}
