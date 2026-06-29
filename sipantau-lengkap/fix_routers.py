import glob

for f in glob.glob('routers/*.py'):
    content = open(f, encoding='utf-8').read()
    new = content.replace(
        'import sqlite3 as _sq3; conn.row_factory = _sq3.Row; cur = conn.cursor()',
        'cur = conn.cursor()'
    )
    if new != content:
        open(f, 'w', encoding='utf-8').write(new)
        print('Cleaned:', f)
    else:
        print('No change:', f)
