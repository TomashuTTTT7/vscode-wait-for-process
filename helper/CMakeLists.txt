cmake_minimum_required(VERSION 3.27)
project(wait-for-process)

#set(CMAKE_MSVC_RUNTIME_LIBRARY $<IF:$<CONFIG:Debug>,MultiThreadedDebug,MultiThreaded>)

add_executable(wait-for-process main.cc)
target_link_libraries(wait-for-process psapi.lib)
set_target_properties(wait-for-process PROPERTIES RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})