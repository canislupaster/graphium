#pragma once

#include <emscripten.h>
#include <emscripten/val.h>
#include <functional>

#include "util.hpp"

using namespace std;

struct NodeAttribute {
	string attrib_name;
	vector<bool> init;
	variant<vector<string>, vector<int>, vector<double>> values;
};

// "clean" model, mostly all exposed to client
struct Model {
	Mutable<View> view = View {
		.selected_node=nullopt,
		.viewport_size={1,1},
		.x=0, .y=0, .zoom=1,
		.zooming=false
	};

	vector<NodeAttribute> attributes;

	int num_nodes, num_edges;
	Buffers node_bufs, edge_bufs;
	AnimationManager anim;
};