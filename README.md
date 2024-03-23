# wait-for-process-fork

This repository is a fork. Check changelog to see changes i made.

# wait-for-process

This very small extensions exposes a vscode command called `wait-for-process-fork.wait` which is primarily
designed to be used by a Attach to debugger launch configuration when debugging native modules.

The command returns the PID of a matching process, either by matching by process name (e.g. `node.exe`)
or by matching with a DLL which a process loads (`my_node_addon.node`). This allows you to create an
Attach launch configuration which automatically finds the Electron process for example which loads
your native node addon.

Currently works only on windows.

## Example

Let's say you have a native node addon, called `my_addon.node` which you want to debug in your electron app. However electron apps have several processes, which makes finding which process to attach to a bit annoying, using this plugin you can craft your `launch.json` like this to simplify the process:

**launch.json**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "(Windows) Attach to my_addon.node",
      "type": "cppvsdbg",
      "request": "attach",
      "processId": "${input:processId}"
    }
  ],
  "inputs": [
    {
      "id": "processId",
      "type": "command",
      "command": "wait-for-process-fork.wait",
      "args": { "moduleName": "my_addon.node" }
    }
  ]
}
```

The above configuration (named `(Windows) to my_addon.node`) uses the _input_ `processId` to call the command `wait-for-process-fork.wait`
(contributed by this plugin) to discover a process which loads the DLL `my_addon.node`.

The possible arguments to the command are:

- `processName`: The (exact) name of the process, e.g. `explorer.exe` (just the filename)
- `moduleName`: The (exact) name of the DLL, e.g. `my_addon.node` (just the filename)

## Debugging startup issues in your Node addon

If you need to make sure Electron waits for the debugger to attach before proceeding you can add the following C++ snipped to your addon init function.

It will wait for up to 1 minute for a debugger to attach when a debugger attaches is will trigger a breakpoint.

```cpp
#include <nan.h>

#include <thread>
#include <chrono>

#include <windows.h>
bool wait_for_debugger()
{
    for (int i = 0; i < 120; ++i) {
        if (IsDebuggerPresent()) {
            return true;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }

    return false;
}

using Nan::GetFunction;
using Nan::New;
using Nan::Set;
using v8::FunctionTemplate;
using v8::Handle;
using v8::Object;
using v8::String;

NAN_METHOD(Hello)
{
    info.GetReturnValue().Set(New<String>("World").ToLocalChecked());
}

NAN_MODULE_INIT(InitAll)
{
    if (getenv("WAIT_FOR_DEBUGGER") != nullptr) {
        if (wait_for_debugger()) {
            DebugBreak();
        }
    }

    Set(target, New<String>("Hello").ToLocalChecked(),
        GetFunction(New<FunctionTemplate>(Hello)).ToLocalChecked());
}

NODE_MODULE(addon, InitAll)
```

## Note

The plugin uses a native-helper called `wait-for-process.exe` which enumerates all processes on the current machine and their loaded DLLs. This helper is periodically called to see when a matching process is started. You can find the helper at the path `$VSCODE_EXTENSION_DIR/mauve.wait-for-process-$VERSION/helper/wait-for-process.exe`.
