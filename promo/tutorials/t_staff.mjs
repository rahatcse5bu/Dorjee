export default {
  steps: [
    {
      card: { kick: 'দর্জি · টিউটোরিয়াল', title: 'কর্মী যোগ করবেন যেভাবে', sub: 'দর্জি, কর্মচারী, ম্যানেজার বা হিসাবরক্ষক — সবাইকে টিমে আনুন', steps: 'কর্মী পাতা|তথ্য দিন|পদ বাছুন|সংরক্ষণ' },
      say: 'এই ভিডিওতে দেখবেন, দর্জি অ্যাপে কীভাবে আপনার দোকানে নতুন কর্মী যোগ করবেন।',
      pad: 1.2,
    },
    {
      before: h => h.goto('/dashboard'),
      label: 'কর্মী পাতা',
      say: 'প্রথমে বাঁ পাশের মেনু থেকে কর্মী অপশনে যান। এখানে আপনার দোকানের সব কর্মীর তালিকা থাকে।',
      act: async h => { await h.sleep(1200); await h.click(h.page.getByRole('link', { name: 'কর্মী', exact: true }).first()); },
    },
    {
      label: 'কর্মী যোগ করুন',
      say: 'এবার উপরের কর্মী যোগ করুন বোতামে চাপ দিন।',
      act: async h => { await h.sleep(400); await h.click(h.page.getByRole('button', { name: 'কর্মী যোগ করুন' }).first()); },
    },
    {
      label: 'তথ্য দিন',
      say: 'কর্মীর নাম, ফোন নম্বর আর ইমেইল লিখুন। এই ইমেইল দিয়েই কর্মী অ্যাপে লগইন করবেন।',
      act: async h => {
        const d = h.page.locator('[role=dialog]');
        await h.type(d.locator('input').nth(0), 'সেলিম মিয়া', 110);
        await h.type(d.locator('input').nth(1), '01911223344', 70);
        await h.type(d.locator('input[type=email]'), 'selim@rahman.demo', 55);
      },
    },
    {
      label: 'পদ বাছুন',
      say: 'এরপর কর্মীর পদ বাছাই করুন। দর্জি নিজের অর্ডার দেখে ও আপডেট করে। কর্মচারী অর্ডার ও পেমেন্ট নেয়। ম্যানেজার প্রায় সবকিছু সামলায়। আর হিসাবরক্ষক দেখে পেমেন্ট ও বকেয়া। আমরা দর্জি বাছাই করছি।',
      act: async h => {
        const d = h.page.locator('[role=dialog]');
        const role = n => d.locator('label').filter({ hasText: n }).first();
        await h.sleep(1500);
        await h.ring(role('দর্জি'), 1700);
        await h.ring(role('কর্মচারী'), 1500);
        await h.ring(role('ম্যানেজার'), 1500);
        await h.ring(role('হিসাবরক্ষক'), 1800);
        await h.click(role('দর্জি'));
      },
    },
    {
      label: 'পাসওয়ার্ড ও সংরক্ষণ',
      say: 'কর্মীর জন্য কমপক্ষে ছয় অক্ষরের একটি পাসওয়ার্ড দিন। তারপর সংরক্ষণ বোতামে চাপ দিন।',
      act: async h => {
        const d = h.page.locator('[role=dialog]');
        await h.type(d.locator('input[type=password]'), 'selim123', 110);
        await h.sleep(600);
        await h.click(d.getByRole('button', { name: 'সংরক্ষণ' }));
      },
    },
    {
      label: 'সম্পন্ন',
      say: 'ব্যস! নতুন কর্মী তালিকায় যুক্ত হয়ে গেছে। এখন তিনি নিজের ইমেইল আর পাসওয়ার্ড দিয়ে লগইন করতে পারবেন, আর আপনি তাকে অর্ডারের দায়িত্ব দিতে পারবেন।',
      act: async h => {
        await h.sleep(1200);
        await h.ring(h.page.getByText('সেলিম মিয়া').first(), 3500);
      },
    },
    {
      label: 'পদ ও অনুমতি',
      say: 'চাইলে পদ ও অনুমতি ট্যাব থেকে প্রতিটি পদের অনুমতিও নিজের মতো বদলে নিতে পারবেন।',
      act: async h => { await h.sleep(500); await h.click(h.page.getByText('পদ ও অনুমতি', { exact: true }).first()); },
      pad: 1.0,
    },
    {
      card: { kick: 'দর্জি', title: 'আপনার টিম এখন প্রস্তুত', sub: 'পরের ভিডিও: পোশাকের ধরন ও মাপ যোগ করা' },
      say: 'ধন্যবাদ! পরের ভিডিওতে দেখবেন, কীভাবে পোশাকের ধরন আর মাপ যোগ করবেন।',
      pad: 1.5,
    },
  ],
};
