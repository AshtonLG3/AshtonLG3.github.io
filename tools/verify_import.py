from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from PIL import Image
import json,re,subprocess,xml.etree.ElementTree as ET
root=Path.cwd(); errors=[]; n=0
class Parser(HTMLParser):
 def handle_starttag(self,tag,attrs):
  global n
  a=dict(attrs)
  if tag=='img' and not a.get('alt'): errors.append(f'{self.path}: missing alt')
  for key in ['src','href','poster','srcset']:
   val=a.get(key,'').split(' ')[0]
   if not val or val.startswith(('#','data:','http:','https:','tel:','mailto:','javascript:')): continue
   target=(root/unquote(urlsplit(val).path).lstrip('/')) if val.startswith('/') else (self.path.parent/unquote(urlsplit(val).path))
   if val.endswith('/'): target=target/'index.html'
   if not target.exists(): errors.append(f'{self.path}: missing {val}')
   n+=1
for p in root.rglob('*.html'):
 if 'tools' in p.parts or '.git' in p.parts: continue
 txt=p.read_text(encoding='utf-8'); parser=Parser(); parser.path=p; parser.feed(txt)
 assert '2026.10.26.1' in txt,p
 assert 'data-site-version' in txt and 'toggleTheme' in txt,p
 for schema in re.findall(r'<script type="application/ld\+json">(.*?)</script>',txt,re.S): json.loads(schema)
photos=list(root.glob('white-blue-gold-two-tier-celebration-cake-*.jpg'))+list(root.glob('colourful-graduation-cake-*.jpg')); assert len(photos)==11
for p in photos: Image.open(p).verify(); Image.open(p.with_suffix('.webp')).verify()
vids=list(root.glob('*-cake-video-*.mp4')); assert len(vids)==3
for p in vids:
 info=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(p)],text=True))
 assert any(s['codec_type']=='video' and s['codec_name']=='h264' for s in info['streams']),p
 data=p.read_bytes(); assert data.find(b'moov')<data.find(b'mdat'),p
 print(p.name,info['format']['duration']+' seconds')
ET.parse(root/'sitemap.xml')
assert not errors,'\n'.join(errors)
print(f'PASS: {n} local references; all published pages have version and themes; 11 photo pairs and 3 H.264 fast-start videos; JSON-LD and sitemap valid.')
