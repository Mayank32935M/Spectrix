import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { 
  Maximize2, 
  MousePointer, 
  Move
} from 'lucide-react';
import { Case, EvidenceAsset, ForensicFinding } from '../types';
import { fetchGraph } from '../services/api';

interface EvidenceCanvasProps {
  activeCase: Case | null;
  activeEvidence: EvidenceAsset | null;
  findings: ForensicFinding[];
  onSelectEvidence: (evidenceId: string) => void;
  onSelectFinding: (findingId: string) => void;
}

export const EvidenceCanvas: React.FC<EvidenceCanvasProps> = ({
  activeCase,
  activeEvidence: _activeEvidence,
  findings,
  onSelectEvidence,
  onSelectFinding,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !activeCase) return;

    // Fetch dynamic graph representation from backend
    fetchGraph(activeCase.case_id)
      .then((data) => {
        if (!containerRef.current) return;

        // Destroy previous instance
        if (cyRef.current) {
          cyRef.current.destroy();
        }

        const elements: cytoscape.ElementDefinition[] = [];

        // Build nodes
        data.nodes.forEach((n: any) => {
          elements.push({
            group: 'nodes',
            data: n.data,
          });
        });

        // Build edges
        data.edges.forEach((e: any) => {
          elements.push({
            group: 'edges',
            data: e.data,
          });
        });

        setNodeCount(data.total_nodes);
        setEdgeCount(data.total_edges);

        const cy = cytoscape({
          container: containerRef.current,
          elements: elements,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#18202e',
                'border-color': '#2d3a4f',
                'border-width': 1.5,
                'label': 'data(label)',
                'color': '#f1f5f9',
                'font-family': 'JetBrains Mono, monospace',
                'font-size': '10px',
                'text-valign': 'bottom',
                'text-margin-y': 6,
                'width': 36,
                'height': 36,
              },
            },
            {
              selector: 'node[type="case"]',
              style: {
                'background-color': '#0f172a',
                'border-color': '#35c6a0',
                'border-width': 2,
                'width': 46,
                'height': 46,
                'font-size': '11px',
                'font-weight': 'bold',
                'color': '#35c6a0',
              },
            },
            {
              selector: 'node[type="evidence"]',
              style: {
                'background-color': '#111722',
                'border-color': '#38bdf8',
                'border-width': 1.5,
                'width': 40,
                'height': 40,
              },
            },
            {
              selector: 'node[status="anomaly"]',
              style: {
                'border-color': '#f43f5e',
                'border-width': 2,
              },
            },
            {
              selector: 'node[type="finding"]',
              style: {
                'background-color': '#222c3d',
                'border-color': '#f43f5e',
                'width': 28,
                'height': 28,
                'font-size': '9px',
                'color': '#f43f5e',
              },
            },
            {
              selector: 'edge',
              style: {
                'width': 1.5,
                'line-color': '#2d3a4f',
                'target-arrow-color': '#2d3a4f',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'arrow-scale': 0.8,
                'label': 'data(label)',
                'font-family': 'JetBrains Mono, monospace',
                'font-size': '8px',
                'color': '#94a3b8',
                'text-background-color': '#0a0e16',
                'text-background-opacity': 0.85,
                'text-background-padding': '2px',
              },
            },
            {
              selector: 'edge[label="HAS_FINDING"]',
              style: {
                'line-color': '#f43f5e',
                'target-arrow-color': '#f43f5e',
                'line-style': 'dashed',
              },
            },
            {
              selector: 'node:selected',
              style: {
                'border-color': '#35c6a0',
                'border-width': 3,
              },
            },
          ],
          layout: {
            name: 'breadthfirst',
            directed: true,
            padding: 40,
            spacingFactor: 1.4,
          },
        });

        // Click handlers
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          const nodeType = node.data('type');
          if (nodeType === 'evidence') {
            onSelectEvidence(node.id());
          } else if (nodeType === 'finding') {
            onSelectFinding(node.id());
          }
        });

        cyRef.current = cy;
      })
      .catch((err) => console.error('Error fetching graph payload:', err));

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [activeCase, findings]);

  const handleCenter = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-tech-grid flex flex-col select-none">
      {/* Top Filter Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1 bg-surface-panel/95 backdrop-blur-md border border-border-default rounded text-xs font-mono shadow-xl">
        <span className="text-[10px] text-content-muted uppercase tracking-wider px-2 font-semibold">
          FILTER:
        </span>
        <button
          onClick={() => setFilter('video')}
          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition ${
            filter === 'video'
              ? 'bg-surface-elevated text-accent-cyan border-accent-cyan/40'
              : 'bg-surface-canvas border-border-default text-content-secondary hover:text-content-primary'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span> Video
        </button>
        <button
          onClick={() => setFilter('image')}
          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition ${
            filter === 'image'
              ? 'bg-surface-elevated text-accent-mint border-accent-mint/40'
              : 'bg-surface-canvas border-border-default text-content-secondary hover:text-content-primary'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-mint"></span> Image
        </button>
        <button
          onClick={() => setFilter('findings')}
          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition ${
            filter === 'findings'
              ? 'bg-accent-crimson/15 text-accent-crimson border-accent-crimson/40 font-semibold'
              : 'bg-surface-canvas border-border-default text-content-secondary hover:text-content-primary'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-crimson animate-pulse"></span> Findings
        </button>
        <div className="h-3 w-px bg-border-hairpin mx-1"></div>
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-0.5 text-[11px] transition ${
            filter === 'all' ? 'text-accent-mint font-bold' : 'text-content-muted hover:text-content-primary'
          }`}
        >
          All ({nodeCount})
        </button>
      </div>

      {/* Floating Canvas Tool Palette (Top-Left) */}
      <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 p-1 bg-surface-panel/95 backdrop-blur-md border border-border-default rounded shadow-2xl">
        <button
          className="w-7 h-7 rounded flex items-center justify-center bg-accent-mint/20 text-accent-mint border border-accent-mint/40"
          title="Select Mode"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-container transition"
          title="Pan Hand"
        >
          <Move className="w-3.5 h-3.5" />
        </button>
        <div className="h-px w-5 bg-border-hairpin mx-auto my-0.5"></div>
        <button
          onClick={handleCenter}
          className="w-7 h-7 rounded flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-container transition"
          title="Fit & Center Graph"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cytoscape Container Stage */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-0" />

      {/* Bottom Center: Audit Ticker Strip */}
      <div className="absolute bottom-3 left-12 right-12 z-20 flex items-center justify-between px-3 py-1.5 bg-surface-panel/95 backdrop-blur-md border border-border-default rounded font-mono text-xs shadow-xl">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-content-muted uppercase tracking-wider font-semibold flex items-center gap-1.5 shrink-0 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-mint"></span>AUDIT LOG:
          </span>
          <div className="flex items-center gap-2 text-content-secondary truncate text-[11px]">
            <span className="text-accent-mint font-semibold">[09:14 UTC]</span>
            <span>Evidence asset registered into immutable custody</span>
            <span className="text-content-muted">→</span>
            <span className="text-accent-amber font-medium">Baseline ELA & PRNU pipelines dispatched</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] text-content-muted">
          <span>{nodeCount} NODES</span>
          <span>{edgeCount} EDGES</span>
        </div>
      </div>
    </div>
  );
};
