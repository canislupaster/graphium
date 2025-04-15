import assert from "node:assert";

export function transpile(inputs: {
	str: string, fileName: string
}[]): {
	cpp: string, js: string, dts: string
} {
	const baseTypes = ["string","double","int","uint","buffer","ptr","bool"] as const;

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

	inputs = inputs.map(x=>({...x, str: x.str+"\n\n"}));
	const input = inputs.map(v=>v.str).join("");

	function mergeColors(...str: string[]) {
		let txt="";
		const styles: string[]=[];

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

		let fileI=0;
		for (let off=0; off<=range[0]; fileI++) {
			off+=inputs[fileI].str.length;
		}

		return [
			` at ${inputs[fileI-1].fileName}:${lineI}:${colI}\n`,
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

		if (peek()=="or") expect("or");

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

			if (peek()=="left") {
				d=parseObj(ident.name, ident);
			} else if (peek()=="lparen") {
				expect("lparen");
				const ret = parseUnion(ident.name, ident);
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

	let js="", cpp="", dts="";
	const tsClasses: {name: string, type?: string, instanceType?: string}[]=[];

	cpp+=`
		#pragma once

		#include <emscripten.h>
		#include <variant>
		#include <array>
		#include <vector>
		#include <optional>
		#include <algorithm>
	`;

	js+=`
		// utility
		const bufUtil = {
			current: null,
			update() {
				this.current=wasmMemory.buffer;
				const dataView = new DataView(this.current);
				const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);

				for (const [k,v] of Object.entries({
					u8: "Uint8", u16: "Uint16",
					u32: "Uint32", u64: "BigUint64",
					i64: "BigInt64", f64: "Float64",
					u64n: "BigUint64", i64n: "BigInt64"
				})) {
					if (!(k in this)) this[k]={};
					const l = globalThis[v+"Array"].BYTES_PER_ELEMENT;
					let getter=dataView["get"+v].bind(dataView);
					let setter=dataView["set"+v].bind(dataView);
					
					const checked = k.endsWith("n");

					Object.assign(this[k], {
						get: (ptr)=>{
							if (this.current!=wasmMemory.buffer) this.update();
							let ret = getter(ptr.current, true);
							ptr.current+=l;

							if (checked) {
								if (Math.abs(ret) > maxSafe)
									throw new Error("cannot downcast 64 bit to js Number");
								ret = Number(ret);
							}

							return ret;
						},
						set: (ptr,v)=>{
							if (this.current!=wasmMemory.buffer) this.update();
							setter(ptr.current, v, true);
							ptr.current+=l;
						}
					});
				}
			}
		};

		bufUtil.update();
	`;
	
	dts += `
		type Cursor = {current: number};
	`;

	function makeTsClass(name: string, inner: string, noModule?: boolean) {
		dts+=`
			declare class ${name} implements Disposable {
				${inner}
				static deserialize(source: Cursor): ${name};
				serialization_size(): number;
				serialize(target: Cursor): void;
				[Symbol.dispose](): void;
			}
		`;
				
		if (!noModule) tsClasses.push({name});
	}

	for (const prim of usedPrimitives) {
		switch (prim) {
			case "buffer": {
				cpp+=`
					#include <memory>
					#include <span>
					#include <atomic>

					class RCBuffer {
						char* buf=nullptr;
						size_t len;
						std::atomic<size_t>* count;

						RCBuffer(char* buf_, size_t len_, std::atomic<size_t>* count_): buf(buf_), len(len_), count(count_) {}

					public:
						constexpr RCBuffer() {}
						explicit RCBuffer(char* buf_, size_t len_): buf(buf_), len(len_) {
							if (buf) count = new std::atomic<size_t>(1);
						}

						std::span<char> data() const { return std::span(buf, len); }

						RCBuffer(RCBuffer const& other): buf(other.buf), len(other.len), count(other.count) {
							if (buf) count++;
						}

						RCBuffer& operator=(RCBuffer const& other) {
							if (count==other.count) throw std::runtime_error("can't assign RCBuffer to itself");
							this->~RCBuffer();
							buf=other.buf, len=other.len, count=other.count;
							if (buf) count++;
							return *this;
						}

						static RCBuffer deserialize(char*& buf) {
							RCBuffer ret(
								*reinterpret_cast<char**>(buf),
								*reinterpret_cast<size_t*>(buf+8),
								*reinterpret_cast<std::atomic<size_t>**>(*(buf+16))
							);
							buf += 24;
							return ret;
						}

						constexpr size_t serialization_size() const { return 24; }

						void serialize(char*& target) const {
							*reinterpret_cast<char**>(target) = buf;
							*reinterpret_cast<size_t*>(target+8) = len;
							*reinterpret_cast<std::atomic<size_t>**>(target+16) = count;
							count->fetch_add(1);
							target+=24;
						}

						~RCBuffer() {
							if (buf && count->fetch_sub(1)==1) {
								delete buf; delete count;
							}
						}
					};

					extern "C" inline std::atomic<size_t>* EMSCRIPTEN_KEEPALIVE atomic_create(size_t initial) {
						return new std::atomic<size_t>(initial);
					}

					extern "C" inline size_t EMSCRIPTEN_KEEPALIVE atomic_add(std::atomic<size_t>* x, int v) {
						return x->fetch_add(v);
					}
				`;
				
				makeTsClass("RCBuffer", `
					readonly buf: Uint8Array;
					constructor(arg: RCBuffer|ArrayBuffer);
				`);
				
				js += `
					class RCBuffer {
						constructor(arg) {
							if (arg instanceof ArrayBuffer) {
								this.ptr = _malloc(arg.byteLength);
								HEAPU8.set(arg, this.ptr);
								this.buf = HEAPU8.subarray(this.ptr, this.ptr+arg.byteLength);
								this.count = _atomic_create(1);
							} else {
								this.ptr=arg.ptr;
								this.buf=arg.buf;
								this.count=arg.count;

								if (arg instanceof RCBuffer) {
									_atomic_add(this.count, 1);
								}
							}
						}

						[Symbol.dispose]() {
							if (_atomic_add(this.count, -1)==1) {
								_free(this.ptr);
								_free(this.count);
							}
						}

						static deserialize(src) {
							const ptr=bufUtil.u64n.get(src), len=bufUtil.u64n.get(src);
							return new RCBuffer({
								ptr, count: bufUtil.u64n.get(src),
								buf: HEAPU8.subarray(ptr, ptr+len)
							});
						}

						serialization_size() { return 24; }

						serialize(target) {
							bufUtil.u64n.set(target, this.ptr);
							bufUtil.u64n.set(target, this.buf.byteLength);
							bufUtil.u64n.set(target, this.count);
							_atomic_increment(this.count);
						}
					}
				`;

				break;
			}
			case "string": { cpp+=`#include <string>\n`; break; }
		}
	}

	// names (varName and name) are reserved but any derivations should be free
	// if conflicts become an issue i should add some numbering or mangling to
	// the "root" names made when emitting top level decls
	// expr arguments in serialize should be high precedence (so i can call accessors & stuff)
	// but return expressions of get should be arbitrary
	type Meta = {
		cppname: string, tsname: string,
		size: {
			type: "dynamic",
			cppGet: (expr: string, name: string)=>string
			jsGet: (expr: string, name: string)=>string
		} | { type: "fixed", value: number },
		cppSerialize: (expr: string, targetPtr: string, name: string)=>string,
		cppDeserialize: (varName: string, sourcePtr: string)=>string
		jsSerialize: (expr: string, targetPtr: string, name: string)=>string,
		jsDeserialize: (varName: string, sourcePtr: string)=>string,
		jsDestruct?: (expr: string, name: string)=>string,
		isTsClass?: boolean
	};

	const metas = new Map<Definition, Meta>();

	const trivialSerde = (cppTy: string, jsTy: string, sz: number) => ({
		cppSerialize(expr, target) {
			return `*reinterpret_cast<${cppTy}*>((${target}+=${sz})-${sz}) = ${expr};`;
		},
		cppDeserialize(varName, src) {
			return `${cppTy} ${varName} = *reinterpret_cast<${cppTy}*>((${src}+=${sz})-${sz});`;
		},
		jsSerialize(expr, target) {
			return ` bufUtil.${jsTy}.set(${target}, ${expr});`;
		},
		jsDeserialize(varName, src) {
			return `const ${varName} = bufUtil.${jsTy}.get(${src});`;
		}
	} satisfies Pick<Meta, `${string}${"Deserialize"|"Serialize"}`&(keyof Meta)>);

	const primitiveSpec: Record<(typeof baseTypes)[number], Meta> = {
		string: {
			cppname: "std::string", tsname: "string",
			size: {
				type: "dynamic",
				cppGet(expr) { return `${expr}.size()+4`; },
				jsGet(expr) { return `lengthBytesUTF8(${expr})+4` },
			},
			cppSerialize(expr, target) {
				return `
					*reinterpret_cast<uint32_t*>((${target}+=4)-4) = ${expr}.size();
					std::copy(${expr}.begin(), ${expr}.end(), ${target});
					${target} += ${expr}.size();
				`;
			},
			cppDeserialize(varName, src) {
				return `
					size_t ${varName}_size = *reinterpret_cast<uint32_t*>((${src}+=4)-4);
					std::string ${varName}(${src}, ${src}+${varName}_size);
					${src}+=${varName}_size;
				`;
			},
			jsSerialize(expr, target, name) {
				return `
					const ${name}Size = lengthBytesUTF8(${expr});
					bufUtil.u32.set(${target}, ${name}Size);
					stringToUTF8(${expr}, ${target}.current, ${name}Size);
					${target}.current+=${name}Size;
				`;
			},
			jsDeserialize(varName, src) {
				return `
					const ${varName}Size = bufUtil.u32.get(${src});
					const ${varName} = UTF8ToString(${src}.current, ${varName}Size);
					${src}.current+=${varName}Size;
				`;
			}
		},
		bool: {
			cppname: "bool", tsname: "boolean",
			size: {type: "fixed", value: 1},
			cppSerialize(expr, target) {
				return `*reinterpret_cast<uint8_t*>(${target}++) = ${expr} ? 1 : 0;`;
			},
			cppDeserialize(varName, src) {
				return `bool ${varName} = bool(*reinterpret_cast<uint8_t*>(${src}++));`;
			},
			jsSerialize(expr, target) {
				return `bufUtil.u8.set(${target}, ${expr} ? 1 : 0);`;
			},
			jsDeserialize(varName, src) {
				return `const ${varName} = bufUtil.u8.get(${src})==1;`;
			}
		},
		double: {
			cppname: "double", tsname: "number",
			size: {type: "fixed", value: 8},
			...trivialSerde("double", "f64", 8)
		},
		uint: {
			cppname: "uint64_t", tsname: "number",
			size: {type: "fixed", value: 8},
			...trivialSerde("uint64_t", "u64", 8)
		},
		int: {
			cppname: "int64_t", tsname: "number",
			size: {type: "fixed", value: 8},
			...trivialSerde("int64_t", "i64", 8)
		},
		buffer: {
			cppname: "RCBuffer", tsname: "RCBuffer",
			size: {type: "fixed", value: 24},
			cppSerialize(expr, target) { return `${expr}.serialize(${target});`; },
			cppDeserialize(varName, src) { return `RCBuffer ${varName} = RCBuffer::deserialize(${src});`; },
			jsSerialize(expr, target) { return `${expr}.serialize(${target});`; },
			jsDeserialize(varName, src) { return `const ${varName} = RCBuffer.deserialize(${src});`; },
			jsDestruct(expr) { return `${expr}[Symbol.dispose]();` },
			isTsClass: true
		},
		ptr: {
			cppname: "char*", tsname: "number",
			size: {type: "fixed", value: 8},
			...trivialSerde("char*", "u64n", 8)
		}
	};

	function repeat<T>(n: number, f: (i: number)=>T) {
		return [...new Array(n)].map((_,i)=>f(i));
	}
	
	function getMeta(def: Exclude<Definition, {type: "string"}>, t: Token): Meta {
		let ret = metas.get(def);
		if (ret) return ret;
		
		if (def.type=="primitive"){
			ret=primitiveSpec[def.baseType];
		} else if (def.type=="optional") {
			const inner = getMeta(def.inner, def.start);
			const sz = inner.size, destruct=inner.jsDestruct;

			ret={
				cppname: `std::optional<${inner.cppname}>`,
				tsname: `(${inner.tsname})|null`,
				size: {
					type: "dynamic",
					cppGet: (expr,n)=>`${expr} ? ${sz.type=="fixed" ? sz.value+1 : `(${sz.cppGet(expr,n)})+1`} : 1`,
					jsGet: (expr,n)=>`${expr}!=null ? ${sz.type=="fixed" ? sz.value+1 : `(${sz.jsGet(expr,n)})+1`} : 1`
				},
				cppSerialize(expr, targetPtr, name) {
					return `
						*(${targetPtr}++) = ${expr} ? 1 : 0;
						if (${expr}) {
							${inner.cppSerialize(`(*${expr})`, targetPtr, `${name}_inner`)}
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
					`;
				},
				jsSerialize(expr, targetPtr, name) {
					return `
						bufUtil.u8.set(${targetPtr}, ${expr}!=null ? 1 : 0);
						if (${expr}!=null) {
							${inner.jsSerialize(expr, targetPtr, `${name}Inner`)}
						}
					`;
				},
				jsDeserialize(varName, src) {
					return `
						let ${varName} = null;
						if (bufUtil.u8.get(${src})) {
							${inner.jsDeserialize(`${varName}Inner`, src)}
							${varName} = ${varName}Inner;
						}
					`;
				},
				jsDestruct: !destruct ? undefined : (expr,n)=>`
					if (${expr}!=null) { ${destruct(expr,n)} }
				`
			};
		} else if (def.type=="array") {
			const inner = getMeta(def.inner, def.start);
			const innerSize = inner.size, destruct=inner.jsDestruct, defSize = def.size;

			let outSize: Meta["size"];
			if (defSize!=null) {
				if (innerSize.type=="fixed") outSize={type: "fixed", value: defSize*innerSize.value};
				else outSize={
					type: "dynamic",
					cppGet: (expr,n)=>repeat(defSize, i=>{
						`(${innerSize.cppGet(`${expr}[${i}]`,n)})`
					}).join("+"), // 🤓
					jsGet: (expr,n)=>repeat(defSize, i=>{
						`(${innerSize.jsGet(`${expr}[${i}]`,n)})`
					}).join("+")
				};
			} else if (innerSize.type=="fixed") {
				outSize={
					type: "dynamic",
					cppGet: (expr)=>`${expr}.size()*${innerSize.value}+4`,
					jsGet: (expr)=>`${expr}.length*${innerSize.value}+4`
				};
			} else if (innerSize.type=="dynamic") {
				outSize={
					type: "dynamic",
					cppGet: (expr,n)=>
						`4+std::accumulate(${expr}.begin(), ${expr}.end(), 0, [](size_t ${n}_acc, ${
						inner.cppname} const& ${n}_elem) { return ${n}_acc + (${
						innerSize.cppGet(`${n}_elem`, `${n}_elem`)}); })`,
					jsGet: (expr,n)=>`4+${expr}.reduce((${n}Acc,${n}Elem)=> ${n}Acc + (${
						innerSize.jsGet(`${n}Elem`, `${n}Inner`)}), 0)`
				};
			} else {
				return unreachable(innerSize);
			}

			ret={
				cppname: def.size==null ? `std::vector<${inner.cppname}>`
					: `std::array<${inner.cppname}, ${def.size}>`,
				tsname: def.size==null ? `readonly (${inner.tsname})[]`
					: `readonly [${[...new Array(def.size)].map(()=>inner.tsname).join(", ")}]`,
				size: outSize,
				cppSerialize(expr, targetPtr, n) {
					return `
						${def.size==null
							? `*reinterpret_cast<uint32_t*>((${targetPtr}+=4)-4) = ${expr}.size();` : ""}
						for (${inner.cppname} const& ${n}_elem: ${expr}) {
							${inner.cppSerialize(`${n}_elem`, targetPtr, `${n}_elem`)}
						}
					`;
				},
				cppDeserialize(varName, sourcePtr) {
					return def.size==null ? `
						${this.cppname} ${varName};
						size_t ${varName}_nelem = *reinterpret_cast<uint32_t*>((${sourcePtr}+=4)-4);
						${varName}.reserve(${varName}_nelem);
						for (; ${varName}_nelem; ${varName}_nel--) {
							${inner.cppDeserialize(`${varName}_elem`, sourcePtr)} 
							${varName}.push_back(std::move(${varName}_elem));
						}
					` : `
						${[...new Array(def.size)].map((_,i)=>
							inner.cppDeserialize(`${varName}_elem_${i}`, sourcePtr)
						).join("\n")}
						${this.cppname} ${varName} = { ${
							[...new Array(def.size)].map((_,i)=>`std::move(${varName}_elem_${i})`).join(", ")
						} };
					`;
				},
				jsSerialize(expr, targetPtr, n) {
					return `
						${def.size==null
							? `bufUtil.u32.set(${targetPtr}, ${expr}.length);` : ""}
						for (const ${n}Elem of ${expr}) {
							${inner.jsSerialize(`${n}Elem`, targetPtr, `${n}Elem`)}
						}
					`;
				},
				jsDeserialize(varName, sourcePtr) {
					return `
						const ${varName} = [...new Array(${
							def.size==null ? `bufUtil.u32.get(${sourcePtr})` : def.size
						})].map(()=>{
							${inner.jsDeserialize(`${varName}Elem`, sourcePtr)} 
							return ${varName}Elem;
						});
					`;
				},
				jsDestruct: !destruct ? undefined : (expr,n)=>`
					for (const ${n}Elem of ${expr}) { ${destruct(`${n}Elem`, `${n}Elem`)} }
				`
			};
		} else {
			error(`${def.name} is undefined but used here`, {t});
		}

		return ret;
	}

	function boundedInt(bound: number) {
		const log = Math.log2(bound)/8;
		const options = [
			[1, "unsigned char", "u8"], [2, "unsigned short", "u16"],
			[4, "unsigned", "u32"], [8, "uint64_t", "u64n"],
		] as const;

		return options.find(([a])=>a>=log) ?? unreachable();
	}
	
	function snakeToCamelCase(snake: string) {
		return snake.replaceAll(/(?<=[\w\d])_([\w\d])/g,
			(_, ...groups: string[])=>groups[0].toUpperCase());
	}
	
	// no escaping / no quotes allowed
	function makeSymbols(symbols: string[], className: string, opts: {
		toIndex?: boolean, fromIndex?: boolean
	}={}): {
		classDecl: string,
		tsClassDecl: string,
		tsUnion: string,
		toIndex?: (expr: string)=>string,
		fromIndex?: (expr: string)=>string,
		accessor: string[]
	} {
		const info = symbols.map(sym=>{
			const jsArrKey = /[^\w]/.test(sym);
			return {
				sym,
				jsIdx: jsArrKey ? `["${sym}"]` : sym,
				access: jsArrKey ? `${className}["${sym}"]` : `${className}.${sym}`
			};
		});

		return {
			classDecl: `
				${info.map(v=>`static ${v.jsIdx} = Symbol("${v.sym}");`).join("\n")}
				${opts.toIndex ? `static symbolToIndex = { ${info.map((v,i)=>`[${v.access}]: ${i}`).join(",")} };` : ""}
				${opts.fromIndex ? `static symbolFromIndex = [ ${info.map(v=>v.access).join(",")} ];` : ""}
			`,
			tsUnion: `typeof ${className}[${info.map(x=>`"${x.sym}"`).join("|")}]`,
			tsClassDecl: `${info.map(v=>`static readonly ${v.jsIdx}: unique symbol;`).join("\n")}`,
			toIndex: opts.toIndex ? (ex)=>`${className}.symbolToIndex[${ex}]` : undefined,
			fromIndex: opts.fromIndex ? (ex)=>`${className}.symbolFromIndex[${ex}]` : undefined,
			accessor: info.map(x=>x.access)
		};
	}

	for (const def of allDefs) handleError(()=>{
		const bufName = "_buf";
		let fixedSize: number|null = null;

		const innerDefs = def.type=="object" ? def.fields.map(v=>v[1])
			: def.type=="union" ? def.defs : [];
		const needJsDestruct = innerDefs.some(f=>getMeta(f,def.start).jsDestruct);

		switch (def.type) {
			case "object": {
				const fields = def.fields.map(([k, v], i)=>({
					...v, name: k, jsName: snakeToCamelCase(k),
					i, meta: getMeta(v, def.start)
				}));

				if (!fields.some(x=>x.meta.size.type=="dynamic")) {
					fixedSize=fields
						.map(v=>v.meta.size.type=="fixed" ? v.meta.size.value : unreachable())
						.reduce((a,b)=>a+b, 0)
				}

				cpp+=`
					struct ${def.name} {
						${fields.map(v=>`${v.meta.cppname} ${v.name};`).join("\n")}

					${fixedSize==null ? "" : "constexpr "}size_t serialization_size() const { 
						return ${fixedSize!=null ? fixedSize : fields.map(x=>
							x.meta.size.type=="fixed" ? x.meta.size.value
							: `(${x.meta.size.cppGet(x.name, x.name)})`
						).join(" + ")};
					}

					void serialize(char*& ${bufName}) const {
				`;
				cpp+=fields.map(x=>x.meta.cppSerialize(x.name, bufName, x.name)).join("\n");
				cpp+=`
					}
					static ${def.name} deserialize(char*& ${bufName}) {
				`;
				cpp+=fields.map(x=>x.meta.cppDeserialize(x.name, bufName)).join("\n");
				cpp+=`
							return ${def.name} {
								${fields.map(v=>`.${v.name}=std::move(${v.name})`).join(",\n")}
							};
						}
					};
				`;
				
				makeTsClass(def.name, `
					${fields.map(v=>`readonly ${v.jsName}: ${v.meta.tsname};`).join("\n")}
					constructor(${fields.map(v=>`${v.jsName}: ${v.meta.tsname}`).join(", ")});
				`);

				js+=`
					class ${def.name} {
						constructor(${fields.map(v=>v.jsName).join(", ")}) {
							${fields.map(v=>`this.${v.jsName} = ${v.jsName};`).join("\n")}
						}

						[Symbol.dispose]() {
							${fields.map(v=>v.meta.jsDestruct
								? v.meta.jsDestruct(`this.${v.jsName}`, v.jsName) : "").join("\n")}
						}

						serialization_size() { 
							return ${fixedSize!=null ? fixedSize : fields.map(x=>
								x.meta.size.type=="fixed" ? x.meta.size.value
								: `(${x.meta.size.jsGet(`this.${x.jsName}`, x.jsName)})`
							).join(" + ")};
						}

						serialize(${bufName}) {
				`;
				js+=fields.map(x=>x.meta.jsSerialize(`this.${x.jsName}`, bufName, x.jsName)).join("\n");
				js+=`}
				
				static deserialize(${bufName}) {\n`;
				js+=fields.map(x=>x.meta.jsDeserialize(x.jsName, bufName)).join("\n");
				js+=`
							return new ${def.name}(${fields.map(v=>v.jsName).join(", ")});
						}
					};
				`;
				
				break;
			}
			case "enum": {
				const [tagSize, cppTag, jsTag] = boundedInt(def.defs.length);
				cpp += `
					struct ${def.name} {
						enum Inner { ${def.defs.map(v=>v.value).join(", ")} } value;
						constexpr ${def.name}(Inner value_): value(value_) {}
						
						constexpr size_t serialization_size() const { return ${tagSize}; }
						void serialize(char*& ${bufName}) const {
							*reinterpret_cast<${cppTag}*>((${bufName}+=${tagSize})-${tagSize}) = static_cast<${cppTag}>(value);
						}

						static ${def.name} deserialize(char*& ${bufName}) {
							return ${def.name}(static_cast<Inner>(*reinterpret_cast<${cppTag}*>((${bufName}+=${tagSize})-${tagSize})));
						}
					};
				`;
				
				const symbols = makeSymbols(def.defs.map(v=>v.value), def.name, {
					fromIndex: true, toIndex: true
				});

				makeTsClass(def.name, `
					${symbols.tsClassDecl}
					readonly value: ${symbols.tsUnion};
					constructor(value: ${def.name}["value"]);
				`);

				js += `
					class ${def.name} {
						${symbols.classDecl}
						constructor(value) { this.value=value; }
						[Symbol.dispose](){}
						serialization_size() { return ${tagSize}; }
						serialize(${bufName}) {
							bufUtil.${jsTag}.set(${bufName}, ${symbols.toIndex!("this.value")});
						}
						static deserialize(${bufName}) {
							return new ${def.name}(${
								symbols.fromIndex!(`bufUtil.${jsTag}.get(${bufName})`)
							});
						}
					};
				`;

				fixedSize=tagSize;
				break;
			}
			case "union": {
				const withMeta = def.defs.map((x,i)=>{
					const meta = getMeta(x, def.start)
					return { ...x, meta, i, };
				});

				for (const v of withMeta) {
					if (v.meta.size.type=="dynamic"
						|| fixedSize!=null && v.meta.size.value!=fixedSize) {
						fixedSize=null; break;
					}

					fixedSize=v.meta.size.value;
				}

				const [tagSize, cppTag, jsTag] = boundedInt(withMeta.length);
				if (fixedSize!=null) fixedSize+=tagSize;

				const defaultCase = `default: throw std::runtime_error("invalid value of union ${def.name}");`;

				cpp += `
					struct ${def.name} {
						std::variant<${withMeta.map(x=>x.meta.cppname).join(", ")}> value;

						${fixedSize!=null ? "constexpr " : ""}size_t serialization_size() const {
							${fixedSize==null ? `switch (value.index()) {
								${withMeta.map(x => `
									case ${x.i}: return ${
										x.meta.size.type=="fixed" ? tagSize+x.meta.size.value
										: `${tagSize}+(${x.meta.size.cppGet(`std::get<${x.meta.cppname}>(value)`, `_${x.i}`)})`
									};
								`).join("\n")}
								${defaultCase}
							}` : `return ${fixedSize};`}
						}

						void serialize(char*& ${bufName}) const {
							*reinterpret_cast<${cppTag}*>(${bufName}) = static_cast<${cppTag}>(value.index());
							${bufName}+=${tagSize};

							switch (value.index()) {
								${withMeta.map(x => `
									case ${x.i}: {
										${x.meta.cppSerialize(`std::get<${x.meta.cppname}>(value)`, bufName, `_${x.i}`)}
										break;
									}
								`).join("\n")}
								${defaultCase}
							}
						}

						static ${def.name} deserialize(char*& ${bufName}) {
							switch (*reinterpret_cast<${cppTag}*>((${bufName}+=${tagSize})-${tagSize})) {
								${withMeta.map((x,i) => `
									case ${i}: {
										${x.meta.cppDeserialize("value", bufName)}
										return ${def.name} { value };
									}
								`).join("\n")}
								${defaultCase}
							}
						}
					};
				`;

				const symbols = makeSymbols(withMeta.map(v=>v.meta.tsname), def.name, {toIndex: true});
				const unionPart = withMeta.map(v=>`{ type: typeof ${symbols.accessor[v.i]
					}, value: ${v.meta.tsname} }`).join("|");

				dts+=`
					type ${def.name}Union = ${unionPart};
				`;

				const classTypes = withMeta.filter(x=>x.meta.isTsClass)
				const classTypeStr = classTypes.map(v=>`|${v.meta.tsname}`).join("");

				makeTsClass(def.name, `
					${symbols.tsClassDecl}
					readonly type: ${symbols.tsUnion};
					readonly value: ${withMeta.map(v=>`(${v.meta.tsname})`).join("|")};
					constructor(arg: Readonly<${def.name}Union>${classTypeStr});
				`, true);

				tsClasses.push({name: def.name, type: `(typeof ${def.name})&{
					deserialize(source: Cursor): ${def.name}&${def.name}Union;
					new(arg: Readonly<${def.name}Union>${classTypeStr}): ${def.name}&${def.name}Union;
				}`, instanceType: `${def.name}&${def.name}Union`})

				const jsDefaultCase = `default: throw new Error("invalid value of union ${def.name}");`
				js += `
					class ${def.name} {
						${symbols.classDecl}
						${classTypes.length>0 ? `
							static classTypes = new Map([
								${classTypes.map(v=>`[${v.meta.tsname}, ${symbols.accessor[v.i]}]`).join(",")}
							]);
						` : ""}


						constructor(arg) {
							${classTypes.length>0 ? `
								if (arg.constructor!=Object) {
									this.type = ${def.name}.classTypes.get(arg.constructor);
									this.value = arg;
								} else {
							` : ""}
							this.type=arg.type; this.value=arg.value;
							${classTypes.length>0 ? "}" : ""}
						}

						[Symbol.dispose]() {
							${withMeta.map(x=>!x.meta.jsDestruct ? null : `
								if (this.type==${symbols.accessor[x.i]}) { ${
									x.meta.jsDestruct("this.value", `_${x.i}`)
								} }
							`.trim()).filter(x=>x).join("\nelse ")}
						}

						serialization_size() {
							${ fixedSize!=null
								? `return ${fixedSize};`
								: `switch (this.type) {
									${withMeta.map(x => `
										case ${symbols.accessor[x.i]}: return ${
											x.meta.size.type=="fixed" ? tagSize+x.meta.size.value
											: `${tagSize}+(${x.meta.size.jsGet("this.value", `_${x.i}`)})`
										};
									`).join("\n") }
								}` }
						}

						serialize(${bufName}) {
							bufUtil.${jsTag}.set(${bufName}, ${symbols.toIndex!("this.type")});
							switch (this.type) {
								${withMeta.map(x => `
									case ${symbols.accessor[x.i]}: {
										${x.meta.jsSerialize("this.value", bufName, `_${x.i}`)}
										break;
									}
								`).join("\n")}
								${jsDefaultCase}
							}
						}

						static deserialize(${bufName}) {
							switch (bufUtil.${jsTag}.get(${bufName})) {
								${withMeta.map(x => `
									case ${x.i}: {
										${x.meta.jsDeserialize("value", bufName)}
										return new ${def.name}({ type: ${symbols.accessor[x.i]}, value });
									}
								`).join("\n")}
								${jsDefaultCase}
							}
						}
					};
				`;

				break;
			}
		}

		metas.set(def, {
			cppname: def.name, tsname: def.name,
			size: fixedSize==null ? {
				type: "dynamic",
				cppGet: (expr) => `${expr}.serialization_size()`,
				jsGet: (expr) => `${expr}.serialization_size()` // oof
			} : { type: "fixed", value: fixedSize },
			cppSerialize: (expr, targetPtr)=>`${expr}.serialize(${targetPtr});`,
			cppDeserialize: (varName, sourcePtr)=>
				`${def.name} ${varName} = ${def.name}::deserialize(${sourcePtr});`,
			jsSerialize: (expr, target)=>`${expr}.serialize(${target});`,
			jsDeserialize: (varName, src)=>`const ${varName} = ${def.name}.deserialize(${src});`,
			jsDestruct: needJsDestruct ? (expr)=>`${expr}[Symbol.dispose]();` : undefined,
			isTsClass: true
		});
	}, ()=>{
		// skip def on error
	});

	function reindentCStyle(txt: string) {
		const out: string[]=[];
		let level=0;
		for (let line of txt.trim().split("\n")) {
			line=line.trim();
			if (line.length==0) continue;

			let indent=false, dedent=false;
			const lineArr = [...line], lineArrRev = lineArr.toReversed();
			for (const x of [["{","}"],["(",")"],["[","]"]]) {
				let cur=0;
				for (const c of lineArr) {
					if (c==x[0]) cur++; else if (c==x[1]) cur--;
					if (cur<0) dedent=true;
				}

				cur=0;
				for (const c of lineArrRev) {
					if (c==x[0]) cur--; else if (c==x[1]) cur++;
					if (cur<0) indent=true;
				}
			}

			level=dedent && level ? level-1 : level;
			out.push("\t".repeat(level) + line);
			if (indent) level++;
		}

		return out.join("\n");
	}

	const out = {
		cpp, js: `
			${js}
			${tsClasses.map(x=>`Module["${x.name}"] = ${x.name};`).join("\n")}
		`, dts: `
			${dts}

			${tsClasses.map(v=>`export type ${v.name} = ${v.instanceType ?? v.name};`).join("\n")}
			interface WasmModule {
				${tsClasses.map(v=>`${v.name}: ${v.type ?? `typeof ${v.name}`};`).join("\n")}
			}
			
			// prevent implicit exports https://github.com/microsoft/TypeScript/issues/32182
			// export classes instead as types, since they are not accessible until the module is instanced
			export {};
		`
	};

	for (const k of ["cpp", "js", "dts"] as const) out[k]=reindentCStyle(out[k]);
	return out;
}