import { BoundingBox, DetectionResult, Point, TrackedObject } from "../types";

// --- Geometry Helpers ---

// Check if a point is inside a polygon (Ray Casting algorithm)
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Calculate center of a bounding box
export const getBoxCenter = (box: BoundingBox): Point => {
  return {
    x: (box.xmin + box.xmax) / 2,
    y: (box.ymin + box.ymax) / 2,
  };
};

// Calculate Euclidean distance between two points
const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// Calculate IoU (Intersection over Union) - simplified for distance heuristic here
// We'll use distance-based matching for simplicity in this frontend demo
// as IoU requires strict pixel overlap which might jump too much with API latency.

// --- Tracking Logic (Client-Side "Deep SORT" Simulation) ---

let nextId = 1;
const MAX_TRAJECTORY_LENGTH = 30; // "last 30 frames" as requested
const MAX_DROPOUT_FRAMES = 5; // How many frames an object can be missing before ID is dropped
const MATCH_THRESHOLD = 150; // Distance threshold (0-1000 scale)

export const updateTracks = (
  currentTracks: TrackedObject[],
  detections: DetectionResult[],
  timestamp: number
): { updatedTracks: TrackedObject[], entered: number, exited: number } => {
  
  const updatedTracks: TrackedObject[] = [];
  const unmatchedDetections = [...detections];
  let entered = 0;
  let exited = 0;

  // 1. Prediction Step (simplified): Assume objects stay in place or move linearly
  // We skip strict Kalman filter for this lightweight frontend demo.

  // 2. Matching Step
  // Try to match existing tracks to new detections based on distance
  for (const track of currentTracks) {
    let bestMatchIndex = -1;
    let minDistance = Infinity;
    const trackCenter = getBoxCenter(track.box);

    unmatchedDetections.forEach((detection, index) => {
      // Convert detection array [ymin, xmin, ymax, xmax] to BoundingBox
      const detBox: BoundingBox = {
        ymin: detection.box_2d[0],
        xmin: detection.box_2d[1],
        ymax: detection.box_2d[2],
        xmax: detection.box_2d[3],
      };
      const detCenter = getBoxCenter(detBox);
      const distance = getDistance(trackCenter, detCenter);

      if (distance < MATCH_THRESHOLD && distance < minDistance && detection.label === track.label) {
        minDistance = distance;
        bestMatchIndex = index;
      }
    });

    if (bestMatchIndex !== -1) {
      // Match found: Update track
      const match = unmatchedDetections[bestMatchIndex];
      const newBox: BoundingBox = {
        ymin: match.box_2d[0],
        xmin: match.box_2d[1],
        ymax: match.box_2d[2],
        xmax: match.box_2d[3],
      };
      const newCenter = getBoxCenter(newBox);
      
      const newTrajectory = [...track.trajectory, newCenter];
      if (newTrajectory.length > MAX_TRAJECTORY_LENGTH) {
        newTrajectory.shift();
      }

      updatedTracks.push({
        ...track,
        box: newBox,
        trajectory: newTrajectory,
        lastSeen: timestamp,
      });

      // Remove from unmatched
      unmatchedDetections.splice(bestMatchIndex, 1);
    } else {
      // No match found: Keep track if it hasn't disappeared for too long
      // Note: In a real system we would predict position. Here we assume static.
      if (timestamp - track.lastSeen < MAX_DROPOUT_FRAMES * 1000) { // arbitrary time unit, using simplified frame logic
         updatedTracks.push(track);
      }
    }
  }

  // 3. New Tracks
  // Create new tracks for unmatched detections
  for (const detection of unmatchedDetections) {
     const newBox: BoundingBox = {
        ymin: detection.box_2d[0],
        xmin: detection.box_2d[1],
        ymax: detection.box_2d[2],
        xmax: detection.box_2d[3],
      };
      const newCenter = getBoxCenter(newBox);
      
      updatedTracks.push({
        id: nextId++,
        label: detection.label,
        box: newBox,
        trajectory: [newCenter],
        color: getRandomColor(),
        lastSeen: timestamp,
      });
  }

  return { updatedTracks, entered, exited }; // Logic for entered/exited is handled in the component loop to access previous state ROI
};

export const getRandomColor = () => {
  const colors = ['#00f3ff', '#00ff9d', '#ff0055', '#ffcc00', '#bd00ff', '#ffffff'];
  return colors[Math.floor(Math.random() * colors.length)];
};