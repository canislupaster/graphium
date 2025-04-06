layout(location=0) out vec4 fragColor;
layout(location=1) out int nodeIndex;

flat in float out_scale;
flat in vec3 out_fill;
flat in float highlight;
flat in int uint out_node_index;

void main() {
	vec2 pos = 2.0*gl_PointCoord - vec2(1.0);
	float r2 = dot(pos,pos);
	float opacity = clamp((1.0-r2)*out_scale*0.1, 0.0, 1.0);
	float highlight_opacity = highlight*clamp((r2-0.5)*out_scale*0.05, 0.0, 1.0);

	fragColor = vec4(mix(out_fill, highlight_color, highlight_opacity), 1.0)*opacity;
	nodeIndex = out_node_index;
}
