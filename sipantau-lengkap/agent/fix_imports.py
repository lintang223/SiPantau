import os, re

scraper_dir = os.path.join(os.path.dirname(__file__), 'scraper')

local_mods = ['config', 'utils', 'browser_manager', 'proxy_manager', 'excel_writer', 'scraper_core']

files = [f for f in os.listdir(scraper_dir) if f.endswith('.py') and f != '__init__.py']

for fname in files:
    fpath = os.path.join(scraper_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for mod in local_mods:
        content = re.sub(rf'^from {mod} import', f'from scraper.{mod} import', content, flags=re.MULTILINE)
        content = re.sub(rf'^import {mod}$', f'import scraper.{mod} as {mod}', content, flags=re.MULTILINE)
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {fname}')
    else:
        print(f'No change: {fname}')

print('Done.')
