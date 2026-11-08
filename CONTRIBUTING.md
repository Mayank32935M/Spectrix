# Contributing to SPECTRIX

Thank you for your interest in contributing to SPECTRIX. As a digital forensics and evidence intelligence platform used in high-stakes media verification and evidentiary workflows, we maintain rigorous engineering standards, cryptographic accountability, and ethical transparency.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all members of the community with dignity, professional respect, and intellectual honesty.

---

## Architectural Principles

When writing or reviewing code for SPECTRIX, keep the following core tenets in mind:

1. **Forensic Honesty**: Never output fabricated results, artificial confidence scores, or fake detections. If an analysis pipeline is unimplemented, uncalibrated, or failed, it must be reported honestly as `INSUFFICIENT_ANALYSIS`, not a false negative.
2. **Cryptographic Immutability**: Evidence assets are read-only. We never modify original files in-place. All transformations (ELA, 2D-FFT, Noise PRNU, etc.) operate on memory buffers or derived caches.
3. **Strict Case & Modality Isolation**: Evidence assets and findings belonging to Case A must never leak into Case B. All API endpoints and UI selectors must enforce explicit `case_id` and `evidence_id` boundaries.
4. **Offline First**: Pipelines and inference engines must operate without external cloud dependencies. Sensitive case data must never leave the examiner's local workstation.

---

## Development Setup

### Prerequisites

- **Python 3.11+** (tested up to Python 3.14)
- **Node.js 20+** (LTS recommended)
- **pnpm 9+** (`npm install -g pnpm`)
- **Git**

### 1. Clone & Set Up Workspace

```bash
git clone https://github.com/spectrix/spectrix.git
cd spectrix
```

### 2. Backend Setup (FastAPI Core)

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r apps/api/requirements.txt   # or editable dev install
```

To run the backend server:

```bash
# From repository root
export PYTHONPATH="apps/api"   # On Windows PowerShell: $env:PYTHONPATH="apps/api"
uvicorn spectrix.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Frontend Setup (React 19 + Vite)

```bash
# Install pnpm workspace dependencies
pnpm install

# Start Vite development server
pnpm --filter @spectrix/web dev
```

The web application runs at [http://localhost:5173](http://localhost:5173) with automatic proxying to the backend API at port 8000.

---

## Running Verification & Tests

Before submitting a Pull Request, ensure all tests and type checks pass:

```bash
# Run Backend Pytest Suite
export PYTHONPATH="apps/api"
pytest apps/api/tests

# Run Web TypeScript & Production Build
pnpm --filter @spectrix/web build
```

---

## Commit Guidelines

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(studio)`: Add a new examination studio feature or detector
- `fix(verdict)`: Correct an edge case or calculation in verdict fusion
- `docs(readme)`: Update documentation, manuals, or tutorials
- `test(api)`: Add or update unit/integration test suites
- `refactor(web)`: Refactor components without altering behavior
- `chore(deps)`: Upgrade packages or maintenance configurations

Keep git commits granular and focused on a single change with descriptive messages.
