import * as THREE from "three";
import { RoomEnvironment } from "https://unpkg.com/three@0.161.0/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";

const ROLE_COLORS = {
  AGENT: 0x3f9dff,
  LEAGUE_OFFICE: 0xf3b34f,
  OWNER: 0x46d69c,
  NONE: 0x9ab2c7,
};

const ZONE_META = {
  CAP_LAB: { label: "Cap Lab", position: [-7.2, 0.3, -3.8], role: "AGENT", icon: "hex" },
  CONTRACT_ROW: {
    label: "Contract Row",
    position: [-4.2, 0.3, 1.9],
    role: "AGENT",
    icon: "diamond",
  },
  MEDIA_PLAZA: {
    label: "Media Plaza",
    position: [0, 0.3, -2.8],
    role: "LEAGUE_OFFICE",
    icon: "ring",
  },
  TRADE_FLOOR: { label: "Trade Floor", position: [4.8, 0.3, -3.6], role: "AGENT", icon: "arrow" },
  TEAM_FACILITY: {
    label: "Team Facility",
    position: [7.2, 0.3, 1.9],
    role: "AGENT",
    icon: "tower",
  },
  LEAGUE_OFFICE_FLOOR: {
    label: "League Office",
    position: [-1.2, 4.7, 5.6],
    role: "LEAGUE_OFFICE",
    icon: "ring",
  },
  OWNER_SUITE_FLOOR: {
    label: "Owner Suite",
    position: [2.8, 7.9, 5.6],
    role: "OWNER",
    icon: "crown",
  },
  BOARDROOM_FLOOR: {
    label: "Boardroom",
    position: [0.8, 10.9, 5.6],
    role: "OWNER",
    icon: "crown",
  },
};

const ROUTES = {
  AGENT: ["CAP_LAB", "CONTRACT_ROW", "TEAM_FACILITY", "TRADE_FLOOR"],
  LEAGUE_OFFICE: ["MEDIA_PLAZA", "LEAGUE_OFFICE_FLOOR"],
  OWNER: ["OWNER_SUITE_FLOOR", "BOARDROOM_FLOOR"],
};

const EXTERIOR_BUILDING_ZONES = new Set([
  "CAP_LAB",
  "CONTRACT_ROW",
  "MEDIA_PLAZA",
  "TRADE_FLOOR",
  "TEAM_FACILITY",
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function createLabelSprite(text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 110;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const color = `#${colorHex.toString(16).padStart(6, "0")}`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(9, 24, 38, 0.78)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  const x = 12;
  const y = 12;
  const w = canvas.width - 24;
  const h = canvas.height - 24;
  const radius = 18;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = "700 34px Trebuchet MS";
  ctx.fillStyle = "#f3fbff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.2, 1.02, 1);
  return sprite;
}

function createWindowTexture(seed = 1) {
  const width = 64;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  let state = seed >>> 0;
  function rand() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  }

  ctx.fillStyle = "#0f1c2b";
  ctx.fillRect(0, 0, width, height);

  const cellW = 8;
  const cellH = 10;
  for (let y = 0; y < height; y += cellH) {
    for (let x = 0; x < width; x += cellW) {
      const lit = rand() > 0.42;
      const hue = 195 + Math.floor(rand() * 20);
      const sat = 40 + Math.floor(rand() * 24);
      const light = 45 + Math.floor(rand() * 22);
      ctx.fillStyle = lit ? `hsl(${hue}, ${sat}%, ${light}%)` : "rgba(8,16,24,0.82)";
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createProceduralTexture(size, drawFn) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  drawFn(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createStoneTileTexture(seed = 1) {
  let state = seed >>> 0;
  function rand() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  }
  return createProceduralTexture(256, (ctx, size) => {
    ctx.fillStyle = "#c9d0d8";
    ctx.fillRect(0, 0, size, size);
    const tile = 32;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const shade = 188 + Math.floor(rand() * 26);
        ctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 10})`;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
    ctx.strokeStyle = "rgba(120,136,152,0.32)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i += tile) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    for (let i = 0; i < 2800; i += 1) {
      const alpha = rand() * 0.09;
      const s = Math.floor(rand() * 255);
      ctx.fillStyle = `rgba(${s},${s},${s},${alpha})`;
      ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 1, 1);
    }
  });
}

function createWallPlasterTexture(seed = 2) {
  let state = seed >>> 0;
  function rand() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  }
  return createProceduralTexture(256, (ctx, size) => {
    ctx.fillStyle = "#cfd6de";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i += 1) {
      const alpha = 0.03 + rand() * 0.06;
      const tone = 184 + Math.floor(rand() * 28);
      ctx.fillStyle = `rgba(${tone},${tone},${tone + 4},${alpha})`;
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      const r = 1 + Math.floor(rand() * 3);
      ctx.fillRect(x, y, r, r);
    }
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, size, size / 3);
  });
}

function createWoodTexture(seed = 3) {
  let state = seed >>> 0;
  function rand() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  }
  return createProceduralTexture(256, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, "#5f432c");
    grad.addColorStop(0.5, "#765339");
    grad.addColorStop(1, "#5d422d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 2) {
      const wave = Math.sin(y * 0.045 + rand() * 4) * 8;
      const alpha = 0.08 + rand() * 0.08;
      ctx.strokeStyle = `rgba(35,20,10,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y + wave * 0.08);
      ctx.bezierCurveTo(size * 0.25, y + wave * 0.3, size * 0.75, y - wave * 0.25, size, y);
      ctx.stroke();
    }

    for (let i = 0; i < 14; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = 8 + rand() * 18;
      const ry = 4 + rand() * 12;
      ctx.strokeStyle = `rgba(45,26,16,${0.18 + rand() * 0.16})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function createCarpetTexture(seed = 4) {
  let state = seed >>> 0;
  function rand() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  }
  return createProceduralTexture(256, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#304355");
    grad.addColorStop(1, "#1e2c3b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(145,176,206,0.2)";
    ctx.lineWidth = 2;
    for (let x = -size; x < size * 2; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - size, size);
      ctx.stroke();
    }

    for (let i = 0; i < 5500; i += 1) {
      const tone = 95 + Math.floor(rand() * 80);
      const alpha = 0.02 + rand() * 0.1;
      ctx.fillStyle = `rgba(${tone},${tone + 8},${tone + 15},${alpha})`;
      ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 1, 1);
    }
  });
}

function createIcon(iconType, colorHex) {
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.24,
    metalness: 0.58,
    emissive: colorHex,
    emissiveIntensity: 0.18,
  });

  if (iconType === "diamond") {
    return new THREE.Mesh(new THREE.OctahedronGeometry(0.31), material);
  }
  if (iconType === "ring") {
    return new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 26), material);
  }
  if (iconType === "arrow") {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 10), material);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 10), material);
    body.position.y = 0.06;
    head.position.y = 0.32;
    g.add(body, head);
    return g;
  }
  if (iconType === "tower") {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), material);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), material);
    base.position.y = 0.08;
    top.position.y = 0.38;
    g.add(base, top);
    return g;
  }
  if (iconType === "crown") {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 10), material);
    const tipLeft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), material);
    const tipMid = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), material);
    const tipRight = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), material);
    tipLeft.position.set(-0.16, 0.15, 0);
    tipMid.position.set(0, 0.18, 0);
    tipRight.position.set(0.16, 0.15, 0);
    g.add(base, tipLeft, tipMid, tipRight);
    return g;
  }

  return new THREE.Mesh(new THREE.IcosahedronGeometry(0.29), material);
}

function createZoneNode(zoneId, meta) {
  const roleColor = ROLE_COLORS[meta.role] ?? ROLE_COLORS.NONE;

  const group = new THREE.Group();
  group.name = zoneId;
  group.position.set(meta.position[0], meta.position[1], meta.position[2]);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.16, 1.16, 0.34, 28),
    new THREE.MeshStandardMaterial({
      color: 0xc8d3de,
      roughness: 0.66,
      metalness: 0.1,
      emissive: 0x0f1f2f,
      emissiveIntensity: 0.06,
    }),
  );
  base.position.y = 0.18;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.08, 12, 28),
    new THREE.MeshStandardMaterial({
      color: roleColor,
      roughness: 0.26,
      metalness: 0.46,
      emissive: roleColor,
      emissiveIntensity: 0.12,
    }),
  );
  ring.position.y = 0.5;
  ring.rotation.x = Math.PI / 2;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 1.08, 36),
    new THREE.MeshBasicMaterial({
      color: roleColor,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.035;

  const icon = createIcon(meta.icon, roleColor);
  icon.position.y = 0.78;

  const label = createLabelSprite(meta.label, roleColor);
  if (label) {
    label.position.set(0, 1.95, 0);
  }

  group.add(base, ring, halo, icon);
  if (label) {
    group.add(label);
  }

  group.userData = {
    role: meta.role,
    roleColor,
    base,
    ring,
    halo,
    icon,
    label,
    offset: Math.random() * Math.PI * 2,
  };

  return group;
}

function createAvatarRig(teamId, mobile) {
  const group = new THREE.Group();

  const teamPrimary = teamId === "KC" ? 0xc1121f : 0xb3995d;
  const teamTrim = teamId === "KC" ? 0xffd25a : 0x8b1534;

  const suitMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2535,
    roughness: 0.44,
    metalness: 0.2,
  });
  const teamMaterial = new THREE.MeshStandardMaterial({
    color: teamPrimary,
    roughness: 0.36,
    metalness: 0.24,
    emissive: teamPrimary,
    emissiveIntensity: 0.08,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: teamTrim,
    roughness: 0.34,
    metalness: 0.34,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1b195,
    roughness: 0.64,
    metalness: 0.04,
  });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.58, 4, 10), suitMaterial);
  torso.position.y = 0.55;
  torso.castShadow = !mobile;
  hips.add(torso);

  const jerseyStripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.1), teamMaterial);
  jerseyStripe.position.set(0, 0.56, 0.17);
  jerseyStripe.castShadow = !mobile;
  hips.add(jerseyStripe);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 18), trimMaterial);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.86, 0.06);
  hips.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), skinMaterial);
  head.position.set(0, 1.03, 0);
  head.castShadow = !mobile;
  hips.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.168, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1f1c1a, roughness: 0.78, metalness: 0.02 }),
  );
  hair.position.set(0, 1.09, 0);
  hips.add(hair);

  const shoulders = new THREE.Group();
  shoulders.position.set(0, 0.82, 0);
  hips.add(shoulders);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.23, 0, 0);
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), suitMaterial);
  leftArm.position.y = -0.2;
  leftArm.castShadow = !mobile;
  leftArmPivot.add(leftArm);
  shoulders.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.23, 0, 0);
  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), suitMaterial);
  rightArm.position.y = -0.2;
  rightArm.castShadow = !mobile;
  rightArmPivot.add(rightArm);
  shoulders.add(rightArmPivot);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.11, 0.28, 0);
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.48, 4, 8), suitMaterial);
  leftLeg.position.y = -0.3;
  leftLeg.castShadow = !mobile;
  leftLegPivot.add(leftLeg);
  hips.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.11, 0.28, 0);
  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.48, 4, 8), suitMaterial);
  rightLeg.position.y = -0.3;
  rightLeg.castShadow = !mobile;
  rightLegPivot.add(rightLeg);
  hips.add(rightLegPivot);

  const leftShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x111821, roughness: 0.36, metalness: 0.28 }),
  );
  leftShoe.position.set(0, -0.6, 0.06);
  leftLegPivot.add(leftShoe);

  const rightShoe = leftShoe.clone();
  rightLegPivot.add(rightShoe);

  return {
    group,
    setTeam(nextTeamId) {
      const nextPrimary = nextTeamId === "KC" ? 0xc1121f : 0xb3995d;
      const nextTrim = nextTeamId === "KC" ? 0xffd25a : 0x8b1534;
      teamMaterial.color.setHex(nextPrimary);
      teamMaterial.emissive.setHex(nextPrimary);
      trimMaterial.color.setHex(nextTrim);
    },
    parts: {
      hips,
      shoulders,
      head,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
    },
  };
}

function buildMissionBuildings(scene, mobile) {
  const buildings = new Map();
  const center = new THREE.Vector3(0.8, 0, -1.1);

  for (const [zoneId, meta] of Object.entries(ZONE_META)) {
    if (!EXTERIOR_BUILDING_ZONES.has(zoneId)) {
      continue;
    }

    const roleColor = ROLE_COLORS[meta.role] ?? ROLE_COLORS.NONE;
    const zonePos = new THREE.Vector3(meta.position[0], 0, meta.position[2]);
    const toCenter = new THREE.Vector3().subVectors(center, zonePos);
    const facing = Math.atan2(toCenter.x, toCenter.z);

    const group = new THREE.Group();
    group.position.set(zonePos.x, 0.02, zonePos.z);
    group.rotation.y = facing;
    scene.add(group);

    const width = mobile ? 2.6 : 3.1;
    const depth = mobile ? 2.2 : 2.6;
    const height = mobile ? 2.1 : 2.45;
    const doorwayWidth = width * 0.42;
    const wallThickness = 0.14;

    const exteriorMaterial = new THREE.MeshStandardMaterial({
      color: 0xc6cfda,
      roughness: 0.56,
      metalness: 0.12,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x67788c,
      roughness: 0.36,
      metalness: 0.44,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xbec8d4,
      roughness: 0.78,
      metalness: 0.08,
    });
    const signMaterial = new THREE.MeshStandardMaterial({
      color: roleColor,
      emissive: roleColor,
      emissiveIntensity: 0.2,
      roughness: 0.26,
      metalness: 0.38,
      transparent: true,
      opacity: 0.88,
    });

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.06, depth),
      floorMaterial,
    );
    floor.position.y = 0.03;
    floor.receiveShadow = true;
    group.add(floor);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      exteriorMaterial,
    );
    backWall.position.set(0, height / 2, depth / 2 - wallThickness / 2);
    backWall.castShadow = !mobile;
    group.add(backWall);

    const sideWallL = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, height, depth),
      exteriorMaterial,
    );
    sideWallL.position.set(-width / 2 + wallThickness / 2, height / 2, 0);
    sideWallL.castShadow = !mobile;
    group.add(sideWallL);

    const sideWallR = sideWallL.clone();
    sideWallR.position.x = width / 2 - wallThickness / 2;
    group.add(sideWallR);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width, wallThickness, depth),
      trimMaterial,
    );
    roof.position.set(0, height, 0);
    roof.castShadow = !mobile;
    group.add(roof);

    const frontLeft = new THREE.Mesh(
      new THREE.BoxGeometry((width - doorwayWidth) / 2, height * 0.74, wallThickness),
      exteriorMaterial,
    );
    frontLeft.position.set(
      -doorwayWidth / 2 - (width - doorwayWidth) / 4,
      (height * 0.74) / 2,
      -depth / 2 + wallThickness / 2,
    );
    frontLeft.castShadow = !mobile;
    group.add(frontLeft);

    const frontRight = frontLeft.clone();
    frontRight.position.x = doorwayWidth / 2 + (width - doorwayWidth) / 4;
    group.add(frontRight);

    const frontTop = new THREE.Mesh(
      new THREE.BoxGeometry(doorwayWidth, height * 0.2, wallThickness),
      trimMaterial,
    );
    frontTop.position.set(0, height * 0.78, -depth / 2 + wallThickness / 2);
    group.add(frontTop);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.66, 0.24, 0.08),
      signMaterial,
    );
    sign.position.set(0, height * 0.9, -depth / 2 - 0.02);
    group.add(sign);

    const doorwayGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(doorwayWidth * 0.72, height * 0.62),
      new THREE.MeshBasicMaterial({
        color: roleColor,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    );
    doorwayGlow.position.set(0, height * 0.37, -depth / 2 + 0.09);
    group.add(doorwayGlow);

    const lobbyLight = new THREE.PointLight(roleColor, mobile ? 0.36 : 0.44, 4.8, 2);
    lobbyLight.position.set(0, 1.45, 0.1);
    group.add(lobbyLight);

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.44, 0.22, depth * 0.18),
      new THREE.MeshStandardMaterial({
        color: 0x8e9cb0,
        roughness: 0.5,
        metalness: 0.22,
      }),
    );
    desk.position.set(0, 0.35, depth * 0.2);
    group.add(desk);

    const entryMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.44, 24),
      new THREE.MeshBasicMaterial({
        color: roleColor,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    entryMarker.rotation.x = -Math.PI / 2;
    entryMarker.position.set(0, 0.07, -depth * 0.18);
    group.add(entryMarker);

    const entryLocal = new THREE.Vector3(0, 0.95, -depth * 0.2);
    const entryWorld = entryLocal.clone();
    group.localToWorld(entryWorld);

    buildings.set(zoneId, {
      group,
      sign,
      signMaterial,
      doorwayGlow,
      entryMarker,
      lobbyLight,
      entryPoint: entryWorld,
    });
  }

  return buildings;
}

function buildSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 40, 22),
    new THREE.MeshBasicMaterial({
      color: 0xf0b079,
      side: THREE.BackSide,
    }),
  );
  scene.add(sky);

  const upperSky = new THREE.Mesh(
    new THREE.SphereGeometry(116, 40, 22),
    new THREE.MeshBasicMaterial({
      color: 0xbc7bb7,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    }),
  );
  scene.add(upperSky);

  const horizonGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(54, 54, 22, 48, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd6a0,
      transparent: true,
      opacity: 0.11,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  horizonGlow.position.y = 7;
  scene.add(horizonGlow);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 46),
    new THREE.MeshBasicMaterial({
      color: 0xffdda8,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    }),
  );
  sunDisc.position.set(13, 13, -30);
  scene.add(sunDisc);

  const hazeClouds = [];
  for (let i = 0; i < 8; i += 1) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(22 + i * 3.8, 5.5 + i * 0.85),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xffe2bf : 0xf0c8de,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    );
    plane.position.set(-14 + i * 5.3, 6.4 + i * 0.7, -20 + i * 3.2);
    plane.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.28;
    plane.userData = {
      speed: 0.1 + i * 0.025,
      driftRange: 36,
      phase: Math.random() * Math.PI * 2,
    };
    scene.add(plane);
    hazeClouds.push(plane);
  }

  return { hazeClouds, sunDisc };
}

function buildTowerInterior(scene, mobile, towerCenter) {
  const interior = new THREE.Group();
  interior.position.set(towerCenter.x, 0.03, towerCenter.z);
  scene.add(interior);

  const accentMaterials = [];
  const animated = [];

  const stoneFloorTex = createStoneTileTexture(241);
  const wallPlasterTex = createWallPlasterTexture(91);
  const woodDeskTex = createWoodTexture(77);
  const carpetTex = createCarpetTexture(114);
  if (stoneFloorTex) {
    stoneFloorTex.repeat.set(2.7, 2.2);
  }
  if (wallPlasterTex) {
    wallPlasterTex.repeat.set(2.2, 1.6);
  }
  if (woodDeskTex) {
    woodDeskTex.repeat.set(1.6, 1.1);
  }
  if (carpetTex) {
    carpetTex.repeat.set(1.4, 1);
  }

  const lobbyFloor = new THREE.Mesh(
    new THREE.BoxGeometry(8.7, 0.1, 6.2),
    new THREE.MeshStandardMaterial({
      color: 0xd6dbe3,
      map: stoneFloorTex,
      roughnessMap: stoneFloorTex,
      roughness: 0.82,
      metalness: 0.08,
    }),
  );
  lobbyFloor.position.set(0, 0.05, 0);
  lobbyFloor.receiveShadow = true;
  interior.add(lobbyFloor);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.7, 2.4),
    new THREE.MeshBasicMaterial({
      color: ROLE_COLORS.NONE,
      map: carpetTex,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.3, 0.102, 0.58);
  accentMaterials.push(rug.material);
  interior.add(rug);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xc7cfd9,
    map: wallPlasterTex,
    roughnessMap: wallPlasterTex,
    roughness: 0.68,
    metalness: 0.12,
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.72, 3, 0.14), wallMaterial);
  backWall.position.set(0, 1.55, 3.02);
  interior.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3, 6.2), wallMaterial);
  leftWall.position.set(-4.3, 1.55, 0);
  interior.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3, 6.2), wallMaterial);
  rightWall.position.set(4.3, 1.55, 0);
  interior.add(rightWall);

  const frontGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 3),
    new THREE.MeshPhysicalMaterial({
      color: 0xd3e4f2,
      transmission: 0.52,
      roughness: 0.12,
      metalness: 0.06,
      transparent: true,
      opacity: 0.36,
      clearcoat: 0.76,
      clearcoatRoughness: 0.14,
      side: THREE.DoubleSide,
    }),
  );
  frontGlass.position.set(0, 1.52, -3.02);
  interior.add(frontGlass);

  const sideGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.1),
    new THREE.MeshPhysicalMaterial({
      color: 0xd6e6f3,
      transmission: 0.5,
      roughness: 0.1,
      metalness: 0.08,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    }),
  );
  sideGlass.rotation.y = Math.PI / 2;
  sideGlass.position.set(0.2, 1.12, 0.2);
  interior.add(sideGlass);

  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.1, 0.94),
    new THREE.MeshStandardMaterial({
      color: 0x2f3c4c,
      map: woodDeskTex,
      roughnessMap: woodDeskTex,
      roughness: 0.36,
      metalness: 0.42,
    }),
  );
  deskTop.position.set(-1.55, 0.76, 0.36);
  deskTop.castShadow = !mobile;
  interior.add(deskTop);

  for (const xOffset of [-0.82, 0.82]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.7, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x6f7f91, roughness: 0.36, metalness: 0.52 }),
    );
    leg.position.set(-1.55 + xOffset, 0.38, 0.36);
    interior.add(leg);
  }

  const monitorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.52, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1f2c3a, roughness: 0.34, metalness: 0.34 }),
  );
  monitorFrame.position.set(-1.55, 1.08, 0.02);
  interior.add(monitorFrame);

  const monitorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.74, 0.38),
    new THREE.MeshBasicMaterial({
      color: ROLE_COLORS.NONE,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
  );
  monitorGlow.position.set(-1.55, 1.08, 0.056);
  accentMaterials.push(monitorGlow.material);
  animated.push(monitorGlow);
  interior.add(monitorGlow);

  const monitorStand = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.34, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x445668, roughness: 0.4, metalness: 0.4 }),
  );
  monitorStand.position.set(-1.55, 0.82, 0.16);
  interior.add(monitorStand);

  const chair = new THREE.Group();
  const chairSeat = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.1, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x334456, roughness: 0.44, metalness: 0.28 }),
  );
  chairSeat.position.y = 0.52;
  chair.add(chairSeat);

  const chairBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.62, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x304050, roughness: 0.4, metalness: 0.26 }),
  );
  chairBack.position.set(0, 0.86, -0.28);
  chair.add(chairBack);

  const chairStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.48, 8),
    new THREE.MeshStandardMaterial({ color: 0x5f7287, roughness: 0.36, metalness: 0.54 }),
  );
  chairStem.position.y = 0.28;
  chair.add(chairStem);
  chair.position.set(-1.52, 0, 1.32);
  chair.rotation.y = Math.PI * 0.06;
  interior.add(chair);

  const sofaBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.46, 0.82),
    new THREE.MeshStandardMaterial({ color: 0x6e7789, roughness: 0.78, metalness: 0.08 }),
  );
  sofaBase.position.set(2.2, 0.35, 0.78);
  interior.add(sofaBase);

  const sofaBack = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.7, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x7a8496, roughness: 0.74, metalness: 0.07 }),
  );
  sofaBack.position.set(2.2, 0.78, 1.1);
  interior.add(sofaBack);

  const sofaPillowA = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.18, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x9da8b8, roughness: 0.8 }),
  );
  sofaPillowA.position.set(1.65, 0.62, 0.76);
  interior.add(sofaPillowA);

  const sofaPillowB = sofaPillowA.clone();
  sofaPillowB.position.x = 2.75;
  interior.add(sofaPillowB);

  const loungeTable = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.08, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xc8d5e2, roughness: 0.4, metalness: 0.36 }),
  );
  loungeTable.position.set(2.22, 0.42, -0.02);
  loungeTable.castShadow = !mobile;
  interior.add(loungeTable);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.17, 0.34, 12),
    new THREE.MeshStandardMaterial({ color: 0x6c7f92, roughness: 0.36, metalness: 0.5 }),
  );
  tableBase.position.set(2.22, 0.22, -0.02);
  interior.add(tableBase);

  const wallDisplayFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.46, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x283544, roughness: 0.3, metalness: 0.45 }),
  );
  wallDisplayFrame.position.set(1.9, 1.8, 2.9);
  interior.add(wallDisplayFrame);

  const wallDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(2.34, 1.24),
    new THREE.MeshBasicMaterial({
      color: ROLE_COLORS.NONE,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  wallDisplay.position.set(1.9, 1.8, 2.95);
  accentMaterials.push(wallDisplay.material);
  animated.push(wallDisplay);
  interior.add(wallDisplay);

  const planter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 0.38, 16),
    new THREE.MeshStandardMaterial({ color: 0x8d7860, roughness: 0.72, metalness: 0.06 }),
  );
  planter.position.set(3.48, 0.19, -1.25);
  interior.add(planter);

  const plantStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.74, 10),
    new THREE.MeshStandardMaterial({ color: 0x486e57, roughness: 0.82, metalness: 0.04 }),
  );
  plantStem.position.set(3.48, 0.62, -1.25);
  interior.add(plantStem);

  const plantCanopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 9),
    new THREE.MeshStandardMaterial({ color: 0x628f71, roughness: 0.86, metalness: 0.03 }),
  );
  plantCanopy.position.set(3.48, 1.05, -1.25);
  interior.add(plantCanopy);

  const npc = new THREE.Group();
  const npcBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.23, 0.72, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x1f2b3e, roughness: 0.42, metalness: 0.18 }),
  );
  npcBody.position.y = 0.72;
  npc.add(npcBody);

  const npcShirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.44, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.08 }),
  );
  npcShirt.position.set(0, 0.78, 0.16);
  npc.add(npcShirt);

  const npcHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xd7b59b, roughness: 0.64, metalness: 0.04 }),
  );
  npcHead.position.y = 1.3;
  npc.add(npcHead);
  npc.position.set(0.32, 0, -0.58);
  npc.rotation.y = -Math.PI * 0.22;
  interior.add(npc);

  const npcMarker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshStandardMaterial({
      color: 0x76f6a3,
      emissive: 0x67ff9a,
      emissiveIntensity: 0.78,
      roughness: 0.24,
      metalness: 0.36,
      transparent: true,
      opacity: 0.9,
    }),
  );
  npcMarker.position.set(0.32, 1.92, -0.58);
  animated.push(npcMarker);
  interior.add(npcMarker);

  const npcRing = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 22),
    new THREE.MeshBasicMaterial({
      color: 0x73f2a4,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  npcRing.rotation.x = -Math.PI / 2;
  npcRing.position.set(0.32, 0.11, -0.58);
  animated.push(npcRing);
  interior.add(npcRing);

  const keyLight = new THREE.PointLight(0xffe6ca, mobile ? 0.78 : 0.9, 18, 2);
  keyLight.position.set(0.2, 2.62, -0.2);
  interior.add(keyLight);

  const monitorLight = new THREE.PointLight(0x96cfff, mobile ? 0.45 : 0.56, 8, 2);
  monitorLight.position.set(-1.55, 1.26, 0.3);
  interior.add(monitorLight);

  const windowGlow = new THREE.PointLight(0xffc39f, mobile ? 0.22 : 0.32, 14, 2);
  windowGlow.position.set(0, 2.2, -2.4);
  interior.add(windowGlow);

  return {
    group: interior,
    accentMaterials,
    animated,
    npcMarker,
    npcRing,
    keyLight,
    monitorLight,
    windowGlow,
    focusPoint: new THREE.Vector3(towerCenter.x + 0.2, 1.35, towerCenter.z - 0.45),
    moveBounds: {
      minX: towerCenter.x - 3.3,
      maxX: towerCenter.x + 3.3,
      minZ: towerCenter.z - 2.1,
      maxZ: towerCenter.z + 2.1,
    },
  };
}

function buildDistrict(scene, mobile) {
  const rng = (a, b) => a + Math.random() * (b - a);
  const buildingCount = mobile ? 22 : 40;
  const exteriorZonePoints = Object.entries(ZONE_META)
    .filter(([zoneId]) => EXTERIOR_BUILDING_ZONES.has(zoneId))
    .map(([, meta]) => new THREE.Vector3(meta.position[0], 0, meta.position[2]));
  const windowTexturePool = [
    createWindowTexture(101),
    createWindowTexture(202),
    createWindowTexture(303),
    createWindowTexture(404),
  ].filter(Boolean);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 27),
    new THREE.MeshStandardMaterial({ color: 0x5d6977, roughness: 0.96, metalness: 0.03 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const blockPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(31.8, 22.2),
    new THREE.MeshStandardMaterial({ color: 0x7a8696, roughness: 0.9, metalness: 0.06 }),
  );
  blockPlate.rotation.x = -Math.PI / 2;
  blockPlate.position.y = 0.01;
  scene.add(blockPlate);

  const boulevard = new THREE.Mesh(
    new THREE.PlaneGeometry(25.5, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x2b3544, roughness: 0.95, metalness: 0.04 }),
  );
  boulevard.rotation.x = -Math.PI / 2;
  boulevard.position.set(0, 0.022, -1.1);
  scene.add(boulevard);

  const crossRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 17.2),
    new THREE.MeshStandardMaterial({ color: 0x303d4b, roughness: 0.95, metalness: 0.04 }),
  );
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.position.set(0.8, 0.023, 2.2);
  scene.add(crossRoad);

  const median = new THREE.Mesh(
    new THREE.PlaneGeometry(25.5, 0.62),
    new THREE.MeshBasicMaterial({ color: 0x5ec08f, transparent: true, opacity: 0.55 }),
  );
  median.rotation.x = -Math.PI / 2;
  median.position.set(0, 0.032, -1.1);
  scene.add(median);

  const crossLane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 17.2),
    new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.66 }),
  );
  crossLane.rotation.x = -Math.PI / 2;
  crossLane.position.set(0.8, 0.033, 2.2);
  scene.add(crossLane);

  const accentRoadMaterials = [];
  const boulevardNeonL = new THREE.Mesh(
    new THREE.PlaneGeometry(25.5, 0.3),
    new THREE.MeshBasicMaterial({ color: ROLE_COLORS.NONE, transparent: true, opacity: 0.22 }),
  );
  boulevardNeonL.rotation.x = -Math.PI / 2;
  boulevardNeonL.position.set(0, 0.034, 1.04);
  accentRoadMaterials.push(boulevardNeonL.material);
  scene.add(boulevardNeonL);

  const boulevardNeonR = new THREE.Mesh(
    new THREE.PlaneGeometry(25.5, 0.3),
    new THREE.MeshBasicMaterial({ color: ROLE_COLORS.NONE, transparent: true, opacity: 0.22 }),
  );
  boulevardNeonR.rotation.x = -Math.PI / 2;
  boulevardNeonR.position.set(0, 0.034, -3.24);
  accentRoadMaterials.push(boulevardNeonR.material);
  scene.add(boulevardNeonR);

  const skylineStrips = [];
  const lotAnchors = [
    [-10.6, -5.2],
    [-10.2, -1.7],
    [-9.8, 2.2],
    [-9.1, 5.4],
    [-6.6, -5.3],
    [-6.1, -1.4],
    [-5.7, 2.3],
    [-5.1, 5.4],
    [5.2, -5.3],
    [5.7, -1.5],
    [6.2, 2.2],
    [6.8, 5.3],
    [9.2, -5.1],
    [9.6, -1.6],
    [10.1, 2.5],
    [10.6, 5.3],
    [-2.7, -5.4],
    [1.4, -5.3],
    [-2.4, 5.1],
    [2.4, 5.2],
  ];

  const activeLots = mobile ? lotAnchors.filter((_, i) => i % 2 === 0) : lotAnchors;
  for (let i = 0; i < Math.min(buildingCount, activeLots.length); i += 1) {
    const [ax, az] = activeLots[i];
    const clusterCount = mobile ? 1 : 1 + (i % 2);
    for (let n = 0; n < clusterCount; n += 1) {
      const x = ax + rng(-0.55, 0.55);
      const z = az + rng(-0.55, 0.55);
      const tooCloseToMissionBuilding = exteriorZonePoints.some((point) => {
        return Math.hypot(x - point.x, z - point.z) < 1.9;
      });
      if (tooCloseToMissionBuilding) {
        continue;
      }
      const w = rng(1.1, 2.5);
      const d = rng(1.1, 2.6);
      const h = rng(2.2, 8.8);

      const tone = 0x74889c + Math.floor(rng(-20, 38));
      const windowSeedTexture = windowTexturePool[(i + n) % windowTexturePool.length] ?? null;
      let windowTex = null;
      if (windowSeedTexture) {
        windowTex = windowSeedTexture.clone();
        windowTex.repeat.set(1 + Math.floor(w * 1.9), 2 + Math.floor(h * 0.74));
        windowTex.offset.set((i % 5) * 0.05, (n % 3) * 0.09);
      }

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color: tone,
          roughness: 0.32,
          metalness: 0.42,
          emissive: 0x38506b,
          emissiveMap: windowTex,
          emissiveIntensity: 0.3,
        }),
      );
      building.position.set(x, h / 2, z);
      building.castShadow = !mobile;
      building.receiveShadow = true;
      scene.add(building);

      const roofGlow = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.84, 0.06, d * 0.84),
        new THREE.MeshBasicMaterial({
          color: 0xd6ebff,
          transparent: true,
          opacity: 0.1 + Math.random() * 0.1,
        }),
      );
      roofGlow.position.set(x, h + 0.04, z);
      roofGlow.userData = { phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 2.2 };
      skylineStrips.push(roofGlow);
      scene.add(roofGlow);

      if (h > 6.8) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 8, 8),
          new THREE.MeshBasicMaterial({
            color: 0xffefbf,
            transparent: true,
            opacity: 0.75,
          }),
        );
        beacon.position.set(x, h + 0.2, z);
        beacon.userData = { phase: Math.random() * Math.PI * 2, speed: 1.5 + Math.random() * 3.2 };
        skylineStrips.push(beacon);
        scene.add(beacon);
      }
    }
  }

  const duskBackdrop = [
    { x: -14.6, z: -9.2, w: 4.2, d: 2.4, h: 9.8 },
    { x: -8.2, z: -9.4, w: 3.1, d: 2.4, h: 8.4 },
    { x: -1.1, z: -9.6, w: 4.8, d: 2.4, h: 10.6 },
    { x: 5.9, z: -9.3, w: 4.4, d: 2.4, h: 8.9 },
    { x: 12.3, z: -9.2, w: 3.8, d: 2.4, h: 9.4 },
  ];
  for (const block of duskBackdrop) {
    const silhouette = new THREE.Mesh(
      new THREE.BoxGeometry(block.w, block.h, block.d),
      new THREE.MeshStandardMaterial({
        color: 0x4a5261,
        roughness: 0.48,
        metalness: 0.22,
        emissive: 0x111926,
        emissiveIntensity: 0.18,
      }),
    );
    silhouette.position.set(block.x, block.h / 2, block.z);
    silhouette.castShadow = !mobile;
    scene.add(silhouette);
  }

  const billboardPanels = [];
  function addBillboard({ x, z, color, width = 2.1, height = 1.2, rotateY = 0 }) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.16),
      new THREE.MeshStandardMaterial({
        color: 0x2c3745,
        roughness: 0.34,
        metalness: 0.52,
      }),
    );
    frame.position.set(x, 2.1, z);
    frame.rotation.y = rotateY;
    frame.castShadow = !mobile;
    scene.add(frame);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.52,
      }),
    );
    panel.position.set(x, 2.1, z + 0.09);
    panel.rotation.y = rotateY;
    panel.userData = { phase: Math.random() * Math.PI * 2, speed: 1.4 + Math.random() * 2.6 };
    scene.add(panel);
    skylineStrips.push(panel);
    billboardPanels.push(panel.material);
    accentRoadMaterials.push(panel.material);

    const leftPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x364352, roughness: 0.42, metalness: 0.46 }),
    );
    leftPole.position.set(x - width * 0.38, 1.0, z);
    leftPole.rotation.y = rotateY;
    scene.add(leftPole);

    const rightPole = leftPole.clone();
    rightPole.position.set(x + width * 0.38, 1.0, z);
    scene.add(rightPole);
  }

  const signColorA = 0x86c9ff;
  const signColorB = 0xffb9d0;
  const signColorC = 0x99ffd8;
  addBillboard({ x: -7.9, z: -3.9, color: signColorA, rotateY: 0.08 });
  addBillboard({ x: -3.9, z: -3.95, color: signColorB, rotateY: 0.06 });
  addBillboard({ x: 2.5, z: -3.95, color: signColorC, rotateY: -0.04 });
  addBillboard({ x: 7.2, z: -3.85, color: signColorA, rotateY: -0.09 });

  const laneDashCount = mobile ? 13 : 19;
  for (let i = 0; i < laneDashCount; i += 1) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.04, 0.09),
      new THREE.MeshBasicMaterial({ color: 0xe8f3ff, transparent: true, opacity: 0.82 }),
    );
    dash.position.set(-12 + i * 1.32, 0.045, -1.1);
    scene.add(dash);
  }

  const walkwayRows = [-4.35, 2.2];
  for (const z of walkwayRows) {
    const sidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(25.5, 1.95),
      new THREE.MeshStandardMaterial({ color: 0x8fa0b2, roughness: 0.86, metalness: 0.06 }),
    );
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0, 0.024, z);
    scene.add(sidewalk);
  }

  const lightCount = mobile ? 8 : 12;
  for (let i = 0; i < lightCount; i += 1) {
    const x = -11 + (22 / (lightCount - 1)) * i;
    const z = i % 2 === 0 ? -3.65 : 1.35;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x354353, roughness: 0.42, metalness: 0.48 }),
    );
    pole.position.set(x, 0.95, z);
    scene.add(pole);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe7b7, transparent: true, opacity: 0.72 }),
    );
    lamp.position.set(x, 1.96, z);
    lamp.userData = { phase: Math.random() * Math.PI * 2, speed: 1.1 + Math.random() * 2.5 };
    skylineStrips.push(lamp);
    scene.add(lamp);
  }

  const missionBuildings = buildMissionBuildings(scene, mobile);

  // Spider-style skyline webs for hero traversal energy.
  const webLineCount = mobile ? 3 : 6;
  for (let i = 0; i < webLineCount; i += 1) {
    const startX = -9 + i * 3.2 + rng(-0.8, 0.8);
    const endX = startX + rng(3.5, 6.5);
    const start = new THREE.Vector3(startX, 3.8 + rng(0, 2.1), -3.8 + rng(-0.8, 0.6));
    const mid = new THREE.Vector3((startX + endX) / 2, start.y + rng(1, 2.2), -1.3 + rng(-0.6, 0.8));
    const end = new THREE.Vector3(endX, 4 + rng(0, 2.2), 1.8 + rng(-0.8, 0.8));
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const strand = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 20, mobile ? 0.015 : 0.02, 8, false),
      new THREE.MeshBasicMaterial({
        color: 0xc8e9ff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    strand.userData = {
      phase: Math.random() * Math.PI * 2,
      speed: 1.1 + Math.random() * 2.2,
    };
    skylineStrips.push(strand);
    scene.add(strand);
  }

  // Trees for depth and contrast.
  const treeCount = mobile ? 10 : 18;
  for (let i = 0; i < treeCount; i += 1) {
    const x = rng(-13, 13);
    const z = rng(-7.2, 8.2);
    if (Math.abs(x) < 3.5 && Math.abs(z + 1.1) < 3.4) {
      continue;
    }

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x5d4633, roughness: 0.88 }),
    );
    trunk.position.set(x, 0.45, z);
    trunk.castShadow = !mobile;
    scene.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.45 + Math.random() * 0.2, 9, 8),
      new THREE.MeshStandardMaterial({ color: 0x5f8f70, roughness: 0.8, metalness: 0.04 }),
    );
    canopy.position.set(x, 1.1, z);
    canopy.castShadow = !mobile;
    scene.add(canopy);
  }

  const archColor = 0xcdd9e8;
  const archLegL = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 2.3, 0.28),
    new THREE.MeshStandardMaterial({ color: archColor, roughness: 0.42, metalness: 0.22 }),
  );
  archLegL.position.set(-0.8, 1.16, -1.1);
  archLegL.castShadow = !mobile;
  scene.add(archLegL);

  const archLegR = archLegL.clone();
  archLegR.position.x = 2.4;
  scene.add(archLegR);

  const archTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.22, 0.35),
    new THREE.MeshStandardMaterial({
      color: 0xe0eaf4,
      roughness: 0.28,
      metalness: 0.36,
      emissive: 0x698cb0,
      emissiveIntensity: 0.32,
    }),
  );
  archTop.position.set(0.8, 2.28, -1.1);
  scene.add(archTop);

  const towerCenter = new THREE.Vector3(0.8, 0, 5.7);

  // HQ tower + floor accents.
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(9.9, 12.5, 7.1),
    new THREE.MeshStandardMaterial({
      color: 0xcad7e2,
      roughness: 0.31,
      metalness: 0.3,
      emissive: 0x1a2f44,
      emissiveIntensity: 0.12,
    }),
  );
  tower.position.set(towerCenter.x, 6.25, towerCenter.z);
  tower.castShadow = !mobile;
  tower.receiveShadow = true;
  scene.add(tower);

  const towerGlass = new THREE.Mesh(
    new THREE.BoxGeometry(9.45, 12.1, 6.7),
    new THREE.MeshPhysicalMaterial({
      color: 0xbdd3e8,
      roughness: 0.18,
      metalness: 0.14,
      transmission: 0.22,
      transparent: true,
      opacity: 0.58,
      clearcoat: 0.76,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.4,
    }),
  );
  towerGlass.position.set(towerCenter.x, 6.25, towerCenter.z);
  scene.add(towerGlass);

  const interior = buildTowerInterior(scene, mobile, towerCenter);

  const floorBands = [
    { y: 4.7, color: 0x6d8ba9 },
    { y: 7.9, color: 0xb99758 },
    { y: 10.9, color: 0x69a488 },
  ];
  for (const floor of floorBands) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.24, 7.6),
      new THREE.MeshStandardMaterial({
        color: floor.color,
        roughness: 0.54,
        metalness: 0.24,
        emissive: floor.color,
        emissiveIntensity: 0.16,
      }),
    );
    band.position.set(towerCenter.x, floor.y, towerCenter.z);
    scene.add(band);
  }

  for (const material of billboardPanels) {
    material.color.setHex(ROLE_COLORS.NONE);
  }
  for (const material of interior.accentMaterials) {
    material.color.setHex(ROLE_COLORS.NONE);
    accentRoadMaterials.push(material);
  }

  return {
    skylineStrips,
    accentRoadMaterials,
    towerGlass,
    interior,
    missionBuildings,
  };
}

function createRouteTrack(points, colorHex, radius = 0.06) {
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 44, radius, 10, false),
    new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.44,
      metalness: 0.35,
      emissive: colorHex,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.16,
    }),
  );

  const pulses = [];
  for (let i = 0; i < 3; i += 1) {
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.58,
        transparent: true,
        opacity: 0.82,
        roughness: 0.2,
        metalness: 0.4,
      }),
    );
    pulse.userData = { phase: i / 3 };
    pulses.push(pulse);
  }

  return { curve, tube, pulses };
}

export function initWorld3D(canvas, config = {}) {
  const mobile = window.matchMedia("(max-width: 960px)").matches;
  const onMissionEntry = typeof config.onMissionEntry === "function" ? config.onMissionEntry : null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfa474);
  scene.fog = new THREE.Fog(0xdfa474, 12, 54);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 240);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  scene.environment = envTexture;

  const hemi = new THREE.HemisphereLight(0xffecd7, 0x483740, 0.88);

  const sun = new THREE.DirectionalLight(0xffe2c2, 1.08);
  sun.position.set(9, 17, -7);
  sun.castShadow = !mobile;
  if (!mobile) {
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
  }

  const rim = new THREE.DirectionalLight(0x7fbaf0, 0.44);
  rim.position.set(-12, 10, 8);

  const roleAccent = new THREE.PointLight(ROLE_COLORS.NONE, 0.65, 48, 2);
  roleAccent.position.set(0.8, 5.8, 1.4);

  scene.add(hemi, sun, rim, roleAccent);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth || 800, canvas.clientHeight || 600),
    mobile ? 0.4 : 0.58,
    0.9,
    0.9,
  );
  composer.addPass(bloomPass);

  const skyFx = buildSky(scene);
  const districtFx = buildDistrict(scene, mobile);
  const INTERIOR_ZONES = new Set(["LEAGUE_OFFICE_FLOOR", "OWNER_SUITE_FLOOR", "BOARDROOM_FLOOR"]);
  const INTERIOR_MOVE_TARGETS = {
    LEAGUE_OFFICE_FLOOR: new THREE.Vector3(-1.45, 0.95, 5.02),
    OWNER_SUITE_FLOOR: new THREE.Vector3(2.35, 0.95, 5.3),
    BOARDROOM_FLOOR: new THREE.Vector3(0.8, 0.95, 5.86),
  };

  const avatarRig = createAvatarRig(config.teamId, mobile);
  const avatar = avatarRig.group;
  avatar.position.set(-6.4, 0.95, -1.1);
  scene.add(avatar);

  const destinationRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.68, 30),
    new THREE.MeshBasicMaterial({
      color: 0x5ec7ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  destinationRing.rotation.x = -Math.PI / 2;
  destinationRing.position.set(avatar.position.x, 0.04, avatar.position.z);
  scene.add(destinationRing);

  const destinationBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.16, 2.2, 12),
    new THREE.MeshBasicMaterial({
      color: 0x9de4ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  destinationBeam.position.set(avatar.position.x, 1.15, avatar.position.z);
  scene.add(destinationBeam);

  const motionTrail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 1.5),
    new THREE.MeshBasicMaterial({
      color: 0x7dcaff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  motionTrail.rotation.x = -Math.PI / 2;
  motionTrail.position.set(avatar.position.x, 0.07, avatar.position.z);
  scene.add(motionTrail);

  const zoneNodes = new Map();
  for (const [zone, meta] of Object.entries(ZONE_META)) {
    const node = createZoneNode(zone, meta);
    zoneNodes.set(zone, node);
    scene.add(node);
  }

  const routeTracks = [];
  for (const [role, zones] of Object.entries(ROUTES)) {
    const points = zones
      .map((zone) => ZONE_META[zone].position)
      .map((p) => new THREE.Vector3(p[0], p[1] + 0.34, p[2]));

    if (points.length < 2) {
      continue;
    }

    const track = createRouteTrack(points, ROLE_COLORS[role], role === "OWNER" ? 0.064 : 0.052);
    track.role = role;
    scene.add(track.tube);
    for (const pulse of track.pulses) {
      pulse.visible = false;
      scene.add(pulse);
    }
    routeTracks.push(track);
  }

  const activeBeacon = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.085, 12, 28),
    new THREE.MeshStandardMaterial({
      color: ROLE_COLORS.NONE,
      emissive: ROLE_COLORS.NONE,
      emissiveIntensity: 0.3,
      roughness: 0.22,
      metalness: 0.56,
      transparent: true,
      opacity: 0.85,
    }),
  );
  activeBeacon.visible = false;
  scene.add(activeBeacon);

  let disposed = false;
  let activeMission = null;
  let activeZone = null;
  let activeRole = "NONE";
  let interiorTarget = 0;
  let interiorBlend = 0;
  let activeMissionBuilding = null;
  let activeMissionEntryPoint = null;
  let activeMissionEntryRadius = mobile ? 0.72 : 0.88;
  let missionEntryTriggered = false;
  let missionEntryArmed = false;
  let markerVisible = false;
  let moveTarget = avatar.position.clone();
  const markerTarget = moveTarget.clone();
  const avatarAnim = {
    stridePhase: 0,
    heading: 0,
  };
  const roleTintCurrent = new THREE.Color(ROLE_COLORS.NONE);
  const roleTintTarget = new THREE.Color(ROLE_COLORS.NONE);

  const defaultCamera = {
    theta: 0.22,
    phi: mobile ? 0.96 : 0.88,
    radius: mobile ? 10.5 : 12.2,
  };

  const cameraOrbit = {
    theta: -0.64,
    phi: mobile ? 0.84 : 0.76,
    radius: mobile ? 13.8 : 15.7,
    targetTheta: -0.64,
    targetPhi: mobile ? 0.84 : 0.76,
    targetRadius: mobile ? 13.8 : 15.7,
  };

  const cameraBounds = {
    minPhi: mobile ? 0.72 : 0.55,
    maxPhi: mobile ? 1.12 : 1.21,
    minRadius: mobile ? 8.6 : 9.2,
    maxRadius: mobile ? 14.2 : 18.4,
  };

  const cinematic = {
    introActive: true,
    introDuration: 4.4,
    introTime: 0,
    missionShotTime: 0,
    missionShotDuration: 1.35,
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  let dragging = false;
  let movedPx = 0;
  let prevX = 0;
  let prevY = 0;

  function resize() {
    const width = canvas.clientWidth || canvas.parentElement.clientWidth;
    const height = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function setRouteRole(role) {
    activeRole = role;
    roleTintTarget.setHex(ROLE_COLORS[role] ?? ROLE_COLORS.NONE);

    for (const material of districtFx.accentRoadMaterials) {
      material.color.setHex(ROLE_COLORS[role] ?? ROLE_COLORS.NONE);
      material.opacity = role === "NONE" ? 0.14 : 0.24;
    }

    for (const track of routeTracks) {
      const isActive = track.role === role;
      track.tube.material.opacity = isActive ? 0.66 : 0.12;
      track.tube.material.emissiveIntensity = isActive ? 0.36 : 0.05;
      for (const pulse of track.pulses) {
        pulse.visible = isActive;
      }
    }
    if (role === "NONE") {
      activeBeacon.material.color.setHex(ROLE_COLORS.NONE);
      activeBeacon.material.emissive.setHex(ROLE_COLORS.NONE);
    }
  }

  function setZoneActiveVisual(node, urgency) {
    const roleColor = node.userData.roleColor;
    const pulseBoost = urgency === "deadline" ? 0.38 : 0.2;

    node.userData.base.material.color.setHex(roleColor);
    node.userData.base.material.emissive.setHex(urgency === "deadline" ? 0x7a1c10 : 0x123247);
    node.userData.base.material.emissiveIntensity = 0.14 + pulseBoost;

    node.userData.ring.material.emissiveIntensity = urgency === "deadline" ? 0.4 : 0.26;
    node.userData.halo.material.opacity = urgency === "deadline" ? 0.56 : 0.28;

    if (node.userData.label?.material) {
      node.userData.label.material.opacity = urgency === "deadline" ? 0.98 : 0.86;
    }
  }

  function resetZoneVisual(node) {
    node.userData.base.material.color.setHex(0xc8d3de);
    node.userData.base.material.emissive.setHex(0x0f1f2f);
    node.userData.base.material.emissiveIntensity = 0.06;

    node.userData.ring.material.emissiveIntensity = 0.12;
    node.userData.halo.material.opacity = 0.13;

    if (node.userData.label?.material) {
      node.userData.label.material.opacity = 0.58;
    }
  }

  function setMission(mission) {
    activeMission = mission || null;
    missionEntryTriggered = false;
    missionEntryArmed = false;
    activeMissionEntryPoint = null;
    activeMissionBuilding = null;

    for (const node of zoneNodes.values()) {
      resetZoneVisual(node);
    }

    if (districtFx.missionBuildings) {
      for (const building of districtFx.missionBuildings.values()) {
        building.signMaterial.emissiveIntensity = 0.18;
        building.doorwayGlow.material.opacity = 0.08;
        building.entryMarker.material.opacity = 0.2;
        building.lobbyLight.intensity = mobile ? 0.3 : 0.38;
      }
    }

    if (!mission) {
      activeZone = null;
      activeBeacon.visible = false;
      interiorTarget = 0;
      cinematic.missionShotTime = 0;
      markerVisible = false;
      setRouteRole("NONE");
      return;
    }

    setRouteRole(mission.role);

    const node = zoneNodes.get(mission.zone);
    activeZone = node ?? null;
    const isInteriorMission = INTERIOR_ZONES.has(mission.zone);
    interiorTarget = isInteriorMission ? 1 : 0;

    const missionBuilding = districtFx.missionBuildings?.get(mission.zone) ?? null;
    if (missionBuilding) {
      activeMissionBuilding = missionBuilding;
      activeMissionEntryPoint = missionBuilding.entryPoint.clone();
      activeMissionEntryRadius = mobile ? 0.72 : 0.88;
    }

    if (isInteriorMission) {
      cameraOrbit.targetRadius = mobile ? 8.7 : 9.8;
      cameraOrbit.targetPhi = mobile ? 0.98 : 0.93;
      cameraOrbit.targetTheta = -0.14;
    } else {
      cameraOrbit.targetRadius = defaultCamera.radius;
      cameraOrbit.targetPhi = defaultCamera.phi;
      cameraOrbit.targetTheta = defaultCamera.theta;
    }
    cinematic.missionShotTime = cinematic.missionShotDuration;

    if (activeMissionBuilding) {
      activeMissionBuilding.signMaterial.emissiveIntensity =
        mission.urgency === "deadline" ? 0.82 : 0.56;
      activeMissionBuilding.doorwayGlow.material.opacity =
        mission.urgency === "deadline" ? 0.36 : 0.24;
      activeMissionBuilding.entryMarker.material.opacity = 0.58;
      activeMissionBuilding.lobbyLight.intensity = mobile ? 0.68 : 0.8;
    }

    if (activeZone) {
      setZoneActiveVisual(activeZone, mission.urgency);
      activeBeacon.visible = true;
      activeBeacon.material.color.setHex(ROLE_COLORS[mission.role] ?? ROLE_COLORS.NONE);
      activeBeacon.material.emissive.setHex(ROLE_COLORS[mission.role] ?? ROLE_COLORS.NONE);
      activeBeacon.position.set(activeZone.position.x, activeZone.position.y + 1.3, activeZone.position.z);

      const missionEntryTarget = new THREE.Vector3();
      const presetMoveTarget = isInteriorMission ? INTERIOR_MOVE_TARGETS[mission.zone] : null;
      if (presetMoveTarget) {
        missionEntryTarget.copy(presetMoveTarget);
        activeMissionEntryPoint = presetMoveTarget.clone();
        activeMissionEntryRadius = mobile ? 0.66 : 0.78;
      } else if (activeMissionBuilding) {
        missionEntryTarget.copy(activeMissionBuilding.entryPoint);
        activeMissionEntryPoint = activeMissionBuilding.entryPoint.clone();
        activeMissionEntryRadius = mobile ? 0.72 : 0.88;
      } else {
        missionEntryTarget.copy(activeZone.position);
        missionEntryTarget.y = 0.95;
        activeMissionEntryPoint = missionEntryTarget.clone();
        activeMissionEntryRadius = mobile ? 0.74 : 0.86;
      }

      moveTarget.copy(avatar.position);
      markerTarget.copy(missionEntryTarget);
      destinationRing.position.set(markerTarget.x, 0.04, markerTarget.z);
      destinationBeam.position.set(markerTarget.x, 1.15, markerTarget.z);
      markerVisible = true;
    }
  }

  function onPointerDown(event) {
    if (cinematic.introActive) {
      return;
    }
    dragging = true;
    movedPx = 0;
    prevX = event.clientX;
    prevY = event.clientY;
  }

  function onPointerMove(event) {
    if (cinematic.introActive) {
      return;
    }
    if (!dragging) {
      return;
    }
    const dx = event.clientX - prevX;
    const dy = event.clientY - prevY;
    movedPx += Math.abs(dx) + Math.abs(dy);
    prevX = event.clientX;
    prevY = event.clientY;

    cameraOrbit.targetTheta -= dx * 0.0034;
    cameraOrbit.targetPhi = clamp(
      cameraOrbit.targetPhi + dy * 0.0032,
      cameraBounds.minPhi,
      cameraBounds.maxPhi,
    );
  }

  function onPointerUp(event) {
    if (cinematic.introActive) {
      return;
    }
    if (!dragging) {
      return;
    }
    dragging = false;

    if (movedPx > 6) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      moveTarget.copy(hit);
      moveTarget.y = 0.95;
      const usingInteriorBounds = interiorBlend > 0.45 || interiorTarget > 0.5;
      if (usingInteriorBounds) {
        moveTarget.x = clamp(moveTarget.x, districtFx.interior.moveBounds.minX, districtFx.interior.moveBounds.maxX);
        moveTarget.z = clamp(moveTarget.z, districtFx.interior.moveBounds.minZ, districtFx.interior.moveBounds.maxZ);
      } else {
        moveTarget.x = clamp(moveTarget.x, -12.5, 12.5);
        moveTarget.z = clamp(moveTarget.z, -8.6, 9);
      }

      markerTarget.copy(moveTarget);
      destinationRing.position.set(markerTarget.x, 0.04, markerTarget.z);
      destinationBeam.position.set(markerTarget.x, 1.15, markerTarget.z);
      markerVisible = true;
      missionEntryArmed = true;
    }
  }

  function onWheel(event) {
    if (cinematic.introActive) {
      return;
    }
    event.preventDefault();
    cameraOrbit.targetRadius = clamp(
      cameraOrbit.targetRadius + event.deltaY * 0.01,
      cameraBounds.minRadius,
      cameraBounds.maxRadius,
    );
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  const baseFog = new THREE.Color(0xdfa474);
  const fogTarget = new THREE.Color(0xdfa474);
  const cameraLookAt = avatar.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  const introLookAtAnchor = new THREE.Vector3(0.8, 1.3, 1.2);

  function tick() {
    if (disposed) {
      return;
    }

    const dt = clock.getDelta();
    const elapsed = clock.elapsedTime;
    interiorBlend = mix(interiorBlend, interiorTarget, Math.min(1, dt * 2.8));

    if (cinematic.introActive) {
      cinematic.introTime += dt;
      const introT = clamp(cinematic.introTime / cinematic.introDuration, 0, 1);
      const eased = 1 - (1 - introT) ** 3;
      cameraOrbit.targetTheta = mix(-0.64, defaultCamera.theta + 0.08, eased);
      cameraOrbit.targetPhi = mix(mobile ? 0.84 : 0.76, defaultCamera.phi, eased);
      cameraOrbit.targetRadius = mix(mobile ? 13.8 : 15.7, defaultCamera.radius, eased);
      if (introT >= 1) {
        cinematic.introActive = false;
        cameraOrbit.targetTheta = defaultCamera.theta;
        cameraOrbit.targetPhi = defaultCamera.phi;
        cameraOrbit.targetRadius = defaultCamera.radius;
      }
    }
    if (cinematic.missionShotTime > 0) {
      cinematic.missionShotTime = Math.max(0, cinematic.missionShotTime - dt);
    }

    // Avatar movement with gentle arrival settle.
    const toTarget = new THREE.Vector3().subVectors(moveTarget, avatar.position);
    const distance = toTarget.length();
    const moveAmount = clamp(distance / 1.6, 0, 1);
    if (distance > 0.02) {
      toTarget.normalize();
      const exteriorSpeed = activeMission?.urgency === "deadline" ? 9.4 : 7.3;
      const interiorSpeed = activeMission?.urgency === "deadline" ? 7.4 : 5.6;
      const speed = mix(exteriorSpeed, interiorSpeed, interiorBlend);
      avatar.position.addScaledVector(toTarget, Math.min(distance, speed * dt));
      avatarAnim.heading = Math.atan2(toTarget.x, toTarget.z);
      motionTrail.position.set(avatar.position.x, 0.07, avatar.position.z);
      motionTrail.rotation.z = Math.atan2(toTarget.z, toTarget.x);
      motionTrail.material.opacity = 0.14 + 0.16 * Math.min(1, distance / 2);
      motionTrail.scale.x = 1 + Math.min(1.2, distance / 1.8);
    } else {
      avatar.position.lerp(moveTarget, Math.min(1, dt * 6));
      motionTrail.material.opacity *= 0.8;
    }

    // Avatar body animation for premium movement feel.
    avatarAnim.stridePhase += dt * mix(2.2, 10.8, moveAmount);
    const stride = Math.sin(avatarAnim.stridePhase) * 0.48 * moveAmount;
    const armSwing = Math.sin(avatarAnim.stridePhase + Math.PI) * 0.52 * moveAmount;
    const idleBob = Math.sin(elapsed * 2.1) * 0.014;

    avatarRig.parts.leftLegPivot.rotation.x = stride;
    avatarRig.parts.rightLegPivot.rotation.x = -stride;
    avatarRig.parts.leftArmPivot.rotation.x = armSwing;
    avatarRig.parts.rightArmPivot.rotation.x = -armSwing;
    avatarRig.parts.hips.position.y = 0.95 + idleBob + moveAmount * 0.014;
    avatarRig.parts.shoulders.rotation.z = Math.sin(elapsed * 1.4) * 0.03 * (0.3 + moveAmount);
    avatarRig.parts.head.rotation.y = Math.sin(elapsed * 0.9) * 0.05;

    const headingDelta = Math.atan2(
      Math.sin(avatarAnim.heading - avatar.rotation.y),
      Math.cos(avatarAnim.heading - avatar.rotation.y),
    );
    avatar.rotation.y += headingDelta * Math.min(1, dt * 9.2);

    // Camera orbit damping.
    const missionShotProgress = 1 - cinematic.missionShotTime / cinematic.missionShotDuration;
    const missionShotBlend =
      cinematic.missionShotTime > 0 ? Math.sin(Math.PI * clamp(missionShotProgress, 0, 1)) : 0;
    if (!cinematic.introActive && missionShotBlend > 0.001 && activeZone) {
      const shotTheta =
        Math.atan2(activeZone.position.x - avatar.position.x, activeZone.position.z - avatar.position.z) -
        0.68;
      const shotRadius = interiorBlend > 0.45 ? (mobile ? 8.2 : 9.2) : (mobile ? 9.1 : 10.5);
      cameraOrbit.targetTheta = mix(cameraOrbit.targetTheta, shotTheta, 0.25 * missionShotBlend);
      cameraOrbit.targetRadius = mix(cameraOrbit.targetRadius, shotRadius, 0.24 * missionShotBlend);
      cameraOrbit.targetPhi = mix(cameraOrbit.targetPhi, interiorBlend > 0.45 ? 0.98 : 0.9, 0.16 * missionShotBlend);
    }

    cameraOrbit.theta += (cameraOrbit.targetTheta - cameraOrbit.theta) * Math.min(1, dt * 8.4);
    cameraOrbit.phi += (cameraOrbit.targetPhi - cameraOrbit.phi) * Math.min(1, dt * 8.2);
    cameraOrbit.radius += (cameraOrbit.targetRadius - cameraOrbit.radius) * Math.min(1, dt * 7.6);

    const lookAt = avatar.position.clone();
    const missionFocus = activeZone ? activeZone.position.clone() : avatar.position.clone();
    missionFocus.y = Math.max(missionFocus.y, 0.95);
    if (interiorBlend > 0.03) {
      missionFocus.lerp(districtFx.interior.focusPoint, interiorBlend * 0.9);
    }
    if (!cinematic.introActive && missionShotBlend > 0.001 && activeZone) {
      const zoneFocus = activeZone.position.clone();
      zoneFocus.y = Math.max(zoneFocus.y, 0.95);
      missionFocus.lerp(zoneFocus, 0.66 * missionShotBlend);
    }
    lookAt.lerp(missionFocus, 0.2);
    lookAt.y += 1.15;
    if (cinematic.introActive) {
      const introBlend = clamp(cinematic.introTime / cinematic.introDuration, 0, 1);
      lookAt.lerp(introLookAtAnchor, 1 - introBlend);
    }
    cameraLookAt.lerp(lookAt, Math.min(1, dt * 6.8));

    const cameraLift = mix(1.5, 1.1, interiorBlend);

    camera.position.set(
      cameraLookAt.x + cameraOrbit.radius * Math.cos(cameraOrbit.theta) * Math.sin(cameraOrbit.phi),
      cameraLookAt.y + cameraOrbit.radius * Math.cos(cameraOrbit.phi) + cameraLift,
      cameraLookAt.z + cameraOrbit.radius * Math.sin(cameraOrbit.theta) * Math.sin(cameraOrbit.phi),
    );
    camera.lookAt(cameraLookAt);

    // Skyline window twinkle.
    for (const strip of districtFx.skylineStrips) {
      const phase = strip.userData.phase ?? 0;
      const speed = strip.userData.speed ?? 2;
      strip.material.opacity = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * speed + phase));
    }

    // Sky haze drift.
    for (const cloud of skyFx.hazeClouds) {
      const speed = cloud.userData.speed ?? 0.16;
      const driftRange = cloud.userData.driftRange ?? 44;
      cloud.position.x += speed * dt;
      if (cloud.position.x > driftRange / 2) {
        cloud.position.x = -driftRange / 2;
      }
      cloud.material.opacity = 0.05 + 0.045 * (0.5 + 0.5 * Math.sin(elapsed + (cloud.userData.phase ?? 0)));
    }
    skyFx.sunDisc.material.opacity = 0.46 + 0.14 * (0.5 + 0.5 * Math.sin(elapsed * 0.45));
    skyFx.sunDisc.position.y = 13 + Math.sin(elapsed * 0.18) * 0.28;

    // HQ interior ambience and office marker animation.
    districtFx.towerGlass.material.opacity = mix(0.58, 0.26, interiorBlend);
    districtFx.towerGlass.material.transmission = mix(0.22, 0.08, interiorBlend);
    districtFx.interior.keyLight.intensity = mix(mobile ? 0.78 : 0.9, mobile ? 1.15 : 1.3, interiorBlend);
    districtFx.interior.monitorLight.intensity = mix(mobile ? 0.45 : 0.56, mobile ? 0.88 : 1.02, interiorBlend);
    districtFx.interior.windowGlow.intensity = mix(mobile ? 0.22 : 0.32, mobile ? 0.42 : 0.54, interiorBlend);

    districtFx.interior.npcMarker.rotation.y += dt * (1.1 + interiorBlend * 1.5);
    districtFx.interior.npcMarker.position.y = 1.92 + Math.sin(elapsed * 3.4) * 0.07;
    districtFx.interior.npcMarker.material.emissiveIntensity =
      0.58 + 0.42 * (0.5 + 0.5 * Math.sin(elapsed * 5.2));
    districtFx.interior.npcRing.material.opacity =
      (0.26 + 0.25 * (0.5 + 0.5 * Math.sin(elapsed * 4.8))) * (0.66 + interiorBlend * 0.5);
    districtFx.interior.npcRing.scale.setScalar(1 + 0.05 * Math.sin(elapsed * 3.7));

    let interiorIndex = 0;
    for (const panel of districtFx.interior.animated) {
      if (panel === districtFx.interior.npcMarker || panel === districtFx.interior.npcRing) {
        continue;
      }
      if (panel.material) {
        panel.material.opacity =
          (0.17 + 0.2 * (0.5 + 0.5 * Math.sin(elapsed * (2.7 + interiorIndex * 0.4)))) *
          (0.72 + interiorBlend * 0.38);
      }
      interiorIndex += 1;
    }

    // Exterior mission buildings: active doorway pulse + entry trigger.
    if (districtFx.missionBuildings) {
      for (const [zoneId, building] of districtFx.missionBuildings.entries()) {
        const isActiveBuilding = !!activeMission && zoneId === activeMission.zone;
        const phase = elapsed * (isActiveBuilding ? 5.6 : 1.7) + zoneId.length;
        const pulse = 0.5 + 0.5 * Math.sin(phase);
        building.signMaterial.emissiveIntensity = isActiveBuilding ? 0.5 + pulse * 0.46 : 0.14 + pulse * 0.08;
        building.entryMarker.material.opacity = isActiveBuilding ? 0.35 + pulse * 0.3 : 0.16;
        building.entryMarker.scale.setScalar(isActiveBuilding ? 1 + pulse * 0.18 : 1);
        building.doorwayGlow.material.opacity = isActiveBuilding ? 0.16 + pulse * 0.2 : 0.07;
        building.lobbyLight.intensity = isActiveBuilding ? (mobile ? 0.56 : 0.72) + pulse * 0.28 : mobile ? 0.28 : 0.35;
      }
    }

    if (
      activeMission &&
      activeMissionEntryPoint &&
      !missionEntryTriggered &&
      missionEntryArmed &&
      !cinematic.introActive &&
      avatar.position.distanceTo(activeMissionEntryPoint) <= activeMissionEntryRadius
    ) {
      missionEntryTriggered = true;
      if (onMissionEntry) {
        onMissionEntry({
          missionId: activeMission.id,
          zone: activeMission.zone,
          role: activeMission.role,
          urgency: activeMission.urgency,
          interior: INTERIOR_ZONES.has(activeMission.zone),
        });
      }
    }

    // Route pulse navigation.
    for (const track of routeTracks) {
      const active = track.role === activeRole;
      let i = 0;
      for (const pulse of track.pulses) {
        if (!active) {
          pulse.visible = false;
          i += 1;
          continue;
        }
        pulse.visible = true;
        const t = (elapsed * 0.18 + pulse.userData.phase + i * 0.06) % 1;
        const p = track.curve.getPointAt(t);
        pulse.position.copy(p);
        pulse.material.opacity = 0.38 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 7 + i));
        i += 1;
      }
    }

    // Zone node animation.
    for (const [zoneId, node] of zoneNodes.entries()) {
      const isActive = activeZone && zoneId === activeZone.name;
      const spinSpeed = isActive ? 1.45 : 0.58;
      node.userData.ring.rotation.z += dt * spinSpeed;
      node.userData.icon.rotation.y += dt * (isActive ? 1.22 : 0.45);

      const bob = Math.sin(elapsed * (isActive ? 4.8 : 1.6) + node.userData.offset) * (isActive ? 0.06 : 0.02);
      node.userData.icon.position.y = 0.78 + bob;

      if (node.userData.label) {
        node.userData.label.position.y = 1.95 + (isActive ? Math.sin(elapsed * 2.8) * 0.06 : 0);
      }

      if (isActive && activeMission?.urgency === "deadline") {
        const pulse = 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 7.4));
        node.userData.base.material.emissiveIntensity = 0.18 + pulse;
        node.userData.halo.material.opacity = 0.28 + pulse * 0.5;
      }
    }

    // Active mission beacon.
    if (activeBeacon.visible) {
      activeBeacon.rotation.x += dt * 1.8;
      activeBeacon.rotation.y += dt * 2.5;
      activeBeacon.position.y =
        (activeZone?.position.y ?? 0.3) + 1.28 + Math.sin(elapsed * 3.6) * 0.08;
      activeBeacon.material.opacity = 0.62 + 0.26 * (0.5 + 0.5 * Math.sin(elapsed * 4.2));
      activeBeacon.material.emissiveIntensity =
        0.24 + 0.38 * (0.5 + 0.5 * Math.sin(elapsed * 5.1));
    }

    // Destination marker visuals.
    if (markerVisible) {
      destinationRing.material.opacity = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * 7));
      destinationRing.scale.setScalar(1 + 0.15 * Math.sin(elapsed * 6.4));
      destinationBeam.material.opacity = 0.08 + 0.14 * (0.5 + 0.5 * Math.sin(elapsed * 4.8));
      destinationBeam.scale.y = 0.92 + 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 5.4));
      destinationRing.position.set(markerTarget.x, 0.04, markerTarget.z);
      destinationBeam.position.set(markerTarget.x, 1.15, markerTarget.z);

      if (avatar.position.distanceTo(markerTarget) < 0.3) {
        markerVisible = false;
      }
    } else {
      destinationRing.material.opacity *= 0.88;
      destinationBeam.material.opacity *= 0.84;
      motionTrail.material.opacity *= 0.92;
    }

    // Role mood lighting transitions.
    roleTintCurrent.lerp(roleTintTarget, Math.min(1, dt * 1.9));
    roleAccent.color.copy(roleTintCurrent);
    roleAccent.intensity = mix(0.65, 0.9, interiorBlend);
    rim.color.copy(roleTintCurrent);
    fogTarget.copy(baseFog).lerp(roleTintCurrent, mix(0.13, 0.07, interiorBlend));
    scene.fog.color.lerp(fogTarget, Math.min(1, dt * 1.3));
    scene.background.copy(scene.fog.color);

    const deadlineBloom = activeMission?.urgency === "deadline" ? (mobile ? 0.62 : 0.82) : (mobile ? 0.45 : 0.62);
    const interiorBloom = mobile ? 0.5 : 0.7;
    bloomPass.strength = mix(bloomPass.strength, mix(deadlineBloom, interiorBloom, interiorBlend), Math.min(1, dt * 2.2));

    composer.render();
    requestAnimationFrame(tick);
  }

  setRouteRole("NONE");
  resize();
  tick();

  return {
    setMission,
    setTeam(teamId) {
      avatarRig.setTeam(teamId);
    },
    dispose() {
      disposed = true;
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", resize);
      composer.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
