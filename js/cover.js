const coverCanvas = document.getElementById('cover-network');

if (coverCanvas) {
    const coverCtx = coverCanvas.getContext('2d');
    const coverMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const nodeLabels = ['mRNA', 'UTR', 'CDS', 'MCTS', 'AIDD', 'SE(3)', 'Agent'];
    let coverWidth = 0;
    let coverHeight = 0;
    let coverDpr = 1;
    let coverNodes = [];
    let coverFrameId = null;
    let activeNode = null;
    let pointerX = 0;
    let pointerY = 0;

    function listenToCoverMediaQuery(query, handler) {
        if (query.addEventListener) {
            query.addEventListener('change', handler);
        } else {
            query.addListener(handler);
        }
    }

    function createCoverNodes() {
        const centerX = coverWidth * 0.52;
        const centerY = coverHeight * 0.52;
        const radius = Math.min(coverWidth, coverHeight) * 0.32;

        coverNodes = nodeLabels.map((label, index) => {
            const angle = (Math.PI * 2 * index) / nodeLabels.length - Math.PI / 2;
            return {
                label,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                vx: Math.cos(angle + Math.PI / 2) * 0.25,
                vy: Math.sin(angle + Math.PI / 2) * 0.25,
                radius: label === 'mRNA' ? 28 : 22,
                fixed: false,
            };
        });
    }

    function resizeCover() {
        const rect = coverCanvas.getBoundingClientRect();
        coverDpr = Math.min(window.devicePixelRatio || 1, 2);
        coverWidth = rect.width;
        coverHeight = rect.height;
        coverCanvas.width = Math.floor(coverWidth * coverDpr);
        coverCanvas.height = Math.floor(coverHeight * coverDpr);
        coverCtx.setTransform(coverDpr, 0, 0, coverDpr, 0, 0);
        createCoverNodes();
    }

    function drawConnection(from, to, alpha) {
        const gradient = coverCtx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, `rgba(79, 172, 254, ${alpha})`);
        gradient.addColorStop(1, `rgba(145, 245, 210, ${alpha * 0.75})`);

        coverCtx.beginPath();
        coverCtx.moveTo(from.x, from.y);
        coverCtx.lineTo(to.x, to.y);
        coverCtx.strokeStyle = gradient;
        coverCtx.lineWidth = 1.2;
        coverCtx.stroke();
    }

    function drawNode(node) {
        const glow = coverCtx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.radius * 2.4);
        glow.addColorStop(0, 'rgba(79, 172, 254, 0.46)');
        glow.addColorStop(0.55, 'rgba(79, 172, 254, 0.14)');
        glow.addColorStop(1, 'rgba(79, 172, 254, 0)');

        coverCtx.beginPath();
        coverCtx.arc(node.x, node.y, node.radius * 2.4, 0, Math.PI * 2);
        coverCtx.fillStyle = glow;
        coverCtx.fill();

        coverCtx.beginPath();
        coverCtx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        coverCtx.fillStyle = node === activeNode ? 'rgba(79, 172, 254, 0.34)' : 'rgba(8, 24, 38, 0.92)';
        coverCtx.strokeStyle = node === activeNode ? 'rgba(145, 245, 210, 0.95)' : 'rgba(79, 172, 254, 0.72)';
        coverCtx.lineWidth = 1.5;
        coverCtx.fill();
        coverCtx.stroke();

        coverCtx.fillStyle = '#e8f4ff';
        coverCtx.font = '13px Segoe UI, Roboto, Helvetica, Arial, sans-serif';
        coverCtx.textAlign = 'center';
        coverCtx.textBaseline = 'middle';
        coverCtx.fillText(node.label, node.x, node.y);
    }

    function updateNodes() {
        const centerX = coverWidth * 0.52;
        const centerY = coverHeight * 0.52;

        coverNodes.forEach((node) => {
            if (node === activeNode) {
                node.x += (pointerX - node.x) * 0.32;
                node.y += (pointerY - node.y) * 0.32;
                node.vx *= 0.72;
                node.vy *= 0.72;
                return;
            }

            const pullX = (centerX - node.x) * 0.0008;
            const pullY = (centerY - node.y) * 0.0008;
            node.vx = (node.vx + pullX) * 0.992;
            node.vy = (node.vy + pullY) * 0.992;
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < node.radius || node.x > coverWidth - node.radius) node.vx *= -0.9;
            if (node.y < node.radius || node.y > coverHeight - node.radius) node.vy *= -0.9;
            node.x = Math.max(node.radius, Math.min(coverWidth - node.radius, node.x));
            node.y = Math.max(node.radius, Math.min(coverHeight - node.radius, node.y));
        });
    }

    function drawCover() {
        coverCtx.clearRect(0, 0, coverWidth, coverHeight);

        for (let i = 0; i < coverNodes.length; i++) {
            for (let j = i + 1; j < coverNodes.length; j++) {
                const first = coverNodes[i];
                const second = coverNodes[j];
                const dx = first.x - second.x;
                const dy = first.y - second.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const threshold = Math.min(coverWidth, coverHeight) * 0.48;
                if (distance < threshold) {
                    drawConnection(first, second, 0.28 * (1 - distance / threshold));
                }
            }
        }

        coverNodes.forEach(drawNode);
    }

    function animateCover() {
        updateNodes();
        drawCover();
        coverFrameId = requestAnimationFrame(animateCover);
    }

    function isCoverVisible() {
        const coverSlide = coverCanvas.closest('section');
        return coverSlide && coverSlide.classList.contains('present');
    }

    function startCover() {
        if (coverFrameId || coverMotionQuery.matches || !isCoverVisible()) return;
        coverFrameId = requestAnimationFrame(animateCover);
    }

    function stopCover() {
        if (!coverFrameId) return;
        cancelAnimationFrame(coverFrameId);
        coverFrameId = null;
    }

    function canvasPoint(event) {
        const rect = coverCanvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function findNode(point) {
        return coverNodes.find((node) => {
            const dx = node.x - point.x;
            const dy = node.y - point.y;
            return Math.sqrt(dx * dx + dy * dy) <= node.radius + 10;
        });
    }

    function handlePointerDown(event) {
        const point = canvasPoint(event);
        const node = findNode(point);
        if (!node) return;

        event.preventDefault();
        activeNode = node;
        pointerX = point.x;
        pointerY = point.y;
        coverCanvas.setPointerCapture(event.pointerId);
        startCover();
    }

    function handlePointerMove(event) {
        if (!activeNode) return;
        const point = canvasPoint(event);
        pointerX = point.x;
        pointerY = point.y;
    }

    function handlePointerUp(event) {
        if (!activeNode) return;
        activeNode = null;
        if (coverCanvas.hasPointerCapture(event.pointerId)) {
            coverCanvas.releasePointerCapture(event.pointerId);
        }
    }

    function handleCoverMotionChange() {
        stopCover();
        resizeCover();
        drawCover();
        startCover();
    }

    coverCanvas.addEventListener('pointerdown', handlePointerDown);
    coverCanvas.addEventListener('pointermove', handlePointerMove);
    coverCanvas.addEventListener('pointerup', handlePointerUp);
    coverCanvas.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('resize', () => {
        resizeCover();
        drawCover();
        startCover();
    });
    listenToCoverMediaQuery(coverMotionQuery, handleCoverMotionChange);

    if (window.deck) {
        window.deck.on('slidechanged', () => {
            if (isCoverVisible()) {
                startCover();
            } else {
                stopCover();
            }
        });
    }

    resizeCover();
    drawCover();
    startCover();
}
