#include <iostream>
#include "interface.hpp"

using namespace std;

int main() {
	cout<<"hi\n";
}

extern "C" void EMSCRIPTEN_KEEPALIVE test_function() {
cout<<"will u mangle?";
}