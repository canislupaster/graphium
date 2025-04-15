#pragma once

#include "util.hpp"

struct __attribute__((packed)) BufferNode {
	enum NodeFlags: unsigned char { Highlighted = 1, Deleted = 2 };
	constexpr static GraphBufferType buf_type = GraphBufferType::Node;

	float pos[2]; float r;
	unsigned char fill[3];
	unsigned char flags;

	void mark_deleted() { flags|=Deleted; }
};

struct __attribute__((packed)) BufferEdge {
	enum EdgeFlags: unsigned char { Highlighted = 1, Deleted = 2 };
	constexpr static GraphBufferType buf_type = GraphBufferType::Edge;

	float from[2], to[2];
	float width;
	unsigned char col[3];
	unsigned char flags;

	void mark_deleted() { flags|=Deleted; }
};

struct NodeData { vector<size_t> adj_edge; };
struct EdgeData { size_t from, to; };

constexpr size_t BLOCK_SIZE = 1024;
//max modifications to single block before sending entire block
constexpr size_t BLOCK_MAX_MODIFIED = 32;

struct BufferBlockInfo {
	bitset<BLOCK_SIZE> dirty;
	vector<uint16_t> modified;
};

template<class T, class R>
class Buffer {
	size_t sz=0;

	RCBuffer vec;
	vector<R> data;

	vector<BufferBlockInfo> block_info;
	vector<size_t> dirty_blocks;

	vector<size_t> free;
	size_t free_i=0;
	
	constexpr static GraphBufferType buf_type = T::buf_type;
	
	void mark(size_t i) {
		BufferBlockInfo& info = block_info[i/BLOCK_SIZE];

		if (info.modified.empty()) {
			dirty_blocks.push_back(i/BLOCK_SIZE);
		}

		uint16_t bi = i%BLOCK_SIZE;
		if (!info.dirty[bi]) {
			info.dirty.set(bi);
			info.modified.push_back(bi);
		}
	}
	
public:
	Emitter<GraphBuffer> update;
	Buffer() {}
	
	void flush_changes() {
		for (size_t block_i: dirty_blocks) {
			BufferBlockInfo& info = block_info[block_i];

			if (info.modified.size()>=BLOCK_MAX_MODIFIED) {
				update.emit(GraphBuffer {
					.which=buf_type,
					.pos=block_i*BLOCK_SIZE,
					.end_pos=(block_i+1)*BLOCK_SIZE,
					.buf=vec
				});
			} else {
				for (uint16_t& bi: info.modified) {
					update.emit(GraphBuffer {
						.which=buf_type,
						.pos=bi + block_i*BLOCK_SIZE,
						.end_pos = nullopt,
						.buf=vec
					});
				}
			}

			for (uint16_t& bi: info.modified) info.dirty.reset(bi);
			info.modified.clear();
		}
		
		dirty_blocks.clear();
	}
	
	size_t add(size_t count=1) {
		if (free.size() && count==1) {
			size_t x = free.back();
			free.pop_back();
			return x;
		}
		
		if (free_i+count>sz) {
			do sz*=2; while (free_i+count>sz);
			data.resize(sz), block_info.resize(sz);
			size_t new_buf_size = sz*sizeof(BufferNode);
			vec = RCBuffer(new char[new_buf_size], new_buf_size);

			update.emit(GraphBuffer {
				.which=buf_type, .pos=nullopt, .end_pos=nullopt, .buf=vec
			});
		}

		return (free_i+=count)-count;
	}
	
	pair<T const&, R&> operator[](size_t i) {
		return { *(reinterpret_cast<T*>(vec.data().data()) + i), data[i] };
	}

	pair<T const&, R const&> operator[](size_t i) const {
		return { *(reinterpret_cast<T*>(vec.data().data()) + i), data[i] };
	}

	void set(size_t i, optional<T> const& v) {
		T& r = *(reinterpret_cast<T*>(vec.data().data()) + i);
		if (v) {
			r = *v;
		} else {
			free.push_back(i);
			r.mark_deleted();
		}

		mark(i);
	}
	
	size_t size() const { return sz; }
};

using NodeBuffers = Buffer<BufferNode, NodeData>;
using EdgeBuffers = Buffer<BufferEdge, EdgeData>;

struct AttributeData {
	string attrib_name;
	variant<HashMap<size_t, string>, HashMap<size_t, int>, HashMap<size_t, float>> values;
};

struct GraphData {
	NodeBuffers node_bufs;
	EdgeBuffers edge_bufs;
	vector<AttributeData> node_attrib;
	vector<AttributeData> edge_attrib;
	HashMap<string, size_t> node_name_to_attrib;
	HashMap<string, size_t> edge_name_to_attrib;
	
	
};
