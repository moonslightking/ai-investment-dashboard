// Vercel Serverless Function: /api/quote
// 代理新浪财经行情接口，绕过 CORS/Forbidden 限制
// 用法: GET /api/quote?codes=hk01860,sz301071

export default async function handler(req, res) {
  const { codes } = req.query;
  if (!codes) {
    return res.status(400).json({ error: 'codes param required' });
  }

  try {
    const response = await fetch(`https://hq.sinajs.cn/list=${codes}`, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      }
    });

    const buffer = await response.arrayBuffer();
    // 新浪返回 GB18030 编码，转为 UTF-8
    const decoder = new TextDecoder('gb18030');
    const text = decoder.decode(buffer);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
