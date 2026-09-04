/**
 * iSchool — Additional Demo Schools Seed
 *
 * BismiLLAH Ar-Rahman Ar-Raheem.
 *
 * Adds three more fully-populated demo schools (beyond Al-Noor Academy) so the
 * multi-school demo experience is complete: /future-scholars, /ilm-garden,
 * /horizon-institute. Idempotent: skips schools that already exist.
 *
 * Usage:
 *   LIGHTBASE_API_KEY=lb_live_xxx LIGHTBASE_PROJECT=ischool-beta \
 *   LIGHTBASE_BASE_URL=https://lightbase-10133292663.development.catalystappsail.com \
 *   node --experimental-strip-types scripts/seed-demo-schools.ts
 */

const API_KEY = process.env.LIGHTBASE_API_KEY || '';
const PROJECT = process.env.LIGHTBASE_PROJECT || 'ischool-beta';
const BASE_URL = process.env.LIGHTBASE_BASE_URL || '';

if (!API_KEY || !BASE_URL) {
  console.error('ERROR: LIGHTBASE_API_KEY and LIGHTBASE_BASE_URL are required.');
  process.exit(1);
}

const HEADERS: Record<string, string> = {
  'apikey': API_KEY,
  'x-lightbase-project': PROJECT,
  'Content-Type': 'application/json',
};
const COLL_URL = `${BASE_URL}/api/v1/projects/${PROJECT}/collections`;

let inserted = 0;
let failed = 0;

function log(msg: string) { console.log(`[demo-seed] ${msg}`); }

async function queryDocs(name: string, filter: any, limit = 1): Promise<any[]> {
  const params = new URLSearchParams();
  if (filter) params.set('filter', JSON.stringify(filter));
  params.set('limit', String(limit));
  const res = await fetch(`${COLL_URL}/${name}/docs?${params}`, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`query(${name}) failed: ${res.status}`);
  }
  const data = await res.json();
  return data.data || [];
}

async function insertDoc(collection: string, doc: any): Promise<any> {
  const res = await fetch(`${COLL_URL}/${collection}/docs`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`insert(${collection}) failed: ${res.status} ${body.substring(0, 200)}`);
  }
  const data = await res.json();
  inserted++;
  return data.data || data;
}

/** Inserts a doc only if the collection has no docs yet for this school_id. */
async function insertIfEmpty(collection: string, schoolId: string, docs: any[]): Promise<number> {
  if (docs.length === 0) return 0;
  const existing = await queryDocs(collection, { field: 'school_id', op: 'eq', value: schoolId }, 1);
  if (existing.length > 0) {
    log(`  ${collection}: already has docs for this school — skipping`);
    return 0;
  }
  let n = 0;
  for (const d of docs) {
    await insertDoc(collection, d);
    n++;
  }
  return n;
}

async function seedSchool(school: any, content: any): Promise<void> {
  let existing = await queryDocs('schools', { field: 'slug', op: 'eq', value: school.slug }, 1);
  if (existing.length === 0) {
    log(`Seeding school: ${school.name} (${school.slug})...`);
    await insertDoc('schools', school);
    // Re-query to obtain the real generated id (POST response shape varies).
    existing = await queryDocs('schools', { field: 'slug', op: 'eq', value: school.slug }, 1);
    if (existing.length === 0) throw new Error('school created but not found by slug query');
  } else {
    log(`School exists: ${school.name} (${school.slug}) — seeding missing content`);
  }
  const schoolId = existing[0].id;
  const sid = () => schoolId;

  const withSid = <T extends object>(arr: T[]): any[] => arr.map((d) => ({ school_id: sid(), ...d }));

  // about page (single doc per school)
  await insertIfEmpty('about_pages', schoolId, withSid([content.about]));
  // announcements / posts / programs / faqs / gallery / nav / contacts
  await insertIfEmpty('announcements', schoolId, withSid(content.announcements));
  await insertIfEmpty('blog_posts', schoolId, withSid(content.posts));
  await insertIfEmpty('programs', schoolId, withSid(content.programs.map((pr: any, i: number) => ({ sort_order: i + 1, ...pr }))));
  await insertIfEmpty('faqs', schoolId, withSid(content.faqs.map((f: any, i: number) => ({ sort_order: i + 1, ...f }))));
  await insertIfEmpty('gallery_items', schoolId, withSid(content.gallery.map((g: any, i: number) => ({ sort_order: i + 1, ...g }))));
  await insertIfEmpty('navigation_items', schoolId, withSid(content.nav.map((n: any, i: number) => ({ sort_order: i + 1, ...n }))));
  await insertIfEmpty('contact_info', schoolId, withSid(content.contacts.map((c: any, i: number) => ({ sort_order: i + 1, ...c }))));
  await insertIfEmpty('admission_periods', schoolId, withSid([content.admission]));

  log(`  ${school.name}: content ensured (school_id=${schoolId})`);
}

// ═══════════════════════════════════════════════════════════
// DEMO SCHOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════

const DEMO_SCHOOLS: Array<{ school: any; content: any }> = [
  {
    school: {
      name: 'Future Scholars Academy',
      slug: 'future-scholars',
      tagline: 'Where Bright Minds Become Tomorrow\u2019s Leaders',
      description: 'A British-curriculum academy in Abuja offering world-class primary and secondary education, small class sizes, and a proven record of outstanding IGCSE and A-Level results.',
      primary_color: '#1E3A8A',
      secondary_color: '#F59E0B',
      address: '45 Maitama Avenue, Abuja, FCT, Nigeria',
      phone: '+234 800 555 0199',
      email: 'hello@futurescholars.edu.ng',
      website: 'https://futurescholars.edu.ng',
      theme: 'prestige',
      locale: 'en',
      social_handles: JSON.stringify({
        facebook: 'https://facebook.com/futurescholarsabuja',
        instagram: 'https://instagram.com/futurescholarsabuja',
        twitter: 'https://twitter.com/fscholarsabuja',
      }),
      active_modules: JSON.stringify(['cms', 'sis', 'lms', 'finance', 'communication', 'library', 'exams', 'admissions', 'cbt']),
      status: 'active',
      is_active: true,
    },
    content: {
      about: {
        content: 'Future Scholars Academy is Abuja\u2019s leading British-curriculum school, serving 700+ students from Reception to Sixth Form. Our graduates attend top universities in the UK, Canada, and the United States.',
        mission: 'To deliver an outstanding British education that empowers every learner to achieve academic excellence and global citizenship.',
        vision: 'A world where every child\u2019s potential is fully realised through world-class teaching and care.',
        history: 'Founded in 2008 by Mrs. Grace Okonkwo, Future Scholars began as a small primary school with 40 pupils. Today it spans a modern campus with science labs, an Olympic-size pool, and a dedicated Sixth Form college.',
        features: JSON.stringify([
          { title: 'British Curriculum', description: 'Full Cambridge pathway from Primary to A-Levels with Cambridge exam centre status on campus.' },
          { title: '8:1 Student Ratio', description: 'Small classes ensure personalised attention and measurable progress for every learner.' },
          { title: 'University Placements', description: 'Dedicated counsellors have secured 100% university placement for six consecutive years.' },
        ]),
        stats: JSON.stringify([
          { label: 'Students', value: '700+' },
          { label: 'A*-B Rate', value: '84%' },
          { label: 'Universities', value: '60+' },
          { label: 'Years', value: '17' },
        ]),
      },
      announcements: [
        { title: 'IGCSE Results: Record-Breaking Year', slug: 'igcse-record-results', content: 'Alhamdulillah and congratulations to our IGCSE class of 2026! 91% of all entries achieved A*-C, with 58% at A*-A \u2014 our best results ever. We are immensely proud of the students and their teachers.', excerpt: '91% A*-C in this year\u2019s IGCSE examinations.', is_pinned: true, published: true },
        { title: 'New STEM Innovation Lab Opens', slug: 'stem-lab-opens', content: 'Our new STEM Innovation Lab is now open, featuring 3D printers, robotics kits, and a full electronics bench. Coding and robotics are now timetabled subjects for Years 5\u20139.', excerpt: 'Robotics and coding join the timetable for Years 5\u20139.', is_pinned: false, published: true },
        { title: 'Inter-House Sports Festival', slug: 'inter-house-sports-festival', content: 'The annual Inter-House Sports Festival holds on Friday, March 20 at the school field. Parents are warmly invited. Gates open at 8:00 AM; the march-past begins at 9:00 AM sharp.', excerpt: 'Join us on March 20 for the annual sports festival.', is_pinned: false, published: true },
      ],
      posts: [
        { title: 'Why Small Classes Matter', slug: 'why-small-classes-matter', content: 'Research is clear: students in smaller classes receive more individual attention, participate more, and achieve better outcomes. At Future Scholars, our 8:1 ratio means every child is known by name by every teacher.', excerpt: 'The evidence behind our 8:1 student-teacher ratio.', author: 'Mrs. Grace Okonkwo', tags: '["teaching","leadership"]', status: 'published', is_published: true },
        { title: 'A Parent\u2019s Guide to IGCSE Preparation', slug: 'igcse-preparation-guide', content: 'The IGCSE years reward consistency over cramming. This guide covers revision timetables, past-paper strategy, and how our teachers scaffold exam skills from Year 9 onward.', excerpt: 'Practical revision strategies from our exam team.', author: 'Mr. David Eze', tags: '["academics","exams"]', status: 'published', is_published: true },
        { title: 'Robotics Team Qualifies for Nationals', slug: 'robotics-nationals', content: 'Our Year 10 robotics team qualified for the National Robotics Championship after winning the regional round with their autonomous waste-sorting robot. The finals hold in Lagos next month.', excerpt: 'Regional champions head to the national finals.', author: 'Ms. Fatima Bello', tags: '["stem","achievements"]', status: 'published', is_published: true },
      ],
      programs: [
        { name: 'Cambridge Primary', slug: 'cambridge-primary', description: 'Reception to Year 6 following the Cambridge Primary curriculum.', content: 'Literacy, numeracy, and science taught through enquiry-based learning, with French and coding from Year 3.', is_published: true },
        { name: 'Cambridge Lower Secondary & IGCSE', slug: 'igcse-programme', description: 'Years 7\u201311 with IGCSE examinations at the end of Year 11.', content: 'Students choose from 18 IGCSE subjects including Triple Award Science, Additional Mathematics, Business Studies, and Computer Science.', is_published: true },
        { name: 'A-Level Sixth Form', slug: 'sixth-form', description: 'Two-year A-Level programme with university counselling.', content: 'A-Levels in 14 subjects, EPQ, IELTS preparation, and one-to-one university guidance for UK, US, and Canadian admissions.', is_published: true },
      ],
      faqs: [
        { question: 'What curriculum do you follow?', answer: 'We follow the British Cambridge curriculum: Cambridge Primary, Lower Secondary, IGCSE, and A-Levels. We are a registered Cambridge exam centre.' },
        { question: 'What are the school hours?', answer: 'School runs 7:45 AM to 3:00 PM Monday to Friday, with after-school clubs until 4:30 PM and a supervised prep programme for boarders.' },
        { question: 'Do you offer boarding?', answer: 'We offer weekly and full boarding for students from Year 7, with dedicated house parents, a sick bay, and evening prep supervised by subject teachers.' },
      ],
      gallery: [
        { title: 'Science Fair 2026', description: 'Senior students presenting their physics projects.', image_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800', is_published: true },
        { title: 'New Library Wing', description: 'The recently opened 20,000-book library.', image_url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800', is_published: true },
        { title: 'Swim Team Training', description: 'Morning training at the Olympic-size pool.', image_url: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800', is_published: true },
      ],
      nav: [
        { label: 'About', url: '/about', is_external: false },
        { label: 'Academics', url: '/academics', is_external: false },
        { label: 'Admissions', url: '/admissions', is_external: false },
        { label: 'Blog', url: '/blog', is_external: false },
        { label: 'Contact', url: '/contact', is_external: false },
      ],
      contacts: [
        { type: 'general', label: 'Front Desk', value: '+234 800 555 0199' },
        { type: 'admissions', label: 'Admissions Email', value: 'admissions@futurescholars.edu.ng' },
        { type: 'support', label: 'Support Email', value: 'support@futurescholars.edu.ng' },
      ],
      admission: {
        name: '2026-2027 Admissions',
        slug: '2026-2027-admissions',
        open_date: '2025-11-01',
        close_date: '2026-07-31',
        is_active: true,
        description: 'Applications for Reception through Year 12 are open for the 2026-2027 session. Entrance assessments hold every Saturday morning.',
        requirements: JSON.stringify(['Completed application form', 'Birth certificate', 'Last two school reports', 'Entrance assessment', 'Family interview']),
      },
    },
  },
  {
    school: {
      name: 'Ilm Garden School',
      slug: 'ilm-garden',
      tagline: 'Nurturing Little Hearts and Minds',
      description: 'A warm, play-based primary school in Ibadan blending the Nigerian curriculum with Islamic studies, Montessori methods, and a deep love for learning in the early years.',
      primary_color: '#059669',
      secondary_color: '#F2B91C',
      address: '12 Ring Road West, Ibadan, Oyo State, Nigeria',
      phone: '+234 800 222 0344',
      email: 'salam@ilmgarden.sch.ng',
      website: 'https://ilmgarden.sch.ng',
      theme: 'bloom',
      locale: 'en',
      social_handles: JSON.stringify({
        facebook: 'https://facebook.com/ilmgardenschool',
        instagram: 'https://instagram.com/ilmgarden',
      }),
      active_modules: JSON.stringify(['cms', 'sis', 'lms', 'communication', 'library', 'admissions']),
      status: 'active',
      is_active: true,
    },
    content: {
      about: {
        content: 'Ilm Garden School is a nurturing primary school in Ibadan where children aged 2\u201311 learn through play, exploration, and gentle guidance. \u201cIlm\u201d means knowledge \u2014 and our garden metaphor shapes everything: children grow when the environment is rich and the care is constant.',
        mission: 'To give every child a joyful foundation \u2014 academically, spiritually, and socially \u2014 through play-based, child-centred learning.',
        vision: 'To be West Africa\u2019s most loved early-years and primary school.',
        history: 'Founded in 2015 by Ustadha Maryam Adebayo, a Montessori-trained educator, Ilm Garden began with one nursery class of 12 children and has grown into a full primary school of 320 pupils.',
        features: JSON.stringify([
          { title: 'Montessori Methods', description: 'Hands-on learning materials and child-led pace in every nursery and lower-primary classroom.' },
          { title: 'Quran with Understanding', description: 'Daily Quran, Arabic, and Islamic studies taught with love, songs, and stories \u2014 never rote pressure.' },
          { title: 'Forest Fridays', description: 'Every class spends Friday mornings outdoors: gardening, nature walks, and discovery-based science.' },
        ]),
        stats: JSON.stringify([
          { label: 'Pupils', value: '320' },
          { label: 'Teachers', value: '38' },
          { label: 'Max Class Size', value: '16' },
          { label: 'Founded', value: '2015' },
        ]),
      },
      announcements: [
        { title: 'Nursery Applications Open', slug: 'nursery-applications-open', content: 'Applications for our September nursery intake are now open. We accept children from age 2. Places fill quickly \u2014 early application is advised.', excerpt: 'September nursery intake now open.', is_pinned: true, published: true },
        { title: 'Grandparents\u2019 Reading Day', slug: 'grandparents-reading-day', content: 'We invite grandparents to join us for a special reading morning on Thursday. Come and share your favourite story with a small circle of children.', excerpt: 'A special morning of stories across generations.', is_pinned: false, published: true },
        { title: 'Garden Harvest Week', slug: 'garden-harvest-week', content: 'Our school farm\u2019s first maize and tomato harvest is ready! Children will harvest, weigh, and sell produce at the Friday market to raise funds for the library.', excerpt: 'First harvest of the school farm is ready.', is_pinned: false, published: true },
      ],
      posts: [
        { title: 'The Magic of Phonics in Nursery', slug: 'phonics-in-nursery', content: 'Phonics at Ilm Garden is songs, movement, and sound games. By the end of nursery, most children can blend simple words \u2014 not because we drilled them, but because reading was made joyful.', excerpt: 'How we teach early reading through play.', author: 'Ustadha Maryam Adebayo', tags: '["early-years","reading"]', status: 'published', is_published: true },
        { title: 'Why We Garden With Children', slug: 'why-we-garden', content: 'A child who plants a seed learns patience, responsibility, biology, and wonder \u2014 all at once. Our Forest Fridays build scientists and caretakers in the same morning.', excerpt: 'Learning science and character in the garden.', author: 'Mr. Tunde Ogunleye', tags: '["outdoor-learning"]', status: 'published', is_published: true },
        { title: 'Gentle Islamic Studies for Young Hearts', slug: 'gentle-islamic-studies', content: 'Young children learn deen through beauty: nasheed, story, kindness practice, and wudu play. We protect the joy of childhood while planting deep roots.', excerpt: 'Our philosophy for early Islamic education.', author: 'Ustadha Maryam Adebayo', tags: '["islamic-studies"]', status: 'published', is_published: true },
      ],
      programs: [
        { name: 'Toddler & Nursery', slug: 'toddler-nursery', description: 'Ages 2\u20134: gentle separation, sensory play, and language-rich days.', content: 'Montessori-inspired practical life, sensorial, and language work with a 1:6 adult ratio.', is_published: true },
        { name: 'Lower Primary (Grades 1\u20133)', slug: 'lower-primary', description: 'Solid phonics, numeracy, and character foundations.', content: 'Nigerian primary curriculum enriched with Montessori materials, daily Quran, and weekly Forest Fridays.', is_published: true },
        { name: 'Upper Primary (Grades 4\u20136)', slug: 'upper-primary', description: 'Independent learners ready for strong secondary schools.', content: 'Project-based science, creative writing, reasoning, and Common Entrance preparation with pastoral care.', is_published: true },
      ],
      faqs: [
        { question: 'What ages do you accept?', answer: 'We accept children from age 2 (toddler class) through Grade 6 (age 11).' },
        { question: 'Is Islamic studies compulsory?', answer: 'Islamic studies, Quran, and Arabic are part of the timetable for all children, taught gently and age-appropriately. Non-Muslim families are welcome and can opt for alternative moral-instruction periods.' },
        { question: 'What makes Ilm Garden different?', answer: 'Very small classes, play-based methods, daily outdoor time, and teachers trained in both Montessori and early-childhood Islamic pedagogy.' },
      ],
      gallery: [
        { title: 'Forest Friday', description: 'Nature walk and leaf collection in the school woods.', image_url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800', is_published: true },
        { title: 'Practical Life Shelf', description: 'Montessori materials in the toddler classroom.', image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', is_published: true },
        { title: 'School Farm', description: 'Pupils watering the vegetable beds.', image_url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800', is_published: true },
      ],
      nav: [
        { label: 'About', url: '/about', is_external: false },
        { label: 'Programs', url: '/programs', is_external: false },
        { label: 'Admissions', url: '/admissions', is_external: false },
        { label: 'Gallery', url: '/gallery', is_external: false },
        { label: 'Contact', url: '/contact', is_external: false },
      ],
      contacts: [
        { type: 'general', label: 'Front Desk', value: '+234 800 222 0344' },
        { type: 'admissions', label: 'Admissions WhatsApp', value: '+234 802 555 0344' },
        { type: 'general', label: 'Email', value: 'salam@ilmgarden.sch.ng' },
      ],
      admission: {
        name: '2026-2027 Nursery & Primary Admissions',
        slug: '2026-2027-admissions',
        open_date: '2026-01-05',
        close_date: '2026-08-31',
        is_active: true,
        description: 'Rolling admissions for toddler, nursery, and primary classes. Play-based readiness visits instead of formal tests for under-5s.',
        requirements: JSON.stringify(['Application form', 'Birth certificate', 'Immunization record', 'Play visit (under 5s) or readiness chat (5+)']),
      },
    },
  },
  {
    school: {
      name: 'Horizon Institute of Technology',
      slug: 'horizon-institute',
      tagline: 'Engineering the Future, One Student at a Time',
      description: 'A STEM-focused secondary institute in Kano offering technical education, computer science, and robotics alongside a full WAEC/NECO curriculum.',
      primary_color: '#0EA5E9',
      secondary_color: '#181F25',
      address: '88 Zoo Road, Kano, Kano State, Nigeria',
      phone: '+234 800 777 0921',
      email: 'info@horizoninst.edu.ng',
      website: 'https://horizoninst.edu.ng',
      theme: 'horizon',
      locale: 'en',
      social_handles: JSON.stringify({
        facebook: 'https://facebook.com/horizoninstitutekano',
        twitter: 'https://twitter.com/horizoninstkano',
        youtube: 'https://youtube.com/@horizoninstkano',
      }),
      active_modules: JSON.stringify(['cms', 'sis', 'lms', 'finance', 'communication', 'exams', 'cbt', 'inventory', 'admissions']),
      status: 'active',
      is_active: true,
    },
    content: {
      about: {
        content: 'Horizon Institute is Kano\u2019s premier STEM secondary school, combining the full Nigerian national curriculum with intensive technical tracks: computer science, robotics, renewable energy, and digital media. Our labs run real projects \u2014 students graduate with a portfolio, not just a certificate.',
        mission: 'To produce technically skilled, innovative graduates who build solutions for Nigeria\u2019s challenges.',
        vision: 'To be West Africa\u2019s reference point for secondary-level technical education.',
        history: 'Founded in 2012 by Engr. Bala Musa Dambatta, Horizon started as a weekend coding club for 20 students. It now operates a full secondary school with four engineering labs, a fabrication workshop, and a solar-powered campus.',
        features: JSON.stringify([
          { title: '4 Technical Tracks', description: 'Computer science, robotics, renewable energy, or digital media \u2014 every student specializes from SS1.' },
          { title: 'Real Labs, Real Projects', description: 'Arduino, drone, 3D-printing, and solar labs where students build working systems every term.' },
          { title: 'WAEC + Portfolio', description: 'Full national curriculum preparation alongside a graded project portfolio employers actually read.' },
        ]),
        stats: JSON.stringify([
          { label: 'Students', value: '540' },
          { label: 'Labs', value: '4' },
          { label: 'WAEC Pass Rate', value: '96%' },
          { label: 'Projects / Year', value: '300+' },
        ]),
      },
      announcements: [
        { title: 'JAMB 2026: 100% Registration Complete', slug: 'jamb-registration-complete', content: 'All SS3 candidates completed JAMB registration and mock CBT practice on our in-house CBT platform. Exams begin next month \u2014 revision clinics run every evening in the innovation hall.', excerpt: 'Every SS3 student is registered and prepped.', is_pinned: true, published: true },
        { title: 'Solar Project Powers Admin Block', slug: 'solar-project-powers-admin', content: 'The renewable-energy track\u2019s capstone project \u2014 a 5kW solar array designed and installed by students \u2014 now powers the administrative block, cutting diesel use by 60%.', excerpt: 'Student-built solar array goes live.', is_pinned: false, published: true },
        { title: 'Inter-School Hackathon Winners', slug: 'hackathon-winners', content: 'Our SS2 team won the Kano Inter-School Hackathon with a Hausa-language learning app for primary pupils. They take home laptops and a seed grant from the state ICT agency.', excerpt: 'Hausa learning app wins first place.', is_pinned: false, published: true },
      ],
      posts: [
        { title: 'Why Every Student Should Learn to Solder', slug: 'learn-to-solder', content: 'Soldering teaches precision, patience, and the reality that small mistakes have visible consequences. In our fabrication workshop, it is the first rite of passage \u2014 and the moment theory becomes tangible.', excerpt: 'The first rite of passage in our workshop.', author: 'Engr. Bala Musa Dambatta', tags: '["technical","maker"]', status: 'published', is_published: true },
        { title: 'Inside Our CBT Exam Platform', slug: 'inside-cbt-platform', content: 'Nigeria\u2019s exams are computer-based, so practice must be too. Our in-house CBT platform simulates real JAMB/WAEC conditions \u2014 timer, question navigation, instant analytics \u2014 for every subject.', excerpt: 'How we simulate real exam conditions year-round.', author: 'Ms. Hauwa Garba', tags: '["edtech","exams"]', status: 'published', is_published: true },
        { title: 'From Coding Club to National Lab', slug: 'coding-club-to-lab', content: 'Horizon began as a Saturday coding club. The lesson of that journey: technical education grows when students build things the community actually needs \u2014 apps, solar arrays, and now a weather station network.', excerpt: 'The journey from club to full institute.', author: 'Engr. Bala Musa Dambatta', tags: '["history","stem"]', status: 'published', is_published: true },
      ],
      programs: [
        { name: 'Computer Science Track', slug: 'cs-track', description: 'Programming, networking, and data for SS1\u2013SS3.', content: 'Python, web development, databases, and networking labs, culminating in a real client project in SS3.', is_published: true },
        { name: 'Robotics & Mechatronics Track', slug: 'robotics-track', description: 'Arduino, drones, and automation systems.', content: 'From basic circuits to autonomous navigation: students design, build, and compete with their machines each term.', is_published: true },
        { name: 'Renewable Energy Track', slug: 'renewable-energy-track', description: 'Solar design, installation, and energy auditing.', content: 'Hands-on solar array design, battery systems, and energy audits \u2014 including live installations on campus buildings.', is_published: true },
      ],
      faqs: [
        { question: 'Do students still take WAEC and NECO?', answer: 'Yes. Horizon is a full secondary school: all students sit WAEC, NECO, and JAMB. The technical tracks run alongside the national curriculum, not instead of it.' },
        { question: 'Is technical experience required to join?', answer: 'No. Most students arrive with no technical background. The SS1 foundation year covers computing basics, workshop safety, and electronics fundamentals before specializing.' },
        { question: 'What do graduates do after Horizon?', answer: 'Our graduates study engineering, computer science, and architecture at Nigerian universities, join technical apprenticeships, or launch their own ventures \u2014 several alumni now run solar installation companies.' },
      ],
      gallery: [
        { title: 'Robotics Lab', description: 'SS2 students testing their line-following robots.', image_url: 'https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?w=800', is_published: true },
        { title: 'Solar Array Capstone', description: 'The student-built 5kW installation on the admin block.', image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800', is_published: true },
        { title: 'Fabrication Workshop', description: 'First-year students at the soldering benches.', image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800', is_published: true },
      ],
      nav: [
        { label: 'About', url: '/about', is_external: false },
        { label: 'Tracks', url: '/programs', is_external: false },
        { label: 'Admissions', url: '/admissions', is_external: false },
        { label: 'News', url: '/blog', is_external: false },
        { label: 'Contact', url: '/contact', is_external: false },
      ],
      contacts: [
        { type: 'general', label: 'Front Desk', value: '+234 800 777 0921' },
        { type: 'admissions', label: 'Admissions Email', value: 'admissions@horizoninst.edu.ng' },
        { type: 'support', label: 'Technical Support', value: 'labs@horizoninst.edu.ng' },
      ],
      admission: {
        name: '2026-2027 Technical Track Admissions',
        slug: '2026-2027-admissions',
        open_date: '2026-02-01',
        close_date: '2026-09-30',
        is_active: true,
        description: 'Entrance examination plus a hands-on aptitude session in the workshops. Track selection happens in SS1 second term.',
        requirements: JSON.stringify(['Common Entrance or JSCE result', 'Birth certificate', 'Entrance exam (Maths, English, General Paper)', 'Workshop aptitude session']),
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('═'.repeat(60));
  console.log('iSchool — Demo Schools Seed');
  console.log(`Project: ${PROJECT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('═'.repeat(60));

  for (const { school, content } of DEMO_SCHOOLS) {
    try {
      await seedSchool(school, content);
    } catch (e: any) {
      failed++;
      console.error(`[demo-seed] FAILED for ${school.slug}:`, e.message?.substring(0, 300));
    }
  }

  console.log();
  log(`DONE — inserted=${inserted}, failed=${failed}`);
}

main();
