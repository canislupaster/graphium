uniform vec4 viewport;
uniform float dpi;

in vec3 xyr;
in vec3 fill;
in uint flags;

flat out float out_scale;
flat out vec3 out_fill;
flat out float highlight;
flat out int uint out_node_index;

void main(void) {
	gl_Position = vec4(vec2(xyr.xy - viewport.xy)*viewport.zw, 0.0, 1.0);
	out_fill = fill;
	highlight = float(flags);
	out_scale = 25.0*xyr.z*max(viewport.z, viewport.w)*dpi;
	out_node_index = gl_InstanceID;
	gl_PointSize = out_scale;
}