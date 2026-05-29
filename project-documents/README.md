# Project documents

Source and governance documents for MethodHub that are **not part of the
codebase** but are kept under version control for reference. They were
moved here to keep the repository root clean; nothing in `src/` imports
them at runtime.

| File | What it is |
|------|------------|
| `2023-10-22 Project Manual_v2-1.docx` | ESABCC Project Manual v2.1 — the 5-phase project lifecycle that the (beta) Project Management module is modelled on. Cited in `beta/modules/project-management/page.tsx`. |
| `2026041415_2 Brussels Bulletin April  2026 edition.docx` | Sample Brussels Bulletin edition — reference output for the Word/docx export pipeline. |
| `EU_Climate_Councils_Overview.pdf` | Background overview of EU climate councils. |
| `Project_Initiation_Request_Infra-Assessment-2024.pdf` | Project Initiation Request — infrastructure assessment (2024). |
| `c1_Project_Initiation_Request.(EEA Data Services Simplification).(01-01-2026).(v1.0).docx` | Project Initiation Request — EEA Data Services Simplification. |
| `c1_Project_Initiation_Request.(ESABCCMethodHub).(23-04-2026).(vx.x).docx` | Project Initiation Request — MethodHub. |

These files are excluded from the Docker image (see `.dockerignore`) so
they never bloat the runtime container.
