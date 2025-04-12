#version 300 es
precision highp float;
const vec3 highlight_color = vec3(1.0f, 0.85f, 0.21f);

uniform View {
	vec4 viewport;
	vec2 resolution;
	float dpi;
} view;