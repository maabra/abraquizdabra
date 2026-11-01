import contextlib
import importlib.util
import io
import json
import sqlite3
import sys
from pathlib import Path

local_packages = Path('.qa/python-packages').resolve()
if local_packages.is_dir():
    # A dependency installed by an elevated process can be unreadable to a
    # normal test run. Do not let it shadow accessible system dependencies.
    try:
        with (local_packages / 'sqlalchemy' / '__init__.py').open('rb') as probe:
            probe.read(1)
        sys.path.insert(0, str(local_packages))
    except OSError:
        pass

cases = json.load(sys.stdin)
results = []
for case in cases:
    status = 'passed'
    detail = ''
    try:
        if case['runtime'] == 'sql':
            conn = sqlite3.connect(':memory:')
            value = conn.execute(case['code']).fetchone()[0]
            conn.close()
        else:
            required = {'numpy': ['numpy'], 'opencv': ['cv2', 'numpy'],
                        'fastapi': ['fastapi', 'httpx'], 'sqlalchemy': ['sqlalchemy']}.get(case['topic'], [])
            missing = [module for module in required if importlib.util.find_spec(module) is None]
            if missing:
                status = 'unavailable'
                detail = 'Missing local runtime dependency: ' + ', '.join(missing)
                results.append(dict(id=case['id'], status=status, detail=detail))
                continue
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exec(compile(case['code'], '<quiz-validation>', 'exec'), {})
            value = float(output.getvalue().strip())
        if value != case['expected']:
            status = 'failed'
            detail = f"Expected {case['expected']}, got {value}"
    except PermissionError as exc:
        status = 'unavailable'
        detail = 'Local runtime dependency could not be read: ' + str(exc)
    except Exception as exc:
        status = 'failed'
        detail = str(exc)
    results.append(dict(id=case['id'], status=status, detail=detail))
json.dump(results, sys.stdout)
