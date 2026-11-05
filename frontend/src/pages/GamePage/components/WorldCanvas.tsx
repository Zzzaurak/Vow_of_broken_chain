import { useGameRuntime } from '../hooks/useGameRuntime';
export function WorldCanvas() {
  const { canvas, error } = useGameRuntime();
  return (
    <>
      <canvas
        ref={canvas}
        width={960}
        height={540}
        tabIndex={0}
        aria-label="冒险地图，使用移动键与交互键探索"
        className="block aspect-video w-full outline-none [image-rendering:pixelated]"
      />
      {error && (
        <div
          role="alert"
          className="absolute inset-0 grid place-items-center bg-slate-950/90 p-8 text-rose-200"
        >
          {error}
        </div>
      )}
    </>
  );
}
