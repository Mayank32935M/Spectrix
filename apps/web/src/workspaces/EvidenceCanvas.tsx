import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { 
  Maximize2, 
  MousePointer, 
  Move,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Shield,
  AlertTriangle,
  Film,
  Image as ImageIcon,
  AudioWaveform,
  X
} from 'lucide-react';
import { Case, EvidenceAsset, ForensicFinding, ActiveWorkspace } from '../types';
import { fetchGraph } from '../services/api';

interface EvidenceCanvasProps {
  activeCase: Case | null;
  activeEvidence: EvidenceAsset | null;
  findings: ForensicFinding[];
  onSelectEvidence: (evidenceId: string) => void;
  onSelectFinding: (findingId: string) => void;
  onNavigateWorkspace?: (ws: ActiveWorkspace) => void;
}

export const EvidenceCanvas: React.FC<EvidenceCanvasProps> = ({
  activeCase,
  activeEvidence: _activeEvidence,
  findings,
  onSelectEvidence,
  onSelectFinding,
  onNavigateWorkspace,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'audio' | 'findings'>('all');
  const [layoutName, setLayoutName] = useState<'breadthfirst' | 'cose' | 'concentric' | 'circle'>('breadthfirst');
  const [activeTool, setActiveTool] = useState<'select' | 'pan'>('select');
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [edgeCount, setEdgeCount] = useState<number>(0);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  // Apply visual filter
  const applyFilter = useCallback((activeFilter: string) => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
      if (activeFilter === 'all') {
        cy.elements().style('display', 'element');
      } else if (activeFilter === 'findings') {
        cy.nodes().forEach(node => {
          if (node.data('type') === 'finding' || node.data('type') === 'case') {
            node.style('display', 'element');
          } else {
            node.style('display', 'none');
          }
        });
        cy.edges().forEach(edge => {
          if (edge.data('label') === 'HAS_FINDING') {
            edge.style('display', 'element');
          } else {
            edge.style('display', 'none');
          }
        });
      } else {
        // Filter by modality (video, image, audio)
        cy.nodes().forEach(node => {
          const type = node.data('type');
          const mod = node.data('modality');
          if (type === 'case' || mod === activeFilter) {
            node.style('display', 'element');
          } else {
            node.style('display', 'none');
          }
        });
        cy.edges().forEach(edge => {
          const src = edge.source();
          const tgt = edge.target();
          if (src.style('display') !== 'none' && tgt.style('display') !== 'none') {
            edge.style('display', 'element');
          } else {
            edge.style('display', 'none');
          }
        });
      }
    });
  }, []);

  // Change layout
  const applyLayout = useCallback((layoutType: string) => {
    if (!cyRef.current) return;
    const layout = cyRef.current.layout({
      name: layoutType,
      animate: true,
      animationDuration: 400,
      padding: 50,
      ...(layoutType === 'breadthfirst' ? { directed: true, spacingFactor: 1.4 } : {}),
      ...(layoutType === 'cose' ? { nodeRepulsion: () => 8000, idealEdgeLength: () => 100 } : {}),
      ...(layoutType === 'concentric' ? { minNodeSpacing: 60 } : {}),
    } as any);
    layout.run();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !activeCase) return;

    fetchGraph(activeCase.case_id)
      .then((data) => {
        if (!containerRef.current) return;

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
          boxSelectionEnabled: false,
          autounselectify: false,
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
                'text-margin-y': 7,
                'width': 38,
                'height': 38,
                'text-background-color': '#090d14',
                'text-background-opacity': 0.85,
                'text-background-padding': '2px',
                'text-background-shape': 'roundrectangle',
              },
            },
            {
              selector: 'node[type="case"]',
              style: {
                'background-color': '#0f172a',
                'border-color': '#35c6a0',
                'border-width': 2.5,
                'width': 48,
                'height': 48,
                'font-size': '11px',
                'font-weight': 'bold',
                'color': '#35c6a0',
              },
            },
            {
              selector: 'node[type="evidence"][modality="video"]',
              style: {
                'background-color': '#111722',
                'border-color': '#38bdf8',
                'border-width': 2,
                'width': 42,
                'height': 42,
              },
            },
            {
              selector: 'node[type="evidence"][modality="image"]',
              style: {
                'background-color': '#111722',
                'border-color': '#35c6a0',
                'border-width': 2,
                'width': 42,
                'height': 42,
              },
            },
            {
              selector: 'node[type="evidence"][modality="audio"]',
              style: {
                'background-color': '#111722',
                'border-color': '#7bd0ff',
                'border-width': 2,
                'width': 42,
                'height': 42,
              },
            },
            {
              selector: 'node[status="anomaly"]',
              style: {
                'border-color': '#f43f5e',
                'border-width': 2.5,
              },
            },
            {
              selector: 'node[type="finding"]',
              style: {
                'background-color': '#222c3d',
                'border-color': '#f43f5e',
                'border-width': 1.5,
                'width': 30,
                'height': 30,
                'font-size': '9px',
                'color': '#f43f5e',
                'shape': 'diamond',
              },
            },
            {
              selector: 'node[type="finding"][classification="investigative_lead"]',
              style: {
                'border-color': '#f59e0b',
                'color': '#f59e0b',
              },
            },
            {
              selector: 'edge',
              style: {
                'width': 1.5,
                'line-color': '#25303d',
                'target-arrow-color': '#25303d',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'arrow-scale': 0.8,
                'label': 'data(label)',
                'font-family': 'JetBrains Mono, monospace',
                'font-size': '8px',
                'color': '#94a3b8',
                'text-background-color': '#090d14',
                'text-background-opacity': 0.9,
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
              selector: 'edge[label="DERIVED_FROM"]',
              style: {
                'line-color': '#35c6a0',
                'target-arrow-color': '#35c6a0',
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
            name: layoutName,
            directed: true,
            padding: 50,
            spacingFactor: 1.4,
          } as any,
        });

        // Click handlers
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          const nodeData = node.data();
          setSelectedNodeData(nodeData);

          const nodeType = nodeData.type;
          if (nodeType === 'evidence') {
            onSelectEvidence(node.id());
          } else if (nodeType === 'finding') {
            onSelectFinding(node.id());
          }
        });

        // Background tap clears selection card
        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            setSelectedNodeData(null);
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
  }, [activeCase, findings, layoutName]);

  const handleCenter = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  const handleZoom = (factor: number) => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * factor);
    }
  };

  const handleOpenWorkspaceForNode = (modality: string) => {
    if (!onNavigateWorkspace) return;
    if (modality === 'video') onNavigateWorkspace('video');
    else if (modality === 'image') onNavigateWorkspace('image');
    else if (modality === 'audio') onNavigateWorkspace('audio');
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-[#090e16] flex flex-col select-none">
      {/* ==================== TOP FILTER BAR ==================== */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1 bg-[#10151d]/95 backdrop-blur-md border border-[#25303d] rounded-lg text-xs font-mono shadow-2xl">
        <span className="text-[10px] text-[#64748b] uppercase tracking-wider px-2 font-semibold">
          FILTER:
        </span>
        <button
          onClick={() => { setFilter('video'); applyFilter('video'); }}
          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition ${
            filter === 'video'
              ? 'bg-[#151c26] text-[#38bdf8] border-[#38bdf8]/50 font-medium'
              : 'bg-[#090d14] border-[#25303d] text-[#94a3b8] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span> Video
        </button>
        <button
          onClick={() => { setFilter('image'); applyFilter('image'); }}
          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition ${
            filter === 'image'
              ? 'bg-[#151c26] text-[#35c6a0] border-[#35c6a0]/50 font-medium'
              : 'bg-[#090d14] border-[#25303d] text-[#94a3b8] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#35c6a0]"></span> Image
        </button>
        <button
          onClick={() => { setFilter('audio'); applyFilter('audio'); }}
          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition ${
            filter === 'audio'
              ? 'bg-[#151c26] text-[#7bd0ff] border-[#7bd0ff]/50 font-medium'
              : 'bg-[#090d14] border-[#25303d] text-[#94a3b8] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#7bd0ff]"></span> Audio
        </button>
        <button
          onClick={() => { setFilter('findings'); applyFilter('findings'); }}
          className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1.5 transition ${
            filter === 'findings'
              ? 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/50 font-semibold'
              : 'bg-[#090d14] border-[#25303d] text-[#94a3b8] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse"></span> Findings
        </button>
        <div className="h-3 w-px bg-[#25303d] mx-1"></div>
        <button
          onClick={() => { setFilter('all'); applyFilter('all'); }}
          className={`px-2 py-0.5 text-[11px] transition ${
            filter === 'all' ? 'text-[#35c6a0] font-bold' : 'text-[#64748b] hover:text-white'
          }`}
        >
          All ({nodeCount})
        </button>
      </div>

      {/* ==================== FLOATING TOOL PALETTE (TOP-LEFT) ==================== */}
      <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 p-1 bg-[#10151d]/95 backdrop-blur-md border border-[#25303d] rounded-lg shadow-2xl">
        <button
          onClick={() => {
            setActiveTool('select');
            if (cyRef.current) cyRef.current.userPanningEnabled(true);
          }}
          className={`w-7 h-7 rounded flex items-center justify-center transition ${
            activeTool === 'select'
              ? 'bg-[#35c6a0]/20 text-[#35c6a0] border border-[#35c6a0]/40'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#151c26]'
          }`}
          title="Select Mode (V)"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setActiveTool('pan');
            if (cyRef.current) cyRef.current.userPanningEnabled(true);
          }}
          className={`w-7 h-7 rounded flex items-center justify-center transition ${
            activeTool === 'pan'
              ? 'bg-[#35c6a0]/20 text-[#35c6a0] border border-[#35c6a0]/40'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#151c26]'
          }`}
          title="Pan Hand (H)"
        >
          <Move className="w-3.5 h-3.5" />
        </button>

        <div className="h-px w-5 bg-[#25303d] mx-auto my-0.5"></div>

        <button
          onClick={handleCenter}
          className="w-7 h-7 rounded flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#151c26] transition"
          title="Fit & Center Graph"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom(1.2)}
          className="w-7 h-7 rounded flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#151c26] transition"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="w-7 h-7 rounded flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-[#151c26] transition"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <div className="h-px w-5 bg-[#25303d] mx-auto my-0.5"></div>

        {/* Layout Selector Popover Button */}
        <select
          value={layoutName}
          onChange={(e) => {
            const lay = e.target.value as any;
            setLayoutName(lay);
            applyLayout(lay);
          }}
          className="w-7 h-7 bg-[#151c26] text-[#94a3b8] border border-[#25303d] rounded text-[8px] font-mono outline-none cursor-pointer"
          title="Change Graph Layout"
        >
          <option value="breadthfirst">BF</option>
          <option value="cose">CO</option>
          <option value="concentric">CC</option>
          <option value="circle">CI</option>
        </select>
      </div>

      {/* ==================== SELECTED NODE HUD CARD (POPUP) ==================== */}
      {selectedNodeData && (
        <div className="absolute top-16 right-4 z-30 w-72 bg-[#10151d]/95 backdrop-blur-md border border-[#25303d] rounded-lg shadow-2xl p-3 font-mono text-[11px] animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#25303d]">
            <div className="flex items-center gap-1.5">
              {selectedNodeData.type === 'evidence' ? (
                selectedNodeData.modality === 'video' ? <Film className="w-3.5 h-3.5 text-[#38bdf8]" /> :
                selectedNodeData.modality === 'audio' ? <AudioWaveform className="w-3.5 h-3.5 text-[#7bd0ff]" /> :
                <ImageIcon className="w-3.5 h-3.5 text-[#35c6a0]" />
              ) : selectedNodeData.type === 'finding' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#f43f5e]" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-[#35c6a0]" />
              )}
              <span className="font-bold text-white uppercase text-[10.5px]">
                {selectedNodeData.type}
              </span>
            </div>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-[#64748b] hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="text-white font-semibold break-all text-[11px]">
              {selectedNodeData.label}
            </div>

            {selectedNodeData.sha256 && (
              <div className="flex justify-between text-[#94a3b8]">
                <span>SHA-256:</span>
                <span className="text-[#35c6a0]">{selectedNodeData.sha256}</span>
              </div>
            )}

            {selectedNodeData.classification && (
              <div className="flex justify-between text-[#94a3b8]">
                <span>Classification:</span>
                <span className="text-[#f43f5e] uppercase">{selectedNodeData.classification}</span>
              </div>
            )}

            {selectedNodeData.score && (
              <div className="flex justify-between text-[#94a3b8]">
                <span>Score:</span>
                <span className="text-[#f59e0b] font-semibold">{selectedNodeData.score}</span>
              </div>
            )}

            {selectedNodeData.explanation && (
              <p className="text-[#cbd5e1] font-sans text-[10.5px] leading-relaxed pt-1 border-t border-[#1c2433]">
                {selectedNodeData.explanation}
              </p>
            )}

            {/* Quick action button to workspace */}
            {selectedNodeData.type === 'evidence' && (
              <button
                onClick={() => handleOpenWorkspaceForNode(selectedNodeData.modality)}
                className="w-full mt-2 h-7 bg-[#1f2737] hover:bg-[#353942] border border-[#25303d] rounded text-[10.5px] text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3 h-3 text-[#35c6a0]" />
                <span>Open in {selectedNodeData.modality.toUpperCase()} Studio</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================== CYTOSCAPE CANVAS STAGE ==================== */}
      <div ref={containerRef} className="flex-1 w-full h-full min-h-0 bg-tech-grid" />

      {/* ==================== BOTTOM LEFT: GRAPH NAVIGATOR MINIMAP ==================== */}
      <div className="absolute bottom-3 left-3 z-30 flex items-end gap-2">
        <div className="w-48 h-28 bg-[#10151d]/95 backdrop-blur-md border border-[#25303d] rounded-lg shadow-2xl p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#94a3b8] font-mono">
            <span className="font-semibold">Graph Navigator</span>
            <span className="text-[#35c6a0] font-semibold">100%</span>
          </div>
          <div className="w-full h-14 bg-[#080b10] rounded relative border border-[#25303d]/50 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-2 border border-[#35c6a0]/60 bg-[#35c6a0]/5 rounded"></div>
            <span className="w-2 h-2 rounded-full bg-[#35c6a0] absolute left-4 top-3" title="Root Case"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] absolute left-12 top-4" title="Video"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#35c6a0] absolute left-12 top-8" title="Image"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7bd0ff] absolute left-20 top-4" title="Audio"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] absolute left-28 top-3 animate-pulse" title="Findings"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] absolute left-36 top-7" title="Anomalies"></span>
          </div>
          <div className="flex justify-between items-center text-[8.5px] font-mono text-[#64748b]">
            <span>{nodeCount} ACTIVE NODES</span>
            <span>{edgeCount} EDGES</span>
          </div>
        </div>
      </div>

      {/* ==================== BOTTOM CENTER: AUDIT TICKER STRIP ==================== */}
      <div className="absolute bottom-3 left-56 right-6 z-20 flex items-center justify-between px-3 py-1.5 bg-[#10151d]/95 backdrop-blur-md border border-[#25303d] rounded-lg shadow-xl font-mono text-xs">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
          <span className="text-[#64748b] uppercase tracking-wider font-semibold flex items-center gap-1.5 shrink-0 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35c6a0]"></span>
            AUDIT LOG:
          </span>
          <div className="flex items-center gap-2 text-[#cbd5e1] truncate text-[10.5px]">
            <span className="text-[#35c6a0] font-semibold">[09:14 UTC]</span>
            <span>Evidence assets registered into immutable vault</span>
            <span className="text-[#64748b]">→</span>
            <span className="text-[#f59e0b] font-medium">Multi-modal cross-correlation graph verified</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] text-[#64748b]">
          <span>{nodeCount} NODES</span>
          <span>{edgeCount} EDGES</span>
        </div>
      </div>
    </div>
  );
};
