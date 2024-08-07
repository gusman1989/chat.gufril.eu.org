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
const webpack = __importStar(require("webpack"));
const path = __importStar(require("path"));
const copy_webpack_plugin_1 = __importDefault(require("copy-webpack-plugin"));
const fork_ts_checker_webpack_plugin_1 = __importDefault(require("fork-ts-checker-webpack-plugin"));
const mini_css_extract_plugin_1 = __importDefault(require("mini-css-extract-plugin"));
const vue_loader_1 = require("vue-loader");
const babel_config_cjs_1 = __importDefault(require("./babel.config.cjs"));
const helper_1 = __importDefault(require("./server/helper"));
const tsCheckerPlugin = new fork_ts_checker_webpack_plugin_1.default({
    typescript: {
        diagnosticOptions: {
            semantic: true,
            syntactic: true,
        },
        build: true,
    },
});
const vueLoaderPlugin = new vue_loader_1.VueLoaderPlugin();
const miniCssExtractPlugin = new mini_css_extract_plugin_1.default({
    filename: "css/style.css",
});
const isProduction = process.env.NODE_ENV === "production";
const config = {
    mode: isProduction ? "production" : "development",
    entry: {
        "js/bundle.js": [path.resolve(__dirname, "client/js/vue.ts")],
    },
    devtool: "source-map",
    output: {
        clean: true,
        path: path.resolve(__dirname, "public"),
        filename: "[name]",
        publicPath: "/",
    },
    performance: {
        hints: false,
    },
    resolve: {
        extensions: [".ts", ".js", ".vue"],
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                use: {
                    loader: "vue-loader",
                    options: {
                        compilerOptions: {
                            preserveWhitespace: false,
                        },
                        appendTsSuffixTo: [/\.vue$/],
                    },
                },
            },
            {
                test: /\.ts$/i,
                include: [path.resolve(__dirname, "client"), path.resolve(__dirname, "shared")],
                exclude: path.resolve(__dirname, "node_modules"),
                use: {
                    loader: "babel-loader",
                    options: babel_config_cjs_1.default,
                },
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: mini_css_extract_plugin_1.default.loader,
                        options: {
                            esModule: false,
                        },
                    },
                    {
                        loader: "css-loader",
                        options: {
                            url: false,
                            importLoaders: 1,
                            sourceMap: true,
                        },
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            sourceMap: true,
                        },
                    },
                ],
            },
        ],
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "js/bundle.vendor.js",
                    chunks: "all",
                },
            },
        },
    },
    externals: {
        json3: "JSON", // socket.io uses json3.js, but we do not target any browsers that need it
    },
    plugins: [
        tsCheckerPlugin,
        vueLoaderPlugin,
        new webpack.DefinePlugin({
            __VUE_PROD_DEVTOOLS__: false,
            __VUE_OPTIONS_API__: false,
        }),
        miniCssExtractPlugin,
        new copy_webpack_plugin_1.default({
            patterns: [
                {
                    from: path
                        .resolve(__dirname, "node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff*")
                        .replace(/\\/g, "/"),
                    to: "fonts/[name][ext]",
                },
                {
                    from: path.resolve(__dirname, "./client/js/loading-error-handlers.js"),
                    to: "js/[name][ext]",
                },
                {
                    from: path.resolve(__dirname, "./client/*").replace(/\\/g, "/"),
                    to: "[name][ext]",
                    globOptions: {
                        ignore: [
                            "**/index.html.tpl",
                            "**/service-worker.js",
                            "**/*.d.ts",
                            "**/tsconfig.json",
                        ],
                    },
                },
                {
                    from: path.resolve(__dirname, "./client/service-worker.js"),
                    to: "[name][ext]",
                    transform(content) {
                        return content
                            .toString()
                            .replace("__HASH__", isProduction ? helper_1.default.getVersionCacheBust() : "dev");
                    },
                },
                {
                    from: path.resolve(__dirname, "./client/audio/*").replace(/\\/g, "/"),
                    to: "audio/[name][ext]",
                },
                {
                    from: path.resolve(__dirname, "./client/img/*").replace(/\\/g, "/"),
                    to: "img/[name][ext]",
                },
                {
                    from: path.resolve(__dirname, "./client/themes/*").replace(/\\/g, "/"),
                    to: "themes/[name][ext]",
                },
            ],
        }),
        // socket.io uses debug, we don't need it
        new webpack.NormalModuleReplacementPlugin(/debug/, path.resolve(__dirname, "scripts/noop.js")),
    ],
};
exports.default = (env, argv) => {
    if (argv.mode === "development") {
        config.target = "node";
        config.devtool = "eval";
        config.stats = "errors-only";
        config.output.path = path.resolve(__dirname, "test/public");
        config.entry["testclient.js"] = [path.resolve(__dirname, "test/client/index.ts")];
        // Add the istanbul plugin to babel-loader options
        for (const rule of config.module.rules) {
            // @ts-expect-error Property 'use' does not exist on type 'RuleSetRule | "..."'.
            if (rule.use.loader === "babel-loader") {
                // @ts-expect-error Property 'use' does not exist on type 'RuleSetRule | "..."'.
                rule.use.options.plugins = ["istanbul"];
            }
        }
        // `optimization.splitChunks` is incompatible with a `target` of `node`. See:
        // - https://github.com/zinserjan/mocha-webpack/issues/84
        // - https://github.com/webpack/webpack/issues/6727#issuecomment-372589122
        config.optimization.splitChunks = false;
        // Disable plugins like copy files, it is not required
        config.plugins = [
            tsCheckerPlugin,
            vueLoaderPlugin,
            miniCssExtractPlugin,
            // Client tests that require Vue may end up requireing socket.io
            new webpack.NormalModuleReplacementPlugin(/js(\/|\\)socket\.js/, path.resolve(__dirname, "scripts/noop.js")),
        ];
    }
    if (argv?.mode === "production") {
        // ...
    }
    return config;
};
