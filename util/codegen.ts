import assert from "node:assert";
import {resolve} from "node:path";

const baseTypes = ["string","double","int","rcptr","ptr"] as const;

type Token = ({
	type: "type"|"or"|"lparen"|"rparen"
		|"left"|"right"|"colon"|"equal"|"question"
		|"comma"|"eof"|"array"
}|{
	type: "baseType",
	baseType: (typeof baseTypes)[number]
}|{
	type: "ident"|"string",
	name: string
}|{
	type: "fixedArray", size: number
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
	[/\[\s*\]/, "array"],
	[/\[\s*(\d+)\s*\]/, "fixedArray"],
	[/:/, "colon"],
	[/"(\w[\w\d]*)"/, "string"],
	[new RegExp(`(${baseTypes.join("|")})`), "baseType"],
	[/(\w[\w\d]*)/, "ident"]
] as const;

type IndexOrToken = {t: Token}|{i: number};

function mergeColors(...str: string[]) {
	let txt=""; const styles=[];
	for (let i=0; i<str.length;) {
		const nxt = i+1+(str[i].match(/%c/g)?.length ?? 0);
		assert(nxt<=str.length);
		const addEmptyStyle = !str[i].startsWith("%c");
		txt+=`${addEmptyStyle ? "%c" : ""}${str[i]}`;
		styles.push(...addEmptyStyle ? [""] : [], ...str.slice(i+1,nxt));
		i=nxt;
	}

	return [txt, ...styles];
}

// 🤡
function quote(pos: IndexOrToken) {
	const range = "t" in pos ? [pos.t.i, pos.t.end] : [pos.i, pos.i+1];

	let lineI=1, colI=1, lineStart=0;
	let i=0;
	for (; i<range[0]; i++) {
		if (input[i]=="\n") lineI++, colI=1, lineStart=i+1;
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
		` at ${inputFilename}:${lineI}:${colI}\n`,
		arr[0],
		...arr.slice(1, arr.length-1)
			.flatMap(v=>[`%c${v}`, "text-decoration:underline;font-style:italic;"]),
		arr[arr.length-1]+"\n"
	];
};

class CompileError extends Error {}
function error(err: string, {notes,...pos}: (IndexOrToken|Record<keyof IndexOrToken, undefined>)&{
	notes?: ({msg: string}&IndexOrToken)[]
}={}): never {
	console.error(...mergeColors("%cerror: ", "color: red; font-weight: bold;",
		err, ..."t" in pos || "i" in pos ? quote(pos) : []));

	for (const note of notes ?? []) console.info(...mergeColors(
		`%cnote: `, "color: gray; font-weight: bold;", note.msg, ...quote(note)
	));

	throw new CompileError();
}

function handleError<T>(f: ()=>T, onErr: ()=>T) {
	try { return f(); } catch (err) {
		if (err instanceof CompileError) return onErr();
		throw err;
	}
}

const unreachable = (_c?: never)=>{throw new Error("unreachable!")};

const tokens: Token[] = [];
for (let i=0; i<input.length;) handleError(()=>{
	const pi=i;
	for (const [re, ty] of tokenRegex) {
		const m = re.exec(input.slice(i));
		if (m && m.index==0) {
			if (ty) tokens.push({
				...ty=="baseType" ? {
					type: ty, baseType: m[1] as (Token&{type: "baseType"})["baseType"]
				} : ty=="ident" || ty=="string" ? {
					type: ty, name: m[1]
				} : ty=="fixedArray" ? {
					type: "fixedArray", size: Number.parseInt(m[1])
				} : {type: ty},

				i, end: i+m[0].length
			});

			i+=m[0].length;
		}
	}

	if (i==pi) error("expected token", {i});
}, ()=>{
	i=input.indexOf("\n", i+1);
	if (i==-1) i=input.length;
})

tokens.push({type: "eof", i: input.length, end: input.length});
tokens.reverse();

const names = new Map<string, MainDefinition>();

type Definition = ({
	type: "enum",
	name: string,
	defs: (Definition&{type:"string"})[]
} | {
	type: "union",
	name: string,
	defs: Exclude<Definition, {type: "string"}>[]
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
	type: "optional", inner: Exclude<Definition, {type: "optional"|"string"}>
} | {
	type: "array", size: number|null,
	inner: Exclude<Definition, {type: "string"}>
})&{start: Token};

function defKey(def: Definition): string[] {
	if (def.type=="array") return [...defKey(def.inner), def.size==null ? "[]" : `[${def.size}]`];
	else if (def.type=="optional") return [...defKey(def.inner), "?"];
	else if (def.type=="primitive") return [def.baseType];
	else if (def.type=="string") return ["string", def.value];
	else if (def.type=="enum" || def.type=="object" || def.type=="union") return [def.name];
	else return unreachable(def);
}

type MainDefinition = Exclude<Definition, {type: "string"|"primitive"|"optional"|"array"}>;

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

function parseUnion(name: string, start: Token): MainDefinition {
	const noStrDefs: Exclude<Definition, {type: "string"}>[]=[];
	const strDefs: (Definition&{type: "string"})[]=[];
	const defNames = new Map<string, Token>();

	while (true) {
		const partStart = current();
		const rhs = parseRHS();

		const key = defKey(rhs);
		const existing = defNames.get(key.join("\n"));
		if (existing) {
			error(`redundant enum or union members of kind ${key.join(" ")}`, {
				t: partStart, notes: [{ msg: "other member here", t: existing }]
			})
		}

		defNames.set(key.join("\n"), partStart);

		rhs.type=="string" ? strDefs.push(rhs) : noStrDefs.push(rhs);

		if (strDefs.length>0 && noStrDefs.length>0) {
			error("enum/union cannot mix strings and definitions", {t: partStart});
		}

		if (peek()!="or") break;
		expect("or");
	}

	const ret: MainDefinition = strDefs.length==0 ? {
		type: "union", name, start, defs: noStrDefs
	} : {
		type: "enum", name, start, defs: strDefs
	};

	setDef(name, ret);
	return ret;
}

function parseObj(name: string, start: Token): MainDefinition {
	const ret: MainDefinition = {type: "object", name, fields: [], start};
	expect("left");

	let after=false;
	const fieldNames = new Map<string, Token>();
	while (true) {
		if (peek()=="right") break;

		if (after) expect("comma");
		else after=true;

		const ident = expect("ident");
		expect("colon");
		const rhs = parseRHS();
		if (rhs.type=="string") error("string not allowed as field value", {t:ident});

		const existing = fieldNames.get(ident.name);
		if (existing) error("duplicate field names", {
			t: ident, notes: [{msg: "other field here", t:existing}]
		});

		fieldNames.set(ident.name, ident);
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

		if (peek()=="left") return parseObj(ident.name, ident);
		else if (peek()=="lparen") {
			expect("lparen");
			const ret = parseUnion(name, ident);
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

	const exts = ["question", "array", "fixedArray"] as const;
	while (exts.some(x=>x==peek())) {
		const ext = expect(peek() as typeof exts[number]);
		if (d.type=="string") error("string not allowed here", {t:ext});

		if (ext.type=="question") {
			if (d.type=="optional") error("optionals cannot be nested", {t:ext});
			d={type: "optional", start: ext, inner: d};
		} else d={
			type: "array", size: ext.type=="fixedArray" ? ext.size : null,
			start: ext, inner: d
		};
	}

	return d;
}

function parse() {
	while (handleError(()=>{
		if (peek()=="eof") return false;

		const start = expect("type");
		const name = expect("ident").name;
		expect("equal");

		if (peek()=="left") parseObj(name, start);
		else parseUnion(name, start);
		return true;
	}, ()=>{
		while (peek()!="eof" && peek()!="type") {
			expect(peek());
		}
		return true;
	}));
}

parse();

let js="", cpp="", tsd="";

cpp+=`
	#pragma once

	#include <emscripten.h>
	#include <variant>
	#include <array>
	#include <vector>
	#include <optional>
	#include <algorithm>
`;

for (const prim of usedPrimitives) {
	switch (prim) {
		case "rcptr": {
			cpp+=`
				#include <memory>
				#include <atomic>

				class RCBuffer {
					char* buf=nullptr;
					atomic<size_t>* count;
					RCBuffer(char* buf_, atomic<size_t>* count_): buf(buf_), count(count_) {}

				public:
					explicit RCBuffer(char* buf_): buf(buf_) {
						if (buf) count = new std::atomic<size_t>(1);
					}

					char* data() const { return buf; }

					RCBuffer(RCBuffer const& other): buf(other.buf), count(other.count) { if (buf) count++; }

					RCBuffer& operator=(RCBuffer const& other) {
						if (count==other.count) throw std::runtime_error("can't assign RCBuffer to itself");
						this->~RCBuffer();
						buf=other.buf, count=other.count;
						if (buf) count++;
						return *this;
					}

					static inline RCBuffer deserialize(char*& buf) {
						RCBuffer ret {
							*reinterpret_cast<char**>(buf),
							*reinterpret_cast<atomic<size_t>**>(*(buf+8))
						};
						buf += 16;
						return ret;
					}

					constexpr inline size_t serialization_size() const { return 16; }

					inline void serialize(char*& target) const {
						*reinterpret_cast<char**>(target) = buf;
						*reinterpret_cast<atomic<size_t>**>(target+8) = count;
						count->fetch_add(1);
						return target+16;
					}

					~RCBuffer() {
						if (buf && count->fetch_sub(-1)==1) {
							delete buf; delete count;
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
			
			js += `
				class RCBuffer {
					constructor(arg) {
						if (arg instanceof RCBuffer) {
							this.ptr = arg.ptr;
							this.count = arg.count;
							_atomic_increment(this.count);
						} else if (typeof arg=="object" && "ptr" in arg && "count" in arg) {
							this.ptr=arg.ptr; this.count=arg.count;
						} else {
							const arr = new Uint8Array(arg);
							this.ptr = _malloc(arr.byteLength)
							this.count = _atomic_create(1);
						}
					}

					[Symbol.dispose]() {
						if (_atomic_decrement(this.count)==1) {
							_free(this.ptr); _free(this.count);
						}
					}

					static deserialize(ptr) {
						const arr = new BigUint64Array(HEAPU8.subarray(ptr.current,ptr.current+16));
						ptr.current+=16;
						return new RCBuffer({ ptr: arr[0], count: arr[1] });
					}

					serialization_size() { return 16; }

					serialize(ptr) {
						HEAPU8.set(new BigUint64Array([ this.ptr, this.count ]), ptr.current);
						ptr.current+=16;
					}
				}
			`;

			break;
		}
		case "string": { cpp+=`#include <string>\n`; break; }
	}
}

type Meta = {
	cppname: string, tsname: string,
	size: {
		type: "dynamic",
		cppGet: (expr: string)=>string
		jsGet: (expr: string)=>string
	} | { type: "fixed", value: number },
	cppSerialize: (expr: string, targetPtr: string, name: string)=>string,
	cppDeserialize: (varName: string, sourcePtr: string)=>string
	jsSerialize: (expr: string, targetPtr: string, name: string)=>string,
	jsDeserialize: (varName: string, sourcePtr: string)=>string
};

const cppDef = new Map<Definition, Meta>();

const trivialSerde = (cppTy: string, jsTy: string, sz: number) => ({
	cppSerialize(expr, target) {
		return `*reinterpret_cast<${cppTy}*>((${target}+=${sz})-${sz}) = ${expr};`;
	},
	cppDeserialize(varName, src) {
		return `${cppTy} ${varName} = *reinterpret_cast<${cppTy}*>((${src}+=${sz})-${sz});`;
	},
	jsSerialize(expr, target) {
		return `HEAPU8.set(new ${jsTy}Array(${expr}), (${target}.current+=${sz})-${sz});`;
	},
	jsDeserialize(varName, src) {
		return `
			const ${varName} = new ${jsTy}Array(HEAPU8.subarray(${src}.current, (${
				src}.current+=${sz})-${sz}));
		`;
	}
} satisfies Pick<Meta, `${string}${"Deserialize"|"Serialize"}`&(keyof Meta)>);

const primitiveSpec: Record<(typeof baseTypes)[number], Meta> = {
	string: {
		cppname: "std::string",
		size: {
			type: "dynamic",
			cppGet(expr) { return `${expr}.size()+8`; },
			jsGet(expr) { return `lengthBytesUTF8(${expr})` },
		},
		cppSerialize(expr, target) {
			return `
				*reinterpret_cast<uint64_t*>((${target}+=8)-8) = ${expr}.size();
				std::copy(${expr}.begin(), ${expr}.end(), ${target});
				${target} += ${expr}.size();
			`;
		},
		cppDeserialize(varName, src) {
			return `
				size_t ${varName}_size = *reinterpret_cast<uint64_t*>((${src}+=8)-8);
				std::string ${varName}(${src}, ${src}+${varName}_size);
				${src}+=${varName}_size;
			`;
		},
		jsSerialize(expr, target) {
			return `
				_
				stringToUTF8()
			`;
		}
	},
	double: {
		cppname: "double", size: {type: "fixed", value: 8},
		...trivialSerde("double", 8)
	},
	int: {
		cppname: "int64_t", size: {type: "fixed", value: 8},
		...trivialSerde("int64_t", 8)
	},
	rcptr: {
		cppname: "RCBuffer",
		size: {type: "fixed", value: 16},
		cppSerialize(expr, target) { return `${expr}.serialize(${target});`; },
		cppDeserialize(varName, src) { return `RCBuffer ${varName} = RCBuffer::deserialize(${src})`; }
	},
	ptr: {
		cppname: "char*", size: {type: "fixed", value: 8},
		...trivialSerde("char*", 8)
	}
};

function getCPP(def: Exclude<Definition, {type: "string"}>, t: Token): Meta {
	let ret = cppDef.get(def);
	if (ret) return ret;
	
	if (def.type=="primitive"){
		ret=primitiveSpec[def.baseType];
	} else if (def.type=="optional") {
		const inner = getCPP(def.inner, def.start);
		const sz = inner.size;

		ret={
			cppname: `std::optional<${inner.cppname}>`,
			size: sz.type=="fixed" ? {type: "fixed", value: sz.value+1}
				: {type: "dynamic", cppGet: (expr)=>`(${expr} ? ${sz.cppGet(expr)}+1 : 1)`},
			cppSerialize(expr, targetPtr) {
				return `
					*(${targetPtr}++) = expr ? 1 : 0;
					if (${expr}) {
						${inner.cppSerialize(`*${expr}`, targetPtr)}
					}
				`;
			},
			cppDeserialize(varName, sourcePtr) {
				return `
					${this.cppname} ${varName};
					if (*(${sourcePtr}++)) {
						${inner.cppDeserialize(`${varName}_inner`, sourcePtr)}
						${varName} = std::move(${varName}_inner);
					}
				`
			}
		};
	} else if (def.type=="array") {
		const inner = getCPP(def.inner, def.start);
		const innerSize = inner.size;
		const id = cppDef.size;

		let outSize: Meta["size"];
		if (def.size!=null) {
			if (innerSize.type=="fixed") outSize={type: "fixed", value: def.size*innerSize.value};
			else outSize={
				type: "dynamic",
				cppGet: (expr)=>[...new Array(def.size)].map((_,i)=>{
					innerSize.cppGet(`${expr}[${i}]`)
				}).join("+") // 🤓
			};
		} else if (innerSize.type=="fixed") {
			outSize={ type: "dynamic", cppGet: (expr)=>`${expr}.size()*${innerSize.value}+8` };
		} else if (innerSize.type=="dynamic") {
			outSize={
				type: "dynamic",
				cppGet: (expr)=>`8+std::accumulate(${expr}.begin(), ${expr}.end(), 0, [](size_t _${id}, ${
					inner.cppname} const& _${id}_inner) { return _${id} + ${innerSize.cppGet(`_${id}_inner`)}; })`
			};
		} else {
			return unreachable(innerSize);
		}

		ret={
			cppname: def.size==null ? `std::vector<${inner.cppname}>`
				: `std::array<${inner.cppname}, ${def.size}>`,
			size: outSize,
			cppSerialize(expr, targetPtr) {
				return `
					${def.size==null
						? `*reinterpret_cast<uint64_t*>((${targetPtr}+=8)-8) = ${expr}.size();` : ""}
					for (${inner.cppname} const& _${id}: ${expr}) {
						${inner.cppSerialize(`_${id}`, targetPtr)}
					}
				`;
			},
			cppDeserialize(varName, sourcePtr) {
				return def.size==null ? `
					${this.cppname} ${varName};
					size_t ${varName}_nel = *reinterpret_cast<uint64_t*>((${sourcePtr}+=8)-8);
					${varName}.reserve(${varName}_nel);
					for (; ${varName}_nel; ${varName}_nel--) {
						${inner.cppDeserialize(`${varName}_el`, sourcePtr)} 
						${varName}.push_back(std::move(${varName}_el));
					}
				` : `
					${[...new Array(def.size)].map((_,i)=>
						inner.cppDeserialize(`${varName}_${i}`, sourcePtr)
					).join("\n")}
					${this.cppname} ${varName} = { ${
						[...new Array(def.size)].map((_,i)=>`std::move(${varName}_${i})`).join(", ")
					} };
				`;
			}
		};
	} else {
		error(`${def.name} is undefined but used here`, {t});
	}

	return ret;
}

function boundedInt(bound: number) {
	const log = Math.log2(bound)/8;
	const options = [
		[1, "unsigned char"], [2, "unsigned short"],
		[4, "unsigned"], [8, "uint64_t"],
	] as const;

	return options.find(([a])=>a>=log) ?? unreachable();
}

for (const def of allDefs) handleError(()=>{
	const bufName = "_buf";
	const reserved = [
		"serialization_size", "serializationSize",
		"serialize", "deserialize",
		...def.type=="object" ? [] : ["value"]
	];

	const innerNames = def.type=="object" ? def.fields.map(([k])=>k)
		: def.type=="enum" ? def.defs.map(x=>x.value) : [];
	if (innerNames.some(x=>x.startsWith("_"))) {
		error(`members cannot begin with underscore`, {t: def.start});
	}
	for (const r of reserved) if (innerNames.includes(r)) {
		error(`cannot have member named ${r}`, {t: def.start});
	}

	let fixedSize: number|null = null;
	switch (def.type) {
		case "object": {
			const sized = def.fields.map(([k, v], i)=>({
				...v, fieldName: k, i, cpp: getCPP(v, def.start)
			}));

			if (!sized.some(x=>x.cpp.size.type=="dynamic")) {
				fixedSize=sized
					.map(v=>v.cpp.size.type=="fixed" ? v.cpp.size.value : unreachable())
					.reduce((a,b)=>a+b, 0)
			}

			cpp+=`
				struct ${def.name} {
					${sized.map(v=>`${v.cpp.cppname} ${v.fieldName};`).join("\n")}

				${fixedSize==null ? "" : "constexpr "}inline size_t serialization_size() const { 
					return ${fixedSize!=null ? fixedSize : sized.map(x=>
						x.cpp.size.type=="fixed" ? x.cpp.size.value : x.cpp.size.cppGet(x.fieldName)
					).join(" + ")};
				}

				inline void serialize(char*& ${bufName}) const {
			`;
			cpp+=sized.map(x=>x.cpp.cppSerialize(x.fieldName, bufName)).join("\n");
			cpp+=`}
			
			static inline ${def.name} deserialize(char*& ${bufName}) {\n`;
			cpp+=sized.map(x=>x.cpp.cppDeserialize(x.fieldName, bufName)).join("\n");
			cpp+=`
						return ${def.name} {
							${sized.map(v=>`.${v.fieldName}=std::move(${v.fieldName})`).join(",\n")}
						};
					}
				};
			`;

			break;
		}
		case "enum": {
			const [tagSize, cppTag] = boundedInt(def.defs.length);
			cpp += `
				struct ${def.name} {
					enum _Inner { ${def.defs.map(v=>v.value).join(", ")} } value;
					
					constexpr inline size_t serialization_size() const { return ${tagSize}; }
					inline void serialize(char*& ${bufName}) const {
						*reinterpret_cast<${cppTag}*>(${bufName}) = static_cast<${cppTag}>(value);
					}

					static inline ${def.name} deserialize(char*& ${bufName}) {
						return ${def.name} {
							.value = static_cast<_Inner>(*reinterpret_cast<${cppTag}*>(${bufName}))
						};
					}
				};
			`;

			fixedSize=8;
			break;
		}
		case "union": {
			const withCPP = def.defs.map(x=>({...x, cpp: getCPP(x, def.start)}));
			for (const v of withCPP) {
				if (v.cpp.size.type=="dynamic"
					|| fixedSize!=null && v.cpp.size.value!=fixedSize) {
					fixedSize=null; break;
				}

				fixedSize=v.cpp.size.value;
			}

			const [tagSize, cppTag] = boundedInt(withCPP.length);
			if (fixedSize!=null) fixedSize+=tagSize;

			const defaultCase = `default: throw std::runtime_error("invalid value of ${def.name}");`;

			cpp += `
				struct ${def.name} {
					std::variant<${withCPP.map(x=>x.cpp.cppname).join(", ")}> value;

					${fixedSize!=null ? "constexpr " : ""}inline size_t serialization_size() const {
						${fixedSize==null ? `switch (value.index()) {
							${withCPP.map((x,i) => `
								case ${i}: return ${
									x.cpp.size.type=="fixed" ? tagSize+x.cpp.size.value
									: `${tagSize}+${x.cpp.size.cppGet(`std::get<${x.cpp.cppname}>(value)`)}`
								};
							`).join("\n")}
							${defaultCase}
						}` : `return ${fixedSize};`}
					}

					inline void serialize(char*& ${bufName}) const {
						*reinterpret_cast<${cppTag}*>(${bufName}) = static_cast<${cppTag}>(value.index());
						${bufName}+=${tagSize};

						switch (value.index()) {
							${withCPP.map((x,i) => `
								case ${i}: {
									${x.cpp.cppSerialize(`std::get<${x.cpp.cppname}>(value)`, bufName)}
									break;
								}
							`).join("\n")}
							${defaultCase}
						}
					}

					static inline ${def.name} deserialize(char*& ${bufName}) {
						switch (*reinterpret_cast<${cppTag}*>((${bufName}+=${tagSize})-${tagSize})) {
							${withCPP.map((x,i) => `
								case ${i}: {
									${x.cpp.cppDeserialize("value", bufName)}
									return ${def.name} { value };
								}
							`).join("\n")}
							${defaultCase}
						}
					}
				};
			`;

			break;
		}
	}

	cppDef.set(def, {
		cppname: def.name,
		size: fixedSize==null ? {
			type: "dynamic",
			cppGet(expr) { return `${expr}.serialization_size()`; }
		} : { type: "fixed", value: fixedSize },
		cppSerialize(expr, targetPtr) {
			return `${expr}.serialize(${targetPtr});`
		},
		cppDeserialize(varName, sourcePtr) {
			return `${def.name} ${varName} = ${def.name}::deserialize(${sourcePtr});`;
		}
	});
}, ()=>{
	// skip def on error
});

function reindentCStyle(txt: string) {
	const indent = ["{", "("];
	const dedent = [")", "}"];

	const out: string[]=[];
	let level=0;
	for (let line of txt.trim().split("\n")) {
		line=line.trim();
		if (line.length==0) continue;

		const add = [...line].reduce((a,b)=>a+(indent.includes(b) ? 1 : 0),0);
		const sub = [...line].reduce((a,b)=>a+(dedent.includes(b) ? 1 : 0),0);
		out.push("\t".repeat(sub>add ? Math.max(0,level+add-sub) : level) + line);
		level+=add-sub;
	}

	return out.join("\n");
}

await Deno.writeTextFile("./out.cpp", reindentCStyle(cpp));
