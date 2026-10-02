# Chicago Mark

JD's portable maker's mark: four Chicago stars become hearts, taps float hearts, fountain pens,
and the occasional stout upward, and a sustained tap streak unlocks a full-screen celebration.

The component has no runtime dependencies, uses Shadow DOM, sends no data, and respects
`prefers-reduced-motion`.

## Install

Pin a release tag from GitHub:

```json
{
  "dependencies": {
    "@jdhartley/chicago-mark": "github:jdhartley/chicago-mark#v0.1.0"
  }
}
```

## Use

Plain HTML or Astro:

```html
<script type="module">
  import "@jdhartley/chicago-mark";
</script>

<jd-pens-chicago-mark></jd-pens-chicago-mark>
```

React:

```tsx
import '@jdhartley/chicago-mark';

export function FooterMark() {
  return <jd-pens-chicago-mark base-color="#e46c58" />;
}
```

Projects using TypeScript with React may need to add the element and its attributes to
`React.JSX.IntrinsicElements`; the package already augments the standard DOM element map.

## Options

```html
<jd-pens-chicago-mark
  base-color="#EF002B"
  size="60"
  heart-colors="#ff5570,#f4c84c,#52b9d9"
  heart-weight="0.65"
  pen-weight="0.27"
  stout-weight="0.08"
  full-after-taps="10"
  full-after-ms="2400"
  hold-to-ink
  hold-ms="2000"
  ink-color="#27467A"
  aria-label="Chicago"
></jd-pens-chicago-mark>
```

`base-color` accepts 3-, 4-, 6-, or 8-digit hex colors and defaults to Chicago flag red,
`#EF002B`. Particle weights are normalized, so they do not need to add to one. Invalid values use
the documented defaults. Internal cooldowns and device-specific particle limits remain fixed to
protect accidental activation and rendering performance.

`hold-to-ink` arms a press-and-hold gesture: holding the mark (or holding Space while it has focus)
inks its four hearts one by one in `ink-color`, and the fourth completes the hold. Letting go early
drains them and the release counts as an ordinary tap; the click that ends a completed hold does
not. Without the attribute a long press does nothing special, so a page can arm it only for the
people it means to, for example after `jd-chicago-mark-full-celebration`. `hold-ms` is bounded to
600–10000 and defaults to 2000. Under `prefers-reduced-motion` each heart inks in a single step.

The component emits bubbling, composed `jd-chicago-mark-tap`, `jd-chicago-mark-full-celebration`,
and `jd-chicago-mark-hold` events. Their details are `{ streakCount, burstSize }`,
`{ streakCount }`, and `{ holdMs }`, respectively. They are integration hooks only; the component
contains no analytics or network behavior.

## Custom particles

Set the `particles` property to mix extra particles into every burst and full celebration:

```js
const mark = document.querySelector('jd-pens-chicago-mark');
mark.particles = [
  { svg: '<svg viewBox="0 0 32 32">…</svg>', weight: 0.2 },
  { svg: '<svg viewBox="0 0 32 32">…</svg>', weight: 0.1 },
];
```

Each custom weight is normalized together with `heart-weight`, `pen-weight`, and `stout-weight`.
To redraw the pen, set `pen-weight="0"` and add your own pen at the share it should keep. `svg` is
inserted with `innerHTML`: pass only trusted, bundled markup, never user or network content. The
property may be set before the element is defined; it is picked up on connection.

Open `demo/index.html` through a local web server after running `npm run build` to try the defaults
and a themed variant.
