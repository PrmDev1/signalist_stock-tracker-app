const dns = require('node:dns');
const mongoose = require('mongoose');

dns.setServers(['1.1.1.1', '8.8.8.8']);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });

  const portfolioSchema = new mongoose.Schema({}, { strict: false, collection: 'portfolios' });
  const Portfolio = mongoose.models.DebugPortfolio || mongoose.model('DebugPortfolio', portfolioSchema);

  const docs = await Portfolio.find({ mvoId: { $exists: true, $ne: null } })
    .sort({ updatedAt: -1 })
    .limit(8)
    .lean();

  if (!docs.length) {
    console.log('NO_PORTFOLIO');
    return;
  }

  for (const doc of docs) {
    console.log('PORTFOLIO', JSON.stringify({
      id: String(doc._id),
      name: doc.name,
      mvoId: doc.mvoId,
      initialCapital: doc.initialCapital,
      allocations: Object.keys(doc.allocations || {}),
    }));

    const url = new URL(
      `${process.env.NEXT_PUBLIC_CLOUDFLARE_BASE_URL}/api/v1/portfolio/allocation/${encodeURIComponent(doc.mvoId)}`
    );
    url.searchParams.set('initialCapital', String(Math.max(1, Number(doc.initialCapital || 10000))));
    url.searchParams.set('brokerMinOrder', '5');

    const res = await fetch(url, {
      headers: {
        'API-KEY': process.env.NEXT_PUBLIC_CLOUDFLARE_API_KEY,
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text.slice(0, 2000));

    if (res.ok) {
      break;
    }
  }

  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
