import React, { useEffect, useRef, useState } from "react";
import { type GraphNode, type GraphEdge } from "./content.api";

type KnowledgeGraphProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeId: string) => void;
};

type SimNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
};

export function KnowledgeGraph({ nodes, edges, onNodeClick }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Store node coordinate/velocity state in a ref to avoid React render delays in canvas animation
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<GraphEdge[]>([]);
  const dragNodeRef = useRef<SimNode | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Initialize simulation nodes with random coordinates
  useEffect(() => {
    const initializedNodes = nodes.map((n) => {
      const existing = simNodesRef.current.find((prev) => prev.id === n.id);
      return {
        ...n,
        x: existing ? existing.x : Math.random() * 400 + 100,
        y: existing ? existing.y : Math.random() * 400 + 100,
        vx: 0,
        vy: 0,
        width: 120,
        height: 36,
      };
    });
    simNodesRef.current = initializedNodes;
    simEdgesRef.current = edges;
  }, [nodes, edges]);

  // Main canvas drawing and force-directed simulation loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const runSimulationStep = () => {
      const nodes = simNodesRef.current;
      const edges = simEdgesRef.current;

      const repulsion = 0.8;
      const springLength = 120;
      const springStrength = 0.03;
      const damping = 0.88;
      const centerStrength = 0.015;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 1. Repulsion force between all nodes
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 280) {
            const force = (repulsion * 800) / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (n1 !== dragNodeRef.current) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (n2 !== dragNodeRef.current) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // 2. Attraction forces along edges
      for (const edge of edges) {
        const n1 = nodes.find((n) => n.id === edge.from);
        const n2 = nodes.find((n) => n.id === edge.to);

        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = (dist - springLength) * springStrength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== dragNodeRef.current) {
            n1.vx += fx;
            n1.vy += fy;
          }
          if (n2 !== dragNodeRef.current) {
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }
      }

      // 3. Apply velocities, drag constraints, and center gravity
      for (const n of nodes) {
        if (n === dragNodeRef.current) continue;

        // Center gravity
        n.vx += (centerX - n.x) * centerStrength;
        n.vy += (centerY - n.y) * centerStrength;

        n.vx *= damping;
        n.vy *= damping;

        n.x += n.vx;
        n.y += n.vy;
      }
    };

    const drawGraph = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply pan & zoom
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const nodes = simNodesRef.current;
      const edges = simEdgesRef.current;

      // 1. Draw Edges
      for (const edge of edges) {
        const n1 = nodes.find((n) => n.id === edge.from);
        const n2 = nodes.find((n) => n.id === edge.to);

        if (n1 && n2) {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = edge.type === "semantic" ? "var(--purple-muted, #7c3aed)" : "var(--border-strong, #333)";
          ctx.lineWidth = edge.type === "semantic" ? 2 : 1.5;
          ctx.setLineDash(edge.type === "tag" ? [4, 4] : []);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 2. Draw Nodes
      for (const n of nodes) {
        // Measure title text bounds to auto-fit borders
        ctx.font = "bold 12px var(--font-mono, monospace)";
        const textWidth = ctx.measureText(n.label).width;
        n.width = textWidth + 24;

        const x = n.x - n.width / 2;
        const y = n.y - n.height / 2;

        // Draw shadow (Neo-Brutalist offset shadow)
        ctx.fillStyle = "var(--border-strong, #333)";
        ctx.fillRect(x + 3, y + 3, n.width, n.height);

        // Draw node container
        ctx.fillStyle =
          n.type === "document"
            ? "var(--bg-soft, #f5f5f5)"
            : "var(--bg-card, #ffffff)";
        ctx.strokeStyle =
          n.type === "document"
            ? "var(--purple, #a78bfa)"
            : "var(--border-strong, #333)";
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, n.width, n.height);
        ctx.strokeRect(x, y, n.width, n.height);

        // Draw label text
        ctx.fillStyle = "var(--text-1, #111)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, n.x, n.y);

        // Draw small type indicator tag in corner
        if (n.type === "document") {
          ctx.fillStyle = "#a78bfa";
          ctx.font = "8px var(--font-mono, monospace)";
          ctx.textAlign = "left";
          ctx.fillText("PDF", x + 6, y + 8);
        }
      }

      ctx.restore();
    };

    const updateFrame = () => {
      runSimulationStep();
      drawGraph();
      animationId = requestAnimationFrame(updateFrame);
    };

    // Handle auto-resizing
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    animationId = requestAnimationFrame(updateFrame);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [pan, zoom]);

  // Translate click coordinates matching zoom/pan factors
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const nodes = simNodesRef.current;

    // Detect if we clicked on a node
    const hitNode = nodes.find((n) => {
      const halfW = n.width / 2;
      const halfH = n.height / 2;
      return (
        coords.x >= n.x - halfW &&
        coords.x <= n.x + halfW &&
        coords.y >= n.y - halfH &&
        coords.y <= n.y + halfH
      );
    });

    if (hitNode) {
      dragNodeRef.current = hitNode;
      dragOffsetRef.current = {
        x: hitNode.x - coords.x,
        y: hitNode.y - coords.y,
      };
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (dragNodeRef.current) {
      dragNodeRef.current.x = coords.x + dragOffsetRef.current.x;
      dragNodeRef.current.y = coords.y + dragOffsetRef.current.y;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
    } else if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragNodeRef.current) {
      // If we didn't drag the node far, trigger select action
      const velocity = Math.abs(dragNodeRef.current.vx) + Math.abs(dragNodeRef.current.vy);
      if (velocity < 1) {
        onNodeClick(dragNodeRef.current.id);
      }
    }
    dragNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    const nextZoom = Math.min(Math.max(zoom * factor, 0.4), 2.5);
    setZoom(nextZoom);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-background border-2 border-foreground"
         style={{ boxShadow: "3px 3px 0px 0px rgba(255,255,255,0.12)", borderRadius: 0 }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ display: "block", cursor: dragNodeRef.current ? "grabbing" : "grab" }}
      />
      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 flex gap-2 font-mono text-xs
                      bg-card text-foreground/60 px-3 py-1.5 border-2 border-foreground pointer-events-none"
           style={{ boxShadow: "2px 2px 0px 0px rgba(255,255,255,0.12)" }}>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span className="text-foreground/30">•</span>
        <span>Drag to pan / Hover edges</span>
      </div>
    </div>
  );
}
