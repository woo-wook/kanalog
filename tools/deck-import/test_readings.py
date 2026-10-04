"""Synthetic source markup only; never include imported deck contents."""
import unittest
from convert_max import ruby_segments, grammar_ruby, rendered_examples

class ReadingsTest(unittest.TestCase):
    def test_keeps_base_and_exact_reading(self):
        self.assertEqual(ruby_segments('私の<ruby><rb>本</rb><rt>ほん</rt></ruby>。'), [{'text':'私の'}, {'text':'本','reading':'ほん'}, {'text':'。'}])
    def test_sanitizer_never_runs_scripts_or_exposes_rt_as_base(self):
        self.assertEqual(ruby_segments('<script>evil()</script><ruby><rb>本</rb><rt>ほん</rt></ruby><img onerror="evil()">'), [{'text':'本','reading':'ほん'}])
        self.assertIsNone(ruby_segments('<ruby>本<rt><script>evil()</script></rt></ruby>'))
        self.assertIsNone(ruby_segments('<ruby>本<rt>ほん</rt>'))
    def test_grammar_ruby_requires_exact_prompt(self):
        fields={'BackHTML':'<div class="_j4u"><mark>この</mark><ruby>本<rt>ほん</rt></ruby>。</div>'}
        self.assertEqual(grammar_ruby(fields,'この本。')[-2], {'text':'本','reading':'ほん'})
        self.assertIsNone(grammar_ruby(fields,'別の本。'))
    def test_preserves_normalized_spaces(self):
        self.assertEqual(ruby_segments('  <div>あ <ruby>本<rt>ほん</rt></ruby> </div>  ')[0]['text'],'あ ')

if __name__ == '__main__': unittest.main()
