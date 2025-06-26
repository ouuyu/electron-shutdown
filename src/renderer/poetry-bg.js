(function() {
    const darkPalettes = [
        ['#232946', '#393e46', '#22223b', '#2d3142'],
        ['#232946', '#393e46', '#393e46', '#232946'],
        ['#232946', '#393e46', '#232946', '#393e46'],
        ['#232946', '#232946', '#393e46', '#232946'],
        ['#232946', '#232946', '#232946', '#393e46']
    ];
    let idx = 0;
    let nextIdx = 1;
    let step = 0;
    const steps = 36;
    let deg = 135;
    function lerpColor(a, b, t) {
        const ah = parseInt(a.replace('#', ''), 16),
              bh = parseInt(b.replace('#', ''), 16);
        const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
        const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
        const rr = Math.round(ar + (br - ar) * t);
        const rg = Math.round(ag + (bg - ag) * t);
        const rb = Math.round(ab + (bb - ab) * t);
        return `rgb(${rr},${rg},${rb})`;
    }
    function animate() {
        const paletteA = darkPalettes[idx];
        const paletteB = darkPalettes[nextIdx];
        const t = step / steps;
        const colors = paletteA.map((c, i) => lerpColor(c, paletteB[i], t));
        deg += Math.random() - 1; // 每帧小幅抖动
        if (deg < 90) deg = 90;
        if (deg > 270) deg = 270;
        document.body.style.background = `linear-gradient(${deg}deg, ${colors.join(',')})`;
        step++;
        if (step > steps) {
            step = 0;
            idx = nextIdx;
            nextIdx = (nextIdx + 1) % darkPalettes.length;
        }
        requestAnimationFrame(animate);
    }
    animate();
})();
