import { exec, spawn } from "node:child_process";
import {existsSync} from "node:fs";
import { promisify, parseArgs, isDeepStrictEqual } from "node:util";
import { join, resolve } from "node:path";
import { transpile } from "./codegen.ts";
import { createHash } from "node:crypto";

function hash(data: string[]) {
	const h = createHash("md5")
	for (const d of data) h.update(d, "utf-8");
	return h.digest("hex");
}

try {
	const args = parseArgs({
		options: {
			type: {type: "string"},
			target: {type: "string"},
			build: {type: "boolean", default: false},
			configure: {type: "boolean", default: false},
			transpile: {type: "boolean", default: false}
		}
	}).values;

	const targets = ["emscripten", "native"] as const;
	if (args.target && !targets.includes(args.target as typeof targets[number])) {
		throw new Error(`unrecognized target ${args.target}`);
	}

	const types = ["debug", "release"] as const;
	if (args.type && !types.includes(args.type as typeof types[number])) {
		throw new Error(`unrecognized build type ${args.type}`);
	}

	type Settings = Partial<{
		target: typeof targets[number],
		type: typeof types[number],
		specHash: string,
		generatedDTs: { hash: string, originalLength: number }
	}>;

	const oldOpts: Settings = existsSync("settings.json")
		? JSON.parse(await Deno.readTextFile("settings.json")) : {};
	const opts: Settings = { ...oldOpts, ...args as Settings };

	if (opts.type==undefined || opts.target==undefined) {
		throw new Error(`target or build type not set`);
	}

	const em = opts.target=="emscripten";
	const dbg = opts.type=="debug";
	const sourceDir = "cpp";
	const sharedDir = "shared";
	const generatedDTs = "client/generated/backend.d.ts";
	const buildDir = em ? "cpp/build" : "cpp/native";
	const wasmDir = "client/public/wasm";

	const needConfigure = args.configure || !existsSync(buildDir) || !isDeepStrictEqual(oldOpts, opts);

	console.log(`source: ${resolve(sourceDir)}, build: ${resolve(buildDir)}`);

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
	};

	if (needConfigure) {
		await run(`${em ? "emcmake cmake" : "cmake"} ${sourceDir
			} -B${buildDir} -DCMAKE_BUILD_TYPE=${dbg ? "Debug" : "RelWithDebInfo"}`);

		if (em) {
			console.log("fixing compile commands...");
			const cmds = JSON.parse(await Deno.readTextFile(join(buildDir, "compile_commands.json")));

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

			await Deno.writeTextFile(join(sourceDir, "compile_commands.json"), JSON.stringify(cmds));
			console.log("fixed");
		} else {
			await Deno.copyFile(join(buildDir, "compile_commands.json"), join(sourceDir, "compile_commands.json"));
		}
	}
	
	const specFiles = await Promise.all((await Array.fromAsync(Deno.readDir(sharedDir)))
		.filter(v=>v.isFile).map(v=>join(sharedDir,v.name))
		.map(async v=>({
			str: await Deno.readTextFile(v),
			fileName: v
		})));

	const specHash = hash(specFiles.map(v=>v.str));

	const dTsFile = join(buildDir, "post.d.ts");
	const jsFile = join(buildDir, "post.js");
	const cppFile = join(buildDir, "generated.hpp");

	let dTsSource: string|null=null;
	if (em && (opts.specHash==undefined || opts.specHash!=specHash
		|| args.transpile
		|| [dTsFile, jsFile, cppFile].some(x=>!existsSync(x)))) {

		opts.specHash=specHash;
		console.log(`transpiling ${resolve(sharedDir)}...`);

		const res = transpile(specFiles);

		await Deno.writeTextFile(jsFile, res.js);
		await Deno.writeTextFile(cppFile, res.cpp);
		await Deno.writeTextFile(dTsFile, res.dts);
		dTsSource=res.dts;
	} else if (em) {
		dTsSource=await Deno.readTextFile(dTsFile);
	}

	if (args.build) {
		await run(`${em ? "emmake cmake" : "cmake"} --build ${buildDir} --target backend`)
			.catch(err=>{ console.error(err.message); });
	}
	
	if (dTsSource!=null && existsSync(generatedDTs)) {
		const str = await Deno.readTextFile(generatedDTs);
		let len = str.length;
		if (opts.generatedDTs!=undefined && hash([str])==opts.generatedDTs.hash) {
			len=opts.generatedDTs.originalLength;
		}
		
		const out = [ str.slice(0, len), dTsSource ].join("\n");
		opts.generatedDTs = { hash: hash([out]), originalLength: len };
		await Deno.writeTextFile(generatedDTs, out);
	}
	
	if (em) await Deno.copyFile(join(sourceDir, "src/worker.js"), join(wasmDir, "backend.ww.js"))
	await Deno.writeTextFile("settings.json", JSON.stringify(opts));
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	Deno.exit(1);
}
