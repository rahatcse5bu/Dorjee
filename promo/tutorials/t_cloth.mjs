const card = h => h.page.locator('h2', { hasText: 'পাঞ্জাবি' }).locator('xpath=../..');

export default {
  steps: [
    {
      card: { kick: 'দর্জি · টিউটোরিয়াল', title: 'পোশাকের ধরন ও মাপ যোগ করবেন যেভাবে', sub: 'প্রতিটি পোশাকের জন্য নিজের মাপের তালিকা — সংখ্যা আর হ্যাঁ / না দুটোই', steps: 'পোশাকের ধরন|সংখ্যার মাপ|হ্যাঁ / না মাপ|সংরক্ষণ' },
      say: 'এই ভিডিওতে দেখবেন, কীভাবে নতুন পোশাকের ধরন যোগ করবেন, আর প্রতিটি পোশাকের জন্য কোন কোন মাপ নেবেন তা ঠিক করবেন।',
      pad: 1.2,
    },
    {
      before: h => h.goto('/dashboard'),
      label: 'পোশাকের ধরন পাতা',
      say: 'বাঁ পাশের মেনু থেকে পোশাকের ধরন অপশনে যান। এখানে আপনার দোকানের সব পোশাক আর তাদের মাপ দেখা যায়।',
      act: async h => { await h.sleep(1200); await h.click(h.page.getByRole('link', { name: 'পোশাকের ধরন' }).first()); },
    },
    {
      label: 'নতুন পোশাক',
      say: 'নতুন পোশাক যোগ করতে উপরের ঘরে নাম লিখুন, যেমন পাঞ্জাবি। তারপর যোগ করুন বোতামে চাপ দিন।',
      act: async h => {
        await h.sleep(800);
        await h.type(h.page.getByPlaceholder(/যেমন: পাঞ্জাবি/), 'পাঞ্জাবি', 140);
        await h.click(h.page.getByRole('button', { name: 'যোগ করুন' }).first());
        await h.sleep(300);
        await h.moveTo(card(h).locator('h2'));
      },
    },
    {
      label: 'সংখ্যার মাপ',
      say: 'এবার পাঞ্জাবির জন্য মাপ যোগ করুন। অন্য পোশাকে আগে থেকে থাকা মাপ নিচের সাজেশন থেকে এক চাপেই যোগ হয়ে যায়। নতুন মাপ হলে নাম লিখে যোগ করুন চাপুন।',
      act: async h => {
        const c = card(h);
        await h.sleep(1500);
        for (const name of ['লম্বা', 'বুক', 'কাঁধ']) await h.click(c.getByRole('button', { name, exact: true }));
        await h.type(c.getByPlaceholder(/মাপ যোগ করুন/), 'গলা', 150);
        await h.click(c.getByRole('button', { name: 'যোগ করুন' }));
      },
    },
    {
      label: 'হ্যাঁ / না মাপ',
      say: 'কিছু জিনিস মাপা হয় না, শুধু হ্যাঁ বা না — যেমন ফুল হাতা হবে কিনা, বোতাম থাকবে কিনা, কটি লাগবে কিনা। এর জন্য প্রথমে হ্যাঁ / না বাছাই করুন, তারপর নাম লিখে যোগ করুন।',
      act: async h => {
        const c = card(h);
        await h.sleep(5500);
        await h.click(c.getByRole('radio', { name: 'হ্যাঁ / না' }));
        for (const name of ['ফুল হাতা', 'বোতাম', 'কটি']) {
          await h.type(c.getByPlaceholder(/মাপ যোগ করুন/), name, 120);
          await h.click(c.getByRole('button', { name: 'যোগ করুন' }));
        }
      },
    },
    {
      label: 'মাপের ধরন বদলানো',
      say: 'হলুদ চিপগুলো হ্যাঁ / না মাপ, আর সবুজগুলো সংখ্যার মাপ। কোনো মাপের ধরন বদলাতে চাইলে চিপের আইকনে চাপ দিলেই হবে।',
      act: async h => {
        const c = card(h);
        await h.ring(c.locator('span', { hasText: /^ফুল হাতা/ }).first(), 1800);
        await h.ring(c.locator('span', { hasText: /^লম্বা/ }).first(), 1500);
        const icon = c.getByRole('button', { name: /^কটি সংখ্যা না/ });
        await h.click(icon);
        await h.sleep(900);
        await h.click(icon);
      },
    },
    {
      label: 'সংরক্ষণ',
      say: 'সব ঠিক থাকলে নিচের সংরক্ষণ করুন বোতামে চাপ দিন।',
      act: async h => { await h.sleep(600); await h.click(h.page.getByRole('button', { name: 'সংরক্ষণ করুন' })); },
    },
    {
      label: 'সম্পন্ন',
      say: 'এখন থেকে পাঞ্জাবির অর্ডার নেওয়ার সময় সংখ্যার মাপের জন্য ঘর আসবে, আর হ্যাঁ / না মাপের জন্য আসবে এক চাপের হ্যাঁ, না বোতাম।',
      act: async h => { await h.sleep(800); await h.ring(card(h), 3000); },
      pad: 1.0,
    },
    {
      card: { kick: 'দর্জি', title: 'মাপের তালিকা তৈরি', sub: 'পরের ভিডিও: অর্ডার নেওয়া ও কারিগরকে দায়িত্ব দেওয়া' },
      say: 'ধন্যবাদ! পরের ভিডিওতে দেখবেন, কীভাবে অর্ডার নেবেন আর কারিগরকে দায়িত্ব দেবেন।',
      pad: 1.5,
    },
  ],
};
