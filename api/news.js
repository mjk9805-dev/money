export default async function handler(req, res) {
  try {
    const limit = Math.max(1, Math.min(10, Number(req.query.limit || 5)));

    const [mkHomeHtml, mkRssXml, hkRssXml] = await Promise.all([
      fetchText('https://www.mk.co.kr/'),
      fetchText('https://www.mk.co.kr/rss/30100041/'),
      fetchText('https://www.hankyung.com/feed/economy')
    ]);

    const mkPopular = parseMkPopular(mkHomeHtml);
    const mkItems = parseRssItems(mkRssXml).map(item => {
      const hit = mkPopular.find(p => normalize(p.title) === normalize(item.title));
      return {
        source: '매일경제',
        kind: hit ? '공개 인기기사 + 경제 RSS' : '경제 RSS',
        rank: hit ? hit.rank : null,
        score: hit ? 100 - hit.rank : 20,
        title: item.title,
        link: item.link,
        published: item.pubDate,
        summary: summarize(item.title, '매일경제')
      };
    });

    const hkItems = parseRssItems(hkRssXml).map((item, idx) => ({
      source: '한국경제',
      kind: '경제 RSS',
      rank: null,
      score: 10 - idx,
      title: item.title,
      link: item.link,
      published: item.pubDate,
      summary: summarize(item.title, '한국경제')
    }));

    const items = [...mkItems, ...hkItems]
      .filter(item => item.title && item.link)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json({
      updatedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      items
    });
  } catch (error) {
    res.status(500).json({ error: 'failed_to_fetch_news', message: error.message });
  }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; EconNewsBriefing/1.0)'
    }
  });
  if (!res.ok) throw new Error(`fetch failed: ${url}`);
  return await res.text();
}

function decodeHtml(str = '') {
  return str
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function stripTags(str = '') {
  return decodeHtml(str.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseRssItems(xml = '') {
  const matches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)];
  return matches.map(m => {
    const block = m[0];
    return {
      title: stripTags(extract(block, 'title')),
      link: stripTags(extract(block, 'link')),
      pubDate: stripTags(extract(block, 'pubDate'))
    };
  });
}

function extract(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1] : '';
}

function normalize(text = '') {
  return text.replace(/\s+/g, '').replace(/[“”"'‘’…·,.\[\]\(\)]/g, '').trim();
}

function parseMkPopular(html = '') {
  const results = [];
  const lines = html.split('\n');
  let inTop = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.includes('TOP10 NEWS')) {
      inTop = true;
      continue;
    }
    if (inTop && results.length < 10) {
      const m = line.match(/【(\d+)†\s*(\d+)\s+(.+?)\s*】/);
      if (m) {
        const linkId = m[1];
        const rank = Number(m[2]);
        const title = stripTags(m[3]);
        const link = `https://www.mk.co.kr/`;// fallback
        results.push({ rank, title, linkId, link });
      }
    }
    if (results.length >= 10) break;
  }
  return results;
}

function summarize(title, source) {
  const cleaned = title.replace(/\s+/g, ' ').trim();
  if (source === '매일경제') {
    return `${cleaned} 관련 이슈를 빠르게 파악할 수 있도록 핵심 경제 맥락만 짧게 정리한 요약입니다.`;
  }
  return `${cleaned} 내용을 중심으로 시장·기업·가계에 미칠 영향만 짧게 확인할 수 있게 정리한 요약입니다.`;
}
