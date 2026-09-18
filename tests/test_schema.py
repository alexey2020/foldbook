import unittest

from foldbook.schema import ContentValidationError, validate_content


class TestValidateContent(unittest.TestCase):
    def test_valid_full_content(self):
        # "8" -> A1, "7" -> A2 (see schema.PAGE_TO_CELL).
        data = {"8": "hello", "7": "world"}
        result = validate_content(data)
        self.assertEqual(result, {"A1": "hello", "A2": "world"})

    def test_missing_keys_are_simply_absent(self):
        result = validate_content({"8": "hello"})
        self.assertNotIn("B1", result)

    def test_null_becomes_empty_string(self):
        result = validate_content({"8": None})
        self.assertEqual(result["A1"], "")

    def test_unknown_key_is_skipped_with_warning(self):
        result = validate_content({"9": "nope", "8": "hi"})
        self.assertNotIn("9", result)
        self.assertEqual(result["A1"], "hi")

    def test_cell_coordinate_keys_are_no_longer_recognized(self):
        # Only page numbers ("1".."8") are valid keys now, not grid
        # coordinates like "A1" — this is the breaking change from moving
        # the public format to page numbers.
        result = validate_content({"A1": "old format"})
        self.assertEqual(result, {})

    def test_non_dict_raises(self):
        with self.assertRaises(ContentValidationError):
            validate_content(["not", "a", "dict"])

    def test_non_string_value_raises(self):
        with self.assertRaises(ContentValidationError):
            validate_content({"8": 123})


if __name__ == "__main__":
    unittest.main()
