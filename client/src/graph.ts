import { Backend } from "../generated/backend";
import { BufferSpec, Graphics, Program, Shader, UBO, UBOUniformTypes, UniformTypes, VAO, Vec2, Vec4 } from "./webgl";

import nodeVert from "./node.vert?raw";
import nodeFrag from "./node.frag?raw";

import edgeVert from "./edge.vert?raw";
import edgeFrag from "./edge.frag?raw";

const nodeBufferSpec = [
	{ attribute: "xyr", type: "float", dim: 3},
	{ attribute: "fill", type: "ubyte_float", dim: 3},
	{ attribute: "flags", type: "ubyte", dim: 1}
] as const satisfies BufferSpec;

const viewUBO = [
	{name: "viewport", value: "vec4"},
	{name: "dpi", value: "float"},
	{name: "resolution", value: "vec2"}
] as const satisfies UBOUniformTypes;

const viewUniformType = {
	view: "ubo"
} as const satisfies UniformTypes;
type SetViewUniform = {view: UBO<typeof viewUBO>};

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

		this.program = this.use(new Program(this.g,
			new Shader(g, "fragment", edgeFrag),
			new Shader(g, "vertex", edgeVert),
			viewUniformType
		));

		this.vao = this.use(new VAO(this.g, this.program, edgeBufferSpec, false));
		this.g.check("create edge geometry");
	}
}

export class Graph {
	g: Graphics;
	nodeGeometry: NodeGeometry;
	abort = new AbortController();
	edgeGeometry: EdgeGeometry;
	viewUBO: UBO<typeof viewUBO>;

	constructor(public root: HTMLDivElement, private backend: Backend) {
		this.g = new Graphics(root, true);
		this.viewUBO = new UBO(this.g, viewUBO);

		this.nodeGeometry = new NodeGeometry(this.g);
		this.edgeGeometry = new EdgeGeometry(this.g);

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
			this.g.clear([0,0,0,0]);

			const minDim = Math.min(this.g.width, this.g.height);
			const yMul = minDim/this.g.height, xMul = minDim/this.g.width;

			this.viewUBO.update({
				viewport: [-0.5,-0.3,this.g.scale*xMul*3.0,this.g.scale*yMul*3.0],
				dpi: window.devicePixelRatio ?? 1,
				resolution: [this.g.width, this.g.height]
			});

			this.edgeGeometry.draw({view: this.viewUBO});
			this.nodeGeometry.draw({view: this.viewUBO});
			await this.g.render();
		}
	}

	[Symbol.dispose]() {
		this.abort.abort();
		this.g.dispose();
	}
}