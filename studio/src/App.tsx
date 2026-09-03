import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "./lib/api";
import { DEFAULT_IMAGES, DEFAULT_TEMPLATE, DEFAULT_WORKFLOW, GENERATION_POLICY } from "../../runner/generation-policy";
import type { JobSummary, PreflightCheck, ProjectSummary } from "../../runner/types";

type View = "projects" | "create" | "health";

const templateMeta = {
  classic: { label: "Classic", tone: "blue / editorial", description: "Brand-neutral dark canvas for explainers." },
  archon: { label: "Archon", tone: "cyan / magenta", description: "High-energy technical product language." },
  anthropic: { label: "Anthropic", tone: "orange / cream", description: "Warm editorial system with quiet authority." },
};

export function App() {
  const [view, setView] = useState<View>("projects");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [checks, setChecks] = useState<PreflightCheck[]>([]);
  const [selected, setSelected] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    try {
      const [catalog, jobList] = await Promise.all([api.catalog(), api.jobs()]);
      setProjects(catalog.projects); setJobs(jobList.jobs); setNotice(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Runner unavailable"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.key === "1") { setView("projects"); setSelected(null); }
      else if (event.key === "2") { setView("create"); setSelected(null); }
      else if (event.key === "3") void loadHealth();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Re-arm polling only when activity starts or stops, not on every 2s refresh of `jobs`.
  const hasActiveJobs = jobs.some((job) => job.status === "running" || job.status === "queued");
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(async () => {
      try {
        const [jobList, catalog] = await Promise.all([api.jobs(), api.catalog()]);
        setJobs(jobList.jobs);
        setProjects(catalog.projects);
      } catch { /* keep the last known state while the runner restarts */ }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs]);

  async function loadHealth() {
    setView("health");
    try {
      const serverChecks = (await api.preflight()).checks;
      const browserChecks: PreflightCheck[] = [
        { id: "browser-webgpu", label: "Browser WebGPU authoring", status: "gpu" in navigator ? "pass" : "warn", detail: "gpu" in navigator ? "Available for progressive preview effects" : "Unavailable; deterministic CPU/WebGL fallback remains active" },
        { id: "browser-webcodecs", label: "Browser WebCodecs authoring", status: "VideoDecoder" in window && "VideoEncoder" in window ? "pass" : "warn", detail: "VideoDecoder" in window && "VideoEncoder" in window ? "Available for responsive local media inspection" : "Unavailable; FFmpeg and Chromium rendering remain authoritative" },
      ];
      setChecks([...serverChecks, ...browserChecks]);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Preflight failed"); }
  }

  return <div className="shell">
    <aside className="rail">
      <div className="brand"><span className="brand-mark">F</span><span>FRAMEHOUSE</span></div>
      <div className="rail-label">Workspace</div>
      <nav>
        <button className={view === "projects" ? "nav-item active" : "nav-item"} onClick={() => { setView("projects"); setSelected(null); }}><span>◈</span> Projects <kbd>1</kbd></button>
        <button className={view === "create" ? "nav-item active" : "nav-item"} onClick={() => { setView("create"); setSelected(null); }}><span>＋</span> New video <kbd>2</kbd></button>
        <button className={view === "health" ? "nav-item active" : "nav-item"} onClick={() => void loadHealth()}><span>⊙</span> System health <kbd>3</kbd></button>
      </nav>
      <div className="rail-foot"><div className="online-dot" /> Local runner <span>127.0.0.1</span></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><span className="eyebrow">HYPERFRAMES / LOCAL STUDIO</span><h1>{view === "projects" ? "Your projects" : view === "create" ? "Start a new short" : "System health"}</h1></div><div className="top-actions"><button className="icon-button" onClick={() => void refresh()} aria-label="Refresh">↻</button><span className="version">studio 0.1 · Codex native</span></div></header>
      {notice && <div className="notice">{notice}<button onClick={() => setNotice(null)}>Dismiss</button></div>}
      {loading ? <div className="loading-line">Waking the local runner…</div> : view === "projects" ? <Projects projects={projects} jobs={jobs} selected={selected} onSelect={setSelected} onCheck={async (slug) => {
        try {
          const job = await api.check(slug);
          setJobs((items) => [job, ...items]);
          setNotice(`Validation started for ${slug}`);
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not start validation");
        }
      }} onPreview={async (slug) => {
        try {
          const job = await api.preview(slug);
          setJobs((items) => [job, ...items]);
          setNotice(`Preview server started for ${slug}`);
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not start preview");
        }
      }} onStopPreview={async (slug) => {
        try {
          await api.stopPreview(slug);
          setNotice(`Preview stopped for ${slug}`);
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not stop preview");
        }
      }} onRender={async (slug) => {
        try {
          const job = await api.render(slug);
          setJobs((items) => [job, ...items]);
          setNotice(`Render started for ${slug}. Rendering is explicit and will not overwrite an existing output implicitly.`);
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not start render");
        }
      }} onCancel={async (jobId) => {
        try {
          const job = await api.cancel(jobId);
          setJobs((items) => items.map((item) => item.id === job.id ? job : item));
          setNotice(`Cancelled ${job.type} job`);
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not cancel job");
        }
      }} onCreate={() => setView("create")} /> : view === "create" ? <Create onComplete={(job) => { setJobs((items) => [job, ...items]); setView("projects"); setNotice("Codex generation started. Watch its progress in Recent activity."); }} /> : <Health checks={checks} onRun={() => void loadHealth()} />}
    </main>
  </div>;
}

function Projects({ projects, jobs, selected, onSelect, onCheck, onPreview, onStopPreview, onRender, onCancel, onCreate }: { projects: ProjectSummary[]; jobs: JobSummary[]; selected: ProjectSummary | null; onSelect: (project: ProjectSummary) => void; onCheck: (slug: string) => void; onPreview: (slug: string) => void; onStopPreview: (slug: string) => void; onRender: (slug: string) => void; onCancel: (jobId: string) => void; onCreate: () => void }) {
  const recentJobs = useMemo(() => jobs.slice(0, 4), [jobs]);
  return <>
    <section className="hero-row"><div><p className="lede">A calm control room for turning ideas into precise, previewable motion.</p><div className="hero-meta"><span className="signal"><i /> Codex skills ready</span><span>·</span><span>HTML stays canonical</span></div></div><button className="primary" onClick={onCreate}>Create a short <span>→</span></button></section>
    <section className="metrics"><Metric value={String(projects.length).padStart(2, "0")} label="Projects" note="on this machine" /><Metric value={String(projects.filter((p) => p.status === "ready").length).padStart(2, "0")} label="Artifact-ready" note="visuals + narration + alignment" /><Metric value={String(recentJobs.filter((j) => j.status === "running").length).padStart(2, "0")} label="In motion" note="active jobs" /></section>
    <div className="section-heading"><div><span className="eyebrow">LIBRARY</span><h2>Video projects</h2></div><span className="muted">{projects.length} local folders</span></div>
    <section className="project-layout"><div className="project-list">{projects.length === 0 ? <Empty onCreate={onCreate} /> : projects.map((project) => <ProjectRow key={project.slug} project={project} selected={selected?.slug === project.slug} onClick={() => onSelect(project)} />)}</div><ProjectDetail project={selected ?? projects[0] ?? null} onCheck={onCheck} onPreview={onPreview} onStopPreview={onStopPreview} onRender={onRender} /></section>
    <section className="section-heading activity-heading"><div><span className="eyebrow">OPERATIONS</span><h2>Recent activity</h2></div></section><div className="activity-list">{recentJobs.length ? recentJobs.map((job) => <Activity key={job.id} job={job} onCancel={onCancel} />) : <div className="empty-activity">No jobs yet. Your next Codex generation will appear here.</div>}</div>
  </>;
}

function ProjectRow({ project, selected, onClick }: { project: ProjectSummary; selected: boolean; onClick: () => void }) { const meta = templateMeta[project.template as keyof typeof templateMeta] ?? templateMeta.classic; return <button className={selected ? "project-row selected" : "project-row"} onClick={onClick}><div className={`project-thumb ${project.template}`}><span>{project.title.slice(0, 1).toUpperCase()}</span><small>{project.workflow ?? meta.label}</small></div><div className="project-copy"><strong>{project.title}</strong><span>{project.slug}{project.qaStatus ? ` · QA ${project.qaStatus}` : ""}</span></div><div className={`status ${project.status}`}><i />{project.status === "ready" ? "Ready" : "Incomplete"}</div><span className="chevron">→</span></button>; }
function ProjectDetail({ project, onCheck, onPreview, onStopPreview, onRender }: { project: ProjectSummary | null; onCheck: (slug: string) => void; onPreview: (slug: string) => void; onStopPreview: (slug: string) => void; onRender: (slug: string) => void }) { if (!project) return <div className="detail-panel placeholder"><span className="detail-number">01</span><h3>Select a project</h3><p>Your project details, artifacts, and validation actions will live here.</p></div>; const existing = project.artifacts.filter((item) => item.exists).length; return <div className="detail-panel"><div className="detail-top"><div><span className="eyebrow">SELECTED PROJECT</span><h3>{project.title}</h3><p className="path">{project.path}</p></div><span className={`status ${project.status}`}><i />{project.status}</span></div><div className="detail-preview"><div className="preview-grid" /><div className="preview-label">{templateMeta[project.template as keyof typeof templateMeta]?.label ?? "HyperFrames"}</div><div className="preview-play">▶</div></div><div className="artifact-head"><span>Artifacts</span><span>{existing}/{project.artifacts.length} present</span></div><div className="artifact-list">{project.artifacts.map((item) => <div className="artifact" key={item.relativePath}><span className={item.exists ? "artifact-check" : "artifact-missing"}>{item.exists ? "✓" : "–"}</span><span>{item.relativePath}</span><span>{item.exists ? formatBytes(item.sizeBytes) : "missing"}</span></div>)}</div><div className="detail-actions"><button className="secondary" onClick={() => onCheck(project.slug)}>Check <span>↗</span></button><button className="secondary" onClick={() => onPreview(project.slug)}>Preview <span>↗</span></button><button className="secondary" onClick={() => onStopPreview(project.slug)}>Stop preview</button><button className="primary" onClick={() => onRender(project.slug)}>Render <span>↗</span></button></div></div>; }
function Create({ onComplete }: { onComplete: (job: JobSummary) => void }) { const [topic, setTopic] = useState(""); const [workflow, setWorkflow] = useState(DEFAULT_WORKFLOW); const [template, setTemplate] = useState(DEFAULT_TEMPLATE); const [images, setImages] = useState(DEFAULT_IMAGES); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { onComplete(await api.startGeneration({ topic, workflow, template, images })); } catch (err) { setError(err instanceof Error ? err.message : "Could not start generation"); } finally { setBusy(false); } } return <section className="create-grid"><div className="create-intro"><span className="eyebrow">CODEX GENERATION</span><h2>Give the next idea a frame.</h2><p>Codex will use project-scoped HyperFrames skills to research, storyboard, narrate, caption, compose, and visually verify a previewable video.</p><div className="flow"><span>01 Input</span><b>→</b><span>02 Direct</span><b>→</b><span>03 Preview</span></div></div><form className="create-form" onSubmit={submit}><label>What should the short explain?<textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Why vector databases make semantic search possible" required rows={4} /></label><label>Generation workflow<select value={workflow} onChange={(event) => setWorkflow(event.target.value)}>{GENERATION_POLICY.workflows.map((value) => <option key={value} value={value}>{value === "adaptive" ? "Adaptive explainer — variable scenes + captions" : "Template short — legacy four-phase system"}</option>)}</select></label>{workflow === "template" && <label>Visual system<select value={template} onChange={(event) => setTemplate(event.target.value)}>{GENERATION_POLICY.templates.map((value) => <option key={value} value={value}>{templateMeta[value as keyof typeof templateMeta].label} — {templateMeta[value as keyof typeof templateMeta].tone}</option>)}</select></label>}<label>Original image assets<select value={images} onChange={(event) => setImages(event.target.value)}>{GENERATION_POLICY.imageModes.map((value) => <option key={value} value={value}>{value === "auto" ? "Auto — generate only when story-justified" : value === "off" ? "Off — native and sourced visuals only" : "Required — generation must include an original asset"}</option>)}</select></label><div className="form-note"><span>⌁</span><p>Adaptive mode uses the current HyperFrames storyboard, caption, registry, media, and snapshot workflows. Rendering remains a separate explicit action.</p></div>{error && <div className="form-error">{error}</div>}<button className="primary full" disabled={busy}>{busy ? "Starting Codex…" : "Start Codex generation →"}</button></form></section>; }
function Health({ checks, onRun }: { checks: PreflightCheck[]; onRun: () => void }) { return <section className="health-grid"><div className="health-intro"><span className="eyebrow">PREFLIGHT</span><h2>Know the room is ready before you press go.</h2><p>These checks run locally and never expose secret values. Fix failures before starting a long generation job.</p><button className="secondary" onClick={onRun}>Run checks again ↻</button></div><div className="check-list">{checks.length ? checks.map((check) => <div className="check-row" key={check.id}><span className={`check-icon ${check.status}`}>{check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "×"}</span><div><strong>{check.label}</strong><span>{check.detail}</span></div><em>{check.status}</em></div>) : <div className="loading-line">Run preflight to inspect the local toolchain.</div>}</div></section>; }
function Metric({ value, label, note }: { value: string; label: string; note: string }) { return <div className="metric"><strong>{value}</strong><span>{label}</span><small>{note}</small></div>; }
function Activity({ job, onCancel }: { job: JobSummary; onCancel: (jobId: string) => void }) { const cancellable = job.status === "queued" || job.status === "running"; return <div className="activity"><span className={`job-dot ${job.status}`} /><div><strong>{job.type === "generation" ? "Codex generation" : `HyperFrames ${job.type}`}</strong><span>{job.projectSlug ?? job.command.slice(-1)[0]}</span>{job.error && <small className="activity-error">{job.error}</small>}{job.previewUrl && <a className="preview-link" href={job.previewUrl} target="_blank" rel="noreferrer">Open preview ↗</a>}</div><em>{job.status}</em><time>{new Date(job.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>{cancellable && <button className="secondary" onClick={() => onCancel(job.id)}>Cancel</button>}{job.output && <details><summary>log</summary><pre>{job.output}</pre></details>}</div>; }
function Empty({ onCreate }: { onCreate: () => void }) { return <div className="empty"><span className="empty-mark">＋</span><h3>No generated projects yet</h3><p>Your videos folder is ready for its first short.</p><button className="secondary" onClick={onCreate}>Start with a topic →</button></div>; }
function formatBytes(bytes: number) { if (!bytes) return "—"; if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
