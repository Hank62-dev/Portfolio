// Project data model.
//
//   tier    'featured' → editorial list on the home page, own detail page
//           'lab'      → experiments / studies, own detail page
//           'archive'  → one row in the "also built" table
//   layers  technologies per layer; the Stack section is derived from these
//   Bilingual fields use { en, vi }.
//
// Every claim below was checked against the repository (README, manifest or file tree)
// on 2026-10-17. Fields that could not be verified are left out, not guessed.
// Old numeric ids (1–6) are kept so previously shared /projects/:id links still resolve.

export const LAYERS = ['interface', 'service', 'data', 'delivery'];

const gh = (repo) => `https://github.com/Hank62-dev/${repo}`;

export const projects = [
  {
    id: 1,
    slug: 'smart-center',
    tier: 'featured',
    name: 'SmartCenter',
    year: 2026,
    kind: { en: 'Team project · Learning platform', vi: 'Dự án nhóm · Nền tảng học tập' },
    tagline: {
      en: 'An online learning platform: courses, exams, enrollment and payments.',
      vi: 'Nền tảng học trực tuyến: khóa học, thi, ghi danh và thanh toán.',
    },
    summary: {
      en: 'A team-built learning management system. The API covers courses, lessons and sections, exam papers with grading, enrollment, cart and orders, reviews, consultation requests and a staff and admin back office — 23 controllers in total.',
      vi: 'Hệ thống quản lý học tập do cả nhóm xây dựng. API bao gồm khóa học, bài học, đề thi và chấm điểm, ghi danh, giỏ hàng và đơn hàng, đánh giá, yêu cầu tư vấn và khu vực quản trị cho nhân viên — tổng cộng 23 controller.',
    },
    role: {
      en: 'Most commits on the backend repository (206 of 271, three contributors). A few commits on the frontend, which teammates wrote for the most part.',
      vi: 'Nhiều commit nhất ở repo backend (206/271, ba người đóng góp). Có vài commit ở frontend, phần lớn do các bạn trong nhóm viết.',
    },
    decisions: [
      {
        en: 'Three-layer .NET 8 backend (API / repository) on PostgreSQL, with JWT authentication, a global exception-handling middleware and Swagger docs.',
        vi: 'Backend .NET 8 ba tầng (API / repository) trên PostgreSQL, có xác thực JWT, middleware xử lý lỗi toàn cục và tài liệu Swagger.',
      },
      {
        en: 'Containerised with Docker; a GitHub Actions workflow publishes the image to Docker Hub.',
        vi: 'Đóng gói bằng Docker; workflow GitHub Actions đẩy image lên Docker Hub.',
      },
      {
        en: 'Frontend is organised by feature (courses, exam, cart, orders, consultation…) with React Query for server state and Zustand for client state.',
        vi: 'Frontend tổ chức theo tính năng (courses, exam, cart, orders, consultation…), dùng React Query cho server state và Zustand cho client state.',
      },
    ],
    layers: {
      interface: ['React', 'TypeScript', 'TanStack Query', 'Zustand', 'Zod', 'Tailwind CSS'],
      service: ['ASP.NET Core', 'JWT', 'Swagger'],
      data: ['PostgreSQL'],
      delivery: ['Docker', 'GitHub Actions', 'Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://fe-smart-center.vercel.app/' },
      { label: 'Backend', url: 'https://github.com/SmartCenter-System/BE_SmartCenter' },
      { label: 'Frontend', url: 'https://github.com/SmartCenter-System/FE_SmartCenter' },
    ],
    cover: null,
  },
  {
    id: 7,
    slug: 'cham-y',
    tier: 'featured',
    name: 'Chạm Ý',
    year: 2026,
    kind: { en: 'Full-stack · Custom e-commerce', vi: 'Full-stack · Thương mại điện tử tùy biến' },
    tagline: {
      en: 'A shop for personalised handmade keychains, with its own admin dashboard.',
      vi: 'Cửa hàng móc khóa handmade cá nhân hóa, kèm trang quản trị riêng.',
    },
    summary: {
      en: 'Customers compose their own keychain — charms, colours, text — and see a preview that is saved with the order. A separate admin app handles orders and their status flow, stock, product management, analytics and Excel export. A TypeScript API sits behind both.',
      vi: 'Khách tự phối móc khóa — charm, màu sắc, chữ — và xem bản xem trước được lưu cùng đơn hàng. Một app admin riêng xử lý đơn hàng và trạng thái, tồn kho, quản lý sản phẩm, thống kê và xuất Excel. Phía sau là API viết bằng TypeScript.',
    },
    decisions: [
      {
        en: 'Three deployables in one repo — storefront, admin, API — so each can ship independently (Vercel for the frontends, Render for the API).',
        vi: 'Ba phần triển khai trong một repo — storefront, admin, API — để mỗi phần phát hành độc lập (Vercel cho frontend, Render cho API).',
      },
      {
        en: 'The admin password is checked on the backend against a hash held in environment variables; nothing sensitive ships to the browser.',
        vi: 'Mật khẩu admin được kiểm tra ở backend bằng hash lưu trong biến môi trường; không có dữ liệu nhạy cảm nào gửi xuống trình duyệt.',
      },
      {
        en: 'Request validation with Zod, security headers with Helmet, image uploads through Multer to Cloudinary.',
        vi: 'Validate request bằng Zod, header bảo mật bằng Helmet, upload ảnh qua Multer lên Cloudinary.',
      },
    ],
    layers: {
      interface: ['React', 'Vite', 'html-to-image'],
      service: ['Node.js', 'Express', 'TypeScript', 'Zod', 'JWT', 'Helmet'],
      data: ['MongoDB', 'Mongoose', 'Cloudinary'],
      delivery: ['Vercel', 'Render'],
    },
    links: [
      { label: 'Live', url: 'https://chamyttsvlu.vercel.app/' },
      { label: 'Source', url: gh('cham-y-website') },
    ],
    cover: null,
  },
  {
    id: 16,
    slug: 'meetly',
    tier: 'featured',
    name: 'Meetly',
    year: 2026,
    kind: { en: 'Team project · Real-time scheduling', vi: 'Dự án nhóm · Lên lịch thời gian thực' },
    tagline: {
      en: 'Find the time that works for everyone: create an event, share the link, mark availability.',
      vi: 'Tìm khung giờ phù hợp với mọi người: tạo sự kiện, chia sẻ link, đánh dấu thời gian rảnh.',
    },
    summary: {
      en: 'A group scheduling app in the spirit of When2meet. The organiser creates a poll, participants paint their availability on a drag-to-select time grid, and a live heatmap highlights the slots that suit the whole group. No sign-up is required to take part.',
      vi: 'Ứng dụng lên lịch nhóm theo tinh thần When2meet. Người tổ chức tạo poll, người tham gia kéo để tô thời gian rảnh trên lưới thời gian, và heatmap trực tiếp làm nổi bật khung giờ phù hợp nhất với cả nhóm. Không cần đăng ký tài khoản để tham gia.',
    },
    role: {
      en: 'Most commits in the repository (51 of 152, five contributors).',
      vi: 'Nhiều commit nhất trong repo (51/152, năm người đóng góp).',
    },
    decisions: [
      {
        en: 'Real-time heatmap over SignalR: every participant sees availability change as others paint it.',
        vi: 'Heatmap thời gian thực qua SignalR: mọi người thấy thời gian rảnh thay đổi ngay khi người khác tô.',
      },
      {
        en: 'Three-tier .NET 8 backend (Controller / Service / Repository) with EF Core code-first migrations on PostgreSQL 16.',
        vi: 'Backend .NET 8 ba tầng (Controller / Service / Repository) với EF Core code-first migrations trên PostgreSQL 16.',
      },
      {
        en: 'Team workflow written down: Git Flow with dev and main, Conventional Commits, a PR template, and a GitHub Actions quality pipeline; Docker Compose for the local database.',
        vi: 'Quy trình nhóm được viết rõ: Git Flow với dev và main, Conventional Commits, PR template và pipeline chất lượng GitHub Actions; Docker Compose cho database local.',
      },
    ],
    layers: {
      interface: ['React', 'TypeScript', 'Vite', 'Tailwind CSS'],
      service: ['ASP.NET Core', 'SignalR'],
      data: ['PostgreSQL', 'EF Core'],
      delivery: ['Docker Compose', 'GitHub Actions', 'Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://meetly-soon.vercel.app' },
      { label: 'Source', url: 'https://github.com/HKBDU/Meetly' },
    ],
    cover: null,
  },
  {
    id: 17,
    slug: 'pegaxus-frontend',
    tier: 'featured',
    name: 'Pegaxus Frontend',
    year: 2026,
    kind: { en: 'Team project (SWP391) · Logistics web app', vi: 'Dự án nhóm (SWP391) · Web app logistics' },
    tagline: {
      en: 'Booking, route planning, quarantine compliance and billing for cross-border racehorse transport.',
      vi: 'Đặt vận chuyển, lên tuyến, tuân thủ kiểm dịch và thanh toán cho vận chuyển ngựa đua xuyên biên giới.',
    },
    summary: {
      en: 'The web client of Pegaxus, a platform that brings transport booking, route planning, compliance documentation and invoicing for racehorses into one place. Customers manage horses and bookings; staff plan routes, review dossiers and assign personnel.',
      vi: 'Web client của Pegaxus, nền tảng gom đặt vận chuyển, lên tuyến, hồ sơ tuân thủ và hóa đơn cho ngựa đua vào một nơi. Khách hàng quản lý ngựa và đơn đặt; nhân viên lên tuyến, duyệt hồ sơ và phân công nhân sự.',
    },
    role: {
      en: 'A small share of the commits (8 of 319); most of the frontend was written by teammates. My larger contribution is the backend repository.',
      vi: 'Phần nhỏ trong số commit (8/319); phần lớn frontend do các bạn trong nhóm viết. Đóng góp chính của mình nằm ở repo backend.',
    },
    decisions: [
      {
        en: 'A map workspace on MapLibre GL for managing locations and previewing primary, contingency and return routes.',
        vi: 'Không gian bản đồ trên MapLibre GL để quản lý địa điểm và xem trước tuyến chính, tuyến dự phòng và tuyến về.',
      },
      {
        en: 'Compliance workflows in the browser: requirement catalogues, document submission and review with an in-app PDF viewer.',
        vi: 'Quy trình tuân thủ ngay trên trình duyệt: danh mục yêu cầu, nộp và duyệt tài liệu với trình xem PDF tích hợp.',
      },
      {
        en: 'Role-based screens, TanStack Query for server state, Zustand for client state, and React Hook Form with Zod for validated forms; some workflows can run on mock data when no backend is connected.',
        vi: 'Màn hình theo vai trò, TanStack Query cho server state, Zustand cho client state, React Hook Form với Zod cho form có validate; một số quy trình chạy được bằng mock data khi chưa nối backend.',
      },
    ],
    layers: {
      interface: [
        'React',
        'TypeScript',
        'Vite',
        'React Router',
        'TanStack Query',
        'Zustand',
        'React Hook Form',
        'Zod',
        'Tailwind CSS',
        'Radix UI',
        'MapLibre GL',
        'PDF.js',
      ],
      service: [],
      data: [],
      delivery: ['GitHub Actions', 'Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://pegaxus-fe.vercel.app' },
      { label: 'Source', url: 'https://github.com/HKBDU/pegaxus-fe' },
    ],
    cover: '/images/pegaxus_fe.jpg',
  },
  {
    id: 18,
    slug: 'pegaxus-backend',
    tier: 'featured',
    name: 'Pegaxus Backend',
    year: 2026,
    kind: { en: 'Team project (SWP391) · .NET API', vi: 'Dự án nhóm (SWP391) · API .NET' },
    tagline: {
      en: 'The API behind cross-border racehorse transport: bookings, compliance dossiers, invoicing.',
      vi: 'API đứng sau vận chuyển ngựa đua xuyên biên giới: đặt chuyến, hồ sơ tuân thủ, hóa đơn.',
    },
    summary: {
      en: 'A role-based ASP.NET Core API on .NET 8 and PostgreSQL 16. It covers accounts (email verification, password recovery, Google sign-in), bookings and horse profiles, transport plans and personnel, compliance dossiers with document versions, reviews and audit history, invoices with SePay checkout, and SignalR notifications.',
      vi: 'API ASP.NET Core phân quyền theo vai trò trên .NET 8 và PostgreSQL 16. Gồm tài khoản (xác minh email, khôi phục mật khẩu, đăng nhập Google), đặt chuyến và hồ sơ ngựa, kế hoạch vận chuyển và nhân sự, hồ sơ tuân thủ với phiên bản tài liệu, duyệt và lịch sử kiểm toán, hóa đơn với thanh toán SePay, và thông báo SignalR.',
    },
    role: {
      en: 'Most commits in the repository (170 of 339, four contributors).',
      vi: 'Nhiều commit nhất trong repo (170/339, bốn người đóng góp).',
    },
    decisions: [
      {
        en: 'Three application layers plus a dedicated test project; the API calls services, services use the EF Core context directly, and mappings and migrations live in the repository project.',
        vi: 'Ba tầng ứng dụng cộng một project test riêng; API gọi service, service dùng trực tiếp EF Core context, còn mapping và migration nằm ở project repository.',
      },
      {
        en: 'Tests cover services, HTTP contracts and PostgreSQL; a written coding-conventions document sets module structure, transaction rules and API contracts.',
        vi: 'Test bao phủ service, HTTP contract và PostgreSQL; tài liệu coding conventions quy định cấu trúc module, quy tắc transaction và API contract.',
      },
      {
        en: 'The whole API is documented in Swagger, and docker-compose starts the API with PostgreSQL and Redis.',
        vi: 'Toàn bộ API được mô tả trên Swagger, và docker-compose chạy API cùng PostgreSQL và Redis.',
      },
    ],
    layers: {
      interface: [],
      service: ['ASP.NET Core', 'SignalR', 'Swagger', 'Google sign-in', 'SePay'],
      data: ['PostgreSQL', 'EF Core', 'Redis'],
      delivery: ['Docker', 'GitHub Actions'],
    },
    links: [{ label: 'Source', url: 'https://github.com/HKBDU/pegaxus-be' }],
    cover: '/images/pegaxus_be.jpg',
  },
  {
    id: 5,
    slug: 'fpt-student-rag',
    tier: 'archive',
    name: 'FPT Student RAG',
    year: 2026,
    kind: { en: 'AI · Retrieval-augmented generation', vi: 'AI · Retrieval-augmented generation' },
    tagline: {
      en: 'Ask questions about FPT regulations and get answers with their sources.',
      vi: 'Hỏi về quy chế của FPT và nhận câu trả lời kèm nguồn trích dẫn.',
    },
    summary: {
      en: 'An assistant that answers student questions from the university’s own PDF documents. An ingest script builds a vector index from the PDFs; at question time the relevant passages are retrieved and Claude writes the answer.',
      vi: 'Trợ lý trả lời câu hỏi của sinh viên dựa trên chính các tài liệu PDF của trường. Script ingest tạo vector index từ PDF; khi có câu hỏi, các đoạn liên quan được truy xuất rồi Claude viết câu trả lời.',
    },
    decisions: [
      {
        en: 'Every answer returns the source files and similarity scores, so a reader can check where it came from.',
        vi: 'Mỗi câu trả lời trả về tên file nguồn và điểm tương đồng để người đọc kiểm chứng.',
      },
      {
        en: 'Multilingual BAAI/bge-m3 embeddings through LlamaIndex, because the corpus is Vietnamese.',
        vi: 'Dùng embedding đa ngôn ngữ BAAI/bge-m3 qua LlamaIndex vì tài liệu là tiếng Việt.',
      },
      {
        en: 'A small FastAPI service (/health, /ask) and a dependency-free HTML/CSS/JS frontend.',
        vi: 'Service FastAPI gọn (/health, /ask) và frontend HTML/CSS/JS không phụ thuộc thư viện.',
      },
    ],
    layers: {
      interface: ['HTML', 'CSS', 'JavaScript'],
      service: ['Python', 'FastAPI', 'LlamaIndex', 'Claude API'],
      data: ['bge-m3 embeddings', 'Vector index'],
      delivery: ['Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://fpt-student-rag.vercel.app/' },
      { label: 'Source', url: gh('fpt-student-rag') },
    ],
    cover: '/images/ragAI.jpg',
  },
  {
    id: 8,
    slug: 'ritual-catalog',
    tier: 'archive',
    name: 'Ritual Catalog',
    year: 2026,
    kind: { en: 'Full-stack · React 19 + NestJS', vi: 'Full-stack · React 19 + NestJS' },
    tagline: {
      en: 'A catalogue of rituals, offerings and prayers, with accounts and an admin area.',
      vi: 'Danh mục nghi lễ, lễ vật và bài khấn, có tài khoản người dùng và khu vực quản trị.',
    },
    summary: {
      en: 'A web app for Vietnamese ritual practice, built as a React 19 client plus a NestJS API. The client is split by feature — auth, rituals, offerings, prayers, users, admin — with typed services, Zod form rules and route guards.',
      vi: 'Ứng dụng web về nghi lễ truyền thống Việt Nam, gồm client React 19 và API NestJS. Client chia theo tính năng — auth, rituals, offerings, prayers, users, admin — với service có kiểu, rule form bằng Zod và route guard.',
    },
    decisions: [
      {
        en: 'Feature-first folders: each feature owns its types, services, hooks and components.',
        vi: 'Thư mục theo tính năng: mỗi feature tự quản lý types, services, hooks và components.',
      },
      {
        en: 'Server-side base controller/service classes, a global exception filter and Swagger docs in NestJS.',
        vi: 'Phía server có base controller/service, global exception filter và Swagger trong NestJS.',
      },
      {
        en: 'A written build-order guide (flow.md) documents why each layer is built in the order it is.',
        vi: 'Có tài liệu flow.md mô tả thứ tự xây dựng từng tầng và lý do.',
      },
    ],
    layers: {
      interface: ['React', 'TypeScript', 'React Router', 'TanStack Query', 'Zustand', 'Zod', 'Tailwind CSS', 'Radix UI'],
      service: ['NestJS', 'JWT', 'Swagger'],
      data: [],
      delivery: ['GitHub Actions', 'Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://ritual-catalog.vercel.app' },
      { label: 'Client', url: gh('RitualCatalog') },
      { label: 'Server', url: gh('Ritual-Server') },
    ],
    cover: null,
  },
  {
    id: 3,
    slug: 'meme2shirt',
    tier: 'archive',
    name: 'Meme2Shirt',
    year: 2025,
    kind: { en: 'Full-stack · Custom print shop', vi: 'Full-stack · Cửa hàng in áo tùy biến' },
    tagline: {
      en: 'Design a T-shirt on a 3D model, add it to the cart and place the order.',
      vi: 'Thiết kế áo thun trên mô hình 3D, thêm vào giỏ và đặt hàng.',
    },
    summary: {
      en: 'A print-on-demand storefront with a design page built around a 3D T-shirt model, plus cart, checkout, login/register and an order list. The API is Express 5 with MongoDB.',
      vi: 'Cửa hàng in áo theo yêu cầu với trang thiết kế dựa trên mô hình áo 3D, cùng giỏ hàng, thanh toán, đăng nhập/đăng ký và danh sách đơn hàng. API dùng Express 5 và MongoDB.',
    },
    decisions: [
      {
        en: 'Plain HTML/CSS/JavaScript pages on the client — no framework — talking to a REST API through one api.js module.',
        vi: 'Client là các trang HTML/CSS/JavaScript thuần — không framework — gọi REST API qua một module api.js.',
      },
      {
        en: 'Server organised as routes → controllers → models, with an auth middleware and bcrypt password hashing.',
        vi: 'Server tổ chức theo routes → controllers → models, có middleware xác thực và băm mật khẩu bằng bcrypt.',
      },
    ],
    layers: {
      interface: ['HTML', 'CSS', 'JavaScript', 'glTF 3D model'],
      service: ['Node.js', 'Express', 'bcrypt'],
      data: ['MongoDB', 'Mongoose'],
      delivery: ['Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://meme2-shirt.vercel.app' },
      { label: 'Source', url: gh('Meme2Shirt') },
    ],
    cover: '/images/meme2shirt.jpg',
  },

  /* ───────────────────────── Lab ───────────────────────── */
  {
    id: 6,
    slug: 'hand-build',
    tier: 'lab',
    name: 'Hand·Build',
    year: 2026,
    kind: { en: 'Experiment · Computer vision in the browser', vi: 'Thử nghiệm · Computer vision trên trình duyệt' },
    tagline: {
      en: 'Build with 3D blocks using nothing but your hand and a webcam.',
      vi: 'Xếp khối 3D chỉ bằng bàn tay và webcam.',
    },
    summary: {
      en: 'MediaPipe Hands tracks the hand from the webcam in real time and a Three.js scene turns gestures into actions — for example, pinching two fingers places a block in 3D space. The whole thing is a single HTML file.',
      vi: 'MediaPipe Hands theo dõi bàn tay từ webcam theo thời gian thực, và scene Three.js biến cử chỉ thành thao tác — ví dụ chụm hai ngón để đặt một khối trong không gian 3D. Toàn bộ nằm trong một file HTML.',
    },
    decisions: [
      {
        en: 'Gesture detection is its own step between the tracked landmarks and the scene, so adding a gesture does not touch rendering code.',
        vi: 'Nhận diện cử chỉ là bước riêng giữa landmark và scene, nên thêm cử chỉ mới không đụng đến code render.',
      },
    ],
    layers: {
      interface: ['JavaScript', 'Three.js', 'MediaPipe Hands', 'WebGL'],
      service: [],
      data: [],
      delivery: ['Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://hand3d.vercel.app' },
      { label: 'Source', url: gh('Hand3DBuildEngineer') },
    ],
    cover: '/images/hand_build.jpg',
  },
  {
    id: 4,
    slug: 'shopping-cart-api',
    tier: 'lab',
    name: 'Shopping Cart API',
    year: 2026,
    kind: { en: 'Study · Backend', vi: 'Nghiên cứu · Backend' },
    tagline: {
      en: 'An Express 5 + TypeScript API: users, auth, media upload.',
      vi: 'API Express 5 + TypeScript: người dùng, xác thực, upload media.',
    },
    summary: {
      en: 'A backend practice project in TypeScript: user routes with validation, JWT access tokens backed by a stored refresh-token model, centralised error handling, and image upload processed with sharp.',
      vi: 'Dự án luyện backend bằng TypeScript: route người dùng có validate, JWT access token kèm model refresh token được lưu, xử lý lỗi tập trung và upload ảnh xử lý bằng sharp.',
    },
    decisions: [
      {
        en: 'Layered by responsibility — routes, controllers, services, middlewares, models — with a request-handler wrapper so errors reach one error middleware.',
        vi: 'Tách tầng theo trách nhiệm — routes, controllers, services, middlewares, models — và một wrapper handler để mọi lỗi về một error middleware.',
      },
    ],
    layers: {
      interface: [],
      service: ['Node.js', 'Express', 'TypeScript', 'JWT', 'express-validator', 'sharp'],
      data: ['MongoDB'],
      delivery: [],
    },
    links: [{ label: 'Source', url: gh('ShoppingCart') }],
    cover: null,
  },
  {
    id: 9,
    slug: 'tetpee',
    tier: 'archive',
    name: 'TetPee',
    year: 2026,
    kind: { en: 'Study · .NET e-commerce API', vi: 'Nghiên cứu · API thương mại điện tử .NET' },
    tagline: {
      en: 'Carts, orders, sellers and inventory in a layered ASP.NET Core API.',
      vi: 'Giỏ hàng, đơn hàng, người bán và kho trong API ASP.NET Core nhiều tầng.',
    },
    summary: {
      en: 'An e-commerce domain model — users, sellers, products, categories, carts, orders, inventory and storage — with EF Core migrations, JWT, Swagger and a global exception handler. The same layering later used in SmartCenter.',
      vi: 'Mô hình miền thương mại điện tử — người dùng, người bán, sản phẩm, danh mục, giỏ hàng, đơn hàng, tồn kho — với EF Core migrations, JWT, Swagger và exception handler toàn cục. Cùng cách phân tầng sau này dùng trong SmartCenter.',
    },
    decisions: [],
    layers: {
      interface: [],
      service: ['ASP.NET Core', 'JWT', 'Swagger'],
      data: ['EF Core'],
      delivery: [],
    },
    links: [{ label: 'Source', url: gh('TetPee') }],
    cover: null,
  },
  {
    id: 10,
    slug: 'hertz-app',
    tier: 'archive',
    name: 'HertzApp',
    year: 2026,
    kind: { en: 'Prototype · Music player UI', vi: 'Prototype · Giao diện trình phát nhạc' },
    tagline: {
      en: 'A music player with a custom audio engine and a typed store.',
      vi: 'Trình phát nhạc với audio engine riêng và store có kiểu.',
    },
    summary: {
      en: 'A React + TypeScript player: library grid, a player bar with progress and volume, and a Zustand store. Playback is wrapped in an audio-engine component and a use-audio-player hook, over a mock song catalogue.',
      vi: 'Trình phát React + TypeScript: lưới thư viện, thanh phát có tiến trình và âm lượng, store Zustand. Việc phát nhạc nằm trong component audio-engine và hook use-audio-player, trên catalogue bài hát mock.',
    },
    decisions: [],
    layers: {
      interface: ['React', 'TypeScript', 'Zustand', 'Vite'],
      service: [],
      data: [],
      delivery: ['Vercel'],
    },
    links: [
      { label: 'Live', url: 'https://hertzapp.vercel.app/' },
      { label: 'Source', url: gh('HertzApp') },
    ],
    cover: null,
  },
  {
    id: 11,
    slug: 'authenticate-with-google',
    tier: 'lab',
    name: 'Google sign-in (AuthGG)',
    year: 2026,
    kind: { en: 'Study · OAuth 2.0', vi: 'Nghiên cứu · OAuth 2.0' },
    tagline: {
      en: 'Server-side Google OAuth with an HttpOnly session cookie.',
      vi: 'Google OAuth phía server với session cookie HttpOnly.',
    },
    summary: {
      en: 'React hands the browser to ASP.NET Core, which runs the OAuth 2.0 redirect with Google, verifies the code, creates the session cookie and sends the user back; React then asks /api/auth/me who is signed in.',
      vi: 'React chuyển trình duyệt sang ASP.NET Core, nơi chạy luồng redirect OAuth 2.0 với Google, xác thực code, tạo session cookie rồi đưa người dùng về; React sau đó gọi /api/auth/me để biết ai đang đăng nhập.',
    },
    decisions: [
      {
        en: 'The client secret lives only on the backend and the session is an HttpOnly cookie, so neither is reachable from browser JavaScript.',
        vi: 'Client secret chỉ nằm ở backend và session là cookie HttpOnly, nên JavaScript trên trình duyệt không truy cập được.',
      },
      {
        en: 'Deliberately a prototype: users are held in memory and the README lists what production needs (database, HTTPS, Secure cookies).',
        vi: 'Cố ý là prototype: người dùng lưu trong bộ nhớ và README nêu rõ production cần gì (database, HTTPS, cookie Secure).',
      },
    ],
    layers: {
      interface: ['React', 'Vite'],
      service: ['ASP.NET Core', 'OAuth 2.0'],
      data: [],
      delivery: [],
    },
    links: [{ label: 'Source', url: gh('Authenticate-with-Google') }],
    cover: null,
  },
  {
    id: 19,
    slug: 'pegaxus-ocr',
    tier: 'lab',
    name: 'Pegaxus OCR',
    year: 2026,
    kind: { en: 'Experiment · Document OCR', vi: 'Thử nghiệm · OCR tài liệu' },
    tagline: {
      en: 'Self-hosted OCR for compliance documents — no paid cloud API.',
      vi: 'OCR tự host cho tài liệu tuân thủ — không dùng API đám mây trả phí.',
    },
    summary: {
      en: 'A small FastAPI microservice that reads PDFs and images for Pegaxus. OpenCV cleans the page, PaddleOCR reads it, PyMuPDF handles PDFs, and the response keeps the text with its page, bounding boxes and confidence. Separate steps classify the document, extract fields and validate them.',
      vi: 'Microservice FastAPI nhỏ đọc PDF và ảnh cho Pegaxus. OpenCV xử lý ảnh trang, PaddleOCR đọc chữ, PyMuPDF xử lý PDF, và kết quả giữ nguyên văn bản cùng trang, bounding box và độ tin cậy. Các bước riêng phân loại tài liệu, trích xuất trường và kiểm tra hợp lệ.',
    },
    role: {
      en: 'Sole contributor so far (one commit); the repository is an early prototype.',
      vi: 'Người đóng góp duy nhất cho đến nay (một commit); repo mới ở mức prototype.',
    },
    decisions: [
      {
        en: 'OCR output is advisory by design: it never approves or rejects a legal document, it only returns what it read and how confident it is.',
        vi: 'Kết quả OCR chỉ mang tính tham khảo: nó không bao giờ duyệt hay từ chối một tài liệu pháp lý, chỉ trả về những gì đọc được và độ tin cậy.',
      },
      {
        en: 'A fixed response contract (contracts/ocr-response.example.json) so the .NET backend can integrate against it; unit tests cover the classifier, extraction and validation.',
        vi: 'Có contract phản hồi cố định (contracts/ocr-response.example.json) để backend .NET tích hợp; unit test bao phủ bộ phân loại, trích xuất và kiểm tra hợp lệ.',
      },
    ],
    layers: {
      interface: [],
      service: ['Python', 'FastAPI', 'PaddleOCR', 'OpenCV', 'PyMuPDF'],
      data: [],
      delivery: ['Docker'],
    },
    links: [{ label: 'Source', url: 'https://github.com/HKBDU/Optical-Character-Recognition-Testing' }],
    cover: null,
  },

  /* ───────────────────────── Archive ───────────────────────── */
  {
    id: 2,
    slug: 'weather-app',
    tier: 'archive',
    name: 'Weather App',
    year: 2025,
    kind: { en: 'Vanilla JS · Weather + forecast pages', vi: 'Vanilla JS · Trang thời tiết + dự báo' },
    tagline: { en: 'Weather and forecast-detail pages in plain JavaScript.', vi: 'Trang thời tiết và dự báo chi tiết bằng JavaScript thuần.' },
    summary: {
      en: 'Two pages — home and forecast detail — with separate API modules and a video background.',
      vi: 'Hai trang — trang chủ và dự báo chi tiết — với các module API riêng và nền video.',
    },
    decisions: [],
    layers: { interface: ['HTML', 'CSS', 'JavaScript'], service: [], data: [], delivery: ['Vercel'] },
    links: [
      { label: 'Live', url: 'https://weather-app-ver01.vercel.app/' },
      { label: 'Source', url: gh('WeatherApp') },
    ],
    cover: null,
  },
  {
    id: 12,
    slug: 'cinemoon',
    tier: 'archive',
    name: 'CineMoon',
    year: 2026,
    kind: { en: 'Cinema site · Plain HTML/CSS/JS', vi: 'Trang rạp phim · HTML/CSS/JS thuần' },
    tagline: { en: 'Ticket booking, popcorn, discounts and membership pages.', vi: 'Các trang đặt vé, bắp nước, ưu đãi và thành viên.' },
    summary: {
      en: 'A multi-page cinema site: ticket booking, popcorn booking, discounts and membership.',
      vi: 'Website rạp phim nhiều trang: đặt vé, đặt bắp nước, ưu đãi và thành viên.',
    },
    decisions: [],
    layers: { interface: ['HTML', 'CSS', 'JavaScript'], service: [], data: [], delivery: ['Vercel'] },
    links: [
      { label: 'Live', url: 'https://cine-moon-web.vercel.app/' },
      { label: 'Source', url: gh('CineMoonWeb') },
    ],
    cover: null,
  },
  {
    id: 13,
    slug: 'product-catalog-filter',
    tier: 'archive',
    name: 'E-commerce Product Catalog Filter',
    year: 2026,
    kind: { en: 'Java', vi: 'Java' },
    tagline: { en: 'Product catalogue filtering exercise in Java.', vi: 'Bài tập lọc danh mục sản phẩm bằng Java.' },
    summary: { en: 'A Java exercise on filtering an e-commerce catalogue.', vi: 'Bài tập Java về lọc danh mục sản phẩm thương mại điện tử.' },
    decisions: [],
    layers: { interface: [], service: ['Java'], data: [], delivery: [] },
    links: [{ label: 'Source', url: gh('E-commerce-Product-Catalog-Filter') }],
    cover: null,
  },
  {
    id: 14,
    slug: 'restaurant-management',
    tier: 'archive',
    name: 'Restaurant management system',
    year: 2025,
    kind: { en: 'C · Coursework', vi: 'C · Bài tập môn học' },
    tagline: { en: 'A restaurant management program in C.', vi: 'Chương trình quản lý nhà hàng bằng C.' },
    summary: { en: 'A restaurant management program written in C.', vi: 'Chương trình quản lý nhà hàng viết bằng C.' },
    decisions: [],
    layers: { interface: [], service: ['C'], data: [], delivery: [] },
    links: [{ label: 'Source', url: gh('management__restaurant_system') }],
    cover: null,
  },
  {
    id: 15,
    slug: 'rock-paper-scissors',
    tier: 'archive',
    name: 'Rock Paper Scissors',
    year: 2026,
    kind: { en: 'Vanilla JS · Game', vi: 'Vanilla JS · Trò chơi' },
    tagline: { en: 'The classic game in the browser.', vi: 'Trò chơi kéo búa bao trên trình duyệt.' },
    summary: { en: 'The classic game in plain JavaScript.', vi: 'Trò chơi kéo búa bao bằng JavaScript thuần.' },
    decisions: [],
    layers: { interface: ['HTML', 'CSS', 'JavaScript'], service: [], data: [], delivery: ['Vercel'] },
    links: [
      { label: 'Live', url: 'https://rock-paper-scissors-game-five-gray.vercel.app' },
      { label: 'Source', url: gh('rockPaperScissorsGame') },
    ],
    cover: null,
  },
];

export const getProject = (key) =>
  projects.find((p) => p.slug === key || String(p.id) === String(key));

export const byTier = (tier) => projects.filter((p) => p.tier === tier);

export const projectHref = (p) => `/projects/${p.slug}`;

/**
 * Derive the "stack by layer" view from project data:
 * for each layer, each technology and the projects that use it.
 */
export const deriveStack = () => {
  const stack = Object.fromEntries(LAYERS.map((l) => [l, new Map()]));
  projects.forEach((p) => {
    LAYERS.forEach((layer) => {
      (p.layers[layer] ?? []).forEach((tech) => {
        const map = stack[layer];
        if (!map.has(tech)) map.set(tech, []);
        map.get(tech).push(p.slug);
      });
    });
  });
  return Object.fromEntries(
    LAYERS.map((layer) => [
      layer,
      [...stack[layer].entries()]
        .map(([tech, slugs]) => ({ tech, slugs }))
        .sort((a, b) => b.slugs.length - a.slugs.length || a.tech.localeCompare(b.tech)),
    ])
  );
};
