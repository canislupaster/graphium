import assert from "node:assert";
import {resolve} from "node:path";

const baseTypes = ["string","double","int","rcptr","ptr"] as const;

type Token = ({
	type: "type"|"or"|"lparen"|"rparen"
		|"left"|"right"|"colon"|"equal"|"question"
		|"comma"|"eof"
}|{
	type: "baseType",
	baseType: (typeof baseTypes)[number]
}|{
	type: "ident"|"string",
	name: string
})&{i: number, end: number};

const inputFilename = resolve("./model.spec");
const input = await Deno.readTextFile(inputFilename);

const tokenRegex = [
	[/\s+/, null],
	[/type/, "type"],
	[/\|/, "or"],
	[/\=/, "equal"],
	[/\?/, "question"],
	[/,/, "comma"],
	[/\{/, "left"],
	[/\}/, "right"],
	[/\(/, "lparen"],
	[/\)/, "rparen"],
	[/:/, "colon"],
	[/"(\w+)"/, "string"],
	[new RegExp(`(${baseTypes.join("|")})`), "baseType"],
	[/(\w+)/, "ident"]
] as const;

type IndexOrToken = {t: Token}|{i: number};

// 🤡
function quote(pos: IndexOrToken) {
	const range = "t" in pos ? [pos.t.i, pos.t.end] : [pos.i, pos.i+1];

	let lineI=1, colI=1, lineStart=0;
	let i=0;
	for (; i<range[0]; i++) {
		if (input[i]=="\n") lineI++, colI=0, lineStart=i+1;
		else colI++;
	}

	const arr = [input.slice(lineStart, i)];
	lineStart=i;
	for (; i<=range[1]; i++) {
		if (i==range[1] || input[i]=="\n") {
			arr.push(input.slice(lineStart, i)), lineStart=i+1;
		}
	}

	let nxt = input.indexOf("\n", range[1]);
	if (nxt==-1) nxt=input.length;
	arr.push(input.slice(range[1], nxt));

	return [
		` at ${inputFilename}:${lineI}:${colI}`,
		arr[0],
		...arr.slice(1, arr.length-1)
			.flatMap(v=>[`%c${v}`, "text-decoration:underline;font-style:italic;"]),
		arr[arr.length-1]
	];
};

function error(err: string, {notes,...pos}: (IndexOrToken|{})&{
	notes?: ({msg: string}&IndexOrToken)[]
}={}): never {

	console.error("%cerror: ", "color: red; font-weight: bold;",
		err, "t" in pos || "i" in pos ? quote(pos) : "")
	for (const note of notes ?? []) {
		console.info(`%cnote: `, "color: gray; font-weight: bold;", `${note.msg}${quote(note)}`)
	}

	return Deno.exit(1);
}

const unreachable = ()=>{throw new Error("unreachable!")};

const tokens: Token[] = [];
for (let i=0; i<input.length;) {
		const pi=i;
	for (const [re, ty] of tokenRegex) {
		const m = re.exec(input.slice(i));
		if (m && m.index==0) {
			if (ty) tokens.push({
				...ty=="baseType" ? {
					type: ty, baseType: m[1] as (Token&{type: "baseType"})["baseType"]
				} : ty=="ident" || ty=="string" ? {
					type: ty, name: m[1]
				} : {type: ty},

				i, end: i+m[0].length
			});

			i+=m[0].length;
		}
	}

	if (i==pi) error("expected token", {i});
}

tokens.push({type: "eof", i: input.length, end: input.length});
tokens.reverse();

const names = new Map<string, Definition>();

type Definition = ({ 
	type: "union",
	name: string,
	defs: Exclude<Definition, {type: "string"}>[]|(Definition&{type:"string"})[]
} | {
	type: "object",
	name: string,
	fields: [string, Exclude<Definition, {type: "string"}>][]
} | {
	type: "primitive",
	baseType: (typeof baseTypes)[number]
} | {
	type: "string", value: string
} | {
	type: "optional", inner: Definition
})&{start: Token};

type MainDefinition = Exclude<Definition, {type: "string"|"primitive"|"optional"}>;

const current = ()=>tokens[tokens.length-1];
const pos = ()=>current().i;
const peek = ()=>current().type;

function expect<T extends Token["type"]>(ty: T): Token&{type: T} {
	const t = tokens.pop()!;
	if (t.type!=ty) error(`expected ${ty}, got ${t.type}`, {t});
	return t as Token&{type: T};
}

const allDefs: MainDefinition[] = [];
function setDef(name: string, replace: MainDefinition) {
	const existing = names.get(name);
	if (existing) error(`${name} can only be defined once`, {
		t: replace.start,
		notes: [{t: existing.start, msg: "previously defined here"}]
	});
	else names.set(name, replace), allDefs.push(replace);
}

function parseUnion(name: string): MainDefinition {
	const start = current();

	const noStrDefs: Exclude<Definition, {type: "string"}>[]=[];
	const strDefs: (Definition&{type: "string"})[]=[];

	while (true) {
		const partStart = current();
		const rhs = parseRHS();
		rhs.type=="string" ? strDefs.push(rhs) : noStrDefs.push(rhs);

		if (strDefs.length>0 && noStrDefs.length>0) {
			error("union cannot mix strings and definitions", {t: partStart});
		}

		if (peek()!="or") break;
		expect("or");
	}

	const ret: MainDefinition = {
		type: "union", name, start,
		defs: noStrDefs.length==0 ? strDefs : noStrDefs
	};

	setDef(name, ret);
	return ret;
}

function parseObj(name: string): MainDefinition {
	const start = current();
	const ret: MainDefinition = {type: "object", name, fields: [], start};
	expect("left");

	let after=false;
	while (true) {
		if (peek()=="right") break;

		if (after) expect("comma");
		else after=true;

		const ident = expect("ident");
		expect("colon");
		const rhs = parseRHS();
		if (rhs.type=="string") error("string not allowed as field value", {t:ident});
		ret.fields.push([ident.name, rhs]);
	}

	expect("right");

	setDef(name, ret);
	return ret;
}

const usedPrimitives = new Set<(typeof baseTypes)[number]>();

function parseRHS(): Definition {
	let d: Definition;
	if (peek()=="string") {
		d={ type: "string", start: current(), value: expect("string").name };
	} else if (peek()=="baseType") {
		const ty = expect("baseType");
		usedPrimitives.add(ty.baseType);
		d={ type: "primitive", start: ty, baseType: ty.baseType };
	} else if (peek()=="ident") {
		const ident = expect("ident");
		const v = names.get(ident.name);

		if (peek()=="left") return parseObj(ident.name);
		else if (peek()=="lparen") {
			expect("lparen");
			const ret = parseUnion(name);
			expect("rparen");
			d=ret;
		} else if (v) {
			d=v;
		} else {
			error(`${ident.name} has not been defined`, {t: ident});
		}
	} else {
		error(`expected a definition, got ${peek()}`, {t: current()});
	}

	if (peek()=="question") {
		const q = expect("question");
		return {type: "optional", start: q, inner: d};
	} else {
		return d;
	}
}

function parse() {
	while (true) {
		if (peek()=="eof") return;

		expect("type");
		const name = expect("ident").name;
		expect("equal");

		if (peek()=="left") parseObj(name);
		else parseUnion(name);
	}
}

parse();

let js="", cpp="", tsd="";

cpp+=`
	#pragma once

	#include <emscripten.h>
`;

for (const prim of usedPrimitives) {
	switch (prim) {
		case "rcptr": {
			cpp+=`
				#include <memory>
				#include <atomic>

				struct RCBuffer {
					unique_ptr<char[16]> buf;
					atomic<size_t>** count() { return reinterpret_cast<atomic<size_t>**>(buf.get()+8); }
					atomic<size_t>* const* count() const { return reinterpret_cast<atomic<size_t>* const*>(buf.get()+8); }
					char** operator->() { return reinterpret_cast<char**>(buf.get()); }
					char*& operator*() { return *reinterpret_cast<char**>(buf.get()); }
					char* const* operator->() const { return reinterpret_cast<char* const*>(buf.get()); }
					char* const& operator*() const { return *reinterpret_cast<char* const*>(buf.get()); }

					RCBuffer() { *(*this) = nullptr; }
					explicit RCBuffer(char* buf_) {
						*(*this) = buf_;
						if (*(*this)) *count() = new std::atomic<size_t>(1);
					}

					RCBuffer(RCBuffer const& other) {
						*(*this) = *other;
						if (*(*this)) (*count()=*other.count())->fetch_add(1);
					}

					RCBuffer& operator=(RCBuffer const& other) {
						this->~RCBuffer();
						*(*this) = *other;
						if (*(*this)) (*count())->fetch_add(1);
						return *this;
					}

					~RCBuffer() {
						if (*(*this) && (*count())->fetch_sub(-1)==1) {
							delete *(*this);
							delete *count();
						}
					}
				};

				extern "C" atomic<size_t>* EMSCRIPTEN_KEEPALIVE atomic_create(size_t initial) {
					return new std::atomic<size_t>(initial);
				}

				extern "C" size_t EMSCRIPTEN_KEEPALIVE atomic_increment(atomic<size_t>* x) {
					return x->fetch_add(1);
				}

				extern "C" size_t EMSCRIPTEN_KEEPALIVE atomic_decrement(atomic<size_t>* x) {
					return x->fetch_sub(1);
				}
			`;
			break;
		}
		case "string": cpp+=`#include <string>\n#include <string_view>\n`; break;
	}
}

type Layout = {
	size: Primitive["size"],
	bufName: string
};

const names2 = new Map<string, Layout>();

type Primitive = {
	cppName: string,
	tsName: string,
	cppConstructorArgumentType: string,
	getter?: (buf: string, offset: string) => string,

	cppConstructorMove?: (buf: string, offset: string, argName: string) => string,
	size: {
		type: "dynamic", get: (argName: string)=>void
	} | {
		type: "fixed", value: number
	}
};

const primitiveSpec: Record<(typeof baseTypes)[number], Primitive> = {
	string: {
		cppName: "std::string_view", tsName: "string",
		cppConstructorArgumentType: "std::string const&",
		size: {
			type: "dynamic", get(argName) { return `${argName}.size()+8`; }
		},
		cppConstructorMove(buf, off, arg) {
			return `
				char const* ${arg}_ptr = ${buf}.get() + ${off};
				*reinterpret_cast<uint64_t*>(${arg}_ptr) = ${arg}.size();
				std::copy(${arg}.begin(), ${arg}.end(), ${arg}_ptr + 8);
			`;
		},
		getter(buf, off) {
			return `
				char const* v = ${buf}.get() + ${off};
				return std::string_view(v+8, *reinterpret_cast<uint64_t*>(v));
			`;
		}
	},
	double: {
		cppName: "double const&", tsName: "number",
		cppConstructorArgumentType: "double",
		size: {type: "fixed", value: 8}
	},
	int: {
		cppName: "uint64_t const&", tsName: "number",
		cppConstructorArgumentType: "uint64_t",
		size: {type: "fixed", value: 8}
	},
	rcptr: {
		cppName: "RCBuffer const&", tsName: "RCBuffer",
		size: {type: "fixed", value: 16},
		cppConstructorArgumentType: "RCBuffer&&",
		cppConstructorMove(buf, off, arg) {
			return `
				copy(${arg}.buf, ${arg}.buf+16, ${buf}.get()+${off});
				*(*${arg}) = nullptr;
			`;
		}
	},
	ptr: {
		cppName: "char* const&", tsName: "number",
		size: {type: "fixed", value: 8},
		cppConstructorArgumentType: "char*"
	}
};

function cppName(def: Definition) {
	switch (def.type) {
		case "object":
		case "union": return def.name;
		case "primitive": return ;
		case "string": throw new Error("no name of string");
	}
}

for (const def of allDefs) {
	switch (def.type) {
		case "object": {
			const sized = def.fields.map(([k, v], i)=>(v.type=="primitive" ? {
				...v, fieldName: k, i,
				layout: primitiveSpec[v.baseType]
			} : {
				...v, fieldName: k, i,
				layout: names2.get(v.name)!
			}));

			const dynSize = sized.findIndex(x=>x.layout.size.type=="dynamic");
			const numOffsets = dynSize==-1 ? 0 : sized.length - dynSize;

			const beforeDyn = sized.reduce((a,b)=>a+(
				b.layout.size.type=="fixed" && b.i<dynSize ? b.layout.size.value : 0
			), 0);
			
			const bufName = "_buf", offsetName = "_offset";
			if (sized.some(x=>x.fieldName==bufName || x.fieldName==offsetName)) {
				error(`cannot have field named ${bufName} or ${offsetName}`, {t: def.start});
			}

			cpp+=`
				struct ${def.name} {
					unique_ptr<char[]> ${bufName};
					size_t ${offsetName}[${numOffsets}];

					${def.name}(${sized.map(v=>
						`${v.type=="primitive"
							? v.layout.cppConstructorArgumentType
							: `${v.name}&&`} ${v.fieldName}`
					).join(", ")})${
						dynSize!=-1 ? "" : `: ${bufName}(std::make_unique<char[]>(${beforeDyn}))`
					} {
			`;

			if (dynSize!=-1) {
				for (const field of sized.slice(dynSize)) {
					cpp+=`${offsetName}[${field.i-dynSize}] = ${
						field.i>dynSize ? `${offsetName}[${field.i-dynSize-1}]` : beforeDyn
					} + ${
						field.layout.size.type=="dynamic"
							? field.layout.size.get(field.fieldName)
							: field.layout.size.value
					}`;
				}

				cpp+=`
					${bufName} = std::make_unique<char[]>(${offsetName}[${numOffsets-1}]);
				`;
			}
			
			let offset: number = 0;
			for (const field of sized) {
				const offsetStr = field.i>dynSize ? `${offsetName}[${field.i-dynSize-1}]`
					: offset.toString();
				const sizeStr = `
					${field.i>=dynSize ? `${offsetName}[${field.i-dynSize}]` : offset + (
						field.layout.size.type=="fixed" ? field.layout.size.value : unreachable()
					)} - ${offsetStr}
				`.trim();

				if (field.type=="primitive" && field.layout.cppConstructorMove) {
					cpp += `
						${field.layout.cppConstructorMove(bufName, offsetStr, field.fieldName)}
					`;
				} else if (field.type=="primitive") {
					cpp += `
						*reinterpret_cast<${field.layout.cppConstructorArgumentType}*>(${bufName}.get() + ${offsetStr}) = ${field.fieldName};
					`
				} else {
					cpp += `
						char* ${field.fieldName}_ptr = ${field.fieldName}.${field.layout.bufName}.get();
						copy(${field.fieldName}_ptr, ${field.fieldName}_ptr + ${sizeStr}, ${bufName}.get() + ${offsetStr});
					`
				}
				
				if (field.i<dynSize) {
					assert(field.layout.size.type=="fixed");
					offset+=field.layout.size.value;
				}
			}
						
			cpp+=`}`;

			for (const field of sized) {

			}

			cpp+=`}`;

			break;
		}
	}
}

function reindentCStyle(txt: string) {
	const out: string[]=[];
	let level=0;
	for (let line of txt.trim().split("\n")) {
		line=line.trim();
		if (line.length==0) continue;
		out.push("\t".repeat(level) + line);
		if (line.endsWith("{")) level++; else level--;
	}

	return out.join("\n");
}

await Deno.writeTextFile("./out.cpp", reindentCStyle(cpp));
