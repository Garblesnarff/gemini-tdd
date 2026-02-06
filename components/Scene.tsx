
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars, Sky, Environment, Box, Cylinder, Sphere, Float, Sparkles, Icosahedron, Ring, Html, Text, Billboard, Line, Octahedron } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, TowerType, Vector3Tuple, EnemyType, Tower, Enemy, TechPath, Effect, PassiveType, ActiveAbilityType, Boss, StageEnvironment, DamageNumber, Hazard, SupplyDrop } from '../types';
import { GRID_SIZE, TOWER_STATS, ENEMY_STATS, TECH_PATH_INFO, PASSIVE_CONFIG } from '../constants';

interface SceneProps {
  gameState: GameState;
  onPlaceTower: (pos: Vector3Tuple) => void;
  onSelectTower: (id: string | null) => void;
  selectedTowerType: TowerType;
  pendingPlacement: Vector3Tuple | null;
  paths: Vector3Tuple[][];
  environment: StageEnvironment;
  onCollectSupplyDrop: (id: string) => void;
}

// --- VISUAL CONSTANTS & BUILDERS ---

const BLUE = 0x3b82f6;
const BLUE_LIGHT = 0x60a5fa;
const BLUE_DARK = 0x1e40af;
const SLATE = 0x1e293b;
const SLATE_LIGHT = 0x334155;

const RED = 0xef4444;
const RED_LIGHT = 0xfca5a5;
const RED_DARK = 0xb91c1c;

const GREEN = 0x10b981;
const GREEN_LIGHT = 0x6ee7b7;
const GREEN_DARK = 0x059669;

const AMBER = 0xf59e0b;
const AMBER_LIGHT = 0xfcd34d;
const AMBER_DARK = 0xd97706;

function buildBasicL1() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: BLUE, 
    emissive: BLUE, 
    emissiveIntensity: 0.1,
    metalness: 0.6,
    roughness: 0.4
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: BLUE_LIGHT, 
    emissive: BLUE_LIGHT, 
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9
  });

  const base = new THREE.Group();

  const platformGeo = new THREE.CylinderGeometry(0.6, 0.65, 0.12, 6);
  const platform = new THREE.Mesh(platformGeo, matDark);
  platform.position.y = 0.06;
  base.add(platform);

  const edgeGeo = new THREE.TorusGeometry(0.58, 0.02, 6, 6);
  const edge = new THREE.Mesh(edgeGeo, matGlow);
  edge.position.y = 0.12;
  edge.rotation.x = Math.PI / 2;
  base.add(edge);

  const bodyGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.5, 8);
  const body = new THREE.Mesh(bodyGeo, matBody);
  body.position.y = 0.37;
  base.add(body);

  const ringGeo = new THREE.TorusGeometry(0.34, 0.025, 8, 8);
  const ring = new THREE.Mesh(ringGeo, matGlow);
  ring.position.y = 0.37;
  ring.rotation.x = Math.PI / 2;
  base.add(ring);

  const socketGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.08, 12);
  const socket = new THREE.Mesh(socketGeo, matDark);
  socket.position.y = 0.66;
  base.add(socket);

  group.add(base);

  const turret = new THREE.Group();

  const housingGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.22, 8);
  const housing = new THREE.Mesh(housingGeo, matBody);
  housing.position.y = 0.11;
  turret.add(housing);

  const domeGeo = new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, matBody);
  dome.position.y = 0.22;
  turret.add(dome);

  const barrelGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.38, 8);
  const barrel = new THREE.Mesh(barrelGeo, matBody);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.14, 0.26);
  turret.add(barrel);

  const shroudGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.08, 8);
  const shroud = new THREE.Mesh(shroudGeo, matDark);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.set(0, 0.14, 0.12);
  turret.add(shroud);

  const tipGeo = new THREE.SphereGeometry(0.065, 10, 8);
  const tip = new THREE.Mesh(tipGeo, matGlow);
  tip.position.set(0, 0.14, 0.47);
  turret.add(tip);

  turret.position.y = 0.7;
  group.add(turret);

  group.userData = { turret, animatedParts: [tip] };
  return group;
}

function buildBasicL2() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: BLUE, 
    emissive: BLUE, 
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.35
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: SLATE_LIGHT, 
    metalness: 0.7, 
    roughness: 0.4 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: BLUE_LIGHT, 
    emissive: BLUE_LIGHT, 
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: BLUE_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.95
  });

  const base = new THREE.Group();

  const platformGeo = new THREE.CylinderGeometry(0.65, 0.72, 0.15, 6);
  const platform = new THREE.Mesh(platformGeo, matDark);
  platform.position.y = 0.075;
  base.add(platform);

  const topPlateGeo = new THREE.CylinderGeometry(0.6, 0.65, 0.04, 6);
  const topPlate = new THREE.Mesh(topPlateGeo, matAccent);
  topPlate.position.y = 0.17;
  base.add(topPlate);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6);
    const bolt = new THREE.Mesh(boltGeo, matGlow);
    bolt.position.set(Math.cos(angle) * 0.55, 0.18, Math.sin(angle) * 0.55);
    base.add(bolt);
  }

  const bodyGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.55, 8);
  const body = new THREE.Mesh(bodyGeo, matBody);
  body.position.y = 0.47;
  base.add(body);

  for (let i = 0; i < 3; i++) {
    const lineGeo = new THREE.TorusGeometry(0.38 - i * 0.015, 0.012, 4, 8);
    const line = new THREE.Mesh(lineGeo, matDark);
    line.position.y = 0.32 + i * 0.15;
    line.rotation.x = Math.PI / 2;
    base.add(line);
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const conduitGeo = new THREE.BoxGeometry(0.03, 0.45, 0.06);
    const conduit = new THREE.Mesh(conduitGeo, matGlow);
    conduit.position.set(Math.cos(angle) * 0.39, 0.45, Math.sin(angle) * 0.39);
    conduit.rotation.y = -angle;
    base.add(conduit);
  }

  const midRingGeo = new THREE.TorusGeometry(0.42, 0.03, 8, 16);
  const midRing = new THREE.Mesh(midRingGeo, matGlow);
  midRing.position.y = 0.5;
  midRing.rotation.x = Math.PI / 2;
  base.add(midRing);

  const mountGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.1, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.79;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const lowerGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.18, 8);
  const lower = new THREE.Mesh(lowerGeo, matBody);
  lower.position.y = 0.09;
  turret.add(lower);

  const upperGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.16, 8);
  const upper = new THREE.Mesh(upperGeo, matBody);
  upper.position.y = 0.26;
  turret.add(upper);

  const capGeo = new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, matBody);
  cap.position.y = 0.34;
  turret.add(cap);

  const sensorGroup = new THREE.Group();
  const sensorBaseGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8);
  const sensorBase = new THREE.Mesh(sensorBaseGeo, matDark);
  sensorGroup.add(sensorBase);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const dishGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.03, 6);
    const dish = new THREE.Mesh(dishGeo, matGlow);
    dish.position.set(Math.cos(angle) * 0.1, 0, Math.sin(angle) * 0.1);
    dish.rotation.z = Math.cos(angle) * 0.5;
    dish.rotation.x = -Math.sin(angle) * 0.5;
    sensorGroup.add(dish);
  }
  sensorGroup.position.y = 0.52;
  turret.add(sensorGroup);

  const barrelHousingGeo = new THREE.BoxGeometry(0.16, 0.14, 0.2);
  const barrelHousing = new THREE.Mesh(barrelHousingGeo, matBody);
  barrelHousing.position.set(0, 0.18, 0.18);
  turret.add(barrelHousing);

  for (const offset of [-0.04, 0.04]) {
    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8);
    const barrel = new THREE.Mesh(barrelGeo, matBody);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(offset, 0.18, 0.38);
    turret.add(barrel);

    const tipGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.04, 8);
    const tip = new THREE.Mesh(tipGeo, matGlow);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(offset, 0.18, 0.6);
    turret.add(tip);
  }

  const coreGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const core = new THREE.Mesh(coreGeo, matCore);
  core.position.set(0, 0.18, 0.32);
  turret.add(core);

  for (const side of [-1, 1]) {
    const ventGeo = new THREE.BoxGeometry(0.04, 0.08, 0.12);
    const vent = new THREE.Mesh(ventGeo, matDark);
    vent.position.set(side * 0.26, 0.15, 0.05);
    turret.add(vent);

    for (let i = 0; i < 3; i++) {
      const stripGeo = new THREE.BoxGeometry(0.045, 0.012, 0.02);
      const strip = new THREE.Mesh(stripGeo, matGlow);
      strip.position.set(side * 0.26, 0.12 + i * 0.025, 0.05);
      turret.add(strip);
    }
  }

  turret.position.y = 0.84;
  group.add(turret);

  group.userData = { 
    turret, 
    sensorGroup,
    animatedParts: [core, midRing]
  };
  return group;
}

function buildBasicL3() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: BLUE, 
    emissive: BLUE, 
    emissiveIntensity: 0.2,
    metalness: 0.75,
    roughness: 0.3
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.85, 
    roughness: 0.25 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: BLUE_DARK, 
    emissive: BLUE_DARK, 
    emissiveIntensity: 0.1,
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: BLUE_LIGHT, 
    emissive: BLUE_LIGHT, 
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: BLUE_LIGHT, 
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 1.0
  });
  const matOrbital = new THREE.MeshStandardMaterial({ 
    color: BLUE_LIGHT, 
    emissive: BLUE_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85
  });

  const base = new THREE.Group();

  const platform1Geo = new THREE.CylinderGeometry(0.75, 0.82, 0.1, 6);
  const platform1 = new THREE.Mesh(platform1Geo, matDark);
  platform1.position.y = 0.05;
  base.add(platform1);

  const platform2Geo = new THREE.CylinderGeometry(0.68, 0.75, 0.08, 6);
  const platform2 = new THREE.Mesh(platform2Geo, matAccent);
  platform2.position.y = 0.14;
  base.add(platform2);

  const platform3Geo = new THREE.CylinderGeometry(0.62, 0.68, 0.06, 6);
  const platform3 = new THREE.Mesh(platform3Geo, matDark);
  platform3.position.y = 0.21;
  base.add(platform3);

  const baseRingGeo = new THREE.TorusGeometry(0.7, 0.025, 8, 12);
  const baseRing = new THREE.Mesh(baseRingGeo, matGlow);
  baseRing.position.y = 0.1;
  baseRing.rotation.x = Math.PI / 2;
  base.add(baseRing);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const pylonGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
    const pylon = new THREE.Mesh(pylonGeo, matBody);
    pylon.position.set(Math.cos(angle) * 0.6, 0.27, Math.sin(angle) * 0.6);
    base.add(pylon);

    const pylonTopGeo = new THREE.BoxGeometry(0.06, 0.03, 0.06);
    const pylonTop = new THREE.Mesh(pylonTopGeo, matGlow);
    pylonTop.position.set(Math.cos(angle) * 0.6, 0.38, Math.sin(angle) * 0.6);
    base.add(pylonTop);
  }

  const body1Geo = new THREE.CylinderGeometry(0.42, 0.5, 0.35, 8);
  const body1 = new THREE.Mesh(body1Geo, matBody);
  body1.position.y = 0.42;
  base.add(body1);

  const body2Geo = new THREE.CylinderGeometry(0.38, 0.42, 0.3, 8);
  const body2 = new THREE.Mesh(body2Geo, matBody);
  body2.position.y = 0.74;
  base.add(body2);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const panelGeo = new THREE.BoxGeometry(0.18, 0.5, 0.03);
    const panel = new THREE.Mesh(panelGeo, matAccent);
    panel.position.set(Math.cos(angle) * 0.44, 0.55, Math.sin(angle) * 0.44);
    panel.rotation.y = -angle;
    base.add(panel);
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const conduitGeo = new THREE.BoxGeometry(0.04, 0.55, 0.07);
    const conduit = new THREE.Mesh(conduitGeo, matGlow);
    conduit.position.set(Math.cos(angle) * 0.46, 0.55, Math.sin(angle) * 0.46);
    conduit.rotation.y = -angle;
    base.add(conduit);
  }

  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(0.46 - i * 0.03, 0.02, 8, 16);
    const ring = new THREE.Mesh(ringGeo, matGlow);
    ring.position.y = 0.35 + i * 0.22;
    ring.rotation.x = Math.PI / 2;
    base.add(ring);
  }

  const mountGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.12, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.95;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const tier1Geo = new THREE.CylinderGeometry(0.28, 0.32, 0.16, 10);
  const tier1 = new THREE.Mesh(tier1Geo, matBody);
  tier1.position.y = 0.08;
  turret.add(tier1);

  const tier2Geo = new THREE.CylinderGeometry(0.22, 0.28, 0.14, 10);
  const tier2 = new THREE.Mesh(tier2Geo, matBody);
  tier2.position.y = 0.23;
  turret.add(tier2);

  const tier3Geo = new THREE.CylinderGeometry(0.16, 0.22, 0.12, 10);
  const tier3 = new THREE.Mesh(tier3Geo, matBody);
  tier3.position.y = 0.36;
  turret.add(tier3);

  const coreHousingGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.22, 12);
  const coreHousingMat = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.9, 
    roughness: 0.2,
    transparent: true,
    opacity: 0.6
  });
  const coreHousing = new THREE.Mesh(coreHousingGeo, coreHousingMat);
  coreHousing.position.y = 0.53;
  turret.add(coreHousing);

  const coreGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const core = new THREE.Mesh(coreGeo, matCore);
  core.position.y = 0.53;
  turret.add(core);

  const coreInnerGeo = new THREE.IcosahedronGeometry(0.05, 0);
  const coreInner = new THREE.Mesh(coreInnerGeo, matOrbital);
  coreInner.position.y = 0.53;
  turret.add(coreInner);

  const cannonBaseGeo = new THREE.BoxGeometry(0.24, 0.2, 0.28);
  const cannonBase = new THREE.Mesh(cannonBaseGeo, matBody);
  cannonBase.position.set(0, 0.22, 0.22);
  turret.add(cannonBase);

  const barrelPositions = [[0, 0.05], [-0.055, -0.04], [0.055, -0.04]];
  barrelPositions.forEach(([ox, oy]) => {
    const barrelGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.5, 8);
    const barrel = new THREE.Mesh(barrelGeo, matBody);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(ox, 0.22 + oy, 0.46);
    turret.add(barrel);

    for (let r = 0; r < 2; r++) {
      const ringGeo = new THREE.TorusGeometry(0.05, 0.01, 6, 8);
      const ring = new THREE.Mesh(ringGeo, matGlow);
      ring.position.set(ox, 0.22 + oy, 0.28 + r * 0.2);
      turret.add(ring);
    }

    const tipGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.05, 8);
    const tip = new THREE.Mesh(tipGeo, matGlow);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(ox, 0.22 + oy, 0.73);
    turret.add(tip);
  });

  const lensGeo = new THREE.SphereGeometry(0.04, 10, 10);
  const lens = new THREE.Mesh(lensGeo, matCore);
  lens.position.set(0, 0.2, 0.5);
  turret.add(lens);

  for (const side of [-1, 1]) {
    const podGeo = new THREE.BoxGeometry(0.1, 0.12, 0.18);
    const pod = new THREE.Mesh(podGeo, matBody);
    pod.position.set(side * 0.32, 0.18, 0.12);
    turret.add(pod);

    const podBarrelGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.2, 6);
    const podBarrel = new THREE.Mesh(podBarrelGeo, matDark);
    podBarrel.rotation.x = Math.PI / 2;
    podBarrel.position.set(side * 0.32, 0.18, 0.28);
    turret.add(podBarrel);

    const ventGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const vent = new THREE.Mesh(ventGeo, matGlow);
    vent.position.set(side * 0.32, 0.18, 0.02);
    turret.add(vent);
  }

  const sensorDomeGeo = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const sensorDome = new THREE.Mesh(sensorDomeGeo, matAccent);
  sensorDome.position.y = 0.64;
  turret.add(sensorDome);

  const sensorGroup = new THREE.Group();
  const sensorPostGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6);
  const sensorPost = new THREE.Mesh(sensorPostGeo, matDark);
  sensorGroup.add(sensorPost);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const scannerGeo = new THREE.BoxGeometry(0.015, 0.04, 0.06);
    const scanner = new THREE.Mesh(scannerGeo, matGlow);
    scanner.position.set(Math.cos(angle) * 0.06, 0.04, Math.sin(angle) * 0.06);
    scanner.rotation.y = -angle;
    sensorGroup.add(scanner);
  }
  sensorGroup.position.y = 0.76;
  turret.add(sensorGroup);

  turret.position.y = 1.01;
  group.add(turret);

  const orbitals = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const orbitalGeo = new THREE.OctahedronGeometry(0.06, 0);
    const orbital = new THREE.Mesh(orbitalGeo, matOrbital);
    orbital.userData.orbitIndex = i;
    orbitals.add(orbital);
  }
  orbitals.position.y = 1.35;
  group.add(orbitals);

  const fieldRingGeo = new THREE.TorusGeometry(0.4, 0.015, 8, 24);
  const fieldRing = new THREE.Mesh(fieldRingGeo, matGlow);
  fieldRing.position.y = 1.35;
  fieldRing.rotation.x = Math.PI / 2;
  group.add(fieldRing);

  group.userData = { 
    turret, 
    sensorGroup,
    orbitals,
    core,
    coreInner,
    fieldRing,
    animatedParts: [core, coreInner, lens]
  };
  return group;
}

function buildSniperL1() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: RED, 
    emissive: RED, 
    emissiveIntensity: 0.1,
    metalness: 0.6,
    roughness: 0.4
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: RED_LIGHT, 
    emissive: RED_LIGHT, 
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9
  });

  const base = new THREE.Group();

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 - Math.PI / 6;
    const legGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.5, 6);
    const leg = new THREE.Mesh(legGeo, matDark);
    leg.position.set(Math.cos(angle) * 0.28, 0.2, Math.sin(angle) * 0.28);
    leg.rotation.z = Math.cos(angle) * 0.35;
    leg.rotation.x = -Math.sin(angle) * 0.35;
    base.add(leg);

    const footGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.04, 6);
    const foot = new THREE.Mesh(footGeo, matDark);
    foot.position.set(Math.cos(angle) * 0.48, 0.02, Math.sin(angle) * 0.48);
    base.add(foot);

    const footRingGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 6);
    const footRing = new THREE.Mesh(footRingGeo, matGlow);
    footRing.position.set(Math.cos(angle) * 0.48, 0.045, Math.sin(angle) * 0.48);
    footRing.rotation.x = Math.PI / 2;
    base.add(footRing);
  }

  const columnGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.6, 6);
  const column = new THREE.Mesh(columnGeo, matBody);
  column.position.y = 0.45;
  base.add(column);

  const colRingGeo = new THREE.TorusGeometry(0.16, 0.02, 6, 6);
  const colRing = new THREE.Mesh(colRingGeo, matGlow);
  colRing.position.y = 0.45;
  colRing.rotation.x = Math.PI / 2;
  base.add(colRing);

  const mountGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.08, 8);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.79;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const housingGeo = new THREE.BoxGeometry(0.2, 0.18, 0.24);
  const housing = new THREE.Mesh(housingGeo, matBody);
  housing.position.y = 0.09;
  turret.add(housing);

  const barrelGroup = new THREE.Group();
  barrelGroup.position.set(0, 0.12, 0);

  const barrelGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.85, 8);
  const barrel = new THREE.Mesh(barrelGeo, matBody);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.42;
  barrelGroup.add(barrel);

  const shroudGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8);
  const shroud = new THREE.Mesh(shroudGeo, matDark);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.z = 0.08;
  barrelGroup.add(shroud);

  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(0.065, 0.012, 6, 8);
    const ring = new THREE.Mesh(ringGeo, matGlow);
    ring.position.z = 0.2 + i * 0.22;
    barrelGroup.add(ring);
  }

  const muzzleGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.06, 8);
  const muzzle = new THREE.Mesh(muzzleGeo, matGlow);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.z = 0.87;
  barrelGroup.add(muzzle);

  turret.add(barrelGroup);
  turret.userData.barrelGroup = barrelGroup;

  const scopeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6);
  const scope = new THREE.Mesh(scopeGeo, matDark);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0.09, 0.16, 0.15);
  turret.add(scope);

  const lensGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8);
  const lens = new THREE.Mesh(lensGeo, matGlow);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.09, 0.16, 0.26);
  turret.add(lens);

  const counterGeo = new THREE.BoxGeometry(0.12, 0.1, 0.14);
  const counter = new THREE.Mesh(counterGeo, matDark);
  counter.position.set(0, 0.08, -0.16);
  turret.add(counter);

  turret.position.y = 0.83;
  group.add(turret);

  group.userData = { turret, barrelGroup, animatedParts: [muzzle] };
  return group;
}

function buildSniperL2() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: RED, 
    emissive: RED, 
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.35
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: SLATE_LIGHT, 
    metalness: 0.7, 
    roughness: 0.4 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: RED_LIGHT, 
    emissive: RED_LIGHT, 
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: RED_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.95
  });

  const base = new THREE.Group();

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 - Math.PI / 6;
    
    const legGeo = new THREE.CylinderGeometry(0.05, 0.065, 0.55, 6);
    const leg = new THREE.Mesh(legGeo, matDark);
    leg.position.set(Math.cos(angle) * 0.32, 0.22, Math.sin(angle) * 0.32);
    leg.rotation.z = Math.cos(angle) * 0.32;
    leg.rotation.x = -Math.sin(angle) * 0.32;
    base.add(leg);

    const plateLegGeo = new THREE.BoxGeometry(0.08, 0.35, 0.03);
    const plateLeg = new THREE.Mesh(plateLegGeo, matBody);
    plateLeg.position.set(Math.cos(angle) * 0.35, 0.25, Math.sin(angle) * 0.35);
    plateLeg.rotation.y = -angle;
    plateLeg.rotation.z = Math.cos(angle) * 0.32;
    plateLeg.rotation.x = -Math.sin(angle) * 0.32;
    base.add(plateLeg);

    const footGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.05, 6);
    const foot = new THREE.Mesh(footGeo, matDark);
    foot.position.set(Math.cos(angle) * 0.54, 0.025, Math.sin(angle) * 0.54);
    base.add(foot);

    const spikeGeo = new THREE.ConeGeometry(0.03, 0.08, 4);
    const spike = new THREE.Mesh(spikeGeo, matAccent);
    spike.position.set(Math.cos(angle) * 0.54, -0.02, Math.sin(angle) * 0.54);
    spike.rotation.x = Math.PI;
    base.add(spike);

    const padGeo = new THREE.TorusGeometry(0.09, 0.018, 6, 6);
    const pad = new THREE.Mesh(padGeo, matGlow);
    pad.position.set(Math.cos(angle) * 0.54, 0.055, Math.sin(angle) * 0.54);
    pad.rotation.x = Math.PI / 2;
    base.add(pad);
  }

  const col1Geo = new THREE.CylinderGeometry(0.16, 0.22, 0.4, 6);
  const col1 = new THREE.Mesh(col1Geo, matBody);
  col1.position.y = 0.35;
  base.add(col1);

  const col2Geo = new THREE.CylinderGeometry(0.14, 0.16, 0.35, 6);
  const col2 = new THREE.Mesh(col2Geo, matBody);
  col2.position.y = 0.72;
  base.add(col2);

  for (let i = 0; i < 2; i++) {
    const bandGeo = new THREE.TorusGeometry(0.18 - i * 0.03, 0.022, 6, 6);
    const band = new THREE.Mesh(bandGeo, matGlow);
    band.position.y = 0.4 + i * 0.35;
    band.rotation.x = Math.PI / 2;
    base.add(band);
  }

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const conduitGeo = new THREE.BoxGeometry(0.025, 0.5, 0.04);
    const conduit = new THREE.Mesh(conduitGeo, matGlow);
    conduit.position.set(Math.cos(angle) * 0.17, 0.52, Math.sin(angle) * 0.17);
    conduit.rotation.y = -angle;
    base.add(conduit);
  }

  const mountGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.1, 10);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.94;
  base.add(mount);

  const mountRingGeo = new THREE.TorusGeometry(0.17, 0.015, 6, 10);
  const mountRing = new THREE.Mesh(mountRingGeo, matGlow);
  mountRing.position.y = 0.99;
  mountRing.rotation.x = Math.PI / 2;
  base.add(mountRing);

  group.add(base);

  const turret = new THREE.Group();

  const housingGeo = new THREE.BoxGeometry(0.26, 0.22, 0.32);
  const housing = new THREE.Mesh(housingGeo, matBody);
  housing.position.y = 0.11;
  turret.add(housing);

  const topPlateGeo = new THREE.BoxGeometry(0.24, 0.02, 0.28);
  const topPlate = new THREE.Mesh(topPlateGeo, matAccent);
  topPlate.position.y = 0.23;
  turret.add(topPlate);

  const barrelGroup = new THREE.Group();
  barrelGroup.position.set(0, 0.14, 0);

  const barrelGeo = new THREE.CylinderGeometry(0.04, 0.055, 1.0, 8);
  const barrel = new THREE.Mesh(barrelGeo, matBody);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.52;
  barrelGroup.add(barrel);

  const jacketGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.2, 8);
  const jacket = new THREE.Mesh(jacketGeo, matDark);
  jacket.rotation.x = Math.PI / 2;
  jacket.position.z = 0.12;
  barrelGroup.add(jacket);

  for (let i = 0; i < 2; i++) {
    const coilGeo = new THREE.TorusGeometry(0.085, 0.02, 8, 12);
    const coil = new THREE.Mesh(coilGeo, matBody);
    coil.position.z = 0.35 + i * 0.3;
    barrelGroup.add(coil);

    const energyGeo = new THREE.TorusGeometry(0.075, 0.012, 6, 12);
    const energy = new THREE.Mesh(energyGeo, matGlow);
    energy.position.z = 0.35 + i * 0.3;
    barrelGroup.add(energy);
  }

  for (let i = 0; i < 4; i++) {
    const ringGeo = new THREE.TorusGeometry(0.055, 0.01, 6, 8);
    const ring = new THREE.Mesh(ringGeo, matGlow);
    ring.position.z = 0.25 + i * 0.2;
    barrelGroup.add(ring);
  }

  const muzzle1Geo = new THREE.CylinderGeometry(0.05, 0.04, 0.08, 8);
  const muzzle1 = new THREE.Mesh(muzzle1Geo, matDark);
  muzzle1.rotation.x = Math.PI / 2;
  muzzle1.position.z = 1.04;
  barrelGroup.add(muzzle1);

  const muzzle2Geo = new THREE.CylinderGeometry(0.055, 0.05, 0.04, 8);
  const muzzle2 = new THREE.Mesh(muzzle2Geo, matGlow);
  muzzle2.rotation.x = Math.PI / 2;
  muzzle2.position.z = 1.1;
  barrelGroup.add(muzzle2);

  const coreGeo = new THREE.SphereGeometry(0.035, 10, 10);
  const core = new THREE.Mesh(coreGeo, matCore);
  core.position.z = 0.08;
  barrelGroup.add(core);

  turret.add(barrelGroup);
  turret.userData.barrelGroup = barrelGroup;

  const scopeBaseGeo = new THREE.BoxGeometry(0.08, 0.06, 0.12);
  const scopeBase = new THREE.Mesh(scopeBaseGeo, matDark);
  scopeBase.position.set(0.12, 0.2, 0.1);
  turret.add(scopeBase);

  const scopeTubeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8);
  const scopeTube = new THREE.Mesh(scopeTubeGeo, matDark);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0.12, 0.23, 0.18);
  turret.add(scopeTube);

  const frontLensGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.015, 8);
  const frontLens = new THREE.Mesh(frontLensGeo, matGlow);
  frontLens.rotation.x = Math.PI / 2;
  frontLens.position.set(0.12, 0.23, 0.32);
  turret.add(frontLens);

  const rearLensGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.015, 8);
  const rearLens = new THREE.Mesh(rearLensGeo, matGlow);
  rearLens.rotation.x = Math.PI / 2;
  rearLens.position.set(0.12, 0.23, 0.04);
  turret.add(rearLens);

  const rangeGeo = new THREE.BoxGeometry(0.04, 0.03, 0.08);
  const range = new THREE.Mesh(rangeGeo, matBody);
  range.position.set(-0.12, 0.2, 0.2);
  turret.add(range);

  const rangeLensGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 6);
  const rangeLens = new THREE.Mesh(rangeLensGeo, matGlow);
  rangeLens.rotation.x = Math.PI / 2;
  rangeLens.position.set(-0.12, 0.2, 0.25);
  turret.add(rangeLens);

  const packGeo = new THREE.BoxGeometry(0.16, 0.14, 0.18);
  const pack = new THREE.Mesh(packGeo, matDark);
  pack.position.set(0, 0.08, -0.22);
  turret.add(pack);

  for (let i = 0; i < 4; i++) {
    const stripGeo = new THREE.BoxGeometry(0.12, 0.015, 0.02);
    const strip = new THREE.Mesh(stripGeo, matGlow);
    strip.position.set(0, 0.02 + i * 0.03, -0.32);
    turret.add(strip);
  }

  for (const side of [-1, 1]) {
    const ventGeo = new THREE.BoxGeometry(0.03, 0.1, 0.14);
    const vent = new THREE.Mesh(ventGeo, matDark);
    vent.position.set(side * 0.15, 0.08, 0.02);
    turret.add(vent);

    for (let i = 0; i < 4; i++) {
      const slotGeo = new THREE.BoxGeometry(0.035, 0.012, 0.025);
      const slot = new THREE.Mesh(slotGeo, matGlow);
      slot.position.set(side * 0.15, 0.03 + i * 0.025, 0.02);
      turret.add(slot);
    }
  }

  turret.position.y = 0.99;
  group.add(turret);

  group.userData = { 
    turret, 
    barrelGroup,
    core,
    animatedParts: [core, muzzle2, frontLens]
  };
  return group;
}

function buildSniperL3() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: RED, 
    emissive: RED, 
    emissiveIntensity: 0.2,
    metalness: 0.75,
    roughness: 0.3
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.85, 
    roughness: 0.25 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: RED_DARK, 
    emissive: RED_DARK, 
    emissiveIntensity: 0.1,
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: RED_LIGHT, 
    emissive: RED_LIGHT, 
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: RED_LIGHT, 
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 1.0
  });
  const matDrone = new THREE.MeshStandardMaterial({ 
    color: RED_LIGHT, 
    emissive: RED_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85
  });

  const base = new THREE.Group();

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 - Math.PI / 6;
    
    const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6);
    const leg = new THREE.Mesh(legGeo, matDark);
    leg.position.set(Math.cos(angle) * 0.35, 0.25, Math.sin(angle) * 0.35);
    leg.rotation.z = Math.cos(angle) * 0.3;
    leg.rotation.x = -Math.sin(angle) * 0.3;
    base.add(leg);

    const armorGeo = new THREE.BoxGeometry(0.1, 0.4, 0.06);
    const armor = new THREE.Mesh(armorGeo, matBody);
    armor.position.set(Math.cos(angle) * 0.38, 0.28, Math.sin(angle) * 0.38);
    armor.rotation.y = -angle;
    armor.rotation.z = Math.cos(angle) * 0.3;
    armor.rotation.x = -Math.sin(angle) * 0.3;
    base.add(armor);

    const strutGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.35, 4);
    const strut = new THREE.Mesh(strutGeo, matAccent);
    strut.position.set(Math.cos(angle + 0.2) * 0.28, 0.18, Math.sin(angle + 0.2) * 0.28);
    strut.rotation.z = Math.cos(angle + 0.2) * 0.4;
    strut.rotation.x = -Math.sin(angle + 0.2) * 0.4;
    base.add(strut);

    const footGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.06, 6);
    const foot = new THREE.Mesh(footGeo, matDark);
    foot.position.set(Math.cos(angle) * 0.58, 0.03, Math.sin(angle) * 0.58);
    base.add(foot);

    const clampGeo = new THREE.BoxGeometry(0.14, 0.04, 0.14);
    const clamp = new THREE.Mesh(clampGeo, matBody);
    clamp.position.set(Math.cos(angle) * 0.58, 0.08, Math.sin(angle) * 0.58);
    clamp.rotation.y = angle;
    base.add(clamp);

    const fieldGeo = new THREE.TorusGeometry(0.11, 0.02, 8, 8);
    const field = new THREE.Mesh(fieldGeo, matGlow);
    field.position.set(Math.cos(angle) * 0.58, 0.11, Math.sin(angle) * 0.58);
    field.rotation.x = Math.PI / 2;
    base.add(field);

    const pylonGeo = new THREE.BoxGeometry(0.06, 0.12, 0.06);
    const pylon = new THREE.Mesh(pylonGeo, matBody);
    pylon.position.set(Math.cos(angle) * 0.58, 0.16, Math.sin(angle) * 0.58);
    base.add(pylon);

    const pylonTopGeo = new THREE.BoxGeometry(0.05, 0.02, 0.05);
    const pylonTop = new THREE.Mesh(pylonTopGeo, matGlow);
    pylonTop.position.set(Math.cos(angle) * 0.58, 0.23, Math.sin(angle) * 0.58);
    base.add(pylonTop);
  }

  const col1Geo = new THREE.CylinderGeometry(0.2, 0.26, 0.35, 6);
  const col1 = new THREE.Mesh(col1Geo, matBody);
  col1.position.y = 0.32;
  base.add(col1);

  const col2Geo = new THREE.CylinderGeometry(0.18, 0.2, 0.3, 6);
  const col2 = new THREE.Mesh(col2Geo, matBody);
  col2.position.y = 0.64;
  base.add(col2);

  const col3Geo = new THREE.CylinderGeometry(0.16, 0.18, 0.25, 6);
  const col3 = new THREE.Mesh(col3Geo, matBody);
  col3.position.y = 0.91;
  base.add(col3);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const panelGeo = new THREE.BoxGeometry(0.12, 0.7, 0.025);
    const panel = new THREE.Mesh(panelGeo, matAccent);
    panel.position.set(Math.cos(angle) * 0.21, 0.6, Math.sin(angle) * 0.21);
    panel.rotation.y = -angle;
    base.add(panel);
  }

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const conduitGeo = new THREE.BoxGeometry(0.03, 0.65, 0.05);
    const conduit = new THREE.Mesh(conduitGeo, matGlow);
    conduit.position.set(Math.cos(angle) * 0.22, 0.58, Math.sin(angle) * 0.22);
    conduit.rotation.y = -angle;
    base.add(conduit);
  }

  for (let i = 0; i < 4; i++) {
    const ringGeo = new THREE.TorusGeometry(0.22 - i * 0.015, 0.018, 8, 12);
    const ring = new THREE.Mesh(ringGeo, matGlow);
    ring.position.y = 0.25 + i * 0.22;
    ring.rotation.x = Math.PI / 2;
    base.add(ring);
  }

  const mountGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.12, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 1.09;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const house1Geo = new THREE.BoxGeometry(0.34, 0.2, 0.4);
  const house1 = new THREE.Mesh(house1Geo, matBody);
  house1.position.y = 0.1;
  turret.add(house1);

  const house2Geo = new THREE.BoxGeometry(0.28, 0.14, 0.32);
  const house2 = new THREE.Mesh(house2Geo, matBody);
  house2.position.y = 0.27;
  turret.add(house2);

  for (const side of [-1, 1]) {
    const panelGeo = new THREE.BoxGeometry(0.02, 0.16, 0.3);
    const panel = new THREE.Mesh(panelGeo, matAccent);
    panel.position.set(side * 0.18, 0.1, 0.02);
    turret.add(panel);
  }

  const barrelGroup = new THREE.Group();
  barrelGroup.position.set(0, 0.16, 0);

  const barrelGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.3, 10);
  const barrel = new THREE.Mesh(barrelGeo, matBody);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.7;
  barrelGroup.add(barrel);

  const jacketGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.35, 10);
  const jacket = new THREE.Mesh(jacketGeo, matDark);
  jacket.rotation.x = Math.PI / 2;
  jacket.position.z = 0.2;
  barrelGroup.add(jacket);

  for (let i = 0; i < 3; i++) {
    const coilHouseGeo = new THREE.TorusGeometry(0.11, 0.025, 8, 16);
    const coilHouse = new THREE.Mesh(coilHouseGeo, matBody);
    coilHouse.position.z = 0.45 + i * 0.28;
    barrelGroup.add(coilHouse);

    const energyGeo = new THREE.TorusGeometry(0.085, 0.015, 8, 16);
    const energy = new THREE.Mesh(energyGeo, matGlow);
    energy.position.z = 0.45 + i * 0.28;
    barrelGroup.add(energy);
  }

  for (let i = 0; i < 6; i++) {
    const ringGeo = new THREE.TorusGeometry(0.065, 0.008, 6, 10);
    const ring = new THREE.Mesh(ringGeo, matGlow);
    ring.position.z = 0.35 + i * 0.15;
    barrelGroup.add(ring);
  }

  const muz1Geo = new THREE.CylinderGeometry(0.06, 0.05, 0.1, 10);
  const muz1 = new THREE.Mesh(muz1Geo, matDark);
  muz1.rotation.x = Math.PI / 2;
  muz1.position.z = 1.35;
  barrelGroup.add(muz1);

  const muz2Geo = new THREE.CylinderGeometry(0.08, 0.06, 0.06, 10);
  const muz2 = new THREE.Mesh(muz2Geo, matBody);
  muz2.rotation.x = Math.PI / 2;
  muz2.position.z = 1.42;
  barrelGroup.add(muz2);

  const muz3Geo = new THREE.CylinderGeometry(0.07, 0.08, 0.04, 10);
  const muz3 = new THREE.Mesh(muz3Geo, matGlow);
  muz3.rotation.x = Math.PI / 2;
  muz3.position.z = 1.47;
  barrelGroup.add(muz3);

  const coreGeo = new THREE.SphereGeometry(0.05, 12, 12);
  const core = new THREE.Mesh(coreGeo, matCore);
  core.position.z = 0.15;
  barrelGroup.add(core);

  const coreHouseGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 10);
  const coreHouseMat = new THREE.MeshStandardMaterial({
    color: SLATE,
    metalness: 0.9,
    roughness: 0.2,
    transparent: true,
    opacity: 0.5
  });
  const coreHouse = new THREE.Mesh(coreHouseGeo, coreHouseMat);
  coreHouse.rotation.x = Math.PI / 2;
  coreHouse.position.z = 0.15;
  barrelGroup.add(coreHouse);

  turret.add(barrelGroup);
  turret.userData.barrelGroup = barrelGroup;

  const scopeHouseGeo = new THREE.BoxGeometry(0.1, 0.08, 0.2);
  const scopeHouse = new THREE.Mesh(scopeHouseGeo, matDark);
  scopeHouse.position.set(0.16, 0.3, 0.15);
  turret.add(scopeHouse);

  const scopeTubeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8);
  const scopeTube = new THREE.Mesh(scopeTubeGeo, matDark);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0.16, 0.32, 0.22);
  turret.add(scopeTube);

  const scopeLensGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10);
  const scopeLens = new THREE.Mesh(scopeLensGeo, matGlow);
  scopeLens.rotation.x = Math.PI / 2;
  scopeLens.position.set(0.16, 0.32, 0.39);
  turret.add(scopeLens);

  const sensor2Geo = new THREE.BoxGeometry(0.06, 0.05, 0.1);
  const sensor2 = new THREE.Mesh(sensor2Geo, matBody);
  sensor2.position.set(-0.16, 0.28, 0.2);
  turret.add(sensor2);

  const sensor2LensGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.01, 6);
  const sensor2Lens = new THREE.Mesh(sensor2LensGeo, matGlow);
  sensor2Lens.rotation.x = Math.PI / 2;
  sensor2Lens.position.set(-0.16, 0.28, 0.26);
  turret.add(sensor2Lens);

  const holoBaseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.06, 8);
  const holoBase = new THREE.Mesh(holoBaseGeo, matDark);
  holoBase.position.y = 0.37;
  turret.add(holoBase);

  const holoRingGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 16);
  const holoRing = new THREE.Mesh(holoRingGeo, matGlow);
  holoRing.position.y = 0.42;
  holoRing.rotation.x = Math.PI / 2;
  turret.add(holoRing);

  const holoGroup = new THREE.Group();
  const holoArmGeo = new THREE.BoxGeometry(0.18, 0.015, 0.015);
  const holoArm1 = new THREE.Mesh(holoArmGeo, matGlow);
  holoGroup.add(holoArm1);
  const holoArm2 = new THREE.Mesh(holoArmGeo.clone(), matGlow);
  holoArm2.rotation.y = Math.PI / 2;
  holoGroup.add(holoArm2);
  holoGroup.position.y = 0.45;
  turret.add(holoGroup);

  const packGeo = new THREE.BoxGeometry(0.22, 0.18, 0.24);
  const pack = new THREE.Mesh(packGeo, matDark);
  pack.position.set(0, 0.08, -0.3);
  turret.add(pack);

  for (let i = 0; i < 3; i++) {
    const cellGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6);
    const cell = new THREE.Mesh(cellGeo, matGlow);
    cell.position.set(-0.06 + i * 0.06, 0.08, -0.43);
    turret.add(cell);
  }

  for (const side of [-1, 1]) {
    const modGeo = new THREE.BoxGeometry(0.08, 0.1, 0.16);
    const mod = new THREE.Mesh(modGeo, matBody);
    mod.position.set(side * 0.22, 0.12, 0.1);
    turret.add(mod);

    const modBarrelGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.12, 6);
    const modBarrel = new THREE.Mesh(modBarrelGeo, matDark);
    modBarrel.rotation.x = Math.PI / 2;
    modBarrel.position.set(side * 0.22, 0.12, 0.24);
    turret.add(modBarrel);

    const ventGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
    const vent = new THREE.Mesh(ventGeo, matGlow);
    vent.position.set(side * 0.22, 0.12, 0.01);
    turret.add(vent);
  }

  turret.position.y = 1.15;
  group.add(turret);

  const drones = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const droneGroup = new THREE.Group();
    
    const droneBodyGeo = new THREE.OctahedronGeometry(0.06, 0);
    const droneBody = new THREE.Mesh(droneBodyGeo, matDrone);
    droneGroup.add(droneBody);

    const droneEyeGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const droneEye = new THREE.Mesh(droneEyeGeo, matCore);
    droneEye.position.z = 0.05;
    droneGroup.add(droneEye);

    droneGroup.userData.droneIndex = i;
    drones.add(droneGroup);
  }
  drones.position.y = 1.6;
  group.add(drones);

  const fieldRingGeo = new THREE.TorusGeometry(0.35, 0.012, 8, 20);
  const fieldRing = new THREE.Mesh(fieldRingGeo, matGlow);
  fieldRing.position.y = 1.6;
  fieldRing.rotation.x = Math.PI / 2;
  group.add(fieldRing);

  group.userData = { 
    turret, 
    barrelGroup,
    holoGroup,
    drones,
    core,
    fieldRing,
    animatedParts: [core, muz3, scopeLens]
  };
  return group;
}

function buildFastL1() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: GREEN, 
    emissive: GREEN, 
    emissiveIntensity: 0.1,
    metalness: 0.6,
    roughness: 0.4
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: GREEN_LIGHT, 
    emissive: GREEN_LIGHT, 
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9
  });

  const base = new THREE.Group();

  const platformGeo = new THREE.CylinderGeometry(0.55, 0.58, 0.1, 16);
  const platform = new THREE.Mesh(platformGeo, matDark);
  platform.position.y = 0.05;
  base.add(platform);

  const edgeGeo = new THREE.TorusGeometry(0.52, 0.02, 8, 16);
  const edge = new THREE.Mesh(edgeGeo, matGlow);
  edge.position.y = 0.1;
  edge.rotation.x = Math.PI / 2;
  base.add(edge);

  const trackGeo = new THREE.TorusGeometry(0.42, 0.035, 8, 16);
  const track = new THREE.Mesh(trackGeo, matGlow);
  track.position.y = 0.13;
  track.rotation.x = Math.PI / 2;
  base.add(track);

  const pedGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.35, 8);
  const ped = new THREE.Mesh(pedGeo, matBody);
  ped.position.y = 0.28;
  base.add(ped);

  const pedRingGeo = new THREE.TorusGeometry(0.2, 0.02, 8, 8);
  const pedRing = new THREE.Mesh(pedRingGeo, matGlow);
  pedRing.position.y = 0.28;
  pedRing.rotation.x = Math.PI / 2;
  base.add(pedRing);

  const mountGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.08, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.5;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const drumGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.28, 12);
  const drum = new THREE.Mesh(drumGeo, matBody);
  drum.position.y = 0.14;
  turret.add(drum);

  const faceGeo = new THREE.TorusGeometry(0.26, 0.025, 8, 12);
  const faceTop = new THREE.Mesh(faceGeo, matGlow);
  faceTop.position.y = 0.28;
  faceTop.rotation.x = Math.PI / 2;
  turret.add(faceTop);

  const faceBot = new THREE.Mesh(faceGeo.clone(), matGlow);
  faceBot.position.y = 0.0;
  faceBot.rotation.x = Math.PI / 2;
  turret.add(faceBot);

  const spinGroup = new THREE.Group();
  spinGroup.position.set(0, 0.14, 0);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bx = Math.cos(angle) * 0.15;
    const by = Math.sin(angle) * 0.15;

    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.5, 6);
    const barrel = new THREE.Mesh(barrelGeo, matBody);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(bx, by, 0.32);
    spinGroup.add(barrel);

    const muzzleGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.04, 6);
    const muzzle = new THREE.Mesh(muzzleGeo, matGlow);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(bx, by, 0.59);
    spinGroup.add(muzzle);
  }

  const spindleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8);
  const spindle = new THREE.Mesh(spindleGeo, matDark);
  spindle.rotation.x = Math.PI / 2;
  spindle.position.z = 0.32;
  spinGroup.add(spindle);

  const spindleTipGeo = new THREE.ConeGeometry(0.05, 0.08, 8);
  const spindleTip = new THREE.Mesh(spindleTipGeo, matGlow);
  spindleTip.rotation.x = -Math.PI / 2;
  spindleTip.position.z = 0.62;
  spinGroup.add(spindleTip);

  turret.add(spinGroup);
  turret.userData.spinGroup = spinGroup;

  const ammoGeo = new THREE.BoxGeometry(0.14, 0.12, 0.12);
  const ammo = new THREE.Mesh(ammoGeo, matDark);
  ammo.position.set(-0.28, 0.1, -0.02);
  turret.add(ammo);

  const beltGeo = new THREE.BoxGeometry(0.08, 0.04, 0.08);
  const belt = new THREE.Mesh(beltGeo, matBody);
  belt.position.set(-0.18, 0.1, 0);
  turret.add(belt);

  turret.position.y = 0.54;
  group.add(turret);

  group.userData = { turret, spinGroup, animatedParts: [] };
  return group;
}

function buildFastL2() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: GREEN, 
    emissive: GREEN, 
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.35
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: SLATE_LIGHT, 
    metalness: 0.7, 
    roughness: 0.4 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: GREEN_LIGHT, 
    emissive: GREEN_LIGHT, 
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: GREEN_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.95
  });

  const base = new THREE.Group();

  const platform1Geo = new THREE.CylinderGeometry(0.6, 0.65, 0.1, 16);
  const platform1 = new THREE.Mesh(platform1Geo, matDark);
  platform1.position.y = 0.05;
  base.add(platform1);

  const platform2Geo = new THREE.CylinderGeometry(0.55, 0.6, 0.06, 16);
  const platform2 = new THREE.Mesh(platform2Geo, matAccent);
  platform2.position.y = 0.13;
  base.add(platform2);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const anchorGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6);
    const anchor = new THREE.Mesh(anchorGeo, matGlow);
    anchor.position.set(Math.cos(angle) * 0.52, 0.14, Math.sin(angle) * 0.52);
    base.add(anchor);
  }

  const track1Geo = new THREE.TorusGeometry(0.48, 0.03, 8, 20);
  const track1 = new THREE.Mesh(track1Geo, matGlow);
  track1.position.y = 0.16;
  track1.rotation.x = Math.PI / 2;
  base.add(track1);

  const track2Geo = new THREE.TorusGeometry(0.38, 0.02, 8, 16);
  const track2 = new THREE.Mesh(track2Geo, matGlow);
  track2.position.y = 0.18;
  track2.rotation.x = Math.PI / 2;
  base.add(track2);

  const ped1Geo = new THREE.CylinderGeometry(0.22, 0.28, 0.25, 8);
  const ped1 = new THREE.Mesh(ped1Geo, matBody);
  ped1.position.y = 0.28;
  base.add(ped1);

  const ped2Geo = new THREE.CylinderGeometry(0.2, 0.22, 0.2, 8);
  const ped2 = new THREE.Mesh(ped2Geo, matBody);
  ped2.position.y = 0.5;
  base.add(ped2);

  for (let i = 0; i < 2; i++) {
    const bandGeo = new THREE.TorusGeometry(0.24 - i * 0.03, 0.022, 8, 8);
    const band = new THREE.Mesh(bandGeo, matGlow);
    band.position.y = 0.32 + i * 0.2;
    band.rotation.x = Math.PI / 2;
    base.add(band);
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const conduitGeo = new THREE.BoxGeometry(0.025, 0.35, 0.04);
    const conduit = new THREE.Mesh(conduitGeo, matGlow);
    conduit.position.set(Math.cos(angle) * 0.24, 0.38, Math.sin(angle) * 0.24);
    conduit.rotation.y = -angle;
    base.add(conduit);
  }

  const mountGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.1, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.65;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const drumGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.32, 12);
  const drum = new THREE.Mesh(drumGeo, matBody);
  drum.position.y = 0.16;
  turret.add(drum);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const panelGeo = new THREE.BoxGeometry(0.14, 0.28, 0.025);
    const panel = new THREE.Mesh(panelGeo, matAccent);
    panel.position.set(Math.cos(angle) * 0.31, 0.16, Math.sin(angle) * 0.31);
    panel.rotation.y = -angle;
    turret.add(panel);
  }

  const drumRing1Geo = new THREE.TorusGeometry(0.3, 0.025, 8, 12);
  const drumRing1 = new THREE.Mesh(drumRing1Geo, matGlow);
  drumRing1.position.y = 0.32;
  drumRing1.rotation.x = Math.PI / 2;
  turret.add(drumRing1);

  const drumRing2 = new THREE.Mesh(drumRing1Geo.clone(), matGlow);
  drumRing2.position.y = 0.0;
  drumRing2.rotation.x = Math.PI / 2;
  turret.add(drumRing2);

  const housingGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.15, 10);
  const housing = new THREE.Mesh(housingGeo, matBody);
  housing.rotation.x = Math.PI / 2;
  housing.position.set(0, 0.16, 0.18);
  turret.add(housing);

  const spinGroup = new THREE.Group();
  spinGroup.position.set(0, 0.16, 0.18);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const bx = Math.cos(angle) * 0.14;
    const by = Math.sin(angle) * 0.14;

    const barrelGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6);
    const barrel = new THREE.Mesh(barrelGeo, matBody);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(bx, by, 0.32);
    spinGroup.add(barrel);

    if (i % 2 === 0) {
      const finGeo = new THREE.BoxGeometry(0.02, 0.06, 0.25);
      const fin = new THREE.Mesh(finGeo, matDark);
      fin.position.set(bx * 1.15, by * 1.15, 0.25);
      fin.rotation.z = angle;
      spinGroup.add(fin);
    }

    const muzzleGeo = new THREE.CylinderGeometry(0.035, 0.025, 0.04, 6);
    const muzzle = new THREE.Mesh(muzzleGeo, matGlow);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(bx, by, 0.62);
    spinGroup.add(muzzle);
  }

  const spindleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
  const spindle = new THREE.Mesh(spindleGeo, matDark);
  spindle.rotation.x = Math.PI / 2;
  spindle.position.z = 0.32;
  spinGroup.add(spindle);

  const frontMountGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.06, 8);
  const frontMount = new THREE.Mesh(frontMountGeo, matGlow);
  frontMount.rotation.x = Math.PI / 2;
  frontMount.position.z = 0.64;
  spinGroup.add(frontMount);

  turret.add(spinGroup);
  turret.userData.spinGroup = spinGroup;

  const ammoDrumGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10);
  const ammoDrum = new THREE.Mesh(ammoDrumGeo, matDark);
  ammoDrum.position.set(-0.32, 0.1, -0.08);
  turret.add(ammoDrum);

  for (let i = 0; i < 2; i++) {
    const bandGeo = new THREE.TorusGeometry(0.12, 0.015, 6, 10);
    const band = new THREE.Mesh(bandGeo, matGlow);
    band.position.set(-0.32, 0.02 + i * 0.16, -0.08);
    band.rotation.x = Math.PI / 2;
    turret.add(band);
  }

  const feedGeo = new THREE.BoxGeometry(0.1, 0.08, 0.16);
  const feed = new THREE.Mesh(feedGeo, matBody);
  feed.position.set(-0.22, 0.12, 0.02);
  turret.add(feed);

  for (let i = 0; i < 3; i++) {
    const segGeo = new THREE.BoxGeometry(0.08, 0.025, 0.04);
    const seg = new THREE.Mesh(segGeo, matGlow);
    seg.position.set(-0.22 + i * 0.05, 0.14, 0.1);
    turret.add(seg);
  }

  for (const side of [-1, 1]) {
    const ventGeo = new THREE.BoxGeometry(0.04, 0.15, 0.12);
    const vent = new THREE.Mesh(ventGeo, matDark);
    vent.position.set(side * 0.32, 0.16, -0.06);
    turret.add(vent);

    for (let i = 0; i < 4; i++) {
      const slotGeo = new THREE.BoxGeometry(0.045, 0.02, 0.03);
      const slot = new THREE.Mesh(slotGeo, matGlow);
      slot.position.set(side * 0.32, 0.08 + i * 0.04, -0.06);
      turret.add(slot);
    }
  }

  const sensorGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8);
  const sensor = new THREE.Mesh(sensorGeo, matDark);
  sensor.position.y = 0.38;
  turret.add(sensor);

  const sensorLensGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const sensorLens = new THREE.Mesh(sensorLensGeo, matGlow);
  sensorLens.position.y = 0.44;
  turret.add(sensorLens);

  turret.position.y = 0.7;
  group.add(turret);

  group.userData = { 
    turret, 
    spinGroup,
    animatedParts: [sensorLens, frontMount]
  };
  return group;
}

function buildFastL3() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: GREEN, 
    emissive: GREEN, 
    emissiveIntensity: 0.2,
    metalness: 0.75,
    roughness: 0.3
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.85, 
    roughness: 0.25 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: GREEN_DARK, 
    emissive: GREEN_DARK, 
    emissiveIntensity: 0.1,
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: GREEN_LIGHT, 
    emissive: GREEN_LIGHT, 
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: GREEN_LIGHT, 
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 1.0
  });
  const matPod = new THREE.MeshStandardMaterial({ 
    color: GREEN_LIGHT, 
    emissive: GREEN_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85
  });

  const base = new THREE.Group();

  const plat1Geo = new THREE.CylinderGeometry(0.7, 0.75, 0.1, 16);
  const plat1 = new THREE.Mesh(plat1Geo, matDark);
  plat1.position.y = 0.05;
  base.add(plat1);

  const plat2Geo = new THREE.CylinderGeometry(0.65, 0.7, 0.08, 16);
  const plat2 = new THREE.Mesh(plat2Geo, matAccent);
  plat2.position.y = 0.14;
  base.add(plat2);

  const plat3Geo = new THREE.CylinderGeometry(0.58, 0.65, 0.06, 16);
  const plat3 = new THREE.Mesh(plat3Geo, matDark);
  plat3.position.y = 0.21;
  base.add(plat3);

  const edgeGeo = new THREE.TorusGeometry(0.68, 0.025, 8, 24);
  const edge = new THREE.Mesh(edgeGeo, matGlow);
  edge.position.y = 0.1;
  edge.rotation.x = Math.PI / 2;
  base.add(edge);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const pylonGeo = new THREE.BoxGeometry(0.08, 0.16, 0.08);
    const pylon = new THREE.Mesh(pylonGeo, matBody);
    pylon.position.set(Math.cos(angle) * 0.58, 0.26, Math.sin(angle) * 0.58);
    base.add(pylon);

    const pylonTopGeo = new THREE.BoxGeometry(0.06, 0.03, 0.06);
    const pylonTop = new THREE.Mesh(pylonTopGeo, matGlow);
    pylonTop.position.set(Math.cos(angle) * 0.58, 0.36, Math.sin(angle) * 0.58);
    base.add(pylonTop);
  }

  for (let i = 0; i < 3; i++) {
    const trackGeo = new THREE.TorusGeometry(0.52 - i * 0.08, 0.025 - i * 0.005, 8, 20);
    const track = new THREE.Mesh(trackGeo, matGlow);
    track.position.y = 0.24 + i * 0.03;
    track.rotation.x = Math.PI / 2;
    base.add(track);
  }

  const ped1Geo = new THREE.CylinderGeometry(0.26, 0.32, 0.3, 8);
  const ped1 = new THREE.Mesh(ped1Geo, matBody);
  ped1.position.y = 0.39;
  base.add(ped1);

  const ped2Geo = new THREE.CylinderGeometry(0.24, 0.26, 0.25, 8);
  const ped2 = new THREE.Mesh(ped2Geo, matBody);
  ped2.position.y = 0.66;
  base.add(ped2);

  const ped3Geo = new THREE.CylinderGeometry(0.22, 0.24, 0.2, 8);
  const ped3 = new THREE.Mesh(ped3Geo, matBody);
  ped3.position.y = 0.88;
  base.add(ped3);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const panelGeo = new THREE.BoxGeometry(0.1, 0.55, 0.025);
    const panel = new THREE.Mesh(panelGeo, matAccent);
    panel.position.set(Math.cos(angle) * 0.27, 0.6, Math.sin(angle) * 0.27);
    panel.rotation.y = -angle;
    base.add(panel);
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const conduitGeo = new THREE.BoxGeometry(0.03, 0.5, 0.05);
    const conduit = new THREE.Mesh(conduitGeo, matGlow);
    conduit.position.set(Math.cos(angle) * 0.28, 0.58, Math.sin(angle) * 0.28);
    conduit.rotation.y = -angle;
    base.add(conduit);
  }

  for (let i = 0; i < 4; i++) {
    const ringGeo = new THREE.TorusGeometry(0.28 - i * 0.015, 0.018, 8, 12);
    const ring = new THREE.Mesh(ringGeo, matGlow);
    ring.position.y = 0.35 + i * 0.18;
    ring.rotation.x = Math.PI / 2;
    base.add(ring);
  }

  const mountGeo = new THREE.CylinderGeometry(0.26, 0.24, 0.12, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 1.04;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const centerGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.3, 10);
  const center = new THREE.Mesh(centerGeo, matBody);
  center.position.y = 0.15;
  turret.add(center);

  const domeGeo = new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, matBody);
  dome.position.y = 0.3;
  turret.add(dome);

  const coreHouseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.2, 10);
  const coreHouseMat = new THREE.MeshStandardMaterial({
    color: SLATE,
    metalness: 0.9,
    roughness: 0.2,
    transparent: true,
    opacity: 0.5
  });
  const coreHouse = new THREE.Mesh(coreHouseGeo, coreHouseMat);
  coreHouse.position.y = 0.42;
  turret.add(coreHouse);

  const coreGeo = new THREE.SphereGeometry(0.08, 12, 12);
  const core = new THREE.Mesh(coreGeo, matCore);
  core.position.y = 0.42;
  turret.add(core);

  const coreInnerGeo = new THREE.OctahedronGeometry(0.05, 0);
  const coreInner = new THREE.Mesh(coreInnerGeo, matPod);
  coreInner.position.y = 0.42;
  turret.add(coreInner);

  const spinGroups = [];
  for (const side of [-1, 1]) {
    const gunMount = new THREE.Group();
    gunMount.position.set(side * 0.28, 0.12, 0);

    const gunHouseGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.22, 10);
    const gunHouse = new THREE.Mesh(gunHouseGeo, matBody);
    gunHouse.rotation.x = Math.PI / 2;
    gunHouse.position.z = 0.08;
    gunMount.add(gunHouse);

    const houseRingGeo = new THREE.TorusGeometry(0.19, 0.02, 8, 10);
    const houseRing = new THREE.Mesh(houseRingGeo, matGlow);
    houseRing.position.z = 0.18;
    gunMount.add(houseRing);

    const spinGroup = new THREE.Group();
    spinGroup.position.z = 0.18;

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const bx = Math.cos(angle) * 0.1;
      const by = Math.sin(angle) * 0.1;

      const barrelGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.5, 6);
      const barrel = new THREE.Mesh(barrelGeo, matBody);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx, by, 0.28);
      spinGroup.add(barrel);

      const jacketGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
      const jacket = new THREE.Mesh(jacketGeo, matDark);
      jacket.rotation.x = Math.PI / 2;
      jacket.position.set(bx, by, 0.12);
      spinGroup.add(jacket);

      const muzzleGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.04, 6);
      const muzzle = new THREE.Mesh(muzzleGeo, matGlow);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(bx, by, 0.55);
      spinGroup.add(muzzle);
    }

    const spindleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8);
    const spindle = new THREE.Mesh(spindleGeo, matDark);
    spindle.rotation.x = Math.PI / 2;
    spindle.position.z = 0.28;
    spinGroup.add(spindle);

    const spindleTipGeo = new THREE.ConeGeometry(0.04, 0.06, 8);
    const spindleTip = new THREE.Mesh(spindleTipGeo, matGlow);
    spindleTip.rotation.x = -Math.PI / 2;
    spindleTip.position.z = 0.58;
    spinGroup.add(spindleTip);

    gunMount.add(spinGroup);
    // @ts-ignore
    spinGroups.push({ group: spinGroup, side });

    const feedGeo = new THREE.BoxGeometry(0.08, 0.06, 0.12);
    const feed = new THREE.Mesh(feedGeo, matAccent);
    feed.position.set(-side * 0.12, 0.0, 0);
    gunMount.add(feed);

    for (let i = 0; i < 4; i++) {
      const beltGeo = new THREE.BoxGeometry(0.06, 0.02, 0.025);
      const belt = new THREE.Mesh(beltGeo, matGlow);
      belt.position.set(-side * (0.08 - i * 0.03), 0.02, 0.06);
      gunMount.add(belt);
    }

    turret.add(gunMount);
  }
  turret.userData.spinGroups = spinGroups;

  const hubGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.18, 10);
  const hub = new THREE.Mesh(hubGeo, matDark);
  hub.position.set(0, 0.05, -0.18);
  turret.add(hub);

  for (let i = 0; i < 2; i++) {
    const bandGeo = new THREE.TorusGeometry(0.11, 0.015, 6, 10);
    const band = new THREE.Mesh(bandGeo, matGlow);
    band.position.set(0, -0.02 + i * 0.14, -0.18);
    band.rotation.x = Math.PI / 2;
    turret.add(band);
  }

  for (const side of [-1, 1]) {
    const exchGeo = new THREE.BoxGeometry(0.06, 0.18, 0.14);
    const exch = new THREE.Mesh(exchGeo, matDark);
    exch.position.set(side * 0.48, 0.1, -0.04);
    turret.add(exch);

    for (let i = 0; i < 5; i++) {
      const finGeo = new THREE.BoxGeometry(0.07, 0.025, 0.02);
      const fin = new THREE.Mesh(finGeo, matGlow);
      fin.position.set(side * 0.48, 0.0 + i * 0.04, -0.04);
      turret.add(fin);
    }
  }

  const targetBaseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.08, 8);
  const targetBase = new THREE.Mesh(targetBaseGeo, matDark);
  targetBase.position.y = 0.56;
  turret.add(targetBase);

  const targetRingGroup = new THREE.Group();
  targetRingGroup.position.y = 0.64;
  
  const targetRingGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 16);
  const targetRing = new THREE.Mesh(targetRingGeo, matGlow);
  targetRing.rotation.x = Math.PI / 2;
  targetRingGroup.add(targetRing);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const scanGeo = new THREE.BoxGeometry(0.03, 0.025, 0.06);
    const scan = new THREE.Mesh(scanGeo, matCore);
    scan.position.set(Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12);
    scan.rotation.y = -angle;
    targetRingGroup.add(scan);
  }
  turret.add(targetRingGroup);
  turret.userData.targetRingGroup = targetRingGroup;

  turret.position.y = 1.1;
  group.add(turret);

  const ammoPods = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const podGroup = new THREE.Group();
    
    const podBodyGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8);
    const podBody = new THREE.Mesh(podBodyGeo, matPod);
    podGroup.add(podBody);

    const podRing1Geo = new THREE.TorusGeometry(0.055, 0.01, 6, 8);
    const podRing1 = new THREE.Mesh(podRing1Geo, matCore);
    podRing1.position.y = 0.04;
    podRing1.rotation.x = Math.PI / 2;
    podGroup.add(podRing1);

    const podRing2 = new THREE.Mesh(podRing1Geo.clone(), matCore);
    podRing2.position.y = -0.04;
    podRing2.rotation.x = Math.PI / 2;
    podGroup.add(podRing2);

    podGroup.userData.podIndex = i;
    ammoPods.add(podGroup);
  }
  ammoPods.position.y = 1.7;
  group.add(ammoPods);

  const fieldRingGeo = new THREE.TorusGeometry(0.4, 0.015, 8, 24);
  const fieldRing = new THREE.Mesh(fieldRingGeo, matGlow);
  fieldRing.position.y = 1.7;
  fieldRing.rotation.x = Math.PI / 2;
  group.add(fieldRing);

  group.userData = { 
    turret, 
    spinGroups,
    targetRingGroup,
    ammoPods,
    core,
    coreInner,
    fieldRing,
    animatedParts: [core]
  };
  return group;
}

function buildArtilleryL1() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: AMBER, 
    emissive: AMBER, 
    emissiveIntensity: 0.1,
    metalness: 0.6,
    roughness: 0.4
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: AMBER_LIGHT, 
    emissive: AMBER_LIGHT, 
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9
  });

  const base = new THREE.Group();

  const platformGeo = new THREE.BoxGeometry(1.0, 0.12, 0.8);
  const platform = new THREE.Mesh(platformGeo, matDark);
  platform.position.y = 0.06;
  base.add(platform);

  const trimGeo = new THREE.BoxGeometry(1.02, 0.03, 0.82);
  const trim = new THREE.Mesh(trimGeo, matGlow);
  trim.position.y = 0.125;
  base.add(trim);

  for (const [x, z] of [[-0.42, -0.32], [0.42, -0.32], [-0.42, 0.32], [0.42, 0.32]]) {
    const footGeo = new THREE.BoxGeometry(0.12, 0.05, 0.12);
    const foot = new THREE.Mesh(footGeo, matBody);
    foot.position.set(x, 0.145, z);
    base.add(foot);
  }

  const bodyGeo = new THREE.BoxGeometry(0.75, 0.4, 0.55);
  const body = new THREE.Mesh(bodyGeo, matBody);
  body.position.y = 0.34;
  base.add(body);

  const line1Geo = new THREE.BoxGeometry(0.77, 0.025, 0.57);
  const line1 = new THREE.Mesh(line1Geo, matGlow);
  line1.position.y = 0.22;
  base.add(line1);

  const line2 = new THREE.Mesh(line1Geo.clone(), matGlow);
  line2.position.y = 0.46;
  base.add(line2);

  for (const side of [-1, 1]) {
    const stackGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6);
    const stack = new THREE.Mesh(stackGeo, matDark);
    stack.position.set(side * 0.46, 0.42, 0);
    base.add(stack);

    const capGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.04, 6);
    const cap = new THREE.Mesh(capGeo, matBody);
    cap.position.set(side * 0.46, 0.56, 0);
    base.add(cap);
  }

  const mountGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.1, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.59;
  base.add(mount);

  group.add(base);

  const turret = new THREE.Group();

  const housingGeo = new THREE.BoxGeometry(0.45, 0.18, 0.36);
  const housing = new THREE.Mesh(housingGeo, matBody);
  housing.position.y = 0.09;
  turret.add(housing);

  const mortarGroup = new THREE.Group();
  mortarGroup.position.set(0, 0.18, 0.08);
  mortarGroup.rotation.x = -Math.PI / 4;

  const mortarBaseGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.16, 8);
  const mortarBase = new THREE.Mesh(mortarBaseGeo, matBody);
  mortarBase.position.y = 0.08;
  mortarGroup.add(mortarBase);

  const tubeGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.45, 8);
  const tube = new THREE.Mesh(tubeGeo, matBody);
  tube.position.y = 0.38;
  mortarGroup.add(tube);

  for (let i = 0; i < 2; i++) {
    const bandGeo = new THREE.TorusGeometry(0.12, 0.02, 6, 8);
    const band = new THREE.Mesh(bandGeo, matGlow);
    band.position.y = 0.22 + i * 0.2;
    band.rotation.x = Math.PI / 2;
    mortarGroup.add(band);
  }

  const muzzleGeo = new THREE.CylinderGeometry(0.16, 0.1, 0.08, 8);
  const muzzle = new THREE.Mesh(muzzleGeo, matGlow);
  muzzle.position.y = 0.64;
  mortarGroup.add(muzzle);

  turret.add(mortarGroup);
  turret.userData.mortarGroup = mortarGroup;

  const rackGeo = new THREE.BoxGeometry(0.28, 0.14, 0.14);
  const rack = new THREE.Mesh(rackGeo, matDark);
  rack.position.set(0, 0.06, -0.22);
  turret.add(rack);

  for (let i = 0; i < 3; i++) {
    const shellGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.1, 6);
    const shell = new THREE.Mesh(shellGeo, matGlow);
    shell.position.set(-0.08 + i * 0.08, 0.12, -0.22);
    turret.add(shell);
  }

  turret.position.y = 0.64;
  group.add(turret);

  group.userData = { turret, mortarGroup, animatedParts: [muzzle] };
  return group;
}

function buildArtilleryL2() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: AMBER, 
    emissive: AMBER, 
    emissiveIntensity: 0.15,
    metalness: 0.7,
    roughness: 0.35
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: SLATE_LIGHT, 
    metalness: 0.7, 
    roughness: 0.4 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: AMBER_LIGHT, 
    emissive: AMBER_LIGHT, 
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: AMBER_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.95
  });

  const base = new THREE.Group();

  const plat1Geo = new THREE.BoxGeometry(1.1, 0.1, 0.9);
  const plat1 = new THREE.Mesh(plat1Geo, matDark);
  plat1.position.y = 0.05;
  base.add(plat1);

  const plat2Geo = new THREE.BoxGeometry(1.0, 0.08, 0.8);
  const plat2 = new THREE.Mesh(plat2Geo, matAccent);
  plat2.position.y = 0.14;
  base.add(plat2);

  const edgeGeo = new THREE.BoxGeometry(1.12, 0.025, 0.92);
  const edge = new THREE.Mesh(edgeGeo, matGlow);
  edge.position.y = 0.1;
  base.add(edge);

  for (const [x, z] of [[-0.46, -0.36], [0.46, -0.36], [-0.46, 0.36], [0.46, 0.36]]) {
    const pylonGeo = new THREE.BoxGeometry(0.1, 0.14, 0.1);
    const pylon = new THREE.Mesh(pylonGeo, matBody);
    pylon.position.set(x, 0.25, z);
    base.add(pylon);

    const pylonTopGeo = new THREE.BoxGeometry(0.08, 0.025, 0.08);
    const pylonTop = new THREE.Mesh(pylonTopGeo, matGlow);
    pylonTop.position.set(x, 0.34, z);
    base.add(pylonTop);
  }

  const body1Geo = new THREE.BoxGeometry(0.85, 0.35, 0.65);
  const body1 = new THREE.Mesh(body1Geo, matBody);
  body1.position.y = 0.36;
  base.add(body1);

  const body2Geo = new THREE.BoxGeometry(0.75, 0.25, 0.55);
  const body2 = new THREE.Mesh(body2Geo, matBody);
  body2.position.y = 0.66;
  base.add(body2);

  for (const side of [-1, 1]) {
    const panelGeo = new THREE.BoxGeometry(0.025, 0.5, 0.5);
    const panel = new THREE.Mesh(panelGeo, matAccent);
    panel.position.set(side * 0.44, 0.48, 0);
    base.add(panel);
  }

  for (let i = 0; i < 3; i++) {
    const lineGeo = new THREE.BoxGeometry(0.87, 0.02, 0.67);
    const line = new THREE.Mesh(lineGeo, matGlow);
    line.position.y = 0.24 + i * 0.18;
    base.add(line);
  }

  for (const side of [-1, 1]) {
    const stack1Geo = new THREE.CylinderGeometry(0.07, 0.07, 0.35, 6);
    const stack1 = new THREE.Mesh(stack1Geo, matDark);
    stack1.position.set(side * 0.52, 0.5, -0.08);
    base.add(stack1);

    const cap1Geo = new THREE.CylinderGeometry(0.085, 0.07, 0.05, 6);
    const cap1 = new THREE.Mesh(cap1Geo, matBody);
    cap1.position.set(side * 0.52, 0.7, -0.08);
    base.add(cap1);

    const stackRingGeo = new THREE.TorusGeometry(0.07, 0.015, 6, 8);
    const stackRing = new THREE.Mesh(stackRingGeo, matGlow);
    stackRing.position.set(side * 0.52, 0.55, -0.08);
    stackRing.rotation.x = Math.PI / 2;
    base.add(stackRing);

    const stack2Geo = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6);
    const stack2 = new THREE.Mesh(stack2Geo, matDark);
    stack2.position.set(side * 0.52, 0.45, 0.12);
    base.add(stack2);
  }

  const mountGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.12, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 0.84;
  base.add(mount);

  const mountRingGeo = new THREE.TorusGeometry(0.34, 0.02, 8, 12);
  const mountRing = new THREE.Mesh(mountRingGeo, matGlow);
  mountRing.position.y = 0.9;
  mountRing.rotation.x = Math.PI / 2;
  base.add(mountRing);

  group.add(base);

  const turret = new THREE.Group();

  const house1Geo = new THREE.BoxGeometry(0.55, 0.2, 0.45);
  const house1 = new THREE.Mesh(house1Geo, matBody);
  house1.position.y = 0.1;
  turret.add(house1);

  const house2Geo = new THREE.BoxGeometry(0.45, 0.14, 0.38);
  const house2 = new THREE.Mesh(house2Geo, matBody);
  house2.position.y = 0.27;
  turret.add(house2);

  for (const side of [-1, 1]) {
    const armorGeo = new THREE.BoxGeometry(0.02, 0.28, 0.36);
    const armor = new THREE.Mesh(armorGeo, matAccent);
    armor.position.set(side * 0.285, 0.14, 0);
    turret.add(armor);
  }

  const mortarGroup = new THREE.Group();
  mortarGroup.position.set(0, 0.22, 0.12);
  mortarGroup.rotation.x = -Math.PI / 4;

  const mortarBaseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.2, 10);
  const mortarBase = new THREE.Mesh(mortarBaseGeo, matBody);
  mortarBase.position.y = 0.1;
  mortarGroup.add(mortarBase);

  const tubeGeo = new THREE.CylinderGeometry(0.13, 0.18, 0.55, 10);
  const tube = new THREE.Mesh(tubeGeo, matBody);
  tube.position.y = 0.45;
  mortarGroup.add(tube);

  const jacketGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.2, 10);
  const jacket = new THREE.Mesh(jacketGeo, matDark);
  jacket.position.y = 0.25;
  mortarGroup.add(jacket);

  for (let i = 0; i < 3; i++) {
    const bandGeo = new THREE.TorusGeometry(0.15 - i * 0.01, 0.02, 8, 10);
    const band = new THREE.Mesh(bandGeo, matGlow);
    band.position.y = 0.2 + i * 0.18;
    band.rotation.x = Math.PI / 2;
    mortarGroup.add(band);
  }

  const muz1Geo = new THREE.CylinderGeometry(0.15, 0.13, 0.08, 10);
  const muz1 = new THREE.Mesh(muz1Geo, matDark);
  muz1.position.y = 0.76;
  mortarGroup.add(muz1);

  const muz2Geo = new THREE.CylinderGeometry(0.2, 0.15, 0.06, 10);
  const muz2 = new THREE.Mesh(muz2Geo, matBody);
  muz2.position.y = 0.82;
  mortarGroup.add(muz2);

  const muz3Geo = new THREE.CylinderGeometry(0.18, 0.2, 0.04, 10);
  const muz3 = new THREE.Mesh(muz3Geo, matGlow);
  muz3.position.y = 0.87;
  mortarGroup.add(muz3);

  turret.add(mortarGroup);
  turret.userData.mortarGroup = mortarGroup;

  const targetBaseGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
  const targetBase = new THREE.Mesh(targetBaseGeo, matDark);
  targetBase.position.set(0.22, 0.28, 0.12);
  turret.add(targetBase);

  const targetLensGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8);
  const targetLens = new THREE.Mesh(targetLensGeo, matGlow);
  targetLens.rotation.x = Math.PI / 2;
  targetLens.position.set(0.22, 0.3, 0.2);
  turret.add(targetLens);

  const magGeo = new THREE.BoxGeometry(0.14, 0.22, 0.18);
  const mag = new THREE.Mesh(magGeo, matDark);
  mag.position.set(-0.32, 0.12, 0);
  turret.add(mag);

  for (let i = 0; i < 4; i++) {
    const shellGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.12, 6);
    const shell = new THREE.Mesh(shellGeo, matGlow);
    shell.position.set(-0.32, 0.04 + i * 0.05, -0.04 + (i % 2) * 0.08);
    turret.add(shell);
  }

  const armGeo = new THREE.BoxGeometry(0.08, 0.04, 0.16);
  const arm = new THREE.Mesh(armGeo, matBody);
  arm.position.set(-0.2, 0.15, 0.06);
  turret.add(arm);

  const powerGeo = new THREE.BoxGeometry(0.3, 0.16, 0.2);
  const power = new THREE.Mesh(powerGeo, matDark);
  power.position.set(0, 0.08, -0.28);
  turret.add(power);

  for (let i = 0; i < 3; i++) {
    const indGeo = new THREE.BoxGeometry(0.06, 0.03, 0.02);
    const ind = new THREE.Mesh(indGeo, matGlow);
    ind.position.set(-0.08 + i * 0.08, 0.12, -0.39);
    turret.add(ind);
  }

  turret.position.y = 0.9;
  group.add(turret);

  group.userData = { 
    turret, 
    mortarGroup,
    animatedParts: [muz3, targetLens]
  };
  return group;
}

function buildArtilleryL3() {
  const group = new THREE.Group();
  
  const matBody = new THREE.MeshStandardMaterial({ 
    color: AMBER, 
    emissive: AMBER, 
    emissiveIntensity: 0.2,
    metalness: 0.75,
    roughness: 0.3
  });
  const matDark = new THREE.MeshStandardMaterial({ 
    color: SLATE, 
    metalness: 0.85, 
    roughness: 0.25 
  });
  const matAccent = new THREE.MeshStandardMaterial({ 
    color: AMBER_DARK, 
    emissive: AMBER_DARK, 
    emissiveIntensity: 0.1,
    metalness: 0.8, 
    roughness: 0.3 
  });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: AMBER_LIGHT, 
    emissive: AMBER_LIGHT, 
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.9
  });
  const matCore = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: AMBER_LIGHT, 
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 1.0
  });
  const matShell = new THREE.MeshStandardMaterial({ 
    color: AMBER_LIGHT, 
    emissive: AMBER_LIGHT, 
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85
  });

  const base = new THREE.Group();

  const plat1Geo = new THREE.BoxGeometry(1.25, 0.1, 1.0);
  const plat1 = new THREE.Mesh(plat1Geo, matDark);
  plat1.position.y = 0.05;
  base.add(plat1);

  const plat2Geo = new THREE.BoxGeometry(1.15, 0.08, 0.9);
  const plat2 = new THREE.Mesh(plat2Geo, matAccent);
  plat2.position.y = 0.14;
  base.add(plat2);

  const plat3Geo = new THREE.BoxGeometry(1.05, 0.06, 0.8);
  const plat3 = new THREE.Mesh(plat3Geo, matDark);
  plat3.position.y = 0.21;
  base.add(plat3);

  const edge1Geo = new THREE.BoxGeometry(1.27, 0.025, 1.02);
  const edge1 = new THREE.Mesh(edge1Geo, matGlow);
  edge1.position.y = 0.1;
  base.add(edge1);

  const edge2Geo = new THREE.BoxGeometry(1.07, 0.02, 0.82);
  const edge2 = new THREE.Mesh(edge2Geo, matGlow);
  edge2.position.y = 0.24;
  base.add(edge2);

  for (const [x, z] of [[-0.52, -0.4], [0.52, -0.4], [-0.52, 0.4], [0.52, 0.4]]) {
    const pylonGeo = new THREE.BoxGeometry(0.14, 0.22, 0.14);
    const pylon = new THREE.Mesh(pylonGeo, matBody);
    pylon.position.set(x, 0.35, z);
    base.add(pylon);

    const armorGeo = new THREE.BoxGeometry(0.16, 0.18, 0.04);
    const armor = new THREE.Mesh(armorGeo, matAccent);
    armor.position.set(x, 0.35, z + (z > 0 ? 0.08 : -0.08));
    base.add(armor);

    const topGeo = new THREE.BoxGeometry(0.12, 0.03, 0.12);
    const top = new THREE.Mesh(topGeo, matGlow);
    top.position.set(x, 0.48, z);
    base.add(top);

    const footGeo = new THREE.BoxGeometry(0.18, 0.04, 0.18);
    const foot = new THREE.Mesh(footGeo, matDark);
    foot.position.set(x, 0.02, z);
    base.add(foot);
  }

  const body1Geo = new THREE.BoxGeometry(0.95, 0.4, 0.7);
  const body1 = new THREE.Mesh(body1Geo, matBody);
  body1.position.y = 0.44;
  base.add(body1);

  const body2Geo = new THREE.BoxGeometry(0.85, 0.35, 0.6);
  const body2 = new THREE.Mesh(body2Geo, matBody);
  body2.position.y = 0.82;
  base.add(body2);

  const body3Geo = new THREE.BoxGeometry(0.75, 0.25, 0.5);
  const body3 = new THREE.Mesh(body3Geo, matBody);
  body3.position.y = 1.12;
  base.add(body3);

  for (const side of [-1, 1]) {
    const sidePanelGeo = new THREE.BoxGeometry(0.03, 0.75, 0.5);
    const sidePanel = new THREE.Mesh(sidePanelGeo, matAccent);
    sidePanel.position.set(side * 0.49, 0.7, 0);
    base.add(sidePanel);

    const fbPanelGeo = new THREE.BoxGeometry(0.7, 0.75, 0.03);
    const fbPanel = new THREE.Mesh(fbPanelGeo, matAccent);
    fbPanel.position.set(0, 0.7, side * 0.36);
    base.add(fbPanel);
  }

  for (let i = 0; i < 4; i++) {
    const lineGeo = new THREE.BoxGeometry(0.97, 0.025, 0.72);
    const line = new THREE.Mesh(lineGeo, matGlow);
    line.position.y = 0.32 + i * 0.22;
    base.add(line);
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const conduitGeo = new THREE.BoxGeometry(0.04, 0.65, 0.06);
    const conduit = new THREE.Mesh(conduitGeo, matGlow);
    conduit.position.set(Math.cos(angle) * 0.42, 0.72, Math.sin(angle) * 0.32);
    base.add(conduit);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const stackGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.4, 6);
      const stack = new THREE.Mesh(stackGeo, matDark);
      stack.position.set(side * 0.58, 0.65, -0.2 + i * 0.2);
      base.add(stack);

      const capGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.04, 6);
      const cap = new THREE.Mesh(capGeo, matBody);
      cap.position.set(side * 0.58, 0.87, -0.2 + i * 0.2);
      base.add(cap);

      const stackRingGeo = new THREE.TorusGeometry(0.055, 0.012, 6, 8);
      const stackRing = new THREE.Mesh(stackRingGeo, matGlow);
      stackRing.position.set(side * 0.58, 0.7, -0.2 + i * 0.2);
      stackRing.rotation.x = Math.PI / 2;
      base.add(stackRing);
    }
  }

  const mountGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.14, 12);
  const mount = new THREE.Mesh(mountGeo, matDark);
  mount.position.y = 1.31;
  base.add(mount);

  const mountRingGeo = new THREE.TorusGeometry(0.4, 0.025, 8, 16);
  const mountRing = new THREE.Mesh(mountRingGeo, matGlow);
  mountRing.position.y = 1.38;
  mountRing.rotation.x = Math.PI / 2;
  base.add(mountRing);

  group.add(base);

  const turret = new THREE.Group();

  const house1Geo = new THREE.BoxGeometry(0.7, 0.25, 0.55);
  const house1 = new THREE.Mesh(house1Geo, matBody);
  house1.position.y = 0.12;
  turret.add(house1);

  const house2Geo = new THREE.BoxGeometry(0.6, 0.2, 0.48);
  const house2 = new THREE.Mesh(house2Geo, matBody);
  house2.position.y = 0.35;
  turret.add(house2);

  const house3Geo = new THREE.BoxGeometry(0.5, 0.14, 0.4);
  const house3 = new THREE.Mesh(house3Geo, matBody);
  house3.position.y = 0.52;
  turret.add(house3);

  for (const side of [-1, 1]) {
    const panelGeo = new THREE.BoxGeometry(0.025, 0.45, 0.42);
    const panel = new THREE.Mesh(panelGeo, matAccent);
    panel.position.set(side * 0.365, 0.22, 0);
    turret.add(panel);
  }

  for (let i = 0; i < 3; i++) {
    const lineGeo = new THREE.BoxGeometry(0.72, 0.02, 0.57);
    const line = new THREE.Mesh(lineGeo, matGlow);
    line.position.y = 0.06 + i * 0.18;
    turret.add(line);
  }

  const mortarGroup = new THREE.Group();
  mortarGroup.position.set(0, 0.35, 0.18);
  mortarGroup.rotation.x = -Math.PI / 4;

  const breachGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.25, 12);
  const breach = new THREE.Mesh(breachGeo, matBody);
  breach.position.y = 0.12;
  mortarGroup.add(breach);

  const tubeGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.7, 12);
  const tube = new THREE.Mesh(tubeGeo, matBody);
  tube.position.y = 0.58;
  mortarGroup.add(tube);

  const jacketGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12);
  const jacket = new THREE.Mesh(jacketGeo, matDark);
  jacket.position.y = 0.32;
  mortarGroup.add(jacket);

  for (let i = 0; i < 4; i++) {
    const bandGeo = new THREE.TorusGeometry(0.19 - i * 0.01, 0.025, 8, 12);
    const band = new THREE.Mesh(bandGeo, matGlow);
    band.position.y = 0.25 + i * 0.18;
    band.rotation.x = Math.PI / 2;
    mortarGroup.add(band);
  }

  const muz1Geo = new THREE.CylinderGeometry(0.18, 0.16, 0.1, 12);
  const muz1 = new THREE.Mesh(muz1Geo, matDark);
  muz1.position.y = 0.98;
  mortarGroup.add(muz1);

  const muz2Geo = new THREE.CylinderGeometry(0.22, 0.18, 0.08, 12);
  const muz2 = new THREE.Mesh(muz2Geo, matBody);
  muz2.position.y = 1.06;
  mortarGroup.add(muz2);

  const muz3Geo = new THREE.CylinderGeometry(0.26, 0.22, 0.06, 12);
  const muz3 = new THREE.Mesh(muz3Geo, matAccent);
  muz3.position.y = 1.12;
  mortarGroup.add(muz3);

  const muz4Geo = new THREE.CylinderGeometry(0.24, 0.26, 0.04, 12);
  const muz4 = new THREE.Mesh(muz4Geo, matGlow);
  muz4.position.y = 1.17;
  mortarGroup.add(muz4);

  const loadedShellGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8);
  const loadedShell = new THREE.Mesh(loadedShellGeo, matCore);
  loadedShell.position.y = 0.2;
  mortarGroup.add(loadedShell);

  turret.add(mortarGroup);
  turret.userData.mortarGroup = mortarGroup;

  const targetAssembly = new THREE.Group();
  
  const targetBaseGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8);
  const targetBase = new THREE.Mesh(targetBaseGeo, matDark);
  targetAssembly.add(targetBase);

  const targetRingGeo = new THREE.TorusGeometry(0.14, 0.015, 8, 16);
  const targetRing = new THREE.Mesh(targetRingGeo, matGlow);
  targetRing.position.y = 0.08;
  targetRing.rotation.x = Math.PI / 2;
  targetAssembly.add(targetRing);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const sensorGeo = new THREE.BoxGeometry(0.03, 0.04, 0.06);
    const sensor = new THREE.Mesh(sensorGeo, matCore);
    sensor.position.set(Math.cos(angle) * 0.14, 0.08, Math.sin(angle) * 0.14);
    sensor.rotation.y = -angle;
    targetAssembly.add(sensor);
  }

  targetAssembly.position.set(0, 0.66, 0);
  turret.add(targetAssembly);
  turret.userData.targetAssembly = targetAssembly;

  for (const side of [-1, 1]) {
    const magHouseGeo = new THREE.BoxGeometry(0.16, 0.28, 0.22);
    const magHouse = new THREE.Mesh(magHouseGeo, matDark);
    magHouse.position.set(side * 0.42, 0.14, 0);
    turret.add(magHouse);

    for (let i = 0; i < 2; i++) {
      const bandGeo = new THREE.BoxGeometry(0.17, 0.02, 0.23);
      const band = new THREE.Mesh(bandGeo, matGlow);
      band.position.set(side * 0.42, 0.05 + i * 0.18, 0);
      turret.add(band);
    }

    for (let i = 0; i < 3; i++) {
      const shellGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.16, 6);
      const shell = new THREE.Mesh(shellGeo, matGlow);
      shell.position.set(side * 0.42, 0.06 + i * 0.08, -0.04 + (i % 2) * 0.08);
      turret.add(shell);
    }

    const loaderGeo = new THREE.BoxGeometry(0.1, 0.06, 0.14);
    const loader = new THREE.Mesh(loaderGeo, matBody);
    loader.position.set(side * 0.3, 0.2, 0.08);
    turret.add(loader);
  }

  const plantGeo = new THREE.BoxGeometry(0.4, 0.22, 0.26);
  const plant = new THREE.Mesh(plantGeo, matDark);
  plant.position.set(0, 0.12, -0.38);
  turret.add(plant);

  for (let i = 0; i < 4; i++) {
    const cellGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6);
    const cell = new THREE.Mesh(cellGeo, matGlow);
    cell.position.set(-0.12 + i * 0.08, 0.12, -0.52);
    turret.add(cell);
  }

  for (const side of [-1, 1]) {
    const ventGeo = new THREE.BoxGeometry(0.06, 0.16, 0.14);
    const vent = new THREE.Mesh(ventGeo, matDark);
    vent.position.set(side * 0.24, 0.08, -0.38);
    turret.add(vent);

    for (let i = 0; i < 4; i++) {
      const slotGeo = new THREE.BoxGeometry(0.07, 0.025, 0.03);
      const slot = new THREE.Mesh(slotGeo, matGlow);
      slot.position.set(side * 0.24, 0.0 + i * 0.04, -0.38);
      turret.add(slot);
    }
  }

  turret.position.y = 1.38;
  group.add(turret);

  const ordnancePods = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const podGroup = new THREE.Group();
    
    const shellBodyGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.14, 8);
    const shellBody = new THREE.Mesh(shellBodyGeo, matShell);
    podGroup.add(shellBody);

    const shellTipGeo = new THREE.ConeGeometry(0.04, 0.06, 8);
    const shellTip = new THREE.Mesh(shellTipGeo, matCore);
    shellTip.position.y = 0.1;
    podGroup.add(shellTip);

    for (let f = 0; f < 4; f++) {
      const finAngle = (f / 4) * Math.PI * 2;
      const finGeo = new THREE.BoxGeometry(0.01, 0.04, 0.03);
      const fin = new THREE.Mesh(finGeo, matGlow);
      fin.position.set(Math.cos(finAngle) * 0.05, -0.05, Math.sin(finAngle) * 0.05);
      fin.rotation.y = -finAngle;
      podGroup.add(fin);
    }

    podGroup.userData.podIndex = i;
    ordnancePods.add(podGroup);
  }
  ordnancePods.position.y = 2.3;
  group.add(ordnancePods);

  const fieldRingGeo = new THREE.TorusGeometry(0.45, 0.018, 8, 24);
  const fieldRing = new THREE.Mesh(fieldRingGeo, matGlow);
  fieldRing.position.y = 2.3;
  fieldRing.rotation.x = Math.PI / 2;
  group.add(fieldRing);

  const fieldRing2Geo = new THREE.TorusGeometry(0.35, 0.012, 8, 20);
  const fieldRing2 = new THREE.Mesh(fieldRing2Geo, matGlow);
  fieldRing2.position.y = 2.3;
  fieldRing2.rotation.x = Math.PI / 2;
  group.add(fieldRing2);

  group.userData = { 
    turret, 
    mortarGroup,
    targetAssembly,
    ordnancePods,
    fieldRing,
    fieldRing2,
    loadedShell,
    animatedParts: [muz4, loadedShell]
  };
  return group;
}

// --- ATMOSPHERE & EFFECTS ---

const AmbientParticles: React.FC<{ type: string }> = ({ type }) => {
    if (type === 'embers') {
        return <Sparkles count={150} scale={15} size={6} speed={0.4} opacity={0.8} color="#f97316" noise={1} />;
    }
    if (type === 'void_particles') {
        return <Sparkles count={100} scale={20} size={10} speed={0.2} opacity={0.6} color="#8b5cf6" noise={0.5} />;
    }
    if (type === 'dust') {
        return <Sparkles count={300} scale={25} size={4} speed={0.2} opacity={0.2} color="#ffffff" />;
    }
    if (type === 'rain') {
        return <Sparkles count={500} scale={[20, 10, 20]} size={2} speed={3} opacity={0.4} color="#60a5fa" />;
    }
    return null;
};

const EnvironmentManager: React.FC<{ env: StageEnvironment }> = ({ env }) => {
    const { scene } = useThree();
    scene.fog = env.fogColor ? new THREE.FogExp2(env.fogColor, env.fogDensity || 0.02) : null;
    scene.background = env.fogColor ? new THREE.Color(env.fogColor) : null;
    let preset: any = env.skyPreset === 'sunset' ? 'sunset' : env.skyPreset === 'park' ? 'park' : env.skyPreset === 'forest' ? 'forest' : env.skyPreset === 'city' ? 'city' : 'night';
    return (
        <>
            <Environment preset={preset} background={false} />
            {env.particleType && <AmbientParticles type={env.particleType} />}
        </>
    );
};

// --- VISUAL ASSETS ---

const NukeEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
  const scale = 1 + progress * 8; 
  const opacity = 1 - Math.pow(progress, 3); 
  return (
    <group position={[position.x, 0, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[scale * 0.8, scale, 64]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, scale * 0.3, 0]}>
         <sphereGeometry args={[scale * 0.4, 32, 32]} />
         <meshBasicMaterial color="#fff" emissive={color} emissiveIntensity={0.5} transparent opacity={opacity * 0.8} />
      </mesh>
      <Sparkles count={50} scale={scale * 1.5} size={6} speed={0.4} opacity={opacity} color={color} position={[0, scale * 0.5, 0]} />
    </group>
  );
};

const ChainArc: React.FC<{ start: Vector3Tuple, end: Vector3Tuple, color: string, progress: number, type?: string }> = ({ start, end, color, progress, type }) => {
    const opacity = 1 - progress;
    return (
        <Line 
            points={[[start.x, 0.5, start.z], [end.x, 0.5, end.z]]} 
            color={color} 
            lineWidth={type === 'HEAL_BEAM' ? 2 * opacity : 3 * opacity} 
            transparent 
            opacity={opacity} 
            dashed={type === 'HEAL_BEAM'}
        />
    )
}

const VoidSigil: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
    const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
    const opacity = 1 - progress;
    return (
        <group position={[position.x, position.y + 1, position.z]}>
            <Billboard follow={true}>
                 <Text fontSize={scale} color={color} fillOpacity={opacity} outlineWidth={0.05} outlineColor="black">
                     👁‍🗨
                 </Text>
            </Billboard>
        </group>
    );
};

const DisableFieldEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number, scale: number }> = ({ position, color, progress, scale }) => {
    const opacity = progress > 0.9 ? (1 - progress) * 10 : 0.3;
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.05;
    return (
        <group position={[position.x, 0, position.z]}>
             <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                 <circleGeometry args={[scale * 0.5 * pulse, 32]} />
                 <meshBasicMaterial color={color} transparent opacity={opacity} />
             </mesh>
             <Sparkles count={20} scale={scale} size={4} speed={0.5} opacity={opacity} color={color} position={[0, 0.5, 0]} />
        </group>
    );
};

const BomberExplosion: React.FC<{ position: Vector3Tuple, color: string, progress: number, scale: number }> = ({ position, color, progress, scale }) => {
    const opacity = 1 - progress;
    const currentScale = scale * progress;
    return (
        <group position={[position.x, 0, position.z]}>
             <mesh position={[0, 0.5, 0]}>
                 <sphereGeometry args={[currentScale, 16, 16]} />
                 <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} />
             </mesh>
             <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                 <ringGeometry args={[currentScale * 0.9, currentScale, 32]} />
                 <meshBasicMaterial color={color} transparent opacity={opacity} />
             </mesh>
             <Sparkles count={30} scale={scale * 1.5} size={5} speed={1} opacity={opacity} color={color} />
        </group>
    );
}

const OrbitalStrikeEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
    const isFalling = progress < 0.2;
    const explodeProgress = isFalling ? 0 : (progress - 0.2) / 0.8;
    const fallRatio = progress * 5; 
    const missileY = 20 - (fallRatio * 20);

    return (
        <group position={[position.x, 0, position.z]}>
            {isFalling && (
                <group position={[0, missileY, 0]}>
                    <mesh position={[0, 2, 0]}>
                         <cylinderGeometry args={[0.05, 0.2, 4, 8, 1, true]} />
                         <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            )}

            {!isFalling && (
                <group>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                        <ringGeometry args={[explodeProgress * 3.5, explodeProgress * 4, 64]} />
                        <meshBasicMaterial color={color} transparent opacity={1 - explodeProgress} />
                    </mesh>
                    <Sparkles count={100} scale={5 + explodeProgress * 5} size={10} speed={1} opacity={1 - explodeProgress} color="#fff" />
                </group>
            )}
        </group>
    );
};

const HealPulseEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number, scale: number }> = ({ position, color, progress, scale }) => {
    const opacity = 1 - progress;
    const currentScale = scale * progress;
    return (
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position.x, 0.1, position.z]}>
             <ringGeometry args={[currentScale * 0.9, currentScale, 32]} />
             <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
         </mesh>
    );
}

const HealEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
    return (
        <group position={[position.x, position.y + progress, position.z]}>
             <Billboard>
                 <Text fontSize={0.5} color={color} fillOpacity={1 - progress}>+</Text>
             </Billboard>
        </group>
    );
}

const FreezeEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
  const entrance = Math.min(progress * 5, 1);
  const fade = progress > 0.8 ? (1 - progress) * 5 : 1;
  const scale = 5 * entrance; 
  return (
    <group position={[position.x, 0, position.z]}>
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[scale, 2]} />
        <meshPhysicalMaterial color={color} roughness={0.1} transmission={0.6} thickness={2} transparent opacity={0.3 * fade} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0, scale, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.2 * fade} />
      </mesh>
    </group>
  );
};

const HazardsRenderer: React.FC<{ hazards: Hazard[] }> = ({ hazards }) => {
    return (
        <>
            {hazards.map(h => (
                <group key={h.id} position={[h.position.x, 0, h.position.z]}>
                    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
                         <ringGeometry args={[h.radius * 0.9, h.radius, 32]} />
                         <meshBasicMaterial color={h.color} opacity={0.5} transparent />
                    </mesh>
                    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
                         <circleGeometry args={[h.radius, 32]} />
                         <meshBasicMaterial color={h.color} opacity={0.1} transparent />
                    </mesh>
                    {h.type === 'NAPALM' && (
                         <Sparkles count={20 * h.radius} scale={h.radius * 2} size={5} color={h.color} speed={0.5} opacity={0.5} />
                    )}
                    {h.type === 'SINGULARITY' && (
                        <group>
                             <mesh>
                                <sphereGeometry args={[0.5, 16, 16]} />
                                <meshBasicMaterial color="#000" />
                            </mesh>
                             <Sparkles count={30} scale={h.radius * 1.5} size={3} color={h.color} speed={2} opacity={0.5} noise={1} />
                        </group>
                    )}
                </group>
            ))}
        </>
    );
};

const SupplyDropsRenderer: React.FC<{ supplyDrops: SupplyDrop[], onCollect: (id: string) => void }> = ({ supplyDrops, onCollect }) => {
    return (
        <>
            {supplyDrops.map(sd => (
                <group key={sd.id} position={[sd.position.x, 0, sd.position.z]} onClick={(e) => { e.stopPropagation(); onCollect(sd.id); }}>
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                        <mesh position={[0, 0.5, 0]}>
                            <boxGeometry args={[0.6, 0.6, 0.6]} />
                            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
                        </mesh>
                        <Html position={[0, 1.2, 0]} center>
                             <div className="bg-green-500 text-black text-[10px] font-black px-1 rounded animate-bounce">SUPPLY</div>
                        </Html>
                    </Float>
                    <Sparkles count={20} scale={2} size={4} speed={2} color="#4ade80" />
                </group>
            ))}
        </>
    );
};

const DamageNumbersRenderer: React.FC<{ damageNumbers: DamageNumber[] }> = ({ damageNumbers }) => {
    return (
        <>
            {damageNumbers.map(dn => {
                const progress = 1 - (dn.lifetime / dn.maxLifetime);
                const opacity = 1 - progress;
                const yOffset = progress * 1.5;
                return (
                    <Billboard key={dn.id} position={[dn.position.x, dn.position.y + yOffset, dn.position.z]} follow={true}>
                        <Text fontSize={dn.isCritical ? 0.6 : 0.4} color={dn.color} anchorX="center" anchorY="middle" fillOpacity={opacity} outlineWidth={0.04} outlineColor="#000000" outlineOpacity={opacity}>
                            {Math.floor(dn.value)}
                        </Text>
                    </Billboard>
                );
            })}
        </>
    );
};

const EnemyUnit: React.FC<{ enemy: Enemy }> = ({ enemy }) => {
    const [hovered, setHovered] = useState(false);
    const isElite = enemy.isElite;
    const isBurning = enemy.debuffs?.some(d => d.type === 'BURN');
    const isMarked = enemy.debuffs?.some(d => d.type === 'VOID_MARK');
    
    // Geometry/Color based on type
    const stats = ENEMY_STATS[enemy.type];
    const color = enemy.freezeTimer && enemy.freezeTimer > 0 ? '#a5f3fc' : stats.color;

    return (
        <group 
            position={[enemy.position.x, enemy.position.y + 0.5, enemy.position.z]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                {enemy.type === EnemyType.SPLITTER ? (
                    <mesh castShadow scale={isElite ? 1.4 : 1}>
                        <dodecahedronGeometry args={[0.35]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                ) : enemy.type === EnemyType.SPLITTER_MINI ? (
                    <mesh castShadow scale={isElite ? 1.4 : 1}>
                         <dodecahedronGeometry args={[0.2]} />
                         <meshStandardMaterial color={color} />
                    </mesh>
                ) : enemy.type === EnemyType.SHIELDED ? (
                    <group scale={isElite ? 1.4 : 1}>
                         <mesh castShadow><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={color} /></mesh>
                         {/* Shield Visual */}
                         {enemy.shield !== undefined && enemy.shield > 0 && !enemy.shieldBroken && (
                             <mesh>
                                 <sphereGeometry args={[0.6, 16, 16]} />
                                 <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} wireframe />
                             </mesh>
                         )}
                    </group>
                ) : enemy.type === EnemyType.HEALER ? (
                     <group scale={isElite ? 1.4 : 1}>
                         <mesh castShadow><sphereGeometry args={[0.3, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} /></mesh>
                         <Billboard position={[0, 0.6, 0]}><Text fontSize={0.4} color="#00ff00">+</Text></Billboard>
                         <Sparkles count={5} scale={1} size={2} color="#4ade80" />
                     </group>
                ) : enemy.type === EnemyType.PHASER ? (
                     <group scale={isElite ? 1.4 : 1}>
                         <mesh castShadow>
                             <octahedronGeometry args={[0.35]} />
                             <meshStandardMaterial color={color} transparent opacity={enemy.isPhased ? 0.3 : 0.8} />
                         </mesh>
                         {enemy.isPhased && <Sparkles count={10} scale={1.2} size={3} color="#a78bfa" />}
                     </group>
                ) : enemy.type === EnemyType.BOMBER ? (
                     <group scale={isElite ? 1.4 : 1}>
                         <mesh castShadow><icosahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color={color} /></mesh>
                         <mesh scale={Math.sin(Date.now() / 100) * 0.1 + 1}>
                             <sphereGeometry args={[0.15]} />
                             <meshBasicMaterial color="#fff" emissive="#f97316" emissiveIntensity={2} />
                         </mesh>
                     </group>
                ) : enemy.type === EnemyType.ARMORED ? (
                     <mesh castShadow scale={isElite ? 1.4 : 1.2}>
                         <boxGeometry args={[0.5, 0.5, 0.5]} />
                         <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
                     </mesh>
                ) : enemy.type === EnemyType.SWARM ? (
                     <mesh castShadow scale={0.6}>
                         <tetrahedronGeometry args={[0.2]} />
                         <meshStandardMaterial color={color} />
                     </mesh>
                ) : (
                    <Box args={[0.6, 0.6, 0.6]} castShadow scale={isElite ? 1.4 : 1}>
                        <meshStandardMaterial color={color} />
                    </Box>
                )}
            </Float>
            <mesh position={[0, 0.8, 0]}>
                <planeGeometry args={[0.8, 0.1]} />
                <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[0, 0.8, 0.01]}>
                <planeGeometry args={[0.8 * (enemy.health / enemy.maxHealth), 0.1]} />
                <meshBasicMaterial color="#4ade80" />
            </mesh>
            
            {enemy.shield !== undefined && enemy.shield > 0 && !enemy.shieldBroken && (
                <mesh position={[0, 0.95, 0.01]}>
                    <planeGeometry args={[0.8 * (enemy.shield / (enemy.maxShield || 60)), 0.05]} />
                    <meshBasicMaterial color="#60a5fa" />
                </mesh>
            )}

            {isElite && (
                 <>
                    <Html position={[0, 1.4, 0]} center>
                        <div className="text-[8px] font-black text-red-500 bg-black/50 px-1 rounded uppercase tracking-widest border border-red-500">ELITE</div>
                    </Html>
                    <Sparkles count={10} scale={1.5} size={3} color="#ef4444" speed={2} />
                 </>
            )}

            {isBurning && <Sparkles count={20} scale={1.2} size={4} color="#f97316" speed={1.5} noise={0.5} position={[0, 0, 0]} />}
            {isMarked && (
                 <Billboard position={[0, 1.2, 0]}>
                     <Text fontSize={0.5} color="#c084fc">👁‍🗨</Text>
                 </Billboard>
            )}

            {hovered && (
                <Html position={[0, 1.2, 0]} center zIndexRange={[100, 0]}>
                    <div className="bg-slate-900/90 text-white p-1.5 rounded border border-slate-700 text-[10px] font-bold whitespace-nowrap">
                        <div className="text-slate-300">{isElite ? `ELITE ${enemy.type}` : enemy.type}</div>
                        <div>HP: {Math.ceil(enemy.health)} / {Math.ceil(enemy.maxHealth)}</div>
                        {enemy.shield !== undefined && enemy.shield > 0 && <div>SHIELD: {Math.ceil(enemy.shield)}</div>}
                    </div>
                </Html>
            )}
        </group>
    )
}

const TowerUnit: React.FC<{ 
    tower: Tower; 
    enemies: Enemy[]; 
    isSelected: boolean;
    onSelect: (id: string) => void;
}> = ({ tower, enemies, isSelected, onSelect }) => {
  const turretRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const overclockRef = useRef<THREE.Group>(null);
  const disabledRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // New Basic Tower Models Logic
  const basicModel = useMemo(() => {
    if (tower.type !== TowerType.BASIC) return null;
    if (tower.level === 1) return buildBasicL1();
    if (tower.level === 2) return buildBasicL2();
    return buildBasicL3(); // Level 3+
  }, [tower.type, tower.level]);

  // New Sniper Tower Models Logic
  const sniperModel = useMemo(() => {
    if (tower.type !== TowerType.SNIPER) return null;
    if (tower.level === 1) return buildSniperL1();
    if (tower.level === 2) return buildSniperL2();
    return buildSniperL3(); // Level 3+
  }, [tower.type, tower.level]);

  // New Fast Tower Models Logic
  const fastModel = useMemo(() => {
    if (tower.type !== TowerType.FAST) return null;
    if (tower.level === 1) return buildFastL1();
    if (tower.level === 2) return buildFastL2();
    return buildFastL3(); // Level 3+
  }, [tower.type, tower.level]);

  // New Artillery Tower Models Logic
  const artilleryModel = useMemo(() => {
    if (tower.type !== TowerType.ARTILLERY) return null;
    if (tower.level === 1) return buildArtilleryL1();
    if (tower.level === 2) return buildArtilleryL2();
    return buildArtilleryL3(); // Level 3+
  }, [tower.type, tower.level]);

  // Clean up geometries/materials when basicModel unmounts or changes
  useEffect(() => {
    return () => {
        if (basicModel) {
             basicModel.traverse((obj: any) => {
                if (obj.isMesh) {
                    obj.geometry.dispose();
                    if (obj.material.isMaterial) obj.material.dispose();
                }
             });
        }
        if (sniperModel) {
             sniperModel.traverse((obj: any) => {
                if (obj.isMesh) {
                    obj.geometry.dispose();
                    if (obj.material.isMaterial) obj.material.dispose();
                }
             });
        }
        if (fastModel) {
             fastModel.traverse((obj: any) => {
                if (obj.isMesh) {
                    obj.geometry.dispose();
                    if (obj.material.isMaterial) obj.material.dispose();
                }
             });
        }
        if (artilleryModel) {
             artilleryModel.traverse((obj: any) => {
                if (obj.isMesh) {
                    obj.geometry.dispose();
                    if (obj.material.isMaterial) obj.material.dispose();
                }
             });
        }
    };
  }, [basicModel, sniperModel, fastModel, artilleryModel]);

  const stats = TOWER_STATS[tower.type];
  const displayColor = tower.techPath !== TechPath.NONE ? TECH_PATH_INFO[tower.techPath].color : stats.color;
  const baseHeight = tower.type === TowerType.ARTILLERY ? 0.3 : 0.5;
  const isDisabled = tower.disabledTimer && tower.disabledTimer > 0;

  useFrame((state, delta) => {
    // Disabled Animation
    if (isDisabled && disabledRef.current) {
        disabledRef.current.rotation.y += delta;
        disabledRef.current.rotation.z += delta * 0.5;
    }

    // Aiming Logic
    let closest: Enemy | null = null;
    let targetAngle = 0;
    
    // Find Target
    let minDist = tower.range;
    for (const enemy of enemies) {
        if (enemy.type === EnemyType.PHASER && enemy.isPhased) continue; 
        const dx = enemy.position.x - tower.position.x;
        const dz = enemy.position.z - tower.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) { minDist = dist; closest = enemy; }
    }
    if (closest) {
        const dx = closest.position.x - tower.position.x;
        const dz = closest.position.z - tower.position.z;
        targetAngle = Math.atan2(dx, dz);
    } else if (turretRef.current) {
        // Keep current rotation if no target, or rotate back to 0? 
        // Typically keep current.
        targetAngle = turretRef.current.rotation.y;
    }

    // Apply rotation and animation
    if (!isDisabled) {
        if (tower.type === TowerType.BASIC && basicModel) {
            const turret = basicModel.userData.turret;
            if (turret) turret.rotation.y = targetAngle;
            
            // Basic Tower Specific Animations
            const time = state.clock.elapsedTime;
            if (basicModel.userData.sensorGroup) basicModel.userData.sensorGroup.rotation.y += delta * 0.5;
            
            if (basicModel.userData.orbitals) {
               basicModel.userData.orbitals.rotation.y += delta * 0.5;
               basicModel.userData.orbitals.children.forEach((orb: any, i: number) => {
                   orb.position.y = 1.35 + Math.sin(time * 2 + i) * 0.1;
               });
            }

            if (basicModel.userData.animatedParts) {
                basicModel.userData.animatedParts.forEach((part: any) => {
                    if (part.material && part.material.emissive) {
                         const pulse = (Math.sin(time * 3) + 1) * 0.5; 
                         part.material.emissiveIntensity = 0.5 + pulse;
                    }
                });
            }
        } else if (tower.type === TowerType.SNIPER && sniperModel) {
            const turret = sniperModel.userData.turret;
            if (turret) turret.rotation.y = targetAngle;
            
            const time = state.clock.elapsedTime;
            
            // L3 Animations: Holo spin and Drones orbit
            if (sniperModel.userData.holoGroup) {
                sniperModel.userData.holoGroup.rotation.y -= delta * 2;
            }
            if (sniperModel.userData.drones) {
                sniperModel.userData.drones.children.forEach((droneGroup: any, i: number) => {
                    const offset = i * Math.PI;
                    const orbitSpeed = 0.5;
                    const radius = 0.6;
                    droneGroup.position.y = Math.sin(time * 2 + offset) * 0.1;
                    droneGroup.position.x = Math.cos(time * orbitSpeed + offset) * radius;
                    droneGroup.position.z = Math.sin(time * orbitSpeed + offset) * radius;
                    droneGroup.lookAt(0, 2, 0); 
                });
                sniperModel.userData.drones.rotation.y += delta * 0.2;
            }

            if (sniperModel.userData.animatedParts) {
                sniperModel.userData.animatedParts.forEach((part: any) => {
                    if (part.material && part.material.emissive) {
                         const pulse = (Math.sin(time * 4) + 1) * 0.5; 
                         part.material.emissiveIntensity = 0.5 + pulse * 2;
                    }
                });
            }
        } else if (tower.type === TowerType.FAST && fastModel) {
            const turret = fastModel.userData.turret;
            if (turret) turret.rotation.y = targetAngle;
            
            const time = state.clock.elapsedTime;
            
            // Spin logic: Spin fast if has target, slow idle spin otherwise? Or always fast? 
            // Let's spin fast if enemies exist (closest is not null) or just always active spin.
            // "Fast" towers usually imply constant motion.
            const spinSpeed = closest ? 15 : 2;

            if (fastModel.userData.spinGroup) {
                fastModel.userData.spinGroup.rotation.z -= delta * spinSpeed;
            }
            
            // L3 Dual Spin Groups
            if (fastModel.userData.spinGroups) {
                fastModel.userData.spinGroups.forEach((sg: any) => {
                    // Rotate counter to side for visual interest? Or same direction.
                    sg.group.rotation.z -= delta * spinSpeed * (sg.side); 
                });
            }

            // L3 Targeting Ring
            if (fastModel.userData.targetRingGroup) {
                fastModel.userData.targetRingGroup.rotation.z += delta * 1.5;
            }

            // L3 Floating Ammo Pods
            if (fastModel.userData.ammoPods) {
                fastModel.userData.ammoPods.children.forEach((pod: any, i: number) => {
                    const offset = i * (Math.PI * 2 / 3);
                    const radius = 0.5;
                    pod.position.y = 1.7 + Math.sin(time * 2 + offset) * 0.15;
                    pod.position.x = Math.cos(time * 0.5 + offset) * radius;
                    pod.position.z = Math.sin(time * 0.5 + offset) * radius;
                    pod.rotation.y += delta;
                });
                fastModel.userData.ammoPods.rotation.y -= delta * 0.3;
            }

            if (fastModel.userData.animatedParts) {
                fastModel.userData.animatedParts.forEach((part: any) => {
                    if (part.material && part.material.emissive) {
                         const pulse = (Math.sin(time * 8) + 1) * 0.5; 
                         part.material.emissiveIntensity = 0.8 + pulse * 0.5;
                    }
                });
            }
        } else if (tower.type === TowerType.ARTILLERY && artilleryModel) {
            const turret = artilleryModel.userData.turret;
            if (turret) turret.rotation.y = targetAngle;

            const time = state.clock.elapsedTime;

            // L3 Animations
            if (artilleryModel.userData.targetAssembly) {
                artilleryModel.userData.targetAssembly.rotation.y += delta;
            }
            
            if (artilleryModel.userData.ordnancePods) {
                 artilleryModel.userData.ordnancePods.children.forEach((pod: any, i: number) => {
                     pod.position.y = 2.3 + Math.sin(time * 1.5 + i) * 0.15;
                     pod.rotation.y += delta * 0.5;
                 });
                 artilleryModel.userData.ordnancePods.rotation.y -= delta * 0.1;
            }

            if (artilleryModel.userData.animatedParts) {
                artilleryModel.userData.animatedParts.forEach((part: any) => {
                    if (part.material && part.material.emissive) {
                         const pulse = (Math.sin(time * 2) + 1) * 0.5;
                         part.material.emissiveIntensity = 0.5 + pulse;
                    }
                });
            }
        }
        else if (turretRef.current) {
            // Default Geometry Rotation
            turretRef.current.rotation.y = targetAngle;
        }
    }
    
    if (auraRef.current && !isDisabled) {
        auraRef.current.rotation.z += delta * 0.5;
    }

    if (overclockRef.current && tower.activeBuffs?.some(b => b.type === 'OVERCLOCK') && !isDisabled) {
        overclockRef.current.rotation.x += delta * 5;
        overclockRef.current.rotation.y += delta * 10;
        const scale = 1 + Math.sin(state.clock.elapsedTime * 20) * 0.1;
        overclockRef.current.scale.setScalar(scale);
    }
  });

  const hasAura = tower.passiveType !== PassiveType.NONE;
  let auraRange = 0;
  // @ts-ignore
  if (hasAura) auraRange = PASSIVE_CONFIG[tower.passiveType]?.range || 0;

  return (
    <group 
        position={[tower.position.x, 0, tower.position.z]} 
        onClick={(e) => { e.stopPropagation(); onSelect(tower.id); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
    >
      {/* Invisible Hitbox for reliable clicking */}
      <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.5, 0.6, 1.2, 8]} />
          <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {hasAura && !isDisabled && (
          <mesh ref={auraRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[auraRange - 0.1, auraRange, 32]} />
              <meshBasicMaterial color={displayColor} opacity={0.2} transparent side={THREE.DoubleSide} />
          </mesh>
      )}

      {isDisabled && (
          <group position={[0, 1.5, 0]} ref={disabledRef}>
              <mesh><torusGeometry args={[0.4, 0.05, 8, 16]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </group>
      )}

      {tower.activeBuffs?.some(b => b.type === 'OVERCLOCK') && !isDisabled && (
        <group position={[0, 1, 0]}>
          <group ref={overclockRef}>
              <mesh><sphereGeometry args={[1.2, 8, 4]} /><meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.5} /></mesh>
          </group>
        </group>
      )}

      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.8, 32]} />
          <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
        </mesh>
      )}

      {isSelected && (
         <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
         <ringGeometry args={[tower.range - 0.05, tower.range, 64]} />
         <meshBasicMaterial color={displayColor} opacity={0.3} transparent />
       </mesh>
      )}

      {/* RENDER LOGIC: Use High Fidelity Model for BASIC, fallback to primitive blocks for others */}
      {tower.type === TowerType.BASIC && basicModel ? (
          <primitive object={basicModel} />
      ) : tower.type === TowerType.SNIPER && sniperModel ? (
          <primitive object={sniperModel} />
      ) : tower.type === TowerType.FAST && fastModel ? (
          <primitive object={fastModel} />
      ) : tower.type === TowerType.ARTILLERY && artilleryModel ? (
          <primitive object={artilleryModel} />
      ) : (
          <>
            <mesh position={[0, baseHeight/2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.4, 0.5, baseHeight, 6]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
            </mesh>
            
            {/* Levels Indicators */}
            {tower.level >= 2 && <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.6, 0.2, 0.6]} /><meshStandardMaterial color={displayColor} /></mesh>}
            {tower.level >= 3 && <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.5, 0.2, 0.5]} /><meshStandardMaterial color="#0f172a" /></mesh>}
            
            <group ref={turretRef} position={[0, 0.5 + (tower.level * 0.1), 0]}>
                <mesh castShadow><cylinderGeometry args={[0.2, 0.3, 0.5]} /><meshStandardMaterial color={displayColor} /></mesh>
                <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0.2, 0.4]}><cylinderGeometry args={[0.1, 0.1, 0.8]} /><meshStandardMaterial color="#333" /></mesh>
            </group>
          </>
      )}

      {hovered && !isSelected && (
          <Html position={[0, 2, 0]} center zIndexRange={[100, 0]}>
              <div className="bg-slate-900/90 text-white px-2 py-1 rounded border border-blue-500/50 text-[10px] font-bold whitespace-nowrap shadow-lg">
                  <div className="text-blue-300 uppercase tracking-wide">{tower.type} Lvl {tower.level}</div>
              </div>
          </Html>
      )}
    </group>
  );
};

// Effects renderer
const EffectsRenderer: React.FC<{ effects: Effect[] }> = ({ effects }) => {
    return (
        <>
            {effects.map(effect => {
                const progress = 1 - (effect.lifetime / effect.maxLifetime); 
                
                if (effect.type === 'NOVA' || effect.type === 'FREEZE_WAVE') return <NukeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
                if (effect.type === 'ORBITAL_STRIKE') return <OrbitalStrikeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
                if (effect.type === 'DISABLE_FIELD') return <DisableFieldEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} scale={effect.scale} />;
                if (effect.type === 'CHAIN_ARC' && effect.targetPosition) return <ChainArc key={effect.id} start={effect.position} end={effect.targetPosition} color={effect.color} progress={progress} />;
                if (effect.type === 'HEAL_BEAM' && effect.targetPosition) return <ChainArc key={effect.id} start={effect.position} end={effect.targetPosition} color={effect.color} progress={progress} type="HEAL_BEAM" />;
                if (effect.type === 'VOID_SIGIL') return <VoidSigil key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
                if (effect.type === 'BLOCKED') return <Html key={effect.id} position={[effect.position.x, effect.position.y + progress * 2, effect.position.z]}><div className="text-blue-500 font-bold text-xs">{effect.text}</div></Html>;
                if (effect.type === 'SHIELD_BREAK') return <NukeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
                if (effect.type === 'BOMBER_EXPLOSION') return <BomberExplosion key={effect.id} position={effect.position} color={effect.color} progress={progress} scale={effect.scale} />;
                if (effect.type === 'PHASE_BLINK') return <Sparkles key={effect.id} count={10} scale={1} size={4} speed={2} opacity={1-progress} color={effect.color} position={[effect.position.x, 0.5, effect.position.z]} />;
                if (effect.type === 'HEAL_PULSE') return <HealPulseEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} scale={effect.scale} />;
                if (effect.type === 'HEAL') return <HealEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;

                const opacity = 1 - progress;
                const scale = effect.scale * (2 - opacity); 
                return <mesh key={effect.id} position={[effect.position.x, effect.position.y, effect.position.z]}><sphereGeometry args={[scale, 8, 8]} /><meshBasicMaterial color={effect.color} transparent opacity={opacity} /></mesh>;
            })}
        </>
    );
};

const TargetingReticle: React.FC<{ position: Vector3Tuple, type: ActiveAbilityType }> = ({ position, type }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => { if (ref.current) ref.current.rotation.y += 0.05; });
    return (
        <group ref={ref} position={[position.x, 0.2, position.z]}>
             <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.5, 4, 32]} /><meshBasicMaterial color="#ef4444" opacity={0.5} transparent side={THREE.DoubleSide} /></mesh>
        </group>
    );
};

const Scene: React.FC<SceneProps> = ({ gameState, onPlaceTower, onSelectTower, selectedTowerType, pendingPlacement, paths, environment, onCollectSupplyDrop }) => {
  const [hoveredPos, setHoveredPos] = useState<Vector3Tuple | null>(null);
  const ghostPos = pendingPlacement || hoveredPos;
  const isPending = !!pendingPlacement;

  return (
    <>
      <EnvironmentManager env={environment} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={environment.ambientIntensity || 0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={(e) => { e.stopPropagation(); onPlaceTower({ x: e.point.x, y: 0, z: e.point.z }); }} onPointerMove={(e) => { e.stopPropagation(); setHoveredPos({ x: Math.round(e.point.x), y: 0.1, z: Math.round(e.point.z) }); }} onPointerOut={() => setHoveredPos(null)}>
        <planeGeometry args={[GRID_SIZE * 2, GRID_SIZE * 2]} />
        <meshStandardMaterial color={environment.gridColor} metalness={0.8} roughness={0.2} />
      </mesh>
      
      <gridHelper args={[GRID_SIZE * 2, GRID_SIZE * 2, 0x1e293b, environment.pathColor]} position={[0, 0.01, 0]} />

      {paths.map((path, pathIdx) => (
          <group key={pathIdx}>
            {path.map((wp, i) => {
                if (i === path.length - 1) return null;
                const next = path[i + 1];
                const dx = next.x - wp.x;
                const dz = next.z - wp.z;
                const length = Math.sqrt(dx * dx + dz * dz) + 1; 
                const centerX = (wp.x + next.x) / 2;
                const centerZ = (wp.z + next.z) / 2;
                const angle = Math.atan2(dx, dz);
                return <mesh key={`${pathIdx}-${i}`} position={[centerX, 0.05, centerZ]} rotation={[0, angle, 0]} receiveShadow><boxGeometry args={[1.5, 0.1, length]} /><meshStandardMaterial color={environment.pathColor} emissive={environment.gridColor} /></mesh>;
            })}
          </group>
      ))}
      
      <HazardsRenderer hazards={gameState.hazards} />
      <SupplyDropsRenderer supplyDrops={gameState.supplyDrops} onCollect={onCollectSupplyDrop} />

      {gameState.enemies.map(enemy => (enemy.isBoss ? null : <EnemyUnit key={enemy.id} enemy={enemy} />))}
      {gameState.activeBoss && <EnemyUnit enemy={gameState.activeBoss} />}

      {gameState.towers.map(tower => <TowerUnit key={tower.id} tower={tower} enemies={gameState.enemies} isSelected={gameState.selectedTowerId === tower.id} onSelect={onSelectTower} />)}

      {gameState.projectiles.map(p => (
        <group key={p.id} position={[p.position.x, p.position.y, p.position.z]}>
             {p.isPerforating ? (
                 <mesh rotation={[0, Math.atan2(p.position.x, p.position.z), 0]}>
                     <boxGeometry args={[0.2, 0.2, 1.5]} />
                     <meshBasicMaterial color={p.color} />
                 </mesh>
             ) : (
                 <Sphere args={[p.sourceType === TowerType.ARTILLERY ? 0.25 : 0.15]}>
                    <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={2} />
                 </Sphere>
             )}
        </group>
      ))}
      
      <EffectsRenderer effects={gameState.effects} />
      <DamageNumbersRenderer damageNumbers={gameState.damageNumbers} />

      {gameState.targetingAbility && hoveredPos && <TargetingReticle position={hoveredPos} type={gameState.targetingAbility} />}

      {ghostPos && !gameState.selectedTowerId && !gameState.isGameOver && !gameState.targetingAbility && (
        <group position={[ghostPos.x, 0, ghostPos.z]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.8, 1, 0.8]} />
            <meshStandardMaterial color={isPending ? "#22c55e" : TOWER_STATS[selectedTowerType].color} transparent opacity={isPending ? 0.7 : 0.3} emissive={isPending ? "#22c55e" : "#000000"} emissiveIntensity={isPending ? 0.5 : 0} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[TOWER_STATS[selectedTowerType].range - 0.1, TOWER_STATS[selectedTowerType].range, 32]} />
            <meshBasicMaterial color={isPending ? "#22c55e" : TOWER_STATS[selectedTowerType].color} transparent opacity={0.5} />
          </mesh>
        </group>
      )}
    </>
  );
};

export default Scene;
