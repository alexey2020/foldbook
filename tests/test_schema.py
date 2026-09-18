import unittest

from foldbook.schema import ContentValidationError, validate_content


class TestValidateContent(unittest.TestCase):
    def test_valid_full_content(self):
        data = {"A1": "hello", "A2": "world"}
        result = validate_content(data)
        self.assertEqual(result, {"A1": "hello", "A2": "world"})

    def test_missing_keys_are_simply_absent(self):
        result = validate_content({"A1": "hello"})
        self.assertNotIn("B1", result)

    def test_null_becomes_empty_string(self):
        result = validate_content({"A1": None})
        self.assertEqual(result["A1"], "")

    def test_unknown_key_is_skipped_with_warning(self):
        result = validate_content({"E1": "nope", "A1": "hi"})
        self.assertNotIn("E1", result)
        self.assertEqual(result["A1"], "hi")

    def test_non_dict_raises(self):
        with self.assertRaises(ContentValidationError):
            validate_content(["not", "a", "dict"])

    def test_non_string_value_raises(self):
        with self.assertRaises(ContentValidationError):
            validate_content({"A1": 123})


if __name__ == "__main__":
    unittest.main()
