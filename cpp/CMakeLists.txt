cmake_minimum_required(VERSION 3.29)
project(backend CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_COLOR_DIAGNOSTICS ON)

add_compile_options(-Wall -Wextra -Wpedantic -Wextra -Wshadow -Wno-sign-compare)
add_executable(backend src/main.cpp)

include(FetchContent)
FetchContent_Declare(
    gtl
    GIT_REPOSITORY https://github.com/greg7mdp/gtl.git
    GIT_TAG        v1.2.0
)
FetchContent_MakeAvailable(gtl)

# link_libraries or include_directories doesnt work for some reason,
# and its probably not my fault? judging by how many legitimate bugs
# ive had with emscripten...
target_compile_options(backend PUBLIC -I${gtl_SOURCE_DIR}/include)

if (CMAKE_BUILD_TYPE MATCHES Debug)
    add_compile_definitions(BUILD_DEBUG)

    if (EMSCRIPTEN)
        # set(EMCC_OPTIONS "-O1")
    else()
        add_compile_options(-fsanitize=address)
        add_link_options(-fsanitize=address)
    endif()
endif ()

if (EMSCRIPTEN)
    set(EMCC_OPTIONS ${EMCC_OPTIONS} "-fwasm-exceptions" "-mbulk-memory" "-matomics" "-msimd128" "-g")
    set(EMCC_LINK_OPTIONS ${EMCC_OPTIONS} ${EMCC_LINK_OPTIONS} "-sENVIRONMENT=web,worker" "-sMODULARIZE" "-sEXPORT_ES6=1" "-sEXPORT_NAME=\"Backend\"" "-sINITIAL_MEMORY=281MB" "-sWASM_WORKERS" "-sASSERTIONS" "--emit-tsd" "${CMAKE_SOURCE_DIR}/../client/generated/backend.d.ts" "-sALLOW_MEMORY_GROWTH" "--post-js" "${CMAKE_BINARY_DIR}/post.js" "-sEXPORTED_FUNCTIONS=['_malloc']" "-sEXPORTED_RUNTIME_METHODS=['getExceptionMessage','incrementExceptionRefcount','decrementExceptionRefcount','_wasmWorkerRunPostMessage']")
    target_compile_options(backend PRIVATE ${EMCC_OPTIONS})
    target_link_options(backend PRIVATE ${EMCC_LINK_OPTIONS} "LINKER:--fatal-warnings")
    
    set_target_properties(backend PROPERTIES
        OUTPUT_NAME "backend"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../client/public/wasm"
    )
endif()