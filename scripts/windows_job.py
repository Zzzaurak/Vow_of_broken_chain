"""Windows child-process ownership; imported only on Windows, using the standard library.

Start suspended, assign to a job, then resume: even a very short-lived batch wrapper
cannot create descendants before ownership is established. The job keeps tracking
descendants after that wrapper exits. Its non-inheritable handle also ensures that
Windows cleans up the tree if the launcher itself exits unexpectedly.

https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
"""
import ctypes
from ctypes import wintypes as w
import time

CREATE_SUSPENDED = 0x00000004


class BasicLimits(ctypes.Structure):
    _fields_ = [
        ('ProcessTime', ctypes.c_longlong), ('JobTime', ctypes.c_longlong),
        ('LimitFlags', w.DWORD), ('MinWorkingSet', ctypes.c_size_t),
        ('MaxWorkingSet', ctypes.c_size_t), ('ActiveProcessLimit', w.DWORD),
        ('Affinity', ctypes.c_size_t), ('PriorityClass', w.DWORD),
        ('SchedulingClass', w.DWORD),
    ]


class ExtendedLimits(ctypes.Structure):
    _fields_ = [
        ('Basic', BasicLimits), ('IoCounters', ctypes.c_ulonglong * 6),
        ('ProcessMemoryLimit', ctypes.c_size_t), ('JobMemoryLimit', ctypes.c_size_t),
        ('PeakProcessMemoryUsed', ctypes.c_size_t), ('PeakJobMemoryUsed', ctypes.c_size_t),
    ]


class ThreadEntry(ctypes.Structure):
    _fields_ = [
        ('Size', w.DWORD), ('Usage', w.DWORD), ('ThreadId', w.DWORD),
        ('ProcessId', w.DWORD), ('BasePriority', w.LONG),
        ('DeltaPriority', w.LONG), ('Flags', w.DWORD),
    ]


kernel = ctypes.WinDLL('kernel32', use_last_error=True)


def _api(name, result, *arguments):
    function = getattr(kernel, name)
    function.restype = result
    function.argtypes = arguments
    return function


_create = _api('CreateJobObjectW', w.HANDLE, w.LPVOID, w.LPCWSTR)
_set = _api('SetInformationJobObject', w.BOOL, w.HANDLE, ctypes.c_int, w.LPVOID, w.DWORD)
_assign = _api('AssignProcessToJobObject', w.BOOL, w.HANDLE, w.HANDLE)
_terminate = _api('TerminateJobObject', w.BOOL, w.HANDLE, w.UINT)
_query = _api('QueryInformationJobObject', w.BOOL, w.HANDLE, ctypes.c_int,
              w.LPVOID, w.DWORD, w.LPVOID)
_close = _api('CloseHandle', w.BOOL, w.HANDLE)
_snapshot = _api('CreateToolhelp32Snapshot', w.HANDLE, w.DWORD, w.DWORD)
_first = _api('Thread32First', w.BOOL, w.HANDLE, ctypes.POINTER(ThreadEntry))
_next = _api('Thread32Next', w.BOOL, w.HANDLE, ctypes.POINTER(ThreadEntry))
_open_thread = _api('OpenThread', w.HANDLE, w.DWORD, w.BOOL, w.DWORD)
_resume = _api('ResumeThread', w.DWORD, w.HANDLE)
_open_process = _api('OpenProcess', w.HANDLE, w.DWORD, w.BOOL, w.DWORD)
_wait = _api('WaitForSingleObject', w.DWORD, w.HANDLE, w.DWORD)


def _check(success):
    if not success:
        raise ctypes.WinError(ctypes.get_last_error())


def _resume_process(pid):
    # Popen closes the primary thread handle. A newly created suspended process
    # has only that thread, which we can reopen using the documented Tool Help API.
    snapshot = _snapshot(0x00000004, 0)  # TH32CS_SNAPTHREAD
    if snapshot == ctypes.c_void_p(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        entry = ThreadEntry()
        entry.Size = ctypes.sizeof(entry)
        found = _first(snapshot, ctypes.byref(entry))
        while found:
            if entry.ProcessId == pid:
                thread = _open_thread(0x0002, False, entry.ThreadId)  # THREAD_SUSPEND_RESUME
                _check(thread)
                try:
                    _check(_resume(thread) != 0xffffffff)
                finally:
                    _close(thread)
                return
            found = _next(snapshot, ctypes.byref(entry))
        raise RuntimeError(f'Cannot find the suspended thread of child {pid}')
    finally:
        _close(snapshot)


class WindowsJob:
    def __init__(self):
        self.handle = _create(None, None)
        _check(self.handle)
        try:
            limits = ExtendedLimits()
            limits.Basic.LimitFlags = 0x00002000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            _check(_set(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)))
        except BaseException:
            self.close()
            raise

    def assign_and_resume(self, process):
        _check(_assign(self.handle, int(process._handle)))
        _resume_process(process.pid)

    def _process_handles(self):
        capacity = 16
        while True:
            class ProcessIds(ctypes.Structure):
                _fields_ = [('Assigned', w.DWORD), ('Count', w.DWORD),
                            ('Ids', ctypes.c_size_t * capacity)]

            ids = ProcessIds()
            if _query(self.handle, 3, ctypes.byref(ids), ctypes.sizeof(ids), None):
                break
            if ctypes.get_last_error() != 234:  # ERROR_MORE_DATA
                raise ctypes.WinError(ctypes.get_last_error())
            capacity = max(capacity * 2, ids.Assigned)
        handles = []
        try:
            for pid in ids.Ids[:ids.Count]:
                handle = _open_process(0x00100000, False, pid)  # SYNCHRONIZE
                if handle:
                    handles.append(handle)
                elif ctypes.get_last_error() != 87:  # ERROR_INVALID_PARAMETER: already exited
                    raise ctypes.WinError(ctypes.get_last_error())
            return handles
        except BaseException:
            for handle in handles:
                _close(handle)
            raise

    def stop(self):
        if self.handle is None:
            return
        handles = []
        try:
            handles = self._process_handles()
            _check(_terminate(self.handle, 1))
            # TerminateJobObject is asynchronous; the job's active count can reach
            # zero before process handles are signaled. Wait on live descendants,
            # including those whose original parent has already exited.
            deadline = time.monotonic() + 10
            for handle in handles:
                result = _wait(handle, max(0, int((deadline - time.monotonic()) * 1000)))
                if result == 258:  # WAIT_TIMEOUT
                    raise TimeoutError('Windows child processes did not stop within 10 seconds')
                _check(result == 0)
        finally:
            for handle in handles:
                _close(handle)
            self.close()

    def close(self):
        if self.handle is not None:
            _check(_close(self.handle))
            self.handle = None
