uniform vec4 viewport;
uniform float dpi;
uniform vec2 resolution;

in vec2 from;
in vec2 to;
in float width;
in vec3 fill;
in uint flags;

out vec2 out_coord;
flat out vec2 corner;
flat out vec3 out_fill;
flat out float highlight;
flat out int uint out_edge_index;

void main() {
	float l = length(to-from);
	vec2 unit = (to-from)/max(l,1.0e-4);
	vec2 perp = vec2(-unit.y, unit.x);

	float perp_l = 10.0*width*dpi;
	float fac = min(resolution.x, resolution.y);
	vec2 perp_px = perp*perp_l/fac;

	vec2 rect_positions[4] = vec2[4](
		from + perp_px, from - perp_px,
		to + perp_px, to - perp_px
	);

	vec2 pos = (rect_positions[gl_VertexID] - viewport.xy) * viewport.zw;
	highlight = float(flags);

	corner = vec2(l*fac, perp_l);

	out_coord = vec2[4](
		vec2(0.0,corner.y), vec2(0.0,-corner.y),
		corner, vec2(corner.x, -corner.y)
	)[gl_VertexID];

	out_fill = fill;

	out_edge_index = gl_InstanceID;
	gl_Position = vec4(vec2(pos), 0.0, 1.0);
}