#pragma once
#include <condition_variable>
#include <deque>
#include <emscripten.h>
#include <emscripten/wasm_worker.h>
#include <functional>
#include <vector>

using namespace std;

constexpr int WORKER_STACK = 10*1024;

struct Pool {
	vector<emscripten_wasm_worker_t> workers;
	deque<function<void()>> queue;
	
	mutex lock;
	condition_variable cv;

	static void run_pool(Pool* pool) {
		unique_lock lock(pool->lock);
		while (true) {
			while (pool->queue.empty()) pool->cv.wait(lock);

			auto&& task = std::move(pool->queue.front());
			pool->queue.pop_front();

			lock.unlock();

			task();

			lock.lock();
		}
	}

	template<class T>
	void launch(T f) {
		unique_lock guard(lock);
		queue.push_back(f);
		guard.unlock();

		cv.notify_one();
	}
	
	Pool(int nworker=emscripten_navigator_hardware_concurrency()) {
		for (int i=0; i<nworker; i++) {
			workers.push_back(emscripten_malloc_wasm_worker(WORKER_STACK));
			emscripten_wasm_worker_post_function_sig(workers.back(), reinterpret_cast<void*>(&Pool::run_pool), "p", static_cast<void*>(this));
		}
	}

	~Pool() {
		for (auto x: workers) emscripten_terminate_wasm_worker(x);
	}
};