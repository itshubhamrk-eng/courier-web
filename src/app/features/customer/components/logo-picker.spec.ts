import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LogoPicker } from './logo-picker';

describe('LogoPicker', () => {
  function create() {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(LogoPicker);
    fixture.detectChanges();
    return fixture;
  }
  const pick = (c: LogoPicker, file: File) =>
    (c as unknown as { choose(e: Event): void }).choose({ target: { files: [file], value: '' } } as unknown as Event);

  it('refuses a file over 150 KB or of another type, emitting nothing', () => {
    const fixture = create();
    const picked: unknown[] = [];
    fixture.componentInstance.picked.subscribe((f) => picked.push(f));
    pick(fixture.componentInstance, new File([new Uint8Array(150 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    pick(fixture.componentInstance, new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }));
    expect(picked).toEqual([]);
  });

  it('emits null when the logo is removed', () => {
    const fixture = create();
    const picked: unknown[] = [];
    fixture.componentInstance.picked.subscribe((f) => picked.push(f));
    (fixture.componentInstance as unknown as { remove(): void }).remove();
    expect(picked).toEqual([null]);
  });
});
