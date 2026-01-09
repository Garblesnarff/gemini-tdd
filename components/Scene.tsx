
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Environment, Box, Sphere, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
// Fixed: Separated types and constants into their respective modules
import { GameState, TowerType, Vector3Tuple, Tower, Enemy, TechPath, ActiveAbilityType } from '../types';
import { ENEMY_STATS, TOWER_STATS, TECH_PATH_INFO, STAGE_CONFIGS, GRID_SIZE } from '../constants';

interface SceneProps {
  gameState: GameState;
  onPlaceTower: (pos: Vector3Tuple) => void;
  onSelectTower: (id: string | null) => void;
  selectedTowerType: TowerType;
  pendingPlacement: Vector3Tuple | null;
}

const NukeEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
  const scale = 1 + progress * 12; const opacity = 1 - Math.pow(progress, 3); 
  return (
    <group position={[position.x, 0, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[scale * 0.85, scale, 64]} /><meshBasicMaterial color={color} transparent opacity={opacity} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><circleGeometry args={[scale, 64]} /><meshBasicMaterial color={color} transparent opacity={opacity * 0.2} /></mesh>
      <Sparkles count={50} scale={scale} size={6} speed={0.8} opacity={opacity} color={color} />
    </group>
  );
};

const ExplosionEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
  const scale = progress * 4;
  const opacity = 1 - progress;
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh><sphereGeometry args={[scale, 16, 16]} /><meshBasicMaterial color={color} transparent opacity={opacity * 0.6} /></mesh>
      <Sparkles count={30} scale={scale * 2} size={8} speed={1.5} opacity={opacity} color={color} />
    </group>
  );
};

const FreezeWaveEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
  const scale = progress * 12;
  const opacity = 1 - progress;
  return (
    <group position={[position.x, 0.1, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[scale * 0.9, scale, 64]} /><meshBasicMaterial color={color} transparent opacity={opacity} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[scale, 64]} /><meshBasicMaterial color={color} transparent opacity={opacity * 0.3} /></mesh>
      <Sparkles count={40} scale={scale} size={4} speed={0.5} opacity={opacity} color="#fff" />
    </group>
  );
};

const OrbitalStrikeEffect: React.FC<{ position: Vector3Tuple, color: string, progress: number }> = ({ position, color, progress }) => {
    const isFalling = progress < 0.25; 
    const explodeProgress = isFalling ? 0 : (progress - 0.25) / 0.75;
    const fallRatio = progress * 4; 
    const missileY = 30 - (fallRatio * 30);
    return (
        <group position={[position.x, 0, position.z]}>
            {isFalling && (
                <group position={[0, missileY, 0]}>
                    <mesh><cylinderGeometry args={[0.3, 0.1, 4]} /><meshBasicMaterial color="#fff" /></mesh>
                    <pointLight intensity={10} color={color} />
                    <Sparkles count={20} scale={2} size={10} speed={4} color={color} />
                </group>
            )}
            {!isFalling && (
                <group>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><ringGeometry args={[explodeProgress * 5, explodeProgress * 6, 64]} /><meshBasicMaterial color={color} transparent opacity={1 - explodeProgress} /></mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><circleGeometry args={[explodeProgress * 6, 64]} /><meshBasicMaterial color={color} transparent opacity={(1 - explodeProgress) * 0.3} /></mesh>
                    <Sparkles count={100} scale={6} size={15} speed={2} opacity={1 - explodeProgress} color="#fff" />
                    <pointLight intensity={20 * (1 - explodeProgress)} color={color} />
                </group>
            )}
        </group>
    );
};

const TowerUnit: React.FC<{ tower: Tower; enemies: Enemy[]; isSelected: boolean; onSelect: (id: string) => void; }> = ({ tower, enemies, isSelected, onSelect }) => {
  const turretRef = useRef<THREE.Group>(null);
  const displayColor = tower.techPath !== TechPath.NONE ? TECH_PATH_INFO[tower.techPath].color : TOWER_STATS[tower.type].color;
  
  useFrame(() => {
    if (turretRef.current) {
      let candidates = enemies.filter(e => {
        const dist = Math.sqrt(Math.pow(e.position.x - tower.position.x, 2) + Math.pow(e.position.z - tower.position.z, 2));
        return dist <= tower.range;
      });

      if (candidates.length > 0) {
        const target = candidates[0];
        const dx = target.position.x - tower.position.x;
        const dz = target.position.z - tower.position.z;
        const targetRotation = Math.atan2(dx, dz);
        turretRef.current.rotation.y = THREE.MathUtils.lerp(turretRef.current.rotation.y, targetRotation, 0.2);
      }
    }
  });

  // Dramatic Taller Tower Scaling
  const baseHeight = tower.level === 3 ? 2.5 : tower.level === 2 ? 1.5 : 0.6;
  const isLevel3 = tower.level === 3;
  const isLevel2 = tower.level >= 2;

  return (
    <group position={[tower.position.x, 0, tower.position.z]} onClick={(e) => { e.stopPropagation(); onSelect(tower.id); }}>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[tower.range - 0.1, tower.range, 64]} />
          <meshBasicMaterial color={displayColor} transparent opacity={0.3} />
        </mesh>
      )}

      {/* Main Column */}
      <mesh position={[0, baseHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.9, baseHeight, 0.9]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Decorative Accents for high levels */}
      {isLevel2 && (
        <group position={[0, baseHeight / 2, 0]}>
           <mesh position={[0.5, 0, 0]}><boxGeometry args={[0.1, baseHeight * 0.9, 0.7]} /><meshStandardMaterial color={displayColor} /></mesh>
           <mesh position={[-0.5, 0, 0]}><boxGeometry args={[0.1, baseHeight * 0.9, 0.7]} /><meshStandardMaterial color={displayColor} /></mesh>
        </group>
      )}

      {/* Turret Assembly */}
      <group ref={turretRef} position={[0, baseHeight, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={isLevel3 ? [0.5, 0.6, 0.4, 32] : [0.35, 0.45, 0.25, 16]} />
          <meshStandardMaterial color={displayColor} metalness={0.7} roughness={0.2} />
        </mesh>
        
        {/* Barrels */}
        <group position={[0, 0.25, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
           <mesh castShadow>
             <cylinderGeometry args={[0.1, 0.12, isLevel3 ? 1.5 : 1.0]} />
             <meshStandardMaterial color="#334155" />
           </mesh>
           {isLevel3 && tower.type === TowerType.FAST && (
             <>
               <mesh position={[0.2, 0, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 1.2]} /><meshStandardMaterial color="#334155" /></mesh>
               <mesh position={[-0.2, 0, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 1.2]} /><meshStandardMaterial color="#334155" /></mesh>
             </>
           )}
        </group>

        {/* Level 3 Floating Orbitals */}
        {isLevel3 && (
          <Float speed={6} rotationIntensity={3} floatIntensity={1.5}>
             <Sparkles count={15} scale={1.5} size={4} color={displayColor} />
             <mesh position={[0, 0.8, 0]}>
                <octahedronGeometry args={[0.2]} />
                <meshStandardMaterial color={displayColor} emissive={displayColor} emissiveIntensity={3} />
             </mesh>
          </Float>
        )}
      </group>

      {/* Visual Effect for Active Buffs */}
      {tower.abilityDuration > 0 && tower.activeType === ActiveAbilityType.OVERCLOCK && (
        <group position={[0, baseHeight, 0]}>
          <Sparkles count={60} scale={2} size={8} speed={3} color="#06b6d4" />
          <pointLight intensity={5} color="#06b6d4" />
        </group>
      )}
    </group>
  );
};

const Scene: React.FC<SceneProps> = ({ gameState, onPlaceTower, onSelectTower, selectedTowerType, pendingPlacement }) => {
  const currentStage = STAGE_CONFIGS[gameState.currentStage];
  const [hoveredPos, setHoveredPos] = useState<Vector3Tuple | null>(null);

  const ghostPos = pendingPlacement || hoveredPos;

  return (
    <>
      <ambientLight intensity={currentStage.environment.ambientIntensity} />
      <pointLight position={[0, 15, 0]} intensity={2} color={currentStage.environment.pathColor} />
      <directionalLight position={[15, 30, 15]} intensity={2} castShadow />
      <Stars radius={120} depth={60} count={6000} factor={5} saturation={0} fade speed={1.2} />
      <Environment preset={currentStage.environment.skyPreset as any} />
      {currentStage.environment.fogColor && <fog attach="fog" args={[currentStage.environment.fogColor, 15, 40]} />}

      {/* Grid Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={(e) => onPlaceTower({ x: e.point.x, y: 0, z: e.point.z })} onPointerMove={(e) => setHoveredPos({ x: Math.round(e.point.x), y: 0.1, z: Math.round(e.point.z) })}>
        <planeGeometry args={[GRID_SIZE * 3, GRID_SIZE * 3]} />
        <meshStandardMaterial color={currentStage.environment.gridColor} metalness={0.85} roughness={0.15} />
      </mesh>
      <gridHelper args={[GRID_SIZE * 3, GRID_SIZE * 3, currentStage.environment.pathColor]} position={[0, 0.01, 0]} />

      {/* Path */}
      {currentStage.path.map((wp, i) => {
        if (i === currentStage.path.length - 1) return null;
        const next = currentStage.path[i + 1]; const dx = next.x - wp.x; const dz = next.z - wp.z;
        return (
          <mesh key={i} position={[(wp.x + next.x)/2, 0.05, (wp.z + next.z)/2]} rotation={[0, Math.atan2(dx, dz), 0]} receiveShadow>
            <boxGeometry args={[2.0, 0.1, Math.sqrt(dx * dx + dz * dz) + 1.5]} /><meshStandardMaterial color={currentStage.environment.pathColor} emissive={currentStage.environment.pathColor} emissiveIntensity={0.3} />
          </mesh>
        );
      })}

      {/* Enemies */}
      {gameState.enemies.map(enemy => (
        <group key={enemy.id} position={[enemy.position.x, enemy.position.y + (enemy.isBoss ? 1.5 : 0.5), enemy.position.z]}>
          <Box args={enemy.isBoss ? [enemy.bossConfig?.size ?? 2.5, enemy.bossConfig?.size ?? 2.5, enemy.bossConfig?.size ?? 2.5] : [0.7, 0.7, 0.7]} castShadow>
             <meshStandardMaterial 
               color={enemy.isBoss ? (enemy.bossConfig?.color ?? 'red') : ENEMY_STATS[enemy.type].color} 
               emissive={enemy.isBoss ? (enemy.bossConfig?.color ?? 'red') : ENEMY_STATS[enemy.type].color}
               emissiveIntensity={enemy.freezeTimer && enemy.freezeTimer > 0 ? 0 : 0.6}
             />
          </Box>
          {enemy.freezeTimer && enemy.freezeTimer > 0 && (
             <mesh><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial color="#8b5cf6" transparent opacity={0.5} /></mesh>
          )}
          {/* Health Bar */}
          <group position={[0, enemy.isBoss ? 3.0 : 1.0, 0]}>
             <mesh><planeGeometry args={[1.0, 0.12]} /><meshBasicMaterial color="#000" /></mesh>
             <mesh position={[0, 0, 0.01]}><planeGeometry args={[1.0 * (enemy.health / enemy.maxHealth), 0.1]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </group>
        </group>
      ))}

      {/* Towers */}
      {gameState.towers.map(tower => (
        <TowerUnit 
          key={tower.id} 
          tower={tower} 
          enemies={gameState.enemies} 
          isSelected={gameState.selectedTowerId === tower.id} 
          onSelect={onSelectTower} 
        />
      ))}

      {/* Projectiles */}
      {gameState.projectiles.map(p => (
        <Sphere key={p.id} args={[0.18]} position={[p.position.x, p.position.y, p.position.z]}>
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={4} />
        </Sphere>
      ))}
      
      {/* Effects */}
      {gameState.effects.map(effect => {
          const progress = 1 - (effect.lifetime / effect.maxLifetime);
          if (effect.type === 'NOVA') return <NukeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
          if (effect.type === 'ORBITAL_STRIKE') return <OrbitalStrikeEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
          if (effect.type === 'EXPLOSION') return <ExplosionEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
          if (effect.type === 'FREEZE_WAVE') return <FreezeWaveEffect key={effect.id} position={effect.position} color={effect.color} progress={progress} />;
          return null;
      })}

      {/* Global Targeting Crosshair */}
      {gameState.targetingAbility && hoveredPos && (
          <group position={[hoveredPos.x, 0.3, hoveredPos.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[3.8, 4.2, 32]} />
              <meshBasicMaterial color="red" transparent opacity={0.6} />
            </mesh>
            <Sparkles count={60} scale={4.5} size={8} color="red" speed={2} />
          </group>
      )}

      {/* Placement Ghost */}
      {ghostPos && !gameState.selectedTowerId && gameState.gamePhase === 'PLAYING' && (
        <group position={[ghostPos.x, 0.5, ghostPos.z]}>
          <mesh transparent opacity={pendingPlacement ? 0.8 : 0.4}>
            <boxGeometry args={[0.9, 1.2, 0.9]} />
            <meshStandardMaterial color={pendingPlacement ? "#22c55e" : TOWER_STATS[selectedTowerType].color} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
            <ringGeometry args={[TOWER_STATS[selectedTowerType].range - 0.1, TOWER_STATS[selectedTowerType].range, 64]} />
            <meshBasicMaterial color={TOWER_STATS[selectedTowerType].color} transparent opacity={0.4} />
          </mesh>
        </group>
      )}
    </>
  );
};

export default Scene;
