import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useScroll, useSpring, type Variants } from "framer-motion";
import {
	getGoogleMapsNavigationLink,
	getWazeNavigationLink,
	useClassKitClient,
	useProductContext,
	type ClassInformation,
	type ClassListFilters,
	type ClassSummary,
	type ProductDocument,
} from "@class-kit/react";
import {
	ArrowUpRight,
	Ban,
	CalendarDays,
	CheckCircle2,
	ChevronDown,
	Dumbbell,
	Flame,
	KeyRound,
	Languages,
	Lock,
	LogIn,
	LogOut,
	Mail,
	MapPin,
	Moon,
	Settings,
	ShieldCheck,
	Sparkles,
	SunMedium,
	Tag,
	Timer,
	UserPlus,
	UserRound,
	UsersRound,
	Waves,
	X,
} from "lucide-react";
import { ControlDashboardPage } from "./control-dashboard";
import "./i18n";

type Page = "home" | "programs" | "about" | "gallery" | "terms" | "auth" | "profile" | "dashboard";
type AuthMode = "signin" | "signup";
type Theme = "light" | "dark";

const pages: Page[] = ["home", "programs", "about", "gallery", "terms"];
const programListFields: Array<"customData" | "membershipRequirement" | "registeredUsersCount"> = ["customData", "membershipRequirement", "registeredUsersCount"];
const programDetailFields: Array<"customData" | "membershipRequirement" | "cancellationCutoff" | "registeredUsersCount" | "registeredUsersRoster"> = ["customData", "membershipRequirement", "cancellationCutoff", "registeredUsersCount", "registeredUsersRoster"];

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 28 },
	show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.11 } },
};

const galleryImages = [
	{
		key: "image1",
		src: "https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=1400&q=80",
	},
	{
		key: "image2",
		src: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1400&q=80",
	},
	{
		key: "image3",
		src: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1400&q=80",
	},
	{
		key: "image4",
		src: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1400&q=80",
	},
	{
		key: "image5",
		src: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
	},
	{
		key: "image6",
		src: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1400&q=80",
	},
];

export function App() {
	const { t, i18n } = useTranslation();
	const [page, setPage] = useState<Page>("home");
	const [authMode, setAuthMode] = useState<AuthMode>("signin");
	const [theme, setTheme] = useState<Theme>("dark");
	const { capabilities } = useProductContext();
	const { scrollYProgress } = useScroll();
	const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });
	const isHebrew = i18n.language === "he";

	useEffect(() => {
		document.documentElement.lang = i18n.language;
		document.documentElement.dir = isHebrew ? "rtl" : "ltr";
		document.documentElement.dataset.theme = theme;
	}, [i18n.language, isHebrew, theme]);

	const heroImage = useMemo(
		() => "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1800&q=85",
		[],
	);
	const handleAuthDone = useCallback(() => {
		setPage("programs");
	}, []);
	const primaryPages = capabilities.dashboard.can_enter ? (["home", "dashboard", "programs", "about", "gallery"] satisfies Page[]) : pages;

	return (
		<div className="site-shell">
			<motion.div className="scroll-progress" style={{ scaleX }} />
			<header className="topbar">
				<button className="brand-mark" type="button" onClick={() => setPage("home")} aria-label={t("brand")}>
					<span>F</span>
				</button>
				<div className="brand-copy">
					<strong>{t("brand")}</strong>
					<span>{t("tagline")}</span>
				</div>
				<nav className="page-tabs" aria-label="Primary">
					{primaryPages.map((item) => (
						<button className={page === item ? "active" : ""} key={item} type="button" onClick={() => setPage(item)}>
							{t(`nav.${item}`)}
						</button>
					))}
				</nav>
				<div className="utility-actions">
					<button type="button" onClick={() => i18n.changeLanguage(isHebrew ? "en" : "he")}>
						<Languages aria-hidden="true" />
						<span>{t("actions.language")}</span>
					</button>
					<button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
						{theme === "dark" ? <SunMedium aria-hidden="true" /> : <Moon aria-hidden="true" />}
						<span>{theme === "dark" ? t("actions.themeLight") : t("actions.themeDark")}</span>
					</button>
					<AccountMenu
						onAuth={(mode) => {
							setAuthMode(mode);
							setPage("auth");
						}}
						onProfile={() => setPage("profile")}
					/>
				</div>
			</header>

			<main>
				{page === "home" ? <HomePage heroImage={heroImage} setPage={setPage} /> : null}
				{page === "programs" ? <ClassKitProgramsPage onAuth={() => {
					setAuthMode("signin");
					setPage("auth");
				}} /> : null}
				{page === "about" ? <AboutPage /> : null}
				{page === "gallery" ? <GalleryPage /> : null}
				{page === "terms" ? <TermsPage onAuth={() => {
					setAuthMode("signin");
					setPage("auth");
				}} /> : null}
				{page === "auth" ? <AuthPage mode={authMode} setMode={setAuthMode} onDone={handleAuthDone} /> : null}
				{page === "profile" ? <ProfilePage onAuth={() => {
					setAuthMode("signin");
					setPage("auth");
				}} onDashboard={() => setPage("dashboard")} /> : null}
				{page === "dashboard" ? <ControlDashboardPage onAuth={() => {
					setAuthMode("signin");
					setPage("auth");
				}} /> : null}
			</main>
		</div>
	);
}

function AccountMenu({ onAuth, onProfile }: { onAuth: (mode: AuthMode) => void; onProfile: () => void }) {
	const { t } = useTranslation();
	const { session, productUser, signOut } = useProductContext();
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const email = session?.user.email ?? "";
	const initials = getInitials(email);
	const productRoleLabel = productUser
		? t(`account.roles.${productUser.role}`, { defaultValue: formatProductRole(productUser.role) })
		: t("account.memberPending");

	useEffect(() => {
		if (!open) return;

		function closeIfOutside(event: PointerEvent | FocusEvent) {
			const target = event.target;
			if (!(target instanceof Node) || !menuRef.current?.contains(target)) {
				setOpen(false);
			}
		}

		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === "Escape") setOpen(false);
		}

		document.addEventListener("pointerdown", closeIfOutside);
		document.addEventListener("focusin", closeIfOutside);
		document.addEventListener("keydown", closeOnEscape);

		return () => {
			document.removeEventListener("pointerdown", closeIfOutside);
			document.removeEventListener("focusin", closeIfOutside);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [open]);

	async function handleSignOut() {
		await signOut();
		setOpen(false);
	}

	return (
		<div className="account-menu" ref={menuRef}>
			<motion.button
				aria-label={session ? t("account.profile") : t("account.guest")}
				className={session ? "account-trigger signed-in" : "account-trigger"}
				type="button"
				onClick={() => setOpen((value) => !value)}
				whileTap={{ scale: 0.96 }}
			>
				<span className="account-avatar">{session ? initials : <UserRound aria-hidden="true" />}</span>
				<span>{session ? t("account.profile") : t("account.guest")}</span>
				<ChevronDown aria-hidden="true" />
			</motion.button>
			<AnimatePresence>
				{open ? (
					<motion.div
						className="account-popover"
						initial={{ opacity: 0, y: 12, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.97 }}
						transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
					>
						{session ? (
							<>
								<div className="account-popover-head">
									<span className="account-avatar large">{initials}</span>
									<div>
										<strong>{email}</strong>
										<span>{productRoleLabel}</span>
									</div>
								</div>
								<button type="button" onClick={() => {
									setOpen(false);
									onProfile();
								}}>
									<Settings aria-hidden="true" />
									{t("account.settings")}
								</button>
								<button type="button" onClick={handleSignOut}>
									<LogOut aria-hidden="true" />
									{t("account.signOut")}
								</button>
							</>
						) : (
							<>
								<div className="account-popover-head">
									<span className="account-avatar large">
										<UserRound aria-hidden="true" />
									</span>
									<div>
										<strong>{t("account.guestTitle")}</strong>
										<span>{t("account.guestBody")}</span>
									</div>
								</div>
								<button type="button" onClick={() => {
									setOpen(false);
									onAuth("signin");
								}}>
									<LogIn aria-hidden="true" />
									{t("account.signIn")}
								</button>
								<button type="button" onClick={() => {
									setOpen(false);
									onAuth("signup");
								}}>
									<UserPlus aria-hidden="true" />
									{t("account.createAccount")}
								</button>
							</>
						)}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

function AuthPage({ mode, setMode, onDone }: { mode: AuthMode; setMode: (mode: AuthMode) => void; onDone: () => void }) {
	const { t } = useTranslation();
	const { session, product, loading, signIn, signUp, signInWithGoogle, error } = useProductContext();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const isSignUp = mode === "signup";
	const canSignUp = product?.auth_mode === "open";
	const emailPasswordEnabled = product?.email_password_enabled ?? false;
	const googleEnabled = product?.google_oauth_enabled ?? false;
	const isPolicyLoading = loading && !product;
	const hasAuthMethod = isPolicyLoading || emailPasswordEnabled || googleEnabled;

	useEffect(() => {
		if (session) onDone();
	}, [onDone, session]);

	useEffect(() => {
		if (isSignUp && !canSignUp) setMode("signin");
	}, [canSignUp, isSignUp, setMode]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!emailPasswordEnabled) return;
		setSubmitted(true);
		setSubmitting(true);
		try {
			if (isSignUp) await signUp(email, password);
			else await signIn(email, password);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleGoogleAuth() {
		setSubmitted(true);
		setSubmitting(true);
		try {
			await signInWithGoogle();
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<motion.section className="auth-page page-section" initial="hidden" animate="show" variants={stagger}>
			<motion.div className="auth-art" variants={fadeUp}>
				<div className="auth-orbit" aria-hidden="true">
					<motion.span animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />
					<motion.span animate={{ rotate: -360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} />
				</div>
				<p className="eyebrow">
					<ShieldCheck aria-hidden="true" />
					{t("auth.eyebrow")}
				</p>
				<h1>{isSignUp ? t("auth.signupTitle") : t("auth.signinTitle")}</h1>
				<p className="lede">{isSignUp ? t("auth.signupBody") : t("auth.signinBody")}</p>
				<div className="auth-proof-grid">
					<AuthProof icon={<CheckCircle2 aria-hidden="true" />} label={t("auth.proof1")} />
					<AuthProof icon={<Dumbbell aria-hidden="true" />} label={t("auth.proof2")} />
					<AuthProof icon={<Sparkles aria-hidden="true" />} label={t("auth.proof3")} />
				</div>
			</motion.div>
			<motion.form className="auth-panel" onSubmit={handleSubmit} variants={fadeUp}>
				<div className="auth-mode-switch">
					<button className={!isSignUp ? "active" : ""} type="button" onClick={() => setMode("signin")}>
						<LogIn aria-hidden="true" />
						{t("account.signIn")}
					</button>
					{canSignUp ? (
						<button className={isSignUp ? "active" : ""} type="button" onClick={() => setMode("signup")}>
							<UserPlus aria-hidden="true" />
							{t("account.createAccount")}
						</button>
					) : null}
				</div>
				{isPolicyLoading ? <p className="auth-footnote">{t("auth.loadingPolicy")}</p> : null}
				{!hasAuthMethod ? <p className="auth-error">{t("auth.unavailable")}</p> : null}
				{googleEnabled ? (
					<button className="auth-submit" type="button" disabled={submitting} onClick={() => void handleGoogleAuth()}>
						<KeyRound aria-hidden="true" />
						{isSignUp ? t("auth.googleSignup") : t("auth.googleSignin")}
					</button>
				) : null}
				{emailPasswordEnabled ? (
					<>
						<label>
							<span>{t("auth.email")}</span>
							<div className="auth-field">
								<Mail aria-hidden="true" />
								<input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
							</div>
						</label>
						<label>
							<span>{t("auth.password")}</span>
							<div className="auth-field">
								<Lock aria-hidden="true" />
								<input type="password" value={password} autoComplete={isSignUp ? "new-password" : "current-password"} minLength={6} onChange={(event) => setPassword(event.target.value)} required />
							</div>
						</label>
					</>
				) : null}
				{submitted && error ? <p className="auth-error">{error}</p> : null}
				{emailPasswordEnabled ? (
					<button className="auth-submit" type="submit" disabled={submitting}>
						{isSignUp ? <UserPlus aria-hidden="true" /> : <LogIn aria-hidden="true" />}
						{submitting ? t("auth.submitting") : isSignUp ? t("auth.signupSubmit") : t("auth.signinSubmit")}
					</button>
				) : null}
				<p className="auth-footnote">{isSignUp ? t("auth.signupFootnote") : t("auth.signinFootnote")}</p>
			</motion.form>
		</motion.section>
	);
}

function ProfilePage({ onAuth, onDashboard }: { onAuth: () => void; onDashboard: () => void }) {
	const { t } = useTranslation();
	const { session, product, productUser, capabilities, signOut, refreshProductContext, loading } = useProductContext();
	const productRoleLabel = productUser
		? t(`account.roles.${productUser.role}`, { defaultValue: formatProductRole(productUser.role) })
		: t("account.memberPending");

	if (!session) {
		return (
			<motion.section className="profile-page page-section" initial="hidden" animate="show" variants={stagger}>
				<motion.div className="classkit-state" variants={fadeUp}>
					<h2>{t("profile.signedOutTitle")}</h2>
					<p>{t("profile.signedOutBody")}</p>
					<button className="primary-action" type="button" onClick={onAuth}>
						<LogIn aria-hidden="true" />
						{t("account.signIn")}
					</button>
				</motion.div>
			</motion.section>
		);
	}

	return (
		<motion.section className="profile-page page-section" initial="hidden" animate="show" variants={stagger}>
			<motion.div className="profile-hero" variants={fadeUp}>
				<div className="profile-avatar">{getInitials(session.user.email ?? "")}</div>
				<div>
					<p className="eyebrow">{t("profile.eyebrow")}</p>
					<h1>{t("profile.title")}</h1>
					<p className="lede">{session.user.email}</p>
				</div>
			</motion.div>
			<motion.div className="profile-grid" variants={stagger}>
				<ProfileCard icon={<Dumbbell aria-hidden="true" />} title={t("profile.product")} value={product?.name ?? t("profile.unknown")} detail={product?.product_key ?? t("profile.pending")} />
				<ProfileCard icon={<ShieldCheck aria-hidden="true" />} title={t("profile.membership")} value={productRoleLabel} detail={productUser?.status ?? t("profile.pending")} />
				<ProfileCard icon={<Mail aria-hidden="true" />} title={t("profile.identity")} value={t("profile.emailPassword")} detail={t("profile.identityDetail")} />
			</motion.div>
			<motion.div className="profile-actions" variants={fadeUp}>
				{capabilities.dashboard.can_enter ? (
					<button className="profile-action featured" type="button" onClick={onDashboard}>
						<ShieldCheck aria-hidden="true" />
						{t("profile.openDashboard")}
					</button>
				) : null}
				<button className="profile-action" type="button" onClick={refreshProductContext} disabled={loading}>
					<Sparkles aria-hidden="true" />
					{t("profile.refresh")}
				</button>
				<button className="profile-action danger" type="button" onClick={signOut}>
					<LogOut aria-hidden="true" />
					{t("account.signOut")}
				</button>
			</motion.div>
		</motion.section>
	);
}

function AuthProof({ icon, label }: { icon: ReactNode; label: string }) {
	return (
		<div className="auth-proof">
			{icon}
			<span>{label}</span>
		</div>
	);
}

function ProfileCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value: string; detail: string }) {
	return (
		<motion.article className="profile-card" variants={fadeUp} whileHover={{ y: -6 }}>
			<div className="profile-card-icon">{icon}</div>
			<div>
				<span>{title}</span>
				<strong>{value}</strong>
				<p>{detail}</p>
			</div>
		</motion.article>
	);
}

function getInitials(email: string) {
	if (!email) return "F";
	const name = email.split("@")[0] ?? "F";
	return name.slice(0, 2).toUpperCase();
}

function formatProductRole(role: string) {
	return role.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function HomePage({ heroImage, setPage }: { heroImage: string; setPage: (page: Page) => void }) {
	const { t } = useTranslation();

	return (
		<motion.section className="hero page-section" initial="hidden" animate="show" variants={stagger}>
			<div className="hero-media" aria-hidden="true">
				<img src={heroImage} alt="" />
				<div className="hero-scrim" />
				<motion.div className="pulse-ring ring-one" animate={{ scale: [1, 1.12, 1], opacity: [0.28, 0.52, 0.28] }} transition={{ duration: 5.4, repeat: Infinity }} />
				<motion.div className="pulse-ring ring-two" animate={{ y: [0, -18, 0], rotate: [0, 4, 0] }} transition={{ duration: 7.2, repeat: Infinity }} />
			</div>
			<div className="hero-content">
				<motion.p className="eyebrow" variants={fadeUp}>
					<Sparkles aria-hidden="true" />
					{t("home.eyebrow")}
				</motion.p>
				<motion.h1 variants={fadeUp}>{t("home.title")}</motion.h1>
				<motion.p className="lede" variants={fadeUp}>
					{t("home.body")}
				</motion.p>
				<motion.div className="hero-actions" variants={fadeUp}>
					<button className="primary-action" type="button" onClick={() => setPage("about")}>
						{t("actions.book")}
						<ArrowUpRight aria-hidden="true" />
					</button>
					<button className="ghost-action" type="button" onClick={() => setPage("programs")}>
						{t("actions.plans")}
					</button>
				</motion.div>
			</div>
			<motion.div className="hero-showcase" variants={fadeUp}>
				<img src={heroImage} alt="" />
				<div className="showcase-glow" aria-hidden="true" />
				<motion.div className="stat-strip" variants={stagger}>
					<Stat value={t("home.stat1")} label={t("home.stat1Label")} />
					<Stat value={t("home.stat2")} label={t("home.stat2Label")} />
					<Stat value={t("home.stat3")} label={t("home.stat3Label")} />
				</motion.div>
			</motion.div>
			<motion.div className="feature-ribbon" variants={stagger}>
				<Feature icon={<Dumbbell aria-hidden="true" />} text={t("home.feature1")} />
				<Feature icon={<Waves aria-hidden="true" />} text={t("home.feature2")} />
				<Feature icon={<Flame aria-hidden="true" />} text={t("home.feature3")} />
			</motion.div>
			<Programs />
		</motion.section>
	);
}

function ClassKitProgramsPage({ onAuth }: { onAuth: () => void }) {
	const { t, i18n } = useTranslation();
	const classKitClient = useClassKitClient();
	const { session, productUser, capabilities } = useProductContext();
	const [classes, setClasses] = useState<ClassSummary[]>([]);
	const [selectedClass, setSelectedClass] = useState<ClassInformation | null>(null);
	const [loadingClassId, setLoadingClassId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [registeringClassId, setRegisteringClassId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
	const [templateFilterId, setTemplateFilterId] = useState("");
	const [customDataFilterKey, setCustomDataFilterKey] = useState("");
	const [customDataFilterValue, setCustomDataFilterValue] = useState("");
	const [classFilters, setClassFilters] = useState<ClassListFilters>({});
	const isActiveProductUser = productUser?.status === "active";
	const hasActiveMembership = Boolean(productUser?.has_active_membership);
	const isManagerUser = productUser?.role === "manager" || capabilities.dashboard.can_manage_classes;
	const canRegisterAsCustomer = !isManagerUser && (!session || isActiveProductUser);

	useEffect(() => {
		let mounted = true;

		async function loadClasses() {
			setLoading(true);
			setError(null);
			setMessage(null);

			const response = await classKitClient?.classes.list({
				range: monthRange(monthAnchor),
				fields: programListFields,
				filters: classFilters,
			}) ?? {
				data: null,
				error: {
					code: "bad_request" as const,
					message: "Supabase is not configured for this environment.",
				},
			};
			if (!mounted) return;

			if (response.error) {
				setClasses([]);
				setError(response.error.message);
			} else {
				setClasses(response.data.classes);
			}

			setLoading(false);
		}

		void loadClasses();

		return () => {
			mounted = false;
		};
	}, [classFilters, classKitClient, monthAnchor]);

	async function handleOpenClass(classItem: ClassSummary) {
		setLoadingClassId(classItem.id);
		setError(null);
		setMessage(null);
		const response = await classKitClient?.classes.get(classItem.id, { fields: programDetailFields }) ?? {
			data: null,
			error: {
				code: "bad_request" as const,
				message: "Supabase is not configured for this environment.",
			},
		};

		if (response.error) {
			setMessage(response.error.message);
		} else {
			setSelectedClass(response.data.class);
		}
		setLoadingClassId(null);
	}

	async function handleRegister(classItem: ClassSummary) {
		if (isManagerUser) {
			setMessage(t("classKit.managerRegistrationBlocked"));
			return;
		}

		if (!classItem.canRegister) return;

		if (classItem.membershipRequirement === "required" && !hasActiveMembership) return;

		if (!session) {
			onAuth();
			return;
		}

		if (!isActiveProductUser) {
			setMessage(t("classKit.activeAccountRequired"));
			return;
		}

		if (classItem.userRegistrationState) return;

		setRegisteringClassId(classItem.id);
		setError(null);
		setMessage(null);

		const response = await classKitClient?.classes.register(classItem.id) ?? {
			data: null,
			error: {
				code: "bad_request" as const,
				message: "Supabase is not configured for this environment.",
			},
		};

		if (response.error) {
			setMessage(response.error.message);
		} else {
			setMessage(t(`classKit.registrationStatus.${response.data.status}`));
				const nextClasses = await classKitClient?.classes.list({
					range: monthRange(monthAnchor),
					fields: programListFields,
					filters: classFilters,
				});
				if (nextClasses?.data) setClasses(nextClasses.data.classes);
				if (selectedClass?.id === classItem.id) {
					const detail = await classKitClient?.classes.get(classItem.id, { fields: programDetailFields });
					if (detail?.data) setSelectedClass(detail.data.class);
				}
		}

		setRegisteringClassId(null);
	}

	async function handleCancelRegistration(classItem: ClassSummary) {
		const registrationId = classItem.userRegistrationState?.id;
		if (!registrationId || !classItem.canCancelRegistration) return;

		setRegisteringClassId(classItem.id);
		setError(null);
		setMessage(null);

		const response = await classKitClient?.classes.cancelRegistration(registrationId) ?? {
			data: null,
			error: {
				code: "bad_request" as const,
				message: "Supabase is not configured for this environment.",
			},
		};

		if (response.error) {
			setMessage(response.error.message);
		} else {
			setMessage(t("classKit.deregistered"));
				const nextClasses = await classKitClient?.classes.list({
					range: monthRange(monthAnchor),
					fields: programListFields,
					filters: classFilters,
				});
				if (nextClasses?.data) setClasses(nextClasses.data.classes);
				if (selectedClass?.id === classItem.id) {
					const detail = await classKitClient?.classes.get(classItem.id, { fields: programDetailFields });
					if (detail?.data) setSelectedClass(detail.data.class);
				}
		}

		setRegisteringClassId(null);
	}

	const monthCells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);
	const classesByDate = useMemo(() => {
		const grouped = new Map<string, ClassSummary[]>();
		for (const classItem of classes) {
			const key = dateKey(new Date(classItem.startsAt));
			grouped.set(key, [...(grouped.get(key) ?? []), classItem]);
		}
		for (const dayClasses of grouped.values()) {
			dayClasses.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
		}
		return grouped;
	}, [classes]);
	const visibleClassCount = monthCells.reduce((count, cell) => count + (classesByDate.get(dateKey(cell.date))?.length ?? 0), 0);

	return (
		<motion.section className="classkit-page programs-page page-section" initial="hidden" animate="show" variants={stagger}>
			<motion.div className="classkit-heading" variants={fadeUp}>
				<p className="eyebrow">{t("classKit.eyebrow")}</p>
				<h1>{t("classKit.title")}</h1>
				<p className="lede">{t("classKit.body")}</p>
			</motion.div>

			<motion.div className="program-discovery-filters" variants={fadeUp}>
				<label>
					<span>Template ID</span>
					<input value={templateFilterId} onChange={(event) => setTemplateFilterId(event.target.value)} placeholder="Exact template UUID" />
				</label>
				<label>
					<span>Custom-data key</span>
					<input value={customDataFilterKey} onChange={(event) => setCustomDataFilterKey(event.target.value)} placeholder="format" />
				</label>
				<label>
					<span>Equals</span>
					<input value={customDataFilterValue} onChange={(event) => setCustomDataFilterValue(event.target.value)} placeholder="course" disabled={!customDataFilterKey.trim()} />
				</label>
				<button
					type="button"
					onClick={() => setClassFilters({
						...(templateFilterId.trim() ? { templateId: templateFilterId.trim() } : {}),
						...(customDataFilterKey.trim() ? {
							customData: { equals: { [customDataFilterKey.trim()]: customDataFilterValue } },
						} : {}),
					})}
				>
					Apply filters
				</button>
				<button
					type="button"
					onClick={() => {
						setTemplateFilterId("");
						setCustomDataFilterKey("");
						setCustomDataFilterValue("");
						setClassFilters({});
					}}
				>
					Clear filters
				</button>
				<small>Template and searchable custom-data filters combine on the backend.</small>
			</motion.div>

			{loading ? (
				<motion.div className="classkit-state" variants={fadeUp}>
					<span className="loader-bar" />
					<p>{t("classKit.loading")}</p>
				</motion.div>
			) : null}

			{!loading && error ? (
				<motion.div className="classkit-state" variants={fadeUp}>
					<h2>{t("classKit.unavailableTitle")}</h2>
					<p>{t("classKit.unavailableBody")}</p>
					<code>{error}</code>
				</motion.div>
			) : null}

			{message ? <motion.p className="program-register-message" variants={fadeUp}>{message}</motion.p> : null}

			{!loading && !error && classes.length === 0 ? (
				<motion.div className="classkit-state" variants={fadeUp}>
					<h2>{t("classKit.emptyTitle")}</h2>
					<p>{t("classKit.emptyBody")}</p>
				</motion.div>
			) : null}

			{!loading && !error && classes.length > 0 ? (
				<motion.div className="program-schedule" variants={fadeUp}>
					<div className="program-schedule-head">
						<div>
							<h2>{formatMonthTitle(monthAnchor, i18n.language)}</h2>
							<p>{t("classKit.monthSummary", { count: visibleClassCount })}</p>
						</div>
						<div className="program-month-controls">
							<button type="button" onClick={() => setMonthAnchor((current) => addMonths(current, -1))}>{t("classKit.previousMonth")}</button>
							<button type="button" onClick={() => setMonthAnchor(startOfMonth(new Date()))}>{t("classKit.currentMonth")}</button>
							<button type="button" onClick={() => setMonthAnchor((current) => addMonths(current, 1))}>{t("classKit.nextMonth")}</button>
						</div>
					</div>
					<div className="program-month-grid">
						{monthCells.map((cell) => {
							const key = dateKey(cell.date);
							const dayClasses = classesByDate.get(key) ?? [];
							return (
								<div className={cell.inMonth ? "program-month-day" : "program-month-day muted"} key={key}>
									<div className="program-month-day-head">
										<span>{new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(cell.date)}</span>
										<strong>{cell.date.getDate()}</strong>
									</div>
									<div className="program-month-events">
										{dayClasses.length === 0 ? <span>{t("classKit.noClasses")}</span> : null}
										{dayClasses.map((classItem) => (
											<ClassScheduleEvent
												classItem={classItem}
												language={i18n.language}
												onOpen={handleOpenClass}
												onRegister={handleRegister}
												onCancelRegistration={handleCancelRegistration}
												isPending={registeringClassId === classItem.id || loadingClassId === classItem.id}
												isSignedIn={Boolean(session)}
												canRegister={canRegisterAsCustomer}
												hasActiveMembership={hasActiveMembership}
												key={classItem.id}
											/>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</motion.div>
			) : null}
			{selectedClass ? (
				<ClassInformationDialog
					classItem={selectedClass}
					language={i18n.language}
					onClose={() => setSelectedClass(null)}
					onRegister={handleRegister}
					onCancelRegistration={handleCancelRegistration}
					canRegister={canRegisterAsCustomer}
					isPending={registeringClassId === selectedClass.id}
					isSignedIn={Boolean(session)}
					hasActiveMembership={hasActiveMembership}
				/>
			) : null}
		</motion.section>
	);
}

function ClassScheduleEvent({
	classItem,
	language,
	onOpen,
	onRegister,
	onCancelRegistration,
	isPending,
	isSignedIn,
	canRegister,
	hasActiveMembership,
}: {
	classItem: ClassSummary;
	language: string;
	onOpen: (classItem: ClassSummary) => void;
	onRegister: (classItem: ClassSummary) => void;
	onCancelRegistration: (classItem: ClassSummary) => void;
	isPending: boolean;
	isSignedIn: boolean;
	canRegister: boolean;
	hasActiveMembership: boolean;
}) {
	const { t } = useTranslation();
	const start = new Date(classItem.startsAt);
	const timeFormatter = new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" });
	const showsRegistrationCount = classItem.registeredUsersCount !== undefined;
	const booked = classItem.registeredUsersCount ?? 0;
	const registration = classItem.userRegistrationState;
	const action = getClassBookingAction(classItem, {
		canRegister,
		hasActiveMembership,
		isPending,
		isSignedIn,
		t,
	});

	return (
		<button className={`${registration ? "program-schedule-event registered" : "program-schedule-event"} ${classItem.temporalStatus !== "upcoming" ? "expired" : ""}`} type="button" onClick={() => onOpen(classItem)} disabled={isPending}>
			<span className="program-event-time">{timeFormatter.format(start)}</span>
			<strong>{classItem.name}</strong>
			<div className="program-event-meta">
				{showsRegistrationCount ? <small>{booked}/{classItem.capacity}</small> : null}
				{classItem.temporalStatus !== "upcoming" ? <small>{classTemporalLabel(classItem.temporalStatus, t)}</small> : null}
				<small>{classItem.registrationPolicy === "approval_required" ? t("classKit.approvalRequired") : classItem.registrationPolicy === "auto_approve" ? t("classKit.autoApprove") : t("classKit.memberAutoApprove")}</small>
			</div>
			{!action ? null : action.kind === "label" ? (
				<small className="program-register-action">{action.label}</small>
			) : (
				<small className="program-register-action" onClick={(event) => {
					event.stopPropagation();
					if (action.kind === "register") onRegister(classItem);
					if (action.kind === "cancel") onCancelRegistration(classItem);
				}}>
					{action.label}
				</small>
			)}
		</button>
	);
}

function ClassInformationDialog({
	classItem,
	language,
	onClose,
	onRegister,
	onCancelRegistration,
	canRegister,
	isPending,
	isSignedIn,
	hasActiveMembership,
}: {
	classItem: ClassInformation;
	language: string;
	onClose: () => void;
	onRegister: (classItem: ClassSummary) => void;
	onCancelRegistration: (classItem: ClassSummary) => void;
	canRegister: boolean;
	isPending: boolean;
	isSignedIn: boolean;
	hasActiveMembership: boolean;
}) {
	const { t } = useTranslation();
	const start = new Date(classItem.startsAt);
	const end = new Date(classItem.endsAt);
	const timeFormatter = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" });
	const showsRegistrationCount = classItem.registeredUsersCount !== undefined;
	const booked = classItem.registeredUsersCount ?? 0;
	const remaining = Math.max(classItem.capacity - booked, 0);
	const action = getClassBookingAction(classItem, {
		canRegister,
		hasActiveMembership,
		isPending,
		isSignedIn,
		t,
	});
	const googleMapsUrl = getGoogleMapsNavigationLink(classItem.locationSnapshot, classItem.location);
	const wazeUrl = getWazeNavigationLink(classItem.locationSnapshot, classItem.location);

	return (
		<div
			className="program-dialog-backdrop"
			role="presentation"
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section className="program-dialog" role="dialog" aria-modal="true" aria-labelledby="program-dialog-title">
				<div className="program-dialog-head">
					<div>
						<p className="eyebrow">{classItem.category || t("classKit.categoryFallback")}</p>
						<h3 id="program-dialog-title">{classItem.name}</h3>
						<p>{classItem.description || t("classKit.descriptionFallback")}</p>
					</div>
					<button type="button" onClick={onClose} aria-label={t("classKit.close")}>
						<X aria-hidden="true" />
					</button>
				</div>
				<div className="program-dialog-meta">
					{classItem.temporalStatus !== "upcoming" ? (
						<div className="program-dialog-status">
							<Ban aria-hidden="true" />
							<span>{classTemporalLabel(classItem.temporalStatus, t)}</span>
						</div>
					) : null}
					<div>
						<CalendarDays aria-hidden="true" />
						<span>{timeFormatter.format(start)} - {timeFormatter.format(end)}</span>
					</div>
					<div>
						<MapPin aria-hidden="true" />
						<span>
							{classItem.location || t("classKit.locationFallback")}
							{googleMapsUrl || wazeUrl ? <small className="program-location-links">
								{googleMapsUrl ? <a href={googleMapsUrl} target="_blank" rel="noreferrer">Google Maps</a> : null}
								{wazeUrl ? <a href={wazeUrl} target="_blank" rel="noreferrer">Waze</a> : null}
							</small> : null}
						</span>
					</div>
					<div>
						<Tag aria-hidden="true" />
						<span>{classItem.registrationPolicy === "approval_required" ? t("classKit.approvalRequired") : classItem.registrationPolicy === "auto_approve" ? t("classKit.autoApprove") : t("classKit.memberAutoApprove")}</span>
					</div>
				</div>
				{classItem.locationSnapshot ? (
					<div className="program-dialog-location">
						<strong>{classItem.locationSnapshot.formatted_address}</strong>
						<small>{classItem.locationSnapshot.coordinates.latitude}, {classItem.locationSnapshot.coordinates.longitude}</small>
						<div>{classItem.locationSnapshot.attributions.map((attribution) => attribution.url
							? <a href={attribution.url} target="_blank" rel="noreferrer" key={`${attribution.text}:${attribution.url}`}>{attribution.text}</a>
							: <span key={attribution.text}>{attribution.text}</span>)}</div>
					</div>
				) : null}
				{classItem.cancellationCutoffHours !== undefined ? <p className="program-dialog-policy">Customer cancellation cutoff: {classItem.cancellationCutoffHours} hours before class start.</p> : null}
				{classItem.customData && Object.keys(classItem.customData).length > 0 ? <pre className="program-dialog-custom-data">{JSON.stringify(classItem.customData, null, 2)}</pre> : null}
				<div className="program-dialog-stats">
					<div>
						<strong>{classItem.capacity}</strong>
						<span>{t("classKit.capacityLabel")}</span>
					</div>
					{showsRegistrationCount ? (
						<>
							<div>
								<strong>{booked}</strong>
								<span>{t("classKit.registeredUsers")}</span>
							</div>
							<div>
								<strong>{remaining}</strong>
								<span>{t("classKit.remainingSpots")}</span>
							</div>
						</>
					) : null}
				</div>
				{classItem.registeredUsersRoster ? (
					<div className="program-dialog-roster">
						<div className="program-dialog-section-head">
							<UsersRound aria-hidden="true" />
							<h4>{t("classKit.rosterTitle")}</h4>
						</div>
						{classItem.registeredUsersRoster.length > 0 ? (
							<ul>
								{classItem.registeredUsersRoster.map((entry) => (
									<li key={entry.userId}>
										<span>{formatRosterName(entry, t("classKit.rosterFallback"))}</span>
									</li>
								))}
							</ul>
						) : (
							<p>{t("classKit.rosterEmpty")}</p>
						)}
					</div>
				) : null}
				<div className="program-dialog-actions">
					{!action ? null : action.kind === "label" ? (
						<span className="program-register-action">{action.label}</span>
					) : (
						<button type="button" onClick={() => {
							if (action.kind === "register") onRegister(classItem);
							if (action.kind === "cancel") onCancelRegistration(classItem);
						}} disabled={isPending}>
							{action.label}
						</button>
					)}
				</div>
			</section>
		</div>
	);
}

function formatRosterName(entry: { displayName: string | null; email: string | null }, fallback: string) {
	return entry.displayName || entry.email || fallback;
}

function getClassBookingAction(
	classItem: ClassSummary,
	options: {
		canRegister: boolean;
		hasActiveMembership: boolean;
		isPending: boolean;
		isSignedIn: boolean;
		t: ReturnType<typeof useTranslation>["t"];
	},
): { kind: "register" | "cancel" | "label"; label: string } | null {
	const registration = classItem.userRegistrationState;
	const liveRegistration = registration?.status === "pending" || registration?.status === "approved";

	if (options.isPending) {
		return { kind: "label", label: options.t("classKit.updatingRegistration") };
	}

	if (classItem.temporalStatus === "started" || classItem.temporalStatus === "ended" || classItem.temporalStatus === "cancelled") {
		return { kind: "label", label: classTemporalLabel(classItem.temporalStatus, options.t) };
	}

	if (liveRegistration && classItem.canCancelRegistration) {
		return { kind: "cancel", label: options.t("classKit.deregister") };
	}

	if (liveRegistration) {
		return { kind: "label", label: options.t(`classKit.registrationStatus.${registration.status}`) };
	}

	if (!options.canRegister) {
		return null;
	}

	if (classItem.membershipRequirement === "required" && !options.hasActiveMembership) {
		return { kind: "label", label: options.t("classKit.membersOnly") };
	}

	if (!classItem.canRegister) {
		return { kind: "label", label: options.t("classKit.expired") };
	}

	return {
		kind: "register",
		label: options.isSignedIn ? options.t("classKit.register") : options.t("classKit.signInToRegister"),
	};
}

function classTemporalLabel(status: ClassSummary["temporalStatus"], t: ReturnType<typeof useTranslation>["t"]) {
	if (status === "started") return t("classKit.started");
	if (status === "ended") return t("classKit.expired");
	if (status === "cancelled") return t("classKit.cancelled");
	return "";
}

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthRange(date: Date) {
	const start = startOfMonth(date);
	const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
	return { start: start.toISOString(), end: end.toISOString() };
}

function addMonths(date: Date, months: number) {
	return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function buildMonthCells(month: Date) {
	const first = startOfMonth(month);
	const start = new Date(first);
	start.setDate(first.getDate() - first.getDay());
	return Array.from({ length: 42 }, (_, index) => {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		return {
			date,
			inMonth: date.getMonth() === first.getMonth(),
		};
	});
}

function dateKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthTitle(date: Date, language: string) {
	return new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(date);
}

function Programs() {
	const { t } = useTranslation();
	const programs = [
		{ title: t("home.program1"), text: t("home.program1Text"), icon: Dumbbell },
		{ title: t("home.program2"), text: t("home.program2Text"), icon: Timer },
		{ title: t("home.program3"), text: t("home.program3Text"), icon: Waves },
	];

	return (
		<motion.section className="programs content-band" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-120px" }} variants={stagger}>
			<motion.div className="section-heading" variants={fadeUp}>
				<p className="eyebrow">{t("home.programTitle")}</p>
				<p>{t("home.programBody")}</p>
			</motion.div>
			<div className="program-grid">
				{programs.map((program, index) => {
					const Icon = program.icon;
					return (
						<motion.article className="program-card" key={program.title} variants={fadeUp} whileHover={{ y: -8, rotateX: 2 }}>
							<span className="program-index">{String(index + 1).padStart(2, "0")}</span>
							<Icon aria-hidden="true" />
							<h2>{program.title}</h2>
							<p>{program.text}</p>
						</motion.article>
					);
				})}
			</div>
		</motion.section>
	);
}

function AboutPage() {
	const { t } = useTranslation();
	const values = [
		{ title: t("about.value1"), text: t("about.value1Text") },
		{ title: t("about.value2"), text: t("about.value2Text") },
		{ title: t("about.value3"), text: t("about.value3Text") },
	];

	return (
		<motion.section className="about page-section" initial="hidden" animate="show" variants={stagger}>
			<div className="about-portrait">
				<motion.img
					src="https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=1400&q=85"
					alt=""
					initial={{ clipPath: "inset(16% 12% 16% 12% round 28px)" }}
					animate={{ clipPath: "inset(0% 0% 0% 0% round 28px)" }}
					transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
				/>
			</div>
			<div className="about-copy">
				<motion.p className="eyebrow" variants={fadeUp}>
					{t("about.eyebrow")}
				</motion.p>
				<motion.h1 variants={fadeUp}>{t("about.title")}</motion.h1>
				<motion.p className="lede" variants={fadeUp}>
					{t("about.body")}
				</motion.p>
				<motion.blockquote variants={fadeUp}>{t("about.quote")}</motion.blockquote>
			</div>
			<motion.div className="value-grid" variants={stagger}>
				{values.map((value) => (
					<motion.article className="value-card" key={value.title} variants={fadeUp}>
						<h2>{value.title}</h2>
						<p>{value.text}</p>
					</motion.article>
				))}
			</motion.div>
		</motion.section>
	);
}

function TermsPage({ onAuth }: { onAuth: () => void }) {
	const { t } = useTranslation();
	const { client, session } = useProductContext();
	const [documentData, setDocumentData] = useState<ProductDocument | null>(null);
	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadTerms = useCallback(async () => {
		if (!client) return;
		setLoading(true);
		setError(null);
		try {
			const response = await client.productDocuments.get("terms", { locale: "en", fallbackLocale: "en" });
			if (response.error) {
				if (response.error.code === "not_found") {
					setDocumentData(null);
					return;
				}
				throw new Error(response.error.message);
			}
			setDocumentData(response.data.document);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("terms.unavailable"));
		} finally {
			setLoading(false);
		}
	}, [client, t]);

	useEffect(() => {
		void loadTerms();
	}, [loadTerms]);

	const acceptTerms = async () => {
		if (!client || !session || !documentData) return;
		setAccepting(true);
		setError(null);
		try {
			const response = await client.productDocuments.accept("terms", {
				locale: "en",
				fallbackLocale: "en",
				context: "terms_page",
			});
			if (response.error) throw new Error(response.error.message);
			setAccepted(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("terms.unavailable"));
		} finally {
			setAccepting(false);
		}
	};

	return (
		<motion.section className="terms-page page-section" initial="hidden" animate="show" variants={stagger}>
			<motion.header className="terms-heading" variants={fadeUp}>
				<p className="eyebrow">{t("terms.eyebrow")}</p>
				<h1>{documentData?.title ?? t("terms.title")}</h1>
				{documentData ? <p>{t("terms.version", { version: documentData.version })}</p> : null}
			</motion.header>

			{loading ? <motion.div className="classkit-state" variants={fadeUp}><span className="loader-bar" /><p>{t("terms.loading")}</p></motion.div> : null}
			{!loading && error ? <motion.div className="classkit-state" variants={fadeUp}><p>{t("terms.unavailable")}</p><code>{error}</code></motion.div> : null}
			{!loading && !error && !documentData ? <motion.div className="classkit-state" variants={fadeUp}><p>{t("terms.notPublished")}</p></motion.div> : null}

			{!loading && !error && documentData ? (
				<motion.article className="terms-document" variants={fadeUp}>
					<MarkdownDocument markdown={documentData.content_markdown} />
					<div className="terms-acceptance">
						{accepted ? <p className="dashboard-success">{t("terms.accepted")}</p> : null}
						{session ? (
							<button className="primary-action" type="button" onClick={() => void acceptTerms()} disabled={accepting || accepted}>
								{accepting ? t("terms.accepting") : t("terms.accept")}
							</button>
						) : (
							<button className="primary-action" type="button" onClick={onAuth}>{t("terms.signIn")}</button>
						)}
					</div>
				</motion.article>
			) : null}
		</motion.section>
	);
}

function MarkdownDocument({ markdown }: { markdown: string }) {
	const blocks = markdown.trim().split(/\n\s*\n/);
	return (
		<div className="terms-markdown">
			{blocks.map((block, index) => {
				const lines = block.split("\n");
				const heading = lines[0]?.match(/^(#{1,3})\s+(.+)$/);
				if (heading) {
					const text = heading[2];
					if (heading[1].length === 1) return <h2 key={index}>{text}</h2>;
					if (heading[1].length === 2) return <h3 key={index}>{text}</h3>;
					return <h4 key={index}>{text}</h4>;
				}
				if (lines.every((line) => /^[-*]\s+/.test(line))) {
					return <ul key={index}>{lines.map((line) => <li key={line}>{line.replace(/^[-*]\s+/, "")}</li>)}</ul>;
				}
				return <p key={index}>{lines.map((line, lineIndex) => <span key={`${lineIndex}:${line}`}>{line}{lineIndex < lines.length - 1 ? <br /> : null}</span>)}</p>;
			})}
		</div>
	);
}

function GalleryPage() {
	const { t } = useTranslation();

	return (
		<motion.section className="gallery page-section" initial="hidden" animate="show" variants={stagger}>
			<motion.div className="gallery-heading" variants={fadeUp}>
				<p className="eyebrow">{t("gallery.eyebrow")}</p>
				<h1>{t("gallery.title")}</h1>
				<p className="lede">{t("gallery.body")}</p>
			</motion.div>
			<div className="gallery-grid">
				{galleryImages.map((image, index) => (
					<motion.figure
						className={index === 0 || index === 5 ? "gallery-tile wide" : "gallery-tile"}
						key={image.key}
						variants={fadeUp}
						whileHover={{ scale: 0.985 }}
					>
						<img src={image.src} alt={t(`gallery.${image.key}`)} />
						<figcaption>{t(`gallery.${image.key}`)}</figcaption>
					</motion.figure>
				))}
			</div>
		</motion.section>
	);
}

function Stat({ value, label }: { value: string; label: string }) {
	return (
		<motion.div className="stat" variants={fadeUp}>
			<strong>{value}</strong>
			<span>{label}</span>
		</motion.div>
	);
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
	return (
		<motion.div className="feature-pill" variants={fadeUp}>
			{icon}
			<span>{text}</span>
		</motion.div>
	);
}
