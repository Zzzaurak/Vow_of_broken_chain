import { useEffect, type RefObject } from 'react';
import { getSettingsSnap } from './store';
/** DOM focus is local UI state. This handler never creates a second menu selection store. */
export function useMenuNavigation(
  ref: RefObject<HTMLElement | null>,
  onBack?: () => void,
  enabled = true,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const controls = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ).filter((el) => {
        const collapsed = el.closest('details:not([open])');
        return (
          el.getClientRects().length > 0 &&
          (!collapsed || collapsed.querySelector(':scope > summary') === el)
        );
      });
    const focusFirst = () => {
      if (!root.contains(document.activeElement)) controls()[0]?.focus({ preventScroll: true });
    };
    focusFirst();
    const keydown = (
      e: Pick<
        KeyboardEvent,
        'code' | 'target' | 'defaultPrevented' | 'preventDefault' | 'stopPropagation'
      >,
    ) => {
      if (e.defaultPrevented || root.querySelector('[data-rebinding="true"]')) return;
      const settings = getSettingsSnap(),
        b = settings.bindings[settings.preset];
      if (e.code === 'Escape' || e.code === b.menuBack) {
        if (onBack) {
          e.preventDefault();
          e.stopPropagation();
          onBack();
        }
        return;
      }
      const target = e.target as HTMLElement;
      const values = controls(),
        index = values.indexOf(target);
      if (e.code === b.menuConfirm) {
        if (target.tagName === 'SELECT') return;
        e.preventDefault();
        e.stopPropagation();
        target.click();
        return;
      }
      if (![b.menuUp, b.menuDown, b.menuLeft, b.menuRight].includes(e.code)) return;
      if (
        target instanceof HTMLInputElement &&
        target.type === 'range' &&
        (e.code === b.menuLeft || e.code === b.menuRight)
      ) {
        e.preventDefault();
        const amount = Number(target.step) || 1;
        const value = Math.min(
          Number(target.max),
          Math.max(
            Number(target.min),
            Number(target.value) + (e.code === b.menuRight ? amount : -amount),
          ),
        );
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          target,
          String(value),
        );
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (
        target instanceof HTMLSelectElement &&
        (e.code === b.menuLeft || e.code === b.menuRight)
      ) {
        e.preventDefault();
        target.selectedIndex = Math.min(
          target.options.length - 1,
          Math.max(0, target.selectedIndex + (e.code === b.menuRight ? 1 : -1)),
        );
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const offset = e.code === b.menuUp || e.code === b.menuLeft ? -1 : 1;
      values[(index + offset + values.length) % values.length]?.focus();
    };
    const mousedown = (event: MouseEvent) => {
      if (getSettingsSnap().preset !== 'mouse' || root.querySelector('[data-rebinding="true"]'))
        return;
      // Primary pointer clicks retain their normal target semantics; other buttons can navigate.
      if (
        event.button === 0 &&
        (event.target as HTMLElement).closest('button,input,select,summary,a')
      )
        return;
      const code = `Mouse${event.button}`;
      const bindings = getSettingsSnap().bindings.mouse;
      if (
        ![
          bindings.menuUp,
          bindings.menuDown,
          bindings.menuLeft,
          bindings.menuRight,
          bindings.menuConfirm,
          bindings.menuBack,
        ].includes(code)
      )
        return;
      const target = root.contains(document.activeElement) ? document.activeElement : event.target;
      keydown({
        code,
        target,
        defaultPrevented: event.defaultPrevented,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      });
    };
    const contextmenu = (event: MouseEvent) => event.preventDefault();
    root.addEventListener('mousedown', mousedown);
    root.addEventListener('contextmenu', contextmenu);
    root.addEventListener('keydown', keydown);
    const observer = new MutationObserver(focusFirst);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      root.removeEventListener('keydown', keydown);
      root.removeEventListener('mousedown', mousedown);
      root.removeEventListener('contextmenu', contextmenu);
      observer.disconnect();
    };
  }, [ref, onBack, enabled]);
}
