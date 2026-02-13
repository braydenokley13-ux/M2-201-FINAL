import * as THREE from "three";

const ROLE_COLORS = {
  AGENT: 0x1f79c8,
  LEAGUE_OFFICE: 0xd08c1c,
  OWNER: 0x1d8a62,
};

const ZONE_META = {
  CAP_LAB: { position: [-12, 0.3, -8], role: "AGENT", icon: "hex" },
  CONTRACT_ROW: { position: [-8, 0.3, 4], role: "AGENT", icon: "diamond" },
  MEDIA_PLAZA: { position: [0, 0.3, -7], role: "LEAGUE_OFFICE", icon: "ring" },
  TRADE_FLOOR: { position: [8, 0.3, -8], role: "AGENT", icon: "arrow" },
  TEAM_FACILITY: { position: [12, 0.3, 4], role: "AGENT", icon: "tower" },
  LEAGUE_OFFICE_FLOOR: { position: [-2, 5.4, 8], role: "LEAGUE_OFFICE", icon: "ring" },
  OWNER_SUITE_FLOOR: { position: [4.5, 9.5, 8], role: "OWNER", icon: "crown" },
  BOARDROOM_FLOOR: { position: [0.7, 13.5, 8], role: "OWNER", icon: "crown" },
};

const ROUTES = {
  AGENT: ["CAP_LAB", "CONTRACT_ROW", "TEAM_FACILITY", "TRADE_FLOOR"],
  LEAGUE_OFFICE: ["MEDIA_PLAZA", "LEAGUE_OFFICE_FLOOR"],
  OWNER: ["OWNER_SUITE_FLOOR", "BOARDROOM_FLOOR"],
};

const ROLE_LIGHT_TINT = {
  AGENT: 0x82c7ff,
  LEAGUE_OFFICE: 0xffd08a,
  OWNER: 0x8ce6c0,
  NONE: 0xbad0e6,
};

const ZONE_LABELS = {
  CAP_LAB: "Cap Lab",
  CONTRACT_ROW: "Contract Row",
  MEDIA_PLAZA: "Media Plaza",
  TRADE_FLOOR: "Trade Floor",
  TEAM_FACILITY: "Team Facility",
  LEAGUE_OFFICE_FLOOR: "League Office",
  OWNER_SUITE_FLOOR: "Owner Suite",
  BOARDROOM_FLOOR: "Boardroom",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeIcon(iconType, colorHex) {
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.4,
    roughness: 0.3,
    emissive: colorHex,
    emissiveIntensity: 0.1,
  });

  switch (iconType) {
    case "diamond":
      return new THREE.Mesh(new THREE.OctahedronGeometry(0.32), material);
    case "ring":
      return new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 12, 24), material);
    case "arrow": {
      const group = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 8), material);
      cone.rotation.x = Math.PI;
      cone.position.y = 0.22;
      group.add(cone);
      return group;
    }
    case "tower": {
      const group = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.28), material);
      box.position.y = 0.24;
      group.add(box);
      return group;
    }
    case "crown": {
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10), material);
      const tip1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), material);
      const tip2 = tip1.clone();
      const tip3 = tip1.clone();
      tip1.position.set(-0.16, 0.16, 0);
      tip2.position.set(0, 0.18, 0);
      tip3.position.set(0.16, 0.16, 0);
      group.add(base, tip1, tip2, tip3);
      return group;
    }
    case "hex":
    default:
      return new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), material);
  }
}

function makeZoneLabelSprite(label, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(6, 20, 32, 0.74)";
  ctx.beginPath();
  const radius = 14;
  const x = 12;
  const y = 10;
  const w = canvas.width - 24;
  const h = canvas.height - 20;
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

  ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = "600 24px Trebuchet MS";
  ctx.fillStyle = "#f5fbff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.6, 0.95, 1);
  return sprite;
}

function makeZoneNode(zoneName, meta) {
  const group = new THREE.Group();
  group.name = zoneName;
  group.position.set(meta.position[0], meta.position[1], meta.position[2]);

  const roleColor = ROLE_COLORS[meta.role] ?? 0x7a8b9c;

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.4, 24),
    new THREE.MeshStandardMaterial({
      color: 0xbfcdd9,
      roughness: 0.7,
      metalness: 0.1,
      emissive: 0x0e1b27,
      emissiveIntensity: 0.06,
    }),
  );
  pedestal.position.y = 0.2;

  const roleRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.08, 12, 28),
    new THREE.MeshStandardMaterial({
      color: roleColor,
      roughness: 0.35,
      metalness: 0.45,
      emissive: roleColor,
      emissiveIntensity: 0.12,
    }),
  );
  roleRing.position.y = 0.52;
  roleRing.rotation.x = Math.PI / 2;

  const icon = makeIcon(meta.icon, roleColor);
  icon.position.y = 0.78;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 1.0, 28),
    new THREE.MeshBasicMaterial({
      color: roleColor,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.03;

  const label = makeZoneLabelSprite(ZONE_LABELS[zoneName] ?? zoneName, roleColor);
  if (label) {
    label.position.set(0, 1.82, 0);
    label.material.opacity = 0.62;
  }

  group.userData = {
    pedestal,
    roleRing,
    icon,
    halo,
    label,
    roleColor,
    role: meta.role,
  };

  group.add(pedestal, roleRing, icon, halo);
  if (label) {
    group.add(label);
  }
  return group;
}

function createPathLine(points, color, width = 0.06) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 28, width, 8, false);
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.26,
    roughness: 0.45,
    metalness: 0.24,
    emissive: color,
    emissiveIntensity: 0.08,
  });
  return new THREE.Mesh(geometry, material);
}

function buildDistrict(scene) {
  const rng = (min, max) => min + Math.random() * (max - min);
  const skylineLights = [];
  const hazeBands = [];
  const accentRoadMaterials = [];

  const groundPattern = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 38, 20, 14),
    new THREE.MeshStandardMaterial({
      color: 0x8ea7b5,
      roughness: 0.93,
      metalness: 0.04,
    }),
  );
  groundPattern.rotation.x = -Math.PI / 2;
  groundPattern.position.y = 0.001;
  scene.add(groundPattern);

  const districtPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 34),
    new THREE.MeshStandardMaterial({ color: 0x6f8798, roughness: 0.95 }),
  );
  districtPlate.rotation.x = -Math.PI / 2;
  districtPlate.position.y = 0.01;
  scene.add(districtPlate);

  for (let i = 0; i < 32; i += 1) {
    const w = rng(1.2, 3.2);
    const d = rng(1.2, 3.4);
    const h = rng(2.2, 9.2);
    const x = rng(-23, 23);
    const z = rng(-15, 16);

    if (Math.abs(x) < 7 && z > -4 && z < 11) {
      continue;
    }

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color: 0x93a8b8,
        roughness: 0.48,
        metalness: 0.22,
        emissive: 0x0d1e30,
        emissiveIntensity: 0.05,
      }),
    );
    body.position.set(x, h / 2, z);
    scene.add(body);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.95, 0.12, d * 0.95),
      new THREE.MeshBasicMaterial({ color: 0xb8d7ee, transparent: true, opacity: 0.35 }),
    );
    strip.position.set(x, h * 0.72, z);
    strip.userData = { twinklePhase: rng(0, Math.PI * 2), twinkleSpeed: rng(1.2, 3.8) };
    skylineLights.push(strip);
    scene.add(strip);
  }

  const avenue = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 4),
    new THREE.MeshStandardMaterial({ color: 0x4a5f70, roughness: 0.94 }),
  );
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(0, 0.03, -2);
  scene.add(avenue);

  const crossRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 30),
    new THREE.MeshStandardMaterial({ color: 0x4a5f70, roughness: 0.94 }),
  );
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.position.set(0, 0.032, 4);
  scene.add(crossRoad);

  const roadLines = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xc9d8e5 }),
  );
  roadLines.rotation.x = -Math.PI / 2;
  roadLines.position.set(0, 0.04, -2);
  scene.add(roadLines);

  const accentRoadA = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 0.32),
    new THREE.MeshBasicMaterial({ color: ROLE_LIGHT_TINT.NONE, transparent: true, opacity: 0.18 }),
  );
  accentRoadA.rotation.x = -Math.PI / 2;
  accentRoadA.position.set(0, 0.041, -2);
  accentRoadMaterials.push(accentRoadA.material);
  scene.add(accentRoadA);

  const accentRoadB = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 30),
    new THREE.MeshBasicMaterial({ color: ROLE_LIGHT_TINT.NONE, transparent: true, opacity: 0.16 }),
  );
  accentRoadB.rotation.x = -Math.PI / 2;
  accentRoadB.position.set(0, 0.042, 4);
  accentRoadMaterials.push(accentRoadB.material);
  scene.add(accentRoadB);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(14, 16.8, 10),
    new THREE.MeshStandardMaterial({ color: 0xc7d3dd, roughness: 0.42, metalness: 0.24 }),
  );
  tower.position.set(2, 8.4, 10);
  scene.add(tower);

  const floorInfos = [
    { y: 5.4, color: 0x7f96aa },
    { y: 9.5, color: 0xaa9355 },
    { y: 13.5, color: 0x6f9d86 },
  ];

  for (const floor of floorInfos) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(14.8, 0.26, 10.8),
      new THREE.MeshStandardMaterial({ color: floor.color, roughness: 0.65 }),
    );
    band.position.set(2, floor.y, 10);
    scene.add(band);
  }

  for (let i = 0; i < 5; i += 1) {
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 8),
      new THREE.MeshBasicMaterial({
        color: 0x97bad6,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    );
    haze.position.set(-18 + i * 9, 3.2 + i * 0.6, -12 + i * 4);
    haze.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.3;
    haze.userData = { drift: 0.16 + i * 0.04, phase: rng(0, Math.PI * 2) };
    hazeBands.push(haze);
    scene.add(haze);
  }

  return {
    skylineLights,
    hazeBands,
    accentRoadMaterials,
  };
}

export function initWorld3D(canvas, config = {}) {
  const mobile = window.matchMedia("(max-width: 960px)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x86a9c3);
  scene.fog = new THREE.Fog(0x86a9c3, 20, 82);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);

  const hemiLight = new THREE.HemisphereLight(0xf0f7ff, 0x425a70, 0.95);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.96);
  dirLight.position.set(14, 20, 10);
  const rimLight = new THREE.DirectionalLight(0xaed4f8, 0.32);
  rimLight.position.set(-16, 6, -10);
  const roleAccentLight = new THREE.PointLight(ROLE_LIGHT_TINT.NONE, 0.38, 80, 2);
  roleAccentLight.position.set(1.6, 6, 2.5);
  scene.add(hemiLight, dirLight, rimLight, roleAccentLight);

  const districtFx = buildDistrict(scene);

  const avatar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 1.15, 5, 12),
    new THREE.MeshStandardMaterial({
      color: config.teamId === "KC" ? 0xc1121f : 0xb3995d,
      roughness: 0.28,
      metalness: 0.26,
    }),
  );
  avatar.position.set(-10, 0.95, -2);
  scene.add(avatar);

  const destinationMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.62, 26),
    new THREE.MeshBasicMaterial({
      color: 0x4fc3ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  destinationMarker.rotation.x = -Math.PI / 2;
  destinationMarker.position.set(avatar.position.x, 0.04, avatar.position.z);
  scene.add(destinationMarker);

  const nextNodeBeacon = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.08, 10, 26),
    new THREE.MeshStandardMaterial({
      color: ROLE_LIGHT_TINT.NONE,
      emissive: ROLE_LIGHT_TINT.NONE,
      emissiveIntensity: 0.28,
      roughness: 0.24,
      metalness: 0.52,
      transparent: true,
      opacity: 0.86,
    }),
  );
  nextNodeBeacon.visible = false;
  scene.add(nextNodeBeacon);

  const zoneNodes = new Map();
  for (const [zone, meta] of Object.entries(ZONE_META)) {
    const node = makeZoneNode(zone, meta);
    zoneNodes.set(zone, node);
    scene.add(node);
  }

  const routeLines = [];
  for (const [role, zones] of Object.entries(ROUTES)) {
    const points = zones
      .map((zone) => ZONE_META[zone]?.position)
      .filter(Boolean)
      .map((entry) => new THREE.Vector3(entry[0], entry[1] + 0.32, entry[2]));
    if (points.length > 1) {
      const line = createPathLine(points, ROLE_COLORS[role] ?? 0x7f93a7, role === "OWNER" ? 0.075 : 0.06);
      line.userData = { role };
      routeLines.push(line);
      scene.add(line);
    }
  }

  let activeMission = null;
  let activeZone = null;
  let moveTarget = avatar.position.clone();
  let markerVisible = false;
  let disposed = false;
  const roleTintCurrent = new THREE.Color(ROLE_LIGHT_TINT.NONE);
  const roleTintTarget = new THREE.Color(ROLE_LIGHT_TINT.NONE);

  const cameraOrbit = {
    radius: mobile ? 14 : 16,
    targetRadius: mobile ? 14 : 16,
    theta: 0.28,
    targetTheta: 0.28,
    phi: mobile ? 0.98 : 0.92,
    targetPhi: mobile ? 0.98 : 0.92,
  };

  const cameraBounds = {
    minPhi: mobile ? 0.55 : 0.42,
    maxPhi: mobile ? 1.2 : 1.36,
    minRadius: mobile ? 10 : 10,
    maxRadius: mobile ? 22 : 28,
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const clickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const clickHit = new THREE.Vector3();

  let dragging = false;
  let movedPx = 0;
  let prevX = 0;
  let prevY = 0;

  function resize() {
    const width = canvas.clientWidth || canvas.parentElement.clientWidth;
    const height = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function setRoleRouteVisual(role) {
    roleTintTarget.setHex(ROLE_LIGHT_TINT[role] ?? ROLE_LIGHT_TINT.NONE);
    for (const line of routeLines) {
      const active = line.userData.role === role;
      line.material.opacity = active ? 0.58 : 0.14;
      line.material.emissiveIntensity = active ? 0.25 : 0.06;
      line.material.color.setHex(ROLE_COLORS[line.userData.role] ?? 0x7f93a7);
    }
    for (const material of districtFx.accentRoadMaterials) {
      material.color.setHex(ROLE_LIGHT_TINT[role] ?? ROLE_LIGHT_TINT.NONE);
      material.opacity = role === "NONE" ? 0.14 : 0.24;
    }
  }

function setNodeVisual(node, roleColor, urgency) {
    const { pedestal, roleRing, icon, halo, label } = node.userData;
    pedestal.material.color.setHex(roleColor);
    pedestal.material.emissive.setHex(urgency === "deadline" ? 0x6b1309 : 0x0e1b27);
    pedestal.material.emissiveIntensity = urgency === "deadline" ? 0.3 : 0.11;

    roleRing.material.color.setHex(roleColor);
    roleRing.material.emissive.setHex(roleColor);
    roleRing.material.emissiveIntensity = urgency === "deadline" ? 0.32 : 0.22;

    icon.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.emissiveIntensity = urgency === "deadline" ? 0.36 : 0.24;
      }
    });

    halo.material.opacity = urgency === "deadline" ? 0.42 : 0.24;
    if (label?.material) {
      label.material.opacity = urgency === "deadline" ? 1 : 0.92;
    }
  }

  function resetNodeVisual(node) {
    const { pedestal, roleRing, icon, halo, label, roleColor } = node.userData;
    pedestal.material.color.setHex(0xbfcdd9);
    pedestal.material.emissive.setHex(0x0e1b27);
    pedestal.material.emissiveIntensity = 0.06;

    roleRing.material.color.setHex(roleColor);
    roleRing.material.emissive.setHex(roleColor);
    roleRing.material.emissiveIntensity = 0.1;

    icon.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.emissiveIntensity = 0.1;
      }
    });

    halo.material.opacity = 0.14;
    if (label?.material) {
      label.material.opacity = 0.62;
    }
  }

  function setMission(mission) {
    activeMission = mission || null;
    for (const node of zoneNodes.values()) {
      resetNodeVisual(node);
    }

    if (!mission) {
      activeZone = null;
      setRoleRouteVisual("NONE");
      nextNodeBeacon.visible = false;
      return;
    }

    setRoleRouteVisual(mission.role);

    const zoneNode = zoneNodes.get(mission.zone);
    activeZone = zoneNode ?? null;
    if (zoneNode) {
      const roleColor = ROLE_COLORS[mission.role] ?? 0x0b5fa8;
      setNodeVisual(zoneNode, roleColor, mission.urgency);
      moveTarget = zoneNode.position.clone();
      moveTarget.y = 0.95;
      destinationMarker.position.set(moveTarget.x, 0.04, moveTarget.z);
      markerVisible = true;
      nextNodeBeacon.visible = true;
      nextNodeBeacon.position.set(zoneNode.position.x, zoneNode.position.y + 1.32, zoneNode.position.z);
      nextNodeBeacon.material.color.setHex(ROLE_LIGHT_TINT[mission.role] ?? ROLE_LIGHT_TINT.NONE);
      nextNodeBeacon.material.emissive.setHex(ROLE_LIGHT_TINT[mission.role] ?? ROLE_LIGHT_TINT.NONE);
    }
  }

  function onPointerDown(event) {
    dragging = true;
    movedPx = 0;
    prevX = event.clientX;
    prevY = event.clientY;
  }

  function onPointerMove(event) {
    if (!dragging) {
      return;
    }
    const dx = event.clientX - prevX;
    const dy = event.clientY - prevY;
    movedPx += Math.abs(dx) + Math.abs(dy);
    prevX = event.clientX;
    prevY = event.clientY;

    cameraOrbit.targetTheta -= dx * 0.0042;
    cameraOrbit.targetPhi = clamp(cameraOrbit.targetPhi + dy * 0.004, cameraBounds.minPhi, cameraBounds.maxPhi);
  }

  function onPointerUp(event) {
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
    if (raycaster.ray.intersectPlane(clickPlane, clickHit)) {
      moveTarget = clickHit.clone();
      moveTarget.y = 0.95;
      moveTarget.x = clamp(moveTarget.x, -20, 20);
      moveTarget.z = clamp(moveTarget.z, -15, 16);
      destinationMarker.position.set(moveTarget.x, 0.04, moveTarget.z);
      markerVisible = true;
    }
  }

  function onWheel(event) {
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
  const baseFogColor = new THREE.Color(0x86a9c3);
  const fogTargetColor = new THREE.Color(0x86a9c3);

  function tick() {
    if (disposed) {
      return;
    }

    const dt = clock.getDelta();
    const elapsed = clock.elapsedTime;

    const toTarget = new THREE.Vector3().subVectors(moveTarget, avatar.position);
    const distance = toTarget.length();
    if (distance > 0.02) {
      toTarget.normalize();
      const speed = activeMission?.urgency === "deadline" ? 9 : 7.2;
      avatar.position.addScaledVector(toTarget, Math.min(distance, dt * speed));
    } else {
      avatar.position.lerp(moveTarget, Math.min(1, dt * 6));
    }

    cameraOrbit.theta += (cameraOrbit.targetTheta - cameraOrbit.theta) * Math.min(1, dt * 7);
    cameraOrbit.phi += (cameraOrbit.targetPhi - cameraOrbit.phi) * Math.min(1, dt * 7);
    cameraOrbit.radius += (cameraOrbit.targetRadius - cameraOrbit.radius) * Math.min(1, dt * 6);

    const lookTarget = avatar.position.clone();
    lookTarget.y += 1.3;

    camera.position.set(
      avatar.position.x + cameraOrbit.radius * Math.cos(cameraOrbit.theta) * Math.sin(cameraOrbit.phi),
      avatar.position.y + cameraOrbit.radius * Math.cos(cameraOrbit.phi) + 3,
      avatar.position.z + cameraOrbit.radius * Math.sin(cameraOrbit.theta) * Math.sin(cameraOrbit.phi),
    );
    camera.lookAt(lookTarget);

    if (activeZone) {
      const roleRing = activeZone.userData.roleRing;
      roleRing.rotation.z += dt * 1.6;
      const pulse =
        activeMission?.urgency === "deadline"
          ? 0.55 + 0.4 * Math.sin(elapsed * 5.8)
          : 0.24 + 0.1 * Math.sin(elapsed * 2.8);
      activeZone.userData.pedestal.material.emissiveIntensity = pulse;
      activeZone.userData.halo.material.opacity = clamp(pulse * 0.7, 0.16, 0.75);
      activeZone.userData.icon.rotation.y += dt * 0.9;
    }

    if (nextNodeBeacon.visible) {
      nextNodeBeacon.rotation.x += dt * 1.8;
      nextNodeBeacon.rotation.y += dt * 2.2;
      nextNodeBeacon.position.y = (activeZone?.position.y ?? 0.3) + 1.32 + Math.sin(elapsed * 3.5) * 0.08;
      nextNodeBeacon.material.opacity = 0.65 + 0.22 * (0.5 + 0.5 * Math.sin(elapsed * 4.7));
      nextNodeBeacon.material.emissiveIntensity = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(elapsed * 5.2));
    }

    for (const strip of districtFx.skylineLights) {
      const phase = strip.userData.twinklePhase ?? 0;
      const speed = strip.userData.twinkleSpeed ?? 2;
      strip.material.opacity = 0.18 + 0.28 * (0.5 + 0.5 * Math.sin(elapsed * speed + phase));
    }

    for (const haze of districtFx.hazeBands) {
      const drift = haze.userData.drift ?? 0.2;
      haze.position.x += dt * drift;
      if (haze.position.x > 24) {
        haze.position.x = -24;
      }
      haze.material.opacity = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(elapsed + (haze.userData.phase ?? 0)));
    }

    roleTintCurrent.lerp(roleTintTarget, Math.min(1, dt * 1.8));
    roleAccentLight.color.copy(roleTintCurrent);
    rimLight.color.copy(roleTintCurrent);
    fogTargetColor.copy(baseFogColor).lerp(roleTintCurrent, 0.16);
    scene.fog.color.lerp(fogTargetColor, Math.min(1, dt * 1.4));
    scene.background.copy(scene.fog.color);

    if (markerVisible) {
      destinationMarker.material.opacity = 0.18 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * 7));
      destinationMarker.scale.setScalar(1 + 0.16 * Math.sin(elapsed * 6));
      if (avatar.position.distanceTo(moveTarget) < 0.28) {
        markerVisible = false;
      }
    } else {
      destinationMarker.material.opacity *= 0.9;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  setRoleRouteVisual("NONE");
  resize();
  tick();

  return {
    setMission,
    setTeam(teamId) {
      avatar.material.color.setHex(teamId === "KC" ? 0xc1121f : 0xb3995d);
    },
    dispose() {
      disposed = true;
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}
