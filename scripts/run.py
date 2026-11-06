#!/usr/bin/env python3
"""Run this project's local game; Ctrl-C stops only the processes started here."""
import argparse
import fcntl
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--built', action='store_true', help='build and serve the production frontend')
    parser.add_argument('action', nargs='?', choices=['start', 'status', 'stop', 'restart'], default='start')
    args = parser.parse_args()
    local = ROOT / '.local'
    local.mkdir(exist_ok=True)
    with (local / 'run.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            if args.action in ('start', 'status'):
                print('本项目已启动或正在启动。打开 http://127.0.0.1:5179/ ，关闭用 python3 scripts/run.py stop，重启用 python3 scripts/run.py restart。')
                return
            (local / 'run.stop').touch()
            print('正在等待本项目前后端关闭…', flush=True)
            fcntl.flock(lock, fcntl.LOCK_EX)
            if args.action == 'stop':
                print('前后端已关闭，数据库和存档已保留。')
                return
        if args.action in ('stop', 'status'):
            print('本启动器当前未运行。若服务是手工启动的，请在原终端按 Ctrl-C。')
            return
        stop = local / 'run.stop'
        stop.unlink(missing_ok=True)
        launch(parser, args.built, stop)


def launch(parser, built, stop):
    for tool in ('node', 'npm', 'java', 'sbt'):
        if shutil.which(tool) is None:
            parser.error(f'Missing executable: {tool}')
    for port in (5179, 8093):
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', port)) == 0:
                parser.error(f'Port {port} is already in use. 请在原启动终端按 Ctrl-C，确认端口释放后再启动本项目。')
    if not os.environ.get('DATABASE_URL'):
        subprocess.run([str(ROOT / 'scripts/db.sh')], cwd=ROOT, check=True)
    if not (ROOT / 'frontend/node_modules').is_dir():
        subprocess.run(['npm', 'ci'], cwd=ROOT / 'frontend', check=True)
    subprocess.run(['python3', str(ROOT / 'scripts/build-content.py')], cwd=ROOT, check=True)
    if built:
        subprocess.run(['npm', 'run', 'build'], cwd=ROOT / 'frontend', check=True)
    processes = []
    logs = []
    local = ROOT / '.local'
    local.mkdir(exist_ok=True)
    def interrupt(_signal, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGHUP, interrupt)
    try:
        log = (local / 'api.log').open('w')
        logs.append(log)
        env = dict(os.environ, PORT='8093')
        if not env.get('DATABASE_URL'):
            env['DATABASE_URL'] = f"jdbc:postgresql://127.0.0.1:{env.get('OATH_PGPORT', '55439')}/oath"
        processes.append(subprocess.Popen(['sbt', 'run'], cwd=ROOT / 'backend', env=env,
                                          stdout=log, stderr=subprocess.STDOUT, start_new_session=True))
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
        command = ['python3', str(ROOT / 'scripts/serve.py')] if built else ['npm', 'run', 'dev']
        processes.append(subprocess.Popen(command, cwd=ROOT / 'frontend', start_new_session=True))
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
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()
        for log in logs:
            log.close()


if __name__ == '__main__':
    main()
