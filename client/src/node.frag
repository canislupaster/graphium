flat in float out_scale;
flat in vec3 out_fill;
flat in float highlight;
flat in int out_node_index;

layout(location=0) out vec4 fragColor;
layout(location=1) out int nodeIndex;

void main() {
	vec2 pos = 2.0*gl_PointCoord - vec2(1.0);
	float r2 = dot(pos,pos);
	float opacity = clamp((1.0-r2)*out_scale*0.1, 0.0, 1.0);
	float zoom = max(view.viewport.z, view.viewport.w);
	float highlight_opacity = highlight*clamp((r2-out_scale*min(out_scale*out_scale, 100.0)*0.0000001)*3.0, 0.0, 1.0);

	fragColor = vec4(mix(out_fill, highlight_color, highlight_opacity), 1.0)*opacity;
	nodeIndex = out_node_index;
}
