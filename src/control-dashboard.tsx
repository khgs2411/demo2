import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { motion, type Variants } from "framer-motion";
import { CalendarDays, ContactRound, FileText, History, KeyRound, LayoutDashboard, Lock, LogIn, MessageSquare, Paperclip, Pencil, Plus, RefreshCw, Save, Send, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	useProductContext,
	type ProductChangeRequest,
	type ProductChangeRequestStatus,
	type ProductChangeRequestType,
	type ProductAuthMode,
	type ProductManagedPermission,
	type ProductManagedRole,
	type ProductUserListItem,
} from "@class-kit/react";
import { ManagerClassWorkspace } from "./manager-class-workspace";
import { ProductDocumentManager } from "./product-document-manager";
import { CustomerManagement } from "./customer-management";

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 28 },
	show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.11 } },
};

export function ControlDashboardPage({ onAuth }: { onAuth: () => void }) {
	const { t } = useTranslation();
	const { client, session, product, productKey, capabilities, loading, refreshProductContext } = useProductContext();
	const canManageClasses = capabilities.dashboard.can_manage_classes;
	const canManageRoles = capabilities.dashboard.can_manage_roles;
	const canManageUsers = capabilities.dashboard.can_manage_users;
	const canManageAuthMode = capabilities.dashboard.can_manage_auth_mode;
	const canManageChangeRequests = capabilities.permissions.includes("product_change_requests.manage");
	const canManageDocuments = capabilities.permissions.includes("product_documents.manage");
	const [activeView, setActiveView] = useState<DashboardView>("overview");
	const availableViews = useMemo(() => {
		const views: DashboardNavItem[] = [
			{
				key: "overview",
				icon: <LayoutDashboard aria-hidden="true" />,
				title: t("dashboard.modules.overview"),
				body: t("dashboard.moduleBodies.overview"),
			},
		];

		if (canManageClasses) {
			views.push({
				key: "classes",
				icon: <CalendarDays aria-hidden="true" />,
				title: t("dashboard.modules.classes"),
				body: t("dashboard.moduleBodies.classes"),
			});
		}

		if (canManageRoles) {
			views.push({
				key: "roles",
				icon: <ShieldCheck aria-hidden="true" />,
				title: t("dashboard.modules.roles"),
				body: t("dashboard.moduleBodies.roles"),
			});
		}

		if (canManageUsers) {
			views.push({
				key: "customers",
				icon: <ContactRound aria-hidden="true" />,
				title: "Customers",
				body: "Create service recipients and merge ghost history.",
			});

			views.push({
				key: "users",
				icon: <UsersRound aria-hidden="true" />,
				title: t("dashboard.modules.users"),
				body: t("dashboard.moduleBodies.users"),
			});
		}

		if (canManageAuthMode) {
			views.push({
				key: "access",
				icon: <Lock aria-hidden="true" />,
				title: t("dashboard.modules.auth"),
				body: t("dashboard.moduleBodies.auth"),
			});
		}

		if (canManageChangeRequests) {
			views.push({
				key: "requests",
				icon: <MessageSquare aria-hidden="true" />,
				title: t("dashboard.modules.requests"),
				body: t("dashboard.moduleBodies.requests"),
			});
		}

		if (canManageDocuments) {
			views.push({
				key: "documents",
				icon: <FileText aria-hidden="true" />,
				title: t("dashboard.modules.documents"),
				body: t("dashboard.moduleBodies.documents"),
			});
		}

		return views;
	}, [canManageAuthMode, canManageChangeRequests, canManageClasses, canManageDocuments, canManageRoles, canManageUsers, t]);
	const resolvedActiveView = availableViews.some((view) => view.key === activeView) ? activeView : availableViews[0]?.key ?? "overview";
	const moduleCount = availableViews.filter((view) => view.key !== "overview").length;

	if (loading) {
		return <DashboardState title={t("dashboard.loadingTitle")} body={t("dashboard.loadingBody")} />;
	}

	if (!session) {
		return (
			<DashboardState
				title={t("dashboard.signedOutTitle")}
				body={t("dashboard.signedOutBody")}
				actionLabel={t("account.signIn")}
				onAction={onAuth}
			/>
		);
	}

	if (!capabilities.dashboard.can_enter) {
		return <DashboardState title={t("dashboard.forbiddenTitle")} body={t("dashboard.forbiddenBody")} />;
	}

	return (
		<motion.section className="dashboard-page dashboard-ops page-section" initial="hidden" animate="show" variants={stagger}>
			<motion.header className="dashboard-topbar" variants={fadeUp}>
				<div className="dashboard-title-block">
					<p className="eyebrow">
						<ShieldCheck aria-hidden="true" />
						{t("dashboard.eyebrow")}
					</p>
					<h1>{product?.name ?? t("profile.unknown")}</h1>
					<p>{t("dashboard.body", { product: product?.name ?? t("profile.unknown") })}</p>
				</div>
				<div className="dashboard-metrics" aria-label={t("dashboard.summaryLabel")}>
					<DashboardMetric label={t("dashboard.summary.product")} value={productKey || "-"} />
					<DashboardMetric label={t("dashboard.summary.access")} value={formatAuthMode(product?.auth_mode, t)} />
					<DashboardMetric label={t("dashboard.summary.modules")} value={String(moduleCount)} />
				</div>
			</motion.header>

			<motion.div className="dashboard-shell" variants={fadeUp}>
				<nav className="dashboard-nav" aria-label={t("dashboard.navLabel")}>
					{availableViews.map((view) => (
						<button
							type="button"
							className={resolvedActiveView === view.key ? "active" : ""}
							onClick={() => setActiveView(view.key)}
							aria-current={resolvedActiveView === view.key ? "page" : undefined}
							key={view.key}
						>
							<span className="dashboard-nav-icon">{view.icon}</span>
							<span>
								<strong>{view.title}</strong>
								<small>{view.body}</small>
							</span>
						</button>
					))}
				</nav>

				<div className="dashboard-main-panel">
					{resolvedActiveView === "overview" ? (
						<DashboardOverview
							views={availableViews.filter((view) => view.key !== "overview")}
							permissions={capabilities.permissions.length}
							authMode={product?.auth_mode}
							onSelect={setActiveView}
						/>
					) : null}

					{resolvedActiveView === "classes" && canManageClasses ? (
						<div className="dashboard-workflow-surface">
							<ManagerClassWorkspace />
						</div>
					) : null}

					{resolvedActiveView === "roles" && canManageRoles ? <RolesModule client={client} /> : null}
					{resolvedActiveView === "customers" && canManageUsers ? <CustomerManagement client={client} /> : null}
					{resolvedActiveView === "users" && canManageUsers ? <UsersModule client={client} /> : null}
					{resolvedActiveView === "access" && canManageAuthMode ? (
						<AuthModeModule
							key={`${productKey}:${product?.auth_mode ?? "open"}`}
							client={client}
							productKey={productKey}
							currentAuthMode={product?.auth_mode}
							refreshProductContext={refreshProductContext}
						/>
					) : null}
					{resolvedActiveView === "requests" && canManageChangeRequests ? <ChangeRequestsModule client={client} /> : null}
					{resolvedActiveView === "documents" && canManageDocuments ? <ProductDocumentManager /> : null}
				</div>
			</motion.div>
		</motion.section>
	);
}

type DashboardView = "overview" | "classes" | "roles" | "customers" | "users" | "access" | "requests" | "documents";

type DashboardNavItem = {
	key: DashboardView;
	icon: ReactNode;
	title: string;
	body: string;
};

function DashboardMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="dashboard-metric">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function DashboardOverview({
	views,
	permissions,
	authMode,
	onSelect,
}: {
	views: DashboardNavItem[];
	permissions: number;
	authMode?: ProductAuthMode;
	onSelect: (view: DashboardView) => void;
}) {
	const { t } = useTranslation();

	return (
		<div className="dashboard-overview">
			<div className="dashboard-overview-strip">
				<DashboardMetric label={t("dashboard.overview.modules")} value={String(views.length)} />
				<DashboardMetric label={t("dashboard.overview.permissions")} value={String(permissions)} />
				<DashboardMetric label={t("dashboard.overview.access")} value={formatAuthMode(authMode, t)} />
			</div>
			<div className="dashboard-overview-actions">
				{views.length === 0 ? <p className="dashboard-muted">{t("dashboard.emptyBody")}</p> : null}
				{views.map((view) => (
					<button type="button" onClick={() => onSelect(view.key)} key={view.key}>
						<span className="dashboard-nav-icon">{view.icon}</span>
						<span>
							<strong>{view.title}</strong>
							<small>{view.body}</small>
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

function formatAuthMode(authMode: ProductAuthMode | undefined, t: (key: string) => string) {
	if (authMode === "invite_only") return t("dashboard.authMode.inviteOnly");
	if (authMode === "open") return t("dashboard.authMode.open");
	return "-";
}

function DashboardState({
	title,
	body,
	actionLabel,
	onAction,
	compact = false,
}: {
	title: string;
	body: string;
	actionLabel?: string;
	onAction?: () => void;
	compact?: boolean;
}) {
	return (
		<motion.section className={compact ? "dashboard-state compact" : "dashboard-state page-section"} initial="hidden" animate="show" variants={stagger}>
			<motion.div className="dashboard-state-icon" variants={fadeUp}>
				<ShieldCheck aria-hidden="true" />
			</motion.div>
			<motion.h1 variants={fadeUp}>{title}</motion.h1>
			<motion.p variants={fadeUp}>{body}</motion.p>
			{actionLabel && onAction ? (
				<motion.button className="primary-action" type="button" onClick={onAction} variants={fadeUp}>
					<LogIn aria-hidden="true" />
					{actionLabel}
				</motion.button>
			) : null}
		</motion.section>
	);
}

type DashboardClient = ReturnType<typeof useProductContext>["client"];

function RolesModule({ client }: { client: DashboardClient }) {
	const { t } = useTranslation();
	const [roles, setRoles] = useState<ProductManagedRole[]>([]);
	const [permissions, setPermissions] = useState<ProductManagedPermission[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [newRole, setNewRole] = useState({ key: "", name: "", level: "20" });
	const [pendingPermission, setPendingPermission] = useState<string | null>(null);
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
	const [selectedPermissionGroupKey, setSelectedPermissionGroupKey] = useState<string | null>(null);
	const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
	const permissionsByKey = useMemo(() => new Map(permissions.map((permission) => [permission.key, permission])), [permissions]);
	const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);
	const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;
	const selectedPermissionGroup = groupedPermissions.find((group) => group.key === selectedPermissionGroupKey) ?? groupedPermissions[0] ?? null;

	const loadRoles = useCallback(async () => {
		await Promise.resolve();
		if (!client) return;
		setLoading(true);
		setError(null);
		try {
			const [roleData, permissionData] = await Promise.all([
				client.management.roles.list(),
				client.management.roles.listPermissions(),
			]);
			setRoles(roleData.roles);
			setPermissions(permissionData.permissions);
			setSelectedRoleId((current) => current && roleData.roles.some((role) => role.id === current) ? current : roleData.roles[0]?.id ?? null);
			setSelectedPermissionGroupKey((current) => current && permissionData.permissions.some((permission) => (permission.groupKey ?? "other") === current) ? current : permissionData.permissions[0]?.groupKey ?? "other");
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setLoading(false);
		}
	}, [client, t]);

	useEffect(() => {
		let cancelled = false;
		if (!client) return;
		void Promise.all([client.management.roles.list(), client.management.roles.listPermissions()])
			.then(([roleData, permissionData]) => {
				if (cancelled) return;
				setRoles(roleData.roles);
				setPermissions(permissionData.permissions);
				setSelectedRoleId((current) => current && roleData.roles.some((role) => role.id === current) ? current : roleData.roles[0]?.id ?? null);
				setSelectedPermissionGroupKey((current) => current && permissionData.permissions.some((permission) => (permission.groupKey ?? "other") === current) ? current : permissionData.permissions[0]?.groupKey ?? "other");
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : t("dashboard.status.error"));
			});
		return () => {
			cancelled = true;
		};
	}, [client, t]);

	const createRole = async () => {
		if (!client || !newRole.key.trim() || !newRole.name.trim()) return;
		setSaving(true);
		setError(null);
		setSaved(false);
		try {
			await client.management.roles.create({
				key: newRole.key.trim(),
				name: newRole.name.trim(),
				level: Number.parseInt(newRole.level, 10),
			});
			setNewRole({ key: "", name: "", level: "20" });
			setSaved(true);
			setIsCreateRoleOpen(false);
			await loadRoles();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setSaving(false);
		}
	};

	const changePermission = async (role: ProductManagedRole, permissionKey: string, shouldGrant: boolean) => {
		if (!client || role.key === "manager") return;
		const pendingKey = `${role.id}:${permissionKey}`;
		setPendingPermission(pendingKey);
		setSaving(true);
		setError(null);
		setSaved(false);
		try {
			if (shouldGrant) {
				await client.management.roles.grantPermission({ roleId: role.id, permissionKey });
			} else {
				await client.management.roles.revokePermission({ roleId: role.id, permissionKey });
			}
			setSaved(true);
			await loadRoles();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setPendingPermission(null);
			setSaving(false);
		}
	};

	return (
		<div className="dashboard-stack">
			<DashboardStatus loading={loading} saved={saved} error={error} />
			<div className="dashboard-role-workspace">
				<aside className="dashboard-role-rail">
					<div className="dashboard-role-rail-head">
						<div>
							<strong>{t("dashboard.modules.roles")}</strong>
							<span>{roles.length} configured</span>
						</div>
						<button className="mini-action save" type="button" onClick={() => setIsCreateRoleOpen(true)} disabled={!client || saving}>
							<Plus aria-hidden="true" />
							{t("dashboard.roles.create")}
						</button>
					</div>

					<div className="dashboard-role-list">
						{roles.length === 0 && !loading ? <p className="dashboard-muted">{t("dashboard.roles.empty")}</p> : null}
						{roles.map((role) => {
							const isSelected = selectedRole?.id === role.id;
							return (
								<button
									type="button"
									className={isSelected ? "dashboard-role-list-item active" : "dashboard-role-list-item"}
									onClick={() => setSelectedRoleId(role.id)}
									key={role.id}
								>
									<span>
										<strong>{role.name}</strong>
										<small>{role.key} · {t("dashboard.roles.levelValue", { level: role.level })}</small>
									</span>
									<em>{role.permissions.length}</em>
								</button>
							);
						})}
					</div>
				</aside>

				{selectedRole ? (
					<section className="dashboard-role-editor">
						<div className="dashboard-role-head">
							<div>
								<strong>{selectedRole.name}</strong>
								<span>{selectedRole.key} - {t("dashboard.roles.levelValue", { level: selectedRole.level })}</span>
								<small>
									{selectedRole.key === "manager"
										? t("dashboard.roles.managerReadonly")
										: t("dashboard.roles.bundleApplies")}
								</small>
							</div>
							<span className={selectedRole.key === "manager" ? "dashboard-role-badge muted" : "dashboard-role-badge"}>
								{selectedRole.is_builtin ? t("dashboard.roles.protected") : t("dashboard.roles.custom")}
							</span>
						</div>
						<div className="dashboard-role-detail-grid">
							<div className="dashboard-permission-category-list">
								{groupedPermissions.length === 0 ? <p className="dashboard-muted">{t("dashboard.roles.noCatalog")}</p> : null}
								{groupedPermissions.map((group) => {
									const grantCount = group.permissions.filter((permission) => selectedRole.permissions.includes(permission.key)).length;
									const isSelected = selectedPermissionGroup?.key === group.key;
									return (
										<button
											type="button"
											className={isSelected ? "dashboard-permission-category active" : "dashboard-permission-category"}
											onClick={() => setSelectedPermissionGroupKey(group.key)}
											key={group.key}
										>
											<span>
												<strong>{group.label}</strong>
												<small>{grantCount}/{group.permissions.length} granted</small>
											</span>
											<em>{group.permissions.length}</em>
										</button>
									);
								})}
							</div>
							{selectedPermissionGroup ? (
								<RolePermissionCategoryEditor
									role={selectedRole}
									group={selectedPermissionGroup}
									permissionsByKey={permissionsByKey}
									pendingPermission={pendingPermission}
									saving={saving}
									onChange={changePermission}
								/>
							) : null}
						</div>
					</section>
				) : null}
			</div>
			{isCreateRoleOpen ? (
				<RoleCreateDialog
					newRole={newRole}
					setNewRole={setNewRole}
					saving={saving}
					canCreate={Boolean(client) && !saving && Boolean(newRole.key.trim()) && Boolean(newRole.name.trim())}
					onCreate={createRole}
					onClose={() => setIsCreateRoleOpen(false)}
				/>
			) : null}
		</div>
	);
}

function RoleCreateDialog({
	newRole,
	setNewRole,
	saving,
	canCreate,
	onCreate,
	onClose,
}: {
	newRole: { key: string; name: string; level: string };
	setNewRole: Dispatch<SetStateAction<{ key: string; name: string; level: string }>>;
	saving: boolean;
	canCreate: boolean;
	onCreate: () => Promise<void>;
	onClose: () => void;
}) {
	const { t } = useTranslation();

	return (
		<div className="dashboard-modal-backdrop" role="presentation" onPointerDown={(event) => {
			if (event.target === event.currentTarget) onClose();
		}}>
			<section className="dashboard-modal compact" role="dialog" aria-modal="true" aria-labelledby="role-create-title">
				<div className="dashboard-modal-head">
					<div>
						<h3 id="role-create-title">{t("dashboard.roles.create")}</h3>
						<p>{t("dashboard.roles.bundleApplies")}</p>
					</div>
					<button type="button" onClick={onClose} aria-label={t("classKit.close")}>
						<X aria-hidden="true" />
					</button>
				</div>
				<div className="dashboard-form-grid">
					<label className="dashboard-field">
						<span>{t("dashboard.roles.key")}</span>
						<input value={newRole.key} onChange={(event) => setNewRole((current) => ({ ...current, key: event.target.value }))} disabled={saving} />
					</label>
					<label className="dashboard-field">
						<span>{t("dashboard.roles.name")}</span>
						<input value={newRole.name} onChange={(event) => setNewRole((current) => ({ ...current, name: event.target.value }))} disabled={saving} />
					</label>
					<label className="dashboard-field">
						<span>{t("dashboard.roles.level")}</span>
						<input value={newRole.level} onChange={(event) => setNewRole((current) => ({ ...current, level: event.target.value }))} inputMode="numeric" disabled={saving} />
					</label>
				</div>
				<div className="dashboard-modal-actions">
					<button className="mini-action" type="button" onClick={onClose} disabled={saving}>
						{t("classKit.close")}
					</button>
					<button className="mini-action save" type="button" onClick={() => void onCreate()} disabled={!canCreate}>
						<Plus aria-hidden="true" />
						{t("dashboard.roles.create")}
					</button>
				</div>
			</section>
		</div>
	);
}

function RolePermissionCategoryEditor({
	role,
	group,
	permissionsByKey,
	pendingPermission,
	saving,
	onChange,
}: {
	role: ProductManagedRole;
	group: { key: string; label: string; permissions: ProductManagedPermission[] };
	permissionsByKey: Map<string, ProductManagedPermission>;
	pendingPermission: string | null;
	saving: boolean;
	onChange: (role: ProductManagedRole, permissionKey: string, shouldGrant: boolean) => Promise<void>;
}) {
	const { t } = useTranslation();
	const rolePermissionSet = useMemo(() => new Set(role.permissions), [role.permissions]);
	const isReadonly = role.key === "manager";
	const grantCount = group.permissions.filter((permission) => rolePermissionSet.has(permission.key)).length;

	return (
		<section className="dashboard-permission-editor">
			<div className="dashboard-permission-editor-head">
				<div>
					<strong>{group.label}</strong>
					<span>{grantCount}/{group.permissions.length} granted</span>
				</div>
				{isReadonly ? <em>{t("dashboard.roles.managerReadonly")}</em> : null}
			</div>
			<div className="dashboard-permission-option-list">
				{group.permissions.map((permission) => {
					const checked = rolePermissionSet.has(permission.key);
					const pending = pendingPermission === `${role.id}:${permission.key}`;
					return (
						<label className="dashboard-permission-option" key={permission.key}>
							<input
								type="checkbox"
								checked={checked}
								disabled={saving || pending || isReadonly}
								onChange={(event) => void onChange(role, permission.key, event.target.checked)}
							/>
							<span>
								<strong>{permissionsByKey.get(permission.key)?.label ?? permission.label}</strong>
								{permission.description ? <small>{permission.description}</small> : null}
							</span>
						</label>
					);
				})}
			</div>
		</section>
	);
}

function groupPermissions(permissions: ProductManagedPermission[]) {
	const groups = new Map<string, { key: string; label: string; permissions: ProductManagedPermission[] }>();
	for (const permission of permissions) {
		const key = permission.groupKey ?? "other";
		const group = groups.get(key) ?? {
			key,
			label: permission.groupLabel ?? "Other",
			permissions: [],
		};
		group.permissions.push(permission);
		groups.set(key, group);
	}

	return [...groups.values()].map((group) => ({
		...group,
		permissions: group.permissions.sort((left, right) =>
			(left.sortOrder ?? 1000) - (right.sortOrder ?? 1000) ||
			left.label.localeCompare(right.label),
		),
	}));
}

function UsersModule({ client }: { client: DashboardClient }) {
	const { t } = useTranslation();
	const [roles, setRoles] = useState<ProductManagedRole[]>([]);
	const [users, setUsers] = useState<ProductUserListItem[]>([]);
	const [userId, setUserId] = useState("");
	const [roleId, setRoleId] = useState("");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const loadUsers = useCallback(async () => {
		await Promise.resolve();
		if (!client) return;
		setLoading(true);
		setError(null);
		try {
			const [roleData, usersData] = await Promise.all([client.management.roles.list(), client.management.users.list()]);
			setRoles(roleData.roles);
			setUsers(usersData.users);
			setRoleId((current) => current || roleData.roles[0]?.id || "");
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setLoading(false);
		}
	}, [client, t]);

	useEffect(() => {
		let cancelled = false;
		if (!client) return;
		void Promise.all([client.management.roles.list(), client.management.users.list()])
			.then(([roleData, usersData]) => {
				if (cancelled) return;
				setRoles(roleData.roles);
				setUsers(usersData.users);
				setRoleId((current) => current || roleData.roles[0]?.id || "");
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : t("dashboard.status.error"));
			});
		return () => {
			cancelled = true;
		};
	}, [client, t]);

	const assignRole = async () => {
		if (!client || !userId.trim() || !roleId) return;
		setSaving(true);
		setError(null);
		setSaved(false);
		try {
			await client.management.users.roles.assign({ userId: userId.trim(), roleId });
			setUserId("");
			setSaved(true);
			await loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="dashboard-stack">
			<div className="dashboard-form-grid">
				<label className="dashboard-field">
					<span>{t("dashboard.users.userId")}</span>
					<input value={userId} onChange={(event) => setUserId(event.target.value)} />
				</label>
				<label className="dashboard-field">
					<span>{t("dashboard.users.role")}</span>
					<select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
						{roles.map((role) => (
							<option value={role.id} key={role.id}>{role.name}</option>
						))}
					</select>
				</label>
				<button className="mini-action" type="button" onClick={assignRole} disabled={!client || saving || !userId.trim() || !roleId}>
					<KeyRound aria-hidden="true" />
					{t("dashboard.users.assign")}
				</button>
			</div>
			<DashboardStatus loading={loading} saved={saved} error={error} />
			<div className="dashboard-list">
				{users.length === 0 && !loading ? <p className="dashboard-muted">{t("dashboard.users.empty")}</p> : null}
				{users.map((user) => {
					const roleNames = (user.roles ?? [])
						.filter((assignment) => assignment.status === "active")
						.map((assignment) => assignment.role_name ?? assignment.role_key)
						.filter((value): value is string => Boolean(value));
					return <div className="dashboard-list-row slim" key={user.user_id}>
						<div>
							<strong>{user.display_name || user.email || `User ${shortRecordId(user.user_id)}`}</strong>
							<span>{user.email ?? `User ID ${shortRecordId(user.user_id)}`}</span>
						</div>
						<small title={user.user_id}>{roleNames.join(", ") || user.role} · {user.status}</small>
					</div>;
				})}
			</div>
		</div>
	);
}

function shortRecordId(value: string) {
	return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

type ChangeRequestForm = {
	type: ProductChangeRequestType;
	contextKey: string;
	title: string;
	description: string;
};

function ChangeRequestsModule({ client }: { client: DashboardClient }) {
	const { t } = useTranslation();
	const [requests, setRequests] = useState<ProductChangeRequest[]>([]);
	const [form, setForm] = useState<ChangeRequestForm>({
		type: "feature_request",
		contextKey: "",
		title: "",
		description: "",
	});
	const [attachment, setAttachment] = useState<File | null>(null);
	const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
	const [fileInputKey, setFileInputKey] = useState(0);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const pageOptions = useMemo(
		() => [
			{ key: "", label: t("dashboard.requests.newPage"), context: {} },
			{ key: "home", label: t("nav.home"), context: { view: "home", label: t("nav.home"), path: "/" } },
			{ key: "programs", label: t("nav.programs"), context: { view: "programs", label: t("nav.programs"), path: "/programs" } },
			{ key: "about", label: t("nav.about"), context: { view: "about", label: t("nav.about"), path: "/about" } },
			{ key: "gallery", label: t("nav.gallery"), context: { view: "gallery", label: t("nav.gallery"), path: "/gallery" } },
			{ key: "dashboard", label: t("nav.dashboard"), context: { view: "dashboard", label: t("nav.dashboard"), path: "/dashboard" } },
		],
		[t],
	);
	const selectedContext = pageOptions.find((option) => option.key === form.contextKey)?.context ?? {};
	const resetForm = useCallback(() => {
		setForm({ type: "feature_request", contextKey: "", title: "", description: "" });
		setAttachment(null);
		setEditingRequestId(null);
		setFileInputKey((current) => current + 1);
	}, []);

	const loadRequests = useCallback(async () => {
		await Promise.resolve();
		if (!client) return;
		setLoading(true);
		setError(null);
		try {
			const data = await client.management.changeRequests.list();
			setRequests(data.requests);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setLoading(false);
		}
	}, [client, t]);

	useEffect(() => {
		let cancelled = false;
		if (!client) return;
		void client.management.changeRequests.list()
			.then((data) => {
				if (!cancelled) setRequests(data.requests);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : t("dashboard.status.error"));
			});
		return () => {
			cancelled = true;
		};
	}, [client, t]);

	const saveRequest = async () => {
		if (!client || !form.description.trim()) return;
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			const input = {
				type: form.type,
				context: selectedContext,
				title: form.title.trim() || null,
				description: form.description.trim(),
			};
			const result = editingRequestId
				? await client.management.changeRequests.update({ requestId: editingRequestId, ...input })
				: await client.management.changeRequests.create(input);
			if (attachment) {
				await client.management.changeRequests.uploadAttachment(result.request.id, { file: attachment });
			}
			resetForm();
			setSaved(true);
			await loadRequests();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setSaving(false);
		}
	};

	const editRequest = (request: ProductChangeRequest) => {
		setEditingRequestId(request.id);
		setForm({
			type: request.type,
			contextKey: getContextKey(request.context),
			title: request.title ?? "",
			description: request.description,
		});
		setAttachment(null);
		setFileInputKey((current) => current + 1);
	};

	const deleteRequest = async (request: ProductChangeRequest) => {
		if (!client) return;
		if (!window.confirm(t("dashboard.requests.deleteConfirm"))) return;
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			await client.management.changeRequests.delete(request.id);
			if (editingRequestId === request.id) resetForm();
			setSaved(true);
			await loadRequests();
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="dashboard-stack">
			<div className="dashboard-form-grid">
				<label className="dashboard-field">
					<span>{t("dashboard.requests.type")}</span>
					<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ProductChangeRequestType }))} disabled={saving}>
						<option value="feature_request">{t("dashboard.requests.featureRequest")}</option>
						<option value="issue">{t("dashboard.requests.issue")}</option>
					</select>
				</label>
				<label className="dashboard-field">
					<span>{t("dashboard.requests.page")}</span>
					<select value={form.contextKey} onChange={(event) => setForm((current) => ({ ...current, contextKey: event.target.value }))} disabled={saving}>
						{pageOptions.map((option) => <option value={option.key} key={option.key}>{option.label}</option>)}
					</select>
				</label>
				<label className="dashboard-field">
					<span>{t("dashboard.requests.title")}</span>
					<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} disabled={saving} />
				</label>
				<label className="dashboard-field">
					<span>{t("dashboard.requests.attachment")}</span>
					<input key={fileInputKey} type="file" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} disabled={saving} />
				</label>
			</div>
			<label className="dashboard-field">
				<span>{t("dashboard.requests.description")}</span>
				<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} disabled={saving} rows={5} />
			</label>
			<div className="dashboard-inline-actions">
				<button className="mini-action save" type="button" onClick={() => void saveRequest()} disabled={!client || saving || !form.description.trim()}>
					<Send aria-hidden="true" />
					{saving ? t("dashboard.requests.creating") : editingRequestId ? t("dashboard.requests.update") : t("dashboard.requests.create")}
				</button>
				{editingRequestId ? (
					<button className="mini-action" type="button" onClick={resetForm} disabled={saving}>
						<X aria-hidden="true" />
						{t("dashboard.requests.cancelEdit")}
					</button>
				) : null}
				<button className="mini-action" type="button" onClick={() => void loadRequests()} disabled={!client || loading || saving}>
					<RefreshCw aria-hidden="true" />
					{t("dashboard.requests.refresh")}
				</button>
			</div>
			<DashboardStatus loading={loading || saving} saved={saved} error={error} />
			<div className="dashboard-list">
				{requests.length === 0 && !loading ? <p className="dashboard-muted">{t("dashboard.requests.empty")}</p> : null}
				{requests.map((request) => (
					<div className="dashboard-list-row" key={request.id}>
						<div>
							<strong>{request.title || request.description}</strong>
							<span>{request.description}</span>
							<small>
								{formatRequestType(request.type, t)} · {t("dashboard.requests.internalStatus", { status: formatRequestStatus(request.status, t) })} · {t("dashboard.requests.versionValue", { version: request.version_number })}
								{formatRequestContext(request.context) ? ` · ${formatRequestContext(request.context)}` : ""}
							</small>
						</div>
						<small>
							{getRequestThreadAttachments(request).length > 0 ? (
								<span>
									<Paperclip aria-hidden="true" />
									{formatAttachmentCount(getRequestThreadAttachments(request).length, t)}
								</span>
							) : null}
							{formatDate(request.created_at)}
						</small>
						<RequestRevisionHistory request={request} />
						<div className="dashboard-inline-actions">
							<button className="mini-action" type="button" onClick={() => editRequest(request)} disabled={saving}>
								<Pencil aria-hidden="true" />
								{t("dashboard.requests.edit")}
							</button>
							<button className="mini-action" type="button" onClick={() => void deleteRequest(request)} disabled={saving}>
								<Trash2 aria-hidden="true" />
								{t("dashboard.requests.delete")}
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function RequestRevisionHistory({ request }: { request: ProductChangeRequest }) {
	const { t } = useTranslation();
	const revisions = [...(request.revisions ?? [])].sort((left, right) => right.version_number - left.version_number);
	const visibleRevisions = revisions.length > 0 ? revisions : [request];

	return (
		<div className="dashboard-request-history">
			<div className="dashboard-request-history-title">
				<History aria-hidden="true" />
				<span>{t("dashboard.requests.history")}</span>
			</div>
			<div className="dashboard-request-revisions">
				{visibleRevisions.map((revision) => (
					<div className="dashboard-request-revision" key={revision.id}>
						<div>
							<strong>{t("dashboard.requests.versionValue", { version: revision.version_number })}</strong>
							<span>{revision.title || revision.description}</span>
							<small>
								{formatRequestStatus(revision.status, t)} · {formatDate(revision.created_at)}
								{formatRequestContext(revision.context) ? ` · ${formatRequestContext(revision.context)}` : ""}
							</small>
						</div>
						{revision.attachments.length > 0 ? (
							<ul className="dashboard-request-attachments" aria-label={t("dashboard.requests.attachments")}>
								{revision.attachments.map((file) => (
									<li key={file.id}>
										<Paperclip aria-hidden="true" />
										<span>{file.file_name}</span>
									</li>
								))}
							</ul>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}

function AuthModeModule({
	client,
	productKey,
	currentAuthMode,
	refreshProductContext,
}: {
	client: DashboardClient;
	productKey: string;
	currentAuthMode?: ProductAuthMode;
	refreshProductContext: () => Promise<void>;
}) {
	const { t } = useTranslation();
	const [authMode, setAuthMode] = useState<ProductAuthMode>(currentAuthMode ?? "open");
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canSaveAuthMode = Boolean(productKey) && !saving;
	const options = useMemo<Array<{ value: ProductAuthMode; label: string; body: string }>>(
		() => [
			{ value: "open", label: t("dashboard.authMode.open"), body: t("dashboard.authMode.openBody") },
			{ value: "invite_only", label: t("dashboard.authMode.inviteOnly"), body: t("dashboard.authMode.inviteOnlyBody") },
		],
		[t],
	);

	const saveAuthMode = async () => {
		if (!client || !canSaveAuthMode) return;
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			const data = await client.management.product.updateAuthMode({ productKey, authMode });
			setAuthMode(data.product.auth_mode);
			await refreshProductContext();
			setSaved(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : t("dashboard.status.error"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="dashboard-stack">
			<div className="auth-mode-options" role="radiogroup" aria-label={t("dashboard.authMode.title")}>
				{options.map((option) => (
					<button className={authMode === option.value ? "auth-mode-option active" : "auth-mode-option"} type="button" onClick={() => setAuthMode(option.value)} aria-pressed={authMode === option.value} key={option.value}>
						<strong>{option.label}</strong>
						<span>{option.body}</span>
					</button>
				))}
			</div>
			<button className="mini-action save" type="button" onClick={saveAuthMode} disabled={!client || !canSaveAuthMode}>
				<Save aria-hidden="true" />
				{productKey ? t("dashboard.authMode.save") : t("dashboard.authMode.waiting")}
			</button>
			<DashboardStatus loading={saving} saved={saved} error={error} />
		</div>
	);
}

function DashboardStatus({ loading, saved, error }: { loading: boolean; saved: boolean; error: string | null }) {
	const { t } = useTranslation();
	if (loading) return <p className="dashboard-muted">{t("dashboard.status.saving")}</p>;
	if (error) return <p className="dashboard-error">{error}</p>;
	if (saved) return <p className="dashboard-success">{t("dashboard.status.saved")}</p>;
	return null;
}

function formatRequestType(type: ProductChangeRequestType, t: ReturnType<typeof useTranslation>["t"]) {
	return type === "issue" ? t("dashboard.requests.issue") : t("dashboard.requests.featureRequest");
}

function formatRequestStatus(status: ProductChangeRequestStatus, t: ReturnType<typeof useTranslation>["t"]) {
	if (status === "in_progress") return t("dashboard.requests.statusInProgress");
	if (status === "done") return t("dashboard.requests.statusDone");
	if (status === "closed") return t("dashboard.requests.statusClosed");
	return t("dashboard.requests.statusOpen");
}

function formatAttachmentCount(count: number, t: ReturnType<typeof useTranslation>["t"]) {
	return t(count === 1 ? "dashboard.requests.attachmentCountOne" : "dashboard.requests.attachmentCountMany", { count });
}

function formatRequestContext(context: Record<string, unknown>) {
	const label = typeof context.label === "string" ? context.label : null;
	const path = typeof context.path === "string" ? context.path : null;
	if (label && path) return `${label} (${path})`;
	return label ?? path;
}

function getContextKey(context: Record<string, unknown>) {
	return typeof context.view === "string" ? context.view : "";
}

function getRequestThreadAttachments(request: ProductChangeRequest) {
	const attachments = new Map<string, ProductChangeRequest["attachments"][number]>();
	for (const attachment of request.attachments) {
		attachments.set(attachment.id, attachment);
	}
	for (const revision of request.revisions ?? []) {
		for (const attachment of revision.attachments) {
			attachments.set(attachment.id, attachment);
		}
	}
	return [...attachments.values()];
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
