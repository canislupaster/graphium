in vec2 out_coord;
flat in vec2 corner;
flat in vec3 out_fill;
flat in float highlight;
flat in int out_edge_index;

layout(location=0) out vec4 fragColor;
layout(location=1) out int edgeIndex;

void main() {
	float dis = corner.y - abs(out_coord.y);
	float edge_mul = 0.003*dis*dis;

	float r = max(min(corner.x/2.0, corner.y), 1e-4);
	float r2 = r*r;

	vec2 off1 = out_coord - vec2(r, 0.0);
	vec2 off2 = out_coord - vec2(corner.x - r, 0.0);

	float d = off1.x > 0.0 ? (off2.x < 0.0 ? -1000.0 : dot(off2,off2)) : dot(off1,off1);
	float lmul = max((r2-d)/r, 0.0) * 0.015;

	float w = min(1.5*edge_mul,1.0)*min(4.0*lmul,1.0);
	float highlight_amount = highlight*(1.0 - w*w*corner.y*0.01);
	fragColor = min(10.0*edge_mul,1.0)*min(10.0*lmul,1.0)
		*vec4(mix(out_fill, highlight_color, highlight_amount), 1.0);
	edgeIndex = -out_edge_index-1;
}
