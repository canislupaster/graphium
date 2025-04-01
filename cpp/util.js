import { exec, spawn } from "child_process";
import {existsSync} from "fs";
import {readFile, writeFile, copyFile} from "fs/promises";
import { abort, cwd, stdout, stderr } from "process";
import { promisify, parseArgs } from "util";
import { join } from "path";

const args = parseArgs({
	options: {
		type: {type: "string"},
		target: {type: "string"},
		build: {type: "boolean", default: false},
		configure: {type: "boolean", default: false}
	}
}).values;

if (args.target && !["emscripten", "native"].includes(args.target)) {
	console.error(`unrecognized target ${args.target}`);
	abort();
}

const opts = existsSync("settings.json") ? JSON.parse(await readFile("settings.json", "utf-8")) : {};
args.target ??= opts.target;
args.type ??= opts.type;

if (args.type==undefined || args.target==undefined) {
	console.error(`target or build type not set`);
	abort();
}

const em = args.target=="emscripten";
const dbg = args.type=="debug";
const buildDir = em ? "embuild" : "build";

const needConfigure = args.configure || args.target!=opts.target || args.type!=opts.type;

console.log(`build dir ${join(cwd(), buildDir)}`)

function run(cmd) {
	const proc = spawn(cmd, { shell: true, stdio: "inherit" });
	console.log(`running ${cmd}`);
	return new Promise((res,rej) => {
		proc.on("error", err=>rej(err));
		proc.on("close", c=>{
			if (c!=0) rej(new Error(`${cmd} exited with nonzero exit code`));
			else res();
		})
	});
}

if (needConfigure) {
	await run(`${em ? "emcmake cmake" : "cmake"} . -B${buildDir} -DCMAKE_BUILD_TYPE=${args.type=="debug" ? "Debug" : "RelWithDebInfo"}`);

	if (em) {
		console.log("fixing compile commands...");
		const cmds = JSON.parse(await readFile(`${buildDir}/compile_commands.json`, "utf-8"));

		for (const x of cmds) {
			const split = x.command.split(" ");
			if (split[0].endsWith("em++")) {
				//bulk memory is disabled by default and for some reason emitted as a flag idk why this changed...
				const cflags = await promisify(exec)(`em++ --cflags -mbulk-memory`);

				if (cflags.stderr.length>0) {
					console.error(cflags.stderr);
					abort();
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
