import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  Html,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { Loader2, AlertTriangle } from "lucide-react";

/**
 * Auto-framing 3D model with bounding-box camera fit.
 * Used identically across marketplace cards, asset detail and upload preview.
 */
function FittedModel({
  url,
  padding = 1.25,
  onReady,
}: {
  url: string;
  padding?: number;
  onReady?: () => void;
}) {
  const { scene } = useGLTF(url);
  const { camera, controls } = useThree() as {
    camera: THREE.Camera;
    controls?: {
      target: THREE.Vector3;
      minDistance: number;
      maxDistance: number;
      update?: () => void;
    };
  };
  const ref = useRef<THREE.Group>(null);

  // Clone so multiple instances don't share matrix state.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    if (!ref.current) return;
    const group = ref.current;

    // Compute bounding box of cloned scene
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Recenter the model at origin
    group.position.x -= center.x;
    group.position.y -= center.y;
    group.position.z -= center.z;

    // Distance from FOV
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const persp = camera as THREE.PerspectiveCamera;
    const fov = (persp.fov * Math.PI) / 180;
    const dist = (maxDim / 2 / Math.tan(fov / 2)) * padding;

    persp.position.set(dist * 0.7, dist * 0.5, dist);
    persp.near = dist / 100;
    persp.far = dist * 100;
    persp.updateProjectionMatrix();
    persp.lookAt(0, 0, 0);

    if (controls) {
      controls.target.set(0, 0, 0);
      controls.minDistance = dist * 0.4;
      controls.maxDistance = dist * 4;
      controls.update?.();
    }

    onReady?.();
  }, [cloned, camera, controls, padding, onReady]);

  return <primitive ref={ref} object={cloned} />;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading model…
      </div>
    </Html>
  );
}

export function ModelViewer({
  url,
  className,
  autoRotate = true,
  showControls = true,
  compact = false,
}: {
  url: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  compact?: boolean;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 text-muted-foreground ${className ?? ""}`}
      >
        <AlertTriangle className="h-6 w-6" />
        <p className="text-sm">Preview unavailable</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-mesh ${className ?? ""}`}
    >
      <Canvas
        camera={{ position: [3, 2, 4], fov: 35, near: 0.01, far: 1000 }}
        onError={() => setError(true)}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -2, -5]} intensity={0.3} />

        <Suspense fallback={<LoadingFallback />}>
          <FittedModel url={url} padding={compact ? 1.4 : 1.6} />
          <Environment preset="city" />
          {!compact && (
            <ContactShadows
              position={[0, -1.5, 0]}
              opacity={0.4}
              scale={10}
              blur={2.5}
              far={4}
            />
          )}
        </Suspense>

        <OrbitControls
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={compact ? 1.2 : 0.6}
          enableZoom={showControls}
          enablePan={showControls}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      {!compact && (
        <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] uppercase tracking-widest text-muted-foreground/70">
          drag · zoom · rotate
        </div>
      )}
    </div>
  );
}
