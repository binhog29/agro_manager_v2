/**
 * INJETA CSS PARA ANIMAÇÃO DAS PERNAS E DO CORPO
 */
(function injetarCSSAnimacao() {
    if (document.getElementById('css-animacao-peao')) return;
    const style = document.createElement('style');
    style.id = 'css-animacao-peao';
    style.innerHTML = `
        @keyframes caminhar-bobbing {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
        }
        @keyframes perna-esq-passo {
            0%, 100% { transform: rotate(-25deg); }
            50% { transform: rotate(25deg); }
        }
        @keyframes perna-dir-passo {
            0%, 100% { transform: rotate(25deg); }
            50% { transform: rotate(-25deg); }
        }
        .peao-worker.andando .peao-corpo {
            animation: caminhar-bobbing 0.3s infinite ease-in-out;
        }
        .peao-worker.andando .perna.esq {
            animation: perna-esq-passo 0.3s infinite ease-in-out;
            transform-origin: top center;
        }
        .peao-worker.andando .perna.dir {
            animation: perna-dir-passo 0.3s infinite ease-in-out;
            transform-origin: top center;
        }
    `;
    document.head.appendChild(style);
})();

/**
 * CLASSE FUNCIONÁRIO
 */
class Funcionario {
    constructor(id, nome, cargo, salario, posX = 180, posY = 120) {
        this.id = id;
        this.nome = nome;
        this.cargo = cargo;
        this.salario = salario;
        this.posX = posX;
        this.posY = posY;
        this.isMoving = false;
        this.rotinaAtiva = false;
        this.element = null;
        this.balao = null;
    }

    render(containerId = 'mapa-sede-container') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const antigo = document.getElementById(`func-${this.id}`);
        if (antigo) antigo.remove();

        this.element = document.createElement('div');
        this.element.id = `func-${this.id}`;
        this.element.className = 'peao-worker';
        
        this.element.style.left = `${this.posX}px`;
        this.element.style.top = `${this.posY}px`;

        this.element.innerHTML = `
            <div id="balao-${this.id}" class="balao-status-func" style="display:none;">Aguardando...</div>
            <div class="peao-corpo" style="position:relative; width:100%; height:100%;">
                <div style="position:absolute; top:0; left:3px; width:24px; height:8px; background:#d2b48c; border-radius:10px; border:1px solid #8b5a2b; z-index:3;"></div>
                <div style="position:absolute; top:6px; left:8px; width:14px; height:12px; background:#ffdbac; border-radius:50%; z-index:2;"></div>
                <div style="position:absolute; top:17px; left:7px; width:16px; height:12px; background:#cc3333; border-radius:3px; z-index:2;"></div>
                <div class="perna esq" style="position:absolute; top:28px; left:8px; width:5px; height:10px; background:#1a365d; border-radius:2px;"></div>
                <div class="perna dir" style="position:absolute; top:28px; left:17px; width:5px; height:10px; background:#1a365d; border-radius:2px;"></div>
            </div>
        `;

        container.appendChild(this.element);
        this.balao = this.element.querySelector(`#balao-${this.id}`);
    }

    moveTo(targetX, targetY, callback) {
        if (this.isMoving || !this.element) return;
        this.isMoving = true;

        this.element.classList.add('andando');
        const velocidade = 2.0;

        const passo = () => {
            const dx = targetX - this.posX;
            const dy = targetY - this.posY;
            const distancia = Math.hypot(dx, dy);

            if (distancia < velocidade) {
                this.posX = targetX;
                this.posY = targetY;
                this.element.style.left = `${this.posX}px`;
                this.element.style.top = `${this.posY}px`;

                this.element.classList.remove('andando');
                this.isMoving = false;

                if (callback) callback();
                return;
            }

            if (Math.abs(dx) > 0.5) {
                this.element.style.transform = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
            }

            this.posX += (dx / distancia) * velocidade;
            this.posY += (dy / distancia) * velocidade;

            this.element.style.left = `${this.posX}px`;
            this.element.style.top = `${this.posY}px`;

            requestAnimationFrame(passo);
        };

        requestAnimationFrame(passo);
    }

    say(texto, tempoEmMs = 2500) {
        if (!this.balao) return;
        this.balao.innerText = texto;
        this.balao.style.display = 'block';
        if (tempoEmMs > 0) {
            setTimeout(() => this.hideSpeech(), tempoEmMs);
        }
    }

    hideSpeech() {
        if (this.balao) this.balao.style.display = 'none';
    }

    iniciarRotinaAutonoma(pontosDeInteresse = []) {
        if (this.rotinaAtiva) return;
        this.rotinaAtiva = true;

        const cicloPatrulha = () => {
            if (!this.rotinaAtiva) return;

            const destino = pontosDeInteresse[Math.floor(Math.random() * pontosDeInteresse.length)] || { x: 200, y: 150, nome: "Ronda" };
            const tempoEspera = Math.random() * 3000 + 3000;

            setTimeout(() => {
                this.say(`A caminho: ${destino.nome}`);
                this.moveTo(destino.x, destino.y, () => {
                    this.say("A trabalhar...", 2000);
                    cicloPatrulha();
                });
            }, tempoEspera);
        };

        cicloPatrulha();
    }
}

/**
 * GERENCIADOR DE FUNCIONÁRIOS
 */
class GerenciadorFuncionarios {
    constructor() {
        this.lista = [];
        // CRIA OS PEÕES INICIAIS
        this.adicionarFuncionario(new Funcionario(1, 'Tião', 'Peão Principal', 1400, 180, 120));
        this.adicionarFuncionario(new Funcionario(2, 'Zé', 'Auxiliar', 1200, 250, 200));
    }

    adicionarFuncionario(funcionario) {
        this.lista.push(funcionario);
    }

    getPrincipal() {
        return this.lista[0] || null;
    }

    renderizarTodos(containerId) {
        const pontosFazenda = [
            { x: 180, y: 50,  nome: "Represa" },
            { x: 450, y: 80,  nome: "Armazém" },
            { x: 180, y: 280, nome: "Lavoura" },
            { x: 420, y: 280, nome: "Curral" }
        ];

        this.lista.forEach(func => {
            func.render(containerId);
            func.iniciarRotinaAutonoma(pontosFazenda);
        });
    }
}

window.Funcionario = Funcionario;
window.GerenciadorFuncionarios = GerenciadorFuncionarios;
