#!/usr/bin/env node
import { createRequire } from "node:module";
import path from "node:path";

import { compileOpenNextConfig } from "@opennextjs/aws/build/compileConfig.js";
import { normalizeOptions } from "@opennextjs/aws/build/helper.js";
import { printHeader, showWarningOnWindows } from "@opennextjs/aws/build/utils.js";
import logger from "@opennextjs/aws/logger.js";
import { unstable_readConfig } from "wrangler";

import { Arguments, getArgs } from "./args.js";
import { build } from "./build/build.js";
import { createOpenNextConfigIfNotExistent, ensureCloudflareConfig } from "./build/utils/index.js";
import { deploy } from "./commands/deploy.js";
import { populateCache } from "./commands/populate-cache.js";
import { preview } from "./commands/preview.js";
import { upload } from "./commands/upload.js";
import { getWranglerConfigFlag, getWranglerEnvironmentFlag } from "./utils/run-wrangler.js";

const nextAppDir = process.cwd();

async function runCommand(args: Arguments) {
	printHeader(`Cloudflare ${args.command}`);

	showWarningOnWindows();

	const baseDir = nextAppDir;
	const require = createRequire(import.meta.url);
	const openNextDistDir = path.dirname(require.resolve("@opennextjs/aws/index.js"));

	// TODO: retrieve the compiled version if command != build
	await createOpenNextConfigIfNotExistent(baseDir);
	const { config, buildDir } = await compileOpenNextConfig(baseDir, undefined, {
		compileEdge: true,
	});

	ensureCloudflareConfig(config);

	// Initialize options
	const options = normalizeOptions(config, openNextDistDir, buildDir);
	logger.setLevel(options.debug ? "debug" : "info");

	switch (args.command) {
		case "build": {
			const argv = process.argv.slice(2);
			const wranglerEnv = getWranglerEnvironmentFlag(argv);
			const wranglerConfigFile = getWranglerConfigFlag(argv);
			const wranglerConfig = unstable_readConfig({ env: wranglerEnv, config: wranglerConfigFile });

			return build(options, config, { ...args, sourceDir: baseDir }, wranglerConfig);
		}
		case "preview":
			return preview(options, config, args);
		case "deploy":
			return deploy(options, config, args);
		case "upload":
			return upload(options, config, args);
		case "populateCache":
			return populateCache(options, config, args);
	}
}

await runCommand(getArgs());
