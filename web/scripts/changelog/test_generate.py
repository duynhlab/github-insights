import unittest
from html.parser import HTMLParser

from generate import build


class Ids(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []

    def handle_starttag(self, tag, attrs):
        value = dict(attrs).get('id')
        if value:
            self.ids.append(value)


class ChangelogTest(unittest.TestCase):
    def test_release_content_and_unique_anchors(self):
        page = build('''## [Unreleased]
### Feature
- [guide](docs/guide.md), [root](/docs/a.md), and [section](#migration-guide) with **formatting**
## [1.0.0] - 2026-01-01
- <script>alert(1)</script>
## [1.0.0] - 2025-01-01
- Old release
## Migration Guide
See the guide.
''')
        parser = Ids()
        parser.feed(page)
        self.assertEqual(len(parser.ids), len(set(parser.ids)))
        self.assertIn('v1.0.0-2025-01-01', parser.ids)
        self.assertIn('2 releases · latest: 1.0.0', page)
        self.assertIn('https://github.com/duynhlab/homelab/blob/main/docs/guide.md', page)
        self.assertIn('https://github.com/duynhlab/homelab/blob/main/docs/a.md', page)
        self.assertIn('https://github.com/duynhlab/homelab/blob/main/CHANGELOG.md#migration-guide', page)
        self.assertIn('<strong>formatting</strong>', page)
        self.assertNotIn('<script>alert(1)</script>', page)
        self.assertIn('Migration Guide', page)

    def test_missing_releases_fail(self):
        with self.assertRaises(ValueError):
            build('# Changelog\nNo releases yet.')


if __name__ == '__main__':
    unittest.main()
