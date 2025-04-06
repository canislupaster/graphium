#pragma once

#include <atomic>
#include <emscripten/wasm_worker.h>
#include <emscripten/val.h>
#include <emscripten.h>
#include <format>
#include <functional>
#include <mutex>

using namespace std;

static void run_on_main_internal(function<void()>* f) { (*f)(); }
inline void run_on_main(function<void()>&& f) {
	std::function<void()>* p = new std::function<void()>(std::move(f));
	emscripten_wasm_worker_post_function_sig(EMSCRIPTEN_WASM_WORKER_ID_PARENT, reinterpret_cast<void*>(&run_on_main_internal), "p", p);
}

#include <memory>
#include <atomic>


struct RCBuffer {
	atomic<size_t>* count;
	char* buf=nullptr;

	explicit RCBuffer(char* buf_): buf(buf_) {
		if (buf) *count() = new std::atomic<size_t>(1);
	}

	RCBuffer(RCBuffer const& other) {
		*(*this) = *other;
		if (*(*this)) (*count()=*other.count())->fetch_add(1);
	}

	RCBuffer& operator=(RCBuffer const& other) {
		this->~RCBuffer();
		*(*this) = *other;
		if (*(*this)) (*count())->fetch_add(1);
		return *this;
	}

	~RCBuffer() {
		if (*(*this) && (*count())->fetch_sub(-1)==1) {
			delete *(*this);
			delete *count();
		}
	}
};

static thread_local atomic_flag done;

template<class ...T>
struct Emitter {
	EMSCRIPTEN_DECLARE_VAL_TYPE(Handler)

	vector<Handler> handlers;
	void bind(Handler handler) {
		copy()
		handlers.push_back(handler);
	}
	
	// so references dont get invalidated while calling handlers, wait until they have finished
	// should be quick...?
	void emit(T const&... t) {
		done.clear();
		run_on_main([&, &d=done](){
			for (auto const& x: handlers) x(t...);
			d.notify_all();
		});

		done.wait(false);
	}
};

enum class ErrorKind {
	Busy,
	Other
};

inline const char* kind_message(ErrorKind kind) {
	switch (kind) {
		case ErrorKind::Busy: return "The graph is currently locked."; break;
		case ErrorKind::Other: return "An unknown error occurred"; break;
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

        
class BackendError: exception {
	string buf;
public:
	ErrorKind kind;
	string extra;

	BackendError(ErrorKind kind_, string extra_=""): kind(kind_), extra(extra_) {}
	
	char const* what() const noexcept {
		if (extra.empty()) return kind_message(kind);

		string& mut_buf = const_cast<string&>(buf);
		if (mut_buf.empty()) mut_buf = format("{}: {}", kind_message(kind), extra);
		return mut_buf.c_str();
	}
};

struct Lock {
	string name;
	bool long_task=false;
	atomic<int> waiters;
	optional<string> task_name;

	Emitter<optional<string>> status_change;

	atomic_flag cancellation;
	mutex short_lock;

	Lock(string&& name_): name(std::move(name_)) {}

	void cancel() { cancellation.notify_all(); }

	struct LongGuard {
		Lock& lock;
		unique_lock<mutex> guard;

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

	unique_lock<mutex> lock(bool read=false) {
		waiters++;
		unique_lock guard(short_lock);
		waiters--;

		if (!read && long_task) {
			throw BackendError(ErrorKind::Busy, format("{} cannot be modified since {} is running", name, *task_name));
		}

		return guard;
	}

	// nefarious
	unique_lock<mutex> read_lock() const {
		return const_cast<Lock*>(this)->lock(true);
	}

	LongGuard lock_long(std::string task_name_) {
		unique_lock s = lock(false);

		long_task=true;
		task_name.emplace(std::move(task_name_));
		cancellation.clear();

		status_change.emit(task_name);

		return LongGuard {.lock=*this, .guard=std::move(s)};
	}
};