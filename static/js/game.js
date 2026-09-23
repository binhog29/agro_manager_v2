/**
 * MOTOR PRINCIPAL DO JOGO (game.js)
 */
class Player {
    constructor(name = "Fazendeiro", title = "Pioneiro", initialMoney = 1500) {
        this.name = name;
        this.title = title;
        this.balance = initialMoney;
    }

    getFormattedBalance() {
        return `R$ ${this.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
}

class TimeManager {
    constructor(onTimeTick, onNightToggle) {
        this.hour = 8;
        this.minute = 0;
        this.day = 1;
        this.seasonIndex = 0;
        this.seasons = ['PRIMAVERA', 'VERÃO', 'OUTONO', 'INVERNO'];
        this.isNight = false;
        this.onTimeTick = onTimeTick;
        this.onNightToggle = onNightToggle;
        this.interval = null;
    }

    start() {
        if (this.interval) return;
        this.interval = setInterval(() => this.tick(), 1000);
    }

    tick() {
        this.minute += 10;
        if (this.minute >= 60) {
            this.minute = 0;
            this.hour++;
        }
        if (this.hour >= 24) {
            this.hour = 0;
            this.day++;
            if (this.day > 30) {
                this.day = 1;
                this.seasonIndex = (this.seasonIndex + 1) % this.seasons.length;
            }
        }

        const checkNight = (this.hour >= 18 || this.hour < 6);
        if (checkNight !== this.isNight) {
            this.isNight = checkNight;
            if (this.onNightToggle) this.onNightToggle(this.isNight);
        }

        if (this.onTimeTick) this.onTimeTick(this.getTimeData());
    }

    getTimeData() {
        const hh = String(this.hour).padStart(2, '0');
        const mm = String(this.minute).padStart(2, '0');
        return {
            clock: `${hh}:${mm}`,
            day: `DIA ${this.day}`,
            season: this.seasons[this.seasonIndex]
        };
    }
}

class Building {
    constructor(id, name, posX, posY) {
        this.id = id;
        this.name = name;
        this.posX = posX;
        this.posY = posY;
    }
}

class UIManager {
    constructor() {
        this.elUserName = document.querySelector('.user-name');
        this.elUserTitle = document.querySelector('.user-title');
        this.elWallet = document.querySelector('.wallet-badge');
        this.elClock = document.querySelector('.clock');
        this.elDate = document.querySelector('.date-badge');
        this.elSeason = document.querySelector('.season-badge');
        this.nightOverlay = document.getElementById('noite-overlay');
    }

    updatePlayerInfo(player) {
        if (this.elUserName) this.elUserName.innerText = player.name;
        if (this.elUserTitle) this.elUserTitle.innerText = player.title;
        if (this.elWallet) this.elWallet.innerText = player.getFormattedBalance();
    }

    updateTimeInfo(timeData) {
        if (this.elClock) this.elClock.innerText = timeData.clock;
        if (this.elDate) this.elDate.innerText = timeData.day;
        if (this.elSeason) this.elSeason.innerHTML = `<i class="fa-solid fa-leaf"></i> ${timeData.season}`;
    }

    setNightTheme(isNight) {
        if (this.nightOverlay) {
            this.nightOverlay.classList.toggle('ativo', isNight);
        }
    }
}

class Game {
    constructor() {
        this.player = new Player();
        this.ui = new UIManager();
        
        if (typeof GerenciadorFuncionarios !== 'undefined') {
            this.gerenciadorFunc = new GerenciadorFuncionarios();
        }

        this.timeManager = new TimeManager(
            (timeData) => this.ui.updateTimeInfo(timeData),
            (isNight) => this.ui.setNightTheme(isNight)
        );

        this.buildings = {
            armazem: new Building('armazem', 'Armazém', 450, 80),
            represa: new Building('represa', 'Represa', 180, 50),
            curral:  new Building('curral', 'Curral', 420, 280),
            lavoura: new Building('lavoura', 'Lavoura', 180, 280)
        };
    }

    init() {
        this.ui.updatePlayerInfo(this.player);
        this.timeManager.start();

        // DESENHA OS PEÕES NO MAPA
        if (this.gerenciadorFunc) {
            this.gerenciadorFunc.renderizarTodos('mapa-sede-container');
        }

        this._bindEvents();
    }

    enviarPeaoPara(buildingKey) {
        if (!this.gerenciadorFunc) return;
        const peao = this.gerenciadorFunc.getPrincipal();
        const destino = this.buildings[buildingKey];

        if (peao && destino) {
            peao.say(`Comando recebido! Indo para ${destino.name}...`);
            peao.moveTo(destino.posX, destino.posY, () => {
                peao.say("Trabalho concluído!", 2000);
            });
        }
    }

    _bindEvents() {
        const btnTempo = document.querySelector('.btn-tempo');
        if (btnTempo) {
            btnTempo.addEventListener('click', () => {
                this.timeManager.hour = (this.timeManager.hour + 4) % 24;
                this.timeManager.tick();
            });
        }
    }
}

// ARRANQUE GARANTIDO DO JOGO
function iniciarJogo() {
    window.game = new Game();
    window.game.init();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    iniciarJogo();
} else {
    document.addEventListener('DOMContentLoaded', iniciarJogo);
}
