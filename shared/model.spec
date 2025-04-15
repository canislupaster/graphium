type BackendErrorKind = "Busy"|"Other"

type BackendError = {
	kind: BackendErrorKind,
	message: string,
	extra: string
}

type ToClient = 
	| BackendError
	| GraphBuffer {
		which: GraphBufferType ("Node" | "Edge"),
		pos: uint?, end_pos: uint?, buf: buffer
	}
	| View {
		selected_node: uint?,
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
	| Click (
		| ClickNode { node: uint }
		| ClickEdge { edge: uint }
		| ClickPos { pos: double[2] }
	)