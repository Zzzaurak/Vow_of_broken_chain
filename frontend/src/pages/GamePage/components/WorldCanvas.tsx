import { useGameRuntime } from '../hooks/useGameRuntime';
export function WorldCanvas() {
  const { canvas, error, ready, retry } = useGameRuntime();
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
      {!ready && !error && (
        <div
          role="status"
          className="absolute inset-0 z-20 grid place-items-center bg-[#102630] text-sm text-[#d6c38d]"
        >
          正在准备旅途画面…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 z-20 grid place-items-center bg-slate-950 p-8 text-rose-200"
        >
          <div className="text-center">
            <p>{error}</p>
            <button
              className="mt-5 border border-[#c4ae78] px-5 py-2 text-[#e4d5a9]"
              onClick={retry}
            >
              重新加载素材
            </button>
          </div>
        </div>
      )}
    </>
  );
}
