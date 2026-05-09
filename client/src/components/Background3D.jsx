import { Canvas } from "@react-three/fiber";
import { Float, Edges } from "@react-three/drei";

function Asterisk3D({ color }) {
  return (
    <group>
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 3]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 3]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function SketchObject({ children, speed, rotationIntensity, floatIntensity, position, scale }) {
  return (
    <Float speed={speed} rotationIntensity={rotationIntensity} floatIntensity={floatIntensity}>
      <group position={position} scale={scale}>
        {children}
      </group>
    </Float>
  );
}

export default function Background3D() {
  const paperColor = "#f2f2f2";
  const inkColor = "#2c2c2c";

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1} />
        
        {/* Asterisks */}
        <SketchObject position={[-5, 3, -2]} speed={1} rotationIntensity={1} floatIntensity={1} scale={0.6}>
          <Asterisk3D color={inkColor} />
        </SketchObject>
        <SketchObject position={[4, -3, 1]} speed={1.2} rotationIntensity={1.5} floatIntensity={1.5} scale={0.5}>
          <Asterisk3D color={inkColor} />
        </SketchObject>

        {/* 3D Squares (Box) */}
        <SketchObject position={[6, 1.5, -3]} speed={1.5} rotationIntensity={1} floatIntensity={1.5} scale={0.6}>
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={paperColor} />
            <Edges scale={1} threshold={1} color={inkColor} />
          </mesh>
        </SketchObject>
        <SketchObject position={[-6, -1, 1]} speed={1.2} rotationIntensity={2} floatIntensity={1} scale={0.5}>
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={paperColor} />
            <Edges scale={1} threshold={1} color={inkColor} />
          </mesh>
        </SketchObject>

        {/* Triangular Prisms */}
        <SketchObject position={[-4, -3, 2]} speed={1.8} rotationIntensity={2} floatIntensity={2} scale={0.6}>
          <mesh>
            <cylinderGeometry args={[0.8, 0.8, 1.5, 3]} />
            <meshBasicMaterial color={paperColor} />
            <Edges scale={1} threshold={1} color={inkColor} />
          </mesh>
        </SketchObject>

        {/* Sketchy Balls (Icosahedrons - highly optimized) */}
        <SketchObject position={[1, 4, -4]} speed={2} rotationIntensity={2} floatIntensity={1.5} scale={0.8}>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={paperColor} />
            <Edges scale={1} threshold={1} color={inkColor} />
          </mesh>
        </SketchObject>
        <SketchObject position={[-3, 2, -5]} speed={1.5} rotationIntensity={1.5} floatIntensity={1} scale={0.6}>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={paperColor} />
            <Edges scale={1} threshold={1} color={inkColor} />
          </mesh>
        </SketchObject>

        {/* Paper Airplanes (Tetrahedrons) */}
        <SketchObject position={[3, -2, -1]} speed={2.5} rotationIntensity={1} floatIntensity={2} scale={0.5}>
          <mesh scale={[0.8, 1.5, 0.5]}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={paperColor} />
            <Edges scale={1} threshold={1} color={inkColor} />
          </mesh>
        </SketchObject>
        <SketchObject position={[5, 4, 1]} speed={2} rotationIntensity={1.5} floatIntensity={2.5} scale={0.4}>
          <mesh scale={[0.8, 1.5, 0.5]}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={paperColor} />
            <Edges scale={1} threshold={1} color={inkColor} />
          </mesh>
        </SketchObject>

      </Canvas>
    </div>
  );
}
