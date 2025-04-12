in vec3 xyr;
in vec3 fill;
in uint flags;

flat out float out_scale;
flat out vec3 out_fill;
flat out float highlight;
flat out int out_node_index;

void main(void) {
	out_fill = fill;
	highlight = float(flags);
	out_scale = 25.0*xyr.z*max(view.viewport.z, view.viewport.w)*view.dpi;
	out_node_index = gl_InstanceID;
	gl_PointSize = out_scale;

	// nodes have depth 0 - 0.5
	float depth = 0.25-highlight*0.25 + fract(float(gl_InstanceID)*0.001)*0.25;
	gl_Position = vec4(vec2(xyr.xy - view.viewport.xy)*view.viewport.zw, depth, 1.0);
}