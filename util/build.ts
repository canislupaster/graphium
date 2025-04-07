import { exec, spawn } from "node:child_process";
import {existsSync} from "node:fs";
import {readFile, writeFile, copyFile} from "node:fs/promises";
import { abort, cwd, stdout, stderr, exit } from "node:process";
import { promisify, parseArgs } from "node:util";
import { join } from "node:path";

try {
	const args = parseArgs({
		options: {
			type: {type: "string"},
			target: {type: "string"},
			build: {type: "boolean", default: false},
			configure: {type: "boolean", default: false}
		}
	}).values;

	if (args.target && !["emscripten", "native"].includes(args.target)) {
		throw new Error(`unrecognized target ${args.target}`);
	}

	const opts = existsSync("settings.json") ? JSON.parse(await readFile("settings.json", "utf-8")) : {};
	args.target ??= opts.target;
	args.type ??= opts.type;

	if (args.type==undefined || args.target==undefined) {
		throw new Error(`target or build type not set`);
	}

	const em = args.target=="emscripten";
	const dbg = args.type=="debug";
	const buildDir = em ? "embuild" : "build";

	const needConfigure = args.configure || args.target!=opts.target || args.type!=opts.type;

	console.log(`build dir ${join(cwd(), buildDir)}`)

	const run = (cmd: string) => {
		const proc = spawn(cmd, { shell: true, stdio: "inherit" });
		console.log(`running ${cmd}`);
		return new Promise<void>((res,rej) => {
			proc.on("error", err=>rej(err));
			proc.on("close", c=>{
				if (c!=0) {
					rej(new Error(`${cmd} exited with nonzero exit code`));
				} else {
					res();
				}
			})
		});
	}

	if (needConfigure) {
		await run(`${em ? "emcmake cmake" : "cmake"} . -B${buildDir} -DCMAKE_BUILD_TYPE=${dbg ? "Debug" : "RelWithDebInfo"}`);

		if (em) {
			console.log("fixing compile commands...");
			const cmds = JSON.parse(await readFile(`${buildDir}/compile_commands.json`, "utf-8"));

			for (const x of cmds) {
				const split = x.command.split(" ");
				if (split[0].endsWith("em++")) {
					//bulk memory is disabled by default and for some reason emitted as a flag idk why this changed...
					const cflags = await promisify(exec)(`em++ --cflags -mbulk-memory`);

					if (cflags.stderr.length>0) {
						throw new Error(cflags.stderr);
					}

					x.command = `${x.command} ${cflags.stdout.trim()}`;
				}
			}

			await writeFile("compile_commands.json", JSON.stringify(cmds));
			console.log("fixed");
		} else {
			await copyFile(`${buildDir}/compile_commands.json`, "compile_commands.json");
		}

		await writeFile("settings.json", JSON.stringify(args))
	}

	if (args.build) {
		await run(`${em ? "emmake cmake" : "cmake"} --build ${buildDir} --target backend`);
	}
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	exit(1);
}
