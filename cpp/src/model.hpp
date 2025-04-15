#pragma once

#include <emscripten.h>
#include <emscripten/val.h>

#include "util.hpp"
#include "graph.hpp"

using namespace std;

struct NodeAttribute {
};

struct Model {
	Mutable<View> view = View {
		.selected_node=nullopt,
		.viewport_size={1,1},
		.x=0, .y=0, .zoom=1,
		.zooming=false
	};

	vector<NodeAttribute> attributes;

	int num_nodes, num_edges;
	
	AnimationManager anim;
};