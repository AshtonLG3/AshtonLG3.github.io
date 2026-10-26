import unittest
from prepare_hosting import BEGIN, END, RULES, merge_rules


class HostingRulesTests(unittest.TestCase):
    def test_preserves_existing_config_bytes(self):
        old = b"# provider rules\r\n<Files secret>\r\nRequire all denied\r\n</Files>"
        self.assertEqual(merge_rules(old), RULES + old)

    def test_repeated_deploy_is_identical(self):
        old = b"# PHP handler\nAddHandler application/x-httpd-php .php\n"
        merged = merge_rules(old)
        self.assertEqual(merge_rules(merged), merged)

    def test_replaces_managed_block_only(self):
        old = BEGIN + b"\nold rules\n" + END + b"\n# retained\n"
        self.assertEqual(merge_rules(old), RULES + b"# retained\n")

    def test_fails_closed_on_incomplete_block(self):
        with self.assertRaises(ValueError):
            merge_rules(BEGIN + b"\nmissing end")


if __name__ == "__main__":
    unittest.main()
