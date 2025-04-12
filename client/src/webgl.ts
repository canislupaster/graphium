import preambleSrc from "./preamble.glsl?raw";
import passthroughVertSrc from "./passthrough.vert?raw";
import passthroughFragSrc from "./passthrough.frag?raw";

export type Vec2 = readonly [number,number];
export type Vec3 = readonly [number,number,number];
export type Vec4 = readonly [number,number,number,number];
export type Mat2 = readonly [Vec2, Vec2];
export type Mat3 = readonly [Vec3, Vec3, Vec3];
export type Mat4 = readonly [Vec4, Vec4, Vec4, Vec4];

export type UniformValue = {
	float: number, int: number,
	vec2: Vec2, vec3: Vec3, vec4: Vec4,
	mat2: Mat2, mat3: Mat3, mat4: Mat4,
	texture: Texture
};

const uniformSizes = {
	float: 4, int: 4, vec2: 8,
	vec3: 12, vec4: 16, mat2: 16,
	mat3: 48, mat4: 64, texture: 4,
};

export type UBOUniform = { type: "ubo", ubo: UBOUniformTypes };
export type UniformType = (keyof UniformValue)|UBOUniform;

type UniformValueWithUBO<T extends UniformType> =
	T extends UBOUniform ? UBO<T["ubo"]>
	: T extends {type: keyof UniformValue} ? UniformValue[T["type"]] 
	: never;

export type UniformTypes = Readonly<Record<string, UniformType>>;
export type UBOUniformValue = Omit<UniformValue, "texture">;
export type UBOUniformTypes = Readonly<Record<string, keyof UBOUniformValue>>;

type SetUniforms = { [K in (keyof UniformValue)|"ubo"]: [
	K, K extends "ubo" ? UBO<UBOUniformTypes>
		: K extends keyof UniformValue ? UniformValue[K] : never,
	K extends "ubo" ? number : WebGLUniformLocation
] }[(keyof UniformValue)|"ubo"][];

export class UBO<T extends UBOUniformTypes> implements Disposable {
	buf: WebGLBuffer;
	uniformsSized: {
		k: keyof T, type: T[keyof T],
		offset: number, stride: number,
		matStride: number, rowMajor: boolean
	}[] = [];
	size: number;
	hostBuf: ArrayBuffer;

	constructor(private g: Graphics, program: Program<UniformTypes>, k: string, uniforms: T) {
		this.buf = this.g.gl.createBuffer();
		this.g.gl.bindBuffer(this.g.gl.UNIFORM_BUFFER, this.buf);

		// messy
		if (!(k in program.uniforms) || typeof program.uniforms[k]!="object"
			|| program.uniforms[k].type!="ubo") {
			throw new Error(`${k} is not a uniform block`);
		}

		const loc = program.uniformLocation[k];
		if (typeof loc != "number") throw new Error("location of uniform block isn't a number");

		const indices = this.g.gl.getActiveUniformBlockParameter(program.program, loc, this.g.gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES) as Uint32Array;

		this.size = this.g.gl.getActiveUniformBlockParameter(program.program, loc, this.g.gl.UNIFORM_BLOCK_DATA_SIZE) as GLint;
		this.hostBuf = new ArrayBuffer(this.size);

		const data = {
			offsets: this.g.gl.getActiveUniforms(program.program, indices, this.g.gl.UNIFORM_OFFSET) as GLint[],
			stride: this.g.gl.getActiveUniforms(program.program, indices, this.g.gl.UNIFORM_ARRAY_STRIDE) as GLint[],
			matStride: this.g.gl.getActiveUniforms(program.program, indices, this.g.gl.UNIFORM_MATRIX_STRIDE) as GLint[],
			rowMajor: this.g.gl.getActiveUniforms(program.program, indices, this.g.gl.UNIFORM_MATRIX_STRIDE) as GLboolean[]
		};

		for (let i=0; i<indices.length; i++) {
			let name = this.g.gl.getActiveUniform(program.program, indices[i])?.name;
			if (name?.startsWith(`${k}.`)) name=name.slice(`${k}.`.length);
			if (!name || !(name in uniforms)) {
				throw new Error(`mismatch in UBO: ${name} not found in uniforms`);
			}

			this.uniformsSized.push({
				k: name as keyof T,
				type: uniforms[name] as T[keyof T],
				offset: data.offsets[i],
				stride: data.stride[i],
				matStride: data.matStride[i],
				rowMajor: data.rowMajor[i]
			});
		}

		this.g.gl.bufferData(this.g.gl.UNIFORM_BUFFER, this.size, this.g.gl.DYNAMIC_DRAW);
		this.g.check("create UBO");
	}

	update(values: Partial<{
		[K in keyof T]: UBOUniformValue[T[K]]
	}>) {
		this.g.gl.bindBuffer(this.g.gl.UNIFORM_BUFFER, this.buf);
		const data = new DataView(this.hostBuf);

		for (const uni of this.uniformsSized) {
			if (values[uni.k]==undefined) continue;

			const {ty, v} = {
				ty: uni.type, v: values[uni.k]
			} as { [K in keyof UniformValue]: {ty: K, v: UniformValue[K]} }[
				Exclude<keyof UniformValue, "texture">
			];

			switch (ty) {
				case "float": {
					data.setFloat32(uni.offset, v, true);
					break;
				}
				case "int": {
					data.setInt32(uni.offset, v, true);
					break;
				}
				case "vec2":
				case "vec3":
				case "vec4": {
					for (let i=0, j=uni.offset; i<v.length; i++, j+=uni.stride+4) {
						data.setFloat32(j, v[i], true);
					}
					break;
				}
				case "mat2":
				case "mat3":
				case "mat4": {
					for (let i=0, j=uni.offset; i<v.length; i++, j+=uni.matStride) {
						for (let l=0, m=j; l<v.length; l++, m+=uni.stride+4) {
							data.setFloat32(m, uni.rowMajor ? v[l][i] : v[i][l], true);
						}
					}
					break;
				}
			}
		}

		this.g.gl.bufferData(this.g.gl.UNIFORM_BUFFER, this.hostBuf, this.g.gl.DYNAMIC_DRAW);
	}

	bind() {
		const {v, init} = this.g.ubo.get(this.buf);
		if (!init) {
			this.g.gl.bindBufferBase(this.g.gl.UNIFORM_BUFFER, v, this.buf);
		}
		return v;
	}

	[Symbol.dispose]() {
		this.g.gl.deleteBuffer(this.buf);
	}
}

export class Program<T extends UniformTypes> implements Disposable {
	program: WebGLProgram;
	uniformLocation: Partial<Record<keyof T, WebGLUniformLocation|number>> = {};
	
	ntex=0;
	ubo = new Map<WebGLUniformLocation, number>();

	private setUniforms(v: SetUniforms) {
		for (const [ty,x,loc] of v) {
			switch (ty) {
				case 'float':
					this.g.gl.uniform1f(loc, x);
					break;
				case 'int':
					this.g.gl.uniform1i(loc, x);
					break;
				case 'vec2':
					this.g.gl.uniform2f(loc, ...x);
					break;
				case 'vec3':
					this.g.gl.uniform3f(loc, ...x);
					break;
				case 'vec4':
					this.g.gl.uniform4f(loc, ...x);
					break;
				case 'mat2':
					this.g.gl.uniformMatrix2fv(loc, false, x.flat());
					break;
				case 'mat3':
					this.g.gl.uniformMatrix3fv(loc, false, x.flat());
					break;
				case 'mat4':
					this.g.gl.uniformMatrix4fv(loc, false, x.flat());
					break;
				case 'texture': {
					this.g.gl.uniform1i(loc, x.bind({onlyActive: true}));
					break;
				}
				case "ubo": {
					const idx = x.bind();
					const ex = this.ubo.get(loc);

					if (ex!=idx) {
						this.g.gl.uniformBlockBinding(this.program, loc, idx);
						this.ubo.set(loc, idx);
					}

					break;
				}
			}
		}
	}

	activate(uniforms: { [K in keyof T]: UniformValueWithUBO<T[K]> }) {
		if (this.g.currentProgram!=this.program) {
			this.g.currentProgram=this.program;
			this.g.gl.useProgram(this.program);
		}

		this.ntex=0;
		this.setUniforms(Object.entries(uniforms).map(([k,v])=>[
			typeof this.uniforms[k]=="object" ? this.uniforms[k].type : this.uniforms[k],
			v, this.uniformLocation[k]
		]) as SetUniforms);
	}
	
	constructor(private g: Graphics, fragment: Shader, vertex: Shader, public uniforms: T) {
		if (fragment.type!="fragment" || vertex.type!="vertex")
			throw new Error("Incorrect shader types");

		this.program = g.gl.createProgram();
		g.gl.attachShader(this.program, vertex.shader);
		g.gl.attachShader(this.program, fragment.shader);
		g.gl.linkProgram(this.program);

		if (!g.gl.getProgramParameter(this.program, g.gl.LINK_STATUS))
			throw new Error(`Unable to initialize the shader program: ${g.gl.getProgramInfoLog(this.program)}`);

		for (const k in uniforms) {
			const loc = typeof uniforms[k]=="object" && "ubo" in uniforms[k]
				? g.gl.getUniformBlockIndex(this.program, k)
				: g.gl.getUniformLocation(this.program, k);

			if (loc==null) throw new Error(`Couldn't find uniform ${k}`);
			this.uniformLocation[k as keyof T] = loc;
		}
	}

	[Symbol.dispose]() {
		this.g.gl.deleteProgram(this.program);
	}
}

export class Shader implements Disposable {
	shader: WebGLShader;

	constructor(private g: Graphics, public type: "vertex"|"fragment", source: string) {
		const newShader = g.gl.createShader(type=="vertex" ? g.gl.VERTEX_SHADER : g.gl.FRAGMENT_SHADER);
		if (!newShader) throw new Error("Couldn't create shader");
		this.shader=newShader;

		if (g.shaderPreamble) source = `${g.shaderPreamble}\n\n${source}`;
		g.gl.shaderSource(this.shader, source);
		g.gl.compileShader(this.shader);

		if (!g.gl.getShaderParameter(this.shader, g.gl.COMPILE_STATUS)) {
			console.log(source);
			throw new Error(`An error occurred compiling the shaders: ${g.gl.getShaderInfoLog(this.shader)}`);
		}
	}

	[Symbol.dispose]() {
		this.g.gl.deleteShader(this.shader);
	}
}

export type TextureType = "rgba16f"|"rgba8"|"r8"|"r16f"|"rgb8"|"rgb16f"|"r32i"|"r32f"|"depth32";
const noFilterTextureType = (x: TextureType) => x=="r32i" || x=="r32f";
const multisampleSamples = 4;

export type TextureOptions = {
	interpolation?: "linear"|"nearest", //linear
	wrap?: "clamp"|"repeat", //clamp
	mipmap?: boolean,
	type: TextureType
};

const textureTypeFormat = (g: Graphics) => ({
	rgba16f: [g.gl.RGBA, g.gl.RGBA16F, g.gl.FLOAT],
	rgba8: [g.gl.RGBA, g.gl.RGBA, g.gl.UNSIGNED_BYTE],
	r8: [g.gl.RED, g.gl.RED, g.gl.UNSIGNED_BYTE],
	r16f: [g.gl.RED, g.gl.R16F, g.gl.FLOAT],
	rgb8: [g.gl.RGB, g.gl.RGB, g.gl.UNSIGNED_BYTE],
	rgb16f: [g.gl.RGB, g.gl.RGB16F, g.gl.FLOAT],
	r32i: [g.gl.RED_INTEGER, g.gl.R32I, g.gl.INT],
	r32f: [g.gl.RED, g.gl.R32F, g.gl.FLOAT],
	depth32: [g.gl.DEPTH_COMPONENT, g.gl.DEPTH_COMPONENT32F, g.gl.FLOAT]
} as const);

export class Texture implements Disposable {
	ready=false;
	tex: WebGLTexture;
	width=0; height=0;

	bind({noReady, onlyActive}: {noReady?: boolean, onlyActive?: boolean}={}) {
		if (!this.ready && !noReady) throw new Error("texture isn't initialized");
		const {v, init} = this.g.textures.get(this.tex);
		const texId = this.g.gl.TEXTURE0 + v;
		if (!init) this.g.gl.activeTexture(texId);
		if (!onlyActive) this.g.gl.bindTexture(this.g.gl.TEXTURE_2D, this.tex);
		return texId;
	}

	constructor(private g: Graphics, private opts: TextureOptions) {
		this.tex = this.g.gl.createTexture();
		this.bind({noReady: true});

		const integer = noFilterTextureType(opts.type);
		if (integer && opts.interpolation=="linear")
			throw new Error("can't filter integer textures");

		const filter = opts.interpolation=="nearest" || integer ? this.g.gl.NEAREST : this.g.gl.LINEAR;
		this.g.gl.texParameteri(this.g.gl.TEXTURE_2D, this.g.gl.TEXTURE_MIN_FILTER, filter);
		this.g.gl.texParameteri(this.g.gl.TEXTURE_2D, this.g.gl.TEXTURE_MAG_FILTER, filter);

		const wrap = opts.wrap=="clamp" ? this.g.gl.CLAMP_TO_EDGE : this.g.gl.REPEAT;
		this.g.gl.texParameteri(this.g.gl.TEXTURE_2D, this.g.gl.TEXTURE_WRAP_S, wrap);
		this.g.gl.texParameteri(this.g.gl.TEXTURE_2D, this.g.gl.TEXTURE_WRAP_T, wrap);
	}

	private generateMipmaps() {
		if (this.opts.mipmap) {
			if ((this.width&(this.width-1))!=0 || (this.height&(this.height-1))!=0)
				throw new Error("mipmaps enabled for non power of 2 texture");
			this.g.gl.generateMipmap(this.g.gl.TEXTURE_2D);
		}
	}

	async loadImage(url: string) {
		const image = new Image();
		const prom = new Promise<void>((res,rej) => {
			image.onerror = ()=>rej(new Error(`Error loading image`));
			image.onload = ()=>res();
		});
		image.src=url;
		await prom;

		this.bind({noReady: true});
		this.g.gl.texImage2D(this.g.gl.TEXTURE_2D, 0, this.g.gl.RGBA, image.width, image.height, 0, this.g.gl.RGBA, this.g.gl.UNSIGNED_BYTE, null);

		this.width=image.width; this.height=image.height;
		this.generateMipmaps();

		this.ready=true;
	}

	loadBuffer(buffer: ArrayBufferView|null, width: number, height: number) {
		const formats = textureTypeFormat(this.g)[this.opts.type];

		this.bind({noReady: true});
		if (this.width==width && this.height==height) {
			this.g.gl.texSubImage2D(this.g.gl.TEXTURE_2D, 0, 0,0,width,height, formats[0], formats[2], buffer);
		} else {
			this.g.gl.texImage2D(this.g.gl.TEXTURE_2D, 0, formats[1], width, height, 0, formats[0], formats[2], buffer);
			this.width=width; this.height=height;
		}

		this.generateMipmaps();
		this.ready=true;
	}

	[Symbol.dispose]() {
		this.g.gl.deleteTexture(this.tex);
	}
}

export class RenderBuffer implements Disposable {
	buf: WebGLRenderbuffer;
	internalFormat: GLenum;
	width=0; height=0;
	ready=false;

	resize(width: number, height: number) {
		this.g.gl.bindRenderbuffer(this.g.gl.RENDERBUFFER, this.buf);
		this.width=width; this.height=height;
		if (this.opts.multisample!=undefined) {
			this.g.gl.renderbufferStorageMultisample(this.g.gl.RENDERBUFFER,
				this.opts.multisample ? multisampleSamples : 0, this.internalFormat, width, height);
		} else {
			this.g.gl.renderbufferStorage(this.g.gl.RENDERBUFFER, this.internalFormat, width, height);
		}
		this.ready=true;
	}

	constructor(private g: Graphics, private opts: {
		multisample?: boolean, type: TextureType
	}) {
		this.buf = this.g.gl.createRenderbuffer();
		this.internalFormat = textureTypeFormat(this.g)[this.opts.type][1];
	}

	[Symbol.dispose]() { this.g.gl.deleteRenderbuffer(this.buf); }
}

abstract class Renderable<T extends UniformTypes> {
	protected abstract program: Program<T>;
	protected abstract draw(): void;
	render(uniforms: { [K in keyof T]: UniformValueWithUBO<T[K]> }) {
		this.program.activate(uniforms);
		this.draw();
	}
}

export type BufferSpec = {
	type: "float"|"ubyte"|"ubyte_float",
	dim: number,
	divisor?: number,
	attribute: string
}[];

export type SetBuffers<Spec extends BufferSpec> = {
	[K in Spec[number]["attribute"]]: {
		float: Float32Array,
		ubyte: Uint8Array,
		ubyte_float: Uint8Array
	}[
		(Spec[number]&{attribute: K})["type"]
	]
};

export class VAO<Spec extends BufferSpec, WithElement extends boolean> {
	element: WithElement extends true ? WebGLBuffer : null;
	array: WebGLBuffer
	vao: WebGLVertexArrayObject;
	stride: number;
	withSize: (Spec[number]&{size: number, off: number})[];

	constructor(private g: Graphics, program: Program<UniformTypes>, public spec: Spec, withElement: WithElement) {
		this.vao = this.g.gl.createVertexArray();
		this.g.gl.bindVertexArray(this.vao);

		if (withElement) {
			this.element = this.g.gl.createBuffer() as typeof this.element;
			this.g.gl.bindBuffer(this.g.gl.ELEMENT_ARRAY_BUFFER, this.element);
		} else {
			this.element=null as typeof this.element;
		}

		this.array = this.g.gl.createBuffer();
		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.array);

		this.withSize = spec.map(v=>({...v, size: ({
			float: 4, ubyte: 1, ubyte_float: 1
		}[v.type])*v.dim, off: 0}));
		this.stride = this.withSize.map(v=>v.size).reduce((a,b)=>a+b);

		let off=0;
		for (const v of this.withSize) {
			v.off=off;
			const attribLoc = this.g.gl.getAttribLocation(program.program, v.attribute);

			switch (v.type) {
				case "float":
					this.g.gl.vertexAttribPointer(attribLoc, v.dim, this.g.gl.FLOAT, false, this.stride, off);
					break;
				case "ubyte":
					this.g.gl.vertexAttribIPointer(attribLoc, v.dim, this.g.gl.UNSIGNED_BYTE, this.stride, off);
					break;
				case "ubyte_float":
					this.g.gl.vertexAttribPointer(attribLoc, v.dim, this.g.gl.UNSIGNED_BYTE, true, this.stride, off);
					break;
			}

			if (v.divisor!=undefined) this.g.gl.vertexAttribDivisor(attribLoc, v.divisor);
			this.g.gl.enableVertexAttribArray(attribLoc);

			off+=v.size;
		}

		this.g.gl.bindVertexArray(null);
	}

	bind() { this.g.gl.bindVertexArray(this.vao); }

	// convenience, ideally set buffer directly instead
	setArray(data: SetBuffers<Spec>) {
		let sz = null;
		for (const v of this.withSize) {
			const ak = v.attribute as Spec[number]["attribute"];
			if (data[ak].length%v.dim != 0) throw new Error("buffer size not divisible by dimension");
			if (sz==null) sz=data[ak].length / v.dim;
			else if (sz!=data[ak].length/v.dim) throw new Error("mismatched buffer sizes");
		}

		if (sz==null) sz=0;
		const all = new Uint8Array(this.stride*sz);

		for (const v of this.withSize) {
			const buf = data[v.attribute as Spec[number]["attribute"]].buffer;
			for (let i=0; i<buf.byteLength; i+=v.size) {
				all.set(new Uint8Array(buf).subarray(i,i+v.size), i*this.stride + v.off);
			}
		}

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.array);
		this.g.gl.bufferData(this.g.gl.ARRAY_BUFFER, all, this.g.gl.DYNAMIC_DRAW);
	}

	[Symbol.dispose]() {
		if (this.element) this.g.gl.deleteBuffer(this.element);
		this.g.gl.deleteBuffer(this.array);
		this.g.gl.deleteVertexArray(this.vao);
	}
}

const geometryBufferSpec = [
	{type: "float", dim: 2, attribute: "in_coord"}
] as const satisfies BufferSpec;

//2d geometry
export class Geometry<T extends UniformTypes> extends Renderable<T> {
	ready=false;
	vao: VAO<typeof geometryBufferSpec, true>;
	numTriangles=0;

	protected override draw() {
		if (!this.ready) throw new Error("uninitialized geometry");

		this.vao.bind();
		this.g.gl.drawElements(this.g.gl.TRIANGLES, this.numTriangles, this.g.gl.UNSIGNED_SHORT, 0);
	}

	constructor(private g: Graphics, protected program: Program<T>, private isStatic: boolean) {
		super();
		this.vao = new VAO(this.g, this.program, geometryBufferSpec, true);
		this.g.check("create geometry");
	}

	update(coords: Float32Array, elems: Uint16Array) {
		const usage = this.isStatic ? this.g.gl.STATIC_DRAW : this.g.gl.DYNAMIC_DRAW;

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.vao.array);
		this.g.gl.bufferData(this.g.gl.ARRAY_BUFFER, coords, usage);
		this.g.gl.bindBuffer(this.g.gl.ELEMENT_ARRAY_BUFFER, this.vao.element);
		this.g.gl.bufferData(this.g.gl.ELEMENT_ARRAY_BUFFER, elems, usage);

		this.numTriangles=elems.length;
		this.ready=true;

		this.g.check("geometry update");
	}

	[Symbol.dispose]() {
		this.vao[Symbol.dispose]();
	}
}

export class Rectangle<T extends UniformTypes> extends Geometry<T> {
	constructor(g: Graphics, program: Program<T>) {
		super(g, program, true);
		this.update(new Float32Array([0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0]), new Uint16Array([0,1,2,0,2,3]));
	}
}

export type FBOChannel = ({type: "depth"}|{ type: "color" })&{ tex: Texture|RenderBuffer };

export class FBO implements Disposable {
	fbo: WebGLFramebuffer;
	channels: FBOChannel[] = [];
	toAttachment = new Map<FBOChannel, GLenum>();
	drawBufs: GLenum[]=[];

	width: number;
	height: number;
	resizeCb?: (w: number, h: number)=>void;

	private check() {
		const status = this.g.gl.checkFramebufferStatus(this.g.gl.FRAMEBUFFER);
		if (status != this.g.gl.FRAMEBUFFER_COMPLETE) {
			const key = this.g.glEnumToName(status);
			console.log(this.g.gl);
			throw new Error(`Framebuffer is incomplete: ${status} or ${key ?? "(unknown)"}`);
		}
	}

	resize(width: number, height: number) {
		this.width=width; this.height=height;
		for (const buf of this.toAttachment.keys()) {
			if (buf.tex.width!=width || buf.tex.height!=height) {
				if (buf.tex instanceof Texture) buf.tex.loadBuffer(null, width, height);
				else if (buf.tex instanceof RenderBuffer) buf.tex.resize(width, height);
			}
		}
	}

	setChannels(channels: FBOChannel[]) {
		this.channels=channels;
		this.toAttachment.clear();
		this.drawBufs=[];

		this.g.gl.bindFramebuffer(this.g.gl.FRAMEBUFFER, this.fbo);

		let numColor = 0;
		for (const chan of channels) {
			const attach = chan.type=="depth" ? this.g.gl.DEPTH_ATTACHMENT
				: this.g.gl.COLOR_ATTACHMENT0 + numColor++;
			this.toAttachment.set(chan, attach);
			if (chan.type!="depth") this.drawBufs.push(attach);
			
			if (chan.tex instanceof Texture) {
				chan.tex.bind({noReady: true});
				this.g.gl.framebufferTexture2D(this.g.gl.FRAMEBUFFER, attach, this.g.gl.TEXTURE_2D, chan.tex.tex, 0);
			} else if (chan.tex instanceof RenderBuffer) {
				this.g.gl.bindRenderbuffer(this.g.gl.RENDERBUFFER, chan.tex.buf);
				this.g.gl.framebufferRenderbuffer(this.g.gl.FRAMEBUFFER, attach, this.g.gl.RENDERBUFFER, chan.tex.buf);
			}
		}

		this.resize(this.width, this.height);

		this.check();
		this.g.gl.bindFramebuffer(this.g.gl.FRAMEBUFFER, null);
	}

	constructor(private g: Graphics, dim: [number, number]|null, channels: FBOChannel[]=[]) {
		this.fbo = this.g.gl.createFramebuffer();
		
		if (dim==null) {
			this.resizeCb = this.resize.bind(this);
			this.g.onResize.add(this.resizeCb);
			[this.width, this.height] = [this.g.width, this.g.height];
		} else {
			[this.width, this.height] = dim;
		}

		this.g.gl.bindFramebuffer(this.g.gl.FRAMEBUFFER, this.fbo);
		this.g.gl.blendFunc(this.g.gl.SRC_ALPHA, this.g.gl.ONE_MINUS_SRC_ALPHA);
		this.g.check("create fbo");

		this.setChannels(channels);
	}

	[Symbol.dispose]() {
		this.g.gl.deleteFramebuffer(this.fbo);
		if (this.resizeCb) this.g.onResize.delete(this.resizeCb);
	}
}

export class BindResource<T> {
	nResource=0;
	constructor(public maxResource: number) {}

	resources: (T|null)[] = [...new Array<undefined>(this.maxResource)].map(_=>null);
	resourceMap: Map<T, number> = new Map();

	get(v: T): {v: number, init: boolean} {
		const slot = this.resourceMap.get(v);
		if (slot!=undefined) return {v: slot, init: true};

		const existing = this.resources[this.nResource];
		if (existing!=null) this.resourceMap.delete(existing);

		this.resourceMap.set(v, this.nResource);
		this.resources[this.nResource] = v;

		const ret = this.nResource++;
		if (this.nResource==this.maxResource) this.nResource=0;
		return {v: ret, init: false};
	}
}

export type DrawBuffer = FBOChannel|{type: "color"|"depth"};
export type ClearDrawBuffers = ([DrawBuffer&{type: "color"}, Vec4]
	| [DrawBuffer&{type: "depth"}, number])[];

export class Graphics extends DisposableStack {
	gl: WebGL2RenderingContext;
	currentProgram: WebGLProgram|null=null;
	shaderPreamble: string|null=preambleSrc;

	passthroughFragmentShader: Shader;
	passthroughVertexShader: Shader;
	passthrough: Program<{tex: "texture", transform: "mat3"}>;
	target: FBO|null=null;

	prev_t: DOMHighResTimeStamp = 0;
	target_fps: number = 60;
	fps: number=0;
	scale=1.0;
	t: number = Math.random()*10000;
	observer: ResizeObserver|null=null;
	canvas: HTMLCanvasElement;

	width=0;
	height=0;
	onResize = new Set<(width: number, height: number)=>void>();

	resize(width: number, height: number) {
		this.height = this.canvas.height = this.scale*height;
		this.width = this.canvas.width = this.scale*width;

		this.canvas.style.width=`${width}px`;
		this.canvas.style.height=`${height}px`;
		this.onResize.forEach(x=>x(width, height));
	}

	constructor(opts: {
		mount: HTMLElement, autosize?: boolean,
		multisample?: boolean
	}) {
		super();

		this.canvas = document.createElement("canvas");
		opts.mount.appendChild(this.canvas);

		this.gl = this.canvas.getContext("webgl2", { antialias: opts.multisample })!;

		this.gl.enable(this.gl.DEPTH_TEST);

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		const colorBufferFloatExt = this.gl.getExtension("EXT_color_buffer_float");

		if (!colorBufferFloatExt) {
			throw new Error("WebGL extensions missing");
		}

		if (opts.autosize) {
			this.observer = new ResizeObserver(() => {
				this.resize(opts.mount.clientWidth, opts.mount.clientHeight)
			});
			
			this.observer.observe(opts.mount);
			this.resize(opts.mount.clientWidth, opts.mount.clientHeight);
		}

		this.passthroughVertexShader = this.use(new Shader(this, "vertex", passthroughVertSrc));
		this.passthroughFragmentShader = this.use(new Shader(this, "fragment", passthroughFragSrc));
		this.passthrough = this.use(new Program(this, this.passthroughFragmentShader, this.passthroughVertexShader, {tex: "texture", transform: "mat3"}));

		this.textures = new BindResource<WebGLTexture>(this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number);
		this.ubo = new BindResource<WebGLBuffer>(this.gl.getParameter(this.gl.MAX_COMBINED_UNIFORM_BLOCKS) as number);
		this.check("init graphics");
	}

	setTarget(fbo: FBO|null) {
		if (fbo) {
			if (this.target!=fbo) {
				this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo.fbo);
				this.gl.drawBuffers(fbo.drawBufs);
			}

			this.gl.viewport(0,0,fbo.width,fbo.height);
		} else {
			if (this.target!=null) this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
			this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
		}

		this.target=fbo;
		this.check("fbo / viewport");
	}
	
	setDrawBuffer(buf: DrawBuffer|null) {
		if (buf==null) {
			if (this.target) this.gl.drawBuffers(this.target.drawBufs);
			return;
		}

		if (this.target) {
			const attach2 = this.target.toAttachment.get(buf as FBOChannel);
			if (!attach2) throw new Error("channel does not belong to target FBO");
			if (buf.type!="depth") this.gl.drawBuffers([attach2]);
		}
	}

	copyFrom(fbo: FBO, channelMap: [FBOChannel, DrawBuffer][]) {
		this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, fbo.fbo);
		const fboDim = [fbo.width,fbo.height] as const;
		const targetDim = [this.target?.width ?? this.width, this.target?.height ?? this.height] as const;

		for (const [a,b] of channelMap) {
			const attach = fbo.toAttachment.get(a);
			if (!attach) throw new Error("channel does not belong to source FBO");
			if (b.type!=a.type) throw new Error("mismatched channel types");

			if (a.type!="depth") this.gl.readBuffer(attach);

			this.setDrawBuffer(b);

			this.gl.blitFramebuffer(
				0,0,...fboDim, 0,0, ...targetDim,
				a.type=="color" ? this.gl.COLOR_BUFFER_BIT : this.gl.DEPTH_BUFFER_BIT,
				this.gl.NEAREST
			);
		}

		this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, null);
		this.setDrawBuffer(null);
	}

	textures: BindResource<WebGLTexture>;
	ubo: BindResource<WebGLBuffer>;

	clear(arg: ClearDrawBuffers) {
		for (const x of arg) {
			this.setDrawBuffer(x[0]);
			if (x[0].type=="color") {
				this.gl.clearColor(...x[1] as Vec4);
				this.gl.clear(this.gl.COLOR_BUFFER_BIT);
			} else {
				this.gl.clearDepth(x[1] as number);
				this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
			}
		}

		this.setDrawBuffer(null);
		this.check("clear");
	}

	async render() {
		const t = await new Promise<number>(res => requestAnimationFrame((t)=>res(t)));
		this.setTarget(null);

		if (this.prev_t>0) {
			this.fps = this.fps*0.8 + 0.2*1000/(t-this.prev_t);
			this.t += (t-this.prev_t)/1000;
		}

		//log any errors
		this.check("rendering");
		return this.prev_t=t;
	}

	errLimit = 100;
	glEnumToName(v: number) {
		for (const k in this.gl) {
			if ((this.gl as unknown as Record<string,number>)[k]==v) return k;
		}

		return null;
	}

	check(message?: string) {
		const err = this.gl.getError();
		if (err!=this.gl.NO_ERROR) {
			if (this.errLimit-- <= 0) {
				return;
			}

			console.error(`WebGL Error${message ? ` (${message})` : ""}: (code \n${err})`);
			const name = this.glEnumToName(err);
			if (name!=null) console.error(name);
		}
	}

	[Symbol.dispose]() {
		super[Symbol.dispose]();
		this.observer?.disconnect();
		this.canvas.remove();
	}
}