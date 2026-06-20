(function () {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;

    var BRICK_ROWS = 8;
    var BRICK_COLS = 12;
    var BRICK_W = 62;
    var BRICK_H = 20;
    var BRICK_PAD = 2;
    var BRICK_OFFSET_TOP = 40;
    var BRICK_OFFSET_LEFT = (W - (BRICK_COLS * (BRICK_W + BRICK_PAD) - BRICK_PAD)) / 2;

    var ROW_COLORS = [
        '#e74c3c', '#e74c3c',
        '#e67e22', '#e67e22',
        '#f1c40f', '#2ecc71',
        '#3498db', '#9b59b6'
    ];

    var ROW_SCORES = [5, 5, 3, 3, 1, 1, 1, 1];

    var PADDLE_W = 100;
    var PADDLE_H = 12;
    var PADDLE_Y = H - 36;

    var BALL_R = 6;
    var BASE_SPEED = 4;

    var INIT_LIVES = 3;
    var SPEED_UP_1 = 20;
    var SPEED_UP_2 = 40;

    var STORAGE_KEY = 'breakout_high_score';

    var state = {};

    var scoreEl = document.getElementById('score');
    var livesEl = document.getElementById('lives');
    var highScoreEl = document.getElementById('high-score');
    var overlay = document.getElementById('overlay');
    var overlayTitle = document.getElementById('overlay-title');
    var overlayScore = document.getElementById('overlay-score');
    var overlayRecord = document.getElementById('overlay-record');
    var pauseOverlay = document.getElementById('pause-overlay');

    function getHighScore() {
        return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    }

    function setHighScore(val) {
        localStorage.setItem(STORAGE_KEY, String(val));
    }

    function resetBall() {
        state.ball = {
            x: W / 2,
            y: PADDLE_Y - BALL_R - 2,
            dx: (Math.random() > 0.5 ? 1 : -1) * BASE_SPEED * 0.7,
            dy: -BASE_SPEED,
            r: BALL_R
        };
        state.ballStuck = true;
    }

    function initBricks() {
        state.bricks = [];
        for (var r = 0; r < BRICK_ROWS; r++) {
            for (var c = 0; c < BRICK_COLS; c++) {
                state.bricks.push({
                    row: r,
                    col: c,
                    x: BRICK_OFFSET_LEFT + c * (BRICK_W + BRICK_PAD),
                    y: BRICK_OFFSET_TOP + r * (BRICK_H + BRICK_PAD),
                    w: BRICK_W,
                    h: BRICK_H,
                    alive: true,
                    color: ROW_COLORS[r],
                    score: ROW_SCORES[r]
                });
            }
        }
    }

    function init() {
        state.score = 0;
        state.lives = INIT_LIVES;
        state.destroyedCount = 0;
        state.paused = false;
        state.gameOver = false;
        state.gameWon = false;
        state.speedUp1Done = false;
        state.speedUp2Done = false;
        state.speedMult = 1;

        state.paddle = {
            x: (W - PADDLE_W) / 2,
            y: PADDLE_Y,
            w: PADDLE_W,
            h: PADDLE_H
        };

        initBricks();
        resetBall();
        updateHUD();
        overlay.classList.add('hidden');
        pauseOverlay.classList.add('hidden');
    }

    function updateHUD() {
        scoreEl.textContent = '得分: ' + state.score;
        livesEl.textContent = '生命: ' + state.lives;
        highScoreEl.textContent = '最高分: ' + getHighScore();
    }

    function launchBall() {
        if (state.ballStuck) {
            state.ballStuck = false;
            var speed = BASE_SPEED * state.speedMult;
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
            state.ball.dx = Math.cos(angle) * speed;
            state.ball.dy = Math.sin(angle) * speed;
        }
    }

    function update() {
        if (state.paused || state.gameOver || state.gameWon) return;

        var b = state.ball;
        var p = state.paddle;

        if (state.ballStuck) {
            b.x = p.x + p.w / 2;
            b.y = PADDLE_Y - b.r - 2;
            return;
        }

        b.x += b.dx;
        b.y += b.dy;

        if (b.x - b.r < 0) {
            b.x = b.r;
            b.dx = Math.abs(b.dx);
        }
        if (b.x + b.r > W) {
            b.x = W - b.r;
            b.dx = -Math.abs(b.dx);
        }
        if (b.y - b.r < 0) {
            b.y = b.r;
            b.dy = Math.abs(b.dy);
        }

        if (b.y + b.r > H) {
            state.lives--;
            updateHUD();
            if (state.lives <= 0) {
                endGame(false);
            } else {
                resetBall();
            }
            return;
        }

        if (b.dy > 0 &&
            b.y + b.r >= p.y &&
            b.y + b.r <= p.y + p.h + 4 &&
            b.x >= p.x - b.r &&
            b.x <= p.x + p.w + b.r) {

            b.y = p.y - b.r;
            var hitPos = (b.x - p.x) / p.w;
            hitPos = Math.max(0, Math.min(1, hitPos));
            var angle = (hitPos - 0.5) * Math.PI * 0.7;
            angle = angle - Math.PI / 2;
            if (angle > -0.2) angle = -0.2;
            if (angle < -Math.PI + 0.2) angle = -Math.PI + 0.2;
            var spd = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
            b.dx = Math.cos(angle) * spd;
            b.dy = Math.sin(angle) * spd;
            if (b.dy > 0) b.dy = -b.dy;
        }

        for (var i = 0; i < state.bricks.length; i++) {
            var br = state.bricks[i];
            if (!br.alive) continue;

            if (b.x + b.r > br.x &&
                b.x - b.r < br.x + br.w &&
                b.y + b.r > br.y &&
                b.y - b.r < br.y + br.h) {

                br.alive = false;
                state.score += br.score;
                state.destroyedCount++;
                updateHUD();

                if (!state.speedUp1Done && state.destroyedCount >= SPEED_UP_1) {
                    state.speedUp1Done = true;
                    state.speedMult *= 1.2;
                    state.ball.dx *= 1.2;
                    state.ball.dy *= 1.2;
                }
                if (!state.speedUp2Done && state.destroyedCount >= SPEED_UP_2) {
                    state.speedUp2Done = true;
                    state.speedMult *= 1.2;
                    state.ball.dx *= 1.2;
                    state.ball.dy *= 1.2;
                }

                var overlapLeft = (b.x + b.r) - br.x;
                var overlapRight = (br.x + br.w) - (b.x - b.r);
                var overlapTop = (b.y + b.r) - br.y;
                var overlapBottom = (br.y + br.h) - (b.y - b.r);
                var minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapTop || minOverlap === overlapBottom) {
                    b.dy = -b.dy;
                } else {
                    b.dx = -b.dx;
                }

                break;
            }
        }

        var allDead = true;
        for (var j = 0; j < state.bricks.length; j++) {
            if (state.bricks[j].alive) {
                allDead = false;
                break;
            }
        }
        if (allDead) {
            endGame(true);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        for (var i = 0; i < state.bricks.length; i++) {
            var br = state.bricks[i];
            if (!br.alive) continue;
            ctx.fillStyle = br.color;
            ctx.fillRect(br.x, br.y, br.w, br.h);

            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(br.x, br.y, br.w, br.h * 0.35);
        }

        var p = state.paddle;
        var grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
        grad.addColorStop(0, '#5dade2');
        grad.addColorStop(1, '#2e86c1');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, p.h, 6);
        ctx.fill();

        var b = state.ball;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = '#ecf0f1';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function endGame(won) {
        state.gameOver = !won;
        state.gameWon = won;

        var hi = getHighScore();
        var newRecord = state.score > hi;
        if (newRecord) {
            setHighScore(state.score);
        }

        overlayTitle.textContent = won ? '恭喜通关！' : '游戏结束';
        overlayScore.textContent = '本次得分: ' + state.score;
        if (newRecord) {
            overlayRecord.textContent = '🎉 新纪录！';
            overlayRecord.classList.remove('hidden');
        } else {
            overlayRecord.classList.add('hidden');
        }
        overlay.classList.remove('hidden');
        updateHUD();
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        state.paddle.x = mx - state.paddle.w / 2;
        if (state.paddle.x < 0) state.paddle.x = 0;
        if (state.paddle.x + state.paddle.w > W) state.paddle.x = W - state.paddle.w;
    });

    canvas.addEventListener('click', function () {
        if (state.ballStuck) {
            launchBall();
        }
    });

    overlay.addEventListener('click', function () {
        init();
    });

    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (state.gameOver || state.gameWon) return;
            state.paused = !state.paused;
            if (state.paused) {
                pauseOverlay.classList.remove('hidden');
            } else {
                pauseOverlay.classList.add('hidden');
            }
        }
    });

    if (!ctx.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
            if (typeof r === 'number') r = [r, r, r, r];
            this.moveTo(x + r[0], y);
            this.lineTo(x + w - r[1], y);
            this.arcTo(x + w, y, x + w, y + r[1], r[1]);
            this.lineTo(x + w, y + h - r[2]);
            this.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
            this.lineTo(x + r[3], y + h);
            this.arcTo(x, y + h, x, y + h - r[3], r[3]);
            this.lineTo(x, y + r[0]);
            this.arcTo(x, y, x + r[0], y, r[0]);
            this.closePath();
        };
    }

    init();
    loop();
})();
