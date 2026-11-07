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
	showcase: { title: "Welcome", placeholder: "An introduction to our services will appear here." },
	packages: { title: "Packages", placeholder: "Our packages will appear here." },
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
			"context": "type: issue · context: / (home)",
			"cardCreated": "→ card created on board 'noya — requests'",
			"claimed": "agent ▸ claimed #214",
			"reading": "reading src/pages/home.tsx",
			"found": "found: .booking-cta translateX(46%) on ≤ 390px",
			"removed": "- .booking-cta { transform: translateX(46%); clip-path: inset(0 52% 0 0); }",
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
