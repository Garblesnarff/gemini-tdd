
import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sky, Environment, Box, Cylinder, Sphere, Float, Sparkles, Icosahedron, Ring, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, TowerType, Vector3Tuple, EnemyType, Tower, Enemy, TechPath, Effect, PassiveType, ActiveAbilityType, Boss } from '../types';
import { GRID_SIZE, TOWER_STATS, ENEMY_STATS, TECH_PATH_INFO, ABILITY_CONFIG } from '../constants';

interface SceneProps {
  gameState: GameState;
  onPlaceTower: (pos: Vector3Tuple) => void;
  onSelectTower: (id: string | null) => void;
  selectedTowerType: TowerType;
  pendingPlacement: Vector3Tuple | null;
  path: Vector3Tuple[];
}

// --- VISUAL ASSETS ---

const NukeEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
  // Simple splash for legacy/other effects, though currently Nuke uses OrbitalStrike
  const scale = 1 + progress * 8; 
  const opacity = 1 - Math.pow(progress, 3); 

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[scale * 0.8, scale, 64]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, scale * 0.3, 0]}>
         <sphereGeometry args={[scale * 0.4, 32, 32]} />
         <meshBasicMaterial color="#fff" emissive={color} emissiveIntensity={2} transparent opacity={opacity} />
      </mesh>
      <Sparkles count={50} scale={scale * 1.5} size={6} speed={0.4} opacity={opacity} color={color} position={[0, scale * 0.5, 0]} />
    </group>
  );
};

const OrbitalStrikeEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
    // 0 -> 0.2: Missile Falling
    // 0.2 -> 1.0: Explosion
    const isFalling = progress < 0.2;
    const explodeProgress = isFalling ? 0 : (progress - 0.2) / 0.8;
    
    // Missile Start Y = 20, End Y = 0
    // falling progress 0->1 based on global progress 0->0.2
    const fallRatio = progress * 5; 
    const missileY = 20 - (fallRatio * 20);

    return (
        <group position={[position.x, 0, position.z]}>
            {/* Falling Missile */}
            {isFalling && (
                <group position={[0, missileY, 0]}>
                    <mesh rotation={[0, 0, 0]}>
                        <cylinderGeometry args={[0.2, 0.1, 2]} />
                        <meshBasicMaterial color="#fff" />
                    </mesh>
                    {/* Trail */}
                    <mesh position={[0, 2, 0]}>
                         <cylinderGeometry args={[0.05, 0.2, 4, 8, 1, true]} />
                         <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            )}

            {/* Impact Explosion */}
            {!isFalling && (
                <group>
                    {/* Ground Ring Expanding */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                        <ringGeometry args={[explodeProgress * 3.5, explodeProgress * 4, 64]} />
                        <meshBasicMaterial color={color} transparent opacity={1 - explodeProgress} />
                    </mesh>
                    
                    {/* Central Column */}
                    <mesh position={[0, explodeProgress * 2, 0]}>
                        <cylinderGeometry args={[2 * (1-explodeProgress), 0.5, 4]} />
                        <meshBasicMaterial color={color} transparent opacity={(1-explodeProgress) * 0.8} />
                    </mesh>

                    {/* Debris */}
                    <Sparkles count={100} scale={5 + explodeProgress * 5} size={10} speed={1} opacity={1 - explodeProgress} color="#fff" />
                </group>
            )}
        </group>
    );
};

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
      <Sparkles count={100} scale={scale} size={3} speed={0.1} opacity={0.8 * fade} color="#ffffff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0, scale, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.2 * fade} />
      </mesh>
    </group>
  );
};

// --- UNIT COMPONENTS ---

const BossUnit: React.FC<{ boss: Boss }> = ({ boss }) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    
    const phase = boss.currentPhase || 0;
    const config = boss.bossConfig;
    const size = config.size;
    
    // Phase 1 (75%) -> Enraged (Red glow, faster spin)
    // Phase 2 (50%) -> Shielded (Blue bubble)
    // Phase 3 (25%) -> Unstable (Glitching)
    const isEnraged = phase >= 1;
    const isShielded = phase === 2;
    const isUnstable = phase >= 3;
    
    const color = isEnraged ? '#ef4444' : config.color;

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        
        // Hover
        groupRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        
        // Rotation based on phase
        const speed = isEnraged ? 2 : 0.5;
        if (ringRef.current) {
            ringRef.current.rotation.z += delta * speed;
            ringRef.current.rotation.x += delta * speed * 0.5;
        }

        // Pulse core
        if (coreRef.current) {
             const scale = 1 + Math.sin(state.clock.elapsedTime * (isEnraged ? 10 : 3)) * 0.1;
             coreRef.current.scale.setScalar(scale);
        }
        
        // Unstable jitter
        if (isUnstable) {
             groupRef.current.position.x += (Math.random() - 0.5) * 0.1;
             groupRef.current.position.z += (Math.random() - 0.5) * 0.1;
        }
    });

    return (
        <group position={[boss.position.x, 0, boss.position.z]}>
            <group ref={groupRef}>
                {/* Core Body */}
                <mesh ref={coreRef} castShadow receiveShadow>
                     <boxGeometry args={[size * 0.6, size * 0.6, size * 0.6]} />
                     <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isEnraged ? 2 : 0.5} />
                </mesh>
                
                {/* Armor Plates */}
                <group>
                    <mesh position={[size * 0.4, 0, 0]} castShadow>
                        <boxGeometry args={[size * 0.1, size * 0.8, size * 0.4]} />
                        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[-size * 0.4, 0, 0]} castShadow>
                        <boxGeometry args={[size * 0.1, size * 0.8, size * 0.4]} />
                        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
                    </mesh>
                </group>

                {/* Rotating Ring */}
                <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[size * 0.8, size * 0.05, 8, 32]} />
                    <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} />
                </mesh>

                {/* Shield Bubble */}
                {isShielded && (
                    <mesh>
                        <sphereGeometry args={[size, 32, 32]} />
                        <meshPhysicalMaterial color="#3b82f6" transparent opacity={0.3} transmission={0.5} roughness={0} />
                    </mesh>
                )}
            </group>
            
            {/* Ground Shadow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <circleGeometry args={[size, 32]} />
                <meshBasicMaterial color="#000" transparent opacity={0.5} />
            </mesh>
            
            {/* Boss overhead UI can go here if we wanted 3D UI, but using HUD for main bar */}
        </group>
    );
};

const TowerUnit: React.FC<{ 
    tower: Tower; 
    enemies: Enemy[]; 
    isSelected: boolean;
    onSelect: (id: string) => void;
}> = ({ tower, enemies, isSelected, onSelect }) => {
  const turretRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const lastShotRef = useRef(tower.lastShotTime);
  const auraRef = useRef<THREE.Mesh>(null);
  const overclockRef = useRef<THREE.Group>(null);

  const stats = TOWER_STATS[tower.type];
  const displayColor = tower.techPath !== TechPath.NONE 
    ? TECH_PATH_INFO[tower.techPath].color 
    : stats.color;

  const baseHeight = 0.5;
  const lvl2Height = tower.level >= 2 ? 0.4 : 0;
  const lvl3Height = tower.level >= 3 ? 0.4 : 0;
  const totalHeight = baseHeight + lvl2Height + lvl3Height;
  const turretY = totalHeight;

  useFrame((state, delta) => {
    if (turretRef.current) {
      let closest: Enemy | null = null;
      let minDist = tower.range;

      for (const enemy of enemies) {
        const dx = enemy.position.x - tower.position.x;
        const dz = enemy.position.z - tower.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < minDist) {
          minDist = dist;
          closest = enemy;
        }
      }

      if (closest) {
        const dx = closest.position.x - tower.position.x;
        const dz = closest.position.z - tower.position.z;
        const targetAngle = Math.atan2(dx, dz);
        const currentRotation = turretRef.current.rotation.y;
        let diff = targetAngle - currentRotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        turretRef.current.rotation.y += diff * 10 * delta;
      }
    }

    if (tower.lastShotTime !== lastShotRef.current) {
      lastShotRef.current = tower.lastShotTime;
      if (flashRef.current) {
        flashRef.current.visible = true;
        const scale = 1 + Math.random() * 0.5;
        flashRef.current.scale.set(scale, scale, scale * 1.5);
        flashRef.current.rotation.z = Math.random() * Math.PI;
      }
      if (lightRef.current) {
        lightRef.current.intensity = 3;
      }
    }

    if (flashRef.current && flashRef.current.visible) {
      const decaySpeed = 15 * delta;
      const newScale = flashRef.current.scale.x - decaySpeed;
      if (newScale <= 0) {
        flashRef.current.visible = false;
        if (lightRef.current) lightRef.current.intensity = 0;
      } else {
        flashRef.current.scale.setScalar(newScale);
        if (lightRef.current) lightRef.current.intensity = newScale * 3;
      }
    }
    
    if (auraRef.current) {
        auraRef.current.rotation.z += delta * 0.5;
    }

    if (overclockRef.current && tower.abilityDuration > 0) {
        overclockRef.current.rotation.x += delta * 5;
        overclockRef.current.rotation.y += delta * 10;
        const scale = 1 + Math.sin(state.clock.elapsedTime * 20) * 0.1;
        overclockRef.current.scale.setScalar(scale);
    }
  });

  const hasAura = tower.passiveType !== PassiveType.NONE;
  let auraRange = 0;
  // @ts-ignore
  if (hasAura) auraRange = ABILITY_CONFIG[tower.passiveType]?.range || 0;

  return (
    <group position={[tower.position.x, 0, tower.position.z]} onClick={(e) => {
        e.stopPropagation();
        onSelect(tower.id);
    }}>
      {hasAura && (
          <mesh ref={auraRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[auraRange - 0.1, auraRange, 32]} />
              <meshBasicMaterial color={displayColor} opacity={0.2} transparent side={THREE.DoubleSide} />
          </mesh>
      )}

      {tower.abilityDuration > 0 && tower.activeType === ActiveAbilityType.OVERCLOCK && (
        <group position={[0, totalHeight/2, 0]}>
          <group ref={overclockRef}>
              <mesh>
                  <sphereGeometry args={[1.2, 8, 4]} />
                  <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.5} />
              </mesh>
              <mesh rotation={[Math.PI/2, 0, 0]}>
                  <sphereGeometry args={[1.1, 8, 4]} />
                  <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
              </mesh>
          </group>
          <pointLight color="#06b6d4" intensity={2} distance={5} decay={2} />
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

      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, baseHeight, 0.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {tower.level >= 2 && (
          <mesh position={[0, baseHeight + lvl2Height/2, 0]} castShadow receiveShadow>
             <boxGeometry args={[0.6, lvl2Height, 0.6]} />
             <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
             <mesh position={[0.31, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                <planeGeometry args={[lvl2Height * 0.8, 0.1]} />
                <meshBasicMaterial color={displayColor} side={THREE.DoubleSide} />
             </mesh>
          </mesh>
      )}

      {tower.level >= 3 && (
          <mesh position={[0, baseHeight + lvl2Height + lvl3Height/2, 0]} castShadow receiveShadow>
             <boxGeometry args={[0.5, lvl3Height, 0.5]} />
             <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
             <mesh position={[0.26, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                <planeGeometry args={[lvl3Height * 0.8, 0.1]} />
                <meshBasicMaterial color={displayColor} side={THREE.DoubleSide} />
             </mesh>
          </mesh>
      )}
      
      <group ref={turretRef} position={[0, turretY, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
             <cylinderGeometry args={[0.3, 0.4, 0.2, 8]} />
             <meshStandardMaterial color={displayColor} emissive={displayColor} emissiveIntensity={0.2} />
        </mesh>

        <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        
        <mesh position={[0, 0.25, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
           <cylinderGeometry args={[0.1, 0.1, 0.1]} />
           <meshStandardMaterial color="#0f172a" />
        </mesh>

        {tower.techPath === TechPath.MAGMA && (
             <group position={[0, 0.4, 0]}>
                <mesh>
                   <coneGeometry args={[tower.level >= 3 ? 0.35 : 0.2, 0.5, 4]} />
                   <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={tower.level >= 3 ? 1 : 0.5} />
                </mesh>
                {tower.level >= 3 && (
                    <mesh rotation={[Math.PI/4, 0, 0]}>
                        <torusGeometry args={[0.4, 0.02, 16, 32]} />
                        <meshBasicMaterial color="#ef4444" />
                    </mesh>
                )}
             </group>
        )}
        
        {tower.techPath === TechPath.PLASMA && (
             <group position={[0, 0.4, 0]}>
                <mesh>
                   <sphereGeometry args={[tower.level >= 3 ? 0.35 : 0.2, 8, 8]} />
                   <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} wireframe />
                </mesh>
                {tower.level >= 3 && (
                    <mesh>
                        <sphereGeometry args={[0.15, 8, 8]} />
                        <meshBasicMaterial color="#fff" />
                    </mesh>
                )}
             </group>
        )}
        
        {tower.techPath === TechPath.VOID && (
             <group position={[0, 0.4, 0]}>
                <mesh>
                   <dodecahedronGeometry args={[tower.level >= 3 ? 0.35 : 0.2]} />
                   <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} />
                </mesh>
                 {tower.level >= 3 && (
                     <group rotation={[0, 0, Math.PI/6]}>
                        <mesh position={[0.5, 0, 0]}>
                            <boxGeometry args={[0.1, 0.1, 0.1]} />
                            <meshBasicMaterial color="#8b5cf6" />
                        </mesh>
                         <mesh position={[-0.5, 0, 0]}>
                            <boxGeometry args={[0.1, 0.1, 0.1]} />
                            <meshBasicMaterial color="#8b5cf6" />
                        </mesh>
                     </group>
                 )}
             </group>
        )}

        <group position={[0, 0.25, 0.9]}>
           <mesh ref={flashRef} visible={false}>
             <sphereGeometry args={[0.2, 8, 8]} /> 
             <meshBasicMaterial color={displayColor} transparent opacity={0.9} />
           </mesh>
           <pointLight ref={lightRef} distance={3} decay={2} color={displayColor} intensity={0} />
        </group>
      </group>
    </group>
  );
};

// Effects renderer
const EffectsRenderer: React.FC<{ effects: Effect[] }> = ({ effects }) => {
    return (
        <>
            {effects.map(effect => {
                const progress = 1 - (effect.lifetime / effect.maxLifetime); // 0 to 1
                
                if (effect.type === 'NOVA') {
                     return <NukeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
                }

                if (effect.type === 'ORBITAL_STRIKE') {
                     return <OrbitalStrikeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
                }

                if (effect.type === 'FREEZE_WAVE') {
                     return <FreezeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
                }

                const opacity = 1 - progress;
                const scale = effect.scale * (2 - opacity); 
                return (
                    <mesh key={effect.id} position={[effect.position.x, effect.position.y, effect.position.z]}>
                        <sphereGeometry args={[scale, 8, 8]} />
                        <meshBasicMaterial color={effect.color} transparent opacity={opacity} />
                    </mesh>
                );
            })}
        </>
    );
};

const TargetingReticle: React.FC<{ position: Vector3Tuple, type: ActiveAbilityType }> = ({ position, type }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y += 0.05;
            const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
            ref.current.scale.setScalar(scale);
        }
    });

    return (
        <group ref={ref} position={[position.x, 0.2, position.z]}>
             <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[3.5, 4, 32]} />
                <meshBasicMaterial color="#ef4444" opacity={0.5} transparent side={THREE.DoubleSide} />
             </mesh>
             <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.8, 16]} />
                <meshBasicMaterial color="#ef4444" opacity={0.8} transparent />
             </mesh>
             <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 2]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
             </mesh>
        </group>
    );
};

const Scene: React.FC<SceneProps> = ({ gameState, onPlaceTower, onSelectTower, selectedTowerType, pendingPlacement, path }) => {
  const [hoveredPos, setHoveredPos] = useState<Vector3Tuple | null>(null);

  // If we have a pending placement, force the ghost to be there
  const ghostPos = pendingPlacement || hoveredPos;
  const isPending = !!pendingPlacement;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sky sunPosition={[100, 20, 100]} />
      <Environment preset="night" />

      {/* Grid Floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow 
        onClick={(e) => {
          e.stopPropagation();
          const point = e.point;
          onPlaceTower({ x: point.x, y: 0, z: point.z }); // Pass raw float coords for reticle accuracy
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          const point = e.point;
          if (gameState.targetingAbility) {
              // Smooth float movement for targeting
              setHoveredPos({ x: point.x, y: 0.1, z: point.z });
          } else {
              // Snap to grid for building
              setHoveredPos({ x: Math.round(point.x), y: 0.1, z: Math.round(point.z) });
          }
        }}
        onPointerOut={() => setHoveredPos(null)}
      >
        <planeGeometry args={[GRID_SIZE * 2, GRID_SIZE * 2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <gridHelper args={[GRID_SIZE * 2, GRID_SIZE * 2, 0x1e293b, 0x334155]} position={[0, 0.01, 0]} />

      {/* Dynamic Path Rendering */}
      {path.map((wp, i) => {
        if (i === path.length - 1) return null;
        const next = path[i + 1];
        const dx = next.x - wp.x;
        const dz = next.z - wp.z;
        const length = Math.sqrt(dx * dx + dz * dz) + 1; // +1 to overlap slightly at corners
        const centerX = (wp.x + next.x) / 2;
        const centerZ = (wp.z + next.z) / 2;
        const angle = Math.atan2(dx, dz);

        return (
          <mesh key={i} position={[centerX, 0.05, centerZ]} rotation={[0, angle, 0]} receiveShadow>
            <boxGeometry args={[1.5, 0.1, length]} />
            <meshStandardMaterial color="#334155" emissive="#1e293b" />
          </mesh>
        );
      })}

      {gameState.enemies.map(enemy => (
        enemy.isBoss ? (
             <BossUnit key={enemy.id} boss={enemy as Boss} />
        ) : (
            <group key={enemy.id} position={[enemy.position.x, enemy.position.y + 0.5, enemy.position.z]}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <Box args={[0.6, 0.6, 0.6]} castShadow>
                <meshStandardMaterial 
                    color={enemy.freezeTimer && enemy.freezeTimer > 0 ? '#a5f3fc' : ENEMY_STATS[enemy.type].color} 
                    emissive={enemy.freezeTimer && enemy.freezeTimer > 0 ? '#a5f3fc' : ENEMY_STATS[enemy.type].color}
                    emissiveIntensity={enemy.freezeTimer && enemy.freezeTimer > 0 ? 0.8 : 0.5}
                />
                </Box>
            </Float>
            <mesh position={[0, 0.8, 0]}>
                <planeGeometry args={[0.8, 0.1]} />
                <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[0, 0.8, 0.01]}>
                <planeGeometry args={[0.8 * (enemy.health / enemy.maxHealth), 0.1]} />
                <meshBasicMaterial color="#4ade80" />
            </mesh>
            </group>
        )
      ))}

      {gameState.towers.map(tower => (
        <TowerUnit 
          key={tower.id} 
          tower={tower} 
          enemies={gameState.enemies}
          isSelected={gameState.selectedTowerId === tower.id}
          onSelect={onSelectTower}
        />
      ))}

      {gameState.projectiles.map(p => (
        <Sphere key={p.id} args={[0.15]} position={[p.position.x, p.position.y, p.position.z]}>
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
        </Sphere>
      ))}
      
      <EffectsRenderer effects={gameState.effects} />

      {/* Targeting Reticle */}
      {gameState.targetingAbility && hoveredPos && (
          <TargetingReticle position={hoveredPos} type={gameState.targetingAbility} />
      )}

      {/* Ghost Tower */}
      {ghostPos && !gameState.selectedTowerId && !gameState.isGameOver && !gameState.targetingAbility && (
        <group position={[ghostPos.x, 0, ghostPos.z]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.8, 1, 0.8]} />
            <meshStandardMaterial 
              color={isPending ? "#22c55e" : TOWER_STATS[selectedTowerType].color} 
              transparent 
              opacity={isPending ? 0.7 : 0.3} 
              emissive={isPending ? "#22c55e" : "#000000"}
              emissiveIntensity={isPending ? 0.5 : 0}
            />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[TOWER_STATS[selectedTowerType].range - 0.1, TOWER_STATS[selectedTowerType].range, 32]} />
            <meshBasicMaterial color={isPending ? "#22c55e" : TOWER_STATS[selectedTowerType].color} transparent opacity={0.5} />
          </mesh>
          {isPending && (
             <Html position={[0, 1.5, 0]} center>
                <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded border border-green-500 whitespace-nowrap">
                   PENDING DEPLOYMENT
                </div>
             </Html>
          )}
        </group>
      )}
    </>
  );
};

export default Scene;
