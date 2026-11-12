import { chromium } from '@playwright/test';
const WEB = 'http://localhost:3000';
const CLERK = 'https://api.clerk.com/v1';
const SECRET = 'sk_test_oH7uHCXGIt1Fbl7KzSMp95qo24sFjM1Rbsum1b7jAp';
const UID = 'user_3LrC94yrr3qS2XPXRJ17POYop2i';
const PAGES = ['dashboard', 'coaches', 'tickets', 'plans', 'settings'];

async function freshToken() {
  const s = await fetch(CLERK + '/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: UID }) }).then(r => r.json());
  const t = await fetch(CLERK + '/sessions/' + s.id + '/tokens', { method: 'POST', headers: { Authorization: 'Bearer ' + SECRET, 'Content-Type': 'application/json' } }).then(r => r.json());
  return { jwt: t.jwt, iat: JSON.parse(Buffer.from(t.jwt.split('.')[1], 'base64url').toString()).iat };
}

const b = await chromium.launch();

// Harvest Clerk's dev-browser cookies from a signed-out visit.
const seed = await b.newContext();
const sp = await seed.newPage();
await sp.goto(WEB + '/sign-in', { waitUntil: 'domcontentloaded' });
await sp.waitForTimeout(3500);
const devCookies = (await seed.cookies()).filter(c => c.name.startsWith('__clerk_db_jwt') || c.name.startsWith('__client_uat'));
await seed.close();
console.log('harvested:', devCookies.map(c => c.name).join(','));

for (const name of PAGES) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addCookies(devCookies);
  const p = await c.newPage();
  const { jwt, iat } = await freshToken();
  await c.addCookies([
    { name: '__session', value: jwt, url: WEB },
    { name: '__client_uat', value: String(iat), url: WEB },
  ]);
  await p.goto(WEB + '/admin/' + name, { waitUntil: 'domcontentloaded' });
  let txt = '';
  for (let i = 0; i < 10; i++) {
    await p.waitForTimeout(2000);
    txt = (await p.locator('body').innerText()).trim();
    if (txt.length > 60) break;
  }
  await p.screenshot({ path: `/tmp/admin-shots/${name}.png` });
  console.log(name, '| url=', p.url().replace(WEB, ''), '| bodyLen=', txt.length, '|', txt.slice(0, 60).replace(/\n/g, ' / '));
  await c.close();
}
await b.close();
