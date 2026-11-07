import idle from '../../../../../material/Character/manifest.json';
import animation from '../../../../../material/Character/animation-manifest.json';
export const characters = idle.characters;
export const animations = animation.assets;
export type Images = Map<string, HTMLImageElement>;
export async function loadImages(): Promise<Images> {
  const urls = [
    ...new Set([
      ...characters.flatMap((c) => [c.sprite, c.portrait]),
      ...animations.map((a) => a.path),
    ]),
  ].map((p) => `/assets/characters/${p}`);
  urls.push(
    '/assets/enemies/enemies-atlas.png',
    '/assets/world/terrain-atlas.png',
    '/assets/world/travelers-camp.png',
    '/assets/world/exploration-props.png',
    '/assets/world/decor-atlas.png',
    '/assets/enemies/wildlife-atlas.png',
    '/assets/cg/cg1.png',
    '/assets/cg/cg2.png',
  );
  return new Map(
    await Promise.all(
      urls.map(
        (url) =>
          new Promise<[string, HTMLImageElement]>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve([url, image]);
            image.onerror = () => reject(new Error(`素材加载失败：${url}`));
            image.src = url;
          }),
      ),
    ),
  );
}
export const portrait = (id: string) => `/assets/characters/${id}/portraits/default.png`;
