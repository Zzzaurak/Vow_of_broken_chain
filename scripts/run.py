#!/usr/bin/env python3
"""Run this project's local game; Ctrl-C stops only the processes started here."""
import argparse
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

import db

ROOT = Path(__file__).resolve().parents[1]
WINDOWS = os.name == 'nt'
PYTHON = sys.executable or shutil.which('python3') or shutil.which('python')
LAUNCHER = 'py scripts/run.py' if WINDOWS else 'python3 scripts/run.py'


class InstanceLock:
    """One lock file per launcher instance; the holder is the instance that is running."""

    def __init__(self, path):
        self.path = path
        self.handle = None

    def _take(self):
        self.handle.seek(0)
        if WINDOWS:
            import msvcrt

            try:
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                return False
        else:
            import fcntl

            try:
                fcntl.flock(self.handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                return False
        return True

    def acquire(self, blocking=False):
        if self.handle is not None:
            self.release()
        self.handle = self.path.open('a+')
        if self.handle.seek(0, os.SEEK_END) == 0:
            self.handle.write('\0')
            self.handle.flush()
        while True:
            if self._take():
                return True
            if not blocking:
                self.release()
                return False
            time.sleep(.5)

    def release(self):
        if self.handle is None:
            return
        # Closing the descriptor drops the lock on both platforms.
        self.handle.close()
        self.handle = None


def interrupt(_signal, _frame):
    raise KeyboardInterrupt


def install_signal_handlers():
    for name in ('SIGTERM', 'SIGHUP'):
        number = getattr(signal, name, None)
        if number is not None:
            signal.signal(number, interrupt)


def spawn(command, cwd, env=None, log=None):
    """Start one child in its own process group, so this run can stop exactly what it started."""
    options = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if WINDOWS else {'start_new_session': True}
    return subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
        stdout=log if log is not None else None,
        stderr=subprocess.STDOUT if log is not None else None,
        **options,
    )


def stop_group(process, force=False):
    """Stop the process group of a child started here; never search by port or process name."""
    if WINDOWS:
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True)
        return
    try:
        os.killpg(process.pid, signal.SIGKILL if force else signal.SIGTERM)
    except ProcessLookupError:
        pass


def child_env():
    env = dict(os.environ)
    # Keep the build scripts reading and writing UTF-8 on non-UTF-8 locales such as zh-CN Windows.
    env.setdefault('PYTHONUTF8', '1')
    return env


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--built', action='store_true', help='build and serve the production frontend')
    parser.add_argument('action', nargs='?', choices=['start', 'status', 'stop', 'restart'], default='start')
    args = parser.parse_args()
    local = ROOT / '.local'
    local.mkdir(exist_ok=True)
    lock = InstanceLock(local / 'run.lock')
    if not lock.acquire():
        if args.action in ('start', 'status'):
            print(f'本项目已启动或正在启动。打开 http://127.0.0.1:5179/ ，关闭用 {LAUNCHER} stop，重启用 {LAUNCHER} restart。')
            return
        (local / 'run.stop').touch()
        print('正在等待本项目前后端关闭…', flush=True)
        lock.acquire(blocking=True)
        if args.action == 'stop':
            print('前后端已关闭，数据库和存档已保留。')
            return
    if args.action in ('stop', 'status'):
        print('本启动器当前未运行。若服务是手工启动的，请在原终端按 Ctrl-C。')
        lock.release()
        return
    stop = local / 'run.stop'
    stop.unlink(missing_ok=True)
    try:
        launch(parser, args.built, stop)
    finally:
        lock.release()


def launch(parser, built, stop):
    tools = {}
    for name in ('node', 'npm', 'java', 'sbt'):
        tools[name] = shutil.which(name)
        if tools[name] is None:
            parser.error(f'Missing executable: {name}')
    for port in (5179, 8093):
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', port)) == 0:
                parser.error(f'Port {port} is already in use. 请在原启动终端按 Ctrl-C，确认端口释放后再启动本项目。')
    if not os.environ.get('DATABASE_URL'):
        db.ensure()
    env = child_env()
    frontend = ROOT / 'frontend'
    if not (frontend / 'node_modules').is_dir():
        subprocess.run([tools['npm'], 'ci'], cwd=frontend, env=env, check=True)
    subprocess.run([PYTHON, str(ROOT / 'scripts/build-content.py')], cwd=ROOT, env=env, check=True)
    if built:
        subprocess.run([tools['npm'], 'run', 'build'], cwd=frontend, env=env, check=True)
    processes = []
    logs = []
    local = ROOT / '.local'
    local.mkdir(exist_ok=True)
    install_signal_handlers()
    try:
        log = (local / 'api.log').open('w', encoding='utf-8')
        logs.append(log)
        backend_env = dict(env, PORT='8093')
        if not backend_env.get('DATABASE_URL'):
            backend_env['DATABASE_URL'] = f"jdbc:postgresql://127.0.0.1:{backend_env.get('OATH_PGPORT', '55439')}/oath"
        processes.append(spawn([tools['sbt'], 'run'], ROOT / 'backend', backend_env, log))
        deadline = time.monotonic() + 180
        while True:
            if stop.exists():
                return
            if processes[0].poll() is not None:
                raise RuntimeError('Scala exited; inspect .local/api.log')
            try:
                with urlopen('http://127.0.0.1:8093/health', timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                pass
            if time.monotonic() > deadline:
                raise RuntimeError('Scala startup timed out; inspect .local/api.log')
            time.sleep(.5)
        command = [PYTHON, str(ROOT / 'scripts/serve.py')] if built else [tools['npm'], 'run', 'dev']
        processes.append(spawn(command, frontend, env))
        print('Game: http://127.0.0.1:5179 — Ctrl-C stops this run; project database remains available.', flush=True)
        while all(process.poll() is None for process in processes):
            if stop.exists():
                return
            time.sleep(.5)
        raise RuntimeError('A game process exited unexpectedly; inspect its output and .local/api.log')
    except KeyboardInterrupt:
        print('\nStopping game processes…', flush=True)
    finally:
        for process in reversed(processes):
            # Each group was created by this invocation; never find/kill by port or name.
            stop_group(process)
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                stop_group(process, force=True)
                process.wait()
        for log in logs:
            log.close()


if __name__ == '__main__':
    main()
