import { BufferSpec, FBO, FBOChannel, Graphics, Program, RenderBuffer, Shader, Texture, UBO, UBOUniformTypes, UniformTypes, VAO, Vec2, Vec4 } from "./webgl";

import nodeVert from "./node.vert?raw";
import nodeFrag from "./node.frag?raw";

import edgeVert from "./edge.vert?raw";
import edgeFrag from "./edge.frag?raw";
import { Backend } from "./backend";
import { View } from "../generated/backend";
import { listener } from "./util";

const nodeBufferSpec = [
	{ attribute: "xyr", type: "float", dim: 3},
	{ attribute: "fill", type: "ubyte_float", dim: 3},
	{ attribute: "flags", type: "ubyte", dim: 1}
] as const satisfies BufferSpec;

const viewUBO = {
	viewport: "vec4",
	dpi: "float",
	resolution: "vec2"
} as const satisfies UBOUniformTypes;

const viewUniformType = {
	View: {type: "ubo", ubo: viewUBO}
} as const satisfies UniformTypes;
type SetViewUniform = {View: UBO<typeof viewUBO>};

export class NodeGeometry extends DisposableStack {
	program: Program<typeof viewUniformType>;
	vao: VAO<typeof nodeBufferSpec, false>;
	numNodes=0;

	draw(uni: SetViewUniform) {
		this.program.activate(uni);
		this.vao.bind();
		this.g.gl.drawArraysInstanced(this.g.gl.POINTS, 0, 1, this.numNodes);
	}

	constructor(private g: Graphics) {
		super();

		this.program = this.use(new Program(this.g,
			new Shader(g, "fragment", nodeFrag),
			new Shader(g, "vertex", nodeVert),
			viewUniformType
		));

		this.vao = this.use(new VAO(this.g, this.program, nodeBufferSpec, false));

		this.g.check("create node geometry");
	}
}

const edgeBufferSpec = [
	{attribute: "from", type: "float", dim: 2, divisor: 4},
	{attribute: "to", type: "float", dim: 2, divisor: 4},
	{attribute: "width", type: "float", dim: 1, divisor: 4},
	{attribute: "fill", type: "ubyte_float", dim: 3, divisor: 4},
	{attribute: "flags", type: "ubyte", dim: 1, divisor: 4}
] as const satisfies BufferSpec;

export class EdgeGeometry extends DisposableStack {
	vao: VAO<typeof edgeBufferSpec, false>;
	numEdges=0;
	program: Program<typeof viewUniformType>;

	draw(uni: SetViewUniform) {
		this.program.activate(uni);
		this.vao.bind();
		this.g.gl.drawArraysInstanced(this.g.gl.TRIANGLE_STRIP, 0, 4, this.numEdges);
	}

	constructor(private g: Graphics) {
		super();

		this.defer(()=>{
			console.log(`disposing graphics`);
		});

		this.program = this.use(new Program(this.g,
			new Shader(g, "fragment", edgeFrag),
			new Shader(g, "vertex", edgeVert),
			viewUniformType
		));

		this.vao = this.use(new VAO(this.g, this.program, edgeBufferSpec, false));
		this.g.check("create edge geometry");
	}
}

export class Graph extends DisposableStack {
	g: Graphics;
	nodeGeometry: NodeGeometry;
	abort = new AbortController();
	edgeGeometry: EdgeGeometry;
	viewUBO: UBO<typeof viewUBO>;
	fbo: FBO;
	depthBuf: RenderBuffer;
	colorBuf: RenderBuffer;
	hitIndexBuf: RenderBuffer;

	view?: View;
	mousePos = new Map<number, Readonly<[number, number]>>();

	constructor(public root: HTMLDivElement, private backend: Backend) {
		super();
		
		root.style.touchAction="none";
		this.use(listener(root, {
			type: ["pointerup", "pointercancel", "pointerleave", "pointerout"],
			f: (ev)=>{
				this.mousePos.delete(ev.pointerId);
				if (this.mousePos.size==0) {
					backend.send({
						type: backend.mod.ToBackend.ViewportMove,
						value: new backend.mod.ViewportMove(null, false)
					});
				}
			}
		}));

		this.use(listener(root, {
			type: "pointerdown",
			f: (ev)=>{ this.mousePos.set(ev.pointerId, [ev.clientX, ev.clientY]); }
		}));

		this.use(listener(root, {
			type: "wheel",
			f: (ev)=>{
				// only pixels supported
				if (ev.deltaMode!=WheelEvent.DOM_DELTA_PIXEL) return;
				ev.preventDefault();

				const scrollAmount = ev.deltaX + ev.deltaY + ev.deltaZ;
				if (ev.shiftKey || ev.altKey) {
					backend.send({
						type: backend.mod.ToBackend.ViewportOffset,
						value: new backend.mod.ViewportOffset([
							ev.shiftKey ? scrollAmount : 0, ev.altKey ? scrollAmount : 0
						] as const)
					});
				} else {
					backend.send({
						type: backend.mod.ToBackend.ViewportScrollZoom,
						value: new backend.mod.ViewportScrollZoom(scrollAmount)
					});
				}
			}
		}))
		
		this.use(listener(root, {
			type: "pointermove",
			f: (ev)=>{
				this.mousePos.set(ev.pointerId, [ev.clientX, ev.clientY]);

				if (this.mousePos.size==2) {
					const [a,b] = [...this.mousePos.values()];
					backend.send({
						type: backend.mod.ToBackend.ViewportTouchZoom,
						value: new backend.mod.ViewportTouchZoom(Math.hypot(a[0]-b[0], a[1]-b[1]))
					});
				} else if (ev.buttons&1) {
					const rect = this.g.canvas.getBoundingClientRect();
					const pos = [ev.clientX - rect.left, rect.bottom - ev.clientY] as const;

					backend.send({
						type: backend.mod.ToBackend.ViewportMove,
						value: new backend.mod.ViewportMove(pos, ev.shiftKey)
					});
				}
			}
		}));

		this.use(backend.subscribe({
			type: backend.mod.ToClient.View,
			f: ({value})=>{ this.view=value; }
		}));

		this.defer(()=>this.abort.abort());
		this.g = this.use(new Graphics({
			mount: root, autosize: true,
			multisample: false
		}));
		
		this.depthBuf = this.use(new RenderBuffer(this.g, {type: "depth32"}));
		this.colorBuf = this.use(new RenderBuffer(this.g, {type: "rgba16f"}));
		this.hitIndexBuf = this.use(new RenderBuffer(this.g, {type: "r32i"}));

		this.fbo = this.use(new FBO(this.g, null, [
			{type: "depth", tex: this.depthBuf},
			{type: "color", tex: this.colorBuf},
			{type: "color", tex: this.hitIndexBuf},
		]));

		this.g.onResize.add((w,h)=>{
			this.backend.send({
				type: this.backend.mod.ToBackend.ViewportResize,
				value: new this.backend.mod.ViewportResize(w,h)
			});
		});

		this.nodeGeometry = this.use(new NodeGeometry(this.g));
		this.viewUBO = this.use(new UBO(this.g, this.nodeGeometry.program, "View", viewUBO));
		this.edgeGeometry = this.use(new EdgeGeometry(this.g));

		this.nodeGeometry.vao.setArray({
			xyr: new Float32Array([0,0,2.0]),
			fill: new Uint8Array([255,0,0]),
			flags: new Uint8Array([1])
		});

		this.nodeGeometry.numNodes=1;

		this.edgeGeometry.vao.setArray({
			from: new Float32Array([-0.5, -0.4]),
			to: new Float32Array([0.5, 0.2]),
			width: new Float32Array([1.0]),
			fill: new Uint8Array([0,255,0]),
			flags: new Uint8Array([1])
		});

		this.edgeGeometry.numEdges=1;
		this.nodeGeometry.numNodes=1;
	}

	async render() {
		while (!this.abort.signal.aborted) {
			if (this.view) {
				const minDim = Math.min(...this.view.viewportSize);
				const [xMul,yMul] = this.view.viewportSize.map(x=>minDim/x);

				this.viewUBO.update({
					viewport: [
						this.view.x, this.view.y,
						this.g.scale*this.view.zoom*xMul,this.g.scale*this.view.zoom*yMul
					],
					dpi: window.devicePixelRatio ?? 1,
					resolution: this.view.viewportSize
				});

				this.g.setTarget(this.fbo);
				this.g.clear([
					[this.fbo.channels[0] as FBOChannel&{type: "depth"}, 1.0],
					[this.fbo.channels[1] as FBOChannel&{type: "color"}, [0,0,0,0]]
				]);

				this.edgeGeometry.draw({View: this.viewUBO});
				this.nodeGeometry.draw({View: this.viewUBO});
				
				this.g.setTarget(null);

				this.g.clear([
					[{type: "color"}, [0,0,0,0]]
				]);
				this.g.copyFrom(this.fbo, [ [this.fbo.channels[1], {type: "color"}] ]);
			}

			const t = await this.g.render();
			this.backend.send({
				type: this.backend.mod.ToBackend.AnimationFrame,
				value: new this.backend.mod.AnimationFrame(t)
			});
		}
	}
}