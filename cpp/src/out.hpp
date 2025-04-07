#pragma once
#include <emscripten.h>
#include <variant>
#include <array>
#include <vector>
#include <optional>
#include <algorithm>
#include <string>
struct BackendErrorKind {
	enum _Inner { Busy, Other } value;
	constexpr inline size_t serialization_size() const { return 1; }
	inline void serialize(char* _buf) const {
		*reinterpret_cast<unsigned char*>(_buf) = static_cast<unsigned char>(value);
	}
	static inline BackendErrorKind deserialize(char* _buf) {
		return BackendErrorKind {
			.value = static_cast<_Inner>(*reinterpret_cast<unsigned char*>(_buf))
		};
	}
};
struct BackendError {
	BackendErrorKind kind;
	std::string extra;
	inline size_t serialization_size() const {
		return 8 + extra.size()+8;
	}
	inline void serialize(char* _buf) const {
		kind.serialize(_buf);
		_buf+=8;
		*reinterpret_cast<uint64_t*>((_buf+=8)-8) = extra.size();
		std::copy(extra.begin(), extra.end(), _buf);
		_buf += extra.size();
	}
	static inline BackendError deserialize(char* _buf) {
		BackendErrorKind kind = BackendErrorKind::deserialize(_buf);
		size_t extra_size = *reinterpret_cast<uint64_t*>((_buf+=8)-8);
		std::string extra(_buf, _buf+extra_size);
		_buf+=extra_size;
		return BackendError {
			.kind=std::move(kind),
			.extra=std::move(extra)
		};
	}
};
struct A {
	std::string value;
	inline size_t serialization_size() const {
		return value.size()+8;
	}
	inline void serialize(char* _buf) const {
		*reinterpret_cast<uint64_t*>((_buf+=8)-8) = value.size();
		std::copy(value.begin(), value.end(), _buf);
		_buf += value.size();
	}
	static inline A deserialize(char* _buf) {
		size_t value_size = *reinterpret_cast<uint64_t*>((_buf+=8)-8);
		std::string value(_buf, _buf+value_size);
		_buf+=value_size;
		return A {
			.value=std::move(value)
		};
	}
};
struct B {
	std::vector<int64_t> value2;
	inline size_t serialization_size() const {
		return value2.size()*8;
	}
	inline void serialize(char* _buf) const {
		*reinterpret_cast<uint64_t*>((_buf+=8)-8) = value2.size();
		for (int64_t const& _3: value2) {
			*reinterpret_cast<int64_t*>((_buf+=8)-8) = _3;
		}
	}
	static inline B deserialize(char* _buf) {
		std::vector<int64_t> value2;
		size_t value2_nel = *reinterpret_cast<uint64_t*>((_buf+=8)-8);
		value2.reserve(value2_nel);
		while (value2_nel--) {
			int64_t value2_el = *reinterpret_cast<int64_t*>((_buf+=8)-8);
			value2.push_back(std::move(value2_el));
		}
		return B {
			.value2=std::move(value2)
		};
	}
};
struct C {
	std::array<int64_t, 5> value2;
	constexpr inline size_t serialization_size() const {
		return 40;
	}
	inline void serialize(char* _buf) const {
		for (int64_t const& _4: value2) {
			*reinterpret_cast<int64_t*>((_buf+=8)-8) = _4;
		}
	}
	static inline C deserialize(char* _buf) {
		int64_t value2_0 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t value2_1 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t value2_2 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t value2_3 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t value2_4 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		std::array<int64_t, 5> value2 = { std::move(value2_0), std::move(value2_1), std::move(value2_2), std::move(value2_3), std::move(value2_4) };
		return C {
			.value2=std::move(value2)
		};
	}
};
struct XD {
	std::variant<A, B, C> value;
	inline size_t serialization_size() const {
		switch (value.index()) {
			case 0: return 1+std::get<A>(value).serialization_size();
			case 1: return 1+std::get<B>(value).serialization_size();
			case 2: return 41;
			default: throw std::runtime_error("invalid value of XD");
		}
	}
	inline void serialize(char* _buf) const {
		*reinterpret_cast<unsigned char*>(_buf) = static_cast<unsigned char>(value.index());
		_buf+=1;
		switch (value.index()) {
			case 0: {
				std::get<A>(value).serialize(_buf);
				break;
			}
			case 1: {
				std::get<B>(value).serialize(_buf);
				break;
			}
			case 2: {
				std::get<C>(value).serialize(_buf);
				break;
			}
			default: throw std::runtime_error("invalid value of XD");
		}
	}
	static inline XD deserialize(char* _buf) {
		switch (*reinterpret_cast<unsigned char*>((_buf+=1)-1)) {
			case 0: {
				A value = A::deserialize(_buf);
				return XD { value };
			}
			case 1: {
				B value = B::deserialize(_buf);
				return XD { value };
			}
			case 2: {
				C value = C::deserialize(_buf);
				return XD { value };
			}
			default: throw std::runtime_error("invalid value of XD");
		}
	}
};
struct Um {
	std::array<int64_t, 10> xd;
	constexpr inline size_t serialization_size() const {
		return 80;
	}
	inline void serialize(char* _buf) const {
		for (int64_t const& _6: xd) {
			*reinterpret_cast<int64_t*>((_buf+=8)-8) = _6;
		}
	}
	static inline Um deserialize(char* _buf) {
		int64_t xd_0 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_1 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_2 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_3 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_4 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_5 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_6 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_7 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_8 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		int64_t xd_9 = *reinterpret_cast<int64_t*>((_buf+=8)-8);
		std::array<int64_t, 10> xd = { std::move(xd_0), std::move(xd_1), std::move(xd_2), std::move(xd_3), std::move(xd_4), std::move(xd_5), std::move(xd_6), std::move(xd_7), std::move(xd_8), std::move(xd_9) };
		return Um {
			.xd=std::move(xd)
		};
	}
};