const coverCanvas = document.getElementById('cover-network');

if (coverCanvas) {
    const ctx = coverCanvas.getContext('2d');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = null;
    let points = [];
    let activePoint = null;
    let inView = true;
    let pointer = { x: 0, y: 0, active: false };

    function listenToMediaQuery(query, handler) {
        if (query.addEventListener) {
            query.addEventListener('change', handler);
        } else {
            query.addListener(handler);
        }
    }

    function pointCount() {
        if (window.innerWidth < 640) return 34;
        if (window.innerWidth < 980) return 48;
        return 64;
    }

    function createPoints() {
        const count = pointCount();
        points = Array.from({ length: count }, (_, index) => {
            const band = index / count;
            const xBias = band < 0.45 ? 0.16 : 0.42;
            return {
                x: width * (xBias + Math.random() * 0.76),
                y: height * (0.08 + Math.random() * 0.82),
                vx: (Math.random() - 0.5) * 0.18,
                vy: (Math.random() - 0.5) * 0.18,
                r: 1.1 + Math.random() * 1.9,
                phase: Math.random() * Math.PI * 2,
            };
        });
    }

    function resize() {
        const rect = coverCanvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        coverCanvas.width = Math.floor(width * dpr);
        coverCanvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        createPoints();
    }

    function update() {
        const anchorX = width * 0.64;
        const anchorY = height * 0.46;

        points.forEach((point) => {
            if (point === activePoint) {
                point.x += (pointer.x - point.x) * 0.24;
                point.y += (pointer.y - point.y) * 0.24;
                point.vx *= 0.78;
                point.vy *= 0.78;
                return;
            }

            const dx = anchorX - point.x;
            const dy = anchorY - point.y;
            point.vx += dx * 0.000018;
            point.vy += dy * 0.000018;

            if (pointer.active) {
                const px = point.x - pointer.x;
                const py = point.y - pointer.y;
                const distance = Math.sqrt(px * px + py * py) || 1;
                if (distance < 190) {
                    const force = (1 - distance / 190) * 0.018;
                    point.vx += (px / distance) * force;
                    point.vy += (py / distance) * force;
                }
            }

            point.phase += 0.006;
            point.vx += Math.cos(point.phase) * 0.002;
            point.vy += Math.sin(point.phase) * 0.002;
            point.vx *= 0.992;
            point.vy *= 0.992;
            point.x += point.vx;
            point.y += point.vy;

            if (point.x < 0 || point.x > width) point.vx *= -0.8;
            if (point.y < 0 || point.y > height) point.vy *= -0.8;
            point.x = Math.max(0, Math.min(width, point.x));
            point.y = Math.max(0, Math.min(height, point.y));
        });
    }

    function drawStrand() {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = 'rgba(145, 245, 210, 0.42)';
        ctx.lineWidth = 1;

        for (let row = 0; row < 2; row++) {
            ctx.beginPath();
            const offsetY = height * (0.28 + row * 0.36);
            for (let x = width * 0.44; x < width * 0.96; x += 14) {
                const t = (x / width) * Math.PI * 7 + row;
                const y = offsetY + Math.sin(t) * 24;
                if (x === width * 0.44) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawStrand();

        for (let i = 0; i < points.length; i++) {
            const first = points[i];
            for (let j = i + 1; j < points.length; j++) {
                const second = points[j];
                const dx = first.x - second.x;
                const dy = first.y - second.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const threshold = Math.min(width, height) * 0.18;
                if (distance > threshold) continue;

                const alpha = 0.18 * (1 - distance / threshold);
                ctx.beginPath();
                ctx.moveTo(first.x, first.y);
                ctx.lineTo(second.x, second.y);
                ctx.strokeStyle = `rgba(79, 172, 254, ${alpha})`;
                ctx.lineWidth = 0.65;
                ctx.stroke();
            }
        }

        points.forEach((point) => {
            const isActive = point === activePoint;
            ctx.beginPath();
            ctx.arc(point.x, point.y, isActive ? point.r + 2.5 : point.r, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? 'rgba(145, 245, 210, 0.76)' : 'rgba(120, 205, 255, 0.48)';
            ctx.fill();

            if (isActive) {
                const glow = ctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, 44);
                glow.addColorStop(0, 'rgba(145, 245, 210, 0.24)');
                glow.addColorStop(1, 'rgba(145, 245, 210, 0)');
                ctx.beginPath();
                ctx.arc(point.x, point.y, 44, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();
            }
        });
    }

    function animate() {
        update();
        draw();
        frameId = requestAnimationFrame(animate);
    }

    function start() {
        if (frameId || motionQuery.matches || document.hidden || !inView) return;
        frameId = requestAnimationFrame(animate);
    }

    function stop() {
        if (!frameId) return;
        cancelAnimationFrame(frameId);
        frameId = null;
    }

    function canvasPoint(event) {
        const rect = coverCanvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function nearestPoint(target) {
        let nearest = null;
        let nearestDistance = Infinity;
        points.forEach((point) => {
            const dx = point.x - target.x;
            const dy = point.y - target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < nearestDistance) {
                nearest = point;
                nearestDistance = distance;
            }
        });
        return nearestDistance <= 44 ? nearest : null;
    }

    coverCanvas.addEventListener('pointerdown', (event) => {
        const target = canvasPoint(event);
        activePoint = nearestPoint(target);
        if (!activePoint) return;
        event.preventDefault();
        pointer = { ...target, active: true };
        coverCanvas.setPointerCapture(event.pointerId);
        start();
    });

    coverCanvas.addEventListener('pointermove', (event) => {
        const target = canvasPoint(event);
        pointer = { ...target, active: true };
    });

    function releasePointer(event) {
        activePoint = null;
        pointer.active = false;
        if (coverCanvas.hasPointerCapture(event.pointerId)) {
            coverCanvas.releasePointerCapture(event.pointerId);
        }
    }

    coverCanvas.addEventListener('pointerup', releasePointer);
    coverCanvas.addEventListener('pointercancel', releasePointer);
    coverCanvas.addEventListener('pointerleave', () => {
        if (!activePoint) pointer.active = false;
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stop();
        } else {
            start();
        }
    });

    window.addEventListener('resize', () => {
        resize();
        draw();
        start();
    });

    listenToMediaQuery(motionQuery, () => {
        stop();
        resize();
        draw();
        start();
    });

    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        inView = Boolean(entry && entry.isIntersecting);
        if (inView) {
            start();
        } else {
            stop();
        }
    }, { threshold: 0.08 });

    observer.observe(coverCanvas);

    resize();
    draw();
    start();
}
