import { Layer } from '@/types/layer';
import { SmartGuide, Guide } from '@/store/viewStore';

/**
 * Configuration for the snapping engine.
 */
export interface SnapConfig {
  snapEnabled: boolean;
  snapThreshold: number; // in pixels
  snapToGuides: boolean;
  snapToLayers: boolean;
  snapToDocumentBounds: boolean;
  snapToGrid: boolean;
  gridSize?: number;
}

/**
 * Result of a snap computation.
 */
export interface SnapResult {
  snappedX: number;     // adjusted X (or original if no snap)
  snappedY: number;     // adjusted Y (or original if no snap)
  guides: SmartGuide[]; // alignment lines to display
}

/**
 * Key coordinates for snapping a layer.
 */
export interface LayerSnapPoints {
  left: number;
  right: number;
  centerX: number;
  top: number;
  bottom: number;
  centerY: number;
}

/**
 * Calculates all snap points (edges and center) for a given bounding box.
 *
 * @param layer An object with x, y, width, and height.
 * @returns LayerSnapPoints with left, right, top, bottom, and centers.
 */
export function getLayerSnapPoints(layer: { x: number; y: number; width: number; height: number }): LayerSnapPoints {
  return {
    left: layer.x,
    right: layer.x + layer.width,
    centerX: layer.x + layer.width / 2,
    top: layer.y,
    bottom: layer.y + layer.height,
    centerY: layer.y + layer.height / 2,
  };
}

/**
 * Computes the optimal snap position for a moving layer against the document, other layers, guides, and grid.
 *
 * @param movingBounds The bounds of the layer currently being moved.
 * @param otherLayers An array of other layers in the document to snap against.
 * @param docBounds The dimensions of the document/canvas.
 * @param guides Manual user-created guides.
 * @param config Snapping settings and thresholds.
 * @returns A SnapResult containing the snapped coordinates and any resulting smart guides.
 */
export function computeSnap(
  movingBounds: { x: number; y: number; width: number; height: number },
  otherLayers: Array<{ x: number; y: number; width: number; height: number; visible: boolean; locked: boolean }>,
  docBounds: { width: number; height: number },
  guides: Guide[],
  config: SnapConfig
): SnapResult {
  if (!config.snapEnabled) {
    return { snappedX: movingBounds.x, snappedY: movingBounds.y, guides: [] };
  }

  const { snapThreshold } = config;
  const movingSnap = getLayerSnapPoints(movingBounds);

  type Candidate = { position: number; type: 'edge' | 'center' };
  const xCandidates: Candidate[] = [];
  const yCandidates: Candidate[] = [];

  // Document bounds candidates
  if (config.snapToDocumentBounds) {
    xCandidates.push({ position: 0, type: 'edge' });
    xCandidates.push({ position: docBounds.width / 2, type: 'center' });
    xCandidates.push({ position: docBounds.width, type: 'edge' });

    yCandidates.push({ position: 0, type: 'edge' });
    yCandidates.push({ position: docBounds.height / 2, type: 'center' });
    yCandidates.push({ position: docBounds.height, type: 'edge' });
  }

  // Other layers candidates
  if (config.snapToLayers) {
    for (const layer of otherLayers) {
      if (!layer.visible) continue;
      const pts = getLayerSnapPoints(layer);
      xCandidates.push({ position: pts.left, type: 'edge' });
      xCandidates.push({ position: pts.centerX, type: 'center' });
      xCandidates.push({ position: pts.right, type: 'edge' });

      yCandidates.push({ position: pts.top, type: 'edge' });
      yCandidates.push({ position: pts.centerY, type: 'center' });
      yCandidates.push({ position: pts.bottom, type: 'edge' });
    }
  }

  // Manual guides candidates
  if (config.snapToGuides) {
    for (const g of guides) {
      if (g.orientation === 'vertical') {
        xCandidates.push({ position: g.position, type: 'edge' });
      } else if (g.orientation === 'horizontal') {
        yCandidates.push({ position: g.position, type: 'edge' });
      }
    }
  }

  // Grid candidates
  if (config.snapToGrid && config.gridSize && config.gridSize > 0) {
    const { gridSize } = config;
    const gridCandidatesX = [
      Math.round(movingSnap.left / gridSize) * gridSize,
      Math.round(movingSnap.centerX / gridSize) * gridSize,
      Math.round(movingSnap.right / gridSize) * gridSize,
    ];
    for (const gx of gridCandidatesX) {
      xCandidates.push({ position: gx, type: 'edge' });
    }

    const gridCandidatesY = [
      Math.round(movingSnap.top / gridSize) * gridSize,
      Math.round(movingSnap.centerY / gridSize) * gridSize,
      Math.round(movingSnap.bottom / gridSize) * gridSize,
    ];
    for (const gy of gridCandidatesY) {
      yCandidates.push({ position: gy, type: 'edge' });
    }
  }

  const smartGuides: SmartGuide[] = [];

  // Helper to find the best snap on an axis
  function findBestSnap(
    candidates: Candidate[],
    movingPoints: Array<{ source: number; offset: number }>,
    threshold: number
  ) {
    let bestSnap: { position: number; offset: number; type: 'edge' | 'center' } | null = null;
    let minDiff = threshold;

    for (const cand of candidates) {
      for (const pt of movingPoints) {
        const diff = Math.abs(cand.position - pt.source);
        if (diff < minDiff) {
          minDiff = diff;
          bestSnap = { position: cand.position, offset: pt.offset, type: cand.type };
        }
      }
    }
    return bestSnap;
  }

  // X Axis Snapping
  const xPoints = [
    { source: movingSnap.left, offset: 0 },
    { source: movingSnap.centerX, offset: movingBounds.width / 2 },
    { source: movingSnap.right, offset: movingBounds.width }
  ];

  const bestXSnap = findBestSnap(xCandidates, xPoints, snapThreshold);
  let finalX = movingBounds.x;
  
  if (bestXSnap) {
    finalX = bestXSnap.position - bestXSnap.offset;
    smartGuides.push({
      orientation: 'vertical',
      position: bestXSnap.position,
      type: bestXSnap.type
    });
  }

  // Y Axis Snapping
  const yPoints = [
    { source: movingSnap.top, offset: 0 },
    { source: movingSnap.centerY, offset: movingBounds.height / 2 },
    { source: movingSnap.bottom, offset: movingBounds.height }
  ];

  const bestYSnap = findBestSnap(yCandidates, yPoints, snapThreshold);
  let finalY = movingBounds.y;

  if (bestYSnap) {
    finalY = bestYSnap.position - bestYSnap.offset;
    smartGuides.push({
      orientation: 'horizontal',
      position: bestYSnap.position,
      type: bestYSnap.type
    });
  }

  return {
    snappedX: finalX,
    snappedY: finalY,
    guides: smartGuides
  };
}
