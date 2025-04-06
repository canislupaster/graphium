uniform mat3 transform;

in vec2 in_coord;
out vec2 coord;

void main(void) {
  coord = in_coord;
  vec3 transformed = transform*vec3(in_coord,1.0);
  gl_Position = vec4(transformed.xy*2.0 - 1.0, 0.0, transformed.z);
}