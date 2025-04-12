#pragma once

#include <atomic>
#include <chrono>
#include <emscripten/atomic.h>
#include <emscripten/wasm_worker.h>
#include <emscripten/val.h>
#include <emscripten.h>
#include <format>
#include <functional>
#include <list>
#include <mutex>
#include <type_traits>
#include "../build/generated.hpp"

using namespace std;

inline const char* kind_message(BackendErrorKind kind) {
	switch (kind.value) {
		case BackendErrorKind::Busy: return "The graph is currently locked."; break;
		case BackendErrorKind::Other: return "An unknown error occurred"; break;
	}
}

template<class T>
struct Buffer {
	int size=0;
	vector<T> value;
	bool dirty=false;

	void update_range(int from, int to, T const* ptr) {
		copy(ptr, ptr+to-from, value.get()+from);
		dirty=true;
	}

	void resize(int n) {
		if (n==size) return;
		value.resize(n);
		dirty=true;
	}
};

struct Buffers {
	Buffer<float> floats;
	Buffer<unsigned char> chars;
};
        
class BackendErrorEx: exception {
	string buf;
public:
	BackendError inner;
	BackendErrorEx(BackendErrorKind kind_, string extra_=""): inner {
		kind_, kind_message(kind_), extra_
	} {}
	
	char const* what() const noexcept {
		if (inner.extra.empty()) return inner.message.c_str();

		string& mut_buf = const_cast<string&>(buf);
		if (mut_buf.empty()) {
			mut_buf = format("{}: {}", inner.message, inner.extra);
		}
		return mut_buf.c_str();
	}
};

template<class T>
struct EmitterHandlers {
	vector<function<void(T const&)>> vec;
	optional<function<void(T&&)>> sink;
};

template<class T>
struct Emitter {
	shared_ptr<EmitterHandlers<T>> handlers;
	Emitter(): handlers(make_shared<EmitterHandlers<T>>()) {}

	template<class F>
	void sink(F&& sink) {
		handlers->sink.emplace(function<void(T&&)>(std::forward<F>(sink)));
	}
	template<class F>
	Emitter(F&& sink) { sink(forward(sink)); }
	
	void emit(T&& t) {
		for (function<void(T const&)> const& f: handlers->vec) f(t);
		if (handlers->sink) (*handlers->sink)(std::move(t));
	}

	void emit(T const& t) {
		for (function<void(T const&)> const& f: handlers->vec) f(t);
		if (handlers->sink) {
			T copy=t;
			(*handlers->sink)(std::move(copy));
		}
	}

	template<class Handler>
	void bind(Handler&& handler) {
		handlers->vec.push_back(function<void(T const&)>(std::forward<Handler>(handler)));
	}

	template<class R, class Handler>
	Emitter<R> map(Handler&& handler) {
		Emitter<R> e;
		bind([e, handler=std::forward(handler)](T const& t) mutable {
			e.emit(handler(t));
		});
		return e;
	}
};

template<class T>
class Mutable {
	T inner;
public:
	Mutable() requires (is_default_constructible_v<T>) {}
	Mutable(T inner_): inner(inner_) {}

	Emitter<T> change;
	T const& operator*() const { return inner; }
	T const* operator->() const { return &inner; }

	template<class F>
	void mutate(F&& f) {
		T& r = inner;
		std::forward<F>(f)(r);
		change.emit(inner);
	}

	T const& operator=(T&& nval) {
		inner=std::move(nval);
		change.emit(inner);
	}
};

class Mutex {
	emscripten_lock_t _lock;
public:
	Mutex() { emscripten_lock_init(&_lock); }
	void lock() { emscripten_lock_waitinf_acquire(&_lock); }
	void spinlock() { emscripten_lock_busyspin_waitinf_acquire(&_lock); }
	void unlock() { emscripten_lock_release(&_lock); }
	void try_lock() { emscripten_lock_try_acquire(&_lock); }
	template<class Rep, class Period>
	bool try_lock_for(chrono::duration<Rep, Period> const& timeout_duration) {
		size_t nanos = chrono::duration_cast<chrono::nanoseconds>(timeout_duration).count();
		return emscripten_lock_wait_acquire(&_lock, nanos);
	}
	friend class ConditionVariable;
};

class ConditionVariable {
	emscripten_condvar_t _condvar;
public:
	ConditionVariable() { emscripten_condvar_init(&_condvar); }
	void wait(unique_lock<Mutex>& lock) {
		emscripten_condvar_waitinf(&_condvar, &lock.mutex()->_lock);
	}
	template<class Rep, class Period>
	void wait_for(unique_lock<Mutex>& lock, chrono::duration<Rep, Period> const& rel_time) {
		size_t nanos = chrono::duration_cast<chrono::nanoseconds>(rel_time).count();
		emscripten_condvar_wait(&_condvar, &lock.mutex()->_lock, nanos);
	}
	void notify_one() { emscripten_condvar_signal(&_condvar, 1); }
	void notify_all() { emscripten_condvar_signal(&_condvar, EMSCRIPTEN_NOTIFY_ALL_WAITERS); }
};

struct Lock {
	string name;
	bool long_task=false;
	atomic<int> waiters;
	optional<string> task_name;

	Emitter<optional<string>> status_change;

	atomic_flag cancellation;
	Mutex short_lock;

	Lock(string&& name_): name(std::move(name_)) {}

	void cancel() { cancellation.notify_all(); }

	struct ShortLock { std::unique_lock<Mutex> guard; };

	struct LongGuard {
		Lock& lock;
		unique_lock<Mutex> guard;

		bool yield() {
			guard.unlock();

			while (true) {
				int v=lock.waiters;
				if (v==0) break;
				lock.waiters.wait(v);
			}

			guard.lock();

			return !lock.cancellation.test();
		}

		~LongGuard() {
			if (!guard.owns_lock()) guard.lock();
			lock.long_task=false;
			lock.status_change.emit(nullopt);
		}
	};
	
	void assert_writable() const {
		if (long_task) {
			throw BackendErrorEx(BackendErrorKind::Busy,
				format("{} cannot be modified since {} is running", name, *task_name));
		}
	}
	
	ShortLock lock() {
		waiters++;
		unique_lock guard(short_lock);
		waiters--;

		return ShortLock { .guard=std::move(guard) };
	}

	// nefarious
	ShortLock read_lock() const { return const_cast<Lock*>(this)->lock(); }

	LongGuard lock_long(std::string task_name_, ShortLock&& lock) {
		assert_writable();

		long_task=true;
		task_name.emplace(std::move(task_name_));
		cancellation.clear();

		status_change.emit(task_name);

		return LongGuard {.lock=*this, .guard=std::move(lock.guard)};
	}
};

class AnimationManager {
	struct Animation {
		double t, duration;
		std::function<bool(double)> compute;
		optional<std::function<void()>> end;
	};

	list<Animation> current;

public:
	template<class F>
	decltype(current.begin()) add(double dur, F&& f) {
		current.emplace_back(0, dur, std::forward(f), nullopt);
	}
	template<class F, class F2>
	decltype(current.begin()) add(double dur, F&& f, F2&& end) {
		current.emplace_back(0, dur, std::forward(f), std::forward(end));
	}

	void tick(double dt) {
		for (auto it=current.begin(); it!=current.end();) {
			Animation& anim = *it;
			anim.t+=dt;

			bool cont = anim.compute(min(anim.t, anim.duration));

			if (anim.t>anim.duration || !cont) {
				if (anim.end) (*anim.end)();
				it=current.erase(it);
			} else {
				it++;
			}
		}
	}
};