export const en = {
	shell: {
		brandMark: "T",
		navigation: "Main navigation",
		howItWorks: "How it works",
		liveDemo: "Live demo",
		packages: "Packages",
		bookMeeting: "Book a meeting",
		ticketNumber: "№ 01",
		myRequests: "My requests",
		brand: "Topsyde Studios",
		sample: { kicker: "TOPSIDE", meeting: "Business meeting", request: "Request", name: "Name", log: "agent ▸ idle", book: "Book a meeting", demo: "See it work", ticketNumber: "№ 01" },
		description: "Websites and systems built with ClassKit. Choose a package and book a business meeting.",
		languageSwitch: "עב",
		languageSwitchLabel: "Switch to Hebrew",
	},
	showcase: {
		scene: { studio: "Noa Studio", open: "Open", customers: "Customers", bookings: "Bookings", requests: "Requests" },
		storyLabel: "The story", bookMeeting: "Book a meeting", chooseTime: "Choose a time", seeItWork: "See it work",
		posterTopside: "The studio storefront on its slab of ground", posterUnderside: "ClassKit, data pipes and the AI agent beneath the studio",
		chapters: {
			front: { lead: "Your site", bridge: "is ", end: "the front.", body: "What your customers see. Your design, fast and precise." },
			flip: { lead: "But a business", bridge: "", end: "doesn’t run on a front.", body: "Customers, appointments, site fixes. It all happens beneath the surface." },
			system: { lead: "Under the site:", bridge: "", end: "a system.", body: "ClassKit manages customers, leads, appointments and permissions. From the same site, without another app." },
			agent: { lead: "And an agent to fix it", bridge: "", end: "for you.", body: "The sign fell? Open a request. An AI agent takes it, fixes it, and ships it live." },
			book: { lead: "Your meeting with me", bridge: "starts ", end: "here.", body: "Through this very same system." },
		},
	},
	packages: {
		title: "Two ways to begin. One keeps working for you.",
		label: "Packages",
		book: "Let’s meet",
		bookPackage: "Book a meeting about {{name}}",
		recommended: "Recommended",
		offers: {
			site: {
				name: "Landing or product page", price: "₪1,000",
				terms: "One-time, including the site and setup meeting. Domain and hosting billed monthly, depending on the domain.",
				summary: "Custom design, build, and hosting on my infrastructure. You get a site; I take care of the rest.",
			},
			system: {
				name: "Website + ClassKit", price: "₪150",
				terms: "From, per month. 3-month minimum. First month paid in advance.",
				summary: "Your site, a monthly support hour bank, ClassKit, and AI-handled change requests. With ongoing updates and new features.",
			},
			"agent-whatsapp": { name: "WhatsApp AI agent" },
			"agent-social": { name: "Facebook & Instagram AI agent" },
			"agent-voice": { name: "Voice AI agent" },
		},
		features: {
			setup: "Setup meeting", design: "Custom design", build: "Site build", hosting: "Hosting on Liad’s infrastructure",
			site: "Website", support: "Monthly support hour bank, tailored in the meeting",
			customers: "Customers and leads", appointments: "Appointments", roles: "Users and roles", documents: "Documents",
			changes: "AI-handled change requests", updates: "Ongoing updates and new features",
			whatsapp: "Answers client questions on WhatsApp", social: "Answers client questions in Facebook and Instagram inboxes", voice: "Answers calls",
		},
		comparison: {
			title: "What’s included", feature: "Included", included: "Included", notIncluded: "Not included",
			website: "Custom website", websiteDetail: "Setup meeting, custom design and build",
			hosting: "Hosting", hostingDetail: "On Liad’s infrastructure",
			support: "Monthly support", supportDetail: "An hour bank tailored in the meeting",
			classkit: "ClassKit", classkitDetail: "Customers and leads, appointments, users and roles, documents",
			changes: "AI-handled change requests", changesDetail: "Ongoing updates and new features",
		},
		addons: { title: "AI agents", price: "Priced in the meeting", note: "Add-ons to Website + ClassKit" },
		faq: {
			title: "Before we meet",
			minimum: { question: "Is there a minimum commitment?", answer: "Website + ClassKit has a 3-month minimum commitment. We agree on the final monthly price in the meeting." },
			advance: { question: "When is the first month paid?", answer: "The first month of Website + ClassKit is paid in advance." },
			support: { question: "What does the hour bank cover?", answer: "It covers monthly support for your website and system. We agree on its scope and size in the meeting, according to your needs." },
			hosting: { question: "Who hosts the site?", answer: "The site is hosted on my infrastructure. For the landing or product page, domain and hosting are billed monthly, depending on the domain." },
		},
	},
	"admin-sim": {
		"title": "Demo",
		"placeholder": "A demonstration of the system will appear here.",
		"demoNotice": "A scripted demonstration: no real ticket is submitted and no real site is changed.",
		"demoFlag": "DEMO · no real request is submitted",
		"demoTiming": "Demo timing · shortened timings",
		"back": "Back",
		"restart": "Restart",
		"railLabel": "Demonstration steps",
		"topTab": "Your site",
		"underTab": "Under the site",
		"topLabel": "TOPSIDE · the client’s site",
		"underLabel": "UNDERSIDE · admin + agent",
		"requestHeader": "New request",
		"typeLabel": "Type",
		"titleLabel": "Title",
		"descriptionLabel": "Description",
		"issue": "Issue",
		"featureRequest": "Feature request",
		"attachment": "Screenshot attached automatically",
		"open": "Open",
		"doing": "In progress",
		"done": "Done",
		"cardTitle": "Clipped button",
		"agentMark": "AI",
		"progressLabel": "Fix progress",
		"comparisonLabel": "Before and after comparison",
		"before": "Before",
		"after": "After",
		"ship": {
			"build": "BUILD",
			"test": "TEST",
			"deploy": "DEPLOY"
		},
		"beats": {
			"bug": {
				"title": "Something broke. The most important button — cut off.",
				"body": "A customer messages you on WhatsApp: she cannot book. Instead of waiting for a developer, open a request from your admin.",
				"next": "Open a request",
				"label": "Defect"
			},
			"request": {
				"title": "One request. No phone calls.",
				"body": "Type, title, description. A screenshot attaches itself from the page you are on.",
				"next": "Submit",
				"label": "Request"
			},
			"inbox": {
				"title": "The request reaches me.",
				"body": "It lands on my work board with all the context. Nobody needs to explain twice.",
				"next": "Give it to the agent",
				"label": "Inbox"
			},
			"agent": {
				"title": "An AI agent picks it up.",
				"body": "It reads the request, finds the code, and fixes it. I approve.",
				"next": "Deploy the fix",
				"label": "Agent"
			},
			"deploy": {
				"title": "Build, test, deploy.",
				"body": "The fix passes its tests and reaches the live site. You do not have to do a thing.",
				"next": "See it on the site",
				"label": "Deploy"
			},
			"live": {
				"title": "Fixed. Live.",
				"body": "The customer books. You never picked up the phone. (Demo timings are shortened.)",
				"next": "Get your own agent",
				"label": "Live"
			}
		},
		"logs": {
			"idle": "agent ▸ idle · waiting for requests",
			"received": "inbox ▸ request #214 from noya_website",
			"context": "type: {{type}} · context: / (home)",
			"cardCreated": "→ card created on board 'noya — requests'",
			"claimed": "agent ▸ claimed #214",
			"reading": "reading src/pages/home.tsx",
			"found": "found: .booking-cta translateX(46%) on ≤ 390px",
			"removed": "- .booking-cta { transform: translate(46%, 14px) rotate(4deg); clip-path: inset(0 52% 0 0); }",
			"added": "+ .booking-cta { transform: none; clip-path: none; }",
			"tests": "tests ▸ 48 passed",
			"build": "build ▸ vite build ✓",
			"test": "test ▸ 48 passed ✓",
			"deployed": "deploy ▸ live ✓",
			"done": "#214 ▸ done · demo timing"
		},
		"scenarios": {
			"brokenBookingButton": {
				"siteName": "Noya Studio",
				"siteNav": "Classes · Schedule · Contact",
				"siteTitle": "Strength you feel beyond the studio.",
				"siteBody": "Small-group strength classes. Choose a time, book, show up.",
				"bookingLabel": "Book a class",
				"defect": "The booking button is cut off on mobile",
				"ticketTitle": "The booking button is cut off on mobile",
				"ticketDescription": "The button on the home page goes off screen. It is impossible to book.",
				"screenshotAlt": "Demo screenshot of the clipped booking button on the Noya Studio site."
			}
		}
	},
	booking: {
		title: "Book a business meeting",
		placeholder: "You will be able to request a business meeting here.",
		account: { title: "My requests", placeholder: "Your meeting requests will appear here." },
	},
};
