import { SelectionArea } from '@/store/selectionStore';

export type PointType = 'corner' | 'smooth' | 'symmetric';

export interface PathPoint {
  id?: string;
  x: number;
  y: number;
  handleIn?: { x: number; y: number } | null;  // incoming control handle
  handleOut?: { x: number; y: number } | null; // outgoing control handle
  pointType?: PointType;
}

/**
 * Converts an array of PathPoint objects into a standard SVG cubic Bézier path `d` string.
 */
export function pathPointsToSvg(points: PathPoint[], closed: boolean): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const cp1 = prev.handleOut ?? { x: prev.x, y: prev.y };
    const cp2 = curr.handleIn ?? { x: curr.x, y: curr.y };

    if (!prev.handleOut && !curr.handleIn) {
      d += ` L ${curr.x} ${curr.y}`;
    } else {
      d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${curr.x} ${curr.y}`;
    }
  }

  if (closed && points.length > 1) {
    const last = points[points.length - 1];
    const first = points[0];

    const cp1 = last.handleOut ?? { x: last.x, y: last.y };
    const cp2 = first.handleIn ?? { x: first.x, y: first.y };

    if (!last.handleOut && !first.handleIn) {
      d += ` Z`;
    } else {
      d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${first.x} ${first.y} Z`;
    }
  }

  return d;
}

/**
 * Samples a cubic Bézier curve segment into discrete {x, y} points using the Bernstein polynomial.
 */
export function sampleCubicBezier(
  p0: { x: number; y: number },
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  p1: { x: number; y: number },
  steps = 16
): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p1.x;
    const y = mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p1.y;

    result.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }

  return result;
}

/**
 * Converts a sequence of PathPoints into a flat polygon array: [x0, y0, x1, y1, ...]
 */
export function pathPointsToPolygon(
  points: PathPoint[],
  closed: boolean,
  stepsPerSegment = 16
): number[] {
  if (!points || points.length < 2) return [];

  const polyCoords: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (!prev.handleOut && !curr.handleIn) {
      if (i === 1) polyCoords.push(prev.x, prev.y);
      polyCoords.push(curr.x, curr.y);
    } else {
      const cp1 = prev.handleOut ?? { x: prev.x, y: prev.y };
      const cp2 = curr.handleIn ?? { x: curr.x, y: curr.y };
      const sampled = sampleCubicBezier(prev, cp1, cp2, curr, stepsPerSegment);
      // Skip the first point if we already have it
      const startIdx = i === 1 ? 0 : 1;
      for (let s = startIdx; s < sampled.length; s++) {
        polyCoords.push(sampled[s].x, sampled[s].y);
      }
    }
  }

  if (closed && points.length > 2) {
    const last = points[points.length - 1];
    const first = points[0];
    if (!last.handleOut && !first.handleIn) {
      polyCoords.push(first.x, first.y);
    } else {
      const cp1 = last.handleOut ?? { x: last.x, y: last.y };
      const cp2 = first.handleIn ?? { x: first.x, y: first.y };
      const sampled = sampleCubicBezier(last, cp1, cp2, first, stepsPerSegment);
      for (let s = 1; s < sampled.length; s++) {
        polyCoords.push(sampled[s].x, sampled[s].y);
      }
    }
  }

  return polyCoords;
}

/**
 * Computes bounding box from points and their handles.
 */
export function computePathBounds(points: PathPoint[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const update = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  points.forEach((p) => {
    update(p.x, p.y);
    if (p.handleIn) update(p.handleIn.x, p.handleIn.y);
    if (p.handleOut) update(p.handleOut.x, p.handleOut.y);
  });

  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.max(1, Math.round(maxX - minX)),
    height: Math.max(1, Math.round(maxY - minY)),
  };
}

/**
 * Converts a Bézier path into a SelectionArea for the selection store.
 */
export function pathToSelection(
  points: PathPoint[],
  closed = true
): SelectionArea | null {
  if (!points || points.length < 2) return null;

  const polygonPoints = pathPointsToPolygon(points, closed, 20);
  if (polygonPoints.length < 4) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < polygonPoints.length; i += 2) {
    const px = polygonPoints[i];
    const py = polygonPoints[i + 1];
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.max(1, Math.round(maxX - minX)),
    height: Math.max(1, Math.round(maxY - minY)),
    shape: 'polygon',
    points: polygonPoints,
  };
}

/**
 * Converts a point between 'corner' and 'smooth' types.
 */
export function convertPointType(
  point: PathPoint,
  targetType: 'corner' | 'smooth',
  prevPoint?: PathPoint,
  nextPoint?: PathPoint
): PathPoint {
  if (targetType === 'corner') {
    return {
      ...point,
      pointType: 'corner',
      handleIn: null,
      handleOut: null,
    };
  }

  // Target is 'smooth'
  if (point.handleIn && point.handleOut) {
    // Make them collinear based on outgoing vector
    const dx = point.handleOut.x - point.x;
    const dy = point.handleOut.y - point.y;
    const outDist = Math.hypot(dx, dy) || 30;
    const inDist = Math.hypot(point.handleIn.x - point.x, point.handleIn.y - point.y) || outDist;

    const normX = dx / outDist;
    const normY = dy / outDist;

    return {
      ...point,
      pointType: 'smooth',
      handleOut: {
        x: Math.round(point.x + normX * outDist),
        y: Math.round(point.y + normY * outDist),
      },
      handleIn: {
        x: Math.round(point.x - normX * inDist),
        y: Math.round(point.y - normY * inDist),
      },
    };
  }

  // Calculate tangent from neighbors if available
  let tangentX = 1;
  let tangentY = 0;

  if (prevPoint && nextPoint) {
    const ndx = nextPoint.x - prevPoint.x;
    const ndy = nextPoint.y - prevPoint.y;
    const len = Math.hypot(ndx, ndy);
    if (len > 0) {
      tangentX = ndx / len;
      tangentY = ndy / len;
    }
  } else if (nextPoint) {
    const ndx = nextPoint.x - point.x;
    const ndy = nextPoint.y - point.y;
    const len = Math.hypot(ndx, ndy);
    if (len > 0) {
      tangentX = ndx / len;
      tangentY = ndy / len;
    }
  } else if (prevPoint) {
    const pdx = point.x - prevPoint.x;
    const pdy = point.y - prevPoint.y;
    const len = Math.hypot(pdx, pdy);
    if (len > 0) {
      tangentX = pdx / len;
      tangentY = pdy / len;
    }
  }

  const defaultHandleLen = 35;

  return {
    ...point,
    pointType: 'smooth',
    handleIn: {
      x: Math.round(point.x - tangentX * defaultHandleLen),
      y: Math.round(point.y - tangentY * defaultHandleLen),
    },
    handleOut: {
      x: Math.round(point.x + tangentX * defaultHandleLen),
      y: Math.round(point.y + tangentY * defaultHandleLen),
    },
  };
}

/**
 * Updates a handle's position while preserving smooth collinearity if applicable.
 */
export function updateHandle(
  point: PathPoint,
  handleType: 'in' | 'out',
  newPos: { x: number; y: number },
  lockCollinear = true
): PathPoint {
  const isSmooth = point.pointType === 'smooth' || point.pointType === 'symmetric';

  if (handleType === 'out') {
    const dx = newPos.x - point.x;
    const dy = newPos.y - point.y;
    const outDist = Math.hypot(dx, dy);

    if (isSmooth && lockCollinear && outDist > 0) {
      const inDist = point.handleIn
        ? Math.hypot(point.handleIn.x - point.x, point.handleIn.y - point.y)
        : outDist;
      const actualInDist = point.pointType === 'symmetric' ? outDist : inDist;

      const normX = dx / outDist;
      const normY = dy / outDist;

      return {
        ...point,
        handleOut: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
        handleIn: {
          x: Math.round(point.x - normX * actualInDist),
          y: Math.round(point.y - normY * actualInDist),
        },
      };
    }

    return {
      ...point,
      handleOut: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
    };
  }

  // handleType === 'in'
  const dx = newPos.x - point.x;
  const dy = newPos.y - point.y;
  const inDist = Math.hypot(dx, dy);

  if (isSmooth && lockCollinear && inDist > 0) {
    const outDist = point.handleOut
      ? Math.hypot(point.handleOut.x - point.x, point.handleOut.y - point.y)
      : inDist;
    const actualOutDist = point.pointType === 'symmetric' ? inDist : outDist;

    const normX = dx / inDist;
    const normY = dy / inDist;

    return {
      ...point,
      handleIn: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
      handleOut: {
        x: Math.round(point.x - normX * actualOutDist),
        y: Math.round(point.y - normY * actualOutDist),
      },
    };
  }

  return {
    ...point,
    handleIn: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
  };
}

/**
 * Hit test for an anchor point within a threshold distance.
 */
export function hitTestAnchor(
  points: PathPoint[],
  x: number,
  y: number,
  threshold = 8
): number {
  for (let i = 0; i < points.length; i++) {
    const dist = Math.hypot(points[i].x - x, points[i].y - y);
    if (dist <= threshold) {
      return i;
    }
  }
  return -1;
}

/**
 * Hit test for handles of a specific anchor point.
 */
export function hitTestHandle(
  point: PathPoint,
  x: number,
  y: number,
  threshold = 8
): 'in' | 'out' | null {
  if (point.handleOut) {
    if (Math.hypot(point.handleOut.x - x, point.handleOut.y - y) <= threshold) {
      return 'out';
    }
  }
  if (point.handleIn) {
    if (Math.hypot(point.handleIn.x - x, point.handleIn.y - y) <= threshold) {
      return 'in';
    }
  }
  return null;
}
