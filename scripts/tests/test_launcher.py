"""Launcher regressions. Real PostgreSQL tests use temporary clusters only.

python -m unittest discover -s scripts/tests -v
Set OATH_SCRIPT_DB_TESTS=1 to include isolated PostgreSQL integration tests.
"""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import db
import run


def free_port():
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        return str(probe.getsockname()[1])


class DatabaseOwnershipTests(unittest.TestCase):
    def setUp(self):
        temporary = self.enterContext(tempfile.TemporaryDirectory(prefix='oath-db-unit-'))
        self.root = Path(temporary)
        self.enterContext(patch.multiple(db, LOCAL=self.root, DATA=self.root / 'postgres',
                                        LOG=self.root / 'postgres.log', PORT='55439'))
        db.DATA.mkdir()
        (db.DATA / 'PG_VERSION').write_text('18', encoding='utf-8')
        (db.DATA / 'postmaster.pid').write_text('123\ndata\ntime\n55439\n', encoding='utf-8')
        self.enterContext(patch.object(db, '_tool', side_effect=lambda name: name))
        self.enterContext(patch.object(db, 'running', return_value=True))
        self.configure = self.enterContext(patch.object(db, 'configure'))
        self.query = self.enterContext(patch.object(db, '_query'))
        self.create = self.enterContext(patch.object(db, '_run'))

    def test_changed_port_rejected_before_connecting_or_rewriting_configuration(self):
        db.PORT = '55440'
        with self.assertRaisesRegex(SystemExit, 'still running on port 55439'):
            db.ensure()
        self.query.assert_not_called()
        self.create.assert_not_called()
        self.configure.assert_not_called()

    def test_missing_live_port_fails_closed(self):
        (db.DATA / 'postmaster.pid').unlink()
        with self.assertRaisesRegex(SystemExit, 'Cannot verify'):
            db.ensure()
        self.query.assert_not_called()

    def test_foreign_data_directory_rejected_before_creating_databases(self):
        self.query.return_value = str(self.root / 'foreign')
        with self.assertRaisesRegex(SystemExit, 'another PostgreSQL data directory'):
            db.ensure()
        self.assertEqual(self.query.call_count, 1)
        self.create.assert_not_called()

    def test_owned_running_cluster_can_create_missing_database(self):
        self.query.side_effect = [str(db.DATA), '0', '1']
        db.ensure()
        self.assertEqual(self.create.call_args.args[0], ['createdb', 'oath'])
        self.configure.assert_not_called()


@unittest.skipUnless(os.name == 'nt', 'Windows Job Objects')
class WindowsProcessTests(unittest.TestCase):
    def setUp(self):
        temporary = self.enterContext(tempfile.TemporaryDirectory(prefix='oath process test '))
        self.root = Path(temporary)

    def test_orphaned_grandchild_is_stopped_and_releases_port(self):
        ready = self.root / 'ready'
        port = free_port()
        grandchild = (
            'import socket,time,pathlib,os;'
            's=socket.socket();s.bind(("127.0.0.1",' + port + '));s.listen();'
            'pathlib.Path(' + repr(str(ready)) + ').write_text(str(os.getpid()));time.sleep(60)'
        )
        child = (
            'import subprocess,sys,time,pathlib;'
            'subprocess.Popen([sys.executable,"-c",' + repr(grandchild) + ']);'
            'p=pathlib.Path(' + repr(str(ready)) + ');'
            '\nwhile not p.exists():time.sleep(.02)'
        )
        parent = 'import subprocess,sys;sys.exit(subprocess.call([sys.executable,"-c",' + repr(child) + ']))'
        process = run.spawn([sys.executable, '-c', parent], self.root)
        self.addCleanup(run.stop_group, process)
        self.assertEqual(process.wait(timeout=15), 0)
        self.assertTrue(ready.is_file())
        with socket.create_connection(('127.0.0.1', int(port)), timeout=2):
            pass
        run.stop_group(process)
        self.assertIsNone(process.oath_job.handle)
        with socket.socket() as probe:
            self.assertNotEqual(probe.connect_ex(('127.0.0.1', int(port))), 0)

    def test_immediately_exiting_batch_wrapper_is_assigned_before_it_runs(self):
        command = self.root / 'quick child.cmd'
        command.write_text('@exit /b 7\r\n', encoding='utf-8')
        for _ in range(10):
            process = run.spawn([str(command)], self.root)
            try:
                self.assertEqual(process.wait(timeout=10), 7)
            finally:
                run.stop_group(process)

    def test_failed_job_assignment_does_not_leave_a_suspended_process(self):
        import windows_job
        original = run.subprocess.Popen
        started = []

        def record(*args, **kwargs):
            process = original(*args, **kwargs)
            started.append(process)
            return process

        with patch.object(run.subprocess, 'Popen', side_effect=record), patch.object(
            windows_job.WindowsJob, 'assign_and_resume', side_effect=OSError('assignment failed')
        ):
            with self.assertRaisesRegex(OSError, 'assignment failed'):
                run.spawn([sys.executable, '-c', 'import time;time.sleep(60)'], self.root)
        self.assertEqual(len(started), 1)
        self.assertIsNotNone(started[0].poll())
        self.assertIsNone(started[0].oath_job.handle)


@unittest.skipUnless(os.environ.get('OATH_SCRIPT_DB_TESTS') == '1', 'opt-in temporary PostgreSQL clusters')
class PostgreSQLIntegrationTests(unittest.TestCase):
    def test_port_change_never_creates_databases_in_another_cluster(self):
        for name in ('initdb', 'pg_ctl', 'pg_isready', 'psql', 'createdb'):
            if shutil.which(name) is None:
                self.skipTest('Missing PostgreSQL tool: ' + name)
        with tempfile.TemporaryDirectory(prefix='oath database test ') as directory:
            root = Path(directory)
            own, foreign = root / 'own', root / 'foreign'
            own.mkdir()
            foreign.mkdir()
            port_a, port_b = free_port(), free_port()
            while port_b == port_a:
                port_b = free_port()
            clusters = []

            def select(directory, port):
                db.LOCAL, db.DATA, db.LOG, db.PORT = directory, directory / 'postgres', directory / 'postgres.log', port

            with patch.multiple(db, LOCAL=db.LOCAL, DATA=db.DATA, LOG=db.LOG, PORT=db.PORT):
                try:
                    select(own, port_a)
                    clusters.append(db.DATA)
                    db.ensure()
                    db.ensure()
                    original_conf = (db.DATA / 'postgresql.conf').read_bytes()
                    select(foreign, port_b)
                    clusters.append(db.DATA)
                    command = [db._tool('initdb'), '-D', str(db.DATA), '-U', db.USER,
                               '--auth-host=trust', '--encoding=UTF8', '--locale=C']
                    if not db.WINDOWS:
                        command.append('--auth-local=trust')
                    db._run(command, db._environ(), log=foreign / 'initdb.log')
                    db.configure()
                    db._start(db._tool('pg_ctl'), db._tool('pg_isready'), db._environ())
                    select(own, port_b)
                    with self.assertRaisesRegex(SystemExit, 'still running on port'):
                        db.ensure()
                    self.assertEqual((db.DATA / 'postgresql.conf').read_bytes(), original_conf)
                    db.stop()
                    with self.assertRaisesRegex(SystemExit, 'another PostgreSQL instance'):
                        db.ensure()
                    self.assertEqual((db.DATA / 'postgresql.conf').read_bytes(), original_conf)
                    count = db._query(db._tool('psql'),
                                     "SELECT count(*) FROM pg_database WHERE datname IN ('oath','oath_test')",
                                     db._environ())
                    self.assertEqual(count, '0')
                    # Changing the port is supported after the old project instance stops.
                    select(own, free_port())
                    db.ensure()
                    self.assertEqual(db._query(db._tool('psql'), 'SHOW port', db._environ()), db.PORT)
                finally:
                    for data in reversed(clusters):
                        subprocess.run([db._tool('pg_ctl'), '-D', str(data), 'stop', '-m', 'fast'],
                                       capture_output=True)


if __name__ == '__main__':
    unittest.main()
