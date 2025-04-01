cmake_minimum_required(VERSION 3.29)
project(backend CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_COLOR_DIAGNOSTICS ON)

add_compile_options(-Wall -Wextra -Wpedantic -Wextra -Wshadow -Wno-sign-compare)
add_executable(backend src/main.cpp)

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
    set(EMCC_OPTIONS ${EMCC_OPTIONS} "-fwasm-exceptions" "-msimd128" "-g" "-pthread")
    set(EMCC_LINK_OPTIONS ${EMCC_OPTIONS} ${EMCC_LINK_OPTIONS} "-sENVIRONMENT=web,worker" "-sMODULARIZE" "-sEXPORT_ES6=1" "-sEXPORT_NAME=\"Backend\"" "-lembind" "-sINITIAL_MEMORY=281MB" "-sASSERTIONS" "--emit-tsd" "${CMAKE_SOURCE_DIR}/../client/generated/backend.d.ts" "-sPTHREAD_POOL_SIZE=navigator.hardwareConcurrency" "-sALLOW_MEMORY_GROWTH")
    target_compile_options(backend PRIVATE ${EMCC_OPTIONS})
    target_link_options(backend PRIVATE ${EMCC_LINK_OPTIONS} "LINKER:--fatal-warnings")
    
    set_target_properties(backend PROPERTIES
        OUTPUT_NAME "backend"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../client/public/wasm"
    )
endif()