import { mkdirSync, type Stats, statSync } from "node:fs";
import { resolve } from "node:path";
import type { ParseArgsConfig } from "node:util";
import { parseArgs } from "node:util";

import type { WranglerTarget } from "./utils/run-wrangler.js";
import { getWranglerEnvironmentFlag, isWranglerTarget } from "./utils/run-wrangler.js";

export type Arguments = (
	| {
			command: "build";
			skipNextBuild: boolean;
			skipWranglerConfigCheck: boolean;
			minify: boolean;
	  }
	| {
			command: "preview" | "deploy" | "upload";
			passthroughArgs: string[];
			cacheChunkSize?: number;
	  }
	| {
			command: "populateCache";
			target: WranglerTarget;
			environment?: string;
			cacheChunkSize?: number;
	  }
) & { outputDir?: string };

// Config for parsing CLI arguments
const config = {
	allowPositionals: true,
	strict: false,
	options: {
		skipBuild: { type: "boolean", short: "s", default: false },
		output: { type: "string", short: "o" },
		noMinify: { type: "boolean", default: false },
		skipWranglerConfigCheck: { type: "boolean", default: false },
		cacheChunkSize: { type: "string" },
	},
} as const satisfies ParseArgsConfig;

export function getArgs(): Arguments {
	const { positionals, values } = parseArgs(config);

	const outputDir = typeof values.output === "string" ? resolve(values.output) : undefined;
	if (outputDir) assertDirArg(outputDir, "output", true);

	switch (positionals[0]) {
		case "build":
			return {
				command: "build",
				outputDir,
				skipNextBuild:
					!!values.skipBuild || ["1", "true", "yes"].includes(String(process.env.SKIP_NEXT_APP_BUILD)),
				skipWranglerConfigCheck:
					!!values.skipWranglerConfigCheck ||
					["1", "true", "yes"].includes(String(process.env.SKIP_WRANGLER_CONFIG_CHECK)),
				minify: !values.noMinify,
			};
		case "preview":
		case "deploy":
		case "upload":
			return {
				command: positionals[0],
				outputDir,
				passthroughArgs: getPassthroughArgs(process.argv, config),
				...(values.cacheChunkSize && { cacheChunkSize: Number(values.cacheChunkSize) }),
			};
		case "populateCache":
			if (!isWranglerTarget(positionals[1])) {
				throw new Error(`Error: invalid target for populating the cache, expected 'local' | 'remote'`);
			}
			return {
				command: "populateCache",
				outputDir,
				target: positionals[1],
				environment: getWranglerEnvironmentFlag(process.argv),
				...(values.cacheChunkSize && { cacheChunkSize: Number(values.cacheChunkSize) }),
			};
		default:
			throw new Error(
				"Error: invalid command, expected 'build' | 'preview' | 'deploy' | 'upload' | 'populateCache'"
			);
	}
}

export function getPassthroughArgs<T extends ParseArgsConfig>(args: string[], { options = {} }: T) {
	const passthroughArgs: string[] = [];

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--") {
			passthroughArgs.push(...args.slice(i + 1));
			return passthroughArgs;
		}

		// look for `--arg(=value)`, `-arg(=value)`
		const [, name] = /^--?(\w[\w-]*)(=.+)?$/.exec(args[i]!) ?? [];
		if (name && !(name in options)) {
			passthroughArgs.push(args[i]!);

			// Array args can have multiple values
			// ref https://github.com/yargs/yargs-parser/blob/main/README.md#greedy-arrays
			while (i < args.length - 1 && !args[i + 1]?.startsWith("-")) {
				passthroughArgs.push(args[++i]!);
			}
		}
	}

	return passthroughArgs;
}

function assertDirArg(path: string, argName?: string, make?: boolean) {
	let dirStats: Stats;
	try {
		dirStats = statSync(path);
	} catch {
		if (!make) {
			throw new Error(`Error: the provided${argName ? ` "${argName}"` : ""} input is not a valid path`);
		}
		mkdirSync(path);
		return;
	}

	if (!dirStats.isDirectory()) {
		throw new Error(`Error: the provided${argName ? ` "${argName}"` : ""} input is not a directory`);
	}
}
