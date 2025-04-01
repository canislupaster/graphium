import passthroughVertSrc from "./passthrough.vert?raw";
import passthroughFragSrc from "./passthrough.frag?raw";

export type Vec2 = [number,number];
export type Vec3 = [number,number,number];
export type Vec4 = [number,number,number,number];
export type Mat2 = [Vec2, Vec2];
export type Mat3 = [Vec3, Vec3, Vec3];
export type Mat4 = [Vec4, Vec4, Vec4, Vec4];

export type UniformValue = {
	float: number, int: number,
	vec2: Vec2, vec3: Vec3, vec4: Vec4,
	mat2: Mat2, mat3: Mat3, mat4: Mat4,
	texture: Texture,
};

export type UniformType = keyof UniformValue;
export type SetUniforms = { [K in UniformType]: [K, UniformValue[K], WebGLUniformLocation]; }[UniformType][];
export type UniformTypes = Record<string, UniformType>;

export class Program<T extends UniformTypes> implements Disposable {
	program: WebGLProgram;
	uniformLocation: Partial<Record<keyof T, WebGLUniformLocation>> = {};
	textureUniformCount: Partial<Record<keyof T, number>> = {};

	ntex=0;
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
				case 'texture':
					if (!x.ready) throw new Error("texture isn't initialized");

					const offset = this.ntex++;
					if (offset>=32) throw new Error("out of textures");
					const texId = this.g.gl.TEXTURE0 + offset;

					this.g.gl.activeTexture(texId);
					this.g.gl.bindTexture(this.g.gl.TEXTURE_2D, x.tex);
					this.g.gl.uniform1i(loc, offset);

					break;
				default:
					throw new Error(`Unsupported uniform type: ${ty}`);
			}
		}
	}

	activate(uniforms: { [K in keyof T]: UniformValue[T[K]] }) {
		if (this.g.currentProgram!=this.program) {
			this.g.currentProgram=this.program;
			this.g.gl.useProgram(this.program);
		}

		this.ntex=0;
		this.setUniforms(Object.entries(uniforms).map(([k,v])=>[
			this.uniforms[k],v,this.uniformLocation[k]
		]) as SetUniforms);
	}
	
	constructor(private g: Graphics, fragment: Shader, vertex: Shader, public uniforms: T) {
		this.program = g.gl.createProgram();
		g.gl.attachShader(this.program, vertex.shader);
		g.gl.attachShader(this.program, fragment.shader);
		g.gl.linkProgram(this.program);

		if (!g.gl.getProgramParameter(this.program, g.gl.LINK_STATUS))
			throw new Error(`Unable to initialize the shader program: ${g.gl.getProgramInfoLog(this.program)}`);

		for (const k in uniforms) {
			const loc = g.gl.getUniformLocation(this.program, k);
			if (!loc) throw new Error(`Couldn't find uniform ${k}`);
			this.uniformLocation[k as keyof T] = loc;
		}
	}

	[Symbol.dispose]() {
		this.g.gl.deleteProgram(this.program);
	}
}

export class Shader implements Disposable {
	shader: WebGLShader;
	constructor(private g: Graphics, type: "vertex"|"fragment", source: string) {
		const newShader = g.gl.createShader(type=="vertex" ? g.gl.VERTEX_SHADER : g.gl.FRAGMENT_SHADER);
		if (!newShader) throw new Error("Couldn't create shader");
		this.shader=newShader;

		g.gl.shaderSource(this.shader, source);
		g.gl.compileShader(this.shader);

		if (!g.gl.getShaderParameter(this.shader, g.gl.COMPILE_STATUS)) {
			throw new Error(`An error occurred compiling the shaders: ${g.gl.getShaderInfoLog(this.shader)}`);
		}
	}

	[Symbol.dispose]() {
		this.g.gl.deleteShader(this.shader);
	}
}

export type TextureType = "rgba16f"|"rgba8"|"r8"|"r16f"|"rgb8"|"rgb16f"|"r32i"|"r32f";
const noFilterTextureType = (x: TextureType) => x=="r32i" || x=="r32f";

export type TextureOptions = {
	interpolation?: "linear"|"nearest", //linear
	wrap?: "clamp"|"repeat", //clamp
	mipmap?: boolean,
	type: TextureType
};

export class Texture implements Disposable {
	ready=false;
	tex: WebGLTexture;
	width=0; height=0;

	constructor(private g: Graphics, private opts: TextureOptions) {
		this.tex = this.g.gl.createTexture();
		this.g.gl.bindTexture(this.g.gl.TEXTURE_2D, this.tex);

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
			image.onerror = (err)=>rej(`Error loading image: ${err}`);
			image.onload = ()=>res();
		});
		image.src=url;
		await prom;

		this.g.gl.bindTexture(this.g.gl.TEXTURE_2D, this.tex);
		this.g.gl.texImage2D(this.g.gl.TEXTURE_2D, 0, this.g.gl.RGBA, image.width, image.height, 0, this.g.gl.RGBA, this.g.gl.UNSIGNED_BYTE, null);

		this.width=image.width; this.height=image.height;
		this.generateMipmaps();

		this.ready=true;
	}

	loadBuffer(buffer: ArrayBufferView|null, width: number, height: number) {
		const formats = ({
			"rgba16f": [this.g.gl.RGBA, this.g.gl.RGBA16F, this.g.gl.FLOAT],
			"rgba8": [this.g.gl.RGBA, this.g.gl.RGBA, this.g.gl.UNSIGNED_BYTE],
			"r8": [this.g.gl.RED, this.g.gl.RED, this.g.gl.UNSIGNED_BYTE],
			"r16f": [this.g.gl.RED, this.g.gl.R16F, this.g.gl.FLOAT],
			"rgb8": [this.g.gl.RGB, this.g.gl.RGB, this.g.gl.UNSIGNED_BYTE],
			"rgb16f": [this.g.gl.RGB, this.g.gl.RGB16F, this.g.gl.FLOAT],
			"r32i": [this.g.gl.RED_INTEGER, this.g.gl.R32I, this.g.gl.INT],
			"r32f": [this.g.gl.RED, this.g.gl.R32F, this.g.gl.FLOAT],
		} satisfies Record<TextureType, [GLint, GLint, GLint]>)[this.opts.type];

		this.g.gl.bindTexture(this.g.gl.TEXTURE_2D, this.tex);
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

abstract class Renderable<T extends UniformTypes> {
	constructor(protected program: Program<T>) {}
	protected abstract draw(): void;
	render(uniforms: { [K in keyof T]: UniformValue[T[K]] }) {
		this.program.activate(uniforms);
		this.draw();
	}
}

//2d geometry
export class Geometry<T extends UniformTypes> extends Renderable<T> {
	ready=false;
	coordBuffer: WebGLBuffer;
	elemBuffer: WebGLBuffer;
	vao: WebGLVertexArrayObject;
	numTriangles=0;

	protected override draw() {
		if (!this.ready) throw new Error("uninitialized geometry");

		this.g.gl.bindVertexArray(this.vao);
		this.g.gl.drawElements(this.g.gl.TRIANGLES, this.numTriangles, this.g.gl.UNSIGNED_SHORT, 0);
	}

	constructor(private g: Graphics, program: Program<T>, private isStatic: boolean) {
		super(program);

		this.coordBuffer = this.g.gl.createBuffer()!;
		this.elemBuffer = this.g.gl.createBuffer()!;

		this.vao = this.g.gl.createVertexArray()
		this.g.gl.bindVertexArray(this.vao);

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.coordBuffer);
		this.g.gl.bindBuffer(this.g.gl.ELEMENT_ARRAY_BUFFER, this.elemBuffer);

		const coordAttrib = this.g.gl.getAttribLocation(program.program, "in_coord");
		this.g.gl.vertexAttribPointer(coordAttrib,2,this.g.gl.FLOAT,false,0,0);
		this.g.gl.enableVertexAttribArray(coordAttrib);

		this.g.gl.bindVertexArray(null);
		this.g.check("create geometry");
	}

	update(coords: Float32Array, elems: Uint16Array) {
		const usage = this.isStatic ? this.g.gl.STATIC_DRAW : this.g.gl.DYNAMIC_DRAW;

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.coordBuffer);
		this.g.gl.bufferData(this.g.gl.ARRAY_BUFFER, coords, usage);
		this.g.gl.bindBuffer(this.g.gl.ELEMENT_ARRAY_BUFFER, this.elemBuffer);
		this.g.gl.bufferData(this.g.gl.ELEMENT_ARRAY_BUFFER, elems, usage);

		this.numTriangles=elems.length;
		this.ready=true;

		this.g.check("geometry update");
	}

	[Symbol.dispose]() {
		this.g.gl.deleteBuffer(this.coordBuffer);
		this.g.gl.deleteBuffer(this.elemBuffer);
	}
}

export class NodeGeometry<T extends UniformTypes> extends Renderable<T> {
	// floats x, y, radius
	coordRadiusBuffer: WebGLBuffer;
	// fill r,g,b
	fillBuffer: WebGLBuffer;
	// border r,g,b
	borderBuffer: WebGLBuffer;
	// boolean if highlighted
	highlightedBuffer: WebGLBuffer;

	vao: WebGLVertexArrayObject;
	numNodes=0;

	protected override draw() {
	}

	constructor(private g: Graphics, program: Program<T>) {
		super(program);

		this.coordRadiusBuffer = this.g.gl.createBuffer();
		this.fillBuffer = this.g.gl.createBuffer();
		this.borderBuffer = this.g.gl.createBuffer();
		this.highlightedBuffer = this.g.gl.createBuffer();

		this.vao = this.g.gl.createVertexArray()
		this.g.gl.bindVertexArray(this.vao);

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.coordRadiusBuffer);
		const coordRadiusAttrib = this.g.gl.getAttribLocation(program.program, "coord_radius");
		this.g.gl.vertexAttribPointer(coordRadiusAttrib,3,this.g.gl.FLOAT,false,0,0);
		this.g.gl.vertexAttribDivisor(coordRadiusAttrib, 1);
		this.g.gl.enableVertexAttribArray(coordRadiusAttrib);

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.fillBuffer);
		const fillAttrib = this.g.gl.getAttribLocation(program.program, "fill");
		this.g.gl.vertexAttribPointer(fillAttrib,3,this.g.gl.UNSIGNED_BYTE,false,0,0);
		this.g.gl.vertexAttribDivisor(fillAttrib, 1);
		this.g.gl.enableVertexAttribArray(fillAttrib);

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.borderBuffer);
		const borderAttrib = this.g.gl.getAttribLocation(program.program, "border");
		this.g.gl.vertexAttribPointer(borderAttrib,3,this.g.gl.UNSIGNED_BYTE,false,0,0);
		this.g.gl.vertexAttribDivisor(borderAttrib, 1);
		this.g.gl.enableVertexAttribArray(borderAttrib);

		this.g.gl.bindBuffer(this.g.gl.ARRAY_BUFFER, this.highlightedBuffer);
		const highlightedAttrib = this.g.gl.getAttribLocation(program.program, "highlighted");
		this.g.gl.vertexAttribPointer(highlightedAttrib,1,this.g.gl.UNSIGNED_BYTE,false,0,0);
		this.g.gl.vertexAttribDivisor(highlightedAttrib, 1);
		this.g.gl.enableVertexAttribArray(highlightedAttrib);

		this.g.gl.bindVertexArray(null);

		this.g.check("create geometry");
	}

	[Symbol.dispose]() {
		for (const buf of [
			this.borderBuffer, this.fillBuffer,
			this.coordRadiusBuffer, this.highlightedBuffer
		]) {
			this.g.gl.deleteBuffer(buf);
		}

		this.g.gl.deleteVertexArray(this.vao);
	}
}

export class Rectangle<T extends UniformTypes> extends Geometry<T> {
	constructor(g: Graphics, program: Program<T>) {
		super(g, program, true);
		this.update(new Float32Array([0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0]), new Uint16Array([0,1,2,0,2,3]));
	}
}

export class Graphics extends DisposableStack {
	gl: WebGL2RenderingContext;
	currentProgram: WebGLProgram|null=null;

	passthroughFragmentShader: Shader;
	passthroughVertexShader: Shader;
	passthrough: Program<{tex: "texture", transform: "mat3"}>;

	prev_t: DOMHighResTimeStamp = 0;
	target_fps: number = 60;
	fps: number=0;
	scale=1;
	t: number = Math.random()*10000;
	observer: ResizeObserver|null=null;
	canvas: HTMLCanvasElement;

	resize(width: number, height: number) {
		this.canvas.height = this.scale*height;
		this.canvas.width = this.scale*width;

		this.canvas.style.width=`${width}px`;
		this.canvas.style.height=`${height}px`;

		this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
	}

	constructor(mount: HTMLElement, autosize: boolean) {
		super();

		this.canvas = document.createElement("canvas");
		mount.appendChild(this.canvas);

		this.gl = this.canvas.getContext("webgl2")!;

		const colorBufferFloatExt = this.gl.getExtension("EXT_color_buffer_float");

		if (!colorBufferFloatExt) {
			throw new Error("WebGL extensions missing");
		}

		if (autosize) {
			this.observer = new ResizeObserver(() =>
				this.resize(this.canvas.clientWidth, this.canvas.clientHeight));
			
			this.observer.observe(this.canvas);
		}

		this.passthroughVertexShader = this.use(new Shader(this, "vertex", passthroughVertSrc));
		this.passthroughFragmentShader = this.use(new Shader(this, "fragment", passthroughFragSrc));
		this.passthrough = this.use(new Program(this, this.passthroughFragmentShader, this.passthroughVertexShader, {tex: "texture", transform: "mat3"}));
	}

	clear(r:number,g:number,b:number,a:number) {
		this.gl.clearColor(r,g,b,a);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.check("clear");
	}

	async render() {
		const t = await new Promise<number>(res => requestAnimationFrame((t)=>res(t)));

		if (this.prev_t>0) {
			this.fps = this.fps*0.8 + 0.2*1000/(t-this.prev_t);
			this.t += (t-this.prev_t)/1000;
		}

		//log any errors
		this.check("rendering");
		this.prev_t=t;
	}

	errLimit = 100;
	check(message?: string) {
		const err = this.gl.getError();
		if (err!=this.gl.NO_ERROR) {
			if (this.errLimit-- <= 0) {
				return;
			}

			let name=null;
			for (const [k,v] of Object.entries(this.gl)) {
				if (v==err) name=k;
			}

			console.error(`WebGL Error${message ? ` (${message})` : ""}: (code \n${err})`);
			if (name!=null) console.error(name);
		}
	}

	[Symbol.dispose]() {
		this.dispose();
		this.observer?.disconnect();
		this.canvas.remove();
	}
}