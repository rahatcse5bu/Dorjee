const dlg = h => h.page.locator('[role=dialog]');
const field = (h, label) => dlg(h).locator('label').filter({ has: h.page.locator('span', { hasText: new RegExp('^' + label + '$') }) }).locator('input');
const yesNo = (h, label, answer) => dlg(h).getByRole('radiogroup', { name: label }).getByRole('radio', { name: answer });
async function retype(h, loc, text) {
  await h.click(loc);
  await loc.press('ControlOrMeta+a');
  await loc.pressSequentially(text, { delay: 120 });
}

export default {
  steps: [
    {
      card: { kick: 'দর্জি · টিউটোরিয়াল', title: 'অর্ডার নেওয়া ও কারিগরকে দায়িত্ব দেওয়া', sub: 'কাস্টমার থেকে অগ্রিম পর্যন্ত — এক ফর্মেই পুরো অর্ডার', steps: 'কাস্টমার|পোশাক ও মাপ|দাম|দায়িত্ব|অগ্রিম' },
      say: 'এই ভিডিওতে দেখবেন, কীভাবে নতুন অর্ডার নেবেন, আর সেই অর্ডারের কাজ একজন কারিগরকে বুঝিয়ে দেবেন।',
      pad: 1.2,
    },
    {
      before: h => h.goto('/orders'),
      label: 'নতুন অর্ডার',
      say: 'অর্ডার পাতায় এসে উপরের নতুন অর্ডার বোতামে চাপ দিন।',
      act: async h => { await h.sleep(900); await h.click(h.page.getByRole('button', { name: 'নতুন অর্ডার' }).first()); },
    },
    {
      label: 'কাস্টমার বাছুন',
      say: 'কাস্টমারের নাম বা ফোন নম্বর লিখে খুঁজুন, তারপর তালিকা থেকে বাছাই করুন। নতুন কাস্টমার হলে এখান থেকেই যোগ করা যায়।',
      act: async h => {
        await h.type(dlg(h).getByPlaceholder('নাম বা ফোন দিয়ে খুঁজুন…'), 'করিম', 160);
        await h.sleep(900);
        await h.click(dlg(h).getByRole('button', { name: /করিম হোসেন/ }));
      },
    },
    {
      label: 'পোশাক বাছুন',
      say: 'এবার পোশাকের ধরন বাছাই করুন। আমরা পাঞ্জাবি নিচ্ছি। সাথে সাথে পাঞ্জাবির সব মাপের ঘর চলে আসবে।',
      act: async h => { await h.sleep(1200); await h.click(dlg(h).getByRole('button', { name: 'পাঞ্জাবি', exact: true })); },
    },
    {
      label: 'মাপ দিন',
      say: 'একে একে মাপগুলো লিখুন। আর হ্যাঁ / না মাপগুলোতে শুধু একটা চাপ দিন — যেমন ফুল হাতা হ্যাঁ, বোতাম হ্যাঁ, আর কটি না।',
      act: async h => {
        for (const [l, v] of [['লম্বা', '42'], ['বুক', '38'], ['কাঁধ', '18'], ['গলা', '15']]) await h.type(field(h, l), v, 160);
        await h.click(yesNo(h, 'ফুল হাতা', 'হ্যাঁ'));
        await h.click(yesNo(h, 'বোতাম', 'হ্যাঁ'));
        await h.click(yesNo(h, 'কটি', 'না'));
      },
    },
    {
      label: 'দাম ও সংখ্যা',
      say: 'পোশাকের দাম আর কয়টি বানাতে হবে তা লিখুন। একাধিক পোশাক থাকলে পোশাক যোগ করুন বোতাম দিয়ে আরও আইটেম যোগ করতে পারবেন।',
      act: async h => {
        await h.type(dlg(h).getByPlaceholder('দাম (৳)'), '1200', 160);
        await retype(h, dlg(h).getByPlaceholder('সংখ্যা'), '2');
        await h.sleep(800);
        await h.ring(dlg(h).getByRole('button', { name: 'পোশাক যোগ করুন' }), 1500);
      },
    },
    {
      label: 'ডেলিভারি ও দায়িত্ব',
      say: 'ডান পাশে ডেলিভারির তারিখ ঠিক করুন। তারপর দায়িত্ব দিন ঘর থেকে কারিগর বাছাই করুন। আমরা সেলিম মিয়াকে দায়িত্ব দিচ্ছি।',
      act: async h => {
        await h.ring(dlg(h).locator('input[type=date]'), 2200);
        await h.sleep(1200);
        await h.select(dlg(h).getByRole('combobox', { name: 'দায়িত্ব দিন' }), 'সেলিম মিয়া');
        await h.ring(dlg(h).getByRole('combobox', { name: 'দায়িত্ব দিন' }), 1200);
      },
    },
    {
      label: 'অগ্রিম',
      say: 'কাস্টমার অগ্রিম দিলে টাকার পরিমাণ লিখুন, আর কোন মাধ্যমে দিয়েছেন তা বাছাই করুন। বকেয়া নিজে থেকেই হিসাব হয়ে যাবে।',
      act: async h => {
        const adv = dlg(h).locator('label', { hasText: 'অগ্রিম' }).locator('input');
        await h.type(adv.first(), '1000', 160);
        await h.select(dlg(h).locator('select').last(), 'বিকাশ');
        await h.ring(dlg(h).getByText('বকেয়া', { exact: true }).locator('xpath=..'), 2200);
      },
    },
    {
      label: 'অর্ডার তৈরি',
      say: 'সব ঠিক থাকলে অর্ডার তৈরি করুন বোতামে চাপ দিন।',
      act: async h => { await h.sleep(500); await h.click(dlg(h).getByRole('button', { name: 'অর্ডার তৈরি করুন' })); },
    },
    {
      label: 'অর্ডারের বিবরণ',
      say: 'অর্ডার তৈরি হয়ে গেছে। এখানে মাপ, দায়িত্বপ্রাপ্ত কারিগর, পেমেন্ট আর বকেয়া — সব একসাথে দেখা যায়। সেলিম মিয়াও নিজের অ্যাকাউন্টে এই অর্ডারটি দেখতে পাবেন।',
      act: async h => {
        await h.page.waitForURL(/\/orders\/[a-f0-9]+/, { timeout: 15000 });
        await h.sleep(1500);
        await h.ring(h.page.getByText('ফুল হাতা').first().locator('xpath=../..'), 3000);
        await h.ring(h.page.getByRole('combobox', { name: 'দায়িত্ব দিন' }).first(), 2500).catch(() => {});
      },
      pad: 1.0,
    },
    {
      card: { kick: 'দর্জি', title: 'অর্ডার নেওয়া এখন আরও সহজ', sub: 'মাপ থেকে ডেলিভারি, সবকিছু এক অ্যাপে' },
      say: 'ধন্যবাদ! দর্জি দিয়ে আপনার দোকান চালান আরও সহজে।',
      pad: 1.5,
    },
  ],
};
