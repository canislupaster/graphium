#include <iostream>
#include <emscripten/atomic.h>
#include <limits>
#include "interface.hpp"

using namespace std;

optional<Backend> backend=nullopt;

extern "C" void EMSCRIPTEN_KEEPALIVE handle_message(char* msg) {
	char* ptr=msg;
	ToBackend msg_content = ToBackend::deserialize(ptr);
	delete msg;

	backend->pool.launch([msg_content=std::move(msg_content)]() {
		backend->handle_all(msg_content);
	});
}

constexpr size_t MAX_MESSAGE=256;
unique_ptr<char[]> msg_buf[MAX_MESSAGE];
uint32_t msg_i=0;
atomic_flag cont;

extern "C" void EMSCRIPTEN_KEEPALIVE deinit() {
	backend.reset();
	cont.test_and_set();
}

uint32_t loop_cur;
void loop(int32_t*, uint32_t, int, void*) {
	while (!cont.test()) {
		uint32_t i = emscripten_atomic_load_u32(&msg_i);
		if (i==loop_cur) {
			emscripten_atomic_wait_async(&msg_i, i,
				 &loop, nullptr,
				std::numeric_limits<double>::infinity());
			return;
		}

		while (loop_cur!=i) {
			auto& ptr = msg_buf[(loop_cur++)%MAX_MESSAGE];
			EM_ASM({ Module.jsHandleMessage($0); }, ptr.get());
			ptr.reset();
		}
	}
}

extern "C" void EMSCRIPTEN_KEEPALIVE init() {
	cont.clear();
	msg_i=0;
	loop_cur=0;
	backend.emplace();
	fill(msg_buf, msg_buf+MAX_MESSAGE, nullptr);

	// may run on another thread
	backend->root.bind([](ToClient const& msg) {
		size_t sz = msg.serialization_size();
		auto buf = make_unique<char[]>(sz);
		char* ptr = buf.get();
		msg.serialize(ptr);

		uint32_t i = emscripten_atomic_add_u32(&msg_i, 1);
		msg_buf[i%MAX_MESSAGE].swap(buf);

		emscripten_atomic_notify(&msg_i, 1);

		if (buf) {
			EM_ASM({ console.error("message buffer overflow, everything might break"); });
		}
	});
	
	loop(nullptr,0,0,nullptr);
}