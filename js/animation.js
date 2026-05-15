const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1';
canvas.style.background = 'transparent';

let width, height;
let particles = [];
let animationFrameId = null;

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function listenToMediaQuery(query, handler) {
    if (query.addEventListener) {
        query.addEventListener('change', handler);
    } else {
        query.addListener(handler);
    }
}

function getParticleCount() {
    if (motionQuery.matches) return 0;
    if (window.innerWidth <= 520) return 36;
    if (window.innerWidth <= 900) return 54;
    return 80;
}

function getConnectionDistance() {
    if (window.innerWidth <= 520) return 110;
    if (window.innerWidth <= 900) return 130;
    return 150;
}

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.fill();
    }
}

function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    particles = [];
    const particleCount = getParticleCount();
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    const connectionDistance = getConnectionDistance();

    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDistance) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(100, 200, 255, ${1 - dist / connectionDistance})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
    animationFrameId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (animationFrameId || motionQuery.matches || document.hidden) return;
    animationFrameId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (!animationFrameId) return;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
}

function handleVisibilityChange() {
    if (document.hidden) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

function handleMotionPreferenceChange() {
    stopAnimation();
    resize();
    if (motionQuery.matches) {
        ctx.clearRect(0, 0, width, height);
        return;
    }
    startAnimation();
}

window.addEventListener('resize', () => {
    resize();
    startAnimation();
});
document.addEventListener('visibilitychange', handleVisibilityChange);
listenToMediaQuery(motionQuery, handleMotionPreferenceChange);

resize();
startAnimation();
