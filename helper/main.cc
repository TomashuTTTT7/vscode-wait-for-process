// clang-format off
#include <windows.h>
#include <psapi.h>
#include <stdio.h>
#include <tchar.h>
// clang-format on

void PrintProcessInfo(DWORD processID) {
  HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                                FALSE, processID);

  if (NULL != hProcess) {
    HMODULE hMods[1024];
    DWORD cbNeeded;

    if (EnumProcessModulesEx(hProcess, hMods, sizeof(hMods), &cbNeeded, LIST_MODULES_ALL)) {
      TCHAR szProcessName[MAX_PATH] = TEXT("<unknown>");
      GetModuleBaseName(hProcess, hMods[0], szProcessName,
                        sizeof(szProcessName) / sizeof(TCHAR));

      for (DWORD i = 1; i < cbNeeded / sizeof(HMODULE); ++i) {
        TCHAR szModuleName[MAX_PATH] = TEXT("<unknown>");
        GetModuleBaseName(hProcess, hMods[i], szModuleName,
                          sizeof(szModuleName) / sizeof(TCHAR));
        _tprintf(TEXT("%lu:%lu:%s:%s\n"), processID, i, szProcessName,
                 szModuleName);
      }
    }
  }

  CloseHandle(hProcess);
}

int main(void) {
  DWORD aProcesses[1024], cbNeeded, cProcesses;

  if (!EnumProcesses(aProcesses, sizeof(aProcesses), &cbNeeded)) {
    return 1;
  }

  cProcesses = cbNeeded / sizeof(DWORD);

  for (DWORD i = 0; i < cProcesses; i++) {
    if (aProcesses[i] != 0) {
      PrintProcessInfo(aProcesses[i]);
    }
  }

  return 0;
}