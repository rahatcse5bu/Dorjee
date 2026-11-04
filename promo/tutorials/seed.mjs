import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync('tut/state.json', 'utf8'));
const ls = Object.fromEntries(s.origins[0].localStorage.map(kv => [kv.name, kv.value]));
const token = ls.dorjee_shop_token, shopId = JSON.parse(ls.dorjee_shop_user).shopId;
const api = async (method, path, body) => {
  const r = await fetch('http://localhost:4100/api' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body && JSON.stringify(body) });
  const j = await r.text(); if (!r.ok) throw new Error(method + path + ' ' + r.status + ' ' + j); return JSON.parse(j || 'null');
};
if (process.argv[2] === 'show') { console.log(JSON.stringify(await api('GET', `/shops/${shopId}/catalog`))); process.exit(0); }
await api('PUT', `/shops/${shopId}/catalog/cloth-types`, {
  clothTypes: ['শার্ট', 'প্যান্ট'],
  clothTypeMeasurements: { 'শার্ট': ['লম্বা', 'বুক', 'কাঁধ', 'হাতার লম্বা', 'কলার'], 'প্যান্ট': ['লম্বা', 'কোমর', 'হিপ', 'মুহুরি'] },
  booleanMeasurements: [],
});
await api('POST', `/shops/${shopId}/customers`, { name: 'করিম হোসেন', phone: '01812345678' });
console.log(JSON.stringify(await api('GET', `/shops/${shopId}/catalog`)));
