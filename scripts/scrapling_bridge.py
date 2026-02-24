import json
import re
import sys
import urllib.request

url = sys.argv[1] if len(sys.argv) > 1 else ''
text = ''
source = 'fallback'

if url:
    try:
        from bs4 import BeautifulSoup  # type: ignore
    except Exception:  # noqa
        BeautifulSoup = None

    try:
        # Best effort: try Scrapling API if installed.
        from scrapling import Scraper  # type: ignore

        source = 'scrapling'
        scraper = Scraper(url)
        text = getattr(scraper, 'text', None) or getattr(scraper, 'content', '') or ''
    except Exception:
        try:
            with urllib.request.urlopen(url, timeout=15) as response:
                raw = response.read().decode('utf-8', errors='ignore')
                if BeautifulSoup is not None:
                    soup = BeautifulSoup(raw, 'html.parser')
                    for tag in soup(['script', 'style', 'svg', 'img', 'link', 'meta', 'noscript']):
                        tag.extract()
                    text = soup.get_text('\n').replace('\r', '')
                else:
                    clean = re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=re.S)
                    clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.S)
                    text = re.sub(r'<[^>]+>', ' ', clean)
            text = re.sub(r'\n{3,}', '\n\n', text).strip()
        except Exception:
            text = ''


print(json.dumps({
    'url': url,
    'source': source,
    'text': text[:4000]
}))
