#pragma once

#include <emscripten.h>
#include <emscripten/val.h>

#include "util.hpp"

using namespace std;

struct NodeAttribute {
	string attrib_name;
	vector<bool> init;
	variant<vector<string>, vector<int>, vector<double>> values;
};

struct ViewModel {
	optional<int> selected_node;
	array<double,2> viewport_size;
	double x,y,zoom;
};

struct Model {
	Lock main_lock {"State"};

	ViewModel view;
	vector<NodeAttribute> attributes;

	int num_nodes, num_edges;
	Buffers node_bufs, edge_bufs;
};