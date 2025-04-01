#pragma once

#ifdef EMSCRIPTEN
#include <emscripten.h>
#include <emscripten/html5.h>
#include <emscripten/bind.h>
#include <emscripten/proxying.h>

//same thing but allows move
#define MY_EMSCRIPTEN_DECLARE_VAL_TYPE(name) \
struct name : public ::emscripten::val { \
  explicit name(val const &other) : val(other) {} \
}

MY_EMSCRIPTEN_DECLARE_VAL_TYPE(Float32Array);
MY_EMSCRIPTEN_DECLARE_VAL_TYPE(Uint16Array);
MY_EMSCRIPTEN_DECLARE_VAL_TYPE(Uint8Array);
MY_EMSCRIPTEN_DECLARE_VAL_TYPE(Promise);

struct Backend {
	Backend() {}

	emscripten::ProxyingQueue emscripten_queue;

	struct ErrVariant {std::string what;};

	template<class F>
	struct WrapF {
		using Result = typename std::invoke_result<F>::type;
		F f;
		
		template<class T = Result>
		std::enable_if_t<std::is_void_v<T>, std::optional<ErrVariant>> operator()() {
			try {
				f();
				return std::optional<ErrVariant>();
			} catch (std::exception const& e) {
				return std::make_optional<ErrVariant>(e.what());
			}
		}

		template<class T = Result>
		std::enable_if_t<!std::is_void_v<T>, std::variant<ErrVariant, Result>> operator()() {
			try {
				return std::invoke(f);
			} catch (std::exception const& e) {
				return ErrVariant {e.what()};
			}
		}

		static std::optional<emscripten::val> err(std::optional<ErrVariant> const& v) {
			if (v) return emscripten::val(v->what);
			else return std::optional<emscripten::val>();
		}

		template<class T = Result>
		static std::optional<emscripten::val> err(std::enable_if_t<!std::is_void_v<T>, std::variant<Result, ErrVariant>> const& v) {
			ErrVariant const* ex = std::get_if<ErrVariant>>(v);
			if (ex) return emscripten::val(ex->what);
			else return std::optional<emscripten::val>();
		}

		template<class T = Result>
		static std::optional<emscripten::val> success(std::enable_if_t<!std::is_void_v<T>, std::variant<Result, ErrVariant>>&& v) {
			Result const* res = std::get_if<Result>>(v);
			if (res) return emscripten::val(res);
			else return std::optional<emscripten::val>();
		}

		static std::optional<emscripten::val> success(std::optional<ErrVariant>&&) {
			return std::optional<emscripten::val>();
		}
	};

	// calls function on a worker to prevent blocking main thread
	template<class F>
	Promise promise(F f) {
		pthread_t main_thread = pthread_self();
		auto promise = emscripten::val::global("Promise");

		auto wrapped = WrapF(std::move(f));

		return Promise(promise.call<emscripten::val>("new", [this, main_thread, wrapped=std::move(wrapped)](emscripten::val res, emscripten::val rej) mutable {
			
			std::thread([this, main_thread, res=std::move(res), rej=std::move(rej), wrapped=std::move(wrapped)]() mutable {
				std::optional<ErrVariant> ret = wrapped();

				emscripten_queue.proxySync(main_thread, [res=std::move(res), rej=std::move(rej), ret=std::move(ret)]() mutable {
					std::optional<emscripten::val> err = WrapF<F>::err(ret);
					if (err) {
						rej(err);
					} else {
						auto succ = WrapF<F>::success(std::move(ret));
						if (succ) res(*succ); else res();
					}

					//important to destruct here, otherwise will be destroyed in thread pool
					//bc function captured by reference, but destruction can only happen
					//on main thread.....
					//moving ensures object remains destructible
					res=emscripten::val();
					rej=emscripten::val();
				});
			}).detach();
		}));
	}
};

EMSCRIPTEN_BINDINGS(backend) {
	emscripten::class_<Backend>("Backend")
		.constructor();
	
	emscripten::register_type<Float32Array>("Float32Array");
	emscripten::register_type<Uint8Array>("Uint8Array");
	emscripten::register_type<Uint16Array>("Uint16Array");
	emscripten::register_type<Promise>("Promise");
}
#endif
