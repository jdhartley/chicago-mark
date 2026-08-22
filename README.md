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
  aria-label="Chicago"
></jd-pens-chicago-mark>
```

`base-color` accepts 3-, 4-, 6-, or 8-digit hex colors and defaults to Chicago flag red,
`#EF002B`. Particle weights are normalized, so they do not need to add to one. Invalid values use
the documented defaults. Internal cooldowns and device-specific particle limits remain fixed to
protect accidental activation and rendering performance.

The component emits bubbling, composed `jd-chicago-mark-tap` and
`jd-chicago-mark-full-celebration` events. Their details are `{ streakCount, burstSize }` and
`{ streakCount }`, respectively. They are integration hooks only; the component contains no
analytics or network behavior.

Open `demo/index.html` through a local web server after running `npm run build` to try the defaults
and a themed variant.
