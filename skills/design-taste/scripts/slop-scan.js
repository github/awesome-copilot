// Counts the markers of generated-looking UI on a rendered page. Paste it into the browser console, or run it with your browser tool.
// Read-only. The counts are not a verdict: they point at where to look, and are most useful before vs after.
//   accent           elements painted in the most used saturated color (text, background or border)
//   hues             distinct saturated hues in use (30° buckets)
//   uppercase        text set in uppercase (by CSS or by typing), and uppercase labels right above a heading (eyebrows)
//   gradients        backgrounds with gradients; gradient text (background-clip: text)
//   glows            colored shadows with a large blur
//   iconChips        small boxes with a tinted or translucent background holding one icon
//   pills            fully rounded elements with a background (badges, chips, buttons)
//   accentRoles      for the most used saturated color: how many elements use it as a link or control, as status or
//                    other text, and as a fill without text (bars, dots) — one hue doing all three is a place to look
//   nestedCards      card-like boxes (own fill or border, radius ≥ 6, ≥ 120×60) inside another card-like box
//   fontSizes, radii distinct values in use
//   transitionAll, backdropFilter  counts
(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const memo = new Map()
  const rgba = v => { if (memo.has(v)) return memo.get(v); let o = null; if (v && v !== 'transparent') { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = v; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; o = [d[0], d[1], d[2], d[3] / 255] } memo.set(v, o); return o }
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, s, l] }
  const saturated = c => c && c[3] > 0.15 && (([, s, l]) => s > 0.45 && l > 0.2 && l < 0.85)(hsl(c))
  const key = c => c.slice(0, 3).map(v => Math.round(v / 8)).join(',')
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 }
  const sel = e => { const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return e.tagName.toLowerCase() + (c ? '.' + c : '') }
  const all = [...document.body.querySelectorAll('*')].filter(vis)
  const ownText = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()

  const colorUse = new Map(), roleUse = new Map(), hues = new Set(), sizes = new Set(), radii = new Set()
  const out = { uppercase: 0, eyebrows: [], gradients: 0, gradientText: 0, glows: 0, iconChips: [], pills: 0, transitionAll: 0, backdropFilter: 0 }
  for (const e of all) {
    const s = getComputedStyle(e), r = e.getBoundingClientRect(), text = ownText(e)
    const svg = e instanceof SVGElement && !(e instanceof SVGSVGElement)
    const paints = [text ? s.color : null, s.backgroundColor, parseFloat(s.borderTopWidth) > 0 ? s.borderTopColor : null, svg && s.fill !== 'none' ? s.fill : null, svg && s.stroke !== 'none' ? s.stroke : null].map(v => v && !/^url/.test(v) ? rgba(v) : null).filter(saturated)
    for (const c of new Set(paints.map(key))) colorUse.set(c, (colorUse.get(c) || 0) + 1)
    for (const c of new Set(paints.map(key))) { if (!roleUse.has(c)) roleUse.set(c, { control: 0, text: 0, fill: 0 }); const r = roleUse.get(c); if (e.closest('a,button,[role=button],[role=tab]')) r.control++; else if (text) r.text++; else r.fill++ }
    for (const c of paints) hues.add(Math.floor(hsl(c)[0] / 30))
    if (text) {
      sizes.add(s.fontSize)
      const upper = s.textTransform === 'uppercase' || (text.length > 3 && /[A-ZА-Я]/.test(text) && text === text.toUpperCase())
      if (upper) {
        out.uppercase++
        const next = e.nextElementSibling || e.parentElement?.nextElementSibling
        if (next && (/^H[1-3]$/.test(next.tagName) || parseFloat(getComputedStyle(next).fontSize) >= parseFloat(s.fontSize) * 1.8)) out.eyebrows.push(text.slice(0, 40))
      }
    }
    if (/gradient/.test(s.backgroundImage)) { out.gradients++; if (/text/.test(s.backgroundClip + s.webkitBackgroundClip)) out.gradientText++ }
    for (const sh of s.boxShadow === 'none' ? [] : s.boxShadow.split(/,(?![^()]*\))/)) {
      const c = rgba((sh.match(/(rgba?|oklch|color)\([^)]*\)|#[0-9a-f]+/i) || [])[0]); const blur = (sh.match(/(-?\d+(?:\.\d+)?)px/g) || []).map(parseFloat)[2] || 0
      if (saturated(c) && blur >= 16) { out.glows++; break }
    }
    const rad = parseFloat(s.borderTopLeftRadius); if (rad > 0) radii.add(rad >= 999 || rad >= r.height / 2 - 0.5 ? 'pill' : rad)
    const solid = rgba(s.backgroundColor)
    const bg = solid && solid[3] > 0 ? solid : /gradient/.test(s.backgroundImage) ? [0, 0, 0, 0.5] : null
    if (bg && bg[3] > 0 && rad >= r.height / 2 - 0.5 && r.height <= 40 && text) out.pills++
    if (bg && bg[3] > 0 && r.width <= 56 && r.height <= 56 && Math.abs(r.width - r.height) < 4 && e.children.length === 1 && /^(svg|img|i|span)$/i.test(e.children[0].tagName) && !text && !e.matches('button,a,[role=button]') && (bg[3] < 1 || saturated(bg))) out.iconChips.push(sel(e))
    if (/(^|,\s*)all\b/.test(s.transitionProperty) && parseFloat(s.transitionDuration) > 0) out.transitionAll++
    if ((s.backdropFilter || s.webkitBackdropFilter || 'none') !== 'none') out.backdropFilter++
  }
  const cardLike = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); const fill = rgba(s.backgroundColor); return r.width >= 120 && r.height >= 60 && parseFloat(s.borderTopLeftRadius) >= 6 && ((fill && fill[3] > 0) || (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none')) }
  const cardEls = all.filter(cardLike)
  const nested = cardEls.filter(e => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) if (cardEls.includes(n)) return true; return false })
  const ranked = [...colorUse.entries()].sort((a, b) => b[1] - a[1])
  return {
    viewport: `${innerWidth}×${innerHeight}`, elements: all.length,
    accent: ranked[0] ? { rgb: ranked[0][0].split(',').map(v => v * 8), elements: ranked[0][1] } : null,
    accentRoles: ranked[0] ? roleUse.get(ranked[0][0]) : null,
    saturatedColors: ranked.length, hues: hues.size,
    ...out, eyebrows: out.eyebrows.slice(0, 15), iconChips: { count: out.iconChips.length, examples: [...new Set(out.iconChips)].slice(0, 8) },
    nestedCards: { count: nested.length, examples: [...new Set(nested.map(sel))].slice(0, 6) },
    fontSizes: sizes.size, radii: [...radii].sort((a, b) => (a === 'pill') - (b === 'pill') || a - b),
  }
})()
