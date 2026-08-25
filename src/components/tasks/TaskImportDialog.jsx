import React, { useState, useMemo, useRef, useEffect } from "react";
import { addTask, addSubject, addProject } from "../../LearnLeaf_Functions.jsx";
import {
  IMPORT_COLUMNS, STATUS_OPTIONS, PRIORITY_OPTIONS,
  parseDelimited, rowsToDrafts, validateDraft, isBlankDraft, blankDraft,
} from "../../utils/spreadsheetImport.js";

const SAMPLE = [
  "Task Name\tDescription\tSubject\tProject\tStatus\tPriority\tStart Date\tDue Date\tDue Time",
  "Read chapters 4-6\tFocus on the case studies\tPsychology 101\t\tNot Started\tHigh\t\t04/12/2026\t11:59 PM",
  "Draft literature review\t\tPsychology 101\tFinal Paper\tIn Progress\tMedium\t04/01/2026\t04/20/2026\t",
].join("\n");

const KEY_BY_INDEX = IMPORT_COLUMNS.map(c => c.key);

/**
 * Bulk task import from a spreadsheet.
 *
 * Step 1 — paste rows copied out of Excel / Google Sheets (tab separated) or
 * pick a .csv/.tsv file. Step 2 — review the parsed grid, fix anything flagged
 * inline, then import. Subjects and projects named in the sheet are matched to
 * existing ones by name and created when they don't exist yet.
 */
export default function TaskImportDialog({ open, onClose, subjects = [], projects = [], onImported }) {
  const [step, setStep] = useState("input");
  const [rawText, setRawText] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [parseError, setParseError] = useState("");
  const [progress, setProgress] = useState(0);
  const [importErrors, setImportErrors] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep("input");
    setRawText("");
    setDrafts([]);
    setParseError("");
    setProgress(0);
    setImportErrors([]);
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Validate every row on each edit so the counts and highlights stay live.
  const validated = useMemo(
    () => drafts.map(d => ({ draft: d, ...validateDraft(d) })),
    [drafts]
  );

  const validRows = validated.filter(v => Object.keys(v.errors).length === 0);
  const invalidCount = validated.length - validRows.length;

  // Names in the sheet that don't match an existing record — these get created.
  const { newSubjects, newProjects } = useMemo(() => {
    const existingSubjects = new Set(subjects.map(s => (s.subjectName || "").trim().toLowerCase()));
    const existingProjects = new Set(projects.map(p => (p.projectName || "").trim().toLowerCase()));
    const subjectSet = new Map();
    const projectSet = new Map();
    for (const { values } of validRows) {
      const s = values.subjectName;
      if (s && !existingSubjects.has(s.toLowerCase()) && !subjectSet.has(s.toLowerCase())) subjectSet.set(s.toLowerCase(), s);
      const p = values.projectName;
      if (p && !existingProjects.has(p.toLowerCase()) && !projectSet.has(p.toLowerCase())) projectSet.set(p.toLowerCase(), p);
    }
    return { newSubjects: [...subjectSet.values()], newProjects: [...projectSet.values()] };
  }, [validRows, subjects, projects]);

  if (!open) return null;

  const handleParse = (text) => {
    const grid = parseDelimited(text);
    if (!grid.length) {
      setParseError("Nothing to import — paste some rows or choose a CSV file first.");
      return;
    }
    const parsed = rowsToDrafts(grid).filter(d => !isBlankDraft(d));
    if (!parsed.length) {
      setParseError("Those rows came through empty. Check that the sheet has a task name column.");
      return;
    }
    setParseError("");
    setDrafts(parsed);
    setStep("review");
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(text);
      handleParse(text);
    } catch {
      setParseError("Couldn't read that file. Save it as .csv or .tsv and try again.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const setCell = (rowIndex, key, value) =>
    setDrafts(prev => prev.map((d, i) => (i === rowIndex ? { ...d, [key]: value } : d)));

  const removeRow = (rowIndex) =>
    setDrafts(prev => prev.filter((_, i) => i !== rowIndex));

  const addRow = () => setDrafts(prev => [...prev, blankDraft()]);

  const handleImport = async () => {
    if (!validRows.length) return;
    setStep("importing");
    setProgress(0);
    setImportErrors([]);

    const failures = [];
    const totalSteps = newSubjects.length + newProjects.length + validRows.length;
    let done = 0;
    const tick = () => { done += 1; setProgress(Math.round((done / totalSteps) * 100)); };

    // Existing records first, so a name already in the app is reused rather than duplicated.
    const subjectIds = new Map(subjects.map(s => [(s.subjectName || "").trim().toLowerCase(), s.subjectId]));
    const projectIds = new Map(projects.map(p => [(p.projectName || "").trim().toLowerCase(), p.projectId]));

    for (const name of newSubjects) {
      try {
        const created = await addSubject({ subjectName: name, subjectColor: "#355147" });
        if (created?.subjectId) subjectIds.set(name.toLowerCase(), created.subjectId);
      } catch (e) {
        failures.push(`Subject "${name}" could not be created: ${e.message}`);
      }
      tick();
    }

    // A project inherits the subjects it appears alongside in the sheet.
    const subjectsForProject = new Map();
    for (const { values } of validRows) {
      if (!values.projectName) continue;
      const key = values.projectName.toLowerCase();
      const subjectId = values.subjectName ? subjectIds.get(values.subjectName.toLowerCase()) : null;
      if (!subjectsForProject.has(key)) subjectsForProject.set(key, new Set());
      if (subjectId) subjectsForProject.get(key).add(subjectId);
    }

    for (const name of newProjects) {
      try {
        const created = await addProject({
          projectName: name,
          projectDescription: "",
          projectSubjects: [...(subjectsForProject.get(name.toLowerCase()) || [])],
        });
        if (created?.projectId) projectIds.set(name.toLowerCase(), created.projectId);
      } catch (e) {
        failures.push(`Project "${name}" could not be created: ${e.message}`);
      }
      tick();
    }

    let imported = 0;
    for (const { values } of validRows) {
      try {
        await addTask({
          taskName: values.taskName,
          taskDescription: values.taskDescription,
          taskStatus: values.taskStatus,
          taskPriority: values.taskPriority,
          taskSubject: (values.subjectName && subjectIds.get(values.subjectName.toLowerCase())) || "None",
          taskProject: (values.projectName && projectIds.get(values.projectName.toLowerCase())) || "None",
          startDateInput: values.startDate,
          dueDateInput: values.dueDate,
          dueTimeInput: values.dueTime,
        });
        imported += 1;
      } catch (e) {
        failures.push(`"${values.taskName}" could not be imported: ${e.message}`);
      }
      tick();
    }

    setProgress(100);
    if (failures.length) {
      setImportErrors(failures);
      setStep("review");
    }
    onImported?.(imported, failures.length);
    if (!failures.length) onClose();
  };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 60 };
  const panel = {
    position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 70,
    background: "white", borderRadius: "16px", width: "min(1280px, 95vw)", maxHeight: "90vh",
    display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
  };
  const cellInput = (hasError) => ({
    width: "100%", boxSizing: "border-box", border: `1px solid ${hasError ? "#F3161E" : "transparent"}`,
    background: hasError ? "#fff5f5" : "transparent", borderRadius: "6px", padding: "6px 7px",
    fontSize: "0.8rem", color: "#1a2e28", outline: "none", fontFamily: "inherit",
  });

  return (
    <>
      <div style={overlay} onClick={step === "importing" ? undefined : onClose} />
      <div style={panel} role="dialog" aria-modal="true" aria-label="Import tasks from a spreadsheet">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f0f4f2", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#355147", fontFamily: "Playfair Display,serif", margin: 0 }}>
              Import Tasks
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#9ca3af" }}>
              {step === "review" ? "Review the rows below, then import" : "Bring in a batch of tasks from a spreadsheet"}
            </p>
          </div>
          <button onClick={onClose} disabled={step === "importing"}
            aria-label="Close"
            style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: "#f3f4f6", cursor: step === "importing" ? "default" : "pointer", color: "#6b7280", fontSize: "16px", flexShrink: 0 }}>
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
          {step === "input" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#f0f7f4", border: "1px solid #B6CDC8", borderRadius: "12px", padding: "14px 16px", fontSize: "0.83rem", color: "#355147", lineHeight: 1.6 }}>
                <strong>How it works:</strong> select your rows in Excel or Google Sheets, copy them, and paste
                below — or choose a <code>.csv</code>/<code>.tsv</code> file. Include a header row and the columns
                can be in any order; without one, columns are read in this order:
                <div style={{ marginTop: "8px", color: "#6b7280" }}>
                  {IMPORT_COLUMNS.map(c => c.label + (c.required ? " *" : "")).join(" · ")}
                </div>
                <div style={{ marginTop: "8px", color: "#6b7280" }}>
                  Only <strong>Task Name</strong> is required. Status defaults to Not Started, priority to Medium.
                  Subjects and projects are matched by name and created if they're new.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Paste your rows
                </label>
                <textarea
                  value={rawText}
                  onChange={e => { setRawText(e.target.value); setParseError(""); }}
                  placeholder={SAMPLE}
                  spellCheck={false}
                  style={{
                    width: "100%", boxSizing: "border-box", minHeight: "200px", resize: "vertical",
                    borderRadius: "10px", border: `1px solid ${parseError ? "#F3161E" : "#e5e9e8"}`,
                    padding: "0.7rem 0.85rem", fontSize: "0.8rem", lineHeight: 1.6,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#1a2e28", outline: "none",
                  }}
                />
                {parseError && <p style={{ fontSize: "0.75rem", color: "#F3161E", marginTop: "6px" }}>{parseError}</p>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  Choose a CSV / TSV file
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                  onChange={handleFile} style={{ display: "none" }} />
                <button className="btn-secondary" onClick={() => { setRawText(SAMPLE); setParseError(""); }}>
                  Fill in an example
                </button>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                  Working from .xlsx? Copy the cells and paste, or export the sheet as CSV.
                </span>
              </div>
            </div>
          )}

          {step === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <Pill color="#355147" bg="#f0f7f4">{validRows.length} ready to import</Pill>
                {invalidCount > 0 && <Pill color="#F3161E" bg="#fff5f5">{invalidCount} need{invalidCount === 1 ? "s" : ""} attention</Pill>}
                {newSubjects.length > 0 && <Pill color="#5B8E9F" bg="#f0f6f8">{newSubjects.length} new subject{newSubjects.length === 1 ? "" : "s"}</Pill>}
                {newProjects.length > 0 && <Pill color="#8E5B9F" bg="#f7f0f8">{newProjects.length} new project{newProjects.length === 1 ? "" : "s"}</Pill>}
              </div>

              {invalidCount > 0 && (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>
                  Rows flagged in red are skipped. Fix them here or delete them — the rest still import.
                </p>
              )}

              {importErrors.length > 0 && (
                <div style={{ background: "#fff5f5", border: "1px solid #F3161E", borderRadius: "10px", padding: "12px 14px", maxHeight: "140px", overflowY: "auto" }}>
                  <strong style={{ fontSize: "0.8rem", color: "#F3161E" }}>Some rows didn't save:</strong>
                  {importErrors.map((err, i) => (
                    <p key={i} style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>{err}</p>
                  ))}
                </div>
              )}

              <div style={{ overflowX: "auto", border: "1px solid #e5e9e8", borderRadius: "12px" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "1180px" }}>
                  <thead>
                    <tr style={{ background: "#f9fbfa" }}>
                      <th style={thStyle(44)}>#</th>
                      {IMPORT_COLUMNS.map(col => (
                        <th key={col.key} style={thStyle(col.width)}>
                          {col.label}{col.required && <span style={{ color: "#F3161E" }}> *</span>}
                        </th>
                      ))}
                      <th style={thStyle(44)} />
                    </tr>
                  </thead>
                  <tbody>
                    {validated.map(({ draft, errors }, rowIndex) => {
                      const rowInvalid = Object.keys(errors).length > 0;
                      return (
                        <tr key={rowIndex} style={{ borderTop: "1px solid #f0f4f2", background: rowInvalid ? "#fffafa" : "white" }}>
                          <td style={{ ...tdStyle, textAlign: "center", color: rowInvalid ? "#F3161E" : "#9ca3af", fontSize: "0.75rem" }}>
                            {rowIndex + 1}
                          </td>
                          {KEY_BY_INDEX.map(key => (
                            <td key={key} style={tdStyle}>
                              {key === "taskStatus" || key === "taskPriority" ? (
                                <select
                                  value={draft[key] || ""}
                                  onChange={e => setCell(rowIndex, key, e.target.value)}
                                  title={errors[key] || ""}
                                  style={{ ...cellInput(!!errors[key]), cursor: "pointer" }}>
                                  <option value="">{key === "taskStatus" ? "Not Started" : "Medium"}</option>
                                  {(key === "taskStatus" ? STATUS_OPTIONS : PRIORITY_OPTIONS).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                  {/* Keep an unrecognised value visible instead of silently blanking it. */}
                                  {draft[key] && ![...STATUS_OPTIONS, ...PRIORITY_OPTIONS].includes(draft[key]) && (
                                    <option value={draft[key]}>{draft[key]}</option>
                                  )}
                                </select>
                              ) : (
                                <input
                                  value={draft[key] || ""}
                                  onChange={e => setCell(rowIndex, key, e.target.value)}
                                  title={errors[key] || ""}
                                  style={cellInput(!!errors[key])} />
                              )}
                            </td>
                          ))}
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <button onClick={() => removeRow(rowIndex)} aria-label={`Remove row ${rowIndex + 1}`}
                              style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: "14px", padding: "4px" }}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <button className="btn-secondary" onClick={addRow} style={{ fontSize: "0.8rem" }}>+ Add a row</button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "0.95rem", color: "#355147", fontWeight: 600, margin: "0 0 16px" }}>
                Importing {validRows.length} task{validRows.length === 1 ? "" : "s"}…
              </p>
              <div style={{ height: "8px", background: "#f0f4f2", borderRadius: "999px", overflow: "hidden", maxWidth: "420px", margin: "0 auto" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#355147", borderRadius: "999px", transition: "width 200ms" }} />
              </div>
              <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "10px" }}>{progress}% complete</p>
            </div>
          )}
        </div>

        {step !== "importing" && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "16px 24px", borderTop: "1px solid #f0f4f2", flexShrink: 0, flexWrap: "wrap" }}>
            <div>
              {step === "review" && (
                <button className="btn-secondary" onClick={() => setStep("input")}>← Back</button>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              {step === "input" ? (
                <button className="btn-primary" onClick={() => handleParse(rawText)}>Preview rows</button>
              ) : (
                <button className="btn-primary" onClick={handleImport} disabled={!validRows.length}
                  style={{ opacity: validRows.length ? 1 : 0.5, cursor: validRows.length ? "pointer" : "default" }}>
                  Import {validRows.length} task{validRows.length === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Pill({ children, color, bg }) {
  return (
    <span style={{ background: bg, color, borderRadius: "999px", padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600 }}>
      {children}
    </span>
  );
}

const thStyle = (width) => ({
  padding: "10px 8px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", width, minWidth: width,
});

const tdStyle = { padding: "2px 4px", verticalAlign: "middle" };
