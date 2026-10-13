import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import type { Group } from 'three';

/** Camera drifts toward the pointer — eased 4%/frame, capped ~1.4 units. */
function Rig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 1.0 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/** The ROOT-X orb: distorted violet core, orange ring, wireframe shell, satellites. */
function Orb() {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.15;
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
    }
  });
  return (
    <group ref={group}>
      <Float speed={1.3} rotationIntensity={0.5} floatIntensity={1.2}>
        <mesh>
          <icosahedronGeometry args={[1.75, 16]} />
          <MeshDistortMaterial color="#5b2fb8" metalness={0.32} roughness={0.22} distort={0.42} speed={1.7} />
        </mesh>
      </Float>

      {/* thin orange orbit ring */}
      <mesh rotation={[Math.PI / 2.35, 0.35, 0]}>
        <torusGeometry args={[2.75, 0.014, 8, 160]} />
        <meshBasicMaterial color="#f49867" transparent opacity={0.65} />
      </mesh>

      {/* violet wireframe shell */}
      <mesh>
        <icosahedronGeometry args={[3.15, 1]} />
        <meshBasicMaterial color="#ae67fa" wireframe transparent opacity={0.15} />
      </mesh>

      {/* satellites */}
      <Float speed={2.1} rotationIntensity={1.2} floatIntensity={2}>
        <mesh position={[3.3, 1.5, -0.6]}>
          <sphereGeometry args={[0.26, 32, 32]} />
          <meshStandardMaterial color="#f49867" roughness={0.25} metalness={0.15} emissive="#f49867" emissiveIntensity={0.35} />
        </mesh>
      </Float>
      <Float speed={1.7} rotationIntensity={1} floatIntensity={2.4}>
        <mesh position={[-3.4, -1.2, 0.4]} rotation={[0.4, 0.2, 0]}>
          <dodecahedronGeometry args={[0.36, 0]} />
          <meshStandardMaterial color="#ae67fa" roughness={0.25} metalness={0.2} emissive="#ae67fa" emissiveIntensity={0.3} />
        </mesh>
      </Float>
      <Float speed={2.5} rotationIntensity={1.4} floatIntensity={2.2}>
        <mesh position={[2.4, -2.1, 1.2]}>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshStandardMaterial color="#ff8a71" roughness={0.3} metalness={0.1} emissive="#ff8a71" emissiveIntensity={0.4} />
        </mesh>
      </Float>
      <Float speed={1.9} rotationIntensity={1} floatIntensity={1.8}>
        <mesh position={[-2.6, 2.2, -1]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color="#81afdd" roughness={0.3} metalness={0.25} emissive="#81afdd" emissiveIntensity={0.2} />
        </mesh>
      </Float>
    </group>
  );
}

/** Ambient, decorative 3D hero scene. Colors are locked to the token palette. */
export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 8.5], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 6, 8]} intensity={1.6} />
      <pointLight position={[-6, -2, 4]} intensity={50} color="#ae67fa" />
      <pointLight position={[6, 3, 6]} intensity={60} color="#f49867" />
      <Rig />
      <Orb />
      <Sparkles count={110} scale={[11, 7, 5]} size={2.2} speed={0.32} color="#81afdd" />
    </Canvas>
  );
}
