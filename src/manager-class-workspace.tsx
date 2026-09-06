import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Ban,
	CheckCircle2,
	CalendarDays,
	CalendarPlus,
	LayoutTemplate,
	Lock,
	MapPin,
	Plus,
	RefreshCw,
	Save,
	Search,
	Unlock,
	X,
	UserRound,
} from "lucide-react";
import {
	useProductContext,
	type ClassKitClient,
	type ClassTemplate,
	type Customer,
	type LocationSnapshot,
	type ManagedClass,
	type CancelManagedClassInput,
	type MembershipRequirement,
	type ManagementRegistrationSummary,
	type RegistrationPolicy,
	type Schedule,
	type ScheduleStatus,
	type Visibility,
} from "@class-kit/react";

type ClassDialogMode = { type: "class"; classRow?: ManagedClass };
type TemplateDialogMode = { type: "template"; template?: ClassTemplate };
type ScheduleDialogMode = { type: "schedule"; schedule?: Schedule };
type DialogMode = ClassDialogMode | TemplateDialogMode | ScheduleDialogMode | null;

type ClassForm = {
	id: string | null;
	template_id: string;
	name: string;
	description: string;
	starts_at: string;
	ends_at: string;
	capacity: string;
	location: string;
	location_snapshot: LocationSnapshot | null;
	status: ManagedClass["status"];
	visibility: ManagedClass["visibility"];
	registration_policy: RegistrationPolicy;
	membership_requirement: ManagedClass["membership_requirement"];
	public_field_policy_registered_users_count: boolean;
	public_field_policy_registered_users_roster: boolean;
	notes: string;
};

type TemplateForm = {
	id: string | null;
	name: string;
	description: string;
	category: string;
	default_capacity: string;
	default_location: string;
	default_location_snapshot: LocationSnapshot | null;
	default_visibility: ClassTemplate["default_visibility"];
	default_registration_policy: ClassTemplate["default_registration_policy"];
	default_membership_requirement: ClassTemplate["default_membership_requirement"];
	default_notes: string;
};

type ScheduleForm = {
	id: string | null;
	template_id: string;
	name: string;
	status: Schedule["status"];
	recurrence_type: Schedule["recurrence_type"];
	weekdays: number[];
	starts_on: string;
	ends_on: string;
	start_time: string;
	duration_minutes: string;
	timezone: string;
	generation_count: string;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const statusOptions: Array<{ value: ManagedClass["status"]; label: string }> = [
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
];
const visibilityOptions: Array<{ value: Visibility; label: string }> = [
	{ value: "public", label: "Public" },
	{ value: "members_only", label: "Members only" },
	{ value: "hidden", label: "Hidden" },
];
const registrationOptions: Array<{ value: RegistrationPolicy; label: string }> = [
	{ value: "auto_approve", label: "Auto-approve everyone" },
	{ value: "member_auto_approve", label: "Auto-approve members" },
	{ value: "approval_required", label: "Require approval" },
];
const membershipOptions: Array<{ value: MembershipRequirement; label: string }> = [
	{ value: "none", label: "No membership required" },
	{ value: "required", label: "Membership required" },
];
const scheduleStatusOptions: Array<{ value: ScheduleStatus; label: string }> = [
	{ value: "draft", label: "Draft" },
	{ value: "active", label: "Active" },
	{ value: "paused", label: "Paused" },
	{ value: "archived", label: "Archived" },
];
const recurrenceOptions: Array<{ value: Schedule["recurrence_type"]; label: string }> = [
	{ value: "weekly", label: "Weekly" },
	{ value: "one_time", label: "One time" },
];

export function ManagerClassWorkspace() {
	const { client } = useProductContext();
	const [templates, setTemplates] = useState<ClassTemplate[]>([]);
	const [schedules, setSchedules] = useState<Schedule[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [classes, setClasses] = useState<ManagedClass[]>([]);
	const [anchorDate, setAnchorDate] = useState(() => startOfWeek(new Date()));
	const [dialog, setDialog] = useState<DialogMode>(null);
	const [selectedRegistrationClassId, setSelectedRegistrationClassId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [registrationActionMessage, setRegistrationActionMessage] = useState<string | null>(null);
	const [pendingRegistrations, setPendingRegistrations] = useState<ManagementRegistrationSummary[]>([]);
	const [registeredRegistrations, setRegisteredRegistrations] = useState<ManagementRegistrationSummary[]>([]);
	const [registrationsLoading, setRegistrationsLoading] = useState(false);
	const [templateFilterId, setTemplateFilterId] = useState("");
	const [customDataFilterKey, setCustomDataFilterKey] = useState("");
	const [customDataFilterValue, setCustomDataFilterValue] = useState("");
	const [nowMs] = useState(() => Date.now());
	const visibleClassRange = useMemo(() => rangeForDays(anchorDate, 7), [anchorDate]);

	const loadResources = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			const [templateData, scheduleData] = await Promise.all([
				client.management.templates.list(),
				client.management.schedules.list(),
			]);
			setTemplates(templateData.templates);
			setSchedules(scheduleData.schedules);

			try {
				const customerData = await client.management.customers.list({ limit: 100, status: "active" });
				setCustomers(customerData.customers);
			} catch {
				setCustomers([]);
			}
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to load class operations.");
		} finally {
			setLoading(false);
		}
	}, [client]);

	const loadVisibleClasses = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			const hasCustomDataFilter = Boolean(customDataFilterKey.trim());
			const classData = await client.management.classes.list({
				range: visibleClassRange,
				filters: {
					...(templateFilterId ? { templateId: templateFilterId } : {}),
					...(hasCustomDataFilter ? {
						customData: { equals: { [customDataFilterKey.trim()]: customDataFilterValue } },
					} : {}),
				},
			});
			setClasses(classData.classes);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to load class operations.");
		} finally {
			setLoading(false);
		}
	}, [client, customDataFilterKey, customDataFilterValue, templateFilterId, visibleClassRange]);

	const loadWorkspace = useCallback(async () => {
		await Promise.all([loadResources(), loadVisibleClasses()]);
	}, [loadResources, loadVisibleClasses]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadResources(), 0);
		return () => window.clearTimeout(timer);
	}, [loadResources]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadVisibleClasses(), 0);
		return () => window.clearTimeout(timer);
	}, [loadVisibleClasses]);

	const selectedRegistrationClass = classes.find((classRow) => classRow.id === selectedRegistrationClassId) ?? classes[0] ?? null;
	const selectedRegistrationClassAllowsChanges = selectedRegistrationClass?.registration_open !== false;

	useEffect(() => {
		let active = true;

		async function loadRegistrations() {
			if (!client || !selectedRegistrationClass) {
				setPendingRegistrations([]);
				setRegisteredRegistrations([]);
				return;
			}

			setRegistrationsLoading(true);
			try {
				const [pendingData, registeredData] = await Promise.all([
					client.management.registrations.listPending({ classId: selectedRegistrationClass.id }),
					client.management.registrations.listRegistered({ classId: selectedRegistrationClass.id }),
				]);

				if (!active) return;
				setPendingRegistrations(pendingData.registrations);
				setRegisteredRegistrations(registeredData.registrations);
			} catch (error) {
				if (!active) return;
				setMessage(error instanceof Error ? error.message : "Unable to load registrations.");
				setPendingRegistrations([]);
				setRegisteredRegistrations([]);
			} finally {
				if (active) setRegistrationsLoading(false);
			}
		}

		void loadRegistrations();

		return () => {
			active = false;
		};
	}, [client, selectedRegistrationClass]);

	const weekDays = useMemo(() => {
		return Array.from({ length: 7 }, (_, index) => addDays(anchorDate, index));
	}, [anchorDate]);

	const weekClasses = useMemo(() => {
		const start = atStartOfDay(anchorDate).getTime();
		const end = addDays(anchorDate, 7).getTime();
		return classes
			.filter((classRow) => {
				const time = new Date(classRow.starts_at).getTime();
				return time >= start && time < end;
			})
			.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
	}, [anchorDate, classes]);

	const classesByDay = useMemo(() => {
		const grouped = new Map<string, ManagedClass[]>();
		for (const classRow of weekClasses) {
			const key = dateKey(new Date(classRow.starts_at));
			grouped.set(key, [...(grouped.get(key) ?? []), classRow]);
		}
		return grouped;
	}, [weekClasses]);

	const activeTemplates = templates.filter((template) => template.status === "active");
	const activeSchedules = schedules.filter((schedule) => schedule.status === "active");
	const nextClass = classes
		.filter((classRow) => classRow.lifecycle_status !== "cancelled" && new Date(classRow.starts_at).getTime() >= nowMs)
		.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

	function openClassDialog(classRow: ManagedClass) {
		setSelectedRegistrationClassId(classRow.id);
		setRegistrationActionMessage(null);
		setDialog({ type: "class", classRow });
	}

	async function afterChange(successMessage: string) {
		await loadWorkspace();
		setMessage(successMessage);
	}

	async function cancelClass(classRow: ManagedClass, input: CancelManagedClassInput) {
		setSaving(true);
		setMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			await client.management.classes.cancel(classRow.id, input);
			await afterChange("Class cancelled.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to cancel class.");
		} finally {
			setSaving(false);
		}
	}

	async function publishClass(classRow: ManagedClass) {
		setSaving(true);
		setMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			await client.management.classes.publish(classRow.id);
			await afterChange("Class published.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to publish class.");
		} finally {
			setSaving(false);
		}
	}

	async function draftClass(classRow: ManagedClass) {
		setSaving(true);
		setMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			await client.management.classes.draft(classRow.id);
			await afterChange("Class returned to draft.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to draft class.");
		} finally {
			setSaving(false);
		}
	}

	async function approveRegistration(registrationId: string) {
		if (!selectedRegistrationClassAllowsChanges) {
			setRegistrationActionMessage("This class is no longer open for registration changes.");
			return;
		}

		setSaving(true);
		setMessage(null);
		setRegistrationActionMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			await client.management.registrations.approve(registrationId);
			await afterChange("Registration approved.");
			setRegistrationActionMessage("Registration approved.");
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unable to approve registration.";
			setMessage(errorMessage);
			setRegistrationActionMessage(errorMessage);
		} finally {
			setSaving(false);
		}
	}

	async function rejectRegistration(registrationId: string) {
		if (!selectedRegistrationClassAllowsChanges) {
			setRegistrationActionMessage("This class is no longer open for registration changes.");
			return;
		}

		setSaving(true);
		setMessage(null);
		setRegistrationActionMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			await client.management.registrations.reject(registrationId);
			await afterChange("Registration rejected.");
			setRegistrationActionMessage("Registration rejected.");
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unable to reject registration.";
			setMessage(errorMessage);
			setRegistrationActionMessage(errorMessage);
		} finally {
			setSaving(false);
		}
	}

	async function registerCustomer(customerId: string) {
		if (!selectedRegistrationClass || !selectedRegistrationClassAllowsChanges) {
			setRegistrationActionMessage("This class is no longer open for registration changes.");
			return;
		}

		setSaving(true);
		setMessage(null);
		setRegistrationActionMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			await client.management.registrations.registerCustomer({
				customerId,
				classId: selectedRegistrationClass.id,
			});
			await afterChange("Customer registered by manager.");
			setRegistrationActionMessage("Customer registered and approved.");
		} catch (error) {
			const nextMessage = error instanceof Error ? error.message : "Unable to register this customer.";
			setMessage(nextMessage);
			setRegistrationActionMessage(nextMessage);
		} finally {
			setSaving(false);
		}
	}

	async function deregisterCustomer(customerId: string) {
		if (!selectedRegistrationClass) return;
		setSaving(true);
		setMessage(null);
		setRegistrationActionMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			await client.management.registrations.deregisterCustomer({
				customerId,
				classId: selectedRegistrationClass.id,
			});
			await afterChange("Customer deregistered by manager.");
			setRegistrationActionMessage("Customer deregistered and consumed stock restored.");
		} catch (error) {
			const nextMessage = error instanceof Error ? error.message : "Unable to deregister this customer.";
			setMessage(nextMessage);
			setRegistrationActionMessage(nextMessage);
		} finally {
			setSaving(false);
		}
	}

	async function generateSchedule(schedule: Schedule) {
		setSaving(true);
		setMessage(null);
		try {
			if (!client) throw new Error("Supabase is not configured for this environment.");
			const result = await client.management.schedules.generate({ scheduleId: schedule.id, generationCount: 8 });
			await afterChange(`Generated ${result.created_count} new classes.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to generate classes.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="manager-workspace">
			<div className="manager-workspace-toolbar">
				<div>
					<p className="eyebrow">
						<CalendarDays aria-hidden="true" />
						Schedule workspace
					</p>
					<h2>Studio calendar</h2>
					<p>Create classes, shape templates, and keep the schedule in one place.</p>
				</div>
				<div className="manager-workspace-actions">
					<button type="button" onClick={() => setDialog({ type: "template" })}>
						<LayoutTemplate aria-hidden="true" />
						Template
					</button>
					<button type="button" onClick={() => setDialog({ type: "schedule" })}>
						<CalendarPlus aria-hidden="true" />
						Schedule
					</button>
					<button className="primary" type="button" onClick={() => setDialog({ type: "class" })}>
						<Plus aria-hidden="true" />
						Class
					</button>
				</div>
			</div>

			<div className="manager-stats-row">
				<StatTile label="This week" value={String(weekClasses.length)} detail="classes on the calendar" />
				<StatTile label="Next class" value={nextClass ? formatShortDate(nextClass.starts_at) : "None"} detail={nextClass?.name ?? "Nothing upcoming yet"} />
				<StatTile label="Templates" value={String(activeTemplates.length)} detail="active class blueprints" />
				<StatTile label="Schedules" value={String(activeSchedules.length)} detail="active generation rules" />
			</div>

			<CancellationPolicyControl client={client} />

			{message ? <p className="manager-workspace-message">{message}</p> : null}

			<div className="manager-workspace-grid">
				<div className="manager-calendar-panel">
					<div className="manager-calendar-head">
						<div>
							<h3>{formatWeekRange(weekDays)}</h3>
							<p>{loading ? "Loading operations..." : "Click a class to edit it."}</p>
						</div>
						<div className="manager-calendar-controls">
							<button type="button" onClick={() => setAnchorDate(addDays(anchorDate, -7))} aria-label="Previous week">
								<ArrowLeft aria-hidden="true" />
							</button>
							<button type="button" onClick={() => setAnchorDate(startOfWeek(new Date()))}>Today</button>
							<button type="button" onClick={() => setAnchorDate(addDays(anchorDate, 7))} aria-label="Next week">
								<ArrowRight aria-hidden="true" />
							</button>
							<button type="button" onClick={() => void loadWorkspace()} disabled={loading}>
								<RefreshCw aria-hidden="true" />
								Refresh
							</button>
						</div>
					</div>
					<div className="manager-class-filters">
						<label>
							<span>Template filter</span>
							<select value={templateFilterId} onChange={(event) => setTemplateFilterId(event.target.value)}>
								<option value="">All templates</option>
								{templates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}
							</select>
						</label>
						<label>
							<span>Custom-data key</span>
							<input value={customDataFilterKey} onChange={(event) => setCustomDataFilterKey(event.target.value)} placeholder="format" />
						</label>
						<label>
							<span>Equals</span>
							<input value={customDataFilterValue} onChange={(event) => setCustomDataFilterValue(event.target.value)} placeholder="course" disabled={!customDataFilterKey.trim()} />
						</label>
						<span><Search aria-hidden="true" /> Filters combine through backend AND semantics.</span>
					</div>

					<div className="manager-calendar-grid">
						{weekDays.map((day) => {
							const key = dateKey(day);
							const dayClasses = classesByDay.get(key) ?? [];
							return (
								<div className="manager-calendar-day" key={key}>
									<div className="manager-calendar-day-head">
										<span>{weekdayLabels[day.getDay()]}</span>
										<strong>{day.getDate()}</strong>
									</div>
									<div className="manager-calendar-events">
										{dayClasses.length === 0 ? <span className="manager-empty-slot">No classes</span> : null}
										{dayClasses.map((classRow) => (
											<button
												className={`manager-calendar-event ${classRow.lifecycle_status === "cancelled" ? "cancelled" : ""} ${classRow.status === "draft" ? "draft" : ""} ${classRow.read_only ? "locked" : ""}`}
												type="button"
												onClick={() => openClassDialog(classRow)}
												key={classRow.id}
											>
												<span className="manager-calendar-event-time">{formatTime(classRow.starts_at)}</span>
												<strong>{classRow.name}</strong>
												<div className="manager-calendar-event-meta">
													<small>{classRow.status}</small>
													{classRow.read_only_reason ? <small>{formatClassLockReason(classRow.read_only_reason)}</small> : null}
													{classRow.lifecycle_status !== "created" ? <small>{classRow.lifecycle_status}</small> : null}
													{classRow.registeredUsersCount !== undefined ? <small>{classRow.registeredUsersCount}/{classRow.capacity}</small> : null}
													{classRow.pendingRegistrationCount ? <small>{classRow.registration_open ? `${classRow.pendingRegistrationCount} pending` : "Pending closed"}</small> : null}
												</div>
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<aside className="manager-side-panel">
					<SidePanelSection
						icon={<LayoutTemplate aria-hidden="true" />}
						title="Templates"
						empty="Create a template before building repeat schedules."
					>
						{templates.map((template) => (
							<button className="manager-side-row" type="button" onClick={() => setDialog({ type: "template", template })} key={template.id}>
								<strong>{template.name}</strong>
								<span>{template.category || "Uncategorized"} · {template.status}</span>
							</button>
						))}
					</SidePanelSection>

					<SidePanelSection
						icon={<CalendarPlus aria-hidden="true" />}
						title="Schedules"
						empty="Create a schedule to generate future classes."
					>
						{schedules.map((schedule) => (
							<div className="manager-side-row split" key={schedule.id}>
								<button type="button" onClick={() => setDialog({ type: "schedule", schedule })}>
									<strong>{schedule.name}</strong>
									<span>{schedule.status} · {schedule.recurrence_type}</span>
								</button>
								<button type="button" onClick={() => void generateSchedule(schedule)} disabled={saving || schedule.status !== "active"} aria-label={`Generate ${schedule.name}`}>
									<RefreshCw aria-hidden="true" />
								</button>
							</div>
						))}
					</SidePanelSection>

					<SidePanelSection
						icon={<UserRound aria-hidden="true" />}
						title="Registrations"
						empty="Open a class to review pending and approved users."
					>
						{selectedRegistrationClass ? (
							<div className="manager-side-row">
								<strong>{selectedRegistrationClass.name}</strong>
								<span>{registrationsLoading ? "Loading registrations..." : `${pendingRegistrations.length} pending · ${registeredRegistrations.length} approved`}</span>
							</div>
						) : null}
						{pendingRegistrations.map((registration) => (
							<div className="manager-side-row split" key={registration.id}>
								<button type="button" onClick={() => openClassDialog(classes.find((classRow) => classRow.id === registration.classId) ?? selectedRegistrationClass!)}>
									<strong>{formatRegistrationUser(registration)}</strong>
									<span>{registration.class?.name ?? registration.classId} · {registration.class?.registrationOpen === false ? "closed" : "pending"}</span>
								</button>
								<div className="manager-row-actions">
									<button type="button" onClick={() => void approveRegistration(registration.id)} disabled={saving || registration.class?.registrationOpen === false}>
										<CheckCircle2 aria-hidden="true" />
										Approve
									</button>
									<button type="button" onClick={() => void rejectRegistration(registration.id)} disabled={saving || registration.class?.registrationOpen === false}>
										<Ban aria-hidden="true" />
										Reject
									</button>
								</div>
							</div>
						))}
						{registeredRegistrations.map((registration) => (
							<div className="manager-side-row split" key={registration.id}>
								<button type="button" onClick={() => openClassDialog(classes.find((classRow) => classRow.id === registration.classId) ?? selectedRegistrationClass!)}>
									<strong>{formatRegistrationUser(registration)}</strong>
									<span>{registration.class?.name ?? registration.classId} · approved</span>
								</button>
								<div className="manager-row-actions">
									<button type="button" onClick={() => void deregisterCustomer(registration.customerId)} disabled={saving}>
										<Ban aria-hidden="true" />
										Deregister
									</button>
								</div>
							</div>
						))}
					</SidePanelSection>
				</aside>
			</div>

			{dialog?.type === "class" ? (
				<ClassDialog
					key={dialog.classRow?.id ?? "new-class"}
					client={client}
					classRow={dialog.classRow}
					templates={templates}
					customers={customers}
					onClose={() => setDialog(null)}
					onSave={async (form) => {
						setSaving(true);
						setMessage(null);
						try {
							await saveClass(client, form);
							setDialog(null);
							await afterChange(form.id ? "Class updated." : "Class created.");
						} catch (error) {
							setMessage(error instanceof Error ? error.message : "Unable to save class.");
						} finally {
							setSaving(false);
						}
					}}
					onCancelClass={dialog.classRow ? async (input) => {
						await cancelClass(dialog.classRow!, input);
						setDialog(null);
					} : undefined}
					onPublishClass={dialog.classRow ? async () => {
						await publishClass(dialog.classRow!);
						setDialog(null);
					} : undefined}
					onDraftClass={dialog.classRow ? async () => {
						await draftClass(dialog.classRow!);
						setDialog(null);
					} : undefined}
					pendingRegistrations={pendingRegistrations}
					registeredRegistrations={registeredRegistrations}
					registrationsLoading={registrationsLoading}
					registrationActionMessage={registrationActionMessage}
					onApproveRegistration={approveRegistration}
					onRejectRegistration={rejectRegistration}
					onRegisterCustomer={registerCustomer}
					onDeregisterCustomer={deregisterCustomer}
					saving={saving}
				/>
			) : null}

			{dialog?.type === "template" ? (
				<TemplateDialog
					client={client}
					template={dialog.template}
					onClose={() => setDialog(null)}
					onSave={async (form) => {
						setSaving(true);
						setMessage(null);
						try {
							await saveTemplate(client, form);
							setDialog(null);
							await afterChange(form.id ? "Template updated." : "Template created.");
						} catch (error) {
							setMessage(error instanceof Error ? error.message : "Unable to save template.");
						} finally {
							setSaving(false);
						}
					}}
					saving={saving}
				/>
			) : null}

			{dialog?.type === "schedule" ? (
				<ScheduleDialog
					schedule={dialog.schedule}
					templates={templates}
					onClose={() => setDialog(null)}
					onSave={async (form) => {
						setSaving(true);
						setMessage(null);
						try {
							const generation = await saveSchedule(client, form);
							setDialog(null);
							await afterChange(generation ? `Schedule saved. Generated ${generation.created_count} classes.` : "Schedule saved.");
						} catch (error) {
							setMessage(error instanceof Error ? error.message : "Unable to save schedule.");
						} finally {
							setSaving(false);
						}
					}}
					saving={saving}
				/>
			) : null}
		</section>
	);
}

function CancellationPolicyControl({ client }: { client: ClassKitClient | null }) {
	const [hours, setHours] = useState("");
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!client) return;
		try {
			const policy = await client.management.product.getCancellationPolicy();
			setHours(String(policy.registration_cancellation_cutoff_hours));
			setMessage(null);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Cancellation policy is unavailable.");
		}
	}, [client]);

	useEffect(() => {
		void load();
	}, [load]);

	async function save() {
		if (!client) return;
		const value = Number(hours);
		if (!Number.isInteger(value) || value < 0 || value > 8760) {
			setMessage("Cancellation cutoff must be an integer from 0 through 8760 hours.");
			return;
		}
		setSaving(true);
		try {
			const policy = await client.management.product.updateCancellationPolicy({
				registrationCancellationCutoffHours: value,
			});
			setHours(String(policy.registration_cancellation_cutoff_hours));
			setMessage(policy.changed ? "Cancellation policy updated." : "Cancellation policy was already current.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to update cancellation policy.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="manager-policy-control">
			<div>
				<strong>Customer cancellation window</strong>
				<span>Approved registrations close this many hours before class start.</span>
			</div>
			<label><span>Hours</span><input type="number" min="0" max="8760" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
			<button type="button" onClick={() => void save()} disabled={saving || !hours}><Save aria-hidden="true" /> Save policy</button>
			{message ? <small>{message}</small> : null}
		</div>
	);
}

function LocationField({
	client,
	label,
	value,
	snapshot,
	onChange,
	disabled = false,
}: {
	client: ClassKitClient | null;
	label: string;
	value: string;
	snapshot: LocationSnapshot | null;
	onChange: (value: string, snapshot: LocationSnapshot | null) => void;
	disabled?: boolean;
}) {
	const [suggestions, setSuggestions] = useState<LocationSnapshot[]>([]);
	const [searching, setSearching] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	async function search() {
		if (!client || value.trim().length < 2) {
			setStatus("Enter at least two characters.");
			return;
		}
		setSearching(true);
		setStatus(null);
		try {
			const result = await client.management.locations.autocomplete({ query: value, limit: 5 });
			setSuggestions(result.suggestions);
			setStatus(result.availability === "temporarily_unavailable"
				? "Autocomplete is temporarily unavailable. Free text can still be saved."
				: result.suggestions.length === 0 ? "No suggestions found. Free text can still be saved." : null);
		} catch (error) {
			setSuggestions([]);
			setStatus(error instanceof Error ? error.message : "Autocomplete failed. Free text can still be saved.");
		} finally {
			setSearching(false);
		}
	}

	return (
		<div className="location-field">
			<label>
				<span>{label}</span>
				<div>
					<input
						value={value}
						disabled={disabled}
						onChange={(event) => {
							const next = event.target.value;
							onChange(next, snapshot?.label === next ? snapshot : null);
						}}
					/>
					<button type="button" onClick={() => void search()} disabled={disabled || searching || value.trim().length < 2}><Search aria-hidden="true" /> {searching ? "Searching" : "Suggest"}</button>
				</div>
			</label>
			{snapshot ? (
				<div className="location-snapshot">
					<MapPin aria-hidden="true" />
					<span><strong>{snapshot.formatted_address}</strong><small>{snapshot.coordinates.latitude}, {snapshot.coordinates.longitude}</small></span>
					<button type="button" onClick={() => onChange(value, null)} disabled={disabled}>Keep free text</button>
					<div>{snapshot.attributions.map((attribution) => attribution.url
						? <a href={attribution.url} target="_blank" rel="noreferrer" key={`${attribution.text}:${attribution.url}`}>{attribution.text}</a>
						: <span key={attribution.text}>{attribution.text}</span>)}</div>
				</div>
			) : null}
			{status ? <small className="location-status">{status}</small> : null}
			{suggestions.length > 0 ? <div className="location-suggestions">{suggestions.map((suggestion) => (
				<button type="button" onClick={() => { onChange(suggestion.label, suggestion); setSuggestions([]); setStatus(null); }} disabled={disabled} key={suggestion.provider.reference}>
					<strong>{suggestion.label}</strong><span>{suggestion.formatted_address}</span>
				</button>
			))}</div> : null}
		</div>
	);
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
	return (
		<div className="manager-stat-tile">
			<span>{label}</span>
			<strong>{value}</strong>
			<p>{detail}</p>
		</div>
	);
}

function SidePanelSection({ icon, title, empty, children }: { icon: React.ReactNode; title: string; empty: string; children: React.ReactNode }) {
	const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
	return (
		<section className="manager-side-section">
			<div className="manager-side-section-head">
				{icon}
				<h3>{title}</h3>
			</div>
			<div className="manager-side-list">
				{hasChildren ? children : <p>{empty}</p>}
			</div>
		</section>
	);
}

function ClassDialog({
	client,
	classRow,
	templates,
	customers,
	onClose,
	onSave,
	onCancelClass,
	onPublishClass,
	onDraftClass,
	pendingRegistrations,
	registeredRegistrations,
	registrationsLoading,
	registrationActionMessage,
	onApproveRegistration,
	onRejectRegistration,
	onRegisterCustomer,
	onDeregisterCustomer,
	saving,
}: {
	client: ClassKitClient | null;
	classRow?: ManagedClass;
	templates: ClassTemplate[];
	customers: Customer[];
	onClose: () => void;
	onSave: (form: ClassForm) => Promise<void>;
	onCancelClass?: (input: CancelManagedClassInput) => Promise<void>;
	onPublishClass?: () => Promise<void>;
	onDraftClass?: () => Promise<void>;
	pendingRegistrations: ManagementRegistrationSummary[];
	registeredRegistrations: ManagementRegistrationSummary[];
	registrationsLoading: boolean;
	registrationActionMessage: string | null;
	onApproveRegistration: (registrationId: string) => Promise<void>;
	onRejectRegistration: (registrationId: string) => Promise<void>;
	onRegisterCustomer: (customerId: string) => Promise<void>;
	onDeregisterCustomer: (customerId: string) => Promise<void>;
	saving: boolean;
}) {
	const [form, setForm] = useState<ClassForm>(() => classRow ? classFormFromRow(classRow) : emptyClassForm(templates[0] ?? null));
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [cancellationReason, setCancellationReason] = useState(classRow?.cancellation_reason ?? "");
	const [exposeCancellationReasonToUsers, setExposeCancellationReasonToUsers] = useState(Boolean(classRow?.expose_cancellation_reason_to_users));
	const [editLockedClass, setEditLockedClass] = useState(false);
	const lockedByTime = Boolean(classRow?.read_only);
	const formDisabled = saving || (lockedByTime && !editLockedClass);
	const registrationChangesClosed = Boolean(classRow && !classRow.registration_open);
	const lockReason = classRow?.read_only_reason ? formatClassLockReason(classRow.read_only_reason) : null;

	return (
		<DialogFrame title={classRow ? "Edit class" : "Create class"} subtitle="Adjust the concrete class on the public schedule." onClose={onClose} className="class-editor-dialog">
			{classRow && lockedByTime ? (
				<div className="class-editor-lock-banner">
					<div>
						<Lock aria-hidden="true" />
						<span>{lockReason}</span>
						<small>This class is read-only by default because its scheduled time has passed.</small>
					</div>
					<button type="button" onClick={() => setEditLockedClass((current) => !current)} disabled={saving}>
						{editLockedClass ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}
						{editLockedClass ? "Lock fields" : "Enable edit mode"}
					</button>
				</div>
			) : null}
			<div className="manager-form-grid class-editor-grid">
				<section className="class-editor-section primary">
					<div className="class-editor-section-head">
						<h4>Basics</h4>
					</div>
					<div className="class-editor-fields">
						<FormInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} disabled={formDisabled} />
						<label>
							<span>Template</span>
							<select value={form.template_id} onChange={(event) => setForm(emptyClassForm(templates.find((template) => template.id === event.target.value) ?? null, form))} disabled={Boolean(form.id) || formDisabled}>
								<option value="">No template</option>
								{templates.filter((template) => template.status === "active").map((template) => (
									<option value={template.id} key={template.id}>{template.name}</option>
								))}
							</select>
						</label>
						<label className="wide">
							<span>Public description</span>
							<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Shown on the public class details view." disabled={formDisabled} />
						</label>
					</div>
				</section>

				<section className="class-editor-section">
					<div className="class-editor-section-head">
						<h4>Schedule</h4>
					</div>
					<div className="class-editor-fields">
						<FormInput label="Starts" type="datetime-local" value={form.starts_at} onChange={(value) => setForm({ ...form, starts_at: value })} disabled={formDisabled} />
						<FormInput label="Ends" type="datetime-local" value={form.ends_at} onChange={(value) => setForm({ ...form, ends_at: value })} disabled={formDisabled} />
						<FormInput label="Capacity" type="number" value={form.capacity} onChange={(value) => setForm({ ...form, capacity: value })} disabled={formDisabled} />
						<LocationField
							client={client}
							label="Location"
							value={form.location}
							snapshot={form.location_snapshot}
							onChange={(location, locationSnapshot) => setForm({ ...form, location, location_snapshot: locationSnapshot })}
							disabled={formDisabled}
						/>
					</div>
				</section>

				<section className="class-editor-section">
					<div className="class-editor-section-head">
						<h4>Rules</h4>
					</div>
					<div className="class-editor-fields">
						<SelectInput label="Status" value={form.status} options={statusOptions} onChange={(value) => setForm({ ...form, status: value as ManagedClass["status"] })} disabled={formDisabled} />
						<SelectInput label="Visibility" value={form.visibility} options={visibilityOptions} onChange={(value) => setForm({ ...form, visibility: value as ManagedClass["visibility"] })} disabled={formDisabled} />
						<SelectInput label="Registration" value={form.registration_policy} options={registrationOptions} onChange={(value) => setForm({ ...form, registration_policy: value as RegistrationPolicy })} disabled={formDisabled} />
						<SelectInput label="Membership" value={form.membership_requirement} options={membershipOptions} onChange={(value) => setForm({ ...form, membership_requirement: value as ManagedClass["membership_requirement"] })} disabled={formDisabled} />
					</div>
				</section>

				<section className="class-editor-section">
					<div className="class-editor-section-head">
						<h4>Public display</h4>
					</div>
					<div className="class-editor-switches">
						<ToggleRow
							label="Registered count"
							description="Show the number of approved registrations."
							checked={form.public_field_policy_registered_users_count}
							onChange={(checked) => setForm({ ...form, public_field_policy_registered_users_count: checked })}
							disabled={formDisabled}
						/>
						<ToggleRow
							label="Roster names"
							description="Show registered names to regular users."
							checked={form.public_field_policy_registered_users_roster}
							onChange={(checked) => setForm({ ...form, public_field_policy_registered_users_roster: checked })}
							disabled={formDisabled}
						/>
					</div>
				</section>

				<section className="class-editor-section notes">
					<div className="class-editor-section-head">
						<h4>Operations</h4>
					</div>
					<div className="class-editor-fields">
						<label>
							<span>Manager notes</span>
							<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Internal notes for staff and future class operations." disabled={formDisabled} />
						</label>
						{classRow ? (
							<>
								<label>
									<span>Cancellation reason</span>
									<textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} placeholder="Optional reason shown when cancelling the class." disabled={formDisabled} />
								</label>
								<ToggleRow
									label="Expose cancellation reason"
									description="Let users see the cancellation note."
									checked={exposeCancellationReasonToUsers}
									onChange={setExposeCancellationReasonToUsers}
									disabled={formDisabled}
								/>
							</>
						) : null}
					</div>
				</section>

				{classRow ? (
					<section className="class-editor-section registrations">
						<div className="class-editor-section-head">
							<h4>Registrations</h4>
							<small>{registrationsLoading ? "Loading..." : `${pendingRegistrations.length} pending · ${registeredRegistrations.length} approved`}</small>
						</div>
						{registrationChangesClosed ? <p className="class-editor-registration-message">This class is no longer open for registration changes.</p> : null}
						{registrationActionMessage ? <p className="class-editor-registration-message">{registrationActionMessage}</p> : null}
						<div className="class-editor-direct-registration">
							<label>
								<span>Register customer directly</span>
								<select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} disabled={saving || registrationChangesClosed}>
									<option value="">Choose customer</option>
									{customers.filter((customer) => customer.status === "active").map((customer) => (
										<option value={customer.customerId} key={customer.customerId}>{customerLabel(customer)}</option>
									))}
								</select>
							</label>
							<button type="button" onClick={() => void onRegisterCustomer(selectedCustomerId)} disabled={saving || registrationChangesClosed || !selectedCustomerId}>
								<UserRound aria-hidden="true" />
								Register and approve
							</button>
						</div>
						<div className="class-editor-registrations">
							<div className="class-editor-registration-column">
								<strong>Pending</strong>
								{pendingRegistrations.length === 0 ? <p>No pending requests.</p> : null}
								{pendingRegistrations.map((registration) => (
									<div className="class-editor-registration-row" key={registration.id}>
										<div>
											<strong>{formatRegistrationUser(registration)}</strong>
											<small>{formatRegistrationContact(registration) ?? "Awaiting approval"}</small>
										</div>
										<div className="class-editor-registration-actions">
											<button type="button" onClick={() => void onApproveRegistration(registration.id)} disabled={saving || registrationChangesClosed}>
												<CheckCircle2 aria-hidden="true" />
												Approve
											</button>
											<button type="button" onClick={() => void onRejectRegistration(registration.id)} disabled={saving || registrationChangesClosed}>
												<Ban aria-hidden="true" />
												Reject
											</button>
										</div>
									</div>
								))}
							</div>
							<div className="class-editor-registration-column">
								<strong>Approved</strong>
								{registeredRegistrations.length === 0 ? <p>No approved users yet.</p> : null}
								{registeredRegistrations.map((registration) => (
									<div className="class-editor-registration-row" key={registration.id}>
										<div>
											<strong>{formatRegistrationUser(registration)}</strong>
											<small>{formatRegistrationContact(registration) ?? "Approved"}</small>
										</div>
										<div className="class-editor-registration-actions">
											<button type="button" onClick={() => void onDeregisterCustomer(registration.customerId)} disabled={saving || registrationChangesClosed}>
												<Ban aria-hidden="true" />
												Deregister
											</button>
										</div>
									</div>
								))}
							</div>
						</div>
					</section>
				) : null}
			</div>
			<DialogActions>
				{classRow && onDraftClass && classRow.status === "published" ? (
					<button type="button" onClick={() => void onDraftClass()} disabled={formDisabled}>
						<ArrowLeft aria-hidden="true" />
						Draft class
					</button>
				) : null}
				{classRow && onPublishClass && classRow.status === "draft" ? (
					<button type="button" onClick={() => void onPublishClass()} disabled={formDisabled}>
						<ArrowRight aria-hidden="true" />
						Publish class
					</button>
				) : null}
				{onCancelClass ? (
					<button
						className="danger"
						type="button"
						onClick={() => void onCancelClass({
							reason: cancellationReason.trim() || null,
							exposeReasonToUsers: exposeCancellationReasonToUsers,
						})}
						disabled={formDisabled}
					>
						<Ban aria-hidden="true" />
						Cancel class
					</button>
				) : null}
				<button type="button" onClick={() => void onSave(form)} disabled={formDisabled || !form.name.trim()}>
					<Save aria-hidden="true" />
					Save class
				</button>
			</DialogActions>
		</DialogFrame>
	);
}

function TemplateDialog({ client, template, onClose, onSave, saving }: { client: ClassKitClient | null; template?: ClassTemplate; onClose: () => void; onSave: (form: TemplateForm) => Promise<void>; saving: boolean }) {
	const [form, setForm] = useState<TemplateForm>(() => template ? templateFormFromRow(template) : emptyTemplateForm());

	return (
		<DialogFrame title={template ? "Edit template" : "Create template"} subtitle="Templates are the defaults copied into classes and schedules." onClose={onClose}>
			<div className="manager-form-grid">
				<FormInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
				<FormInput label="Capacity" type="number" value={form.default_capacity} onChange={(value) => setForm({ ...form, default_capacity: value })} />
				<FormInput label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
				<LocationField
					client={client}
					label="Default location"
					value={form.default_location}
					snapshot={form.default_location_snapshot}
					onChange={(defaultLocation, defaultLocationSnapshot) => setForm({ ...form, default_location: defaultLocation, default_location_snapshot: defaultLocationSnapshot })}
				/>
				<SelectInput label="Visibility" value={form.default_visibility} options={visibilityOptions} onChange={(value) => setForm({ ...form, default_visibility: value as ClassTemplate["default_visibility"] })} />
				<SelectInput label="Registration" value={form.default_registration_policy} options={registrationOptions} onChange={(value) => setForm({ ...form, default_registration_policy: value as ClassTemplate["default_registration_policy"] })} />
				<SelectInput label="Membership" value={form.default_membership_requirement} options={membershipOptions} onChange={(value) => setForm({ ...form, default_membership_requirement: value as ClassTemplate["default_membership_requirement"] })} />
				<label className="wide">
					<span>Description</span>
					<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
				</label>
				<label className="wide">
					<span>Manager notes</span>
					<textarea value={form.default_notes} onChange={(event) => setForm({ ...form, default_notes: event.target.value })} />
				</label>
			</div>
			<DialogActions>
				<button type="button" onClick={() => void onSave(form)} disabled={saving || !form.name.trim()}>
					<Save aria-hidden="true" />
					Save template
				</button>
			</DialogActions>
		</DialogFrame>
	);
}

function ScheduleDialog({
	schedule,
	templates,
	onClose,
	onSave,
	saving,
}: {
	schedule?: Schedule;
	templates: ClassTemplate[];
	onClose: () => void;
	onSave: (form: ScheduleForm) => Promise<void>;
	saving: boolean;
}) {
	const [form, setForm] = useState<ScheduleForm>(() => schedule ? scheduleFormFromRow(schedule) : emptyScheduleForm(templates[0] ?? null));

	return (
		<DialogFrame title={schedule ? "Edit schedule" : "Create schedule"} subtitle="Active schedules generate classes from a template." onClose={onClose}>
			<div className="manager-form-grid">
				<label>
					<span>Template</span>
					<select value={form.template_id} onChange={(event) => setForm({ ...form, template_id: event.target.value })}>
						<option value="">Choose template</option>
						{templates.filter((template) => template.status === "active").map((template) => (
							<option value={template.id} key={template.id}>{template.name}</option>
						))}
					</select>
				</label>
				<FormInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
				<SelectInput label="Status" value={form.status} options={scheduleStatusOptions} onChange={(value) => setForm({ ...form, status: value as Schedule["status"] })} />
				<SelectInput label="Repeat" value={form.recurrence_type} options={recurrenceOptions} onChange={(value) => setForm({ ...form, recurrence_type: value as Schedule["recurrence_type"], weekdays: value === "one_time" ? [] : form.weekdays.length ? form.weekdays : [0] })} />
				<FormInput label="Starts on" type="date" value={form.starts_on} onChange={(value) => setForm({ ...form, starts_on: value })} />
				<FormInput label="Ends on" type="date" value={form.ends_on} onChange={(value) => setForm({ ...form, ends_on: value })} disabled={form.recurrence_type === "one_time"} />
				<FormInput label="Start time" type="time" value={form.start_time} onChange={(value) => setForm({ ...form, start_time: value })} />
				<FormInput label="Minutes" type="number" value={form.duration_minutes} onChange={(value) => setForm({ ...form, duration_minutes: value })} />
				<FormInput label="Timezone" value={form.timezone} onChange={(value) => setForm({ ...form, timezone: value })} />
				<FormInput label="Generate count" type="number" value={form.generation_count} onChange={(value) => setForm({ ...form, generation_count: value })} />
				<div className="manager-weekday-field wide">
					<span>Weekdays</span>
					<div>
						{weekdayLabels.map((label, index) => (
							<button
								className={form.weekdays.includes(index) ? "active" : undefined}
								type="button"
								onClick={() => setForm({ ...form, weekdays: toggleWeekday(form.weekdays, index) })}
								disabled={form.recurrence_type === "one_time"}
								key={label}
							>
								{label}
							</button>
						))}
					</div>
				</div>
			</div>
			<DialogActions>
				<button type="button" onClick={() => void onSave(form)} disabled={saving || !form.template_id || !form.name.trim()}>
					<Save aria-hidden="true" />
					Save schedule
				</button>
			</DialogActions>
		</DialogFrame>
	);
}

function DialogFrame({ title, subtitle, children, onClose, className = "" }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void; className?: string }) {
	return (
		<div
			className="manager-dialog-backdrop"
			role="presentation"
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section className={className ? `manager-dialog ${className}` : "manager-dialog"} role="dialog" aria-modal="true" aria-labelledby="manager-dialog-title">
				<div className="manager-dialog-head">
					<div>
						<h3 id="manager-dialog-title">{title}</h3>
						<p>{subtitle}</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Close dialog">
						<X aria-hidden="true" />
					</button>
				</div>
				{children}
			</section>
		</div>
	);
}

function DialogActions({ children }: { children: React.ReactNode }) {
	return <div className="manager-dialog-actions">{children}</div>;
}

function ToggleRow({ label, description, checked, onChange, disabled = false }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
	return (
		<label className="class-editor-toggle">
			<span>
				<strong>{label}</strong>
				<small>{description}</small>
			</span>
			<input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
		</label>
	);
}

function formatRegistrationUser(registration: ManagementRegistrationSummary) {
	return registration.customer?.displayName || registration.user?.displayName || registration.customer?.contactEmail || registration.user?.email || registration.customerId;
}

function formatRegistrationContact(registration: ManagementRegistrationSummary) {
	return registration.customer?.contactEmail || registration.customer?.phoneNumber || registration.user?.email || null;
}

function customerLabel(customer: Customer) {
	return customer.displayName?.trim() || customer.contactEmail || customer.phoneNumber || `Customer ${customer.customerId.slice(0, 8)}`;
}

function formatClassLockReason(reason: NonNullable<ManagedClass["read_only_reason"]>) {
	if (reason === "started") return "Started";
	if (reason === "ended") return "Expired";
	return "Cancelled";
}

function FormInput({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
	return (
		<label>
			<span>{label}</span>
			<input type={type} value={value} min={type === "number" ? 1 : undefined} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
		</label>
	);
}

function SelectInput<TValue extends string>({ label, value, options, onChange, disabled = false }: { label: string; value: TValue; options: Array<{ value: TValue; label: string }>; onChange: (value: TValue) => void; disabled?: boolean }) {
	return (
		<label>
			<span>{label}</span>
			<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as TValue)}>
				{options.map((item) => (
					<option value={item.value} key={item.value}>{item.label}</option>
				))}
			</select>
		</label>
	);
}

async function saveClass(client: ReturnType<typeof useProductContext>["client"], form: ClassForm) {
	if (!client) throw new Error("Supabase is not configured for this environment.");
	const payload = {
		templateId: form.id ? undefined : form.template_id || null,
		name: form.name,
		description: form.description || null,
		startsAt: new Date(form.starts_at).toISOString(),
		endsAt: new Date(form.ends_at).toISOString(),
		capacity: Number(form.capacity),
		location: form.location || null,
		locationSnapshot: form.location_snapshot,
		status: form.status,
		visibility: form.visibility,
		registrationPolicy: form.registration_policy,
		membershipRequirement: form.membership_requirement,
		publicFieldPolicy: {
			registeredUsersCount: form.public_field_policy_registered_users_count,
			registeredUsersRoster: form.public_field_policy_registered_users_roster,
		},
		notes: form.notes || null,
	};

	if (form.id) await client.management.classes.update({ ...payload, classId: form.id });
	else await client.management.classes.create(payload);
}

async function saveTemplate(client: ReturnType<typeof useProductContext>["client"], form: TemplateForm) {
	if (!client) throw new Error("Supabase is not configured for this environment.");
	const payload = {
		name: form.name,
		description: form.description || null,
		category: form.category || null,
		defaultCapacity: Number(form.default_capacity),
		defaultLocation: form.default_location || null,
		defaultLocationSnapshot: form.default_location_snapshot,
		defaultVisibility: form.default_visibility,
		defaultRegistrationPolicy: form.default_registration_policy,
		defaultMembershipRequirement: form.default_membership_requirement,
		defaultNotes: form.default_notes || null,
	};

	if (form.id) await client.management.templates.update({ ...payload, templateId: form.id });
	else await client.management.templates.create({ ...payload, customFields: [], customDefaults: {} });
}

async function saveSchedule(client: ReturnType<typeof useProductContext>["client"], form: ScheduleForm) {
	if (!client) throw new Error("Supabase is not configured for this environment.");
	const generationCount = Number(form.generation_count);
	const shouldGenerate = form.status === "active";
	if (shouldGenerate && (!Number.isInteger(generationCount) || generationCount < 1 || generationCount > 52)) {
		throw new Error("Generate count must be an integer between 1 and 52.");
	}

	const payload = {
		templateId: form.template_id,
		name: form.name,
		status: form.status,
		recurrenceType: form.recurrence_type,
		weekdays: form.recurrence_type === "weekly" ? form.weekdays : [],
		startsOn: form.starts_on,
		endsOn: form.recurrence_type === "weekly" && form.ends_on ? form.ends_on : null,
		startTime: form.start_time,
		durationMinutes: Number(form.duration_minutes),
		timezone: form.timezone,
		generationCount: shouldGenerate ? generationCount : null,
	};
	const data = form.id
		? await client.management.schedules.update({ ...payload, scheduleId: form.id })
		: await client.management.schedules.create(payload);

	return data.generation;
}

function classFormFromRow(classRow: ManagedClass): ClassForm {
	return {
		id: classRow.id,
		template_id: classRow.template_id ?? "",
		name: classRow.name,
		description: classRow.description ?? "",
		starts_at: toLocalInput(classRow.starts_at),
		ends_at: toLocalInput(classRow.ends_at),
		capacity: String(classRow.capacity),
		location: classRow.location ?? "",
		location_snapshot: classRow.location_snapshot,
		status: classRow.status,
		visibility: classRow.visibility,
		registration_policy: classRow.registration_policy,
		membership_requirement: classRow.membership_requirement,
		public_field_policy_registered_users_count: classRow.public_field_policy?.registeredUsersCount ?? true,
		public_field_policy_registered_users_roster: classRow.public_field_policy?.registeredUsersRoster ?? false,
		notes: classRow.notes ?? "",
	};
}

function emptyClassForm(template: ClassTemplate | null, current?: ClassForm): ClassForm {
	const startsAt = roundToNextHour(new Date());
	const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
	return {
		id: null,
		template_id: template?.id ?? "",
		name: current?.name || template?.name || "",
		description: current?.description || template?.description || "",
		starts_at: current?.starts_at ?? toLocalInput(startsAt),
		ends_at: current?.ends_at ?? toLocalInput(endsAt),
		capacity: current?.capacity || (template ? String(template.default_capacity) : "20"),
		location: current?.location || template?.default_location || "",
		location_snapshot: current?.location_snapshot ?? template?.default_location_snapshot ?? null,
		status: current?.status ?? "draft",
		visibility: current?.visibility ?? template?.default_visibility ?? "public",
		registration_policy: current?.registration_policy ?? template?.default_registration_policy ?? "member_auto_approve",
		membership_requirement: current?.membership_requirement ?? template?.default_membership_requirement ?? "none",
		public_field_policy_registered_users_count: current?.public_field_policy_registered_users_count ?? true,
		public_field_policy_registered_users_roster: current?.public_field_policy_registered_users_roster ?? false,
		notes: current?.notes || template?.default_notes || "",
	};
}

function templateFormFromRow(template: ClassTemplate): TemplateForm {
	return {
		id: template.id,
		name: template.name,
		description: template.description ?? "",
		category: template.category ?? "",
		default_capacity: String(template.default_capacity),
		default_location: template.default_location ?? "",
		default_location_snapshot: template.default_location_snapshot,
		default_visibility: template.default_visibility,
		default_registration_policy: template.default_registration_policy,
		default_membership_requirement: template.default_membership_requirement,
		default_notes: template.default_notes ?? "",
	};
}

function emptyTemplateForm(): TemplateForm {
	return {
		id: null,
		name: "",
		description: "",
		category: "",
		default_capacity: "20",
		default_location: "",
		default_location_snapshot: null,
		default_visibility: "public",
		default_registration_policy: "member_auto_approve",
		default_membership_requirement: "none",
		default_notes: "",
	};
}

function scheduleFormFromRow(schedule: Schedule): ScheduleForm {
	return {
		id: schedule.id,
		template_id: schedule.template_id,
		name: schedule.name,
		status: schedule.status,
		recurrence_type: schedule.recurrence_type,
		weekdays: schedule.weekdays,
		starts_on: schedule.starts_on,
		ends_on: schedule.ends_on ?? "",
		start_time: schedule.start_time.slice(0, 5),
		duration_minutes: String(schedule.duration_minutes),
		timezone: schedule.timezone,
		generation_count: "8",
	};
}

function emptyScheduleForm(template: ClassTemplate | null): ScheduleForm {
	return {
		id: null,
		template_id: template?.id ?? "",
		name: template ? `${template.name} schedule` : "",
		status: "active",
		recurrence_type: "weekly",
		weekdays: [0],
		starts_on: toDateInput(new Date()),
		ends_on: "",
		start_time: "19:00",
		duration_minutes: "60",
		timezone: "Asia/Jerusalem",
		generation_count: "8",
	};
}

function startOfWeek(date: Date) {
	const next = atStartOfDay(date);
	next.setDate(next.getDate() - next.getDay());
	return next;
}

function atStartOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function rangeForDays(start: Date, days: number) {
	const rangeStart = atStartOfDay(start);
	const rangeEnd = addDays(rangeStart, days);
	return { start: rangeStart.toISOString(), end: rangeEnd.toISOString() };
}

function dateKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateInput(date: Date) {
	return dateKey(date);
}

function toLocalInput(value: string | Date) {
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function roundToNextHour(date: Date) {
	const next = new Date(date);
	next.setMinutes(0, 0, 0);
	next.setHours(next.getHours() + 1);
	return next;
}

function formatShortDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatTime(value: string) {
	return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatWeekRange(days: Date[]) {
	const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
	return `${formatter.format(days[0])} - ${formatter.format(days[days.length - 1])}`;
}

function toggleWeekday(days: number[], day: number) {
	if (days.includes(day)) return days.filter((item) => item !== day);
	return [...days, day].sort();
}
