"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_dev_middleware_1 = __importDefault(require("webpack-dev-middleware"));
const webpack_hot_middleware_1 = __importDefault(require("webpack-hot-middleware"));
const log_1 = __importDefault(require("../log"));
const webpack_1 = __importDefault(require("webpack"));
const webpack_config_1 = __importDefault(require("../../webpack.config"));
exports.default = (app) => {
    log_1.default.debug("Starting server in development mode");
    const webpackConfig = (0, webpack_config_1.default)(undefined, { mode: "production" });
    if (!webpackConfig ||
        !webpackConfig.plugins?.length ||
        !webpackConfig.entry ||
        !webpackConfig.entry["js/bundle.js"]) {
        throw new Error("No valid production webpack config found");
    }
    webpackConfig.plugins.push(new webpack_1.default.HotModuleReplacementPlugin());
    webpackConfig.entry["js/bundle.js"].push("webpack-hot-middleware/client?path=storage/__webpack_hmr");
    const compiler = (0, webpack_1.default)(webpackConfig);
    app.use((0, webpack_dev_middleware_1.default)(compiler, {
        index: "/",
        publicPath: webpackConfig.output?.publicPath,
    })).use(
    // TODO: Fix compiler type
    (0, webpack_hot_middleware_1.default)(compiler, {
        path: "/storage/__webpack_hmr",
    }));
};
