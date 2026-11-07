export const he = {
	shell: {
		brandMark: "T",
		navigation: "ראשי",
		howItWorks: "איך זה עובד",
		liveDemo: "הדגמה חיה",
		packages: "חבילות",
		bookMeeting: "קביעת פגישה",
		ticketNumber: "№ 01",
		myRequests: "הבקשות שלי",
		brand: "Topsyde Studios",
		sample: { kicker: "TOPSIDE", meeting: "פגישה עסקית", request: "בקשה", name: "שם", log: "agent ▸ idle", book: "קביעת פגישה", demo: "לראות את זה עובד", ticketNumber: "№ 01" },
		description: "בניית אתרים ומערכות עם ClassKit. בחרו חבילה וקבעו פגישה עסקית.",
		languageSwitch: "EN",
		languageSwitchLabel: "מעבר לאנגלית",
	},
	showcase: { title: "ברוכים הבאים", placeholder: "היכרות עם השירותים שלנו תופיע כאן." },
	packages: { title: "חבילות", placeholder: "החבילות שלנו יופיעו כאן." },
	"admin-sim": {
		"title": "הדגמה",
		"placeholder": "הדגמת המערכת תופיע כאן.",
		"demoNotice": "זו הדגמה מתוסרטת: לא נשלחת בקשה אמיתית ולא מתבצע שינוי באתר אמיתי.",
		"demoFlag": "DEMO · שום בקשה אמיתית לא נשלחת",
		"demoTiming": "זמן הדגמה · זמנים מקוצרים",
		"back": "אחורה",
		"restart": "להתחיל מחדש",
		"railLabel": "שלבי ההדגמה",
		"topTab": "האתר שלך",
		"underTab": "מתחת לאתר",
		"topLabel": "TOPSIDE · האתר של הלקוחה",
		"underLabel": "UNDERSIDE · הניהול + הסוכן",
		"requestHeader": "בקשה חדשה",
		"typeLabel": "סוג",
		"titleLabel": "כותרת",
		"descriptionLabel": "תיאור",
		"issue": "תקלה",
		"featureRequest": "בקשת פיצ׳ר",
		"attachment": "צילום מסך צורף אוטומטית",
		"open": "פתוח",
		"doing": "בטיפול",
		"done": "הושלם",
		"cardTitle": "כפתור חתוך",
		"agentMark": "AI",
		"progressLabel": "התקדמות התיקון",
		"comparisonLabel": "השוואת לפני ואחרי",
		"before": "לפני",
		"after": "אחרי",
		"ship": {
			"build": "BUILD",
			"test": "TEST",
			"deploy": "DEPLOY"
		},
		"beats": {
			"bug": {
				"title": "משהו נשבר באתר. הכפתור החשוב ביותר — חתוך.",
				"body": "לקוחה כותבת לך בוואטסאפ שהיא לא מצליחה להירשם. במקום לחכות למתכנת: פותחים בקשה מהניהול.",
				"next": "לפתוח בקשה",
				"label": "תקלה"
			},
			"request": {
				"title": "בקשה אחת. בלי טלפונים.",
				"body": "סוג, כותרת, תיאור. צילום המסך מצטרף לבד מהעמוד שבו אתם נמצאים.",
				"next": "לשלוח",
				"label": "בקשה"
			},
			"inbox": {
				"title": "הבקשה מגיעה אליי.",
				"body": "היא נכנסת ללוח העבודה שלי, עם כל ההקשר. אף אחד לא צריך להסביר פעמיים.",
				"next": "לתת לסוכן",
				"label": "אצלי"
			},
			"agent": {
				"title": "סוכן AI לוקח אותה.",
				"body": "הוא קורא את הבקשה, מוצא את הקוד, ומתקן. אני מאשר.",
				"next": "להעלות לאוויר",
				"label": "סוכן"
			},
			"deploy": {
				"title": "בנייה, בדיקות, עלייה.",
				"body": "התיקון עובר בדיקות ועולה לאתר החי. בלי שתעשו כלום.",
				"next": "לראות באתר",
				"label": "עלייה"
			},
			"live": {
				"title": "תוקן. באוויר.",
				"body": "הלקוחה נרשמת. אתם לא הרמתם טלפון. (זמני ההדגמה מקוצרים.)",
				"next": "לקבל סוכן משלך",
				"label": "באוויר"
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
				"siteName": "סטודיו נועה",
				"siteNav": "שיעורים · מערכת · צור קשר",
				"siteTitle": "כוח שמרגישים מחוץ לסטודיו.",
				"siteBody": "שיעורי כוח בקבוצות קטנות. בוחרים שעה, נרשמים, מגיעים.",
				"bookingLabel": "להרשמה לשיעור",
				"defect": "כפתור ההרשמה חתוך במובייל",
				"ticketTitle": "כפתור ההרשמה חתוך במובייל",
				"ticketDescription": "הכפתור בעמוד הבית יוצא מהמסך, אי אפשר להירשם.",
				"screenshotAlt": "צילום מסך להדגמה של כפתור ההרשמה החתוך באתר סטודיו נועה."
			}
		}
	},
	booking: {
		title: "קביעת פגישה עסקית",
		placeholder: "בקשת פגישה עסקית תתאפשר כאן.",
		account: { title: "הבקשות שלי", placeholder: "בקשות הפגישה שלך יופיעו כאן." },
	},
};
