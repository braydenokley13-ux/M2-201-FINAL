import * as THREE from "three";

const ROLE_COLORS = {
  AGENT: 0x0b5fa8,
  LEAGUE_OFFICE: 0xc07d15,
  OWNER: 0x1b7f5d,
};

const ZONE_POSITIONS = {
  CAP_LAB: [-12, 0.3, -8],
  CONTRACT_ROW: [-8, 0.3, 4],
  MEDIA_PLAZA: [0, 0.3, -7],
  TRADE_FLOOR: [8, 0.3, -8],
  TEAM_FACILITY: [12, 0.3, 4],
  LEAGUE_OFFICE_FLOOR: [-2, 5.4, 8],
  OWNER_SUITE_FLOOR: [4.5, 9.5, 8],
  BOARDROOM_FLOOR: [0.7, 13.5, 8],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeZoneNode(zone, position) {
  const group = new THREE.Group();
  group.name = zone;
  group.position.set(position[0], position[1], position[2]);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.4, 20),
    new THREE.MeshStandardMaterial({
      color: 0xc5d3df,
      roughness: 0.7,
      metalness: 0.1,
      emissive: 0x102030,
      emissiveIntensity: 0.05,
    }),
  );
  pedestal.position.y = 0.2;

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xeff6ff,
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x204260,
      emissiveIntensity: 0.2,
    }),
  );
  beacon.position.y = 0.6;

  group.userData = {
    pedestal,
    beacon,
    baseColor: 0xc5d3df,
  };

  group.add(pedestal, beacon);
  return group;
}

function setNodeVisual(node, colorHex, urgency) {
  const pedestal = node.userData.pedestal;
  const beacon = node.userData.beacon;
  pedestal.material.color.setHex(colorHex);
  pedestal.material.emissive.setHex(urgency === "deadline" ? 0x53180e : 0x102030);
  pedestal.material.emissiveIntensity = urgency === "deadline" ? 0.24 : 0.08;

  beacon.material.color.setHex(urgency === "deadline" ? 0xff9f7a : 0xe7f2ff);
  beacon.material.emissive.setHex(urgency === "deadline" ? 0xff6333 : 0x2a5171);
  beacon.material.emissiveIntensity = urgency === "deadline" ? 0.3 : 0.16;
}

function resetNodeVisual(node) {
  const pedestal = node.userData.pedestal;
  const beacon = node.userData.beacon;
  pedestal.material.color.setHex(node.userData.baseColor);
  pedestal.material.emissive.setHex(0x102030);
  pedestal.material.emissiveIntensity = 0.05;

  beacon.material.color.setHex(0xeff6ff);
  beacon.material.emissive.setHex(0x204260);
  beacon.material.emissiveIntensity = 0.2;
}

export function initWorld3D(canvas, config = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a6be);
  scene.fog = new THREE.Fog(0x87a6be, 25, 70);

  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 200);

  const hemiLight = new THREE.HemisphereLight(0xe5f3ff, 0x50697c, 0.95);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 18, 8);
  scene.add(hemiLight, dirLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 38, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x8faa9a, roughness: 0.96, metalness: 0.02 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 4),
    new THREE.MeshStandardMaterial({ color: 0x596778, roughness: 0.95 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.03, -2);
  scene.add(road);

  const crossRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 30),
    new THREE.MeshStandardMaterial({ color: 0x586777, roughness: 0.95 }),
  );
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.position.set(0, 0.031, 4);
  scene.add(crossRoad);

  const towerBase = new THREE.Mesh(
    new THREE.BoxGeometry(14, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xbdc9d4, roughness: 0.52, metalness: 0.12 }),
  );
  towerBase.position.set(2, 8, 10);
  scene.add(towerBase);

  const floorBands = [];
  const floorYs = [5.4, 9.5, 13.5];
  for (const y of floorYs) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(14.6, 0.25, 10.6),
      new THREE.MeshStandardMaterial({ color: 0xa5b5c4, roughness: 0.8 }),
    );
    band.position.set(2, y, 10);
    floorBands.push(band);
    scene.add(band);
  }

  const avatar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.36, 1.1, 4, 12),
    new THREE.MeshStandardMaterial({ color: config.teamId === "KC" ? 0xc1121f : 0xb3995d, roughness: 0.36 }),
  );
  avatar.position.set(-10, 0.95, -2);
  scene.add(avatar);

  const zoneNodes = new Map();
  for (const [zone, pos] of Object.entries(ZONE_POSITIONS)) {
    const node = makeZoneNode(zone, pos);
    zoneNodes.set(zone, node);
    scene.add(node);
  }

  let activeMission = null;
  let activeZone = null;
  let moveTarget = avatar.position.clone();
  let disposed = false;

  const cameraOrbit = {
    radius: 16,
    theta: 0.2,
    phi: 0.92,
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

  function setMission(mission) {
    activeMission = mission || null;
    for (const node of zoneNodes.values()) {
      resetNodeVisual(node);
    }

    if (!mission) {
      activeZone = null;
      return;
    }

    const zoneNode = zoneNodes.get(mission.zone);
    activeZone = zoneNode ?? null;
    if (zoneNode) {
      const roleColor = ROLE_COLORS[mission.role] ?? 0x0b5fa8;
      setNodeVisual(zoneNode, roleColor, mission.urgency);
      moveTarget = zoneNode.position.clone();
      moveTarget.y = 0.95;
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

    cameraOrbit.theta -= dx * 0.0045;
    cameraOrbit.phi = clamp(cameraOrbit.phi + dy * 0.0045, 0.3, 1.42);
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
    }
  }

  function onWheel(event) {
    event.preventDefault();
    cameraOrbit.radius = clamp(cameraOrbit.radius + event.deltaY * 0.01, 10, 28);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();

  function tick() {
    if (disposed) {
      return;
    }

    const dt = clock.getDelta();

    const toTarget = new THREE.Vector3().subVectors(moveTarget, avatar.position);
    const distance = toTarget.length();
    if (distance > 0.02) {
      toTarget.normalize();
      avatar.position.addScaledVector(toTarget, Math.min(distance, dt * 7.4));
    }

    const lookTarget = avatar.position.clone();
    lookTarget.y += 1.2;

    camera.position.set(
      avatar.position.x + cameraOrbit.radius * Math.cos(cameraOrbit.theta) * Math.sin(cameraOrbit.phi),
      avatar.position.y + cameraOrbit.radius * Math.cos(cameraOrbit.phi) + 3,
      avatar.position.z + cameraOrbit.radius * Math.sin(cameraOrbit.theta) * Math.sin(cameraOrbit.phi),
    );
    camera.lookAt(lookTarget);

    if (activeZone && activeMission?.urgency === "deadline") {
      const pulse = 0.45 + 0.35 * Math.sin(clock.elapsedTime * 4.8);
      activeZone.userData.pedestal.material.emissiveIntensity = pulse;
      activeZone.userData.beacon.material.emissiveIntensity = 0.4 + pulse * 0.3;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

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
