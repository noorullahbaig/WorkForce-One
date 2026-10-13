# Bundled PDF fonts

Noto Sans Regular and Noto Sans Tamil Regular come from the official
https://github.com/notofonts/noto-fonts repository (`hinted/ttf`).
Noto Sans SC (default regular weight) comes from the official
https://github.com/google/fonts repository (`ofl/notosanssc/NotoSansSC[wght].ttf`).
The Latin/Tamil license is OFL.txt; the Chinese license is OFL-CJK.txt.

These fonts are distributed under the SIL Open Font License 1.1 (OFL.txt).
They provide Latin, Chinese and Tamil glyphs in payroll PDF downloads. The Worker
reads them through its ASSETS binding; generation never calls an external font host.
PDFs subset the fonts to the glyphs used by the document.

The Chinese font is a static weight-400 instance made with fontTools 4.66.1.
Its TrueType glyph data is padded to four-byte boundaries. This is required for
@pdf-lib/fontkit 1.1.1: unpadded glyph data can produce corrupt subset offsets
and Chinese names that remain extractable but disappear when rendered.
The regression test compares every embedded 王美玲 glyph outline with the source.

To rebuild from the upstream variable TTF using fontTools:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
font = instantiateVariableFont(TTFont("NotoSansSC[wght].ttf"), {"wght": 400})
font["glyf"].padding = 4
font.save("NotoSansSC-Regular.ttf")
```
