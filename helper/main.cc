// clang-format off
#include <cstddef>
#include <windows.h>
#include <psapi.h>
#include <stdio.h>
#include <tchar.h>
// clang-format on

void PrintProcessInfo(DWORD processID, char *expected_process_name,
                      char *expected_module_name) {
  HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                                FALSE, processID);

  if (NULL != hProcess) {
    HMODULE hMods[1024];
    DWORD cbNeeded;

    if (EnumProcessModulesEx(hProcess, hMods, sizeof(hMods), &cbNeeded,
                             LIST_MODULES_ALL)) {
      TCHAR szProcessName[MAX_PATH] = TEXT("<unknown>");
      GetModuleBaseName(hProcess, hMods[0], szProcessName,
                        sizeof(szProcessName) / sizeof(TCHAR));

      if (expected_process_name &&
          strcmp(szProcessName, expected_process_name) != 0) {
        CloseHandle(hProcess);
        return;
      }

      for (DWORD i = 1; i < cbNeeded / sizeof(HMODULE); ++i) {
        TCHAR szModuleName[MAX_PATH] = TEXT("<unknown>");
        GetModuleBaseName(hProcess, hMods[i], szModuleName,
                          sizeof(szModuleName) / sizeof(TCHAR));

        if (expected_module_name) {
          if (strcmp(szModuleName, expected_module_name) != 0)
            continue;
        }

        _tprintf(TEXT("%lu:%lu:%s:%s\n"), processID, i, szProcessName,
                 szModuleName);
      }
    }
  }

  CloseHandle(hProcess);
}

int main(int argc, char *argv[]) {
  DWORD aProcesses[1024], cbNeeded, cProcesses;

  if (!EnumProcesses(aProcesses, sizeof(aProcesses), &cbNeeded)) {
    return 1;
  }

  char* expected_process = NULL;
  char* expected_module = NULL;
  for (int i = 0; i < argc; i++) {
    if (strcmp(argv[i], "processName=") >= 0) {
      expected_process = &argv[i][12];
    } else if (strcmp(argv[i], "moduleName=") >= 0) {
      expected_module = &argv[i][11];
    }
  }

  cProcesses = cbNeeded / sizeof(DWORD);

  for (DWORD i = 0; i < cProcesses; i++) {
    if (aProcesses[i] != 0) {
      PrintProcessInfo(aProcesses[i], expected_process, expected_module);
    }
  }

  return 0;
}