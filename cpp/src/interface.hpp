#pragma once

#include "model.hpp"
#include "pool.hpp"
#include "util.hpp"

#include <emscripten.h>

struct Backend {
	Backend() {}

	Pool pool;
	Model state;

	template<class F>
	void run_catching(F f) {
		try {
			return f();
		} catch (BackendError const& e) {
			// state.error.emit(e);
		} catch (exception const& e) {
			// state.error.emit(BackendError(ErrorKind::Other, e.what()));
		}
	}

	void resize(double w, double h) {
		run_catching([&](){
			auto l = state.main_lock.lock();
			state.view.viewport_size = {w,h};
		});
	}

	void move(double dx, double dy, double zoomMul) {
		run_catching([&](){
			auto l = state.main_lock.lock();
			state.view.x += dx, state.view.y += dy;
			state.view.zoom=clamp(state.view.zoom*zoomMul, 0.001, 1000.0);
		});
	}
};