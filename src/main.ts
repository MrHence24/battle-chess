import * as THREE from 'three';
import { Chess, type PieceSymbol, type Square, type Move } from 'chess.js';
import './style.css';

const chess = new Chess();
const sceneRoot = document.querySelector<HTMLDivElement>('#scene')!;
const statusEl = document.querySelector<HTMLSpanElement>('#status')!;
const turnTitle = document.querySelector<HTMLHeadingElement>('#turn-title')!;
const instruction = document.querySelector<HTMLParagraphElement>('#instruction')!;
const historyEl = document.querySelector<HTMLOListElement>('#history')!;
const undoButton = document.querySelector<HTMLButtonElement>('#undo')!;
const promotionModal = document.querySelector<HTMLDivElement>('#promotion')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#10131a');
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 8.5, 10.5);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
sceneRoot.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc8d5eb, 0x25202a, 2.0));
const keyLight = new THREE.DirectionalLight(0xffe4c2, 3.2);
keyLight.position.set(-4, 9, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8daeff, 1.1);
fillLight.position.set(5, 5, -4);
scene.add(fillLight);

const boardGroup = new THREE.Group();
scene.add(boardGroup);
const pieceGroup = new THREE.Group();
scene.add(pieceGroup);
const markerGroup = new THREE.Group();
scene.add(markerGroup);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const squareMeshes: THREE.Mesh[] = [];
const pieceMeshes = new Map<string, THREE.Group>();
let selectedSquare: Square | null = null;
let pendingPromotion: { from: Square; to: Square } | null = null;
let legalTargets: Square[] = [];

const boardMaterial = [
  new THREE.MeshStandardMaterial({ color: '#d9c8a8', roughness: 0.82 }),
  new THREE.MeshStandardMaterial({ color: '#665443', roughness: 0.82 }),
];
const pieceMaterials = {
  w: new THREE.MeshStandardMaterial({ color: '#e8e2d5', metalness: 0.18, roughness: 0.36 }),
  b: new THREE.MeshStandardMaterial({ color: '#252a35', metalness: 0.48, roughness: 0.3 }),
};
const accentMaterials = {
  w: new THREE.MeshStandardMaterial({ color: '#b99b6a', metalness: 0.62, roughness: 0.27 }),
  b: new THREE.MeshStandardMaterial({ color: '#9b6b45', metalness: 0.62, roughness: 0.27 }),
};

function squarePosition(square: Square): THREE.Vector3 {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return new THREE.Vector3(file - 3.5, 0, 3.5 - rank);
}

function createBoard(): void {
  const base = new THREE.Mesh(new THREE.BoxGeometry(8.28, 0.28, 8.28), new THREE.MeshStandardMaterial({ color: '#292b31', metalness: 0.32, roughness: 0.55 }));
  base.position.y = -0.2;
  base.receiveShadow = true;
  boardGroup.add(base);
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.08, 0.99), boardMaterial[(rank + file) % 2]);
      square.position.set(file - 3.5, -0.025, rank - 3.5);
      square.receiveShadow = true;
      square.userData.square = `${String.fromCharCode(97 + file)}${8 - rank}` as Square;
      boardGroup.add(square);
      squareMeshes.push(square);
    }
  }
}

function addCylinder(parent: THREE.Group, radiusTop: number, radiusBottom: number, height: number, y: number, material: THREE.Material, segments = 20): void {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function createPlaceholderPiece(type: PieceSymbol, color: 'w' | 'b'): THREE.Group {
  const group = new THREE.Group();
  const body = pieceMaterials[color];
  const trim = accentMaterials[color];
  addCylinder(group, 0.27, 0.32, 0.12, 0.08, trim);
  addCylinder(group, 0.2, 0.25, 0.2, 0.23, body);
  if (type === 'p') {
    addCylinder(group, 0.12, 0.18, 0.34, 0.48, body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), trim);
    head.position.y = 0.74;
    head.castShadow = true;
    group.add(head);
  } else if (type === 'r') {
    addCylinder(group, 0.22, 0.2, 0.56, 0.58, body);
    addCylinder(group, 0.28, 0.24, 0.14, 0.93, trim);
  } else if (type === 'n') {
    addCylinder(group, 0.13, 0.2, 0.42, 0.52, body);
    const neck = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 5), body);
    neck.position.set(0.02, 0.88, -0.03);
    neck.rotation.z = -0.23;
    neck.castShadow = true;
    group.add(neck);
  } else if (type === 'b') {
    addCylinder(group, 0.12, 0.2, 0.52, 0.57, body);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), trim);
    top.position.y = 0.9;
    top.castShadow = true;
    group.add(top);
  } else if (type === 'q') {
    addCylinder(group, 0.12, 0.2, 0.57, 0.59, body);
    addCylinder(group, 0.25, 0.14, 0.1, 0.94, trim);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), trim);
    crown.position.y = 1.08;
    crown.castShadow = true;
    group.add(crown);
  } else {
    addCylinder(group, 0.14, 0.2, 0.65, 0.62, body);
    addCylinder(group, 0.24, 0.14, 0.12, 1.0, trim);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), trim);
    orb.position.y = 1.16;
    orb.castShadow = true;
    group.add(orb);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.09), trim);
    cross.position.y = 1.4;
    cross.castShadow = true;
    group.add(cross);
  }
  group.userData.piece = { type, color };
  return group;
}

function clearGroup(group: THREE.Group): void {
  while (group.children.length) {
    const child = group.children.pop()!;
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
    }
  }
}

function renderPieces(): void {
  clearGroup(pieceGroup);
  pieceMeshes.clear();
  const board = chess.board();
  for (let row = 0; row < 8; row += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = board[row][file];
      if (!piece) continue;
      const square = `${String.fromCharCode(97 + file)}${8 - row}` as Square;
      const model = createPlaceholderPiece(piece.type, piece.color);
      model.position.copy(squarePosition(square));
      pieceGroup.add(model);
      pieceMeshes.set(square, model);
    }
  }
}

function makeMarker(square: Square, color: string, opacity: number, scale: number): void {
  const marker = new THREE.Mesh(
    new THREE.CircleGeometry(scale, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.copy(squarePosition(square));
  marker.position.y = 0.035;
  markerGroup.add(marker);
}

function renderMarkers(): void {
  clearGroup(markerGroup);
  if (selectedSquare) makeMarker(selectedSquare, '#e4bd58', 0.62, 0.42);
  for (const target of legalTargets) {
    const occupied = chess.get(target);
    makeMarker(target, occupied ? '#c94e42' : '#5fba8b', occupied ? 0.55 : 0.48, occupied ? 0.43 : 0.15);
  }
}

function currentStatus(): string {
  if (chess.isCheckmate()) return `Checkmate — ${chess.turn() === 'w' ? 'Black' : 'White'} wins`;
  if (chess.isStalemate()) return 'Draw — stalemate';
  if (chess.isDraw()) return 'Draw';
  return `${chess.turn() === 'w' ? 'White' : 'Black'} to move${chess.isCheck() ? ' · Check' : ''}`;
}

function updateUI(): void {
  const label = currentStatus();
  statusEl.textContent = label;
  turnTitle.textContent = label;
  instruction.textContent = chess.isGameOver()
    ? 'The game is over. Restart to begin a new game.'
    : selectedSquare
      ? `Selected ${selectedSquare.toUpperCase()}. Choose a highlighted destination.`
      : 'Select one of your pieces, then select a highlighted square.';
  undoButton.disabled = chess.history().length === 0;
  const history = chess.history();
  historyEl.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('li');
    empty.className = 'muted';
    empty.textContent = 'No moves yet';
    historyEl.append(empty);
  } else {
    for (let i = 0; i < history.length; i += 2) {
      const item = document.createElement('li');
      item.textContent = `${Math.floor(i / 2) + 1}. ${history[i]}${history[i + 1] ? `   ${history[i + 1]}` : ''}`;
      historyEl.append(item);
    }
  }
}

function refresh(): void {
  renderPieces();
  renderMarkers();
  updateUI();
}

function selectSquare(square: Square): void {
  selectedSquare = square;
  legalTargets = chess.moves({ square, verbose: true }).map((move: Move) => move.to);
  refresh();
}

function completeMove(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): void {
  try {
    chess.move({ from, to, ...(promotion ? { promotion } : {}) });
    selectedSquare = null;
    legalTargets = [];
    pendingPromotion = null;
    promotionModal.classList.add('hidden');
    refresh();
  } catch {
    instruction.textContent = 'That move is not legal. Select a highlighted destination.';
  }
}

function handleSquare(square: Square): void {
  if (chess.isGameOver() || pendingPromotion) return;
  const piece = chess.get(square);
  if (selectedSquare) {
    const moves = chess.moves({ square: selectedSquare, verbose: true }).filter((move: Move) => move.to === square);
    if (moves.length) {
      const isPromotion = moves.some((move: Move) => move.promotion);
      if (isPromotion) {
        pendingPromotion = { from: selectedSquare, to: square };
        promotionModal.classList.remove('hidden');
        return;
      }
      completeMove(selectedSquare, square);
      return;
    }
  }
  if (piece && piece.color === chess.turn()) {
    selectSquare(square);
  } else {
    selectedSquare = null;
    legalTargets = [];
    refresh();
  }
}

function onPointerDown(event: PointerEvent): void {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(squareMeshes, false);
  if (hits.length) handleSquare(hits[0].object.userData.square as Square);
}

function resize(): void {
  const width = sceneRoot.clientWidth;
  const height = sceneRoot.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

createBoard();
renderPieces();
refresh();
renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('resize', resize);
resize();

document.querySelector<HTMLButtonElement>('#restart')!.addEventListener('click', () => {
  chess.reset(); selectedSquare = null; legalTargets = []; pendingPromotion = null;
  promotionModal.classList.add('hidden'); refresh();
});
undoButton.addEventListener('click', () => {
  chess.undo(); selectedSquare = null; legalTargets = []; refresh();
});
promotionModal.querySelectorAll<HTMLButtonElement>('[data-piece]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!pendingPromotion) return;
    completeMove(pendingPromotion.from, pendingPromotion.to, button.dataset.piece as 'q' | 'r' | 'b' | 'n');
  });
});

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
