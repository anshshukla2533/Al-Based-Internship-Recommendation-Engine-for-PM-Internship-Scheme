import os
import re
def strip_js_comments(content):
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'(?<!\:)//.*', '', content)
    return content
def strip_py_comments(content):
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if line.lstrip().startswith('#'):
            continue
        if '
            line = line.split('
        new_lines.append(line)
    return '\n'.join(new_lines)
def clean_dir(directory):
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or '.git' in root or 'dist' in root:
            continue
        for file in files:
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                new_content = content
                if file.endswith(('.js', '.jsx', '.css')):
                    new_content = strip_js_comments(content)
                elif file.endswith('.py'):
                    new_content = strip_py_comments(content)
                new_content = os.linesep.join([s for s in new_content.splitlines() if s.strip() != ""])
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Cleaned {path}")
            except Exception as e:
                pass
if __name__ == '__main__':
    clean_dir('.')