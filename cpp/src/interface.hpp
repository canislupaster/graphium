#pragma once

#include "model.hpp"
#include "pool.hpp"
#include "util.hpp"

#include <emscripten.h>
#include <iostream>

struct Backend {
	Backend() {
		auto root_sink = [&r=root](auto&& x) {
			r.emit(ToClient(std::move(x)));
		};

		error.sink(root_sink);
		state.view.change.sink(root_sink);
	}

	Mutex main;
	Pool pool;
	Emitter<BackendError> error;

	Model state;
	Emitter<ToClient> root;
	unique_lock<Mutex> lock; // lmao
	
	void handle_all(ToBackend const& msg) {
		try {
			unique_lock lock2(main);
			lock.swap(lock2);
			visit([this](auto const& x) -> void { handle(x); }, msg.value);
			lock.swap(lock2);
		} catch (BackendErrorEx const& e) {
			error.emit(e.inner);
		} catch (exception const& e) {
			error.emit(BackendError(BackendErrorKind::Other, e.what()));
		}
	}

	void handle(ViewportResize const& new_size) {
		state.view.mutate([=](View& v){
			v.viewport_size={new_size.w, new_size.h};		
		});
	}
	
	struct ZoomState {
		double first_dist, orig_zoom;
		double zoom_mul(double dist) {
			double ddist = (0.2 + dist)/(0.2 + first_dist);
			return clamp(orig_zoom*ddist, 0.001, 1000.0);
		}
	};

	optional<ZoomState> zoom_state;
	optional<double> zoom_velocity;

	void handle(ViewportTouchZoom const& zoom) {
		state.view.mutate([&](View& v){
			zoom_velocity.reset();
			if (!zoom_state) zoom_state={zoom.dist, v.zoom};
			v.zoom = zoom_state->zoom_mul(zoom.dist);
			v.zooming = true;
		});
	}

	optional<double> prev_t;

	void handle(AnimationFrame const& frame) {
		if (prev_t) {
			double dt = (frame.t-*prev_t)/1000.0;

			if (zoom_velocity) {
				double& zv = *zoom_velocity;
				double dif;
				double dt2 = 1.0*dt;
				double threshold = 5.0;
				if (zv<threshold) { // linear when delta is tiny
					dt2 *= threshold;
					dif = zv<0 ? max(-dt2,zv) : min(dt2,zv);
				} else {
					dif = zv * min(1.0, dt2);
				}

				zv-=dif;

				state.view.mutate([&](View& v) {
					v.zoom = clamp(v.zoom*exp(dif), 0.001, 1000.0);
					v.zooming = true;
				});
				
				if (zv<0.1) zoom_velocity.reset();
			}

			state.anim.tick(dt);
		}

		prev_t=frame.t;
	}

	void handle(ViewportScrollZoom const& zoom) {
		zoom_velocity = zoom_velocity.value_or(0) + zoom.delta/(
			1.0 + min(state.view->viewport_size[0], state.view->viewport_size[1])
		);

		zoom_state.reset();
	}

	double multiplier() const {
		return 2.0/(
			state.view->zoom*(1.0 + min(state.view->viewport_size[0], state.view->viewport_size[1]))
		);
	}

	optional<array<double,2>> previous_mouse_pos;
	void handle(ViewportOffset const& off) {
		double mul = multiplier();
		state.view.mutate([o=off.offset, mul](View& v) {
			v.x += mul*o[0], v.y += mul*o[1];
		});
	}

	void handle(ViewportMove const& move) {
		double mul = multiplier();

		state.view.mutate([this, move, mul](View& v){
			if (move.zooming && move.pos) {
				auto [cx,cy] = array<double,2>{
					(*move.pos)[0] - v.viewport_size[0]/2,
					(*move.pos)[1] - v.viewport_size[1]/2
				};

				double dist = hypot(cx, cy);
				zoom_velocity.reset();
				if (!zoom_state) zoom_state={dist, v.zoom};
				v.zoom = zoom_state->zoom_mul(dist);

			} else if (move.pos && previous_mouse_pos) {
				auto& from = *previous_mouse_pos;
				v.x -= ((*move.pos)[0]-from[0])*mul;
				v.y -= ((*move.pos)[1]-from[1])*mul;
			}

			if (!move.zooming) zoom_state.reset();
			previous_mouse_pos = move.pos;
			v.zooming = move.zooming;
		});
	}
};