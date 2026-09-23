/**
 * Calculates the Euclidean distance between two RGB colors.
 *
 * @param r1 - Red component of the first color (0-255)
 * @param g1 - Green component of the first color (0-255)
 * @param b1 - Blue component of the first color (0-255)
 * @param r2 - Red component of the second color (0-255)
 * @param g2 - Green component of the second color (0-255)
 * @param b2 - Blue component of the second color (0-255)
 * @returns The Euclidean distance
 */
export function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Performs a flood-fill or global color selection based on a starting pixel.
 *
 * @param imageData - The image data to select from
 * @param startX - The X coordinate of the starting pixel
 * @param startY - The Y coordinate of the starting pixel
 * @param tolerance - The maximum color distance to be considered a match
 * @param contiguous - If true, selects only connected pixels. If false, selects all matching pixels in the image.
 * @returns A binary mask of the same dimensions where 1 indicates selected and 0 indicates not selected
 */
export function floodFillSelect(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number,
  contiguous: boolean
): Uint8Array {
  const width = imageData.width;
  const height = imageData.height;
  const mask = new Uint8Array(width * height);
  
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return mask;
  }

  const data = imageData.data;
  const startIndex = (startY * width + startX) * 4;
  const refR = data[startIndex];
  const refG = data[startIndex + 1];
  const refB = data[startIndex + 2];

  if (!contiguous) {
    // Scan all pixels
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const dist = colorDistance(refR, refG, refB, data[idx], data[idx + 1], data[idx + 2]);
      if (dist <= tolerance) {
        mask[i] = 1;
      }
    }
    return mask;
  }

  // Contiguous: BFS flood fill
  const queue: number[] = [startX, startY];
  const visited = new Uint8Array(width * height);
  visited[startY * width + startX] = 1;

  // Directions: Right, Bottom, Left, Top
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    
    mask[y * width + x] = 1;

    for (let i = 0; i < 4; i++) {
      const nx = x + dx[i];
      const ny = y + dy[i];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        if (visited[nIndex] === 0) {
          visited[nIndex] = 1;
          const pxIdx = nIndex * 4;
          const dist = colorDistance(refR, refG, refB, data[pxIdx], data[pxIdx + 1], data[pxIdx + 2]);
          
          if (dist <= tolerance) {
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  return mask;
}

/**
 * Calculates the bounding box of a binary mask.
 *
 * @param mask - The binary mask (1 for selected, 0 for unselected)
 * @param width - The width of the mask
 * @param height - The height of the mask
 * @returns The bounding box {x, y, width, height} or null if no pixels are selected
 */
export function maskToBoundingBox(mask: Uint8Array, width: number, height: number): { x: number; y: number; width: number; height: number } | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let hasPixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Calculates the perpendicular distance from a point to a line segment.
 */
function perpendicularDistance(pt: { x: number, y: number }, lineStart: { x: number, y: number }, lineEnd: { x: number, y: number }): number {
  let dx = lineEnd.x - lineStart.x;
  let dy = lineEnd.y - lineStart.y;

  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  } else {
    // lineStart and lineEnd are the same point
    const px = pt.x - lineStart.x;
    const py = pt.y - lineStart.y;
    return Math.sqrt(px * px + py * py);
  }

  const pvx = pt.x - lineStart.x;
  const pvy = pt.y - lineStart.y;

  const pvdot = dx * pvx + dy * pvy;

  const ax = pvx - pvdot * dx;
  const ay = pvy - pvdot * dy;

  return Math.sqrt(ax * ax + ay * ay);
}

/**
 * Simplifies a polygon using the Douglas-Peucker algorithm.
 *
 * @param points - A flat array of coordinates [x0, y0, x1, y1, ...]
 * @param epsilon - The tolerance for simplification
 * @returns A simplified flat array of coordinates
 */
export function simplifyPolygon(points: number[], epsilon: number): number[] {
  if (points.length <= 4) return points; // Need at least 3 points to simplify effectively

  const pts: { x: number, y: number }[] = [];
  for (let i = 0; i < points.length; i += 2) {
    pts.push({ x: points[i], y: points[i + 1] });
  }

  let dmax = 0;
  let index = 0;
  const end = pts.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(pts[i], pts[0], pts[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  let resultPts: { x: number, y: number }[] = [];
  
  if (dmax > epsilon) {
    const recResults1 = simplifyPolygon(
      pts.slice(0, index + 1).flatMap(p => [p.x, p.y]), 
      epsilon
    );
    const recResults2 = simplifyPolygon(
      pts.slice(index).flatMap(p => [p.x, p.y]), 
      epsilon
    );

    resultPts = [
      ...recResults1.slice(0, -2).reduce((acc: {x:number, y:number}[], val: number, i: number, arr: number[]) => {
        if (i % 2 === 0) acc.push({ x: val, y: arr[i + 1] });
        return acc;
      }, []),
      ...recResults2.reduce((acc: {x:number, y:number}[], val: number, i: number, arr: number[]) => {
        if (i % 2 === 0) acc.push({ x: val, y: arr[i + 1] });
        return acc;
      }, [])
    ];
  } else {
    resultPts = [pts[0], pts[end]];
  }

  return resultPts.flatMap(p => [p.x, p.y]);
}

/**
 * Converts a binary mask to a simplified polygon outline.
 * Traces the boundary of the selected region.
 *
 * @param mask - The binary mask (1 for selected, 0 for unselected)
 * @param width - The width of the mask
 * @param height - The height of the mask
 * @returns A flat array of coordinates forming the closed polygon [x0, y0, x1, y1, ...]
 */
export function maskToPolygon(mask: Uint8Array, width: number, height: number): number[] {
  let startX = -1;
  let startY = -1;
  
  // Find a starting point (first pixel of the mask)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) return [];

  const boundary: {x: number, y: number}[] = [];
  
  // Moore neighborhood boundary tracing
  const dirX = [0, 1, 1, 1, 0, -1, -1, -1];
  const dirY = [-1, -1, 0, 1, 1, 1, 0, -1];
  
  let currX = startX;
  let currY = startY;
  let backDir = 6; // Coming from the left by default for the first point found scanning left to right
  
  let pointsAdded = 0;
  
  do {
    boundary.push({x: currX, y: currY});
    pointsAdded++;
    
    let nextDir = (backDir + 2) % 8; 
    let found = false;
    
    for (let i = 0; i < 8; i++) {
      const checkDir = (nextDir + i) % 8;
      const nx = currX + dirX[checkDir];
      const ny = currY + dirY[checkDir];
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx] === 1) {
        currX = nx;
        currY = ny;
        backDir = (checkDir + 4) % 8;
        found = true;
        break;
      }
    }
    
    if (!found) break; 
    if (pointsAdded > width * height * 4) break; // Safety net
    
  } while (currX !== startX || currY !== startY);
  
  // Close the loop
  if (boundary.length > 0 && (boundary[0].x !== boundary[boundary.length - 1].x || boundary[0].y !== boundary[boundary.length - 1].y)) {
    boundary.push(boundary[0]);
  }

  const flatPoints = boundary.flatMap(p => [p.x, p.y]);
  return simplifyPolygon(flatPoints, 2.0);
}
