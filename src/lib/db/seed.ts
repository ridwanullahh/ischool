import { getDb } from './index.js';
import { users, schools, schoolMembers, aboutPages, navigationItems, contactInfo, announcements, programs, faqs, classes, blogPosts, students, enrollments, attendance, courses, courseUnits, lessons, assignments, quizzes, questions, grades, academicPeriods, bellSchedules, timetableEntries, examSeries, exams, examResults, reportCards, feeStructures, invoices, payments, staff, leaveRequests, payroll, messages, notifications, libraryBooks, libraryLoans, hostels, hostelRooms, vehicles, transportRoutes, assets, inventoryItems, events, behaviorLogs, lessonPlans, auditLogs, moduleSettings, cbtExams, cbtCandidates, notificationTemplates, banners, popups, galleryAlbums, galleryItems, virtualTours, mediaUploads, subscriptionPlans, schoolSubscriptions, coupons, platformFaqs, platformSettings, platformBlogPosts, schoolTicketCategories, aiSettings } from './schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seed() {
  const db = getDb();

  const existingAdmin = db.select().from(users).where(eq(users.email, 'admin@ischool.com')).get();
  if (existingAdmin) {
    console.log('Seed data already exists.');
    return;
  }

  // Platform Admin
  const [admin] = db.insert(users).values({
    email: 'admin@ischool.com',
    passwordHash: await bcrypt.hash('admin123', 12),
    name: 'Platform Admin',
    role: 'super_admin',
  }).returning().all();

  // School 1: Al-Noor Islamic Academy
  const [owner1] = db.insert(users).values({
    email: 'principal@alnoor.edu',
    passwordHash: await bcrypt.hash('school123', 12),
    name: 'Ustadh Ahmad Al-Farsi',
    role: 'school_admin',
  }).returning().all();

  const [school1] = db.insert(schools).values({
    slug: 'alnoor',
    name: 'Al-Noor Islamic Academy',
    tagline: 'Illuminating Minds Through Faith and Knowledge',
    primaryColor: '#065f46',
    theme: 'scholar',
    ownerId: owner1.id,
    status: 'active',
  }).returning().all();

  db.insert(schoolMembers).values({ schoolId: school1.id, userId: owner1.id, role: 'admin' }).run();

  db.insert(aboutPages).values({
    schoolId: school1.id,
    mission: 'To provide a comprehensive Islamic education that nurtures the spiritual, intellectual, and moral development of every student, preparing them to be confident Muslims and contributing members of society.',
    vision: 'To be a beacon of Islamic education where the Quran and Sunnah guide our approach to modern learning, producing graduates who excel in both deen and dunya.',
    features: JSON.stringify([
      { title: 'Quran & Islamic Studies', description: 'Daily Quran memorization (Hifz), Tajweed, Tafseer, and comprehensive Islamic studies integrated into the curriculum.' },
      { title: 'Qualified Islamic Scholars', description: 'Our teachers are certified in both Islamic sciences and modern education methodologies.' },
      { title: 'Prayer & Spiritual Environment', description: 'Congregational prayers, Ramadan programs, and a nurturing Islamic atmosphere throughout the school day.' },
      { title: 'Academic Excellence', description: 'Rigorous STEM, humanities, and language arts programs that meet and exceed national standards.' },
    ]),
    valueProposition: 'At Al-Noor Islamic Academy, we believe that true education begins with the remembrance of Allah. Our integrated curriculum combines the best of Islamic scholarship with modern academic standards, ensuring our students are grounded in their faith while prepared for the challenges of the modern world. We follow the Quranic principle: "Read! In the name of your Lord who created." (96:1)',
    stats: JSON.stringify([
      { label: 'Students Enrolled', value: '850+' },
      { label: 'Huffaz Graduates', value: '120+' },
      { label: 'University Acceptance', value: '97%' },
      { label: 'Years of Excellence', value: '18' },
    ]),
  }).run();

  db.insert(navigationItems).values([
    { schoolId: school1.id, label: 'Home', url: '/', sortOrder: 0 },
    { schoolId: school1.id, label: 'About', url: '/about', sortOrder: 1 },
    { schoolId: school1.id, label: 'Announcements', url: '/announcements', sortOrder: 2 },
    { schoolId: school1.id, label: 'Programs', url: '/programs', sortOrder: 3 },
    { schoolId: school1.id, label: 'Classes', url: '/classes', sortOrder: 4 },
    { schoolId: school1.id, label: 'Blog', url: '/blog', sortOrder: 5 },
    { schoolId: school1.id, label: 'Gallery', url: '/gallery', sortOrder: 6 },
    { schoolId: school1.id, label: 'FAQ', url: '/faqs', sortOrder: 7 },
    { schoolId: school1.id, label: 'Contact', url: '/contact', sortOrder: 8 },
    { schoolId: school1.id, label: 'Admissions', url: '/admissions', sortOrder: 9 },
  ]).run();

  db.insert(contactInfo).values([
    { schoolId: school1.id, type: 'general', label: 'Email', value: 'info@alnoor.edu', sortOrder: 0 },
    { schoolId: school1.id, type: 'general', label: 'Phone', value: '+1 (555) 234-5678', sortOrder: 1 },
    { schoolId: school1.id, type: 'general', label: 'Address', value: '45 Masjid Road, Dearborn, MI 48124', sortOrder: 2 },
    { schoolId: school1.id, type: 'admissions', label: 'Email', value: 'admissions@alnoor.edu', sortOrder: 0 },
    { schoolId: school1.id, type: 'admissions', label: 'Phone', value: '+1 (555) 234-5679', sortOrder: 1 },
  ]).run();

  db.insert(announcements).values([
    { schoolId: school1.id, slug: 'ramadan-1448-schedule', title: 'Ramadan 1448 Schedule Published', content: 'Assalamu Alaikum. The adjusted school schedule for the blessed month of Ramadan has been published. School hours will be 9:00 AM to 2:30 PM. Taraweeh prayers will be held at the school masjid. Please check the parent portal for full details.', excerpt: 'Adjusted school hours and Taraweeh prayer schedule for the blessed month.', ctaText: 'View Full Schedule', ctaUrl: '/contact', isPinned: true, published: true },
    { schoolId: school1.id, slug: 'quran-competition-results', title: 'Annual Quran Competition Results', content: 'MashaAllah! We congratulate all participants in this year\'s Quran Memorization Competition. Special congratulations to our students who completed Juz Amma and will be representing Al-Noor at the National Quran Competition in Houston.', excerpt: 'Congratulations to our students heading to the National Quran Competition.', isPinned: false, published: true },
    { schoolId: school1.id, slug: 'new-stem-lab', title: 'New STEM Lab Opening', content: 'Alhamdulillah, our new state-of-the-art STEM laboratory is now open. Equipped with robotics kits, 3D printers, and coding stations, it provides our students with hands-on technology learning aligned with Islamic values.', excerpt: 'Our new lab features robotics, 3D printing, and coding stations.', isPinned: false, published: true },
  ]).run();

  db.insert(programs).values([
    { schoolId: school1.id, slug: 'noor-al-quran', name: 'Noor Al-Quran (Early Years)', description: 'A gentle introduction to Quran, Arabic letters, and Islamic manners for ages 4-5. Children learn through stories of the Prophets, nasheeds, and creative activities.', content: 'Our Early Years program creates a loving Islamic environment where young learners discover the beauty of the Quran through age-appropriate activities. Children engage with Arabic letters through art, learn basic duas, and hear the stories of the Prophets in an interactive way.\n\nThe curriculum includes phonemic awareness, pre-reading skills, numeracy through hands-on manipulatives, and fine motor development through Islamic art projects. Daily routines include morning dua, circle time with Quran stories, and group nasheeds.', duration: '2 years', level: 'Pre-K to KG', icon: 'quran', hasDetailPage: true, sortOrder: 0 },
    { schoolId: school1.id, slug: 'primary-school', name: 'Primary School', description: 'Integrated Islamic and academic curriculum for grades 1-5. Students begin formal Quran Hifz, Arabic language, and Islamic studies alongside core academics.', content: 'Our Primary School integrates the best of Islamic education with rigorous academics. Students begin formal Quran memorization with dedicated Hifz sessions, learn Arabic using the Noorani Qaida method, and study Islamic history and Aqeedah.\n\nCore academics include mathematics, science, English language arts, and social studies — all taught with an Islamic worldview. Students participate in weekly community service projects and develop strong character through our Tarbiyah program.', duration: '5 years', level: 'Grade 1-5', icon: 'book', hasDetailPage: true, sortOrder: 1 },
    { schoolId: school1.id, slug: 'middle-school', name: 'Middle School', description: 'Advanced academics with deeper Islamic studies including Fiqh, Seerah, and Arabic grammar. Students participate in community service and leadership programs.', content: 'Middle School students dive deeper into both academics and Islamic scholarship. The Islamic studies curriculum includes Fiqh (jurisprudence), Seerah (Prophetic biography), Arabic grammar (Nahw), and introductory Tafseer.\n\nAcademically, students engage with pre-algebra, life sciences, world history, and advanced English. Our leadership program pairs each student with a community mentor, and annual service projects teach the Islamic principle of benefiting others.', duration: '3 years', level: 'Grade 6-8', icon: 'crescent', hasDetailPage: true, sortOrder: 2 },
    { schoolId: school1.id, slug: 'high-school', name: 'High School', description: 'College-preparatory program with AP courses, dual enrollment options, and an Islamic Studies diploma track. Students graduate as confident Muslim leaders.', content: 'Our High School prepares students for university success while deepening their Islamic identity. Students can pursue AP courses in sciences, mathematics, and humanities alongside our Islamic Studies diploma track.\n\nGraduates leave with college credits, strong Quran memorization, Arabic proficiency, and a clear sense of their identity as Muslim professionals. Our college counseling program has achieved a 97% university acceptance rate.', duration: '4 years', level: 'Grade 9-12', icon: 'graduation', hasDetailPage: true, sortOrder: 3 },
  ]).run();

  db.insert(classes).values([
    { schoolId: school1.id, slug: 'hifz-juz-amma', name: 'Hifz Class - Juz Amma', description: 'Memorization of Juz 30 with proper Tajweed rules and understanding of meanings.', gradeLevel: 'All Levels', teacherName: 'Sheikh Ibrahim Musa', capacity: 15, hasDetailPage: true, sortOrder: 0 },
    { schoolId: school1.id, slug: 'arabic-beginner', name: 'Arabic Language - Beginner', description: 'Introduction to Arabic reading, writing, and basic conversation using the Noorani Qaida method.', gradeLevel: 'Grade 1-3', teacherName: 'Ustadha Fatima Zahra', capacity: 20, hasDetailPage: true, sortOrder: 1 },
    { schoolId: school1.id, slug: 'islamic-studies-aqeedah', name: 'Islamic Studies - Aqeedah', description: 'Foundations of Islamic belief, the Six Pillars of Iman, and Tawheed through age-appropriate lessons.', gradeLevel: 'Grade 4-6', teacherName: 'Ustadh Yusuf Abdullah', capacity: 25, hasDetailPage: true, sortOrder: 2 },
    { schoolId: school1.id, slug: 'mathematics-advanced', name: 'Mathematics - Advanced', description: 'Pre-algebra and problem solving with real-world applications and collaborative learning.', gradeLevel: 'Grade 7-8', teacherName: 'Ustadh Omar Hassan', capacity: 22, hasDetailPage: true, sortOrder: 3 },
  ]).run();

  db.insert(blogPosts).values([
    { schoolId: school1.id, title: 'The Importance of Seeking Knowledge in Islam', slug: 'importance-of-knowledge-in-islam', content: 'The Prophet Muhammad (peace be upon him) said: "Seeking knowledge is an obligation upon every Muslim." At Al-Noor, we take this hadith to heart every day.\n\nOur integrated curriculum ensures that students understand that all beneficial knowledge comes from Allah, and that pursuing excellence in science, mathematics, and the arts is itself an act of worship when done with the right intention.\n\nThis semester, our students have been exploring the golden age of Islamic scholarship, studying the contributions of scholars like Al-Khwarizmi, Ibn Sina, and Al-Jazari. These scholars remind us that Islam has always championed intellectual inquiry.\n\nWe encourage parents to support their children\'s love of learning at home by reading together, asking questions, and making dua for beneficial knowledge.', excerpt: 'Exploring how our integrated curriculum embodies the Islamic obligation of seeking knowledge.', coverImageUrl: null, authorId: owner1.id, isPublished: true, publishedAt: new Date() },
    { schoolId: school1.id, title: 'Al-Noor Students Excel at Regional Science Fair', slug: 'students-excel-science-fair', content: 'Alhamdulillah, our students brought home 5 awards from the Regional Science Fair this year!\n\nOur Grade 8 team won first place for their project on water purification methods inspired by medieval Islamic engineering. They studied the works of Al-Jazari and applied his principles to modern filtration systems.\n\nGrade 6 student Aisha Rahman received the Innovation Award for her solar-powered Quran reading lamp designed for students in areas without electricity.\n\nThese achievements demonstrate that when faith and science work together, the results are truly remarkable. We are proud of all our participants and their dedication to excellence.', excerpt: 'Our students won 5 awards including first place for a project inspired by Islamic engineering heritage.', coverImageUrl: null, authorId: owner1.id, isPublished: true, publishedAt: new Date('2026-05-20') },
  ]).run();

  db.insert(faqs).values([
    { schoolId: school1.id, question: 'What is the daily schedule like?', answer: 'Our day begins with Fajr prayer for boarding students and morning assembly with Quran recitation at 8:00 AM. Academic classes run until 12:00 PM, followed by Dhuhr prayer in congregation. Afternoon classes continue until 3:00 PM, with Asr prayer before dismissal. Islamic studies and Hifz programs are integrated throughout the day.', category: 'General', sortOrder: 0 },
    { schoolId: school1.id, question: 'Is the Hifz program mandatory?', answer: 'The Hifz program is strongly encouraged but tailored to each student\'s ability. All students memorize at minimum Juz Amma. Those who wish to pursue full Hifz have a dedicated track with additional hours. Our Hifz teachers work closely with families to set achievable goals.', category: 'Academics', sortOrder: 1 },
    { schoolId: school1.id, question: 'What is the admission process?', answer: 'Our admission process includes: 1) Online application with family information, 2) Student assessment in reading and math, 3) Quran reading evaluation (appropriate to age), 4) Family interview to discuss goals and expectations, 5) Admission decision within 2 weeks. We welcome students from all Islamic backgrounds.', category: 'Admissions', sortOrder: 2 },
    { schoolId: school1.id, question: 'Is there a dress code?', answer: 'Yes, students are expected to dress modestly in accordance with Islamic guidelines. Boys wear thobes or modest clothing. Girls wear hijab from Grade 5 and modest clothing at all times. The school provides a uniform policy document upon enrollment with detailed guidelines.', category: 'General', sortOrder: 3 },
    { schoolId: school1.id, question: 'Are meals provided?', answer: 'Yes, our cafeteria serves halal-certified meals prepared on-site. We offer breakfast, lunch, and snacks. All meals are prepared following Islamic dietary guidelines. We accommodate dietary restrictions and allergies. Monthly meal plans are available at discounted rates.', category: 'General', sortOrder: 4 },
  ]).run();

  // School 2: Darul Hikmah School
  const [owner2] = db.insert(users).values({
    email: 'principal@darulhikmah.edu',
    passwordHash: await bcrypt.hash('school123', 12),
    name: 'Dr. Khadijah Ibrahim',
    role: 'school_admin',
  }).returning().all();

  const [school2] = db.insert(schools).values({
    slug: 'darulhikmah',
    name: 'Darul Hikmah School',
    tagline: 'The House of Wisdom — Where Faith Meets Excellence',
    primaryColor: '#1e3a5f',
    theme: 'prestige',
    ownerId: owner2.id,
    status: 'active',
  }).returning().all();

  db.insert(schoolMembers).values({ schoolId: school2.id, userId: owner2.id, role: 'admin' }).run();

  db.insert(aboutPages).values({
    schoolId: school2.id,
    mission: 'To cultivate a generation of Muslim leaders who embody the spirit of the House of Wisdom — excelling in both religious scholarship and modern sciences, committed to serving the Ummah and humanity.',
    vision: 'Inspired by the great Bayt al-Hikmah of Baghdad, we aspire to be a center of learning where critical thinking, creativity, and Islamic values converge to produce outstanding scholars, scientists, and community leaders.',
    features: JSON.stringify([
      { title: 'Dual Curriculum', description: 'A unique blend of classical Islamic sciences and Cambridge International curriculum, giving students the best of both worlds.' },
      { title: 'Arabic Immersion', description: 'Full Arabic language immersion program with native-speaking teachers, ensuring fluency in the language of the Quran.' },
      { title: 'Character Building (Tarbiyah)', description: 'A structured tarbiyah program that develops Islamic character, leadership, and community service in every student.' },
      { title: 'Modern Campus', description: 'Purpose-built campus with separate boys and girls sections, masjid, library, science labs, sports facilities, and creative arts studio.' },
    ]),
    valueProposition: 'Darul Hikmah revives the tradition of the great Islamic academies. Named after the House of Wisdom in Baghdad — where scholars translated, discovered, and innovated — we believe that Islam and academic excellence are not just compatible, but inseparable. Our graduates leave as hafiz of Quran, fluent in Arabic, and accepted into top universities worldwide.',
    stats: JSON.stringify([
      { label: 'Students Enrolled', value: '650+' },
      { label: 'Huffaz Graduates', value: '85+' },
      { label: 'Cambridge Distinctions', value: '92%' },
      { label: 'Arabic Fluency Rate', value: '88%' },
    ]),
  }).run();

  db.insert(navigationItems).values([
    { schoolId: school2.id, label: 'Home', url: '/', sortOrder: 0 },
    { schoolId: school2.id, label: 'About', url: '/about', sortOrder: 1 },
    { schoolId: school2.id, label: 'Announcements', url: '/announcements', sortOrder: 2 },
    { schoolId: school2.id, label: 'Programs', url: '/programs', sortOrder: 3 },
    { schoolId: school2.id, label: 'Classes', url: '/classes', sortOrder: 4 },
    { schoolId: school2.id, label: 'Blog', url: '/blog', sortOrder: 5 },
    { schoolId: school2.id, label: 'Gallery', url: '/gallery', sortOrder: 6 },
    { schoolId: school2.id, label: 'FAQ', url: '/faqs', sortOrder: 7 },
    { schoolId: school2.id, label: 'Contact', url: '/contact', sortOrder: 8 },
    { schoolId: school2.id, label: 'Admissions', url: '/admissions', sortOrder: 9 },
  ]).run();

  db.insert(contactInfo).values([
    { schoolId: school2.id, type: 'general', label: 'Email', value: 'info@darulhikmah.edu', sortOrder: 0 },
    { schoolId: school2.id, type: 'general', label: 'Phone', value: '+1 (555) 345-6789', sortOrder: 1 },
    { schoolId: school2.id, type: 'general', label: 'Address', value: '786 Hikmah Boulevard, Houston, TX 77008', sortOrder: 2 },
    { schoolId: school2.id, type: 'admissions', label: 'Email', value: 'admissions@darulhikmah.edu', sortOrder: 0 },
    { schoolId: school2.id, type: 'admissions', label: 'Phone', value: '+1 (555) 345-6790', sortOrder: 1 },
  ]).run();

  db.insert(announcements).values([
    { schoolId: school2.id, slug: 'cambridge-exam-results', title: 'Cambridge Examination Results — Outstanding!', content: 'Alhamdulillah! We are proud to announce that 92% of our Grade 10 and 12 students achieved distinctions in their Cambridge International Examinations. Special mention to our top scorer, Ahmad Al-Rashid, who achieved 8 A* grades. May Allah bless their future endeavors.', excerpt: '92% distinction rate in Cambridge exams with our top scorer achieving 8 A* grades.', ctaText: 'View Results', ctaUrl: '/about', isPinned: true, published: true },
    { schoolId: school2.id, slug: 'islamic-studies-conference', title: 'Annual Islamic Studies Conference', content: 'Darul Hikmah will host the 5th Annual Youth Islamic Studies Conference on July 15-17. Scholars from around the world will deliver lectures on contemporary Islamic topics. Open to students, parents, and the community. Register on our website.', excerpt: 'Join scholars from around the world for our 5th annual conference.', ctaText: 'Register Now', ctaUrl: '/contact', isPinned: true, published: true },
  ]).run();

  db.insert(programs).values([
    { schoolId: school2.id, slug: 'raudah', name: 'Raudah (Early Years)', description: 'A warm, play-based Islamic learning environment for ages 3-5. Children learn Quran stories, basic Arabic, adab (manners), and foundational literacy and numeracy.', duration: '2 years', level: 'Pre-K to KG', icon: 'flower', hasDetailPage: true, sortOrder: 0 },
    { schoolId: school2.id, slug: 'cambridge-primary', name: 'Cambridge Primary', description: 'Cambridge International Primary curriculum integrated with Islamic studies, Quran Hifz, and Arabic immersion. Students develop strong academic and spiritual foundations.', duration: '5 years', level: 'Grade 1-5', icon: 'book', hasDetailPage: true, sortOrder: 1 },
    { schoolId: school2.id, slug: 'cambridge-lower-secondary', name: 'Cambridge Lower Secondary', description: 'Advanced academics with Cambridge Lower Secondary framework. Students deepen their Islamic knowledge through Fiqh, Usul al-Fiqh, and Seerah studies.', duration: '3 years', level: 'Grade 6-8', icon: 'pen', hasDetailPage: true, sortOrder: 2 },
    { schoolId: school2.id, slug: 'cambridge-igcse-alevels', name: 'Cambridge IGCSE & A-Levels', description: 'Full Cambridge IGCSE and A-Level program with Islamic Studies diploma. Graduates earn internationally recognized qualifications alongside their Islamic credentials.', duration: '4 years', level: 'Grade 9-12', icon: 'scroll', hasDetailPage: true, sortOrder: 3 },
  ]).run();

  db.insert(classes).values([
    { schoolId: school2.id, slug: 'tahfeez-al-quran', name: 'Tahfeez Al-Quran', description: 'Intensive Quran memorization class with focus on Tajweed, Makharij, and Tafseer of memorized portions.', gradeLevel: 'All Levels', teacherName: 'Sheikh Abdul Rahman', capacity: 12, hasDetailPage: true, sortOrder: 0 },
    { schoolId: school2.id, slug: 'arabic-grammar-nahw-sarf', name: 'Arabic Grammar (Nahw & Sarf)', description: 'Classical Arabic grammar using the Ajrumiyyah text, developing reading and comprehension of Quranic and classical Arabic texts.', gradeLevel: 'Grade 6-8', teacherName: 'Ustadh Khalid Mansour', capacity: 18, hasDetailPage: true, sortOrder: 1 },
    { schoolId: school2.id, slug: 'cambridge-sciences', name: 'Cambridge Sciences', description: 'Biology, Chemistry, and Physics taught through the Cambridge framework with Islamic perspectives on creation and the natural world.', gradeLevel: 'Grade 9-10', teacherName: 'Dr. Amina Youssef', capacity: 20, hasDetailPage: true, sortOrder: 2 },
    { schoolId: school2.id, slug: 'fiqh-islamic-law', name: 'Fiqh & Islamic Law', description: 'Study of Hanafi and Shafii jurisprudence covering ibadah, muamalat, and contemporary issues facing Muslim youth.', gradeLevel: 'Grade 9-12', teacherName: 'Sheikh Bilal Ahmed', capacity: 25, hasDetailPage: true, sortOrder: 3 },
  ]).run();

  db.insert(blogPosts).values([
    { schoolId: school2.id, title: 'Reviving the House of Wisdom Spirit', slug: 'reviving-house-of-wisdom', content: 'The original Bayt al-Hikmah (House of Wisdom) in Baghdad was a beacon of knowledge during the Islamic Golden Age. Scholars of all backgrounds gathered to translate Greek, Persian, and Indian texts while making groundbreaking discoveries in mathematics, astronomy, and medicine.\n\nAt Darul Hikmah, we carry this torch forward. This year, our students launched the "Hikmah Research Initiative" — a student-led research program where Grade 10-12 students conduct original research projects that bridge Islamic scholarship and modern science.\n\nCurrent projects include studying the medical contributions of Ibn Sina and their relevance to modern pharmacology, analyzing Al-Khwarizmi\'s algorithms in the context of modern computer science, and exploring Islamic architecture\'s mathematical principles using 3D modeling.\n\nWe believe that the next generation of Muslim scientists, engineers, and scholars begins right here in our classrooms.', excerpt: 'Our student-led Hikmah Research Initiative bridges Islamic scholarship and modern science.', coverImageUrl: null, authorId: owner2.id, isPublished: true, publishedAt: new Date() },
    { schoolId: school2.id, title: 'Arabic Immersion Program — Year One Results', slug: 'arabic-immersion-results', content: 'Alhamdulillah, one year into our Arabic Immersion Program and the results are remarkable. 88% of our students in Grades 1-5 can now hold basic conversations in Arabic, read simple Arabic texts, and understand Quranic vocabulary.\n\nOur native Arabic-speaking teachers create an immersive environment where Arabic is the language of instruction for Islamic Studies, and students practice through daily conversation circles, Arabic storytelling sessions, and creative writing workshops.\n\nParents have reported that their children are now reading the Quran with understanding rather than just recitation — a goal we hold dear. Next year, we plan to extend the immersion program to middle school with advanced Arabic literature and rhetoric.', excerpt: '88% of our primary students achieved Arabic conversational fluency in just one year.', coverImageUrl: null, authorId: owner2.id, isPublished: true, publishedAt: new Date('2026-05-15') },
  ]).run();

  db.insert(faqs).values([
    { schoolId: school2.id, question: 'What curriculum do you follow?', answer: 'We follow the Cambridge International curriculum (Primary, Lower Secondary, IGCSE, and A-Levels) integrated with a comprehensive Islamic Studies program. This means our students earn internationally recognized qualifications while developing deep Islamic knowledge and Arabic fluency.', category: 'Academics', sortOrder: 0 },
    { schoolId: school2.id, question: 'Is Arabic taught to non-Arabic speakers?', answer: 'Absolutely. Our Arabic Immersion Program is designed for students of all backgrounds. We use a communicative approach with native-speaking teachers. Students begin with basic conversation and progress to reading classical Arabic texts. Within 2-3 years, most students achieve conversational fluency.', category: 'Academics', sortOrder: 1 },
    { schoolId: school2.id, question: 'What is the admission process?', answer: 'Our process includes: 1) Online application, 2) Academic assessment appropriate to age, 3) Quran reading assessment, 4) Arabic level evaluation, 5) Family interview with the principal, 6) Admission decision within 2 weeks. We welcome students from diverse Islamic backgrounds and those new to Islamic schooling.', category: 'Admissions', sortOrder: 2 },
    { schoolId: school2.id, question: 'Are boys and girls separated?', answer: 'Yes, from Grade 5 onwards, boys and girls have separate classrooms, prayer areas, and recreational spaces. They share common facilities like the library, science labs, and masjid during designated times. Our approach ensures a focused, comfortable learning environment in accordance with Islamic guidelines.', category: 'General', sortOrder: 3 },
    { schoolId: school2.id, question: 'What scholarships are available?', answer: 'We offer several scholarship categories: Hifz Scholarship (for students who have memorized 10+ Juz), Academic Merit Scholarship (based on entrance exam), Need-Based Financial Aid, and the Hikmah Excellence Award for outstanding community service. Scholarship applications are reviewed each semester.', category: 'Admissions', sortOrder: 4 },
  ]).run();

  // ═══════════════════════════════════════════════════════
  // COMPREHENSIVE MODULE DATA FOR AL-NOOR ISLAMIC ACADEMY
  // ═══════════════════════════════════════════════════════

  // Create teachers
  const [teacher1] = db.insert(users).values({
    email: 'ibrahim.musa@alnoor.edu',
    passwordHash: await bcrypt.hash('teacher123', 12),
    name: 'Sheikh Ibrahim Musa',
    role: 'teacher',
  }).returning().all();

  const [teacher2] = db.insert(users).values({
    email: 'fatima.zahra@alnoor.edu',
    passwordHash: await bcrypt.hash('teacher123', 12),
    name: 'Ustadha Fatima Zahra',
    role: 'teacher',
  }).returning().all();

  db.insert(schoolMembers).values([
    { schoolId: school1.id, userId: teacher1.id, role: 'teacher' },
    { schoolId: school1.id, userId: teacher2.id, role: 'teacher' },
  ]).run();

  // Create students
  const [student1] = db.insert(students).values({
    schoolId: school1.id,
    studentId: 'AN-2026-001',
    firstName: 'Ahmad',
    lastName: 'Al-Rashid',
    dateOfBirth: '2012-05-15',
    gender: 'male',
    email: 'ahmad.rashid@student.alnoor.edu',
    address: '123 Elm Street, Dearborn, MI',
    emergencyContactName: 'Omar Al-Rashid',
    emergencyContactPhone: '+1 (555) 111-2222',
    status: 'active',
    enrollmentDate: '2024-09-01',
  }).returning().all();

  const [student2] = db.insert(students).values({
    schoolId: school1.id,
    studentId: 'AN-2026-002',
    firstName: 'Aisha',
    lastName: 'Rahman',
    dateOfBirth: '2011-08-22',
    gender: 'female',
    email: 'aisha.rahman@student.alnoor.edu',
    address: '456 Oak Avenue, Dearborn, MI',
    emergencyContactName: 'Yusuf Rahman',
    emergencyContactPhone: '+1 (555) 333-4444',
    status: 'active',
    enrollmentDate: '2023-09-01',
  }).returning().all();

  const [student3] = db.insert(students).values({
    schoolId: school1.id,
    studentId: 'AN-2026-003',
    firstName: 'Ibrahim',
    lastName: 'Hassan',
    dateOfBirth: '2013-03-10',
    gender: 'male',
    email: 'ibrahim.hassan@student.alnoor.edu',
    address: '789 Pine Road, Dearborn, MI',
    emergencyContactName: 'Ali Hassan',
    emergencyContactPhone: '+1 (555) 555-6666',
    status: 'active',
    enrollmentDate: '2024-09-01',
  }).returning().all();

  // Enrollments
  db.insert(enrollments).values([
    { schoolId: school1.id, studentId: student1.id, classId: 1, academicYear: '2025-2026', term: 'Fall', status: 'accepted' },
    { schoolId: school1.id, studentId: student2.id, classId: 2, academicYear: '2025-2026', term: 'Fall', status: 'accepted' },
    { schoolId: school1.id, studentId: student3.id, classId: 1, academicYear: '2025-2026', term: 'Fall', status: 'accepted' },
  ]).run();

  // Attendance records
  const today = new Date().toISOString().split('T')[0];
  db.insert(attendance).values([
    { schoolId: school1.id, studentId: student1.id, date: today, period: '1', status: 'present', markedBy: teacher1.id },
    { schoolId: school1.id, studentId: student2.id, date: today, period: '1', status: 'present', markedBy: teacher1.id },
    { schoolId: school1.id, studentId: student3.id, date: today, period: '1', status: 'late', markedBy: teacher1.id, notes: 'Arrived 10 minutes late' },
  ]).run();

  // Courses
  const [course1] = db.insert(courses).values({
    schoolId: school1.id,
    title: 'Quran Memorization - Juz Amma',
    slug: 'quran-juz-amma',
    description: 'Comprehensive memorization program for Juz 30 with Tajweed rules',
    subject: 'Islamic Studies',
    gradeLevel: 'All Levels',
    teacherId: teacher1.id,
    status: 'published',
  }).returning().all();

  const [course2] = db.insert(courses).values({
    schoolId: school1.id,
    title: 'Arabic Language - Beginner',
    slug: 'arabic-beginner',
    description: 'Introduction to Arabic reading and writing using Noorani Qaida',
    subject: 'Arabic',
    gradeLevel: 'Grade 1-3',
    teacherId: teacher2.id,
    status: 'published',
  }).returning().all();

  // Course Units
  const [unit1] = db.insert(courseUnits).values({
    courseId: course1.id,
    title: 'Surah Al-Fatiha',
    description: 'Memorization and understanding of the opening chapter',
    sortOrder: 0,
  }).returning().all();

  const [unit2] = db.insert(courseUnits).values({
    courseId: course1.id,
    title: 'Short Surahs',
    description: 'Memorization of Surahs 112-114',
    sortOrder: 1,
  }).returning().all();

  // Lessons
  db.insert(lessons).values([
    { unitId: unit1.id, title: 'Recitation Practice', content: 'Listen to the recitation and repeat', type: 'video', sortOrder: 0 },
    { unitId: unit1.id, title: 'Tajweed Rules', content: 'Learn the basic Tajweed rules for Al-Fatiha', type: 'text', sortOrder: 1 },
    { unitId: unit2.id, title: 'Surah Al-Ikhlas', content: 'Memorization with proper pronunciation', type: 'video', sortOrder: 0 },
  ]).run();

  // Assignments
  const [assignment1] = db.insert(assignments).values({
    schoolId: school1.id,
    courseId: course1.id,
    title: 'Record Surah Al-Fatiha',
    instructions: 'Record yourself reciting Surah Al-Fatiha with proper Tajweed and upload the audio file',
    type: 'file_upload',
    dueDate: '2026-06-20',
    maxPoints: 100,
    allowLate: false,
  }).returning().all();

  // Quizzes
  const [quiz1] = db.insert(quizzes).values({
    schoolId: school1.id,
    courseId: course1.id,
    title: 'Tajweed Rules Quiz',
    description: 'Test your knowledge of basic Tajweed rules',
    timeLimit: 30,
    attempts: 2,
    passingScore: 70,
    status: 'published',
  }).returning().all();

  // Quiz Questions
  db.insert(questions).values([
    { quizId: quiz1.id, schoolId: school1.id, type: 'multiple_choice', question: 'What is the meaning of "Alhamdulillah"?', options: JSON.stringify(['All praise is due to Allah', 'Allah is Great', 'In the name of Allah']), correctAnswer: '0', points: 10, difficulty: 'easy' },
    { quizId: quiz1.id, schoolId: school1.id, type: 'true_false', question: 'Tajweed rules are optional in Quran recitation', options: JSON.stringify(['True', 'False']), correctAnswer: '1', points: 10, difficulty: 'easy' },
  ]).run();

  // Grades
  db.insert(grades).values([
    { schoolId: school1.id, studentId: student1.id, courseId: course1.id, term: 'Fall', academicYear: '2025-2026', category: 'Assignment', score: 95, maxScore: 100, grade: 'A', comment: 'Excellent Tajweed' },
    { schoolId: school1.id, studentId: student2.id, courseId: course1.id, term: 'Fall', academicYear: '2025-2026', category: 'Quiz', score: 85, maxScore: 100, grade: 'B+', comment: 'Good understanding' },
  ]).run();

  // Academic Periods
  db.insert(academicPeriods).values([
    { schoolId: school1.id, name: '2025-2026 Academic Year', type: 'year', startDate: '2025-09-01', endDate: '2026-06-15' },
    { schoolId: school1.id, name: 'Fall Semester 2025', type: 'semester', startDate: '2025-09-01', endDate: '2026-01-15' },
    { schoolId: school1.id, name: 'Spring Semester 2026', type: 'semester', startDate: '2026-01-20', endDate: '2026-06-15' },
  ]).run();

  // Bell Schedules
  db.insert(bellSchedules).values({
    schoolId: school1.id,
    name: 'Regular Schedule',
    periods: JSON.stringify([
      { name: 'Fajr Prayer', start: '06:30', end: '07:00' },
      { name: 'Period 1', start: '08:00', end: '08:50' },
      { name: 'Period 2', start: '09:00', end: '09:50' },
      { name: 'Dhuhr Prayer', start: '12:30', end: '13:00' },
      { name: 'Period 5', start: '13:15', end: '14:05' },
    ]),
  }).run();

  // Exam Series
  const [examSeries1] = db.insert(examSeries).values({
    schoolId: school1.id,
    name: 'Midterm Exams Fall 2025',
    type: 'midterm',
    academicYear: '2025-2026',
    term: 'Fall',
    startDate: '2025-11-10',
    endDate: '2025-11-14',
    status: 'scheduled',
  }).returning().all();

  // Exams
  const [exam1] = db.insert(exams).values({
    seriesId: examSeries1.id,
    subject: 'Quran Memorization',
    classId: 1,
    totalMarks: 100,
    passingMarks: 50,
    duration: 60,
    date: '2025-11-10',
    venue: 'Main Hall',
    invigilator: 'Sheikh Ibrahim Musa',
    instructions: 'Recite memorized surahs with proper Tajweed',
  }).returning().all();

  // Exam Results
  db.insert(examResults).values([
    { examId: exam1.id, studentId: student1.id, marksObtained: 92, grade: 'A', rank: 1, remark: 'Excellent memorization and Tajweed', status: 'present' },
    { examId: exam1.id, studentId: student3.id, marksObtained: 78, grade: 'B+', rank: 2, remark: 'Good progress', status: 'present' },
  ]).run();

  // Fee Structures
  const [feeStruct1] = db.insert(feeStructures).values({
    schoolId: school1.id,
    name: 'Primary School Tuition',
    gradeLevel: 'Grade 1-5',
    category: 'Tuition',
    items: JSON.stringify([
      { name: 'Tuition Fee', amount: 3500 },
      { name: 'Registration Fee', amount: 200 },
      { name: 'Books & Materials', amount: 300 },
    ]),
    totalAmount: 4000,
    frequency: 'termly',
    academicYear: '2025-2026',
  }).returning().all();

  // Invoices
  const [invoice1] = db.insert(invoices).values({
    schoolId: school1.id,
    studentId: student1.id,
    invoiceNumber: 'INV-2025-001',
    feeStructureId: feeStruct1.id,
    amount: 4000,
    discount: 200,
    fine: 0,
    paidAmount: 2000,
    balance: 1800,
    status: 'partial',
    dueDate: '2025-10-15',
  }).returning().all();

  // Payments
  db.insert(payments).values({
    invoiceId: invoice1.id,
    schoolId: school1.id,
    amount: 2000,
    method: 'stripe',
    reference: 'ch_1234567890',
    status: 'completed',
    notes: 'First installment',
  }).run();

  // Staff
  const [staff1] = db.insert(staff).values({
    schoolId: school1.id,
    userId: teacher1.id,
    staffId: 'STF-001',
    firstName: 'Ibrahim',
    lastName: 'Musa',
    department: 'Islamic Studies',
    designation: 'Senior Teacher',
    employmentType: 'full_time',
    email: 'ibrahim.musa@alnoor.edu',
    phone: '+1 (555) 777-8888',
    qualifications: JSON.stringify(['BA Islamic Studies', 'Ijazah in Quran']),
    joinDate: '2020-08-15',
    salary: 55000,
    status: 'active',
  }).returning().all();

  const [staff2] = db.insert(staff).values({
    schoolId: school1.id,
    userId: teacher2.id,
    staffId: 'STF-002',
    firstName: 'Fatima',
    lastName: 'Zahra',
    department: 'Arabic Language',
    designation: 'Arabic Teacher',
    employmentType: 'full_time',
    email: 'fatima.zahra@alnoor.edu',
    phone: '+1 (555) 999-0000',
    qualifications: JSON.stringify(['BA Arabic Literature', 'Teaching Certificate']),
    joinDate: '2021-09-01',
    salary: 48000,
    status: 'active',
  }).returning().all();

  // Leave Requests
  db.insert(leaveRequests).values({
    schoolId: school1.id,
    staffId: staff1.id,
    type: 'annual',
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    reason: 'Family vacation',
    status: 'approved',
    approvedBy: owner1.id,
  }).run();

  // Payroll
  db.insert(payroll).values({
    schoolId: school1.id,
    staffId: staff1.id,
    month: '06',
    year: 2026,
    basicSalary: 4583,
    allowances: JSON.stringify([{ name: 'Housing', amount: 500 }, { name: 'Transport', amount: 200 }]),
    deductions: JSON.stringify([{ name: 'Tax', amount: 650 }, { name: 'Pension', amount: 200 }]),
    grossPay: 5283,
    netPay: 4433,
    status: 'paid',
  }).run();

  // Messages
  db.insert(messages).values({
    schoolId: school1.id,
    senderId: owner1.id,
    recipientId: teacher1.id,
    subject: 'Parent Meeting Schedule',
    content: 'Assalamu Alaikum Sheikh Ibrahim, please schedule parent-teacher meetings for next week.',
    isRead: false,
  }).run();

  // Notifications
  db.insert(notifications).values([
    { schoolId: school1.id, userId: teacher1.id, type: 'info', title: 'Assignment Due', body: 'Quran recitation assignment due on June 20', channel: 'in_app', isRead: false },
    { schoolId: school1.id, userId: owner1.id, type: 'success', title: 'Payment Received', body: 'Invoice INV-2025-001 payment received', channel: 'in_app', isRead: true },
  ]).run();

  // Library Books
  const [book1] = db.insert(libraryBooks).values({
    schoolId: school1.id,
    title: 'The Noble Quran',
    author: 'Translation by Saheeh International',
    isbn: '978-9960740799',
    publisher: 'Dar Abul-Qasim',
    genre: 'Religious',
    category: 'Islamic Studies',
    description: 'Complete Quran with English translation',
    totalCopies: 50,
    availableCopies: 45,
    shelfLocation: 'A1',
    barcode: 'BOOK001',
    price: 25,
  }).returning().all();

  const [book2] = db.insert(libraryBooks).values({
    schoolId: school1.id,
    title: 'Stories of the Prophets',
    author: 'Ibn Kathir',
    isbn: '978-9960789439',
    publisher: 'Dar Ibn Kathir',
    genre: 'History',
    category: 'Islamic History',
    description: 'Comprehensive stories of all Prophets mentioned in the Quran',
    totalCopies: 20,
    availableCopies: 18,
    shelfLocation: 'B3',
    barcode: 'BOOK002',
    price: 35,
  }).returning().all();

  // Library Loans
  db.insert(libraryLoans).values({
    schoolId: school1.id,
    bookId: book1.id,
    borrowerId: teacher1.id,
    issuedBy: owner1.id,
    issueDate: '2026-06-01',
    dueDate: '2026-06-15',
    status: 'active',
  }).run();

  // Hostels
  const [hostel1] = db.insert(hostels).values({
    schoolId: school1.id,
    name: 'Boys Dormitory',
    type: 'boys',
    wardenId: owner1.id,
    totalRooms: 20,
    totalBeds: 40,
  }).returning().all();

  // Hostel Rooms
  const [room1] = db.insert(hostelRooms).values({
    hostelId: hostel1.id,
    roomNumber: '101',
    floor: 1,
    type: 'double',
    capacity: 2,
    occupants: 1,
    status: 'available',
  }).returning().all();

  // Vehicles
  const [vehicle1] = db.insert(vehicles).values({
    schoolId: school1.id,
    name: 'School Bus 1',
    plateNumber: 'ABC-1234',
    type: 'bus',
    capacity: 40,
    status: 'active',
  }).returning().all();

  // Transport Routes
  const [route1] = db.insert(transportRoutes).values({
    schoolId: school1.id,
    name: 'Route A - Downtown',
    vehicleId: vehicle1.id,
    stops: JSON.stringify([
      { name: 'Main Street', time: '07:30' },
      { name: 'Oak Avenue', time: '07:45' },
      { name: 'School', time: '08:00' },
    ]),
  }).returning().all();

  // Assets
  db.insert(assets).values([
    { schoolId: school1.id, name: 'MacBook Pro', category: 'Electronics', serialNumber: 'MBP2026001', purchaseDate: '2025-08-01', purchasePrice: 2500, currentValue: 2200, location: 'IT Lab', condition: 'good' },
    { schoolId: school1.id, name: 'Projector', category: 'Electronics', serialNumber: 'PRJ2026001', purchaseDate: '2025-01-15', purchasePrice: 800, currentValue: 700, location: 'Classroom 101', condition: 'good' },
  ]).run();

  // Inventory Items
  db.insert(inventoryItems).values([
    { schoolId: school1.id, name: 'A4 Paper Reams', category: 'Stationery', quantity: 50, reorderLevel: 10, unit: 'ream', supplier: 'Office Supplies Co' },
    { schoolId: school1.id, name: 'Whiteboard Markers', category: 'Stationery', quantity: 100, reorderLevel: 20, unit: 'piece', supplier: 'Office Supplies Co' },
  ]).run();

  // Events
  db.insert(events).values([
    { schoolId: school1.id, title: 'Annual Quran Competition', description: 'Inter-school Quran memorization competition', category: 'academic', startDate: '2026-07-20', startTime: '09:00', endTime: '15:00', venue: 'Main Auditorium', audience: JSON.stringify(['students', 'parents', 'staff']), rsvpRequired: true },
    { schoolId: school1.id, title: 'Parent-Teacher Meeting', description: 'Quarterly progress discussion', category: 'meeting', startDate: '2026-06-25', startTime: '14:00', endTime: '17:00', venue: 'Classrooms', audience: JSON.stringify(['parents', 'teachers']), rsvpRequired: false },
  ]).run();

  // Behavior Logs
  db.insert(behaviorLogs).values([
    { schoolId: school1.id, studentId: student1.id, type: 'positive', category: 'Academic Excellence', description: 'Completed Quran memorization goal ahead of schedule', points: 10, recordedBy: teacher1.id },
    { schoolId: school1.id, studentId: student2.id, type: 'positive', category: 'Helpfulness', description: 'Helped younger students with Arabic reading', points: 5, recordedBy: teacher2.id },
  ]).run();

  // Lesson Plans
  db.insert(lessonPlans).values({
    schoolId: school1.id,
    teacherId: teacher1.id,
    courseId: course1.id,
    title: 'Week 1 - Introduction to Tajweed',
    week: '2026-W01',
    objectives: 'Students will learn basic Tajweed rules for Noon Sakinah',
    materials: 'Quran, whiteboard, audio recordings',
    activities: 'Listen, practice, peer review',
    assessment: 'Oral recitation test',
    status: 'approved',
  }).run();

  // Module Settings
  db.insert(moduleSettings).values([
    { schoolId: school1.id, module: 'sis', enabled: true, settings: JSON.stringify({}) },
    { schoolId: school1.id, module: 'lms', enabled: true, settings: JSON.stringify({}) },
    { schoolId: school1.id, module: 'finance', enabled: true, settings: JSON.stringify({ paymentGateways: ['stripe'] }) },
    { schoolId: school1.id, module: 'library', enabled: true, settings: JSON.stringify({ loanPeriod: 14 }) },
  ]).run();

  // CBT Exams
  const [cbtExam1] = db.insert(cbtExams).values({
    schoolId: school1.id,
    title: 'Arabic Vocabulary Test',
    description: 'Test your Arabic vocabulary knowledge',
    instructions: 'Read each question carefully and select the correct answer',
    type: 'academic',
    duration: 45,
    totalMarks: 50,
    accessMode: 'restricted',
    scheduledStart: '2026-06-30T10:00:00Z',
    scheduledEnd: '2026-06-30T11:00:00Z',
    maxAttempts: 1,
    lockdown: true,
    proctoring: false,
    status: 'published',
  }).returning().all();

  // CBT Candidates
  db.insert(cbtCandidates).values([
    { examId: cbtExam1.id, userId: teacher1.id, name: 'Ahmad Al-Rashid', email: 'ahmad.rashid@student.alnoor.edu', accessPin: 'PIN123', status: 'registered' },
    { examId: cbtExam1.id, userId: student2.userId, name: 'Aisha Rahman', email: 'aisha.rahman@student.alnoor.edu', accessPin: 'PIN456', status: 'registered' },
  ]).run();

  // Audit Logs
  db.insert(auditLogs).values([
    { schoolId: school1.id, userId: owner1.id, action: 'LOGIN', entity: 'user', details: JSON.stringify({ ip: '192.168.1.1' }), ipAddress: '192.168.1.1' },
    { schoolId: school1.id, userId: teacher1.id, action: 'CREATE_COURSE', entity: 'course', entityId: course1.id, details: JSON.stringify({ course: 'Quran Memorization' }), ipAddress: '192.168.1.10' },
  ]).run();

  // Notification Templates
  db.insert(notificationTemplates).values([
    { schoolId: school1.id, name: 'Attendance Alert', channel: 'sms', body: 'Your child {{studentName}} was marked {{status}} today.', variables: JSON.stringify(['studentName', 'status']) },
    { schoolId: school1.id, name: 'Fee Reminder', channel: 'email', subject: 'Fee Payment Reminder', body: 'Dear parent, this is a reminder that invoice {{invoiceNumber}} is due on {{dueDate}}.', variables: JSON.stringify(['invoiceNumber', 'dueDate']) },
  ]).run();

  // Banners
  db.insert(banners).values([
    { schoolId: school1.id, title: 'Admissions Open 2026-27', subtitle: 'Apply now for the upcoming academic year', imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200', linkUrl: '/admissions', linkText: 'Apply Now', position: 'hero', displayPages: JSON.stringify(['all']), isActive: true, sortOrder: 0 },
    { schoolId: school1.id, title: 'Annual Quran Competition', subtitle: 'Register by June 30th', imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=1200', linkUrl: '/announcements', linkText: 'Learn More', position: 'top', displayPages: JSON.stringify(['all']), isActive: true, sortOrder: 1 },
    { schoolId: school1.id, title: 'New STEM Lab Now Open', imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200', linkUrl: '/about', linkText: 'See Details', position: 'sidebar', displayPages: JSON.stringify(['/about', '/programs']), isActive: true, sortOrder: 2 },
  ]).run();

  // Popups
  db.insert(popups).values([
    { schoolId: school1.id, title: 'Welcome to Al-Noor!', content: 'We are accepting applications for the 2026-27 academic year. Schedule a campus visit today.', imageUrl: null, linkUrl: '/admissions', linkText: 'Schedule Visit', triggerType: 'on_load', triggerDelay: 3, displayFrequency: 'once_per_session', displayPages: JSON.stringify(['all']), isActive: true },
    { schoolId: school1.id, title: 'Open House This Saturday', content: 'Join us for an open house event this Saturday at 10 AM. Meet our teachers and tour the campus.', linkUrl: '/events', linkText: 'RSVP Now', triggerType: 'timed', triggerDelay: 30, displayFrequency: 'once_per_day', displayPages: JSON.stringify(['all']), isActive: true },
    { schoolId: school1.id, title: 'Newsletter Signup', content: 'Stay updated with our monthly newsletter. Get news about events, achievements, and more.', triggerType: 'scroll', triggerDelay: 50, displayFrequency: 'every_visit', displayPages: JSON.stringify(['all']), isActive: false },
  ]).run();

  // Gallery Albums
  const [campusAlbum] = db.insert(galleryAlbums).values({
    schoolId: school1.id, name: 'Main Campus', slug: 'main-campus', description: 'Our beautiful 15-acre campus featuring modern classrooms, science labs, and a dedicated masjid.', type: 'campus', coverImageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800', isPublished: true, sortOrder: 0,
  }).returning().all();

  const [facilitiesAlbum] = db.insert(galleryAlbums).values({
    schoolId: school1.id, name: 'Sports & Recreation', slug: 'sports-facilities', description: 'State-of-the-art sports facilities including indoor gym, football field, and swimming pool.', type: 'facilities', coverImageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800', isPublished: true, sortOrder: 1,
  }).returning().all();

  const [studentsAlbum] = db.insert(galleryAlbums).values({
    schoolId: school1.id, name: 'Student Life', slug: 'student-life', description: 'Moments from daily life, classroom activities, and student achievements.', type: 'students', coverImageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800', isPublished: true, sortOrder: 2,
  }).returning().all();

  const [activitiesAlbum] = db.insert(galleryAlbums).values({
    schoolId: school1.id, name: 'Events & Activities', slug: 'events-activities', description: 'Annual events, field trips, science fairs, and cultural celebrations.', type: 'activities', coverImageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800', isPublished: true, sortOrder: 3,
  }).returning().all();

  // Gallery Items
  db.insert(galleryItems).values([
    { schoolId: school1.id, albumId: campusAlbum.id, title: 'Main Building Entrance', imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600', caption: 'The grand entrance to our main academic building', category: 'Campus', sortOrder: 0 },
    { schoolId: school1.id, albumId: campusAlbum.id, title: 'Science Laboratory', imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600', caption: 'Our new STEM lab with robotics equipment', category: 'Campus', sortOrder: 1 },
    { schoolId: school1.id, albumId: campusAlbum.id, title: 'School Masjid', imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c159?w=600', caption: 'Our on-campus masjid for daily prayers', category: 'Campus', sortOrder: 2 },
    { schoolId: school1.id, albumId: facilitiesAlbum.id, title: 'Indoor Sports Hall', imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600', caption: 'Multi-purpose indoor sports facility', category: 'Facilities', sortOrder: 0 },
    { schoolId: school1.id, albumId: facilitiesAlbum.id, title: 'Library', imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600', caption: 'Our well-stocked library with over 10,000 titles', category: 'Facilities', sortOrder: 1 },
    { schoolId: school1.id, albumId: studentsAlbum.id, title: 'Classroom Learning', imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600', caption: 'Students engaged in collaborative learning', category: 'Students', sortOrder: 0 },
    { schoolId: school1.id, albumId: studentsAlbum.id, title: 'Quran Recitation', imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600', caption: 'Daily Quran recitation session', category: 'Students', sortOrder: 1 },
    { schoolId: school1.id, albumId: activitiesAlbum.id, title: 'Science Fair 2026', imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600', caption: 'Students presenting at the annual science fair', category: 'Activities', sortOrder: 0 },
    { schoolId: school1.id, albumId: activitiesAlbum.id, title: 'Graduation Ceremony', imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600', caption: 'Class of 2026 graduation celebration', category: 'Activities', sortOrder: 1 },
  ]).run();

  // Virtual Tours
  db.insert(virtualTours).values([
    { schoolId: school1.id, title: 'Main Campus 360° Tour', description: 'Take a virtual walk through our beautiful campus. Explore classrooms, labs, the masjid, and outdoor spaces.', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnailUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600', location: 'Main Campus', isPublished: true, sortOrder: 0 },
    { schoolId: school1.id, title: 'Science Lab Virtual Tour', description: 'Explore our state-of-the-art STEM laboratory with robotics and 3D printing stations.', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnailUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600', location: 'STEM Building', isPublished: true, sortOrder: 1 },
  ]).run();

  console.log('Seed data created successfully.');

  // ═══════════════════════════════════════════════════════
  // PLATFORM BILLING & SUBSCRIPTIONS SEED DATA
  // ═══════════════════════════════════════════════════════

  const [freePlan] = db.insert(subscriptionPlans).values({
    name: 'Free', slug: 'free', description: 'Perfect for trying out iSchool with basic features.',
    monthlyPrice: 0, annualPrice: 0, currency: 'USD', billingCycle: 'both',
    maxSchools: 1, maxStudents: 50, maxStaff: 5, maxStorage: 200,
    isFree: true, isPopular: false, trialDays: 0, sortOrder: 0, isActive: true,
    customDomain: false, apiAccess: false, prioritySupport: false, whiteLabel: false,
    features: JSON.stringify(['1 school website', 'Basic CMS modules', '3 themes', 'Contact forms', 'Mobile responsive', 'Community support', 'Basic AI assistant (10 queries/day)', '5 support tickets/month', 'CSV export (limited)']),
    moduleAccess: JSON.stringify(['cms', 'sis', 'lms', 'communication']),
  }).returning().all();

  const [starterPlan] = db.insert(subscriptionPlans).values({
    name: 'Starter', slug: 'starter', description: 'For small schools getting started with digital management.',
    monthlyPrice: 2900, annualPrice: 27800, currency: 'USD', billingCycle: 'both',
    maxSchools: 1, maxStudents: 200, maxStaff: 20, maxStorage: 1000,
    isFree: false, isPopular: false, trialDays: 14, sortOrder: 1, isActive: true,
    customDomain: false, apiAccess: false, prioritySupport: false, whiteLabel: false,
    features: JSON.stringify(['Everything in Free', 'Up to 200 students', '16 modules', 'All 60 themes', 'Blog with unlimited posts', 'Fee management', 'Email support', 'AI assistant (100 queries/day)', 'Unlimited support tickets', 'CSV export & import', 'Attendance & grading', 'Timetable management', 'Basic analytics']),
    moduleAccess: JSON.stringify(['cms', 'sis', 'lms', 'timetable', 'exams', 'finance', 'hr', 'communication', 'library', 'events', 'classroom', 'analytics']),
  }).returning().all();

  const [growthPlan] = db.insert(subscriptionPlans).values({
    name: 'Growth', slug: 'growth', description: 'For growing schools that need more power and advanced features.',
    monthlyPrice: 4900, annualPrice: 47000, currency: 'USD', billingCycle: 'both',
    maxSchools: 2, maxStudents: 500, maxStaff: 50, maxStorage: 3000,
    isFree: false, isPopular: false, trialDays: 14, sortOrder: 2, isActive: true,
    customDomain: false, apiAccess: true, prioritySupport: false, whiteLabel: false,
    features: JSON.stringify(['Everything in Starter', 'Up to 500 students', '2 schools', 'e-Exam & CBT module', 'Transport module', 'Hostel module', 'AI assistant (unlimited)', 'Priority email support', 'API access (basic)', 'Advanced reports & charts', 'Automated notifications', 'Parent portal', 'Live classes', 'File uploads (3GB)']),
    moduleAccess: JSON.stringify(['cms', 'sis', 'lms', 'timetable', 'exams', 'finance', 'hr', 'communication', 'library', 'hostel', 'transport', 'events', 'classroom', 'analytics', 'cbt']),
  }).returning().all();

  const [proPlan] = db.insert(subscriptionPlans).values({
    name: 'Professional', slug: 'professional', description: 'For established schools that need full power and flexibility.',
    monthlyPrice: 7900, annualPrice: 75800, currency: 'USD', billingCycle: 'both',
    maxSchools: 3, maxStudents: 1000, maxStaff: 100, maxStorage: 5000,
    isFree: false, isPopular: true, trialDays: 14, sortOrder: 3, isActive: true,
    customDomain: true, apiAccess: true, prioritySupport: true, whiteLabel: false,
    features: JSON.stringify(['Everything in Growth', 'Up to 1000 students', '3 schools', 'Custom domain', 'Full API access', 'Priority support (chat + email)', 'Inventory management', 'IT admin module', 'Custom branding', 'Advanced analytics dashboard', 'Automated backups (daily)', 'Dark mode', 'Multi-language (21 languages)', 'Dedicated AI tools (46 tools)', 'Support ticket SLA']),
    moduleAccess: JSON.stringify(['cms', 'sis', 'lms', 'timetable', 'exams', 'finance', 'hr', 'communication', 'library', 'hostel', 'transport', 'inventory', 'events', 'classroom', 'analytics', 'it-admin', 'cbt']),
  }).returning().all();

  const [enterprisePlan] = db.insert(subscriptionPlans).values({
    name: 'Enterprise', slug: 'enterprise', description: 'For school groups, districts, and custom requirements.',
    monthlyPrice: 19900, annualPrice: 191000, currency: 'USD', billingCycle: 'both',
    maxSchools: 50, maxStudents: 10000, maxStaff: 500, maxStorage: 50000,
    isFree: false, isPopular: false, trialDays: 30, sortOrder: 4, isActive: true,
    customDomain: true, apiAccess: true, prioritySupport: true, whiteLabel: true,
    features: JSON.stringify(['Everything in Professional', 'Up to 10,000 students', 'Up to 50 schools', 'White label branding', 'Dedicated account manager', 'SLA guarantee (99.9% uptime)', 'Custom integrations', 'Onboarding assistance', 'Advanced security (SSO, audit logs)', 'Bulk data import', 'Custom AI training', 'Automated backups (twice daily, cloud)', 'Priority phone support', 'Custom module development', 'Dedicated infrastructure']),
    moduleAccess: JSON.stringify(['cms', 'sis', 'lms', 'timetable', 'exams', 'finance', 'hr', 'communication', 'library', 'hostel', 'transport', 'inventory', 'events', 'classroom', 'analytics', 'it-admin', 'cbt']),
  }).returning().all();

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  db.insert(schoolSubscriptions).values([
    { schoolId: school1.id, planId: proPlan.id, status: 'active', billingCycle: 'annual', currentPeriodStart: now.toISOString(), currentPeriodEnd: periodEnd.toISOString(), autoRenew: true },
    { schoolId: school2.id, planId: growthPlan.id, status: 'active', billingCycle: 'annual', currentPeriodStart: now.toISOString(), currentPeriodEnd: periodEnd.toISOString(), autoRenew: true },
  ]).run();

  const ticketCats = [
    { name: 'Technical Support', description: 'Issues with the platform, bugs, or technical questions', icon: '🔧', slug: 'technical' },
    { name: 'Billing & Payments', description: 'Questions about invoices, payments, or subscription', icon: '💳', slug: 'billing' },
    { name: 'Account & Access', description: 'Login issues, password reset, or account management', icon: '🔑', slug: 'account' },
    { name: 'Feature Request', description: 'Suggestions for new features or improvements', icon: '💡', slug: 'feature-request' },
    { name: 'Training & Onboarding', description: 'Help getting started or training for staff', icon: '🎓', slug: 'training' },
    { name: 'Data & Reports', description: 'Questions about data, exports, or reports', icon: '📊', slug: 'data' },
    { name: 'Integration', description: 'Questions about connecting with other systems', icon: '🔗', slug: 'integration' },
    { name: 'General Inquiry', description: 'Any other questions or feedback', icon: '📩', slug: 'general' },
  ];

  for (const cat of ticketCats) {
    db.insert(schoolTicketCategories).values([
      { schoolId: school1.id, name: cat.name, description: cat.description, icon: cat.icon, isPublic: 1, sortOrder: ticketCats.indexOf(cat) },
      { schoolId: school2.id, name: cat.name, description: cat.description, icon: cat.icon, isPublic: 1, sortOrder: ticketCats.indexOf(cat) },
    ]).run();
  }

  db.insert(aiSettings).values([
    { schoolId: school1.id, key: 'conversation_retention_days', value: '90' },
    { schoolId: school1.id, key: 'ticket_sla_hours', value: '24' },
    { schoolId: school1.id, key: 'autonomous_mode', value: 'true' },
    { schoolId: school1.id, key: 'pii_stripping', value: 'true' },
    { schoolId: school2.id, key: 'conversation_retention_days', value: '90' },
    { schoolId: school2.id, key: 'ticket_sla_hours', value: '48' },
    { schoolId: school2.id, key: 'autonomous_mode', value: 'false' },
    { schoolId: school2.id, key: 'pii_stripping', value: 'true' },
  ]).run();

  db.insert(coupons).values([
    { code: 'WELCOME20', name: 'Welcome 20% Off', description: '20% discount for new subscribers on any paid plan.', type: 'percentage', value: 20, minAmount: 0, maxDiscount: 5000, applicablePlans: JSON.stringify([]), maxUses: 100, currentUses: 5, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true, createdBy: admin.id },
    { code: 'EDU50', name: 'Education Discount', description: '$50 off annual subscriptions for verified educational institutions.', type: 'fixed', value: 5000, minAmount: 5000, applicablePlans: JSON.stringify([]), maxUses: 50, currentUses: 2, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true, createdBy: admin.id },
    { code: 'FREEYEAR', name: 'Free Year - Partner', description: 'Full year free for strategic partner schools.', type: 'free_trial', value: 100, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true, maxUses: 10, currentUses: 0, createdBy: admin.id },
  ]).run();

  db.insert(platformFaqs).values([
    { question: 'What is iSchool?', answer: 'iSchool is an all-in-one school management platform with 16 integrated modules covering student information, learning management, finance, HR, library, exams, and more. It provides both a public-facing school website and a powerful admin dashboard.', category: 'General', sortOrder: 0, isPublished: true },
    { question: 'How many schools can I manage with one account?', answer: 'This depends on your plan. The Free plan supports 1 school, Starter supports 1 school, Professional supports up to 3 schools, and Enterprise supports up to 50 schools. Custom limits are available on request.', category: 'Plans & Pricing', sortOrder: 1, isPublished: true },
    { question: 'Is there a free trial?', answer: 'Yes! All paid plans include a 14-day free trial (30 days for Enterprise). No credit card is required to start. You get full access to all features during the trial period.', category: 'Plans & Pricing', sortOrder: 2, isPublished: true },
    { question: 'What payment methods do you accept?', answer: 'We accept credit/debit cards via Stripe, PayPal, Paystack (for Nigeria, Ghana, South Africa), Flutterwave (Africa-wide), bank transfers, and coupon codes. All payments are processed securely with 256-bit SSL encryption.', category: 'Billing', sortOrder: 3, isPublished: true },
    { question: 'Can I switch plans at any time?', answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, the price difference is prorated. When downgrading, the credit is applied to your next billing cycle.', category: 'Billing', sortOrder: 4, isPublished: true },
    { question: 'How does the coupon/voucher system work?', answer: 'You can apply a coupon code during checkout for percentage discounts, fixed amount discounts, or free trial extensions. Coupons are validated against plan eligibility, usage limits, and expiration dates. Admin can create and manage coupons from the platform admin.', category: 'Billing', sortOrder: 5, isPublished: true },
    { question: 'Is my school data secure?', answer: 'Absolutely. We use enterprise-grade security including 256-bit SSL encryption, secure session management, regular backups, and role-based access control. Our platform follows OWASP security best practices and GDPR guidelines.', category: 'Security', sortOrder: 6, isPublished: true },
    { question: 'Can I use my own domain name?', answer: 'Yes, custom domains are available on the Professional and Enterprise plans. You can point your domain (e.g., school.yourdomain.com) to your iSchool website with simple DNS configuration.', category: 'Features', sortOrder: 7, isPublished: true },
    { question: 'What themes are available?', answer: 'We offer 21 professionally designed themes: Aurora, Bloom, Campus, Cascade, Ember, Harmony, Heritage, Horizon, Luxe, Mosaic, Nova, Oasis, Prestige, Prism, Pulse, Scholar, Serenity, Slate, Spark, Vivid, and Zenith. Each is fully customizable with your school colors and branding.', category: 'Features', sortOrder: 8, isPublished: true },
    { question: 'Do you offer API access?', answer: 'Yes, API access is available on Professional and Enterprise plans. This allows you to integrate iSchool with your existing systems, build custom applications, or automate data flows.', category: 'Features', sortOrder: 9, isPublished: true },
    { question: 'How do I get support?', answer: 'Free plan users get community support. Starter plan includes email support. Professional plan includes priority email and chat support. Enterprise plan includes a dedicated account manager, phone support, and SLA guarantees.', category: 'Support', sortOrder: 10, isPublished: true },
    { question: 'Can I import existing school data?', answer: 'Yes, we support bulk data import for students, staff, courses, and other records. The Enterprise plan includes onboarding assistance with our team handling the migration for you.', category: 'Features', sortOrder: 11, isPublished: true },
  ]).run();

  db.insert(platformSettings).values([
    { key: 'platform_name', value: 'iSchool', type: 'string', category: 'general', description: 'Platform display name' },
    { key: 'support_email', value: 'support@ischool.com', type: 'string', category: 'general', description: 'Support contact email' },
    { key: 'default_trial_days', value: '14', type: 'number', category: 'billing', description: 'Default trial period in days' },
    { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'system', description: 'Enable maintenance mode' },
    { key: 'supported_gateways', value: JSON.stringify(['stripe', 'paypal', 'paystack', 'flutterwave', 'coupon', 'bank_transfer']), type: 'json', category: 'billing', description: 'Active payment gateways' },
  ]).run();

  db.insert(platformBlogPosts).values([
    { title: 'Introducing iSchool 2.0: 16 Modules, One Platform', slug: 'introducing-ischool-2', content: 'We are thrilled to announce iSchool 2.0 — a complete school management platform with 16 integrated modules.\n\nFrom Student Information Systems to e-Exam & CBT, from Finance management to Hostel management, iSchool now covers every aspect of school administration in one unified platform.\n\nKey highlights include:\n- 16 fully integrated modules\n- 21 beautiful themes\n- Multiple payment gateways (Stripe, PayPal, Paystack, Flutterwave)\n- Enterprise-grade security\n- Mobile-first design\n\nWhether you run a small primary school or a large school district, iSchool has a plan that fits your needs. Start with our free plan and upgrade as you grow.', excerpt: 'The biggest update yet — 16 modules, 21 themes, and enterprise-grade features for schools of all sizes.', category: 'Product Updates', tags: JSON.stringify(['release', 'modules', 'platform']), isPublished: true, publishedAt: new Date(), authorId: admin.id },
    { title: 'How to Choose the Right School Management Software', slug: 'choosing-school-management-software', content: 'Selecting the right school management software is one of the most important decisions a school administrator can make. Here are the key factors to consider:\n\n1. **Comprehensive Modules**: Look for a platform that covers student records, academics, finance, HR, and communication — not just one area.\n\n2. **Ease of Use**: Your staff should be able to start using the system quickly without extensive training.\n\n3. **Mobile-Friendly**: Parents and teachers need access on their phones. Ensure the platform is truly mobile-responsive.\n\n4. **Payment Integration**: Fee collection should be seamless with support for local and international payment gateways.\n\n5. **Scalability**: Choose a platform that grows with your school. You should be able to add more students, staff, and even additional schools without switching platforms.\n\n6. **Security**: Student data is sensitive. Ensure the platform follows security best practices including encryption, access controls, and regular backups.\n\niSchool addresses all these requirements and more, with a free plan to get started.', excerpt: 'Key factors to consider when selecting school management software for your institution.', category: 'Guides', tags: JSON.stringify(['guide', 'comparison', 'selection']), isPublished: true, publishedAt: new Date('2026-05-15'), authorId: admin.id },
    { title: '5 Ways Digital Tools Improve Student Outcomes', slug: 'digital-tools-improve-student-outcomes', content: 'Technology in education is not just about convenience — it directly impacts student success. Here are five evidence-based ways digital school management tools improve outcomes:\n\n1. **Real-time Progress Tracking**: When teachers can instantly see which students are struggling, interventions happen earlier. Our LMS module provides real-time grade and attendance dashboards.\n\n2. **Automated Parent Communication**: Research shows that parental involvement is one of the strongest predictors of student success. Automated notifications keep parents informed without adding teacher workload.\n\n3. **Data-Driven Instruction**: Analytics tools help teachers identify curriculum areas where classes are struggling, enabling targeted instruction adjustments.\n\n4. **Reduced Administrative Burden**: When teachers spend less time on paperwork, they spend more time teaching. Automated attendance, grading, and reporting give teachers back valuable hours.\n\n5. **Consistent Record-Keeping**: Digital records ensure no student falls through the cracks. Transfer students, attendance patterns, and academic history are always accessible.', excerpt: 'Evidence-based ways that digital school management tools directly improve student academic outcomes.', category: 'Education', tags: JSON.stringify(['education', 'technology', 'outcomes']), isPublished: true, publishedAt: new Date('2026-04-20'), authorId: admin.id },
  ]).run();

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  iSchool Seed Data — Testing Credentials');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('Platform Admin (ENV-based, see .env):');
  console.log('  admin@ischool.com / Admin@iSchool2026');
  console.log('  superadmin@ischool.com / Super@iSchool2026');
  console.log('');
  console.log('Al-Noor Islamic Academy (Professional Plan):');
  console.log('  Admin:    principal@alnoor.edu / school123');
  console.log('  Teacher:  ibrahim.musa@alnoor.edu / teacher123');
  console.log('  Teacher:  fatima.zahra@alnoor.edu / teacher123');
  console.log('  Public:   /alnoor');
  console.log('  Support:  /alnoor/support');
  console.log('');
  console.log('Darul Hikmah School (Growth Plan):');
  console.log('  Admin:    principal@darulhikmah.edu / school123');
  console.log('  Public:   /darulhikmah');
  console.log('  Support:  /darulhikmah/support');
  console.log('');
  console.log('═══════════════════════════════════════════════');
}

seed().catch(console.error);
