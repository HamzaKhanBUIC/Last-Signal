/**
 * Dev server path resolution: only the game's public files are served.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { resolveStaticPath } from '../server.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function runServerTests(describe, test, expect) {
  describe('Dev Server: resolveStaticPath', () => {
    test('maps / to index.html', () => {
      expect(resolveStaticPath('/', ROOT)).toBe(path.join(ROOT, 'index.html'));
    });

    test('serves game files under src/ and the stylesheet, ignoring query strings', () => {
      expect(resolveStaticPath('/src/main.js', ROOT)).toBe(path.join(ROOT, 'src', 'main.js'));
      expect(resolveStaticPath('/style.css?v=2', ROOT)).toBe(path.join(ROOT, 'style.css'));
    });

    test('rejects ../ traversal, including percent-encoded and backslash forms', () => {
      for (const url of [
        '/../package.json',
        '/../../ls-test.log',
        '/src/../../server.js',
        '/%2e%2e/%2e%2e/secret.txt',
        '/src/..%2f..%2f..%2fsecret.txt',
        '/src/..\..\secret.txt',
        '/src/%5c..%5c..%5csecret.txt',
      ]) {
        expect(resolveStaticPath(url, ROOT)).toBeNull();
      }
    });

    test('does not expose repo files outside the public allowlist', () => {
      for (const url of ['/.git/config', '/src/../.git/config', '/package.json', '/server.js', '/node_modules/three/package.json', '/tests/test-runner.js', '/docs/']) {
        expect(resolveStaticPath(url, ROOT)).toBeNull();
      }
    });

    test('rejects dotfiles, NUL bytes and malformed encodings', () => {
      expect(resolveStaticPath('/src/.env', ROOT)).toBeNull();
      expect(resolveStaticPath('/src/main.js%00.png', ROOT)).toBeNull();
      expect(resolveStaticPath('/src/%E0%A4%A', ROOT)).toBeNull();
    });
  });
}
