import { useCallback, useEffect, useState } from "react";
import {
	ClassKitManagerApiError,
	useProductContext,
	type ProductDocumentDraft,
	type ProductDocumentVersion,
	type ProductDocumentVersionSummary,
} from "@class-kit/react";
import { Archive, Eye, FileText, History, RefreshCw, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const DOCUMENT_TYPE = "terms";
const DOCUMENT_LOCALE = "en";

type DocumentForm = {
	title: string;
	contentMarkdown: string;
	effectiveAt: string;
};

const emptyForm: DocumentForm = {
	title: "Terms of Service",
	contentMarkdown: "",
	effectiveAt: "",
};

export function ProductDocumentManager() {
	const { t } = useTranslation();
	const { client } = useProductContext();
	const [draft, setDraft] = useState<ProductDocumentDraft | null>(null);
	const [versions, setVersions] = useState<ProductDocumentVersionSummary[]>([]);
	const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
	const [preview, setPreview] = useState<ProductDocumentVersion | null>(null);
	const [form, setForm] = useState<DocumentForm>(emptyForm);
	const [loaded, setLoaded] = useState(false);
	const [busy, setBusy] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadDocument = useCallback(async () => {
		if (!client) return;
		setBusy("load");
		setError(null);
		try {
			const [draftResponse, versionsResponse] = await Promise.all([
				client.management.productDocuments.getDraft(DOCUMENT_TYPE, { locale: DOCUMENT_LOCALE }),
				client.management.productDocuments.listVersions(DOCUMENT_TYPE, { locale: DOCUMENT_LOCALE }),
			]);
			setDraft(draftResponse.draft);
			setVersions(versionsResponse.versions);
			setActiveVersionId(versionsResponse.active_version_id ?? draftResponse.active_version_id);
			setForm(draftResponse.draft ? formFromDraft(draftResponse.draft) : emptyForm);
			setLoaded(true);
		} catch (err) {
			setError(formatDocumentError(err));
		} finally {
			setBusy(null);
		}
	}, [client]);

	useEffect(() => {
		void loadDocument();
	}, [loadDocument]);

	const saveDraft = async () => {
		if (!client || !loaded || !form.title.trim() || !form.contentMarkdown.trim()) return;
		setBusy("save");
		setSaved(false);
		setError(null);
		try {
			const response = await client.management.productDocuments.saveDraft({
				documentType: DOCUMENT_TYPE,
				locale: DOCUMENT_LOCALE,
				title: form.title.trim(),
				contentMarkdown: form.contentMarkdown.trim(),
				effectiveAt: form.effectiveAt ? new Date(form.effectiveAt).toISOString() : null,
				expectedRevision: draft?.revision ?? null,
			});
			setDraft(response.draft);
			setForm(formFromDraft(response.draft));
			setSaved(true);
		} catch (err) {
			setError(formatDocumentError(err));
		} finally {
			setBusy(null);
		}
	};

	const publishDraft = async () => {
		if (!client || !draft) return;
		setBusy("publish");
		setSaved(false);
		setError(null);
		try {
			await client.management.productDocuments.publishDraft({
				documentType: DOCUMENT_TYPE,
				locale: DOCUMENT_LOCALE,
				expectedDraftRevision: draft.revision,
				expectedActiveVersionId: activeVersionId,
			});
			setPreview(null);
			await loadDocument();
			setSaved(true);
		} catch (err) {
			setError(formatDocumentError(err));
		} finally {
			setBusy(null);
		}
	};

	const discardDraft = async () => {
		if (!client || !draft || !window.confirm(t("dashboard.documents.discardConfirm"))) return;
		setBusy("discard");
		setSaved(false);
		setError(null);
		try {
			await client.management.productDocuments.discardDraft(DOCUMENT_TYPE, {
				locale: DOCUMENT_LOCALE,
				expectedRevision: draft.revision,
			});
			setDraft(null);
			setForm(emptyForm);
			setSaved(true);
		} catch (err) {
			setError(formatDocumentError(err));
		} finally {
			setBusy(null);
		}
	};

	const archiveActiveVersion = async () => {
		if (!client || !activeVersionId || !window.confirm(t("dashboard.documents.archiveConfirm"))) return;
		setBusy("archive");
		setSaved(false);
		setError(null);
		try {
			await client.management.productDocuments.archiveActiveVersion({
				documentType: DOCUMENT_TYPE,
				locale: DOCUMENT_LOCALE,
				expectedActiveVersionId: activeVersionId,
			});
			await loadDocument();
			setSaved(true);
		} catch (err) {
			setError(formatDocumentError(err));
		} finally {
			setBusy(null);
		}
	};

	const previewVersion = async (versionId: string) => {
		if (!client) return;
		setBusy(`preview:${versionId}`);
		setError(null);
		try {
			const response = await client.management.productDocuments.getVersion(versionId);
			setPreview(response.version);
		} catch (err) {
			setError(formatDocumentError(err));
		} finally {
			setBusy(null);
		}
	};

	const restoreVersion = async (versionId: string) => {
		if (!client) return;
		if (draft && !window.confirm(t("dashboard.documents.restoreConfirm"))) return;
		setBusy(`restore:${versionId}`);
		setSaved(false);
		setError(null);
		try {
			const { version } = await client.management.productDocuments.getVersion(versionId);
			await client.management.productDocuments.saveDraft({
				documentType: DOCUMENT_TYPE,
				locale: DOCUMENT_LOCALE,
				title: version.title,
				contentMarkdown: version.content_markdown,
				effectiveAt: version.effective_at,
				expectedRevision: draft?.revision ?? null,
			});
			setPreview(version);
			await loadDocument();
			setSaved(true);
		} catch (err) {
			setError(formatDocumentError(err));
		} finally {
			setBusy(null);
		}
	};

	const isBusy = busy !== null;

	return (
		<div className="dashboard-stack product-document-manager">
			<div className="product-document-heading">
				<div>
					<span className="dashboard-request-history-title"><FileText aria-hidden="true" />{t("dashboard.documents.eyebrow")}</span>
					<h3>{t("dashboard.documents.title")}</h3>
					<p>{t("dashboard.documents.body")}</p>
				</div>
				<button className="mini-action" type="button" onClick={() => void loadDocument()} disabled={!client || isBusy}>
					<RefreshCw aria-hidden="true" />
					{t("dashboard.documents.refresh")}
				</button>
			</div>

			{error ? <p className="dashboard-error" role="alert">{error}</p> : null}
			{saved ? <p className="dashboard-success">{t("dashboard.status.saved")}</p> : null}
			{busy === "load" ? <p className="dashboard-muted">{t("dashboard.documents.loading")}</p> : null}

			<div className="dashboard-form-grid">
				<label className="dashboard-field">
					<span>{t("dashboard.documents.documentType")}</span>
					<input value={DOCUMENT_TYPE} disabled />
				</label>
				<label className="dashboard-field">
					<span>{t("dashboard.documents.locale")}</span>
					<input value={DOCUMENT_LOCALE} disabled />
				</label>
				<label className="dashboard-field">
					<span>{t("dashboard.documents.documentTitle")}</span>
					<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} disabled={!loaded || isBusy} />
				</label>
				<label className="dashboard-field">
					<span>{t("dashboard.documents.effectiveAt")}</span>
					<input type="datetime-local" value={form.effectiveAt} onChange={(event) => setForm((current) => ({ ...current, effectiveAt: event.target.value }))} disabled={!loaded || isBusy} />
				</label>
			</div>
			<label className="dashboard-field">
				<span>{t("dashboard.documents.markdown")}</span>
				<textarea value={form.contentMarkdown} onChange={(event) => setForm((current) => ({ ...current, contentMarkdown: event.target.value }))} disabled={!loaded || isBusy} rows={14} />
			</label>
			<div className="dashboard-inline-actions">
				<button className="mini-action save" type="button" onClick={() => void saveDraft()} disabled={!client || !loaded || isBusy || !form.title.trim() || !form.contentMarkdown.trim()}>
					<Save aria-hidden="true" />
					{draft ? t("dashboard.documents.updateDraft") : t("dashboard.documents.createDraft")}
				</button>
				<button className="mini-action save" type="button" onClick={() => void publishDraft()} disabled={!client || !draft || isBusy}>
					<Send aria-hidden="true" />
					{t("dashboard.documents.publish")}
				</button>
				<button className="mini-action" type="button" onClick={() => void discardDraft()} disabled={!client || !draft || isBusy}>
					<Trash2 aria-hidden="true" />
					{t("dashboard.documents.discard")}
				</button>
				<button className="mini-action" type="button" onClick={() => void archiveActiveVersion()} disabled={!client || !activeVersionId || isBusy}>
					<Archive aria-hidden="true" />
					{t("dashboard.documents.archive")}
				</button>
			</div>

			<div className="product-document-state-row">
				<span>{t("dashboard.documents.draftState", { revision: draft?.revision ?? "-" })}</span>
				<span>{t("dashboard.documents.activeState", { version: versions.find((version) => version.id === activeVersionId)?.version ?? "-" })}</span>
			</div>

			<section className="product-document-history">
				<div className="product-document-heading compact">
					<div>
						<span className="dashboard-request-history-title"><History aria-hidden="true" />{t("dashboard.documents.history")}</span>
						<p>{t("dashboard.documents.historyBody")}</p>
					</div>
				</div>
				{versions.length === 0 && loaded ? <p className="dashboard-muted">{t("dashboard.documents.emptyHistory")}</p> : null}
				<div className="dashboard-list">
					{versions.map((version) => (
						<div className="dashboard-list-row product-document-version-row" key={version.id}>
							<div>
								<strong>{version.title}</strong>
								<span>{t("dashboard.documents.version", { version: version.version })}{version.is_active ? ` · ${t("dashboard.documents.active")}` : ""}</span>
								<small>{formatDate(version.published_at)}</small>
							</div>
							<div className="dashboard-inline-actions">
								<button className="mini-action" type="button" onClick={() => void previewVersion(version.id)} disabled={isBusy}>
									<Eye aria-hidden="true" />
									{t("dashboard.documents.preview")}
								</button>
								<button className="mini-action" type="button" onClick={() => void restoreVersion(version.id)} disabled={isBusy}>
									<RotateCcw aria-hidden="true" />
									{t("dashboard.documents.restore")}
								</button>
							</div>
						</div>
					))}
				</div>
			</section>

			{preview ? (
				<section className="product-document-preview">
					<div className="product-document-heading compact">
						<div>
							<span className="dashboard-request-history-title"><Eye aria-hidden="true" />{t("dashboard.documents.preview")}</span>
							<h4>{preview.title}</h4>
							<p>{t("dashboard.documents.version", { version: preview.version })}</p>
						</div>
						<button className="mini-action" type="button" onClick={() => setPreview(null)}>{t("dashboard.documents.closePreview")}</button>
					</div>
					<pre>{preview.content_markdown}</pre>
				</section>
			) : null}
		</div>
	);
}

function formFromDraft(draft: ProductDocumentDraft): DocumentForm {
	return {
		title: draft.title,
		contentMarkdown: draft.content_markdown,
		effectiveAt: draft.effective_at ? toLocalDateTime(draft.effective_at) : "",
	};
}

function toLocalDateTime(value: string) {
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDocumentError(error: unknown) {
	if (error instanceof ClassKitManagerApiError) return `${error.message} (${error.code})`;
	return error instanceof Error ? error.message : "Product document operation failed.";
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
