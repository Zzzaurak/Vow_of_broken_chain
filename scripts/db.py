#!/usr/bin/env python3
"""Manage this project's own PostgreSQL cluster without touching any other database.

Used by run.py and callable on its own; the POSIX entry point is scripts/db.sh.
"""
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'
DATA = LOCAL / 'postgres'
LOG = LOCAL / 'postgres.log'
PORT = os.environ.get('OATH_PGPORT', '55439')
USER = 'oath'
DATABASES = ('oath', 'oath_test')
WINDOWS = os.name == 'nt'
MARKER = '# Managed by the project launcher (oath / oath_test).'


def _environ():
    return dict(os.environ, PGHOST='127.0.0.1', PGHOSTADDR='127.0.0.1', PGPORT=PORT,
                PGUSER=USER, PGCLIENTENCODING='UTF8')


def _tool(name):
    path = shutil.which(name)
    if path is None:
        raise SystemExit(
            f'Missing executable: {name}. Install the PostgreSQL command-line tools '
            '(initdb, pg_ctl, pg_isready, psql, createdb) and add them to PATH.'
        )
    return path


def _run(command, env, log=None):
    if log is None:
        return subprocess.run(command, env=env, check=True)
    with log.open('w', encoding='utf-8') as handle:
        return subprocess.run(command, env=env, check=True, stdout=handle, stderr=subprocess.STDOUT)


def configure():
    """Pin the listen address and port, so no -o value has to survive shell quoting."""
    conf = DATA / 'postgresql.conf'
    managed_settings = 'port|listen_addresses' if WINDOWS else 'port|listen_addresses|unix_socket_directories'
    kept = [
        line
        for line in conf.read_text(encoding='utf-8').splitlines()
        if not re.match(rf'^#?\s*({managed_settings})\s*=', line) and not line.startswith(MARKER)
    ]
    kept += [MARKER, "listen_addresses = '127.0.0.1'", f'port = {PORT}']
    if not WINDOWS:
        # Matches the socket directory the POSIX launcher always passed with -k.
        kept.append(f"unix_socket_directories = '{LOCAL}'")
    conf.write_text('\n'.join(kept) + '\n', encoding='utf-8', newline='\n')


def running(pg_ctl=None, env=None):
    pg_ctl = pg_ctl or _tool('pg_ctl')
    env = env or _environ()
    return subprocess.run([pg_ctl, '-D', str(DATA), 'status'], env=env, capture_output=True).returncode == 0


def ready(pg_isready=None, env=None):
    pg_isready = pg_isready or _tool('pg_isready')
    env = env or _environ()
    return subprocess.run(
        [pg_isready, '-h', '127.0.0.1', '-p', PORT], env=env, capture_output=True
    ).returncode == 0


def _start(pg_ctl, pg_isready, env):
    command = [pg_ctl, '-D', str(DATA), '-l', str(LOG), 'start']
    if WINDOWS:
        # Start outside this console: postgres must outlive the launcher's Ctrl-C.
        subprocess.run(
            command,
            env=env,
            check=True,
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        subprocess.run(command, env=env, check=True)
    for _ in range(60):
        if ready(pg_isready, env):
            return
        time.sleep(.5)
    raise SystemExit(f'PostgreSQL did not start; inspect {LOG}')


def _query(psql, query, env):
    # Ignore user psql startup files and never prompt for a password in the launcher.
    return subprocess.run(
        [psql, '-X', '-w', '-d', 'postgres', '-Atc', query], env=env,
        capture_output=True, text=True, encoding='utf-8', check=True,
    ).stdout.strip()


def _verify_running_port():
    # postmaster.pid records the live port; postgresql.conf may describe a future restart.
    try:
        actual = (DATA / 'postmaster.pid').read_text(encoding='utf-8').splitlines()[3]
        matches = int(actual) == int(PORT)
    except (OSError, IndexError, ValueError) as error:
        raise SystemExit('Cannot verify the project PostgreSQL port; refusing to connect.') from error
    if not matches:
        raise SystemExit(
            f'Project PostgreSQL is still running on port {actual}, not {PORT}. '
            'Stop it with scripts/db.py stop before changing OATH_PGPORT.'
        )


def ensure():
    """Create the project cluster if needed, start it, and make sure both databases exist."""
    env = _environ()
    initdb, pg_ctl = _tool('initdb'), _tool('pg_ctl')
    psql, createdb, pg_isready = _tool('psql'), _tool('createdb'), _tool('pg_isready')
    LOCAL.mkdir(exist_ok=True)
    if not (DATA / 'PG_VERSION').is_file():
        command = [initdb, '-D', str(DATA), '-U', USER, '--auth-host=trust', '--encoding=UTF8', '--locale=C']
        if not WINDOWS:
            command.append('--auth-local=trust')
        _run(command, env, log=LOCAL / 'initdb.log')
    if running(pg_ctl, env):
        _verify_running_port()
    else:
        if ready(pg_isready, env):
            raise SystemExit(f'Port {PORT} belongs to another PostgreSQL instance; refusing to reuse it.')
        configure()
        _start(pg_ctl, pg_isready, env)
    actual_data = _query(psql, 'SHOW data_directory', env)
    if Path(actual_data).resolve() != DATA.resolve():
        raise SystemExit(f'Port {PORT} belongs to another PostgreSQL data directory; refusing to reuse it.')
    for database in DATABASES:
        count = _query(psql, f"SELECT count(*) FROM pg_database WHERE datname='{database}'", env)
        if count == '0':
            _run([createdb, database], env)
    print(f'Project PostgreSQL ready on 127.0.0.1:{PORT} ({DATABASES[0]} / {DATABASES[1]})')


def stop():
    env = _environ()
    if not running(env=env):
        print('Project PostgreSQL is not running.')
        return
    subprocess.run([_tool('pg_ctl'), '-D', str(DATA), 'stop', '-m', 'fast'], env=env, check=True)


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else 'start'
    if action == 'start':
        ensure()
    elif action == 'stop':
        stop()
    elif action == 'status':
        print('running' if running() else 'not running')
    else:
        raise SystemExit(f'Unknown action: {action} (use start, stop or status)')


if __name__ == '__main__':
    main()
