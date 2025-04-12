type BackendErrorKind = "Busy"|"Other"

type BackendError = {
	kind: BackendErrorKind,
	message: string,
	extra: string
}

type BufferBlock = {
	node_buffer: buffer,
	edge_buffer: buffer
}

type ToClient = 
	| BackendError
	| GraphBuffer {
		block: int,
		data: BufferBlock,
		num_blocks: int
	}
	| View {
		selected_node: int?,
		viewport_size: double[2],
		x: double, y: double, zoom: double,
		zooming: bool
	}

type ToBackend =
	| ViewportMove { pos: double[2]?, zooming: bool }
	| ViewportOffset { offset: double[2] }
	| ViewportResize { w: double, h: double }
	| ViewportTouchZoom { dist: double }
	| ViewportScrollZoom { delta: double }
	| AnimationFrame { t: double }