
import React, { useState, useRef, useMemo } from 'react';
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
                         {enemy.shield !== undefined && enemy.shield > 0 && (
                             <mesh>
                                 <sphereGeometry args={[0.6, 16, 16]} />
                                 <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} wireframe />
                             </mesh>
                         )}
                    </group>
                ) : enemy.type === EnemyType.HEALER ? (
                     <group scale={isElite ? 1.4 : 1}>
                         <mesh castShadow><sphereGeometry args={[0.3, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} /></mesh>
                         <Sparkles count={5} scale={1} size={2} color="#4ade80" />
                     </group>
                ) : enemy.type === EnemyType.PHASER ? (
                     <group scale={isElite ? 1.4 : 1}>
                         <mesh castShadow><octahedronGeometry args={[0.35]} /><meshStandardMaterial color={color} transparent opacity={0.8} /></mesh>
                         {enemy.phaseCharging && (
                             <mesh rotation={[0, Date.now() / 500, 0]}>
                                 <ringGeometry args={[0.5, 0.55, 32]} />
                                 <meshBasicMaterial color="#d8b4fe" />
                             </mesh>
                         )}
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
                     <mesh castShadow scale={isElite ? 1.4 : 1}>
                         <boxGeometry args={[0.5, 0.5, 0.5]} />
                         <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
                     </mesh>
                ) : enemy.type === EnemyType.SWARM ? (
                     <mesh castShadow scale={isElite ? 1.4 : 1}>
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
            
            {enemy.shield !== undefined && enemy.shield > 0 && (
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

  const stats = TOWER_STATS[tower.type];
  const displayColor = tower.techPath !== TechPath.NONE ? TECH_PATH_INFO[tower.techPath].color : stats.color;
  const baseHeight = tower.type === TowerType.ARTILLERY ? 0.3 : 0.5;
  const isDisabled = tower.disabledTimer && tower.disabledTimer > 0;

  useFrame((state, delta) => {
    if (isDisabled && disabledRef.current) {
        disabledRef.current.rotation.y += delta;
        disabledRef.current.rotation.z += delta * 0.5;
    }

    if (turretRef.current && !isDisabled) {
        // Simple rotation logic towards closest enemy
        let closest: Enemy | null = null;
        let minDist = tower.range;
        for (const enemy of enemies) {
            const dx = enemy.position.x - tower.position.x;
            const dz = enemy.position.z - tower.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist) { minDist = dist; closest = enemy; }
        }
        if (closest) {
            const dx = closest.position.x - tower.position.x;
            const dz = closest.position.z - tower.position.z;
            const targetAngle = Math.atan2(dx, dz);
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
